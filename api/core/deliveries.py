"""Delivery operations (delays) and model demand/mix."""
from collections import Counter, defaultdict

from .loader import scope_deliveries, scope_leads


def _avg(xs: list) -> float:
    return round(sum(xs) / len(xs), 1) if xs else 0


def delivery_analysis(branch=None, dfrom=None, dto=None) -> dict:
    ds = scope_deliveries(branch, dfrom, dto)
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


def model_mix(branch=None, dfrom=None, dto=None) -> list:
    leads = scope_leads(branch, dfrom, dto)
    stats = defaultdict(lambda: {"leads": 0, "delivered": 0, "revenue": 0, "values": []})
    for l in leads:
        s = stats[l["model_interested"]]
        s["leads"] += 1
        if l.get("deal_value"):
            s["values"].append(l["deal_value"])
        if l["status"] == "delivered":
            s["delivered"] += 1
            s["revenue"] += l.get("deal_value", 0)
    rows = []
    for model, s in stats.items():
        avg = round(sum(s["values"]) / len(s["values"])) if s["values"] else 0
        rows.append({
            "model": model,
            "leads": s["leads"],
            "delivered": s["delivered"],
            "avg_price": avg,
            "revenue": s["revenue"],
        })
    rows.sort(key=lambda r: -r["leads"])
    return rows
