"""Branch- and rep-level aggregations and drill-down details."""
from calendar import monthrange
from collections import defaultdict
from datetime import date
from typing import Optional

from . import metrics, bottlenecks
from .loader import (
    BRANCHES, TARGETS, OPEN_STATUSES, REP_BY_ID, LEAD_BY_ID,
    branch_name, branch_manager, scope_leads, scope_deliveries, idle_days,
)


def _target_units(bid: str, dfrom: Optional[date] = None, dto: Optional[date] = None) -> int:
    """Branch target units within [dfrom, dto], pro-rating partial months.

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
            total += t["target_units"]
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
        total += t["target_units"] * overlap / month_days
    return round(total)


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
        total_delivered += delivered
        total_target += target
        open_leads = [l for l in leads if l["status"] in OPEN_STATUSES]
        cold = [l for l in open_leads if idle_days(l) >= 7]
        rows.append({
            "id": b["id"], "name": b["name"], "city": b["city"],
            "manager": branch_manager(b["id"]),
            "delivered": delivered,
            "target_units": target,
            "attainment": round(delivered / target, 4) if target else 0,
            "conversion": metrics.conversion(leads),
            "cold_leads": len(cold),
            "revenue": revenue,
        })
    group_avg = (total_delivered / total_target) if total_target else 0
    for r in rows:
        r["status"] = _status_tier(r["attainment"], group_avg)
    rows.sort(key=lambda r: -r["attainment"])
    return rows


def branch_reps(bid: str, dfrom=None, dto=None) -> list:
    leads = scope_leads(bid, dfrom, dto)
    agg = defaultdict(lambda: {"leads": 0, "delivered": 0, "revenue": 0})
    for l in leads:
        a = agg[l["assigned_to"]]
        a["leads"] += 1
        if l["status"] == "delivered":
            a["delivered"] += 1
            a["revenue"] += l.get("deal_value", 0)
    rows = []
    for rid, a in agg.items():
        rep = REP_BY_ID.get(rid, {})
        rows.append({
            "id": rid, "name": rep.get("name", rid), "role": rep.get("role", ""),
            "leads": a["leads"], "delivered": a["delivered"],
            "conversion": round(a["delivered"] / a["leads"], 4) if a["leads"] else 0,
            "revenue": a["revenue"],
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
    cold = bottlenecks.bottlenecks(leads, idle_min=7)
    return {
        "id": b["id"], "name": b["name"], "city": b["city"],
        "manager": branch_manager(b["id"]),
        "kpis": k,
        "funnel": metrics.funnel(leads, group_by="rep"),
        "reps": branch_reps(bid, dfrom, dto),
        "cold_leads": cold["rows"],
        "group_conversion": metrics.conversion(scope_leads(None, dfrom, dto)),
    }


def rep_leaderboard(branch=None, dfrom=None, dto=None) -> list:
    leads = scope_leads(branch, dfrom, dto)
    agg = defaultdict(lambda: {"leads": 0, "delivered": 0, "revenue": 0, "open": 0})
    for l in leads:
        a = agg[l["assigned_to"]]
        a["leads"] += 1
        if l["status"] == "delivered":
            a["delivered"] += 1
            a["revenue"] += l.get("deal_value", 0)
        if l["status"] in OPEN_STATUSES:
            a["open"] += 1
    rows = []
    for rid, a in agg.items():
        rep = REP_BY_ID.get(rid, {})
        rows.append({
            "id": rid, "name": rep.get("name", rid),
            "branch": branch_name(rep.get("branch_id", "")),
            "role": rep.get("role", ""),
            "leads": a["leads"], "delivered": a["delivered"],
            "revenue": a["revenue"],
            "avg_deal": round(a["revenue"] / a["delivered"]) if a["delivered"] else 0,
            "active_deals": a["open"],
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
    return {
        "id": rid, "name": rep["name"], "role": rep["role"],
        "branch_id": rep["branch_id"], "branch": branch_name(rep["branch_id"]),
        "joined": rep.get("joined"),
        "kpis": {
            "leads": total,
            "delivered": len(delivered),
            "conversion": round(len(delivered) / total, 4) if total else 0,
            "revenue": sum(l.get("deal_value", 0) for l in delivered),
            "open_deals": len(open_leads),
            "avg_response_hours": sp["median_hours"],
        },
        "funnel": metrics.funnel(leads),
        "pipeline": pipeline,
        "branch_conversion": metrics.conversion(branch_leads),
        "group_conversion": metrics.conversion(scope_leads(None, dfrom, dto)),
    }
