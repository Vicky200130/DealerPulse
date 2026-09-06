"""Delivery operations (delays) and model demand/mix."""
from collections import Counter, defaultdict

from .loader import (
    LEAD_BY_ID, NOW, REP_BY_ID, branch_name, parse_dt,
    scope_deliveries, scope_leads,
)


def _avg(xs: list) -> float:
    return round(sum(xs) / len(xs), 1) if xs else 0


def delivery_analysis(branch=None, dfrom=None, dto=None, rep=None) -> dict:
    ds = scope_deliveries(branch, dfrom, dto)
    if rep:  # cascading rep filter
        ds = [d for d in ds if LEAD_BY_ID.get(d["lead_id"], {}).get("assigned_to") == rep]
    total = len(ds)
    delayed = [d for d in ds if d.get("delay_reason")]
    ontime = [d for d in ds if not d.get("delay_reason")]
    reasons = Counter(d["delay_reason"] for d in delayed)
    return {
        "total": total,
        "on_time": len(ontime),
        "delayed": len(delayed),
        "on_time_rate": round(len(ontime) / total, 4) if total else 0,
        "avg_days_on_time": _avg([d["days_to_deliver"] for d in ontime]),
        "avg_days_delayed": _avg([d["days_to_deliver"] for d in delayed]),
        "delay_reasons": [{"reason": r, "count": c} for r, c in reasons.most_common()],
    }


def _days_since_order(lead: dict) -> int:
    """Days a lead has sat in 'order placed' — measured from the actual order
    timestamp in its history (not last activity), so this is true wait time."""
    ts = next((h["timestamp"] for h in lead["status_history"] if h["status"] == "order_placed"), None)
    placed = parse_dt(ts) if ts else None
    return (NOW - placed).days if placed else 0


def awaiting_orders(branch=None, dfrom=None, dto=None, rep=None) -> dict:
    """Committed orders (order placed, not yet delivered) and how long each has
    been waiting — booked revenue sitting on the factory floor. Aged into
    buckets so the fulfilment backlog reads at a glance."""
    rows = []
    for l in scope_leads(branch, dfrom, dto):
        if l["status"] != "order_placed":
            continue
        if rep and l["assigned_to"] != rep:  # cascading rep filter
            continue
        rep_info = REP_BY_ID.get(l["assigned_to"], {})
        rows.append({
            "id": l["id"],
            "customer_name": l["customer_name"],
            "model": l["model_interested"],
            "branch": branch_name(l["branch_id"]),
            "rep": rep_info.get("name", l["assigned_to"]),
            "deal_value": l.get("deal_value", 0),
            "days_waiting": _days_since_order(l),
        })
    rows.sort(key=lambda r: -r["days_waiting"])
    buckets = {"under_30": 0, "30_59": 0, "60_plus": 0}
    for r in rows:
        d = r["days_waiting"]
        key = "under_30" if d < 30 else ("30_59" if d < 60 else "60_plus")
        buckets[key] += 1
    return {
        "rows": rows,
        "count": len(rows),
        "value": sum(r["deal_value"] for r in rows),
        "over_60_value": sum(r["deal_value"] for r in rows if r["days_waiting"] >= 60),
        "buckets": buckets,
    }


def model_mix(branch=None, dfrom=None, dto=None, by: str = "branch", rep=None) -> list:
    """Per model: demand (leads created in range) plus actual deliveries in range.

    `delivered`/`revenue` and the delivered breakdown are DELIVERY-date based —
    matching the headline "Cars delivered" KPI and the monthly trend — so all
    delivery views agree for any window. `leads` stays the created-cohort demand.
    The breakdown splits deliveries by branch (`by="branch"`, the group view) or
    by rep (`by="rep"`, right when scoped to one branch).
    """
    by_rep = by == "rep"
    field = "by_rep" if by_rep else "by_branch"
    key_name = "rep" if by_rep else "branch"
    name = (lambda k: REP_BY_ID.get(k, {}).get("name", k)) if by_rep else branch_name

    leads = scope_leads(branch, dfrom, dto)
    dels = scope_deliveries(branch, dfrom, dto)
    if rep:  # cascading rep filter (scope this card to one rep)
        leads = [l for l in leads if l["assigned_to"] == rep]
        dels = [d for d in dels if LEAD_BY_ID.get(d["lead_id"], {}).get("assigned_to") == rep]
    stats = defaultdict(lambda: {"leads": 0, "delivered": 0, "revenue": 0, "values": [], "parts": defaultdict(int)})
    for l in leads:
        s = stats[l["model_interested"]]
        s["leads"] += 1
        if l.get("deal_value"):
            s["values"].append(l["deal_value"])
    for d in dels:
        lead = LEAD_BY_ID.get(d["lead_id"])
        if not lead:
            continue
        s = stats[lead["model_interested"]]
        s["delivered"] += 1
        s["revenue"] += lead.get("deal_value", 0)
        s["parts"][lead["assigned_to"] if by_rep else lead["branch_id"]] += 1
    rows = []
    for model, s in stats.items():
        avg = round(sum(s["values"]) / len(s["values"])) if s["values"] else 0
        rows.append({
            "model": model,
            "leads": s["leads"],
            "delivered": s["delivered"],
            "avg_price": avg,
            "revenue": s["revenue"],
            field: sorted(
                ({key_name: name(k), "count": c} for k, c in s["parts"].items()),
                key=lambda x: -x["count"],
            ),
        })
    rows.sort(key=lambda r: -r["leads"])
    return rows
