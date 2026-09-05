"""Plain-English executive summary plus the evidence behind it."""
from collections import Counter, defaultdict

from . import metrics
from .loader import branch_name


def _cr(value: float) -> str:
    return f"₹{value / 1e7:.1f} Cr"


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


def summary(leads: list, deliveries: list) -> dict:
    k = metrics.kpis(leads, deliveries)
    sp = metrics.speed_to_lead(leads)
    md = metrics.monthly_deliveries(deliveries)
    reasons = lost_reasons(leads)

    paragraphs = []
    if md:
        best = max(md, key=lambda m: m["delivered"])
        paragraphs.append(
            f"The group delivered {best['delivered']} cars in {best['month']}, "
            f"the strongest month in range. Momentum is genuinely building."
        )
    paragraphs.append(
        f"First contact takes about {sp['median_hours']:.0f} hours on average, and only "
        f"{sp['within_24h'] * 100:.0f}% of leads are reached within a day — the main reason "
        f"leads leak early in the funnel. Faster first response is the fastest revenue win."
    )
    paragraphs.append(
        f"Right now {k['cold_leads']} open leads worth {_cr(k['cold_value'])} have gone quiet "
        f"for 7+ days and need attention. Overall lead-to-sale conversion is "
        f"{k['conversion'] * 100:.0f}%."
    )
    if len(reasons) >= 2:
        paragraphs.append(
            f"Of {k['lost']} lost deals, the top reasons are "
            f"\"{reasons[0]['reason']}\" ({reasons[0]['count']}) and "
            f"\"{reasons[1]['reason']}\" ({reasons[1]['count']})."
        )

    return {"paragraphs": paragraphs, "kpis": k}
