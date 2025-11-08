"""Log API endpoints"""
from flask import Blueprint, request, jsonify
from google.cloud.firestore_v1 import FieldFilter
from utils.firebase import get_db, verify_token
from models.log import Log
from api.auth import require_auth
from google.cloud.firestore_v1.base_query import FieldFilter

logs_bp = Blueprint('logs', __name__)


def get_user_from_token():
    """Helper to get user from token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    id_token = auth_header.split('Bearer ')[1]
    decoded_token = verify_token(id_token)
    return decoded_token


@logs_bp.route('', methods=['GET'])
@require_auth
def list_logs():
    """List all logs with optional filtering"""
    try:
        db = get_db()
        decoded_token = get_user_from_token()
        user_id = request.user['uid']
        
        # Get user to determine tenant
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        tenant_id = user_data.get('tenant_id', 'default')
        
        # Build query
        query = db.collection('logs').where(filter=FieldFilter('tenant_id', '==', tenant_id))
        
        # Apply filters
        customer_id = request.args.get('customer_id')
        log_type = request.args.get('type')
        
        if customer_id:
            query = query.where(filter=FieldFilter('customer_id', '==', customer_id))
        if log_type:
            query = query.where(filter=FieldFilter('type', '==', log_type))
        
        # Execute query
        logs = []
        for doc in query.stream():
            log = Log.from_dict(doc.id, doc.to_dict())
            logs.append(log.to_dict())
        
        # Sort by date descending
        logs.sort(key=lambda x: x.get('log_date', ''), reverse=True)
        
        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@logs_bp.route('/<log_id>', methods=['GET'])
@require_auth
def get_log(log_id):
    """Get a single log by ID"""
    try:
        db = get_db()
        doc = db.collection('logs').document(log_id).get()
        
        if not doc.exists:
            return jsonify({'error': 'Log not found'}), 404
        
        if not log_id or log_id.strip().lower() in {"undefined","null","none"}:
            return jsonify({'error': 'log_id is required'}), 400

        log = Log.from_dict(doc.id, doc.to_dict())
        return jsonify(log.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@logs_bp.route('', methods=['POST'])
@require_auth
def create_log():
    """Create a new log"""
    try:
        db = get_db()
        decoded_token = get_user_from_token()
        user_id = request.user['uid']
        
        # Get user to determine tenant
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        tenant_id = user_data.get('tenant_id', 'default')
        
        # Create log from request data
        data = request.json
        log = Log(
            **data,
            created_by=user_id,
            tenant_id=tenant_id
        )
        
        if not log.is_valid():
            return jsonify({'error': 'Invalid log data'}), 400
        
        # Add to Firestore
        doc_ref, _ = db.collection('logs').add(log.to_dict())
        log.id = doc_ref[1].id
        
        # Update customer's last contact date
        if log.customer_id:
            customer_ref = db.collection('customers').document(log.customer_id)
            customer_ref.update({
                'last_contact_date': log.log_date,
                'updated_at': log.updated_at
            })
        
        return jsonify({
            'message': 'Log created successfully',
            'log': log.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@logs_bp.route('/<log_id>', methods=['PUT'])
@require_auth
def update_log(log_id):
    """Update an existing log"""
    try:
        db = get_db()
        log_ref = db.collection('logs').document(log_id)
        
        doc = log_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Log not found'}), 404
        
        # Update log data
        data = request.json
        log = Log.from_dict(log_id, doc.to_dict())
        
        # Update fields
        for key, value in data.items():
            if hasattr(log, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(log, key, value)
        
        log.update_timestamp()
        
        # Save to Firestore
        log_ref.set(log.to_dict())
        
        return jsonify({
            'message': 'Log updated successfully',
            'log': log.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@logs_bp.route('/<log_id>', methods=['DELETE'])
@require_auth
def delete_log(log_id):
    """Delete a log"""
    try:
        db = get_db()
        log_ref = db.collection('logs').document(log_id)
        
        doc = log_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Log not found'}), 404
        
        if not log_id or log_id.strip().lower() in {"undefined","null","none"}:
            return jsonify({'error': 'log_id is required'}), 400

        # Delete the log
        log_ref.delete()
        
        return jsonify({'message': 'Log deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


