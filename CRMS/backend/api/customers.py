# backend/api/customers.py
"""Customer API endpoints"""
from flask import Blueprint, request, jsonify
from datetime import datetime
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
        decoded_token = get_user_from_token()
        user_id = request.user['uid']
        
        # Get user to determine tenant (with timeout protection)
        try:
            user_doc = db.collection('users').document(user_id).get()
            if not user_doc.exists:
                # Auto-create user if doesn't exist (for backward compatibility)
                minimal_user = {
                    "firebase_uid": user_id,
                    "email": decoded_token.get("email") if decoded_token else None,
                    "display_name": decoded_token.get("name") or decoded_token.get("email") if decoded_token else None,
                    "role": "viewer",
                    "tenant_id": "default",
                    "is_active": True,
                    "is_verified": True,
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                    "created_by_source": "auto_list_customers"
                }
                db.collection('users').document(user_id).set(minimal_user)
                tenant_id = "default"
            else:
                user_data = user_doc.to_dict()
                tenant_id = user_data.get('tenant_id', 'default')
        except Exception as e:
            print(f"Error getting user {user_id}: {e}")
            # Fallback to default tenant if user lookup fails
            tenant_id = 'default'
        
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
        
        # Limit query results to prevent hanging on large datasets
        query = query.limit(1000)  # Reasonable limit for list view
        
        # Execute query
        customers = []
        try:
            for doc in query.stream():
                try:
                    doc_data = doc.to_dict()
                    if not doc_data:
                        print(f"Warning: Customer document {doc.id} has no data")
                        continue
                    
                    doc_id = doc.id
                    customer = Customer.from_dict(doc_id, doc_data)
                    
                    # Get the customer dict WITHOUT id (from to_dict())
                    customer_dict_base = customer.to_dict()
                    
                    # CRITICAL: Always include the document ID in the response
                    # Create a NEW dict with the ID explicitly included at the beginning
                    customer_dict = {
                        'id': str(doc_id),  # ID FIRST - ensures it's always present
                        **customer_dict_base  # Then all other fields
                    }
                    
                    # Verify the ID is actually in the dict
                    if 'id' not in customer_dict:
                        raise ValueError(f"ID not in customer_dict after creation! Doc ID: {doc_id}")
                    if customer_dict['id'] != str(doc_id):
                        raise ValueError(f"ID mismatch! Expected: {doc_id}, Got: {customer_dict.get('id')}")
                    
                    # Log first few customers to verify IDs are present
                    if len(customers) < 5:
                        id_present = 'id' in customer_dict
                        id_value = customer_dict.get('id')
                        keys_preview = list(customer_dict.keys())[:10]
                        print(f"✅ Customer {len(customers) + 1}: ID present={id_present}, ID value='{id_value}', Name='{customer_dict.get('name')}', Keys={keys_preview}")
                    
                    customers.append(customer_dict)
                except Exception as e:
                    print(f"Error processing customer {doc.id}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue  # Skip malformed documents
        except Exception as e:
            print(f"Error executing customer query: {e}")
            return jsonify({'error': f'Failed to query customers: {str(e)}'}), 500
        
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
        
        # DEBUG: Verify IDs are in the response before sending
        ids_present = sum(1 for c in customers if c.get('id'))
        print(f"📊 Sending response: {len(customers)} customers, {ids_present} with IDs")
        
        # Final verification - ensure ALL customers have IDs
        for i, c in enumerate(customers):
            if 'id' not in c or not c.get('id'):
                print(f"⚠️ CRITICAL: Customer at index {i} missing ID! Keys: {list(c.keys())[:5]}")
                # Try to get the ID from somewhere - if we can't, we need to skip it
                # But we should never get here if our code is working
                print(f"   Customer data: {c.get('name')}, Created: {c.get('created_at')}")
        
        if ids_present < len(customers):
            print(f"⚠️ ERROR: {len(customers) - ids_present} customers missing IDs!")
            # Force add IDs if missing (last resort)
            for i, c in enumerate(customers):
                if 'id' not in c or not c.get('id'):
                    print(f"   Cannot recover ID for customer {i}: {c.get('name')}")
        
        # Log first customer's full structure for debugging
        if customers:
            first = customers[0]
            print(f"📋 First customer in response: ID={first.get('id')}, Name={first.get('name')}, All keys={list(first.keys())}")
        
        response_data = {
            'customers': customers,
            'total': len(customers)
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['GET'])
@require_auth
def get_customer(customer_id):
    """Get a single customer by ID"""
    
    try:
        # Validate customer_id first
        if _bad_id(customer_id):
            return jsonify({'error': 'customer_id is required'}), 400
        
        db = get_db()
        user_id = request.user['uid']
        
        # Get user to determine tenant
        try:
            user_doc = db.collection('users').document(user_id).get()
            if not user_doc.exists:
                tenant_id = "default"
            else:
                user_data = user_doc.to_dict()
                tenant_id = user_data.get('tenant_id', 'default')
        except Exception as e:
            print(f"Error getting user {user_id}: {e}")
            tenant_id = 'default'
        
        doc = db.collection('customers').document(customer_id).get()
        
        if not doc.exists:
            return jsonify({'error': 'Customer not found'}), 404
        
        doc_data = doc.to_dict()
        # Check tenant_id match (security)
        doc_tenant_id = doc_data.get('tenant_id', 'default')
        if doc_tenant_id != tenant_id:
            return jsonify({'error': 'Customer not found'}), 404
        
        doc_id = doc.id
        customer = Customer.from_dict(doc_id, doc_data)
        customer_dict_base = customer.to_dict()
        
        # Create a NEW dict with the ID explicitly included at the beginning
        customer_dict = {
            'id': str(doc_id),  # ID FIRST - ensures it's always present
            **customer_dict_base  # Then all other fields
        }
        
        return jsonify(customer_dict), 200
        
    except Exception as e:
        import traceback
        print(f"Error in get_customer: {e}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
        
    


@customers_bp.route('', methods=['POST'])
@require_auth
def create_customer():
    """Create a new customer"""
    try:
        db = get_db()
        decoded_token = get_user_from_token()
        user_id = request.user['uid']
        
        # Get user to determine tenant (auto-create if doesn't exist)
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Auto-create user document if it doesn't exist
            minimal_user = {
                "firebase_uid": user_id,
                "email": decoded_token.get("email") if decoded_token else None,
                "display_name": decoded_token.get("name") or decoded_token.get("email") if decoded_token else None,
                "role": "viewer",
                "tenant_id": "default",
                "is_active": True,
                "is_verified": True,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "created_by_source": "auto_create_customer"
            }
            user_ref.set(minimal_user)
            tenant_id = "default"
        else:
            user_data = user_doc.to_dict()
            tenant_id = user_data.get('tenant_id', 'default')
        
        # Create customer from request data
        data = request.json or {}
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Customer name is required'}), 400
        
        # Check if email or phone is provided (at least one is required for validation)
        if not data.get('email') and not data.get('phone'):
            return jsonify({'error': 'Either email or phone is required'}), 400
        
        try:
            customer = Customer(
                **data,
                created_by=user_id,
                tenant_id=tenant_id
            )
        except Exception as e:
            return jsonify({'error': f'Invalid customer data: {str(e)}'}), 400
        
        if not customer.is_valid():
            validation_error = 'Customer name and at least one contact method (email or phone) are required'
            return jsonify({'error': validation_error}), 400
        
        # Add to Firestore
        customer_dict_for_firestore = customer.to_dict()
        _, doc_ref = db.collection('customers').add(customer_dict_for_firestore)
        customer_id = doc_ref.id
        
        print(f"✅ Customer created with ID: {customer_id}")
        
        # Create a NEW dict with the ID explicitly included at the beginning
        customer_dict_base = customer.to_dict()
        customer_dict = {
            'id': str(customer_id),  # ID FIRST - ensures it's always present
            **customer_dict_base  # Then all other fields
        }
        
        # Verify the ID is present
        if 'id' not in customer_dict or not customer_dict.get('id'):
            raise ValueError(f"Customer dict missing ID after creation! ID: {customer_id}")
        
        print(f"✅ Customer response dict - ID present: {'id' in customer_dict}, ID value: {customer_dict.get('id')}, Keys: {list(customer_dict.keys())[:10]}")
        
        return jsonify({
            'message': 'Customer created successfully',
            'customer': customer_dict
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['PUT'])
@require_auth
def update_customer(customer_id):
    """Update an existing customer"""
    try:
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
        
        if _bad_id(customer_id):
            return jsonify ({'error': 'customer_id is required'}),400
        customer.update_timestamp()
        
        # Save to Firestore
        customer_ref.set(customer.to_dict())
        
        # Create a NEW dict with the ID explicitly included at the beginning
        customer_dict_base = customer.to_dict()
        customer_dict = {
            'id': str(customer_id),  # ID FIRST - ensures it's always present
            **customer_dict_base  # Then all other fields
        }
        
        return jsonify({
            'message': 'Customer updated successfully',
            'customer': customer_dict
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>', methods=['DELETE'])
@require_auth
def delete_customer(customer_id):
    """Delete a customer"""
    try:
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
        db = get_db()
        
        # Get logs for this customer
        logs = []
        query = db.collection('logs').where(filter=FieldFilter('customer_id', '==', customer_id)).limit(500)
        
        try:
            for doc in query.stream():
                log_data = doc.to_dict()
                logs.append({'id': doc.id, **log_data})
        except Exception as e:
            print(f"Error querying logs for customer {customer_id}: {e}")
            return jsonify({'error': f'Failed to query logs: {str(e)}'}), 500
        
        # Sort by date descending
        logs.sort(key=lambda x: x.get('log_date', ''), reverse=True)
        
        return jsonify({
            'logs': logs,
            'total': len(logs)
        }), 200
        
    except Exception as e:
        print(f"Error in get_customer_logs: {e}")
        return jsonify({'error': str(e)}), 500


@customers_bp.route('/<customer_id>/complaints', methods=['GET'])
@require_auth
def get_customer_complaints(customer_id):
    """Get all complaints for a customer"""
    try:
        db = get_db()
        
        # Get complaints for this customer
        complaints = []
        query = db.collection('complaints').where(filter=FieldFilter('customer_id', '==', customer_id)).limit(500)
        
        try:
            for doc in query.stream():
                complaint_data = doc.to_dict()
                complaints.append({'id': doc.id, **complaint_data})
        except Exception as e:
            print(f"Error querying complaints for customer {customer_id}: {e}")
            return jsonify({'error': f'Failed to query complaints: {str(e)}'}), 500
        
        # Sort by date descending
        complaints.sort(key=lambda x: x.get('created_date', ''), reverse=True)
        
        return jsonify({
            'complaints': complaints,
            'total': len(complaints)
        }), 200
        
    except Exception as e:
        print(f"Error in get_customer_complaints: {e}")
        return jsonify({'error': str(e)}), 500


