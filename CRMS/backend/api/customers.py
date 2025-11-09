"""Customer API endpoints"""
from flask import Blueprint, request, jsonify,current_app
from utils.firebase import get_db
from models.customer import Customer
from api.auth import require_auth
from google.cloud.firestore_v1.base_query import FieldFilter
from google.cloud import firestore
from datetime import datetime,timezone
from google.api_core.exceptions import FailedPrecondition

customers_bp = Blueprint('customers', __name__)

def _bad_id(x: str) -> bool:
    return (not x) or x.strip().lower() in {"undefined", "null", "none"}

def _safe_int(v, d):
    try: return int(v)
    except: return d

def _parse_iso_dt(s):
    """Return timezone-aware UTC datetime (or None) from ISO or YYYY-MM-DD."""
    if not s: return None
    try:
        dt = datetime.fromisoformat(s) if len(s) != 10 else datetime.fromisoformat(s + "T00:00:00")
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None

@customers_bp.route('', methods=['GET'])
@require_auth
def list_customers():
    from flask import current_app
    from google.api_core.exceptions import FailedPrecondition

    try:
        db = get_db()
        uid = request.user['uid']
        udoc = db.collection('users').document(uid).get()
        if not udoc.exists:
            return jsonify({'customers': [], 'page': 1, 'limit': 20, 'returned': 0}), 200
        tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default')

        # pagination
        def _safe_int(v, d):
            try: return int(v)
            except: return d
        page     = max(_safe_int(request.args.get('page', 1), 1), 1)
        limit    = _safe_int(request.args.get('limit', request.args.get('pageSize', 20)), 20)
        pageSize = min(max(limit, 1), 100)
        offset   = (page - 1) * pageSize

        # filters
        status      = request.args.get('status')
        type_filter = request.args.get('type')
        owner_id    = request.args.get('ownerId') or request.args.get('owner_id')
        search      = (request.args.get('search') or '').strip().lower()

        # order
        order_by  = (request.args.get('orderBy') or 'created_at').strip()
        order_dir = (request.args.get('orderDir') or 'desc').strip().lower()
        from google.cloud import firestore
        direction = firestore.Query.DESCENDING if order_dir != 'asc' else firestore.Query.ASCENDING

        # base query (tenant)
        q = db.collection('customers').where(filter=FieldFilter('tenant_id', '==', tenant_id))
        if status:
            q = q.where(filter=FieldFilter('status', '==', status))
        if type_filter:
            q = q.where(filter=FieldFilter('type', '==', type_filter))
        if owner_id:
            q = q.where(filter=FieldFilter('owner_id', '==', owner_id))

        # try requested order; fallback to created_at; then fallback to NO order if index missing
        try:
            q1 = q.order_by(order_by, direction=direction)
            docs = list(q1.offset(offset).limit(pageSize).stream())
        except Exception:
            try:
                current_app.logger.warning("customers.list: bad orderBy '%s' -> fallback 'created_at'", order_by)
                q2 = q.order_by('created_at', direction=direction)
                docs = list(q2.offset(offset).limit(pageSize).stream())
            except FailedPrecondition:
                current_app.logger.warning("customers.list: index missing -> fallback NO order")
                docs = list(q.offset(offset).limit(pageSize).stream())

        items = []
        for d in docs:
            c = Customer.from_dict(d.id, d.to_dict()).to_dict(include_id=True)
            if search:
                hay = (c.get('name','') + ' ' + c.get('email','') + ' ' + c.get('phone','') + ' ' + c.get('company','')).lower()
                if search not in hay:
                    continue
            items.append(c)

        return jsonify({'customers': items, 'page': page, 'limit': pageSize, 'returned': len(items)}), 200

    except Exception as e:
        current_app.logger.exception("customers.list failed")
        # keep the UI alive; return empty list instead of 400/500
        return jsonify({'customers': [], 'page': 1, 'limit': 20, 'returned': 0, '__error': str(e)}), 200


@customers_bp.route('/<customer_id>', methods=['GET'])
@require_auth
def get_customer(customer_id):
    """Get a single customer by ID"""
    try:
       if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400
       db = get_db()
       uid = request.user['uid']
       # tenant check
       udoc = db.collection('users').document(uid).get()
       tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default') if udoc.exists else 'default'

       doc = db.collection('customers').document(customer_id).get()
       if not doc.exists:
         return jsonify({'error': 'Customer not found'}), 404
       data = doc.to_dict() or {}
       if data.get('tenant_id') != tenant_id:
         return jsonify({'error': 'Forbidden: cross-tenant access'}), 403

       customer = Customer.from_dict(doc.id, data)
       return jsonify(customer.to_dict(include_id=True)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500     
        
    


@customers_bp.route('', methods=['POST'])
@require_auth
def create_customer():
    """Create a new customer"""
    try:
        db = get_db()
        user_id = request.user['uid']
        data = request.get_json(force=True) or {}

        # Get user to determine tenant
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        tenant_id = (user_doc.to_dict() or {}).get('tenant_id', 'default')

        # Minimal validation
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'error': 'name is required'}), 400

        payload = {
            **data,
            "name": name,
            "created_by": user_id,
            "tenant_id": tenant_id,
            "created_at": firestore.SERVER_TIMESTAMP,
            "updated_at": firestore.SERVER_TIMESTAMP,
        }
        doc_ref = db.collection('customers').document()
        payload["id"] = doc_ref.id
        doc_ref.set(payload)

        return jsonify({'message': 'Customer created successfully', 'customer': payload}), 201
    except Exception as e:
        current_app.logger.exception("customers.create failed")
        return jsonify({'error': 'internal_error', 'detail': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['PUT'])
@require_auth
def update_customer(customer_id):
    """Update an existing customer"""
    try:

        if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400

        db = get_db()
        uid = request.user['uid']
        # tenant check
        udoc = db.collection('users').document(uid).get()
        tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default') if udoc.exists else 'default'

        ref = db.collection('customers').document(customer_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({'error': 'Customer not found'}), 404
        existing = snap.to_dict() or {}
        if existing.get('tenant_id') != tenant_id:
            return jsonify({'error': 'Forbidden: cross-tenant update'}), 403

        data = request.get_json(force=True) or {}
        # Only allow safe fields
        blocked = {'id', 'tenant_id', 'created_at', 'created_by'}
        delta = {k: v for k, v in data.items() if k not in blocked}
        if not delta:
            return jsonify({'message': 'No changes'}), 200

        delta['updated_at'] = firestore.SERVER_TIMESTAMP
        ref.set(delta, merge=True)

        merged = {**existing, **delta, "id": customer_id}
        return jsonify({'message': 'Customer updated successfully', 'customer': merged}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['DELETE'])
@require_auth
def delete_customer(customer_id):
    """Delete a customer"""
    try:

        if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400

        db = get_db()
        uid = request.user['uid']
        # tenant check
        udoc = db.collection('users').document(uid).get()
        tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default') if udoc.exists else 'default'

        ref = db.collection('customers').document(customer_id)
        snap = ref.get()
        if not snap.exists:
            return jsonify({'error': 'Customer not found'}), 404
        if (snap.to_dict() or {}).get('tenant_id') != tenant_id:
            return jsonify({'error': 'Forbidden: cross-tenant delete'}), 403

        # Soft delete - archive + timestamp
        ref.set({'status': 'archived', 'updated_at': firestore.SERVER_TIMESTAMP}, merge=True)
        return jsonify({'message': 'Customer deleted (archived) successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>/logs', methods=['GET'])
@require_auth
def get_customer_logs(customer_id):
    """Get all logs for a customer (tenant-aware, JSON-safe)."""
    from flask import current_app
    from google.api_core.exceptions import FailedPrecondition
    from google.cloud import firestore

    try:
        if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400

        db = get_db()

        # 🔒 tenant isolation
        uid = request.user['uid']
        udoc = db.collection('users').document(uid).get()
        tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default') if udoc.exists else 'default'

        # optional order params
        order_by  = (request.args.get('orderBy') or 'created_at').strip()
        order_dir = (request.args.get('orderDir') or 'desc').strip().lower()
        direction = firestore.Query.DESCENDING if order_dir != 'asc' else firestore.Query.ASCENDING

        # base query
        q = (db.collection('logs')
               .where(filter=FieldFilter('tenant_id', '==', tenant_id))
               .where(filter=FieldFilter('customer_id', '==', customer_id)))

        # try requested order; fallback to created_at; fallback to no order
        try:
            q1 = q.order_by(order_by, direction=direction)
            docs = list(q1.stream())
        except Exception:
            try:
                current_app.logger.warning("customer logs: bad orderBy '%s' -> fallback 'created_at'", order_by)
                q2 = q.order_by('created_at', direction=direction)
                docs = list(q2.stream())
            except FailedPrecondition:
                current_app.logger.warning("customer logs: index missing -> fallback NO order")
                docs = list(q.stream())

        def _to_json_safe(d: dict):
            out = dict(d or {})
            # normalize common timestamp fields
            for k in ('created_at', 'updated_at', 'log_date', 'next_action_date'):
                v = out.get(k)
                if v is not None:
                    # Firestore Timestamp and datetime both have isoformat()
                    try:
                        out[k] = v.isoformat()
                    except Exception:
                        # best-effort stringify
                        out[k] = str(v)
            return out

        logs = [{ 'id': doc.id, **_to_json_safe(doc.to_dict()) } for doc in docs]

        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200

    except Exception as e:
        # keep UI alive and log the error
        current_app.logger.exception("get_customer_logs failed")
        return jsonify({'logs': [], 'total': 0, '__error': str(e)}), 200



@customers_bp.route('/<customer_id>/complaints', methods=['GET'])
@require_auth
def get_customer_complaints(customer_id):
    """Get all complaints for a customer"""
    try:
        if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400

        db = get_db()
        uid = request.user['uid']
        # tenant check
        udoc = db.collection('users').document(uid).get()
        tenant_id = (udoc.to_dict() or {}).get('tenant_id', 'default') if udoc.exists else 'default'

        # optional pagination
        page     = max(_safe_int(request.args.get('page', 1), 1), 1)
        limit    = _safe_int(request.args.get('limit', request.args.get('pageSize', 20)), 20)
        pageSize = min(max(limit, 1), 100)
        offset   = (page - 1) * pageSize

        query = (db.collection('complaints')
                   .where(filter=FieldFilter('tenant_id', '==', tenant_id))
                   .where(filter=FieldFilter('customer_id', '==', customer_id))
                   .order_by('created_at', direction=firestore.Query.DESCENDING))

        docs = list(query.offset(offset).limit(pageSize).stream())
        items = [{'id': d.id, **(d.to_dict() or {})} for d in docs]

        return jsonify({'complaints': items, 'page': page, 'limit': pageSize, 'returned': len(items)}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


