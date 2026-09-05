"""What-if simulator: model the revenue impact of a conversion lift.

Lever: test-drive -> order conversion. A `lift_pct` (percentage points) is
applied to the test-drive cohort to estimate extra orders and revenue at the
current average deal value.
"""
from .loader import scope_leads, stages_reached


def simulate(lift_pct: float = 10, branch=None) -> dict:
    leads = scope_leads(branch)
    test_drives = sum(1 for l in leads if "test_drive" in stages_reached(l))
    orders = sum(1 for l in leads if "order_placed" in stages_reached(l))
    delivered = [l for l in leads if l["status"] == "delivered"]

    avg_deal = round(sum(l.get("deal_value", 0) for l in delivered) / len(delivered)) if delivered else 0
    current_rate = orders / test_drives if test_drives else 0
    additional_orders = round(test_drives * (lift_pct / 100))
    additional_revenue = additional_orders * avg_deal
    current_revenue = sum(l.get("deal_value", 0) for l in delivered)

    return {
        "lift_pct": lift_pct,
        "test_drives": test_drives,
        "current_rate": round(current_rate, 4),
        "projected_rate": round(current_rate + lift_pct / 100, 4),
        "avg_deal_value": avg_deal,
        "additional_orders": additional_orders,
        "additional_revenue": additional_revenue,
        "current_revenue": current_revenue,
        "projected_revenue": current_revenue + additional_revenue,
    }
