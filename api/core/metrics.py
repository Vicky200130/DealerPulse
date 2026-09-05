"""Core metric calculations that operate on a scoped list of leads/deliveries."""
import statistics
from collections import Counter

from .loader import STAGES, OPEN_STATUSES, LEAD_BY_ID, idle_days, parse_dt, stages_reached


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

    conversion = len(won) / total if total else 0
    win_base = len(won) + len(order_placed) + len(lost)
    win_rate = (len(won) + len(order_placed)) / win_base if win_base else 0

    cold = [l for l in open_leads if idle_days(l) >= 7]
    cold_value = sum(l.get("deal_value", 0) for l in cold)

    days = [d["days_to_deliver"] for d in deliveries]
    avg_delivery = round(sum(days) / len(days), 1) if days else 0

    return {
        "revenue_booked": revenue,
        "cars_delivered": len(deliveries),
        "total_leads": total,
        "conversion": round(conversion, 4),
        "win_rate": round(win_rate, 4),
        "lost": len(lost),
        "open_leads": len(open_leads),
        "cold_leads": len(cold),
        "cold_value": cold_value,
        "avg_delivery_days": avg_delivery,
        "pipeline_value": sum(l.get("deal_value", 0) for l in open_leads),
    }


def funnel(leads: list) -> list:
    """How many leads ever reached each stage, with stage-to-stage drop rates."""
    reach = {s: 0 for s in STAGES}
    for l in leads:
        seen = stages_reached(l)
        for s in STAGES:
            if s in seen:
                reach[s] += 1
    rows, prev = [], None
    for s in STAGES:
        drop = round((prev - reach[s]) / prev, 4) if prev else None
        rows.append({"stage": s, "count": reach[s], "drop": drop})
        prev = reach[s]
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
    c = Counter(d["delivery_date"][:7] for d in deliveries)
    return [{"month": m, "delivered": c[m]} for m in sorted(c)]


def conversion(leads: list) -> float:
    total = len(leads)
    if not total:
        return 0.0
    return round(sum(1 for l in leads if l["status"] == "delivered") / total, 4)
