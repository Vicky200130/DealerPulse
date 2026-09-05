"""Loads the dataset once and exposes shared indexes, helpers and scope filters.

The dataset ends in Dec 2025, so we anchor "now" to the latest activity in
the data (max last_activity_at). Every "idle days" / cold-lead calculation is
relative to this anchor — a documented, reproducible choice that keeps the
dashboard consistent no matter when it is opened.
"""
import json
from datetime import datetime, date
from pathlib import Path
from typing import Optional

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "dealership_data.json"
DATA = json.loads(DATA_PATH.read_text())

BRANCHES = DATA["branches"]
REPS = DATA["sales_reps"]
LEADS = DATA["leads"]
TARGETS = DATA["targets"]
DELIVERIES = DATA["deliveries"]

BRANCH_BY_ID = {b["id"]: b for b in BRANCHES}
REP_BY_ID = {r["id"]: r for r in REPS}
LEAD_BY_ID = {l["id"]: l for l in LEADS}
DELIVERY_BY_LEAD = {d["lead_id"]: d for d in DELIVERIES}

# Pipeline stages in order (excludes the terminal "lost" state).
STAGES = ["new", "contacted", "test_drive", "negotiation", "order_placed", "delivered"]
OPEN_STATUSES = {"new", "contacted", "test_drive", "negotiation", "order_placed"}


def parse_dt(s: Optional[str]) -> Optional[datetime]:
    """Parse an ISO timestamp (with or without 'Z'/microseconds) into naive UTC."""
    if not s:
        return None
    s = s.replace("Z", "")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.fromisoformat(s.split(".")[0])


def parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    return date.fromisoformat(s[:10])


# "now" = the latest recorded activity across all leads.
NOW = max(parse_dt(l["last_activity_at"]) for l in LEADS)


def branch_name(bid: str) -> str:
    return BRANCH_BY_ID.get(bid, {}).get("name", bid)


def idle_days(lead: dict) -> int:
    """Days since a lead's last activity, relative to the NOW anchor."""
    return (NOW - parse_dt(lead["last_activity_at"])).days


def stages_reached(lead: dict) -> set:
    """Every stage this lead has ever entered (from its status_history)."""
    return {h["status"] for h in lead["status_history"]}


def scope_leads(branch: Optional[str] = None,
                dfrom: Optional[date] = None,
                dto: Optional[date] = None) -> list:
    """Leads filtered by branch and by created_at within [dfrom, dto]."""
    out = []
    for l in LEADS:
        if branch and l["branch_id"] != branch:
            continue
        if dfrom or dto:
            created = parse_date(l["created_at"])
            if dfrom and created < dfrom:
                continue
            if dto and created > dto:
                continue
        out.append(l)
    return out


def scope_deliveries(branch: Optional[str] = None,
                     dfrom: Optional[date] = None,
                     dto: Optional[date] = None) -> list:
    """Deliveries filtered by branch (via the lead) and delivery_date in range."""
    out = []
    for d in DELIVERIES:
        lead = LEAD_BY_ID.get(d["lead_id"])
        if not lead:
            continue
        if branch and lead["branch_id"] != branch:
            continue
        if dfrom or dto:
            dd = parse_date(d["delivery_date"])
            if dfrom and dd < dfrom:
                continue
            if dto and dd > dto:
                continue
        out.append(d)
    return out
