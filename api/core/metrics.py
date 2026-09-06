"""Core metric calculations that operate on a scoped list of leads/deliveries."""
import statistics
from collections import Counter, defaultdict

from .loader import (
    STAGES, OPEN_STATUSES, COLD_DAYS, STALE_DAYS, LEAD_BY_ID, REP_BY_ID,
    branch_name, idle_days, parse_dt, stages_reached,
)


def kpis(leads: list, deliveries: list) -> dict:
    # Outcome KPIs (revenue, cars delivered) are DELIVERY-date based, so the
    # headline always matches the monthly-deliveries chart for any time slice.
    delivered_leads = [LEAD_BY_ID[d["lead_id"]] for d in deliveries if d["lead_id"] in LEAD_BY_ID]
    revenue = sum(l.get("deal_value", 0) for l in delivered_leads)

    # Pipeline KPIs are based on the lead cohort (created in range).
    won = [l for l in leads if l["status"] == "delivered"]
    order_placed = [l for l in leads if l["status"] == "order_placed"]
    lost = [l for l in leads if l["status"] == "lost"]
    open_leads = [l for l in leads if l["status"] in OPEN_STATUSES]
    total = len(leads)

    # Conversion = leads that became a committed sale — order placed OR delivered
    # (an order is a won deal, just awaiting handover). This is the lead-to-sale
    # yield the CEO reads on the dashboard.
    converted = len(won) + len(order_placed)
    conversion = converted / total if total else 0
    # Win rate (close rate): of the deals that actually reached a decision, the
    # share we won. Standard sales definition — Delivered / (Delivered + Lost).
    # Still-open leads AND order_placed (committed, awaiting delivery) are left
    # out of the denominator, so this measures closing effectiveness rather than
    # pipeline mix. This is distinct from `conversion` (lead-to-sale yield).
    win_base = len(won) + len(lost)
    win_rate = len(won) / win_base if win_base else 0

    # "At risk" = OPEN, pre-order deals that have gone quiet for 7+ days.
    # We deliberately EXCLUDE order_placed: those customers have already
    # committed and are only awaiting delivery, so they're a fulfilment concern,
    # not a loss risk. Lumping them in overstated the headline (₹6.6 Cr when the
    # genuinely-slipping value is ~₹1.5 Cr).
    cold = [l for l in open_leads if l["status"] != "order_placed" and idle_days(l) >= COLD_DAYS]
    cold_value = sum(l.get("deal_value", 0) for l in cold)
    # Committed-but-stalled: ordered, awaiting delivery, but quiet 7+ days.
    awaiting = [l for l in open_leads if l["status"] == "order_placed" and idle_days(l) >= COLD_DAYS]
    awaiting_value = sum(l.get("deal_value", 0) for l in awaiting)
    # Likely-dead: any open deal untouched for STALE_DAYS+. In this data these
    # are overwhelmingly orders stuck in delivery for months — money that needs
    # a close/cancel decision, not a "cold lead" nudge. Surfaced separately so
    # the action lists stay honest about what's recoverable.
    stale = [l for l in open_leads if idle_days(l) >= STALE_DAYS]
    stale_value = sum(l.get("deal_value", 0) for l in stale)

    days = [d["days_to_deliver"] for d in deliveries]
    avg_delivery = round(sum(days) / len(days), 1) if days else 0

    return {
        "revenue_booked": revenue,
        "cars_delivered": len(deliveries),
        "total_leads": total,
        # Delivered leads within this cohort (the conversion numerator). Distinct
        # from cars_delivered, which is delivery-date based; this one matches the
        # conversion %, so the two always agree on the card.
        "won_leads": len(won),
        "conversion": round(conversion, 4),
        "win_rate": round(win_rate, 4),
        "lost": len(lost),
        "lost_value": sum(l.get("deal_value", 0) for l in lost),
        "open_leads": len(open_leads),
        "cold_leads": len(cold),
        "cold_value": cold_value,
        "awaiting_leads": len(awaiting),
        "awaiting_value": awaiting_value,
        "stale_leads": len(stale),
        "stale_value": stale_value,
        "avg_delivery_days": avg_delivery,
        "pipeline_value": sum(l.get("deal_value", 0) for l in open_leads),
        # "Committed" = every ordered deal (won-but-not-yet-delivered), used to
        # split the pipeline into committed / healthy / at-risk buckets.
        "committed_leads": len(order_placed),
        "committed_value": sum(l.get("deal_value", 0) for l in order_placed),
    }


def funnel(leads: list, group_by: str = "branch") -> list:
    """How many leads ever reached each stage, with stage-to-stage drop rates.

    Each row also carries a breakdown of who contributed at that stage, shown on
    hover. group_by="branch" (default) attributes each stage to the branch —
    right for the all-branches overview. group_by="rep" attributes it to the
    assigned rep — right for a single-branch drill-down, where a by-branch split
    would collapse to one redundant row.
    """
    by_rep = group_by == "rep"
    field = "by_rep" if by_rep else "by_branch"
    label = "rep" if by_rep else "branch"
    name = (lambda k: REP_BY_ID.get(k, {}).get("name", k)) if by_rep else branch_name

    reach = {s: 0 for s in STAGES}
    parts = {s: defaultdict(int) for s in STAGES}
    for l in leads:
        seen = stages_reached(l)
        key = l["assigned_to"] if by_rep else l["branch_id"]
        for s in STAGES:
            if s in seen:
                reach[s] += 1
                parts[s][key] += 1
    rows, prev = [], None
    for s in STAGES:
        drop = round((prev - reach[s]) / prev, 4) if prev else None
        breakdown = sorted(
            ({label: name(k), "count": c} for k, c in parts[s].items()),
            key=lambda x: -x["count"],
        )
        rows.append({"stage": s, "count": reach[s], "drop": drop, field: breakdown})
        prev = reach[s]
    # Drop trailing stages nobody reached (reach only decreases, so zeros are
    # always at the tail) — the funnel shouldn't render empty stages, e.g. a
    # recent week where no lead has progressed past "contacted" yet.
    while rows and rows[-1]["count"] == 0:
        rows.pop()
    return rows


def speed_to_lead(leads: list) -> dict:
    """Time from lead creation (new) to first contact, in hours."""
    gaps = []
    for l in leads:
        tmap = {h["status"]: parse_dt(h["timestamp"]) for h in l["status_history"]}
        if "new" in tmap and "contacted" in tmap:
            hrs = (tmap["contacted"] - tmap["new"]).total_seconds() / 3600
            if hrs >= 0:
                gaps.append(hrs)
    if not gaps:
        return {"median_hours": 0, "within_24h": 0, "over_72h": 0, "count": 0}
    n = len(gaps)
    return {
        "median_hours": round(statistics.median(gaps), 1),
        "within_24h": round(sum(1 for g in gaps if g <= 24) / n, 4),
        "over_72h": round(sum(1 for g in gaps if g > 72) / n, 4),
        "count": n,
    }


def monthly_deliveries(deliveries: list) -> list:
    """Cars delivered and revenue booked per calendar month (by delivery date),
    with a per-branch delivered breakdown for the hover tooltip."""
    counts = Counter()
    revenue = defaultdict(int)
    by_branch = defaultdict(lambda: defaultdict(lambda: {"count": 0, "revenue": 0}))
    for d in deliveries:
        m = d["delivery_date"][:7]
        counts[m] += 1
        lead = LEAD_BY_ID.get(d["lead_id"])
        if lead:
            val = lead.get("deal_value", 0)
            revenue[m] += val
            b = by_branch[m][lead["branch_id"]]
            b["count"] += 1
            b["revenue"] += val
    out = []
    for m in sorted(counts):
        bb = sorted(
            ({"branch": branch_name(bid), "count": v["count"], "revenue": v["revenue"]} for bid, v in by_branch[m].items()),
            key=lambda x: -x["count"],
        )
        out.append({"month": m, "delivered": counts[m], "revenue": revenue[m], "by_branch": bb})
    return out


def conversion(leads: list) -> float:
    # A lead has converted once it's a committed sale — order placed OR delivered.
    total = len(leads)
    if not total:
        return 0.0
    won = sum(1 for l in leads if l["status"] in ("order_placed", "delivered"))
    return round(won / total, 4)


def momentum(monthly: list) -> dict:
    """Latest complete month vs the month before, for the headline KPIs.

    Gives every view a plain "which way are we heading" read — shown even in the
    default all-time view, where period-over-period deltas don't apply. Returns
    None when there aren't two months to compare.
    """
    if len(monthly) < 2:
        return None
    cur, prev = monthly[-1], monthly[-2]

    def rel(key):
        c, p = cur[key], prev[key]
        return round((c - p) / p, 4) if p else None

    return {
        "current_month": cur["month"],
        "prev_month": prev["month"],
        "cars_delivered": rel("delivered"),
        "revenue_booked": rel("revenue"),
        "cars_delivered_current": cur["delivered"],
        "cars_delivered_prev": prev["delivered"],
    }


def contact_rate(leads: list) -> float:
    """Share of assigned leads a rep has ever actually contacted.

    A follow-up-discipline signal: a rep sitting on many never-contacted leads
    has a coaching problem, not a demand problem. Uses status_history so it
    counts leads that reached "contacted" at any point, not just current status.
    """
    if not leads:
        return 0.0
    contacted = sum(1 for l in leads if "contacted" in stages_reached(l))
    return round(contacted / len(leads), 4)
