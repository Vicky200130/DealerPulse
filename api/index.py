"""DealerPulse API — FastAPI backend.

Runs locally via `uvicorn api.index:app --port 8000` and on Vercel as a
Python serverless function (see vercel.json). All routes are namespaced
under /api so the same paths work in local dev and in production.

Common query params:
  branch  — restrict to one branch id (e.g. B3)
  from,to — ISO dates (YYYY-MM-DD) to slice the time range
"""
from datetime import timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .core import loader, metrics, branches, bottlenecks, deliveries as deliv, whatif, insights

app = FastAPI(title="DealerPulse API")

# Permissive CORS — harmless here (no auth/cookies) and avoids dev friction
# if the frontend ever calls the API without the Next.js proxy.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _d(s: Optional[str]):
    return loader.parse_date(s) if s else None


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "branches": len(loader.BRANCHES),
        "sales_reps": len(loader.REPS),
        "leads": len(loader.LEADS),
        "deliveries": len(loader.DELIVERIES),
        "date_range": loader.DATA["metadata"]["date_range"],
        "now_anchor": loader.NOW.isoformat(),
    }


@app.get("/api/overview")
def overview(
    branch: Optional[str] = None,
    rep: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    dfrom, dto = _d(date_from), _d(to)
    # Scoped to one branch → break every contribution down by rep (a by-branch
    # split would be a single, useless row); all-branches → break down by branch.
    grp = "rep" if branch else "branch"
    leads = loader.scope_leads(branch, dfrom, dto)
    dels = loader.scope_deliveries(branch, dfrom, dto)
    # Cascading sales-rep filter: focus the cohort cards (KPIs, funnel, monthly,
    # models, sources) on one rep. The branch ranking / group summary / rep
    # leaderboard below are references and stay unscoped by rep.
    if rep:
        leads = [l for l in leads if l["assigned_to"] == rep]
        dels = [d for d in dels if loader.LEAD_BY_ID.get(d["lead_id"], {}).get("assigned_to") == rep]
    k = metrics.kpis(leads, dels)
    monthly = metrics.monthly_deliveries(dels, by=grp)
    return {
        "kpis": k,
        "deltas": _period_deltas(k, branch, rep, dfrom, dto),
        "momentum": metrics.momentum(monthly),
        # Scoped to one branch → attribute the funnel to reps (a by-branch split
        # would collapse to one row); all-branches → attribute to branches.
        "funnel": metrics.funnel(leads, group_by=grp),
        "speed_to_lead": metrics.speed_to_lead(leads),
        "monthly": monthly,
        "branch_health": branches.branch_health(dfrom, dto),
        "group_target": branches.group_target(dfrom, dto),
        "forecast": branches.group_forecast(dfrom, dto),
        # Present only when scoped to a branch: that branch's reps, so the overview
        # can show a "Sales rep performance" table in place of branch ranking.
        "reps": branches.rep_leaderboard(branch, dfrom, dto) if branch else None,
        "lost_reasons": insights.lost_reasons(leads),
        "model_mix": deliv.model_mix(branch, dfrom, dto, by=grp, rep=rep),
        "source_quality": insights.source_quality(leads, by=grp),
        "now": loader.NOW.date().isoformat(),
    }


def _period_deltas(cur: dict, branch, rep, dfrom, dto):
    """Relative change vs the previous equal-length window.

    Returns None when no window is selected, or when the previous window would
    run off the front of the dataset — so we never compare against a period
    that is really just missing data. Honors the rep filter so the delta compares
    like-for-like (rep-current vs rep-previous, not rep vs whole branch).
    """
    if not (dfrom and dto):
        return None
    length = (dto - dfrom).days + 1
    p_to = dfrom - timedelta(days=1)
    p_from = p_to - timedelta(days=length - 1)
    if p_from < loader.DATA_START:
        return None
    p_leads = loader.scope_leads(branch, p_from, p_to)
    p_dels = loader.scope_deliveries(branch, p_from, p_to)
    if rep:
        p_leads = [l for l in p_leads if l["assigned_to"] == rep]
        p_dels = [d for d in p_dels if loader.LEAD_BY_ID.get(d["lead_id"], {}).get("assigned_to") == rep]
    prev = metrics.kpis(p_leads, p_dels)

    def rel(key):
        c, p = cur[key], prev[key]
        return round((c - p) / p, 4) if p else None

    # Only delivery-based metrics get a delta — they're robust for any window.
    # Conversion is a lead-cohort metric that swings wildly on short/recent
    # windows (Dec leads haven't matured), so we deliberately omit it.
    return {
        "revenue_booked": rel("revenue_booked"),
        "cars_delivered": rel("cars_delivered"),
    }


@app.get("/api/branches")
def list_branches(
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    return branches.branch_health(_d(date_from), _d(to))


@app.get("/api/branches/{bid}")
def branch_detail(
    bid: str,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    detail = branches.branch_detail(bid, _d(date_from), _d(to))
    if not detail:
        raise HTTPException(status_code=404, detail=f"Branch {bid} not found")
    return detail


@app.get("/api/reps")
def list_reps(
    branch: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    return branches.rep_leaderboard(branch, _d(date_from), _d(to))


@app.get("/api/reps/{rid}")
def rep_detail(
    rid: str,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    detail = branches.rep_detail(rid, _d(date_from), _d(to))
    if not detail:
        raise HTTPException(status_code=404, detail=f"Rep {rid} not found")
    return detail


@app.get("/api/bottlenecks")
def bottlenecks_ep(
    idle: int = 7,
    branch: Optional[str] = None,
    rep: Optional[str] = None,
    search: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    leads = loader.scope_leads(branch, _d(date_from), _d(to))
    if rep:  # sales-rep view: only this rep's own deals
        leads = [l for l in leads if l["assigned_to"] == rep]
    return bottlenecks.bottlenecks(leads, idle_min=idle, search=search)


@app.get("/api/deliveries")
def deliveries_ep(
    branch: Optional[str] = None,
    rep: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    dfrom, dto = _d(date_from), _d(to)
    return {
        "analysis": deliv.delivery_analysis(branch, dfrom, dto, rep=rep),
        "model_mix": deliv.model_mix(branch, dfrom, dto, rep=rep),
        "awaiting": deliv.awaiting_orders(branch, dfrom, dto, rep=rep),
        "now": loader.NOW.date().isoformat(),
    }


@app.get("/api/insights")
def insights_ep(
    branch: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    dfrom, dto = _d(date_from), _d(to)
    leads = loader.scope_leads(branch, dfrom, dto)
    dels = loader.scope_deliveries(branch, dfrom, dto)
    bh = branches.branch_health(dfrom, dto)  # cross-branch, for the outlier signal
    return {
        "signals": insights.signals(leads, dels, bh, branch),
        "leak": insights.revenue_leak(leads),
        "source_quality": insights.source_quality(leads),
        "kpis": metrics.kpis(leads, dels),
        "now": loader.NOW.date().isoformat(),
    }


@app.get("/api/whatif")
def whatif_ep(
    lift: float = 10,
    branch: Optional[str] = None,
    date_from: Optional[str] = Query(None, alias="from"),
    to: Optional[str] = None,
):
    return whatif.simulate(lift, branch, _d(date_from), _d(to))
