"""Branch- and rep-level aggregations and drill-down details."""
from collections import defaultdict
from typing import Optional

from . import metrics, bottlenecks
from .loader import (
    BRANCHES, TARGETS, OPEN_STATUSES, REP_BY_ID,
    branch_name, scope_leads, scope_deliveries, idle_days,
)


def _target_units(bid: str) -> int:
    return sum(t["target_units"] for t in TARGETS if t["branch_id"] == bid)


def _status_tier(attainment: float) -> str:
    if attainment < 0.05:
        return "critical"
    if attainment < 0.8:
        return "warning"
    return "good"


def branch_health(dfrom=None, dto=None) -> list:
    rows = []
    for b in BRANCHES:
        leads = scope_leads(b["id"], dfrom, dto)
        delivered = [l for l in leads if l["status"] == "delivered"]
        target = _target_units(b["id"])
        attainment = len(delivered) / target if target else 0
        open_leads = [l for l in leads if l["status"] in OPEN_STATUSES]
        cold = [l for l in open_leads if idle_days(l) >= 7]
        rows.append({
            "id": b["id"], "name": b["name"], "city": b["city"],
            "delivered": len(delivered),
            "target_units": target,
            "attainment": round(attainment, 4),
            "conversion": metrics.conversion(leads),
            "cold_leads": len(cold),
            "revenue": sum(l.get("deal_value", 0) for l in delivered),
            "status": _status_tier(attainment),
        })
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
    target = _target_units(bid)
    k["target_units"] = target
    k["attainment"] = round(k["cars_delivered"] / target, 4) if target else 0
    cold = bottlenecks.bottlenecks(leads, idle_min=7)
    return {
        "id": b["id"], "name": b["name"], "city": b["city"],
        "kpis": k,
        "funnel": metrics.funnel(leads),
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
