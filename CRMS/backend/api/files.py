# backend/api/files.py
"""
File upload and management API endpoints
Uses Firebase Storage for file storage
"""
from flask import Blueprint, request, jsonify
from api.auth import require_auth, require_permission
from utils.firebase import get_db
import firebase_admin
from firebase_admin import storage as firebase_storage
from datetime import datetime, timedelta
import uuid
import os

files_bp = Blueprint("files", __name__)


def get_storage_bucket():
    """Get Firebase Storage bucket"""
    try:
        bucket = firebase_storage.bucket()
        return bucket
    except Exception as e:
        print(f"Error getting storage bucket: {e}")
        # Try alternative initialization
        try:
            import firebase_admin
            if not firebase_admin._apps:
                from utils.firebase import initialize_firebase
                initialize_firebase()
            bucket = firebase_storage.bucket()
            return bucket
        except Exception as e2:
            print(f"Error initializing storage bucket: {e2}")
            return None


@files_bp.route("/upload", methods=["POST"])
@require_auth
def upload_file():
    """Upload a file to Firebase Storage"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Get metadata from form data
        entity_type = request.form.get('entityType', 'general')  # customer, log, complaint, etc.
        entity_id = request.form.get('entityId', '')
        description = request.form.get('description', '')
        tenant_id = request.user.get("tenant_id", "default")
        user_id = request.user["uid"]
        
        # Generate unique filename
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        # Create storage path: tenant_id/entity_type/entity_id/filename
        if entity_id:
            storage_path = f"{tenant_id}/{entity_type}/{entity_id}/{unique_filename}"
        else:
            storage_path = f"{tenant_id}/{entity_type}/{unique_filename}"
        
        # Upload to Firebase Storage
        bucket = get_storage_bucket()
        if not bucket:
            return jsonify({"error": "Storage service unavailable"}), 503
        
        blob = bucket.blob(storage_path)
        blob.upload_from_file(file, content_type=file.content_type)
        
        # Make the file publicly accessible (or generate signed URL for private access)
        blob.make_public()
        public_url = blob.public_url
        
        # Alternatively, generate signed URL for private files (recommended)
        # signed_url = blob.generate_signed_url(expiration=datetime.timedelta(days=365))
        
        # Store file metadata in Firestore
        db = get_db()
        file_metadata = {
            "tenant_id": tenant_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "original_filename": file.filename,
            "storage_path": storage_path,
            "public_url": public_url,
            "content_type": file.content_type,
            "size": file.content_length or 0,
            "description": description,
            "uploaded_by": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        file_ref = db.collection("files").add(file_metadata)
        file_metadata["id"] = file_ref[1].id
        
        return jsonify({
            "message": "File uploaded successfully",
            "file": file_metadata
        }), 201
        
    except Exception as e:
        print(f"Error uploading file: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@files_bp.route("/<file_id>", methods=["GET"])
@require_auth
def get_file(file_id):
    """Get file metadata"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        file_doc = db.collection("files").document(file_id).get()
        if not file_doc.exists:
            return jsonify({"error": "File not found"}), 404
        
        file_data = file_doc.to_dict()
        if file_data.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant access"}), 403
        
        file_data["id"] = file_doc.id
        return jsonify(file_data), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route("/<file_id>", methods=["DELETE"])
@require_auth
@require_permission("files", "delete")
def delete_file(file_id):
    """Delete a file from storage and database"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        user_id = request.user["uid"]
        
        file_doc = db.collection("files").document(file_id).get()
        if not file_doc.exists:
            return jsonify({"error": "File not found"}), 404
        
        file_data = file_doc.to_dict()
        if file_data.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant access"}), 403
        
        # Check permissions - only owner or admin can delete
        if file_data.get("uploaded_by") != user_id and request.user.get("role") not in ["admin", "super_admin"]:
            return jsonify({"error": "Forbidden: insufficient permissions"}), 403
        
        # Delete from Firebase Storage
        storage_path = file_data.get("storage_path")
        if storage_path:
            bucket = get_storage_bucket()
            if bucket:
                blob = bucket.blob(storage_path)
                if blob.exists():
                    blob.delete()
        
        # Delete from Firestore
        db.collection("files").document(file_id).delete()
        
        return jsonify({"message": "File deleted successfully"}), 200
        
    except Exception as e:
        print(f"Error deleting file: {e}")
        return jsonify({"error": str(e)}), 500


@files_bp.route("/entity/<entity_type>/<entity_id>", methods=["GET"])
@require_auth
def get_entity_files(entity_type, entity_id):
    """Get all files for a specific entity (customer, log, complaint, etc.)"""
    try:
        from google.cloud.firestore_v1.base_query import FieldFilter
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        query = db.collection("files").where(
            filter=FieldFilter("tenant_id", "==", tenant_id)
        ).where(
            filter=FieldFilter("entity_type", "==", entity_type)
        ).where(
            filter=FieldFilter("entity_id", "==", entity_id)
        )
        
        files = []
        for doc in query.stream():
            file_data = doc.to_dict()
            file_data["id"] = doc.id
            files.append(file_data)
        
        # Sort by created_at descending
        files.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return jsonify({
            "files": files,
            "total": len(files)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@files_bp.route("/download/<file_id>", methods=["GET"])
@require_auth
def download_file(file_id):
    """Generate signed URL for file download"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        file_doc = db.collection("files").document(file_id).get()
        if not file_doc.exists:
            return jsonify({"error": "File not found"}), 404
        
        file_data = file_doc.to_dict()
        if file_data.get("tenant_id") != tenant_id:
            return jsonify({"error": "Forbidden: cross-tenant access"}), 403
        
        storage_path = file_data.get("storage_path")
        if not storage_path:
            return jsonify({"error": "File storage path not found"}), 404
        
        # Generate signed URL (valid for 1 hour)
        bucket = get_storage_bucket()
        if not bucket:
            return jsonify({"error": "Storage service unavailable"}), 503
        
        blob = bucket.blob(storage_path)
        signed_url = blob.generate_signed_url(expiration=timedelta(hours=1))
        
        return jsonify({
            "download_url": signed_url,
            "filename": file_data.get("original_filename"),
            "content_type": file_data.get("content_type")
        }), 200
        
    except Exception as e:
        print(f"Error generating download URL: {e}")
        return jsonify({"error": str(e)}), 500

