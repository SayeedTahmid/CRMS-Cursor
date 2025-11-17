# backend/api/reports.py
"""
Reporting API endpoints
Generates reports for customers, logs, complaints
"""
from flask import Blueprint, request, jsonify, Response
from api.auth import require_auth, require_permission
from utils.firebase import get_db
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timedelta
import csv
import io

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/customers", methods=["GET"])
@require_auth
@require_permission("customers", "read")
def generate_customer_report():
    """Generate customer report (CSV)"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        # Get filters from query params
        status = request.args.get("status")
        type_filter = request.args.get("type")
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        
        # Build query
        query = db.collection("customers").where(filter=FieldFilter("tenant_id", "==", tenant_id))
        
        if status:
            query = query.where(filter=FieldFilter("status", "==", status))
        if type_filter:
            query = query.where(filter=FieldFilter("type", "==", type_filter))
        
        query = query.limit(10000)  # Reasonable limit for reports
        
        # Fetch customers
        customers = []
        for doc in query.stream():
            customer_data = doc.to_dict()
            if not customer_data:
                continue
            
            # Filter by date if provided
            if start_date or end_date:
                created_at = customer_data.get("created_at")
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        created_at = None
                
                if created_at:
                    if start_date:
                        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        if created_at < start:
                            continue
                    if end_date:
                        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        if created_at > end:
                            continue
            
            customers.append({
                "id": doc.id,
                **customer_data
            })
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "ID", "Name", "Email", "Phone", "Company", "Status", "Type",
            "Address", "City", "State", "Country", "Industry", "Created At"
        ])
        
        # Data rows
        for customer in customers:
            writer.writerow([
                customer.get("id", ""),
                customer.get("name", ""),
                customer.get("email", ""),
                customer.get("phone", ""),
                customer.get("company", ""),
                customer.get("status", ""),
                customer.get("type", ""),
                customer.get("address", ""),
                customer.get("city", ""),
                customer.get("state", ""),
                customer.get("country", ""),
                customer.get("industry", ""),
                customer.get("created_at", ""),
            ])
        
        # Create response
        response = Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=customers_report_{datetime.now().strftime("%Y%m%d")}.csv'}
        )
        
        return response
        
    except Exception as e:
        print(f"Error generating customer report: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@reports_bp.route("/logs", methods=["GET"])
@require_auth
@require_permission("logs", "read")
def generate_log_report():
    """Generate log report (CSV)"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        # Get filters
        customer_id = request.args.get("customerId")
        log_type = request.args.get("type")
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        
        # Build query
        query = db.collection("logs").where(filter=FieldFilter("tenant_id", "==", tenant_id))
        
        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        if log_type:
            query = query.where(filter=FieldFilter("type", "==", log_type))
        
        query = query.limit(10000)
        
        # Fetch logs
        logs = []
        for doc in query.stream():
            log_data = doc.to_dict()
            if not log_data:
                continue
            
            # Filter by date
            if start_date or end_date:
                log_date = log_data.get("log_date") or log_data.get("created_at")
                if isinstance(log_date, str):
                    try:
                        log_date = datetime.fromisoformat(log_date.replace('Z', '+00:00'))
                    except:
                        log_date = None
                
                if log_date:
                    if start_date:
                        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        if log_date < start:
                            continue
                    if end_date:
                        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        if log_date > end:
                            continue
            
            logs.append({
                "id": doc.id,
                **log_data
            })
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "ID", "Title", "Type", "Customer ID", "Description", "Log Date", "Created At", "Created By"
        ])
        
        # Data rows
        for log in logs:
            writer.writerow([
                log.get("id", ""),
                log.get("title", ""),
                log.get("type", ""),
                log.get("customer_id", ""),
                log.get("description", "") or log.get("content", ""),
                log.get("log_date", ""),
                log.get("created_at", ""),
                log.get("created_by", ""),
            ])
        
        response = Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=logs_report_{datetime.now().strftime("%Y%m%d")}.csv'}
        )
        
        return response
        
    except Exception as e:
        print(f"Error generating log report: {e}")
        return jsonify({"error": str(e)}), 500


@reports_bp.route("/complaints", methods=["GET"])
@require_auth
@require_permission("complaints", "read")
def generate_complaint_report():
    """Generate complaint report (CSV)"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        uid = request.user["uid"]
        
        # Get filters
        status = request.args.get("status")
        customer_id = request.args.get("customerId")
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        
        # Build query
        query = db.collection("complaints").where(filter=FieldFilter("tenant_id", "==", tenant_id))
        
        if request.user.get("role") == "SALES_REP":
            query = query.where(filter=FieldFilter("created_by", "==", uid))
        
        if status:
            query = query.where(filter=FieldFilter("status", "==", status))
        if customer_id:
            query = query.where(filter=FieldFilter("customer_id", "==", customer_id))
        
        query = query.limit(10000)
        
        # Fetch complaints
        complaints = []
        for doc in query.stream():
            complaint_data = doc.to_dict()
            if not complaint_data:
                continue
            
            # Filter by date
            if start_date or end_date:
                created_at = complaint_data.get("created_at")
                if isinstance(created_at, str):
                    try:
                        created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    except:
                        created_at = None
                
                if created_at:
                    if start_date:
                        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                        if created_at < start:
                            continue
                    if end_date:
                        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                        if created_at > end:
                            continue
            
            complaints.append({
                "id": doc.id,
                **complaint_data
            })
        
        # Generate CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            "Ticket Number", "Title", "Status", "Priority", "Severity", "Category",
            "Customer ID", "Description", "Created At", "Resolved At"
        ])
        
        # Data rows
        for complaint in complaints:
            resolution = complaint.get("resolution", {})
            resolved_at = resolution.get("resolvedAt", "") if resolution else ""
            
            writer.writerow([
                complaint.get("ticket_number", ""),
                complaint.get("title", ""),
                complaint.get("status", ""),
                complaint.get("priority", ""),
                complaint.get("severity", ""),
                complaint.get("category", ""),
                complaint.get("customer_id", ""),
                complaint.get("description", ""),
                complaint.get("created_at", ""),
                resolved_at,
            ])
        
        response = Response(
            output.getvalue(),
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment; filename=complaints_report_{datetime.now().strftime("%Y%m%d")}.csv'}
        )
        
        return response
        
    except Exception as e:
        print(f"Error generating complaint report: {e}")
        return jsonify({"error": str(e)}), 500


@reports_bp.route("/summary", methods=["GET"])
@require_auth
def get_report_summary():
    """Get summary statistics for reports"""
    try:
        db = get_db()
        tenant_id = request.user.get("tenant_id", "default")
        
        # Get date range
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        
        # Count customers
        customer_query = db.collection("customers").where(filter=FieldFilter("tenant_id", "==", tenant_id)).limit(10000)
        customer_count = sum(1 for _ in customer_query.stream())
        
        # Count logs
        log_query = db.collection("logs").where(filter=FieldFilter("tenant_id", "==", tenant_id)).limit(10000)
        log_count = sum(1 for _ in log_query.stream())
        
        # Count complaints
        complaint_query = db.collection("complaints").where(filter=FieldFilter("tenant_id", "==", tenant_id)).limit(10000)
        complaint_count = sum(1 for _ in complaint_query.stream())
        
        return jsonify({
            "customers": customer_count,
            "logs": log_count,
            "complaints": complaint_count,
            "date_range": {
                "start": start_date,
                "end": end_date
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

