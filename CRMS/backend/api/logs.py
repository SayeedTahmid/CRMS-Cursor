# backend/api/logs.py
"""Log API endpoints"""
from flask import Blueprint, request, jsonify
from google.cloud.firestore_v1.base_query import FieldFilter
from utils.firebase import get_db  # verify_token no longer needed here if require_auth sets request.user
from models.log import Log
from api.auth import require_auth, require_permission
from utils.rbac import normalize_role

logs_bp = Blueprint('logs', __name__)


@logs_bp.route('', methods=['GET'])
@require_auth
def list_logs():
    """List all logs with optional filtering"""
    try:
        db = get_db()

        # Make sure auth middleware attached the user
        if not hasattr(request, "user") or "uid" not in request.user:
            return jsonify({"error": "Unauthorized"}), 401

        user_id = request.user["uid"]

        # Get user to determine tenant
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = user_doc.to_dict()
        tenant_id = user_data.get("tenant_id", "default")

        # Build base query scoped to tenant
        query = db.collection("logs").where(
            filter=FieldFilter("tenant_id", "==", tenant_id)
        )

        # Apply optional filters
        customer_id = request.args.get("customer_id")
        log_type = request.args.get("type")

        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        if log_type:
            query = query.where(filter=FieldFilter("type", "==", log_type))

        # Limit query results to avoid huge scans / hanging
        query = query.limit(1000)

        logs = []

        try:
            for doc in query.stream():
                try:
                    log = Log.from_dict(doc.id, doc.to_dict())
                    log_dict = log.to_dict()
                    log_dict['id'] = doc.id  # Ensure ID is always included
                    logs.append(log_dict)
                except Exception as e:
                    # Skip malformed documents but log them for debugging
                    print(f"Error processing log {doc.id}: {e}")
                    continue
        except Exception as e:
            print(f"Error executing log query: {e}")
            return jsonify({"error": f"Failed to query logs: {str(e)}"}), 500

        # Sort by date descending
        # Convert all dates to timestamps first to avoid type comparison errors
        from datetime import datetime
        
        def normalize_date_to_timestamp(date_value):
            """Convert any date format to a float timestamp for comparison"""
            if date_value is None:
                return 0.0
            
            # Try to call timestamp() method if it exists (works for both Python datetime and Firestore datetime)
            if hasattr(date_value, 'timestamp'):
                try:
                    return float(date_value.timestamp())
                except:
                    pass
            
            # Handle Python datetime objects (fallback if timestamp() doesn't work)
            if isinstance(date_value, datetime):
                try:
                    return float(date_value.timestamp())
                except:
                    return 0.0
            
            # Handle string dates
            if isinstance(date_value, str):
                try:
                    # Try ISO format first
                    if 'T' in date_value:
                        dt_str = date_value.replace('Z', '+00:00').split('.')[0]
                        if '+' in dt_str or dt_str.count('-') > 2:
                            dt = datetime.fromisoformat(dt_str)
                        else:
                            dt = datetime.fromisoformat(dt_str.replace('Z', ''))
                        return dt.timestamp()
                    # Try other common formats
                    elif ' ' in date_value:
                        dt = datetime.strptime(date_value.split('.')[0], '%Y-%m-%d %H:%M:%S')
                        return dt.timestamp()
                    else:
                        return 0.0
                except Exception as e:
                    print(f"Warning: Could not parse date string '{date_value}': {e}")
                    return 0.0
            
            # Unknown type, return 0
            return 0.0
        
        def get_sort_key(log_item):
            """Get sort key for a log item"""
            log_date = log_item.get("log_date")
            created_at = log_item.get("created_at")
            
            # Prefer log_date, fallback to created_at
            date_to_use = log_date if log_date is not None else created_at
            
            return normalize_date_to_timestamp(date_to_use)
        
        # Sort logs by normalized timestamp
        try:
            logs.sort(key=get_sort_key, reverse=True)
        except Exception as e:
            print(f"Error sorting logs: {e}")
            # If sorting fails, at least return the logs unsorted
            import traceback
            traceback.print_exc()

        return jsonify(
            {
                "logs": logs,
                "total": len(logs),
            }
        ), 200

    except Exception as e:
        print(f"Error in list_logs: {e}")
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["GET"])
@require_auth
def get_log(log_id):
    """Get a single log by ID"""
    try:
        db = get_db()

        # Validate log_id
        if not log_id or log_id.strip().lower() in {"undefined", "null", "none", ""}:
            return jsonify({"error": "log_id is required"}), 400

        doc = db.collection("logs").document(log_id).get()

        if not doc.exists:
            return jsonify({"error": "Log not found"}), 404

        log = Log.from_dict(doc.id, doc.to_dict())
        log_dict = log.to_dict()
        log_dict['id'] = doc.id  # Ensure ID is always included
        return jsonify(log_dict), 200

    except Exception as e:
        print(f"Error in get_log: {e}")
        return jsonify({"error": str(e)}), 500


@logs_bp.route("", methods=["POST"])
@require_auth
def create_log():
    """Create a new log"""
    try:
        db = get_db()

        if not hasattr(request, "user") or "uid" not in request.user:
            return jsonify({"error": "Unauthorized"}), 401

        user_id = request.user["uid"]

        # Get user to determine tenant
        user_doc = db.collection("users").document(user_id).get()
        if not user_doc.exists:
            return jsonify({"error": "User not found"}), 404

        user_data = user_doc.to_dict()
        tenant_id = user_data.get("tenant_id", "default")

        # Create log from request data
        data = request.json or {}
        log = Log(
            **data,
            created_by=user_id,
            tenant_id=tenant_id,
        )

        if not log.is_valid():
            return jsonify({"error": "Invalid log data"}), 400

        # Add to Firestore
        _, doc_ref = db.collection("logs").add(log.to_dict())
        log.id = doc_ref.id

        # Update customer's last contact date if we have a customer_id
        if getattr(log, "customer_id", None):
            customer_id = str(log.customer_id).strip()
            # Validate customer_id is not a name (should be a Firestore document ID)
            if customer_id and customer_id.lower() not in {"undefined", "null", "none", ""}:
                # Check if customer exists first
                customer_ref = db.collection("customers").document(customer_id)
                customer_doc = customer_ref.get()
                
                if customer_doc.exists:
                    try:
                        customer_ref.update(
                            {
                                "last_contact_date": log.log_date,
                                "updated_at": log.updated_at,
                            }
                        )
                    except Exception as update_error:
                        # Log but don't fail the log creation
                        print(f"Warning: Could not update customer {customer_id}: {update_error}")
                else:
                    print(f"Warning: Customer {customer_id} not found when updating last_contact_date")

        return (
            jsonify(
                {
                    "message": "Log created successfully",
                    "log": log.to_dict(),
                }
            ),
            201,
        )

    except Exception as e:
        print(f"Error in create_log: {e}")
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["PUT"])
@require_auth
@require_permission("logs", "update")
def update_log(log_id):
    """Update an existing log"""
    try:
        db = get_db()
        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")
        
        log_ref = db.collection("logs").document(log_id)

        doc = log_ref.get()
        if not doc.exists:
            return jsonify({"error": "Log not found"}), 404

        # Check tenant isolation (security)
        doc_data = doc.to_dict() or {}
        doc_tenant_id = doc_data.get("tenant_id", "default")
        if doc_tenant_id != tenant_id:
            return jsonify({"error": "Log not found"}), 404

        # Update log data
        data = request.json or {}
        log = Log.from_dict(log_id, doc_data)

        # Update fields (except immutable ones)
        for key, value in data.items():
            if hasattr(log, key) and key not in ["id", "created_at", "created_by", "tenant_id"]:
                setattr(log, key, value)

        log.update_timestamp()

        # Save to Firestore
        log_dict = log.to_dict()
        # Ensure tenant_id is preserved
        log_dict["tenant_id"] = tenant_id
        log_ref.set(log_dict)

        return (
            jsonify(
                {
                    "message": "Log updated successfully",
                    "log": log_dict,
                }
            ),
            200,
        )

    except Exception as e:
        print(f"Error in update_log: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@logs_bp.route("/<log_id>", methods=["DELETE"])
@require_auth
@require_permission("logs", "delete")
def delete_log(log_id):
    """Delete a log"""
    try:
        db = get_db()

        # Validate log_id
        if not log_id or log_id.strip().lower() in {"undefined", "null", "none", ""}:
            return jsonify({"error": "log_id is required"}), 400

        uid = request.user["uid"]
        tenant_id = request.user.get("tenant_id", "default")

        log_ref = db.collection("logs").document(log_id)

        doc = log_ref.get()
        if not doc.exists:
            return jsonify({"error": "Log not found"}), 404

        # Check tenant isolation (security)
        doc_data = doc.to_dict() or {}
        doc_tenant_id = doc_data.get("tenant_id", "default")
        if doc_tenant_id != tenant_id:
            return jsonify({"error": "Log not found"}), 404

        # Hard delete - permanently remove from database
        log_ref.delete()

        return jsonify({"message": "Log deleted successfully"}), 200

    except Exception as e:
        print(f"Error in delete_log: {e}")
        return jsonify({"error": str(e)}), 500
