# backend/api/complaints.py
from flask import Blueprint, request, jsonify
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from .auth import require_auth
from .helpers import current_user 
from utils.firebase import get_db  # your Firestore client factory

complaints_bp = Blueprint("complaints", __name__)

def _bad(s): 
    return not s or not str(s).strip() or str(s).strip().lower() in {"undefined", "null", "none"}
   
def _uid_and_tenant():
    u = current_user() or {}
    return u.get("uid"), u.get("tenant_id")

def _ensure_same_tenant(doc, tenant_id):
    if not doc.exists:
        return False, ("Not found", 404)
    data = doc.to_dict() or {}
    if data.get("tenant_id") != tenant_id:
        return False, ("Forbidden: cross-tenant access", 403)
    return True, data

# -----------------------------------------------------------------------------
# NEW: List complaints (tenant scoped)  GET /api/complaints?customerId=&status=&search=&page=&pageSize=
# -----------------------------------------------------------------------------
@complaints_bp.route("", methods=["GET"])
@require_auth
def list_complaints():
    try:
        db = get_db()
        uid, tenant_id = _uid_and_tenant()
        if _bad(tenant_id):
            return jsonify({"error": "Missing tenant_id on user"}), 401

        customer_id = request.args.get("customerId")
        status = request.args.get("status")
        search = (request.args.get("search") or "").strip().lower()
        try:
            page = max(1, int(request.args.get("page", 1)))
            page_size = max(1, min(100, int(request.args.get("pageSize", 20))))
        except ValueError:
            page, page_size = 1, 20

        q = db.collection("complaints").where(filter=FieldFilter("tenant_id", "==", tenant_id))
        if customer_id:
            q = q.where(filter=FieldFilter("customer_id", "==", customer_id))
        if status:
            q = q.where(filter=FieldFilter("status", "==", status))

        # Order newest first by created_at if present; otherwise Firestore default
        try:
            from google.cloud import firestore
            q = q.order_by("created_at", direction=firestore.Query.DESCENDING)
        except Exception:
            pass

        offset = (page - 1) * page_size
        q = q.offset(offset).limit(page_size)

        items = []
        for doc in q.stream():
            d = doc.to_dict() or {}
            items.append({"id": doc.id, **d})

        if search:
            items = [
                c for c in items
                if search in str(c.get("title", "")).lower()
                or search in str(c.get("description", "")).lower()
            ]

        has_more = len(items) == page_size
        return jsonify({
            "complaints": items,
            "page": page,
            "pageSize": page_size,
            "hasMore": has_more,
            "total": len(items)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------------------------------------------------------------
# NEW: Get one complaint (tenant scoped)  GET /api/complaints/<complaint_id>
# -----------------------------------------------------------------------------
@complaints_bp.route("/<complaint_id>", methods=["GET"])
@require_auth
def get_complaint(complaint_id):
    try:
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400

        db = get_db()
        uid, tenant_id = _uid_and_tenant()
        if _bad(tenant_id):
            return jsonify({"error": "Missing tenant_id on user"}), 401

        ref = db.collection("complaints").document(complaint_id)
        snap = ref.get()
        ok, payload = _ensure_same_tenant(snap, tenant_id)
        if not ok:
            msg, code = payload
            return jsonify({"error": msg}), code

        return jsonify({"id": snap.id, **payload}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -----------------------------------------------------------------------------
# EXISTING: Create complaint (kept)  POST /api/complaints
# - adds tenant_id, created_by, ticket_number
# -----------------------------------------------------------------------------
@complaints_bp.route("", methods=["POST"])
@require_auth
def create_complaint():
    body = request.get_json(force=True) or {}
    customer_id = body.get("customerId") or body.get("customer_id")
    title = body.get("title")
    description = body.get("description", "")
    category = body.get("category", "other")
    severity = body.get("severity", "low")
    attachments = body.get("attachments", [])

    if _bad(customer_id) or _bad(title):
        return jsonify({"error": "customerId and title are required"}), 400

    db = get_db()
    uid, tenant_id = _uid_and_tenant()
    if _bad(tenant_id):
        return jsonify({"error": "Missing tenant_id on user"}), 401

    doc_ref = db.collection("complaints").document()  # auto ID
    ticket_number = f"COMP-{doc_ref.id[:4].upper()}"

    payload = {
        "tenant_id": tenant_id,
        "customer_id": customer_id,
        "title": title,
        "description": description,
        "category": category,
        "severity": severity,
        "status": body.get("status", "new"),
        "priority": body.get("priority", 0),
        "assigned_to": body.get("assigned_to"),
        "sla": body.get("sla", {}),
        "timeline": [],
        "internal_comments": [],
        "customer_updates": [],
        "attachments": attachments,
        "ticket_number": ticket_number,
        "created_at": firestore.SERVER_TIMESTAMP,  # server timestamp via your wrapper
        "created_by": uid,
    }
    doc_ref.set(payload)
    return jsonify({
        "success": True,
        "data": {"id": doc_ref.id, "ticketNumber": ticket_number, "message": "Complaint created successfully"}
    }), 201

# -----------------------------------------------------------------------------
# EXISTING: Update status (kept)  PUT /api/complaints/<complaint_id>/status
# -----------------------------------------------------------------------------
@complaints_bp.route("/<complaint_id>/status", methods=["PUT"])
@require_auth
def update_status(complaint_id):
    body = request.get_json(force=True) or {}
    status = (body.get("status") or "").strip().lower()
    if status not in {"new", "acknowledged", "in_progress", "resolved", "closed"}:
        return jsonify({"error": "invalid status"}), 400

    db = get_db()
    uid, tenant_id = _uid_and_tenant()
    if _bad(tenant_id):
        return jsonify({"error": "Missing tenant_id on user"}), 401

    ref = db.collection("complaints").document(complaint_id)
    snap = ref.get()
    ok, existing = _ensure_same_tenant(snap, tenant_id)
    if not ok:
        msg, code = existing
        return jsonify({"error": msg}), code

    update = {"status": status, "updated_at": firestore.SERVER_TIMESTAMP}
    if status == "resolved":
        update["resolution"] = {
            "notes": body.get("resolutionNotes"),
            "customerSatisfaction": body.get("customerSatisfaction"),
            "resolvedAt": firestore.SERVER_TIMESTAMP,
            "resolvedBy": uid,
        }
    ref.update(update)
    return jsonify({"status": status, "message": "Status updated"})

# -----------------------------------------------------------------------------
# EXISTING: Add internal comment (kept)  POST /api/complaints/<complaint_id>/comments
# -----------------------------------------------------------------------------
@complaints_bp.route("/<complaint_id>/comments", methods=["POST"])
@require_auth
def add_internal_comment(complaint_id):
    body = request.get_json(force=True) or {}
    comment = (body.get("comment") or "").strip()
    if not comment:
        return jsonify({"error": "comment required"}), 400

    db = get_db()
    uid, tenant_id = _uid_and_tenant()
    if _bad(tenant_id):
        return jsonify({"error": "Missing tenant_id on user"}), 401

    ref = db.collection("complaints").document(complaint_id)
    snap = ref.get()
    ok, _ = _ensure_same_tenant(snap, tenant_id)
    if not ok:
        msg, code = _
        return jsonify({"error": msg}), code

    ref.update({
        "internal_comments": firestore.ArrayUnion([{
            "userId": uid,
            "comment": comment,
            "timestamp": firestore.SERVER_TIMESTAMP,
        }]),
        "timeline": firestore.ArrayUnion([{
            "timestamp": firestore.SERVER_TIMESTAMP,
            "action": "internal_comment",
            "userId": uid,
            "details": comment[:140],
        }]),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return jsonify({"message": "Comment added"})

# -----------------------------------------------------------------------------
# EXISTING: Add customer update (kept)  POST /api/complaints/<complaint_id>/updates
# -----------------------------------------------------------------------------
@complaints_bp.route("/<complaint_id>/updates", methods=["POST"])
@require_auth
def add_customer_update(complaint_id):
    body = request.get_json(force=True) or {}
    message = (body.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message required"}), 400

    db = get_db()
    uid, tenant_id = _uid_and_tenant()
    if _bad(tenant_id):
        return jsonify({"error": "Missing tenant_id on user"}), 401

    ref = db.collection("complaints").document(complaint_id)
    snap = ref.get()
    ok, _ = _ensure_same_tenant(snap, tenant_id)
    if not ok:
        msg, code = _
        return jsonify({"error": msg}), code

    ref.update({
        "customer_updates": firestore.ArrayUnion([{
            "message": message,
            "timestamp": firestore.SERVER_TIMESTAMP,
            "sentBy": uid,
        }]),
        "timeline": firestore.ArrayUnion([{
            "timestamp": firestore.SERVER_TIMESTAMP,
            "action": "customer_update",
            "userId": uid,
            "details": message[:140],
        }]),
        "updated_at": firestore.SERVER_TIMESTAMP,
    })
    return jsonify({"message": "Update recorded"})

# -----------------------------------------------------------------------------
# NEW: Delete (soft close)  DELETE /api/complaints/<complaint_id>
# -----------------------------------------------------------------------------
@complaints_bp.route("/<complaint_id>", methods=["DELETE"])
@require_auth
def delete_complaint(complaint_id):
    try:
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400

        db = get_db()
        uid, tenant_id = _uid_and_tenant()
        if _bad(tenant_id):
            return jsonify({"error": "Missing tenant_id on user"}), 401

        ref = db.collection("complaints").document(complaint_id)
        snap = ref.get()
        ok, existing = _ensure_same_tenant(snap, tenant_id)
        if not ok:
            msg, code = existing
            return jsonify({"error": msg}), code

        # Soft delete: mark closed (keeps history)
        ref.update({"status": "closed", "updated_at": firestore.SERVER_TIMESTAMP})
        return jsonify({"message": "Complaint closed"}), 200

        # If you prefer hard delete, use:
        # ref.delete()
        # return jsonify({"message": "Complaint deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
