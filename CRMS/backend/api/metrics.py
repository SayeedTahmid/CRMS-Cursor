from flask import Blueprint, jsonify, request, current_app
from google.cloud.firestore_v1 import FieldFilter
from datetime import datetime, timedelta, timezone

from utils.firebase import get_db
from api.auth import require_auth

metrics_bp = Blueprint("metrics", __name__)

def _utc_now():
    return datetime.now(timezone.utc)

@metrics_bp.route("/summary", methods=["GET"])
@require_auth
def summary():
    """
    Returns dashboard KPIs for the current tenant with robust error handling.
    Always returns 200 with numbers (0 on failure) so the UI never breaks.
    """
    db = get_db()
    uid = request.user.get("uid")

    safe = {
        "total_customers": 0,
        "active_customers": 0,
        "open_complaints": 0,
        "recent_logs_7d": 0,
        "performance_month": 0
    }

    try:
        udoc = db.collection("users").document(uid).get()
        tenant_id = (udoc.to_dict() or {}).get("tenant_id", "default") if udoc.exists else "default"

        now = _utc_now()
        start_7d = now - timedelta(days=7)
        start_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Customers
        customers_col = db.collection("customers")
        total_customers = sum(
            1 for _ in customers_col
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))
            .where(filter=FieldFilter("status", "in", ["active", "prospect", "inactive"]))
            .stream()
        )
        active_customers = sum(
            1 for _ in customers_col
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))
            .where(filter=FieldFilter("status", "==", "active"))
            .stream()
        )

        # Complaints
        complaints_col = db.collection("complaints")
        open_complaints = sum(
            1 for _ in complaints_col
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))
            .where(filter=FieldFilter("status", "in", ["open", "in_progress"]))
            .stream()
        )

        # Logs
        logs_col = db.collection("logs")
        recent_logs_7d = sum(
            1 for _ in logs_col
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))
            .where(filter=FieldFilter("created_at", ">=", start_7d))
            .stream()
        )
        performance_month = sum(
            1 for _ in logs_col
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))
            .where(filter=FieldFilter("created_at", ">=", start_month))
            .stream()
        )

        return jsonify({
            "total_customers": total_customers,
            "active_customers": active_customers,
            "open_complaints": open_complaints,
            "recent_logs_7d": recent_logs_7d,
            "performance_month": performance_month
        }), 200

    except Exception as e:
        # Log but keep the UI alive
        current_app.logger.exception("metrics.summary failed")
        return jsonify(safe | {"__error": str(e)}), 200
