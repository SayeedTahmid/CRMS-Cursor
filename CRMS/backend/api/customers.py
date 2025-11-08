"""Customer API endpoints"""
from flask import Blueprint, request, jsonify
from utils.firebase import get_db, verify_token
from models.customer import Customer
from api.auth import require_auth
from google.cloud.firestore_v1.base_query import FieldFilter

customers_bp = Blueprint('customers', __name__)

def _bad_id(x: str) -> bool:
    return (not x) or x.strip().lower() in {"undefined", "null", "none"}

def get_user_from_token():
    """Helper to get user from token"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    
    id_token = auth_header.split('Bearer ')[1]
    decoded_token = verify_token(id_token)
    return decoded_token


@customers_bp.route('', methods=['GET'])
@require_auth
def list_customers():
    """List all customers with optional filtering"""
    try:
        db = get_db()
        user_id = request.user['uid']
        
        # Get user to determine tenant
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        tenant_id = user_data.get('tenant_id', 'default')
        
        # Build query
        query = db.collection('customers').where(filter=FieldFilter('tenant_id', '==', tenant_id))
        
        # Apply filters
        status = request.args.get('status')
        type_filter = request.args.get('type')
        search = request.args.get('search')
        
        if status:
         query = query.where(filter=FieldFilter('status', '==', status))
        if type_filter:
         query = query.where(filter=FieldFilter('type', '==', type_filter))
        
        # Execute query
        customers = []
        for doc in query.stream():
            customer = Customer.from_dict(doc.id, doc.to_dict())
            customers.append(customer.to_dict(include_id=True))
        
        # Client-side search if search param provided
        if search:
            search_lower = search.lower()
            customers = [
                c for c in customers
                if search_lower in c.get('name', '').lower() or
                   search_lower in c.get('email', '').lower() or
                   search_lower in c.get('phone', '')
            ]
        
        # Sort by name
        customers.sort(key=lambda x: x.get('name', ''))
        
        return jsonify({
            'customers': customers,
            'total': len(customers)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['GET'])
@require_auth
def get_customer(customer_id):
    """Get a single customer by ID"""
    
    try:

         if _bad_id(customer_id):
          return jsonify ({'error': 'customer_id is required'}), 400

         db = get_db()
         doc = db.collection('customers').document(customer_id).get()
        
         if not doc.exists:
            return jsonify({'error': 'Customer not found'}), 404
        
         customer = Customer.from_dict(doc.id, doc.to_dict())
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
        
        # Get user to determine tenant
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user_doc.to_dict()
        tenant_id = user_data.get('tenant_id', 'default')
        
        # Create customer from request data
        data = request.json
        customer = Customer(
            **data,
            created_by=user_id,
            tenant_id=tenant_id
        )
        
        if not customer.is_valid():
            return jsonify({'error': 'Invalid customer data'}), 400
        
        # Add to Firestore
        doc_ref, _ = db.collection('customers').add(customer.to_dict())
        customer.id = doc_ref.id
        
        return jsonify({
            'message': 'Customer created successfully',
            'customer': customer.to_dict(include_id=True)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['PUT'])
@require_auth
def update_customer(customer_id):
    """Update an existing customer"""
    try:

        if _bad_id(customer_id):
           return jsonify ({'error': 'customer_id is required'}), 400

        db = get_db()
        customer_ref = db.collection('customers').document(customer_id)
        
        doc = customer_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Update customer data
        data = request.json
        customer = Customer.from_dict(customer_id, doc.to_dict())
        
        # Update fields
        for key, value in data.items():
            if hasattr(customer, key) and key not in ['id', 'created_at', 'created_by']:
                setattr(customer, key, value)
        
        customer.update_timestamp()
        
        # Save to Firestore
        customer_ref.set(customer.to_dict())
        
        return jsonify({
            'message': 'Customer updated successfully',
            'customer': customer.to_dict(include_id=True)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['DELETE'])
@require_auth
def delete_customer(customer_id):
    """Delete a customer"""
    try:
         
        if _bad_id(customer_id):
            return jsonify ({'error': 'customer_id is required'}), 400
        
        db = get_db()

        customer_ref = db.collection('customers').document(customer_id)
        
        doc = customer_ref.get()
        if not doc.exists:
            return jsonify({'error': 'Customer not found'}), 404
        
        # Soft delete - update status instead of actually deleting
        customer_ref.update({'status': 'archived'})
        
        return jsonify({'message': 'Customer deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>/logs', methods=['GET'])
@require_auth
def get_customer_logs(customer_id):
    """Get all logs for a customer"""
    try:

        if _bad_id(customer_id):
            return jsonify ({'error': 'customer_id is required'}), 400

        db = get_db()
        
        # Get logs for this customer
        logs = []
        query = db.collection('logs').where(filter=FieldFilter('customer_id', '==', customer_id))
        
        for doc in query.stream():
            log_data = doc.to_dict()
            logs.append({'id': doc.id, **log_data})
        
        # Sort by date descending
        logs.sort(key=lambda x: x.get('log_date', ''), reverse=True)
        
        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>/complaints', methods=['GET'])
@require_auth
def get_customer_complaints(customer_id):
    """Get all complaints for a customer"""
    try:

        if _bad_id(customer_id):
            return jsonify ({'error': 'customer_id is required'}), 400

        db = get_db()
        
        # Get complaints for this customer
        complaints = []
        query = db.collection('complaints').where(filter=FieldFilter('customer_id', '==', customer_id))
        
        for doc in query.stream():
            complaint_data = doc.to_dict()
            complaints.append({'id': doc.id, **complaint_data})
        
        # Sort by date descending
        complaints.sort(key=lambda x: x.get('created_date', ''), reverse=True)
        
        return jsonify({
            'complaints': complaints,
            'total': len(complaints)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


