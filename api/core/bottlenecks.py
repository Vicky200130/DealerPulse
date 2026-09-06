"""The triage engine: scores every stuck deal and prescribes a next best action.

Health score (0-100): a rules-based, deterministic heuristic — no LLM cost.
Each stage has a base "closeness to won" score; every idle day subtracts from it.
So a high-value deal stuck late in the funnel surfaces as urgent (low score).

Every stuck deal is also sorted into one of three CATEGORIES, because they need
very different responses:
  - follow_up : a pre-order lead going quiet — recoverable, a sales nudge.
  - delivery  : an order placed but not yet delivered — a fulfilment chase.
  - stale     : untouched STALE_DAYS+ — almost certainly dead, needs a
                close/cancel decision, not another follow-up.
Mixing these (the old flat list) buried 6 recoverable leads under dozens of
months-old orders and made every row read "Confirm delivery timeline".
"""
from typing import Optional

from .loader import OPEN_STATUSES, STALE_DAYS, REP_BY_ID, branch_name, idle_days

STAGE_BASE = {
    "new": 30,
    "contacted": 45,
    "test_drive": 60,
    "negotiation": 70,
    "order_placed": 85,
}

# Ordering of the three buckets: recoverable follow-ups first (what a manager
# can actually save today), then delivery chases, then the likely-dead.
CATEGORY_ORDER = {"follow_up": 0, "delivery": 1, "stale": 2}


def _category(status: str, idle: int) -> str:
    if idle >= STALE_DAYS:
        return "stale"
    if status == "order_placed":
        return "delivery"
    return "follow_up"


def _next_best_action(status: str, idle: int, category: str) -> str:
    """A specific, stage-aware instruction — not one generic line for every row."""
    if category == "stale":
        if status == "order_placed":
            return f"Escalate or cancel — stalled {idle}d"
        return f"Revive or mark lost — silent {idle}d"
    if status == "new":
        return "Call now — never contacted"
    if status == "contacted":
        return f"Call now — silent {idle}d" if idle >= 10 else "Follow up to book a test drive"
    if status == "test_drive":
        return "Send quote & chase the order"
    if status == "negotiation":
        return "Manager: close the negotiation"
    if status == "order_placed":
        return "Confirm the delivery date"
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
    category = _category(lead["status"], idle)
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
        "category": category,
        "next_best_action": _next_best_action(lead["status"], idle, category),
        "severity": _severity(health),
        # Detail fields for the expandable row: contact, source, and the full
        # stage-by-stage journey (each entry carries status, timestamp, note).
        "phone": lead.get("phone", ""),
        "source": lead.get("source", ""),
        "expected_close_date": lead.get("expected_close_date"),
        "status_history": lead.get("status_history", []),
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
    # Recoverable follow-ups first, then delivery chases, then the likely-dead;
    # biggest money first within each bucket.
    rows.sort(key=lambda r: (CATEGORY_ORDER[r["category"]], -r["deal_value"]))

    def bucket(cat):
        rs = [r for r in rows if r["category"] == cat]
        return {"count": len(rs), "value": sum(r["deal_value"] for r in rs)}

    return {
        "rows": rows,
        "count": len(rows),
        "value_at_risk": sum(r["deal_value"] for r in rows),
        "urgent": sum(1 for r in rows if r["severity"] == "critical"),
        "categories": {c: bucket(c) for c in CATEGORY_ORDER},
    }
