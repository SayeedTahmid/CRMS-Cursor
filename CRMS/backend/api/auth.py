"""Authentication API endpoints"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from utils.firebase import verify_token, get_db, get_user_by_email, create_user
from models.user import User

auth_bp = Blueprint('auth', __name__)


def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Add user info to request context
        request.user = decoded_token
        return f(*args, **kwargs)
    
    return decorated_function


@auth_bp.route('/verify', methods=['POST'])
def verify():
    """Verify a Firebase ID token and return user information"""
    try:
        id_token = request.json.get('idToken')
        if not id_token:
            return jsonify({'error': 'ID token required'}), 400
        
        decoded_token = verify_token(id_token)
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Get user from Firestore
        db = get_db()
        user_doc = db.collection('users').document(decoded_token['uid']).get()
        
        if not user_doc.exists:
            return jsonify({
                'authenticated': False,
                'message': 'User not found in database'
            }), 404
        
        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        
        return jsonify({
            'authenticated': True,
            'user': user_data.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('display_name')
        tenant_id = data.get('tenant_id')
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Create Firebase Auth user
        firebase_user = create_user(email, password, display_name)
        if not firebase_user:
            return jsonify({'error': 'Failed to create user'}), 400
        
        # Create Firestore user document
        db = get_db()
        user = User(
            email=email,
            display_name=display_name or email,
            tenant_id=tenant_id or 'default',
            firebase_uid=firebase_user.uid,
            role=User.ROLE_VIEWER,  # Default role
            is_active=True,
            is_verified=False
        )
        
        # Create user document in Firestore
        db.collection('users').document(firebase_user.uid).set(user.to_dict())
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/user', methods=['GET'])
@require_auth
def get_current_user():
    """Get current user information"""
    try:
        db = get_db()
        user_id = request.user['uid']
        
        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        
        return jsonify({
            'user': user_data.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/user', methods=['PUT'])
@require_auth
def update_user():
    """Update current user information"""
    try:
        db = get_db()
        user_id = request.user['uid']
        data = request.json
        
        # Get existing user
        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404
        
        # Update allowed fields
        allowed_fields = ['display_name', 'first_name', 'last_name', 'phone', 'department', 'position', 'preferences']
        update_data = {}
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Add updated timestamp
        update_data['updated_at'] = user_doc.to_dict()['updated_at']
        
        user_ref.update(update_data)
        
        # Return updated user
        updated_doc = user_ref.get()
        user_data = User.from_dict(updated_doc.id, updated_doc.to_dict())
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user_data.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


