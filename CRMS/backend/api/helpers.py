# backend/api/helpers.py
from flask import request

def current_user():
    """Return the user dict attached by @require_auth, or {} if missing."""
    return getattr(request, "user", {}) or {}
