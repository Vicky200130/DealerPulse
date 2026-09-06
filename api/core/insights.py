"""Prescriptive insights: what the numbers say, and what to do about it.

Instead of a wall of prose, the Insights screen leads with a few `signals`
(verdict + one number + a next action), then shows exactly where revenue leaks
out of the funnel. Everything here is deterministic — no LLM cost.
"""
from collections import Counter, defaultdict
from datetime import datetime

from . import metrics
from .loader import STAGES, branch_name, stages_reached


def _cr(value: float) -> str:
    return f"₹{value / 1e7:.1f} Cr"


def _month_label(ym: str) -> str:
    """"2025-12" -> "December" (falls back to the raw value if unparseable)."""
    try:
        return datetime.strptime(ym, "%Y-%m").strftime("%B")
    except ValueError:
        return ym


def lost_reasons(leads: list) -> list:
    c = Counter(l.get("lost_reason") for l in leads
                if l["status"] == "lost" and l.get("lost_reason"))
    return [{"reason": r, "count": n} for r, n in c.most_common()]


def source_quality(leads: list) -> list:
    d = defaultdict(lambda: {"leads": 0, "delivered": 0, "by_branch": defaultdict(int)})
    for l in leads:
        d[l["source"]]["leads"] += 1
        d[l["source"]]["by_branch"][l["branch_id"]] += 1  # which branch this lead came into
        if l["status"] == "delivered":
            d[l["source"]]["delivered"] += 1
    rows = [{
        "source": s,
        "leads": v["leads"],
        "delivered": v["delivered"],
        "rate": round(v["delivered"] / v["leads"], 4) if v["leads"] else 0,
        "by_branch": sorted(
            ({"branch": branch_name(bid), "count": c} for bid, c in v["by_branch"].items()),
            key=lambda x: -x["count"],
        ),
    } for s, v in d.items()]
    rows.sort(key=lambda r: -r["rate"])
    return rows


# The funnel stages a lost deal can die at, in order, with a plain-English
# label + one-line description. order_placed losses (rare) fold into the
# closest-to-money "negotiation" bucket.
LEAK_STAGES = [
    ("new", "Never worked", "died before first contact"),
    ("contacted", "Stalled after contact", "contacted, then went quiet"),
    ("test_drive", "After test drive", "drove it, didn't buy"),
    ("negotiation", "In negotiation", "closest to the money"),
]
_LEAK_KEYS = {k for k, _, _ in LEAK_STAGES}


def _deepest_stage(lead: dict) -> str:
    """The furthest funnel stage a lead ever reached (from its history)."""
    seen = stages_reached(lead)
    for s in reversed(STAGES):
        if s in seen:
            return s
    return "new"


def revenue_leak(leads: list) -> dict:
    """Lost pipeline grouped by WHERE in the funnel it leaked out — the cut that
    points at an action, not just a reason. Each bucket carries its ₹ value,
    count, share of total loss, and the single most common reason at that stage.
    """
    lost = [l for l in leads if l["status"] == "lost"]
    buckets = {k: {"count": 0, "value": 0, "reasons": Counter()} for k in _LEAK_KEYS}
    total_value = 0
    for l in lost:
        st = _deepest_stage(l)
        if st not in buckets:          # order_placed / delivered -> nearest bucket
            st = "negotiation"
        v = l.get("deal_value", 0)
        buckets[st]["count"] += 1
        buckets[st]["value"] += v
        total_value += v
        if l.get("lost_reason"):
            buckets[st]["reasons"][l["lost_reason"]] += 1
    rows = []
    for key, label, desc in LEAK_STAGES:
        b = buckets[key]
        top = b["reasons"].most_common(1)
        rows.append({
            "stage": key,
            "label": label,
            "desc": desc,
            "count": b["count"],
            "value": b["value"],
            "share": round(b["value"] / total_value, 4) if total_value else 0,
            "top_reason": top[0][0] if top else None,
        })
    return {"rows": rows, "total_value": total_value, "total_count": len(lost)}


# Loss reasons that mean we lost the customer to a rival (price/brand), as
# opposed to the customer simply not buying. Drives the "losing to rivals" card.
_COMPETITOR_REASONS = {"Better offer elsewhere", "Chose competitor brand"}


def signals(leads: list, deliveries: list, branch_health: list = None,
            branch: str = None) -> list:
    """The 3-4 prescriptive cards at the top of the page: each a verdict, one
    highlighted number, and a concrete next action. Signals self-select — a card
    only appears when the data actually warrants it (e.g. the branch-outlier
    card is skipped when a single branch is already selected)."""
    out = []
    lost = [l for l in leads if l["status"] == "lost"]
    total_lost_value = sum(l.get("deal_value", 0) for l in lost)

    # 1) Never-contacted leads — the biggest, and free to fix (process, not price).
    never = [l for l in leads if "contacted" not in stages_reached(l)]
    never_lost = [l for l in never if l["status"] == "lost"]
    if never and never_lost:
        loss_rate = len(never_lost) / len(never)
        nv = sum(l.get("deal_value", 0) for l in never_lost)
        share = nv / total_lost_value if total_lost_value else 0
        out.append({
            "severity": "critical",
            "tag": "Biggest lever",
            "value": str(len(never)),
            "unit": "leads never called",
            "verdict": (f"{loss_rate * 100:.0f}% of them were lost — that's {_cr(nv)}, "
                        f"{share * 100:.0f}% of all lost pipeline."),
            "action": "Enforce a same-day first-touch rule at every branch.",
        })

    # 2) A single branch dragging the group down (all-branches view only).
    if not branch and branch_health and len(branch_health) >= 3:
        ranked = [b for b in branch_health if b.get("conversion") is not None]
        if ranked:
            worst = min(ranked, key=lambda b: b["conversion"])
            others = [b["conversion"] for b in ranked if b["id"] != worst["id"]]
            if others and worst["conversion"] < min(others) * 0.6:
                lo, hi = min(others), max(others)
                out.append({
                    "severity": "warning",
                    "tag": "One branch is dragging",
                    "value": f"{worst['conversion'] * 100:.0f}%",
                    "unit": f"{worst['name']} conversion",
                    "verdict": (f"Every other branch converts {lo * 100:.0f}-{hi * 100:.0f}%. "
                                f"This is a branch problem, not the market."),
                    "action": f"Manager review at {worst['name']} this week.",
                })

    # 3) Genuine momentum — latest month is the best in range and still rising.
    md = metrics.monthly_deliveries(deliveries)
    if len(md) >= 2:
        cur, prev = md[-1], md[-2]
        best = max(md, key=lambda m: m["delivered"])
        if cur["delivered"] >= best["delivered"] and cur["delivered"] > prev["delivered"]:
            out.append({
                "severity": "good",
                "tag": "Working — keep it",
                "value": str(cur["delivered"]),
                "unit": f"cars in {_month_label(cur['month'])}",
                "verdict": (f"Best month in range, up from {prev['delivered']} in "
                            f"{_month_label(prev['month'])}. Momentum is genuine."),
                "action": "Replicate this month's playbook into the next quarter.",
            })

    # 4) Revenue lost to rivals (price/brand) — a pricing & finance-desk problem.
    comp = [l for l in lost if l.get("lost_reason") in _COMPETITOR_REASONS]
    if comp:
        cv = sum(l.get("deal_value", 0) for l in comp)
        by = Counter()
        for l in comp:
            by[l["lost_reason"]] += l.get("deal_value", 0)
        parts = ", ".join(f"{_cr(v)} “{r.lower()}”" for r, v in by.most_common())
        out.append({
            "severity": "critical",
            "tag": "Losing to rivals",
            "value": _cr(cv),
            "unit": "lost to competitors",
            "verdict": f"Driven by {parts}.",
            "action": "Pricing & finance-desk review on live deals.",
        })

    return out
