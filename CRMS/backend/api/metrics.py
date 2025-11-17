# backend/api/metrics.py
from flask import Blueprint, request, jsonify
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import firestore
from datetime import datetime, timedelta, timezone

from api.auth import require_auth, require_permission,require_role
from utils.firebase import get_db

metrics_bp = Blueprint("metrics", __name__)

@metrics_bp.route("", methods=["GET"])
@require_auth
def get_metrics():
    db = get_db()
    uid = request.user["uid"]
    tenant_id = request.user.get("tenant_id", "default")

    # Active customers (active or prospect status) - count separately for compatibility
    active_count = 0
    try:
        # Count active customers
        active_query1 = db.collection("customers")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("status", "==", "active"))\
            .limit(500)
        active_query2 = db.collection("customers")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("status", "==", "prospect"))\
            .limit(500)
        active_count = sum(1 for _ in active_query1.stream()) + sum(1 for _ in active_query2.stream())
    except Exception as e:
        print(f"Error counting active customers: {e}")
        active_count = 0

    # Open complaints (new, acknowledged, or in_progress status) - count separately
    open_count = 0
    try:
        open_query1 = db.collection("complaints")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("status", "==", "new"))\
            .limit(500)
        open_query2 = db.collection("complaints")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("status", "==", "acknowledged"))\
            .limit(500)
        open_query3 = db.collection("complaints")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("status", "==", "in_progress"))\
            .limit(500)
        open_count = sum(1 for _ in open_query1.stream()) + \
                    sum(1 for _ in open_query2.stream()) + \
                    sum(1 for _ in open_query3.stream())
    except Exception as e:
        print(f"Error counting open complaints: {e}")
        open_count = 0

    # Recent logs (last 7 days) - simplified query without date filter if index missing
    logs_7d = 0
    try:
        now = datetime.now(timezone.utc)
        last7 = now - timedelta(days=7)
        recent_logs_query = db.collection("logs")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("created_at", ">=", last7))\
            .limit(1000)  # Reasonable limit for metrics
        logs_7d = sum(1 for _ in recent_logs_query.stream())
    except Exception as e:
        error_str = str(e)
        if "requires an index" in error_str:
            # Fallback: count all logs for tenant (no date filter)
            print(f"⚠️  Index missing for date-filtered logs query. Using fallback (all tenant logs).")
            try:
                fallback_query = db.collection("logs")\
                    .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
                    .limit(1000)
                logs_7d = sum(1 for _ in fallback_query.stream())
            except Exception as e2:
                print(f"Error counting logs (fallback): {e2}")
                logs_7d = 0
        else:
            print(f"Error counting recent logs: {e}")
            logs_7d = 0

    # Simple performance index (current month logs) - simplified if index missing
    performance_month = 0
    try:
        if 'now' not in locals():
            now = datetime.now(timezone.utc)
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        month_logs_query = db.collection("logs")\
            .where(filter=FieldFilter("tenant_id", "==", tenant_id))\
            .where(filter=FieldFilter("created_at", ">=", month_start))\
            .limit(1000)  # Reasonable limit for metrics
        performance_month = sum(1 for _ in month_logs_query.stream())
    except Exception as e:
        error_str = str(e)
        if "requires an index" in error_str:
            # Fallback: use same count as recent logs (approximation)
            print(f"⚠️  Index missing for monthly logs query. Using recent logs count as approximation.")
            performance_month = logs_7d
        else:
            print(f"Error counting monthly logs: {e}")
            performance_month = 0

    return jsonify({
        "active_customers": active_count,
        "open_complaints": open_count,
        "recent_logs_7d": logs_7d,
        "performance_month": performance_month
    }), 200
