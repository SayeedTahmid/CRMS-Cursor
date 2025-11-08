# backend/api/complaints.py
from flask import Blueprint, request, jsonify
from google.cloud.firestore_v1.base_query import FieldFilter
from .auth import require_auth, current_user  # your existing helpers
from .db import get_db  # your Firestore client factory

complaints_bp = Blueprint("complaints", __name__, url_prefix="/api/complaints")

def _bad(s): return not s or not str(s).strip()

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
    doc_ref = db.collection("complaints").document()  # auto ID
    ticket_number = f"COMP-{doc_ref.id[:4].upper()}"

    payload = {
        "tenant_id": current_user().get("tenant_id"),
        "customer_id": customer_id,
        "title": title,
        "description": description,
        "category": category,
        "severity": severity,
        "status": "new",
        "priority": body.get("priority", 0),
        "assigned_to": body.get("assigned_to"),
        "sla": body.get("sla", {}),
        "timeline": [],
        "internal_comments": [],
        "customer_updates": [],
        "attachments": attachments,
        "ticket_number": ticket_number,
        "created_at": db.CLIENT._now(),  # Firestore server timestamp
        "created_by": current_user().get("uid"),
    }
    doc_ref.set(payload)
    return jsonify({"success": True, "data": {"id": doc_ref.id, "ticketNumber": ticket_number,
                                              "message": "Complaint created successfully"}}), 201

@complaints_bp.route("/<complaint_id>/status", methods=["PUT"])
@require_auth
def update_status(complaint_id):
    body = request.get_json(force=True) or {}
    status = body.get("status")
    if status not in {"new", "acknowledged", "in_progress", "resolved", "closed"}:
        return jsonify({"error": "invalid status"}), 400

    db = get_db()
    ref = db.collection("complaints").document(complaint_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Not found"}), 404

    update = {"status": status}
    if status == "resolved":
        update["resolution"] = {
            "notes": body.get("resolutionNotes"),
            "customerSatisfaction": body.get("customerSatisfaction"),
            "resolvedAt": db.CLIENT._now(),
            "resolvedBy": current_user().get("uid"),
        }
    ref.update(update)
    return jsonify({"status": status, "message": "Status updated"})

@complaints_bp.route("/<complaint_id>/comments", methods=["POST"])
@require_auth
def add_internal_comment(complaint_id):
    body = request.get_json(force=True) or {}
    comment = (body.get("comment") or "").strip()
    if not comment:
        return jsonify({"error": "comment required"}), 400

    db = get_db()
    ref = db.collection("complaints").document(complaint_id)
    if not ref.get().exists:
        return jsonify({"error": "Not found"}), 404

    ref.update({
        "internal_comments": db.ArrayUnion([{
            "userId": current_user().get("uid"),
            "comment": comment,
            "timestamp": db.CLIENT._now(),
        }]),
        "timeline": db.ArrayUnion([{
            "timestamp": db.CLIENT._now(),
            "action": "internal_comment",
            "userId": current_user().get("uid"),
            "details": comment[:140],
        }]),
    })
    return jsonify({"message": "Comment added"})

@complaints_bp.route("/<complaint_id>/updates", methods=["POST"])
@require_auth
def add_customer_update(complaint_id):
    body = request.get_json(force=True) or {}
    message = (body.get("message") or "").strip()
    if not message:
        return jsonify({"error": "message required"}), 400

    db = get_db()
    ref = db.collection("complaints").document(complaint_id)
    if not ref.get().exists:
        return jsonify({"error": "Not found"}), 404

    ref.update({
        "customer_updates": db.ArrayUnion([{
            "message": message,
            "timestamp": db.CLIENT._now(),
            "sentBy": current_user().get("uid"),
        }]),
        "timeline": db.ArrayUnion([{
            "timestamp": db.CLIENT._now(),
            "action": "customer_update",
            "userId": current_user().get("uid"),
            "details": message[:140],
        }]),
    })
    return jsonify({"message": "Update recorded"})
