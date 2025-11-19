# backend/api/calls.py
"""Call API endpoints for VoIP integration"""
from flask import Blueprint, request, jsonify
from api.auth import require_auth, require_permission
from utils.firebase import get_db
from models.log import Log
from firebase_admin import firestore
import os
from datetime import datetime
import requests
try:
    from twilio.rest import Client
    from twilio.jwt.access_token import AccessToken
    from twilio.jwt.access_token.grants import VoiceGrant
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    print("⚠️  Twilio SDK not installed. Install with: pip install twilio")

calls_bp = Blueprint('calls', __name__)

# Twilio configuration (from environment variables)
TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')
TWILIO_API_KEY = os.getenv('TWILIO_API_KEY', '')
TWILIO_API_SECRET = os.getenv('TWILIO_API_SECRET', '')


def _bad(value):
    """Check if value is bad (None, empty string, or 'undefined')"""
    return not value or value == 'undefined' or (isinstance(value, str) and value.strip() == '')


@calls_bp.route('/token', methods=['POST'])
@require_auth
@require_permission("logs", "create")
def generate_call_token():
    """
    Generate Twilio access token for making calls via WebRTC
    
    Returns a token that allows the frontend to make calls using Twilio Voice SDK
    """
    try:
        if not TWILIO_ACCOUNT_SID or not TWILIO_API_KEY or not TWILIO_API_SECRET:
            return jsonify({
                "error": "Twilio not configured. Please set TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_SECRET environment variables."
            }), 500
        
        if not TWILIO_AVAILABLE:
            return jsonify({
                "error": "Twilio SDK not installed. Install with: pip install twilio"
            }), 500
        
        uid = request.user['uid']
        identity = f"user_{uid}"  # Unique identity for this user
        
        # Generate Twilio access token using SDK
        token = AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, identity=identity)
        
        # Create a Voice grant and add to token
        voice_grant = VoiceGrant(
            outgoing_application_sid=os.getenv('TWILIO_APP_SID', '')  # TwiML App SID
        )
        token.add_grant(voice_grant)
        
        return jsonify({
            "success": True,
            "token": token.to_jwt(),
            "identity": identity
        }), 200
        
    except Exception as e:
        print(f"Error generating call token: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@calls_bp.route('/initiate', methods=['POST'])
@require_auth
@require_permission("logs", "create")
def initiate_call():
    """
    Initiate an outbound call via Twilio
    
    Request body:
    {
        "to": "+1234567890",  # Phone number to call
        "customer_id": "customer123",  # Optional: link to customer
        "from": "+0987654321"  # Optional: caller ID (defaults to TWILIO_PHONE_NUMBER)
    }
    """
    try:
        if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
            return jsonify({
                "error": "Twilio not configured. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
            }), 500
        
        body = request.get_json(force=True) or {}
        to_number = body.get('to') or body.get('phone')
        customer_id = body.get('customer_id')
        from_number = body.get('from') or TWILIO_PHONE_NUMBER
        
        if _bad(to_number):
            return jsonify({"error": "Phone number 'to' is required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        # Make call via Twilio API using SDK
        if not TWILIO_AVAILABLE:
            return jsonify({
                "error": "Twilio SDK not installed. Install with: pip install twilio"
            }), 500
        
        try:
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            base_url = os.getenv('BASE_URL', 'http://localhost:5000')
            
            call = client.calls.create(
                to=to_number,
                from_=from_number,
                url=f"{base_url}/api/calls/webhook",  # TwiML webhook
                status_callback=f"{base_url}/api/calls/status",
                status_callback_event=['initiated', 'ringing', 'answered', 'completed']
            )
            
            call_sid = call.sid
            status = call.status
            
            # Create initial log entry for the call
            db = get_db()
            log_ref = db.collection('logs').document()
            
            log_data = {
                'tenant_id': tenant_id,
                'type': 'call',
                'customer_id': customer_id,
                'title': f"Call to {to_number}",
                'description': f"Outbound call initiated",
                'direction': 'outbound',
                'status': 'pending',  # Will be updated when call completes
                'log_date': firestore.SERVER_TIMESTAMP,
                'created_at': firestore.SERVER_TIMESTAMP,
                'created_by': uid,
                'updated_at': firestore.SERVER_TIMESTAMP,
                # Store Twilio call SID for tracking
                'call_sid': call_sid,
                'call_to': to_number,
                'call_from': from_number,
            }
            
            log_ref.set(log_data)
            
            return jsonify({
                "success": True,
                "callSid": call_sid,
                "status": status,
                "logId": log_ref.id,
                "message": "Call initiated successfully"
            }), 200
            
        except requests.exceptions.RequestException as e:
            print(f"Twilio API error: {e}")
            return jsonify({
                "error": f"Failed to initiate call: {str(e)}"
            }), 500
        
    except Exception as e:
        print(f"Error initiating call: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@calls_bp.route('/webhook', methods=['POST'])
def call_webhook():
    """
    Handle Twilio webhook for call events (Twiml instructions)
    This endpoint is called by Twilio during the call
    """
    try:
        # Return TwiML to connect the call
        # In production, use Twilio's TwiML library
        twiml = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Connecting your call.</Say><Dial></Dial></Response>'
        return twiml, 200, {'Content-Type': 'text/xml'}
    except Exception as e:
        print(f"Error in call webhook: {e}")
        return '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error connecting call.</Say></Response>', 500, {'Content-Type': 'text/xml'}


@calls_bp.route('/status', methods=['POST'])
def call_status():
    """
    Handle Twilio status callback for call events
    Updates the log entry when call status changes
    """
    try:
        # Twilio sends POST data with call information
        call_sid = request.form.get('CallSid')
        call_status = request.form.get('CallStatus')  # queued, ringing, in-progress, completed, failed, busy, no-answer
        call_duration = request.form.get('CallDuration')  # Duration in seconds (only for completed calls)
        from_number = request.form.get('From')
        to_number = request.form.get('To')
        direction = request.form.get('Direction')  # inbound or outbound
        
        if not call_sid:
            return jsonify({"error": "CallSid is required"}), 400
        
        db = get_db()
        
        # Find log entry by call_sid
        logs_query = db.collection('logs').where('call_sid', '==', call_sid).limit(1)
        logs = list(logs_query.stream())
        
        if logs:
            log_ref = logs[0].reference
            update_data = {
                'updated_at': firestore.SERVER_TIMESTAMP,
                'call_status': call_status,
            }
            
            # Map Twilio status to our log status
            status_map = {
                'queued': 'pending',
                'ringing': 'pending',
                'in-progress': 'completed',
                'completed': 'completed',
                'failed': 'cancelled',
                'busy': 'cancelled',
                'no-answer': 'cancelled',
            }
            update_data['status'] = status_map.get(call_status, 'pending')
            
            # Update call outcome
            if call_status == 'completed':
                update_data['call_outcome'] = 'answered'
                if call_duration:
                    update_data['duration'] = int(call_duration) // 60  # Convert to minutes
            elif call_status == 'busy':
                update_data['call_outcome'] = 'busy'
            elif call_status == 'no-answer':
                update_data['call_outcome'] = 'no_answer'
            elif call_status == 'failed':
                update_data['call_outcome'] = 'failed'
            
            # Update direction if inbound
            if direction == 'inbound':
                update_data['direction'] = 'inbound'
                update_data['title'] = f"Call from {from_number}"
            
            log_ref.update(update_data)
            print(f"Updated log for call {call_sid}: status={call_status}")
        else:
            # If no log found, create one for inbound calls
            if direction == 'inbound':
                log_ref = db.collection('logs').document()
                log_data = {
                    'type': 'call',
                    'title': f"Call from {from_number}",
                    'description': f"Inbound call",
                    'direction': 'inbound',
                    'status': status_map.get(call_status, 'pending'),
                    'call_sid': call_sid,
                    'call_from': from_number,
                    'call_to': to_number,
                    'call_status': call_status,
                    'log_date': firestore.SERVER_TIMESTAMP,
                    'created_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'tenant_id': 'default',  # Will need to determine tenant from phone number mapping
                }
                log_ref.set(log_data)
        
        return jsonify({"success": True}), 200
        
    except Exception as e:
        print(f"Error updating call status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@calls_bp.route('/jitsi/start', methods=['POST'])
@require_auth
@require_permission("logs", "create")
def log_jitsi_call_start():
    """
    Log the start of a Jitsi video/audio call
    
    Request body:
    {
        "room_name": "crm-customer-1234567890-abc123",
        "customer_id": "customer123",  # Optional
        "customer_name": "John Doe"  # Optional
    }
    """
    try:
        body = request.get_json(force=True) or {}
        room_name = body.get('room_name')
        customer_id = body.get('customer_id')
        customer_name = body.get('customer_name')
        
        if _bad(room_name):
            return jsonify({"error": "room_name is required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        db = get_db()
        log_ref = db.collection('logs').document()
        
        title = f"Video call with {customer_name}" if customer_name else "Video call"
        if not customer_name and customer_id:
            title = "Video call"
        
        log_data = {
            'tenant_id': tenant_id,
            'type': 'call',
            'customer_id': customer_id,
            'title': title,
            'description': f"Jitsi video call - Room: {room_name}",
            'direction': 'outbound',  # Jitsi calls are typically initiated
            'status': 'in-progress',
            'log_date': firestore.SERVER_TIMESTAMP,
            'created_at': firestore.SERVER_TIMESTAMP,
            'created_by': uid,
            'updated_at': firestore.SERVER_TIMESTAMP,
            # Jitsi-specific fields
            'call_type': 'jitsi',
            'room_name': room_name,
            'call_started_at': firestore.SERVER_TIMESTAMP,
            'participants': [uid],  # Start with caller
        }
        
        log_ref.set(log_data)
        
        return jsonify({
            "success": True,
            "logId": log_ref.id,
            "room_name": room_name,
            "message": "Call started and logged"
        }), 200
        
    except Exception as e:
        print(f"Error logging Jitsi call start: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@calls_bp.route('/jitsi/end', methods=['POST'])
@require_auth
def log_jitsi_call_end():
    """
    Log the end of a Jitsi video/audio call
    
    Request body:
    {
        "log_id": "log123",  # Optional: if provided, updates existing log
        "room_name": "crm-customer-1234567890-abc123",
        "customer_id": "customer123",  # Optional
        "duration": 300,  # Duration in seconds
        "participants": ["user1", "user2"]  # List of participant IDs
    }
    """
    try:
        body = request.get_json(force=True) or {}
        log_id = body.get('log_id')
        room_name = body.get('room_name')
        customer_id = body.get('customer_id')
        duration = body.get('duration', 0)  # Duration in seconds
        participants = body.get('participants', [])
        
        if _bad(room_name):
            return jsonify({"error": "room_name is required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        db = get_db()
        
        # If log_id provided, update existing log
        if log_id:
            log_ref = db.collection('logs').document(log_id)
            doc = log_ref.get()
            
            if doc.exists:
                # Update existing log
                update_data = {
                    'status': 'completed',
                    'duration': duration // 60,  # Convert to minutes
                    'participants': participants,
                    'call_ended_at': firestore.SERVER_TIMESTAMP,
                    'updated_at': firestore.SERVER_TIMESTAMP,
                    'call_outcome': 'completed',
                }
                log_ref.update(update_data)
                
                return jsonify({
                    "success": True,
                    "message": "Call ended and log updated"
                }), 200
        
        # If no log_id or log not found, find by room_name
        logs_query = db.collection('logs').where('room_name', '==', room_name).where('tenant_id', '==', tenant_id).limit(1)
        logs = list(logs_query.stream())
        
        if logs:
            log_ref = logs[0].reference
            update_data = {
                'status': 'completed',
                'duration': duration // 60,  # Convert to minutes
                'participants': participants,
                'call_ended_at': firestore.SERVER_TIMESTAMP,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'call_outcome': 'completed',
            }
            log_ref.update(update_data)
        else:
            # Create new log entry if not found
            log_ref = db.collection('logs').document()
            log_data = {
                'tenant_id': tenant_id,
                'type': 'call',
                'customer_id': customer_id,
                'title': 'Video call',
                'description': f"Jitsi video call - Room: {room_name}",
                'direction': 'outbound',
                'status': 'completed',
                'duration': duration // 60,
                'participants': participants,
                'log_date': firestore.SERVER_TIMESTAMP,
                'created_at': firestore.SERVER_TIMESTAMP,
                'created_by': uid,
                'updated_at': firestore.SERVER_TIMESTAMP,
                'call_type': 'jitsi',
                'room_name': room_name,
                'call_ended_at': firestore.SERVER_TIMESTAMP,
                'call_outcome': 'completed',
            }
            log_ref.set(log_data)
        
        return jsonify({
            "success": True,
            "message": "Call ended and logged"
        }), 200
        
    except Exception as e:
        print(f"Error logging Jitsi call end: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@calls_bp.route('/history', methods=['GET'])
@require_auth
def get_call_history():
    """
    Get call history for the authenticated user
    """
    try:
        db = get_db()
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        # Get logs filtered by type='call'
        query = db.collection('logs').where('tenant_id', '==', tenant_id).where('type', '==', 'call')
        
        # Optional filters
        customer_id = request.args.get('customer_id')
        if customer_id:
            query = query.where('customer_id', '==', customer_id)
        
        direction = request.args.get('direction')
        if direction:
            query = query.where('direction', '==', direction)
        
        # Limit and order
        query = query.order_by('log_date', direction=firestore.Query.DESCENDING).limit(100)
        
        calls = []
        for doc in query.stream():
            call_data = doc.to_dict()
            call_data['id'] = doc.id
            calls.append(call_data)
        
        return jsonify({
            "success": True,
            "calls": calls,
            "total": len(calls)
        }), 200
        
    except Exception as e:
        print(f"Error getting call history: {e}")
        return jsonify({"error": str(e)}), 500

