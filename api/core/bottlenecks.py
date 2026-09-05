"""The triage engine: scores every stuck deal and prescribes a next best action.

Health score (0-100): a rules-based, deterministic heuristic — no LLM cost.
Each stage has a base "closeness to won" score; every idle day subtracts from it.
So a high-value deal stuck late in the funnel surfaces as urgent (low score).
"""
from typing import Optional

from .loader import OPEN_STATUSES, REP_BY_ID, branch_name, idle_days

STAGE_BASE = {
    "new": 30,
    "contacted": 45,
    "test_drive": 60,
    "negotiation": 70,
    "order_placed": 85,
}


def _next_best_action(status: str, idle: int) -> str:
    if status == "new":
        return "Immediate call / reassign"
    if status == "contacted":
        return "Immediate call / reassign" if idle >= 10 else "Move to nurture sequence"
    if status == "test_drive":
        return "Send model comparison sheet"
    if status == "negotiation":
        return "Manager intervention / offer concession"
    if status == "order_placed":
        return "Confirm delivery timeline"
    return "Follow up"


def _severity(health: int) -> str:
    if health < 40:
        return "critical"
    if health < 70:
        return "warning"
    return "good"


def score_lead(lead: dict) -> dict:
    idle = idle_days(lead)
    base = STAGE_BASE.get(lead["status"], 40)
    health = max(0, min(100, round(base - idle * 3)))
    rep = REP_BY_ID.get(lead["assigned_to"], {})
    return {
        "id": lead["id"],
        "customer_name": lead["customer_name"],
        "model": lead["model_interested"],
        "status": lead["status"],
        "deal_value": lead.get("deal_value", 0),
        "rep": rep.get("name", lead["assigned_to"]),
        "branch": branch_name(lead["branch_id"]),
        "idle_days": idle,
        "health": health,
        "next_best_action": _next_best_action(lead["status"], idle),
        "severity": _severity(health),
    }


def bottlenecks(leads: list, idle_min: int = 7, search: Optional[str] = None) -> dict:
    rows = []
    for l in leads:
        if l["status"] not in OPEN_STATUSES:
            continue
        if idle_days(l) < idle_min:
            continue
        row = score_lead(l)
        if search:
            s = search.lower()
            haystack = f"{row['customer_name']} {row['model']} {row['rep']}".lower()
            if s not in haystack:
                continue
        rows.append(row)
    # Worst health first, then biggest deal.
    rows.sort(key=lambda r: (r["health"], -r["deal_value"]))
    return {
        "rows": rows,
        "count": len(rows),
        "value_at_risk": sum(r["deal_value"] for r in rows),
        "urgent": sum(1 for r in rows if r["severity"] == "critical"),
    }
