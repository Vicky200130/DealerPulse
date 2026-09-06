"""Branch- and rep-level aggregations and drill-down details."""
from calendar import monthrange
from collections import defaultdict
from datetime import date
from typing import Optional

from . import metrics, bottlenecks, deliveries, insights, forecast
from .loader import (
    BRANCHES, TARGETS, OPEN_STATUSES, REP_BY_ID, LEAD_BY_ID,
    branch_name, branch_manager, scope_leads, scope_deliveries, idle_days,
)


def _prorated_target(bid: str, field: str, dfrom: Optional[date] = None, dto: Optional[date] = None) -> float:
    """Sum a branch target field (target_units or target_revenue) within
    [dfrom, dto], pro-rating partial months.

    Targets are set per calendar month, which doesn't divide cleanly into
    weeks. For a window that only partly covers a month we count the fraction
    of that month inside the window; full months (and the unfiltered all-time
    view) reduce to an exact sum. Without this, the denominator was always the
    full 7-month target while "delivered" was scoped — so every attainment %
    was apples-to-oranges.
    """
    total = 0.0
    for t in TARGETS:
        if t["branch_id"] != bid:
            continue
        if dfrom is None and dto is None:
            total += t[field]
            continue
        y, m = (int(x) for x in t["month"].split("-"))
        m_start = date(y, m, 1)
        m_end = date(y, m, monthrange(y, m)[1])
        lo = max(m_start, dfrom) if dfrom else m_start
        hi = min(m_end, dto) if dto else m_end
        if lo > hi:
            continue  # no overlap with this month
        overlap = (hi - lo).days + 1
        month_days = (m_end - m_start).days + 1
        total += t[field] * overlap / month_days
    return total


def _target_units(bid: str, dfrom: Optional[date] = None, dto: Optional[date] = None) -> int:
    return round(_prorated_target(bid, "target_units", dfrom, dto))


def _target_revenue(bid: str, dfrom: Optional[date] = None, dto: Optional[date] = None) -> int:
    """Prorated revenue target — the money counterpart to `_target_units`, and,
    like it, an aspirational stretch goal (≈8-9x actual bookings)."""
    return round(_prorated_target(bid, "target_revenue", dfrom, dto))


def _monthly_target(bid: str, dfrom: Optional[date] = None, dto: Optional[date] = None) -> int:
    """Average monthly unit target for the branch across the months in scope.

    Unlike `_target_units` (a prorated cumulative total, the right denominator
    for attainment), this is the per-month bar the run-rate forecast compares
    against — "delivering ~4/mo against a ~38/mo target".
    """
    vals = []
    for t in TARGETS:
        if t["branch_id"] != bid:
            continue
        y, m = (int(x) for x in t["month"].split("-"))
        m_start = date(y, m, 1)
        m_end = date(y, m, monthrange(y, m)[1])
        if dfrom and m_end < dfrom:
            continue
        if dto and m_start > dto:
            continue
        vals.append(t["target_units"])
    return round(sum(vals) / len(vals)) if vals else 0


def _monthly_delivered(bid: str, dfrom=None, dto=None) -> list:
    """(month, count) pairs of cars delivered by this branch, oldest first."""
    counts = defaultdict(int)
    for d in scope_deliveries(bid, dfrom, dto):
        counts[d["delivery_date"][:7]] += 1
    return [(m, counts[m]) for m in sorted(counts)]


def _forecast(bid: str, dfrom=None, dto=None) -> dict:
    """Run-rate forecast: recent monthly pace vs the monthly target, plus trend.

    Answers the question attainment can't — "at the pace we're actually going,
    are we closing the gap or falling further behind?" recent_pace is the mean
    of the last up-to-3 delivered months; trend compares the two most recent.
    """
    series = _monthly_delivered(bid, dfrom, dto)
    monthly_target = _monthly_target(bid, dfrom, dto)
    recent = [c for _, c in series[-3:]]
    recent_pace = round(sum(recent) / len(recent), 1) if recent else 0.0
    last = series[-1][1] if series else 0
    prev = series[-2][1] if len(series) >= 2 else None
    if prev is None or prev == last:
        trend = "flat"
    elif last > prev:
        trend = "up"
    else:
        trend = "down"
    return {
        "monthly_target": monthly_target,
        "recent_pace": recent_pace,
        "pace_pct": round(recent_pace / monthly_target, 4) if monthly_target else 0,
        "trend": trend,
        "last_month": last,
        "prev_month": prev,
    }


def _status_tier(attainment: float, group_avg: float) -> str:
    """Rate a branch against the GROUP's pace, not the paper target.

    In this dataset the unit targets run 2-4x above actual delivery pace, so
    even a correctly-scoped absolute % paints every branch red. Comparing each
    branch to the group's own pace answers the question a manager actually
    asks — who is ahead, and who needs help.
    """
    if group_avg <= 0:
        return "on_pace"
    ratio = attainment / group_avg
    if ratio >= 1.15:
        return "leading"
    if ratio < 0.6:
        return "behind"
    return "on_pace"


def branch_health(dfrom=None, dto=None) -> list:
    rows = []
    total_delivered = 0
    total_target = 0
    for b in BRANCHES:
        leads = scope_leads(b["id"], dfrom, dto)
        # Delivered/revenue are delivery-date based (matches the headline KPIs);
        # conversion/cold are lead-cohort based.
        dels = scope_deliveries(b["id"], dfrom, dto)
        delivered = len(dels)
        revenue = sum(
            LEAD_BY_ID[d["lead_id"]].get("deal_value", 0)
            for d in dels if d["lead_id"] in LEAD_BY_ID
        )
        target = _target_units(b["id"], dfrom, dto)
        rev_target = _target_revenue(b["id"], dfrom, dto)
        total_delivered += delivered
        total_target += target
        open_leads = [l for l in leads if l["status"] in OPEN_STATUSES]
        cold = [l for l in open_leads if idle_days(l) >= 7]
        # Compact pipeline projection for the card (full by-stage detail is only
        # attached on the branch drill-down, to keep the list payload lean).
        pf = forecast.with_target(forecast.project(open_leads, delivered), target)
        rows.append({
            "id": b["id"], "name": b["name"], "city": b["city"],
            "manager": branch_manager(b["id"]),
            "delivered": delivered,
            "target_units": target,
            "attainment": round(delivered / target, 4) if target else 0,
            "conversion": metrics.conversion(leads),
            "cold_leads": len(cold),
            "revenue": revenue,
            "revenue_target": rev_target,
            "revenue_attainment": round(revenue / rev_target, 4) if rev_target else 0,
            "forecast": _forecast(b["id"], dfrom, dto),
            "pipeline_forecast": {k: pf[k] for k in (
                "projected_total", "expected_additional", "expected_additional_revenue",
                "pipeline_value", "open_leads", "attainment_projected", "on_track",
            )},
        })
    group_avg = (total_delivered / total_target) if total_target else 0
    for r in rows:
        r["status"] = _status_tier(r["attainment"], group_avg)
    rows.sort(key=lambda r: -r["attainment"])
    return rows


def group_forecast(dfrom=None, dto=None) -> dict:
    """Group-wide pipeline projection: cars delivered so far plus the probability-
    weighted resolution of every open deal across all five branches. Powers the
    "projected to finish ~X" read on the overview."""
    delivered = sum(len(scope_deliveries(b["id"], dfrom, dto)) for b in BRANCHES)
    open_leads = [l for l in scope_leads(None, dfrom, dto) if l["status"] in OPEN_STATUSES]
    target = sum(_target_units(b["id"], dfrom, dto) for b in BRANCHES)
    return forecast.with_target(forecast.project(open_leads, delivered), target)


def group_target(dfrom=None, dto=None) -> dict:
    """Group-wide delivered vs (aspirational) target — the honest headline that
    keeps the group-relative branch badges from looking like a cover-up. Both
    units and revenue, since the targets carry both and both run ≈8-9x hot."""
    delivered = total = 0
    revenue = rev_target = 0
    for b in BRANCHES:
        dels = scope_deliveries(b["id"], dfrom, dto)
        delivered += len(dels)
        revenue += sum(LEAD_BY_ID[d["lead_id"]].get("deal_value", 0) for d in dels if d["lead_id"] in LEAD_BY_ID)
        total += _target_units(b["id"], dfrom, dto)
        rev_target += _target_revenue(b["id"], dfrom, dto)
    return {
        "delivered": delivered,
        "target_units": total,
        "attainment": round(delivered / total, 4) if total else 0,
        "revenue": revenue,
        "revenue_target": rev_target,
        "revenue_attainment": round(revenue / rev_target, 4) if rev_target else 0,
    }


def _coaching(contact_rate: float, response_hours: float, leads: int) -> bool:
    """Flag a rep whose follow-up discipline is an individual outlier.

    Keyed on contact rate (leads never worked at all), which genuinely varies
    rep-to-rep (0.33-0.94). Response time is NOT used as the trigger: the whole
    team is slow (~46h median), so it's a systemic fix surfaced group-wide, not
    a stick to single out individuals. Needs enough leads (8+) to be fair."""
    return leads >= 8 and (contact_rate < 0.65 or response_hours > 72)


def branch_reps(bid: str, dfrom=None, dto=None) -> list:
    leads = scope_leads(bid, dfrom, dto)
    agg = defaultdict(lambda: {"delivered": 0, "revenue": 0, "active": 0, "cold": 0, "cold_value": 0, "leads": []})
    for l in leads:
        a = agg[l["assigned_to"]]
        a["leads"].append(l)
        if l["status"] == "delivered":
            a["delivered"] += 1
            a["revenue"] += l.get("deal_value", 0)
        # Open deals the rep is currently working; "cold" = those idle 7+ days
        # (the leads that actually need a nudge), and cold_value is the revenue
        # tied up in them. No per-rep target exists in the data, so we surface
        # effort / pipeline health (and money at risk) instead of attainment.
        if l["status"] in OPEN_STATUSES:
            a["active"] += 1
            if idle_days(l) >= 7:
                a["cold"] += 1
                a["cold_value"] += l.get("deal_value", 0)
    rows = []
    for rid, a in agg.items():
        rep = REP_BY_ID.get(rid, {})
        n = len(a["leads"])
        cr = metrics.contact_rate(a["leads"])
        resp = metrics.speed_to_lead(a["leads"])["median_hours"]
        rows.append({
            "id": rid, "name": rep.get("name", rid), "role": rep.get("role", ""),
            "leads": n, "delivered": a["delivered"],
            "conversion": round(a["delivered"] / n, 4) if n else 0,
            "revenue": a["revenue"],
            "active": a["active"], "cold": a["cold"], "cold_value": a["cold_value"],
            "contact_rate": cr, "avg_response_hours": resp,
            "needs_coaching": _coaching(cr, resp, n),
        })
    rows.sort(key=lambda r: -r["delivered"])
    return rows


def branch_detail(bid: str, dfrom=None, dto=None) -> Optional[dict]:
    b = next((x for x in BRANCHES if x["id"] == bid), None)
    if not b:
        return None
    leads = scope_leads(bid, dfrom, dto)
    dels = scope_deliveries(bid, dfrom, dto)
    k = metrics.kpis(leads, dels)
    target = _target_units(bid, dfrom, dto)
    k["target_units"] = target
    k["attainment"] = round(k["cars_delivered"] / target, 4) if target else 0
    rev_target = _target_revenue(bid, dfrom, dto)
    k["revenue_target"] = rev_target
    k["revenue_attainment"] = round(k["revenue_booked"] / rev_target, 4) if rev_target else 0
    cold = bottlenecks.bottlenecks(leads, idle_min=7)
    return {
        "id": b["id"], "name": b["name"], "city": b["city"],
        "manager": branch_manager(b["id"]),
        "kpis": k,
        "forecast": _forecast(bid, dfrom, dto),
        "pipeline_forecast": forecast.with_target(
            forecast.project([l for l in leads if l["status"] in OPEN_STATUSES], k["cars_delivered"]),
            target,
        ),
        "funnel": metrics.funnel(leads, group_by="rep"),
        "model_mix": deliveries.model_mix(bid, dfrom, dto),
        "source_quality": insights.source_quality(leads),
        "reps": branch_reps(bid, dfrom, dto),
        "cold_leads": cold["rows"],
        "cold_categories": cold["categories"],
        "group_conversion": metrics.conversion(scope_leads(None, dfrom, dto)),
    }


def rep_leaderboard(branch=None, dfrom=None, dto=None) -> list:
    leads = scope_leads(branch, dfrom, dto)
    agg = defaultdict(lambda: {"delivered": 0, "revenue": 0, "open": 0, "cold": 0, "leads": []})
    for l in leads:
        a = agg[l["assigned_to"]]
        a["leads"].append(l)
        if l["status"] == "delivered":
            a["delivered"] += 1
            a["revenue"] += l.get("deal_value", 0)
        if l["status"] in OPEN_STATUSES:
            a["open"] += 1
            if idle_days(l) >= 7:
                a["cold"] += 1
    rows = []
    for rid, a in agg.items():
        rep = REP_BY_ID.get(rid, {})
        n = len(a["leads"])
        cr = metrics.contact_rate(a["leads"])
        resp = metrics.speed_to_lead(a["leads"])["median_hours"]
        rows.append({
            "id": rid, "name": rep.get("name", rid),
            "branch": branch_name(rep.get("branch_id", "")),
            "role": rep.get("role", ""),
            "leads": n, "delivered": a["delivered"],
            "conversion": round(a["delivered"] / n, 4) if n else 0,
            "revenue": a["revenue"],
            "avg_deal": round(a["revenue"] / a["delivered"]) if a["delivered"] else 0,
            "active_deals": a["open"], "cold": a["cold"],
            "contact_rate": cr, "avg_response_hours": resp,
            "needs_coaching": _coaching(cr, resp, n),
            "overloaded": a["open"] > 15,
        })
    rows.sort(key=lambda r: -r["revenue"])
    return rows


def rep_detail(rid: str, dfrom=None, dto=None) -> Optional[dict]:
    rep = REP_BY_ID.get(rid)
    if not rep:
        return None
    leads = [l for l in scope_leads(rep["branch_id"], dfrom, dto) if l["assigned_to"] == rid]
    delivered = [l for l in leads if l["status"] == "delivered"]
    open_leads = [l for l in leads if l["status"] in OPEN_STATUSES]
    total = len(leads)
    sp = metrics.speed_to_lead(leads)

    branch_leads = scope_leads(rep["branch_id"], dfrom, dto)
    pipeline = [bottlenecks.score_lead(l) for l in open_leads]
    pipeline.sort(key=lambda r: -r["deal_value"])
    cr = metrics.contact_rate(leads)
    return {
        "id": rid, "name": rep["name"], "role": rep["role"],
        "branch_id": rep["branch_id"], "branch": branch_name(rep["branch_id"]),
        "joined": rep.get("joined"),
        "needs_coaching": _coaching(cr, sp["median_hours"], total),
        "kpis": {
            "leads": total,
            "delivered": len(delivered),
            "conversion": round(len(delivered) / total, 4) if total else 0,
            "revenue": sum(l.get("deal_value", 0) for l in delivered),
            "open_deals": len(open_leads),
            "avg_response_hours": sp["median_hours"],
            "contact_rate": cr,
        },
        "funnel": metrics.funnel(leads),
        "pipeline": pipeline,
        "branch_conversion": metrics.conversion(branch_leads),
        "group_conversion": metrics.conversion(scope_leads(None, dfrom, dto)),
    }
