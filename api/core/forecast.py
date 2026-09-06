"""Pipeline-based forecast: project how the CURRENT open pipeline will resolve.

This is distinct from the run-rate forecast (recent delivery *speed* vs target,
see `branches._forecast`). Here we weight every open deal by the historical
probability that a lead at its stage eventually delivers — a standard
weighted-pipeline projection. It answers the question the assignment asks
literally: "based on the current pipeline, will branches hit their targets?" —
i.e. of the deals we're holding right now, how many (and how much revenue) will
realistically convert, and where does that leave us.

Stage probabilities are learned once from the FULL dataset (stable, avoids
tiny-sample noise on short windows) and then applied to whatever open pipeline
is in scope. "now" is the dataset anchor and the data ends at the period close,
so we project how the pipeline resolves rather than a remaining-days pace (there
are no remaining days left to run).
"""
from .loader import LEADS, OPEN_STATUSES, STAGES, stages_reached

# Terminal outcomes a historical lead can have settled into.
_TERMINAL = {"delivered", "lost"}
# Open funnel stages, in order, that a live deal can currently sit at.
_OPEN_STAGES = [s for s in STAGES if s in OPEN_STATUSES]


def stage_delivery_rates() -> dict:
    """P(eventually delivered | a lead reached stage S), learned from all history.

    For each open stage we take every lead that (a) ever reached S and (b) has
    since settled (delivered or lost), then measure the share that delivered. The
    rate rises through the funnel — an order-placed deal is far likelier to land
    than an untouched new one — which is what makes a stage-weighted projection
    meaningful rather than a flat guess.
    """
    rates = {}
    for s in _OPEN_STAGES:
        reached = [l for l in LEADS if l["status"] in _TERMINAL and s in stages_reached(l)]
        won = sum(1 for l in reached if l["status"] == "delivered")
        rates[s] = round(won / len(reached), 4) if reached else 0.0
    return rates


# Computed once — the dataset is static within a process.
STAGE_RATES = stage_delivery_rates()


def project(open_leads: list, delivered_count: int) -> dict:
    """Weight each open deal by its stage probability to project the finish.

    Returns the expected additional deliveries/revenue from the current pipeline,
    the projected total (delivered so far + expected), a best case (every open
    deal converts), and a per-stage breakdown for transparency on hover.
    """
    open_leads = [l for l in open_leads if l["status"] in OPEN_STATUSES]
    expected = 0.0
    expected_rev = 0.0
    agg = {s: {"open": 0, "value": 0, "expected": 0.0, "expected_value": 0.0} for s in _OPEN_STAGES}
    for l in open_leads:
        st = l["status"]
        p = STAGE_RATES.get(st, 0.0)
        val = l.get("deal_value", 0)
        expected += p
        expected_rev += p * val
        a = agg[st]
        a["open"] += 1
        a["value"] += val
        a["expected"] += p
        a["expected_value"] += p * val

    projected_total = round(delivered_count + expected)
    by_stage = [
        {
            "stage": s,
            "rate": STAGE_RATES.get(s, 0.0),
            "open": agg[s]["open"],
            "value": agg[s]["value"],
            "expected": round(agg[s]["expected"], 1),
            "expected_value": round(agg[s]["expected_value"]),
        }
        for s in _OPEN_STAGES
        if agg[s]["open"] > 0
    ]
    return {
        "delivered": delivered_count,
        "open_leads": len(open_leads),
        "expected_additional": round(expected, 1),
        "expected_additional_revenue": round(expected_rev),
        "projected_total": projected_total,
        "best_case": delivered_count + len(open_leads),
        "pipeline_value": sum(l.get("deal_value", 0) for l in open_leads),
        "by_stage": by_stage,
    }


def with_target(proj: dict, target: int) -> dict:
    """Attach target context to a projection.

    Targets in this dataset are aspirational (≈9× actual delivery pace), so
    `on_track` is defined generously and will honestly be false almost
    everywhere — that's deliberate. The UI leads with the projection and the
    winnable revenue, and states plainly that the target is a stretch goal,
    rather than stamping every branch with a red MISS. (Consistent with the
    group-relative ranking decision documented in DECISIONS.md.)
    """
    out = dict(proj)
    out["target_units"] = target
    out["attainment_now"] = round(proj["delivered"] / target, 4) if target else 0
    out["attainment_projected"] = round(proj["projected_total"] / target, 4) if target else 0
    out["on_track"] = target > 0 and proj["projected_total"] >= 0.9 * target
    return out
