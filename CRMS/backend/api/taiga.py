# backend/api/taiga.py
"""Taiga integration API endpoints"""
from flask import Blueprint, request, jsonify
from api.auth import require_auth, require_permission
from utils.firebase import get_db
from services.taiga_service import get_taiga_service
from models.complaint import Complaint
from firebase_admin import firestore
import os

taiga_bp = Blueprint('taiga', __name__)


def _bad(value):
    """Check if value is bad (None, empty string, or 'undefined')"""
    return not value or value == 'undefined' or (isinstance(value, str) and value.strip() == '')


@taiga_bp.route('/create-issue', methods=['POST'])
@require_auth
@require_permission("complaints", "update")
def create_taiga_issue():
    """
    Create a Taiga issue from a complaint
    
    Request body:
    {
        "complaint_id": "complaint123",
        "project_slug": "my-project",  // Optional, uses default if not provided
        "priority": "high",  // Optional
        "tags": ["bug", "customer"]  // Optional
    }
    """
    try:
        # Check if Taiga is configured
        if not os.getenv('TAIGA_AUTH_TOKEN'):
            return jsonify({
                "error": "Taiga not configured. Please set TAIGA_AUTH_TOKEN and TAIGA_PROJECT_SLUG environment variables."
            }), 500
        
        body = request.get_json(force=True) or {}
        complaint_id = body.get('complaint_id')
        
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        db = get_db()
        
        # Get complaint
        complaint_ref = db.collection('complaints').document(complaint_id)
        complaint_doc = complaint_ref.get()
        
        if not complaint_doc.exists:
            return jsonify({"error": "Complaint not found"}), 404
        
        complaint_data = complaint_doc.to_dict()
        
        # Check tenant isolation
        if complaint_data.get('tenant_id') != tenant_id:
            return jsonify({"error": "Complaint not found"}), 404
        
        # Check if already linked
        if complaint_data.get('taiga_issue_id'):
            return jsonify({
                "error": "Complaint already linked to Taiga issue",
                "taiga_issue_id": complaint_data.get('taiga_issue_id'),
                "taiga_issue_url": complaint_data.get('taiga_issue_url'),
            }), 400
        
        # Create Taiga issue
        taiga_service = get_taiga_service()
        
        # Map complaint priority to Taiga priority
        complaint_priority = complaint_data.get('priority', 'medium')
        
        # Create issue in Taiga
        taiga_issue = taiga_service.create_issue(
            subject=complaint_data.get('title') or complaint_data.get('subject', 'Untitled Complaint'),
            description=complaint_data.get('description', ''),
            project_slug=body.get('project_slug'),
            priority=complaint_priority,
            tags=body.get('tags', []),
        )
        
        # Update complaint with Taiga issue info
        update_data = {
            'taiga_issue_id': taiga_issue['id'],
            'taiga_issue_ref': taiga_issue['ref'],
            'taiga_issue_url': taiga_issue['url'],
            'taiga_status': taiga_issue['status'],
            'taiga_project_slug': taiga_issue['project_slug'],
            'updated_at': firestore.SERVER_TIMESTAMP,
        }
        
        complaint_ref.update(update_data)
        
        return jsonify({
            "success": True,
            "taiga_issue": taiga_issue,
            "message": "Taiga issue created and linked to complaint"
        }), 200
        
    except Exception as e:
        print(f"Error creating Taiga issue: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@taiga_bp.route('/link-issue', methods=['POST'])
@require_auth
@require_permission("complaints", "update")
def link_taiga_issue():
    """
    Link an existing Taiga issue to a complaint
    
    Request body:
    {
        "complaint_id": "complaint123",
        "taiga_issue_id": 12345
    }
    """
    try:
        if not os.getenv('TAIGA_AUTH_TOKEN'):
            return jsonify({
                "error": "Taiga not configured. Please set TAIGA_AUTH_TOKEN environment variable."
            }), 500
        
        body = request.get_json(force=True) or {}
        complaint_id = body.get('complaint_id')
        taiga_issue_id = body.get('taiga_issue_id')
        
        if _bad(complaint_id) or _bad(taiga_issue_id):
            return jsonify({"error": "complaint_id and taiga_issue_id are required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        db = get_db()
        
        # Get complaint
        complaint_ref = db.collection('complaints').document(complaint_id)
        complaint_doc = complaint_ref.get()
        
        if not complaint_doc.exists:
            return jsonify({"error": "Complaint not found"}), 404
        
        complaint_data = complaint_doc.to_dict()
        
        # Check tenant isolation
        if complaint_data.get('tenant_id') != tenant_id:
            return jsonify({"error": "Complaint not found"}), 404
        
        # Get Taiga issue details
        taiga_service = get_taiga_service()
        taiga_issue = taiga_service.get_issue(int(taiga_issue_id))
        
        # Update complaint with Taiga issue info
        update_data = {
            'taiga_issue_id': taiga_issue['id'],
            'taiga_issue_ref': taiga_issue['ref'],
            'taiga_issue_url': taiga_issue['url'],
            'taiga_status': taiga_issue['status'],
            'taiga_project_slug': taiga_issue['project_slug'],
            'updated_at': firestore.SERVER_TIMESTAMP,
        }
        
        complaint_ref.update(update_data)
        
        return jsonify({
            "success": True,
            "taiga_issue": taiga_issue,
            "message": "Taiga issue linked to complaint"
        }), 200
        
    except Exception as e:
        print(f"Error linking Taiga issue: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@taiga_bp.route('/sync-status', methods=['POST'])
@require_auth
@require_permission("complaints", "update")
def sync_taiga_status():
    """
    Sync status from Taiga issue to CRM complaint
    
    Request body:
    {
        "complaint_id": "complaint123"
    }
    """
    try:
        if not os.getenv('TAIGA_AUTH_TOKEN'):
            return jsonify({
                "error": "Taiga not configured. Please set TAIGA_AUTH_TOKEN environment variable."
            }), 500
        
        body = request.get_json(force=True) or {}
        complaint_id = body.get('complaint_id')
        
        if _bad(complaint_id):
            return jsonify({"error": "complaint_id is required"}), 400
        
        uid = request.user['uid']
        tenant_id = request.user.get('tenant_id', 'default')
        
        db = get_db()
        
        # Get complaint
        complaint_ref = db.collection('complaints').document(complaint_id)
        complaint_doc = complaint_ref.get()
        
        if not complaint_doc.exists:
            return jsonify({"error": "Complaint not found"}), 404
        
        complaint_data = complaint_doc.to_dict()
        
        # Check tenant isolation
        if complaint_data.get('tenant_id') != tenant_id:
            return jsonify({"error": "Complaint not found"}), 404
        
        taiga_issue_id = complaint_data.get('taiga_issue_id')
        if not taiga_issue_id:
            return jsonify({"error": "Complaint is not linked to a Taiga issue"}), 400
        
        # Get current status from Taiga
        taiga_service = get_taiga_service()
        taiga_issue = taiga_service.sync_issue_status(int(taiga_issue_id))
        
        # Map Taiga status to CRM status (optional - you can customize this)
        status_map = {
            'new': 'new',
            'in progress': 'in_progress',
            'ready for test': 'in_progress',
            'done': 'resolved',
            'closed': 'closed',
        }
        
        taiga_status = taiga_issue['status'].lower()
        mapped_status = status_map.get(taiga_status, complaint_data.get('status'))
        
        # Update complaint
        update_data = {
            'taiga_status': taiga_issue['status'],
            'updated_at': firestore.SERVER_TIMESTAMP,
        }
        
        # Optionally update CRM status if different
        if mapped_status != complaint_data.get('status'):
            update_data['status'] = mapped_status
        
        complaint_ref.update(update_data)
        
        return jsonify({
            "success": True,
            "taiga_status": taiga_issue['status'],
            "crm_status": update_data.get('status', complaint_data.get('status')),
            "message": "Status synced from Taiga"
        }), 200
        
    except Exception as e:
        print(f"Error syncing Taiga status: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@taiga_bp.route('/issue/<int:issue_id>', methods=['GET'])
@require_auth
@require_permission("complaints", "read")
def get_taiga_issue(issue_id: int):
    """
    Get Taiga issue details
    
    URL parameter: issue_id (Taiga issue ID)
    """
    try:
        if not os.getenv('TAIGA_AUTH_TOKEN'):
            return jsonify({
                "error": "Taiga not configured. Please set TAIGA_AUTH_TOKEN environment variable."
            }), 500
        
        taiga_service = get_taiga_service()
        issue = taiga_service.get_issue(issue_id)
        
        return jsonify({
            "success": True,
            "issue": issue
        }), 200
        
    except Exception as e:
        print(f"Error getting Taiga issue: {e}")
        return jsonify({"error": str(e)}), 500

