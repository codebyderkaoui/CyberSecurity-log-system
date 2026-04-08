"""
utils/auth.py
-------------
Lightweight API-key based authentication + role-based access control (RBAC).

Roles:
  admin   — full access (read, write, delete, run detections)
  analyst — read-only  (GET endpoints only)

Usage in api.py:
  from utils.auth import require_auth, require_role

  @app.route("/api/logs", methods=["GET"])
  @require_auth          # any authenticated user
  def get_logs(): ...

  @app.route("/api/logs/<int:id>", methods=["DELETE"])
  @require_role("admin") # admin only
  def delete_log(id): ...

Configuration:
  Set API keys via environment variables (recommended) or edit API_KEYS below.

  export ADMIN_API_KEY="your-secret-admin-key"
  export ANALYST_API_KEY="your-secret-analyst-key"

  The client sends the key in the request header:
    X-API-Key: your-secret-admin-key
"""

import os
import functools
from flask import request, jsonify, g


# ---------------------------------------------------------------------------
# Key store — reads from env vars, falls back to defaults for development
# ---------------------------------------------------------------------------

API_KEYS: dict[str, str] = {
    os.getenv("ADMIN_API_KEY",   "admin-dev-key-changeme"):   "admin",
    os.getenv("ANALYST_API_KEY", "analyst-dev-key-changeme"): "analyst",
}

# Role hierarchy: what each role is allowed to do
ROLE_PERMISSIONS: dict[str, set[str]] = {
    "admin":   {"read", "write", "delete", "analyze"},
    "analyst": {"read"},
}


def _get_current_role() -> str | None:
    """Extract API key from header and return the associated role, or None."""
    api_key = request.headers.get("X-API-Key", "").strip()
    return API_KEYS.get(api_key)          # None if key not found


def _has_permission(role: str, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


# ---------------------------------------------------------------------------
# Decorators
# ---------------------------------------------------------------------------

def require_auth(f):
    """
    Decorator: requires any valid API key.
    Stores the role in Flask's `g` object (g.role) for downstream use.
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        role = _get_current_role()
        if role is None:
            return jsonify({
                "success": False,
                "error":   "Unauthorized — provide a valid X-API-Key header"
            }), 401
        g.role = role
        return f(*args, **kwargs)
    return decorated


def require_role(required_role: str):
    """
    Decorator factory: requires a specific role (or higher).
    Currently: only "admin" can perform admin-only actions.

    Usage:
        @require_role("admin")
        def my_view(): ...
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            role = _get_current_role()
            if role is None:
                return jsonify({
                    "success": False,
                    "error":   "Unauthorized — provide a valid X-API-Key header"
                }), 401

            if role != required_role and role != "admin":
                return jsonify({
                    "success": False,
                    "error":   f"Forbidden — '{required_role}' role required, you have '{role}'"
                }), 403

            g.role = role
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_permission(permission: str):
    """
    Decorator factory: requires a specific permission string.
    More granular than require_role.

    Usage:
        @require_permission("delete")
        def my_view(): ...
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            role = _get_current_role()
            if role is None:
                return jsonify({
                    "success": False,
                    "error":   "Unauthorized — provide a valid X-API-Key header"
                }), 401

            if not _has_permission(role, permission):
                return jsonify({
                    "success": False,
                    "error":   f"Forbidden — '{permission}' permission required, role '{role}' does not have it"
                }), 403

            g.role = role
            return f(*args, **kwargs)
        return decorated
    return decorator
