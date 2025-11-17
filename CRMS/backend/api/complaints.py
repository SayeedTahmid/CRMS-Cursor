# backend/api/complaints.py
from flask import Blueprint, request, jsonify, current_app
from google.cloud import firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from api.auth import require_auth, require_permission,require_role
from utils.firebase import get_db
from utils.rbac import SALES_REP

complaints_bp = Blueprint("complaints", __name__)

def _bad(s):
    return not s or not str(s).strip() or str(s).strip().lower() in {"undefined", "null", "none"}

# ---------------------------
# List complaints
# ---------------------------
@complaints_bp.route("", methods=["GET"])
@require_auth
@require_permission("complaints", "read")
def list_complaints():
    try:
        db = get_db()
        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")

        customer_id = request.args.get("customerId")
        status = request.args.get("status")
        search = (request.args.get("search") or "").strip().lower()
        try:
            page = max(1, int(request.args.get("page", 1)))
            page_size = max(1, min(100, int(request.args.get("pageSize", 20))))
        except ValueError:
            page, page_size = 1, 20

        q = db.collection("complaints").where(filter=FieldFilter("tenant_id", "==", tenant_id))

        # Sales Rep -> own complaints only
        if request.user.get("role") == SALES_REP:
            q = q.where(filter=FieldFilter("created_by", "==", uid))

        if customer_id:
            q = q.where(filter=FieldFilter("customer_id", "==", customer_id))
        if status:
            q = q.where(filter=FieldFilter("status", "==", status))

        try:
            q = q.order_by("created_at", direction=firestore.Query.DESCENDING)
        except Exception as order_error:
            # If ordering fails (missing index), continue without order
            print(f"Warning: Could not order complaints by created_at: {order_error}")

        # Apply pagination
        # Note: offset() requires an index when combined with where() and order_by()
        # If offset fails, fall back to limit-only pagination
        try:
            offset = (page - 1) * page_size
            if offset > 0:
                q = q.offset(offset)
            q = q.limit(page_size)
        except Exception as pagination_error:
            # If offset fails (missing index), use limit only (page 1 only)
            print(f"Warning: Offset pagination failed, using limit only: {pagination_error}")
            if page > 1:
                # Can't paginate without offset, return empty for pages > 1
                return jsonify({
                    "complaints": [],
                    "page": page,
                    "pageSize": page_size,
                    "hasMore": False,
                    "total": 0,
                    "message": "Pagination requires Firestore index. Showing first page only."
                }), 200
            q = q.limit(page_size)

        items = []
        try:
            for doc in q.stream():
                try:
                    d = doc.to_dict() or {}
                    items.append({"id": doc.id, **d})
                except Exception as doc_error:
                    print(f"Error processing complaint {doc.id}: {doc_error}")
                    continue  # Skip malformed documents
        except Exception as stream_error:
            error_str = str(stream_error)
            if "requires an index" in error_str:
                return jsonify({
                    "error": "Firestore index required",
                    "message": "The query requires a composite index. Please create it in Firebase Console.",
                    "complaints": [],
                    "page": page,
                    "pageSize": page_size,
                    "hasMore": False,
                    "total": 0
                }), 400
            raise

        # Client-side search if search param provided
        if search:
            items = [
                c for c in items
                if search in (c.get("title","") or "").lower()
                or search in (c.get("description","") or "").lower()
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
        print(f"Error in list_complaints: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Get complaint
# ---------------------------
@complaints_bp.route("/<complaint_id>", methods=["GET"])
@require_auth
@require_permission("complaints", "read")
def get_complaint(complaint_id):
    try:
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400

        db = get_db()
        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")

        ref = db.collection("complaints").document(complaint_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"error": "Not found"}), 404
        data = snap.to_dict() or {}
        if data.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant access"}), 403

        if request.user.get("role") == SALES_REP and data.get("created_by") != uid:
            return jsonify({"error": "forbidden"}), 403

        return jsonify({"id": snap.id, **data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Create complaint
# ---------------------------
@complaints_bp.route("", methods=["POST"])
@require_auth
@require_permission("complaints", "create")
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
    uid = request.user["uid"]
    tenant_id = request.user.get("tenant_id", "default")

    doc_ref = db.collection("complaints").document()
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
        "created_at": firestore.SERVER_TIMESTAMP,
        "created_by": uid,
        "updated_at": firestore.SERVER_TIMESTAMP,
    }
    doc_ref.set(payload)
    payload["id"] = doc_ref.id
    payload["ticket_number"] = ticket_number
    return jsonify({
        "success": True,
        "data": {"id": doc_ref.id, "ticketNumber": ticket_number, "message": "Complaint created successfully"},
        "complaint": payload
    }), 201

# ---------------------------
# Update status (specific endpoint for status-only updates - must come before full update)
# ---------------------------
@complaints_bp.route("/<complaint_id>/status", methods=["PUT"])
@require_auth
@require_permission("complaints", "update")
def update_status(complaint_id):
    body = request.get_json(force=True) or {}
    status = (body.get("status") or "").strip().lower()
    if status not in {"new", "acknowledged", "in_progress", "resolved", "closed"}:
        return jsonify({"error": "invalid status"}), 400

    db = get_db()
    uid = request.user["uid"]
    tenant_id = request.user.get("tenant_id", "default")

    ref = db.collection("complaints").document(complaint_id)
    snap = ref.get()
    if not snap.exists:
        return jsonify({"error": "Not found"}), 404
    existing = snap.to_dict() or {}
    if existing.get("tenant_id") != tenant_id:
        return jsonify({"error": "Forbidden: cross-tenant update"}), 403

    if request.user.get("role") == SALES_REP and existing.get("created_by") != uid:
        return jsonify({"error": "forbidden"}), 403

    update = {"status": status, "updated_at": firestore.SERVER_TIMESTAMP}
    if status == "resolved":
        update["resolution"] = {
            "notes": body.get("resolutionNotes"),
            "customerSatisfaction": body.get("customerSatisfaction"),
            "resolvedAt": firestore.SERVER_TIMESTAMP,
            "resolvedBy": uid,
        }
    ref.update(update)
    # Get updated complaint
    updated_snap = ref.get()
    updated_data = updated_snap.to_dict() or {}
    return jsonify({
        "status": status,
        "message": "Status updated",
        "complaint": {"id": complaint_id, **updated_data}
    }), 200

# ---------------------------
# Update complaint (full update)
# ---------------------------
@complaints_bp.route("/<complaint_id>", methods=["PUT"])
@require_auth
@require_permission("complaints", "update")
def update_complaint(complaint_id):
    """Update a complaint with full field support"""
    try:
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400
        
        db = get_db()
        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")
        
        ref = db.collection("complaints").document(complaint_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"error": "Not found"}), 404
        
        existing = snap.to_dict() or {}
        if existing.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant update"}), 403
        
        if request.user.get("role") == SALES_REP and existing.get("created_by") != uid:
            return jsonify({"error": "forbidden"}), 403
        
        body = request.get_json(force=True) or {}
        
        # Fields that can be updated
        update_fields = {}
        allowed_fields = [
            "title", "description", "category", "severity", "status",
            "priority", "assigned_to", "sla", "internal_comments",
            "customer_updates", "attachments"
        ]
        
        for field in allowed_fields:
            if field in body:
                update_fields[field] = body[field]
        
        # Validate status if provided
        if "status" in update_fields:
            status = (update_fields["status"] or "").strip().lower()
            if status not in {"new", "acknowledged", "in_progress", "resolved", "closed"}:
                return jsonify({"error": "invalid status"}), 400
            update_fields["status"] = status
            
            # Add resolution if status is resolved
            if status == "resolved" and "resolution" not in existing:
                update_fields["resolution"] = {
                    "notes": body.get("resolutionNotes", ""),
                    "customerSatisfaction": body.get("customerSatisfaction", ""),
                    "resolvedAt": firestore.SERVER_TIMESTAMP,
                    "resolvedBy": uid,
                }
        
        if not update_fields:
            return jsonify({"error": "No valid fields to update"}), 400
        
        update_fields["updated_at"] = firestore.SERVER_TIMESTAMP
        ref.update(update_fields)
        
        # Get updated complaint
        updated_snap = ref.get()
        updated_data = updated_snap.to_dict() or {}
        return jsonify({
            "message": "Complaint updated successfully",
            "complaint": {"id": complaint_id, **updated_data}
        }), 200
        
    except Exception as e:
        print(f"Error in update_complaint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# ---------------------------
# Soft close/delete
# ---------------------------
@complaints_bp.route("/<complaint_id>", methods=["DELETE"])
@require_auth
@require_permission("complaints", "delete")
def delete_complaint(complaint_id):
    try:
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400

        db = get_db()
        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")

        ref = db.collection("complaints").document(complaint_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({"error": "Not found"}), 404
        existing = snap.to_dict() or {}
        if existing.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant"}), 403

        # Sales Rep may not delete
        if request.user.get("role") == SALES_REP:
            return jsonify({"error": "forbidden"}), 403

        ref.update({"status": "closed", "updated_at": firestore.SERVER_TIMESTAMP})
        return jsonify({"message": "Complaint closed"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
