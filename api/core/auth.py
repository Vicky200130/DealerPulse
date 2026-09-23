"""Request-scoped authorization context.

The frontend attaches one header on every call — `extended-data`, a base64 of
the active view JSON ({user_role, branch_id, rep_id, ...}). This module decodes
it into a `Ctx` and derives the *effective* data scope, so the backend — not the
browser — decides what a viewer may see.

Honest caveat: the header is NOT signed, so it is forgeable. This demonstrates
the authorization *architecture*, not production security; the production step
is a signed JWT the backend verifies. A missing/invalid header defaults to admin
(matching the app's original no-auth behaviour); a production system would
default-deny instead.
"""
import base64
import json
from dataclasses import dataclass
from typing import Optional, Tuple

from fastapi import Header, HTTPException

ADMIN = "admin"
BRANCH_MANAGER = "branch_manager"
SALES_REP = "sales_rep"


@dataclass
class Ctx:
    role: str
    branch_id: Optional[str] = None
    rep_id: Optional[str] = None


def get_ctx(
    extended_data: Optional[str] = Header(default=None, alias="extended-data", convert_underscores=False),
) -> Ctx:
    """FastAPI dependency: decode the `extended-data` header into a Ctx.

    Anything malformed (or absent) falls back to admin, so the app keeps working
    exactly as it did before auth existed.
    """
    if not extended_data:
        return Ctx(role=ADMIN)
    try:
        payload = json.loads(base64.b64decode(extended_data).decode("utf-8"))
    except Exception:
        return Ctx(role=ADMIN)
    role = payload.get("user_role") or ADMIN
    return Ctx(role=role, branch_id=payload.get("branch_id"), rep_id=payload.get("rep_id"))


def effective_scope(ctx: Ctx, branch: Optional[str], rep: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """Override the query's branch/rep with what the role is allowed to see.

    - admin          → honour the query as-is.
    - branch_manager → force their branch; a rep filter may still narrow WITHIN it
                       (a rep from another branch simply matches nothing, so it
                       can never widen scope).
    - sales_rep      → force both branch and rep to their own; ignore the query.
    """
    if ctx.role == BRANCH_MANAGER:
        return ctx.branch_id, rep
    if ctx.role == SALES_REP:
        return ctx.branch_id, ctx.rep_id
    return branch, rep


def require_admin(ctx: Ctx) -> None:
    """Guard for group-wide, cross-branch endpoints (the branch list, etc.)."""
    if ctx.role != ADMIN:
        raise HTTPException(status_code=403, detail="Not permitted for this role")


def require_branch_access(ctx: Ctx, bid: str) -> None:
    """A branch drill-down: admins see any branch; a manager only their own."""
    if ctx.role == ADMIN:
        return
    if ctx.role == BRANCH_MANAGER and ctx.branch_id == bid:
        return
    raise HTTPException(status_code=403, detail="Not permitted for this branch")


def require_rep_access(ctx: Ctx, rep_branch_id: str, rep_id: str) -> None:
    """A rep drill-down: admins see anyone; a manager sees reps in their branch;
    a sales rep sees only themselves."""
    if ctx.role == ADMIN:
        return
    if ctx.role == BRANCH_MANAGER and ctx.branch_id == rep_branch_id:
        return
    if ctx.role == SALES_REP and ctx.rep_id == rep_id:
        return
    raise HTTPException(status_code=403, detail="Not permitted for this rep")
