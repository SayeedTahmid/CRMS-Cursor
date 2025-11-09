"""Log API endpoints (PRD-aligned)"""
from datetime import datetime
from flask import Blueprint, request, jsonify,current_app
from google.cloud import firestore
from google.cloud.firestore_v1 import FieldFilter

from utils.firebase import get_db
from models.log import Log
from api.auth import require_auth

logs_bp = Blueprint("logs", __name__)

# ---------- helpers ----------

def _safe_int(v, default):
    try:
        return int(v)
    except Exception:
        return default

def _parse_iso_dt(s):
    """Accept 'YYYY-MM-DD' or full ISO; return None if invalid."""
    if not s:
        return None
    try:
        if len(s) == 10:
            return datetime.fromisoformat(s)  # midnight local
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception:
        return None

def _tenant_id(db, uid):
    u = db.collection("users").document(uid).get()
    return (u.to_dict() or {}).get("tenant_id", "default") if u.exists else "default"

def _forbidden_cross_tenant(doc_data, tenant_id):
    return (doc_data or {}).get("tenant_id") != tenant_id

# ---------- routes ----------

@logs_bp.route("", methods=["GET"])
@require_auth
def list_logs():
    """
    GET /logs  (via app's url_prefix)
    PRD filters: customerId, type, start/end -> 'from'/'to', page, limit, orderBy, orderDir
    Backward-compatible aliases: pageSize, customer_id
    """
    try:
        db = get_db()
        uid = request.user["uid"]
        tenant_id = _tenant_id(db, uid)

        # Pagination (PRD: page + limit; also accept pageSize)
        page = max(_safe_int(request.args.get("page", 1), 1), 1)
        limit = _safe_int(request.args.get("limit", request.args.get("pageSize", 20)), 20)
        page_size = min(max(limit, 1), 100)
        offset = (page - 1) * page_size

        # Filters
        customer_id = request.args.get("customerId") or request.args.get("customer_id")
        log_type = request.args.get("type")
        q_search = (request.args.get("search") or "").strip().lower()

        from_dt = _parse_iso_dt(request.args.get("from") or request.args.get("startDate"))
        to_dt   = _parse_iso_dt(request.args.get("to") or request.args.get("endDate"))

        # Ordering (default newest first)
        order_by = (request.args.get("orderBy") or "created_at").strip()
        order_dir = (request.args.get("orderDir") or "desc").strip().lower()
        direction = firestore.Query.DESCENDING if order_dir != "asc" else firestore.Query.ASCENDING

        # Base query: tenant isolation
        query = db.collection("logs").where(filter=FieldFilter("tenant_id", "==", tenant_id))

        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        if log_type:
            query = query.where(filter=FieldFilter("type", "==", log_type))
        if from_dt:
            query = query.where(filter=FieldFilter("created_at", ">=", from_dt))
        if to_dt:
            query = query.where(filter=FieldFilter("created_at", "<=", to_dt))

        # Firestore requires order_by with inequality; also guard unknown fields
        try:
            query = query.order_by(order_by, direction=direction)
        except Exception:
            query = query.order_by("created_at", direction=direction)

        # Simple offset pagination (MVP). For large sets, move to cursor-based.
        docs = list(query.offset(offset).limit(page_size).stream())

        items = []
        for d in docs:
            data = d.to_dict() or {}
            if _forbidden_cross_tenant(data, tenant_id):
                # Shouldn't happen given the base filter, but keep safe
                continue
            data["id"] = d.id
            if q_search:
                hay = " ".join([
                    str(data.get("title", "")),
                    str(data.get("subject", "")),
                    str(data.get("description", "")),
                    str(data.get("type", "")),
                ]).lower()
                if q_search not in hay:
                    continue
            items.append(data)

        return jsonify({
            "logs": items,
            "page": page,
            "limit": page_size,
            "returned": len(items)
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["GET"])
@require_auth
def get_log(log_id):
    """GET /logs/:id — with tenant check"""
    try:
        if not log_id or log_id.strip().lower() in {"undefined", "null", "none"}:
            return jsonify({"error": "log_id is required"}), 400

        db = get_db()
        uid = request.user["uid"]
        tenant_id = _tenant_id(db, uid)

        doc = db.collection("logs").document(log_id).get()
        if not doc.exists:
            return jsonify({"error": "Log not found"}), 404

        data = doc.to_dict() or {}
        if _forbidden_cross_tenant(data, tenant_id):
            return jsonify({"error": "Forbidden: cross-tenant access"}), 403

        # Normalize via model (keeps your existing serializer behavior)
        log = Log.from_dict(doc.id, data)
        return jsonify(log.to_dict()), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logs_bp.route("", methods=["POST"])
@require_auth
def create_log():
    """POST /logs — create log (PRD allows POST /customers/:customerId/logs too; this variant accepts customerId in body)."""
    try:
        db = get_db()
        uid = request.user["uid"]
        tenant_id = _tenant_id(db, uid)

        data = request.get_json(force=True) or {}

        # Normalize expected fields
        payload = {
            "type": data.get("type"),
            "title": data.get("title"),
            "subject": data.get("subject"),
            "description": data.get("description"),
            "customer_id": data.get("customerId") or data.get("customer_id"),
            "thread_id": data.get("threadId") or data.get("thread_id"),
            "attachments": data.get("attachments") or [],
            "tags": data.get("tags") or [],
            "created_by": uid,
            "tenant_id": tenant_id,
            # optional client-provided log date (string ISO or YYYY-MM-DD)
            "log_date": data.get("log_date") or data.get("logDate"),
            # timestamps via server
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }

        # Minimal validation (MVP)
        if not payload["type"]:
            return jsonify({"error": "type is required"}), 400
        if not payload["customer_id"]:
            return jsonify({"error": "customerId is required"}), 400

        # Persist (let Firestore allocate id)
        doc_ref = db.collection("logs").document()
        payload["id"] = doc_ref.id

        # If client sent a simple date like '2025-11-09', keep it as date string
        # If they sent ISO, store as string; you can later parse to Timestamp if needed.
        # (Keeping as string avoids JSON serialization issues here.)
        doc_ref.set(payload)

        # Touch customer's last_contact_date (best-effort)
        try:
            db.collection("customers").document(payload["customer_id"]).update({
                "last_contact_date": firestore.SERVER_TIMESTAMP,
                "updated_at": firestore.SERVER_TIMESTAMP,
            })
        except Exception:
            pass

        # Re-read to get resolved server timestamps
        snap = doc_ref.get()
        doc = snap.to_dict() or {}

        # JSON-safe conversion for timestamp-like fields
        def _iso(v):
            try:
                return v.isoformat()
            except Exception:
                return v  # keep original (string or None)

        for k in ("created_at", "updated_at"):
            if k in doc:
                doc[k] = _iso(doc[k])

        # If you decide to store log_date as a Timestamp later, the same _iso() will handle it.

        return jsonify({
            "message": "Log created successfully",
            "log": {"id": doc_ref.id, **doc}
        }), 201

    except Exception as e:
        current_app.logger.exception("create_log failed")
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["PUT"])
@require_auth
def update_log(log_id):
    """PUT /logs/:id — update log (tenant checked)"""
    try:
        db = get_db()
        uid = request.user["uid"]
        tenant_id = _tenant_id(db, uid)

        ref = db.collection("logs").document(log_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"error": "Log not found"}), 404

        existing = snap.to_dict() or {}
        if _forbidden_cross_tenant(existing, tenant_id):
            return jsonify({"error": "Forbidden: cross-tenant update"}), 403

        body = request.get_json(force=True) or {}
        # Only allow safe fields to change
        updatable = {
            "type", "title", "subject", "description",
            "thread_id", "attachments", "tags", "customer_id"
        }
        delta = {k: v for k, v in body.items() if k in updatable}
        if not delta:
            return jsonify({"message": "No changes"}), 200

        delta["updated_at"] = firestore.SERVER_TIMESTAMP
        ref.set(delta, merge=True)

        # Return merged doc
        merged = {**existing, **delta}
        merged["id"] = log_id
        return jsonify({
            "message": "Log updated successfully",
            "log": merged
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["DELETE"])
@require_auth
def delete_log(log_id):
    """DELETE /logs/:id — delete with tenant check"""
    try:
        if not log_id or log_id.strip().lower() in {"undefined", "null", "none"}:
            return jsonify({"error": "log_id is required"}), 400

        db = get_db()
        uid = request.user["uid"]
        tenant_id = _tenant_id(db, uid)

        ref = db.collection("logs").document(log_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"error": "Log not found"}), 404

        if _forbidden_cross_tenant(snap.to_dict(), tenant_id):
            return jsonify({"error": "Forbidden: cross-tenant delete"}), 403

        ref.delete()
        return jsonify({"message": "Log deleted successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
