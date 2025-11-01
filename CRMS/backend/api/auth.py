"""
Authentication API endpoints
"""
from flask import Blueprint, request, jsonify, current_app
from functools import wraps
from utils.firebase import verify_token, get_db, get_user_by_email, create_user
from models.user import User
from datetime import datetime

auth_bp = Blueprint('auth', __name__)


def require_auth(f):
    """Decorator to require authentication via Firebase ID token"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authentication required'}), 401
        
        id_token = auth_header.split('Bearer ')[1]
        decoded_token = verify_token(id_token)
        
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401
        
        # Attach user to request context
        request.user = decoded_token
        return f(*args, **kwargs)
    
    return decorated_function


@auth_bp.route('/verify', methods=['POST'])
def verify():
    """Verify a Firebase ID token and return user information.
       If Firestore document is missing, auto-create minimal user.
    """
    try:
        id_token = request.json.get('idToken')
        if not id_token:
            return jsonify({'error': 'ID token required'}), 400

        decoded_token = verify_token(id_token)
        if not decoded_token:
            return jsonify({'error': 'Invalid token'}), 401

        db = get_db()
        uid = decoded_token.get('uid')
        if not uid:
            return jsonify({'error': 'Invalid token payload (missing UID)'}), 401

        user_doc_ref = db.collection('users').document(uid)
        user_doc = user_doc_ref.get()

        # If user doesn't exist → create a minimal placeholder
        if not user_doc.exists:
            minimal_user = {
                'firebase_uid': uid,
                'email': decoded_token.get('email'),
                'display_name': decoded_token.get('name') or decoded_token.get('email'),
                'role': 'viewer',
                'tenant_id': 'default',
                'is_active': True,
                'is_verified': True,
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat(),
                'created_by_source': 'auto_verify'
            }
            user_doc_ref.set(minimal_user)

            return jsonify({
                'authenticated': True,
                'user': minimal_user,
                'message': 'User auto-created in Firestore (minimal profile)'
            }), 201

        # If exists → return full user
        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        return jsonify({
            'authenticated': True,
            'user': user_data.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.exception("Error in /verify")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user via email/password"""
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        display_name = data.get('display_name')
        tenant_id = data.get('tenant_id', 'default')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        # Create Firebase Auth user
        firebase_user = create_user(email, password, display_name)
        if not firebase_user:
            return jsonify({'error': 'Failed to create user in Firebase'}), 400

        db = get_db()
        user = User(
            email=email,
            display_name=display_name or email,
            tenant_id=tenant_id,
            firebase_uid=firebase_user.uid,
            role=User.ROLE_VIEWER,
            is_active=True,
            is_verified=False
        )

        db.collection('users').document(firebase_user.uid).set(user.to_dict())

        return jsonify({
            'message': 'User registered successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        current_app.logger.exception("Error in /register")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/user', methods=['GET'])
@require_auth
def get_current_user():
    """Return current authenticated user's Firestore profile"""
    try:
        db = get_db()
        user_id = request.user['uid']

        user_doc = db.collection('users').document(user_id).get()
        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404

        user_data = User.from_dict(user_doc.id, user_doc.to_dict())
        return jsonify({'user': user_data.to_dict()}), 200

    except Exception as e:
        current_app.logger.exception("Error in /user [GET]")
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/user', methods=['PUT'])
@require_auth
def update_user():
    """Update authenticated user's profile"""
    try:
        db = get_db()
        user_id = request.user['uid']
        data = request.json

        user_ref = db.collection('users').document(user_id)
        user_doc = user_ref.get()

        if not user_doc.exists:
            return jsonify({'error': 'User not found'}), 404

        allowed_fields = [
            'display_name', 'first_name', 'last_name',
            'phone', 'department', 'position', 'preferences'
        ]

        update_data = {f: data[f] for f in allowed_fields if f in data}
        update_data['updated_at'] = datetime.utcnow().isoformat()

        user_ref.update(update_data)
        updated_doc = user_ref.get()
        user_data = User.from_dict(updated_doc.id, updated_doc.to_dict())

        return jsonify({
            'message': 'User updated successfully',
            'user': user_data.to_dict()
        }), 200

    except Exception as e:
        current_app.logger.exception("Error in /user [PUT]")
        return jsonify({'error': str(e)}), 500
