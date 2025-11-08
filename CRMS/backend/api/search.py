# backend/api/search.py
from flask import Blueprint, request, jsonify
from google.cloud.firestore_v1.base_query import FieldFilter
from .auth import require_auth, current_user
from .db import get_db

search_bp = Blueprint("search", __name__, url_prefix="/api")

@search_bp.route("/search", methods=["GET"])
@require_auth
def search():
    q = (request.args.get("q") or "").strip().lower()
    scope = (request.args.get("type") or "all").lower()
    limit = int(request.args.get("limit") or 20)
    if not q:
        return jsonify({"error": "q required"}), 400

    db = get_db()
    tenant_id = current_user().get("tenant_id")

    def find(col, fields):
        rs = []
        query = db.collection(col).where(filter=FieldFilter("tenant_id", "==", tenant_id)).limit(200)
        for doc in query.stream():
            data = doc.to_dict()
            hay = " ".join([str(data.get(f, "")) for f in fields]).lower()
            if q in hay:
                rs.append({"id": doc.id, **data})
                if len(rs) >= limit:
                    break
        return rs

    results = {}
    if scope in ("customers", "all"):
        results["customers"] = find("customers", ["name", "email", "phone", "company"])
    if scope in ("logs", "all"):
        results["logs"] = find("logs", ["title", "description", "content", "type"])
    if scope in ("complaints", "all"):
        results["complaints"] = find("complaints", ["title", "description", "category", "ticket_number"])

    return jsonify({"q": q, "type": scope, "results": results})
