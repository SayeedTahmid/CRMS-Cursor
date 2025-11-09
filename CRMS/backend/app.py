"""
CRM System Backend - Main Application
"""
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_restful import Api
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Firebase
try:
    from utils.firebase import initialize_firebase, get_db
    initialize_firebase()
    db = get_db()
except ImportError:
    print("⚠️  Firebase utilities not found. Run setup instructions first.")
    db = None

# Initialize Flask app
app = Flask(__name__)

# Configure CORS properly for all local and dev environments
CORS(app, resources={r"/*": {
    "origins": [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://192.168.1.2:5173", "http://192.168.1.2:5174", "http://192.168.1.2:5175",
        "http://192.168.1.4:5173", "http://192.168.1.4:5174", "http://192.168.1.4:5175"
    ],
    "allow_headers": ["Content-Type", "Authorization"],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "supports_credentials": True
}})


# Initialize Flask-RESTful API
api = Api(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
app.config['FLASK_ENV'] = os.getenv('FLASK_ENV', 'development')
app.config['DEBUG'] = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
if db:
    app.config['DB'] = db  # Make db available to routes


@app.route('/')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'CRM Backend API',
        'version': '1.0.0',
        'location': 'Asia South 1 (Mumbai) - Recommended for Bangladesh'
    })


@app.route('/api/health')
def api_health():
    """Detailed health check for API"""
    # Test database connection
    try:
        if db:
            db.collection('health_check').document('test').set({'status': 'ok'})
            db_status = 'connected'
        else:
            db_status = 'not initialized'
    except Exception as e:
        db_status = f'error: {str(e)}'
    
    return jsonify({
        'status': 'healthy',
        'database': db_status,
        'auth': 'configured',
        'firebase_region': 'asia-south1',
        'location_recommendation': 'Asia South 1 (Mumbai) - Closest to Bangladesh'
    })


# Import and register routes
from api.auth import auth_bp
from api.customers import customers_bp
from api.logs import logs_bp
from api.complaints import complaints_bp
from api.search import search_bp
from api.users import users_bp
from api.metrics import metrics_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(customers_bp, url_prefix='/api/customers')
app.register_blueprint(logs_bp, url_prefix='/api/logs')
app.register_blueprint(complaints_bp, url_prefix='/api/complaints')
app.register_blueprint(search_bp, url_prefix='/api/search')
app.register_blueprint(users_bp, url_prefix='/api/users')
app.register_blueprint(metrics_bp, url_prefix="/api/metrics")

print("\n=== Registered routes ===")
for rule in app.url_map.iter_rules():
    print(f"{','.join(sorted(rule.methods)):<22} {rule.rule}")
print("=========================\n")


from werkzeug.exceptions import HTTPException

@app.errorhandler(Exception)
def handle_exception(e):
    code = 500
    if isinstance(e, HTTPException):
        code = e.code
    return jsonify({"error": str(e), "code": code}), code

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = app.config['DEBUG']
    app.run(host='0.0.0.0', port=port, debug=debug, use_reloader=False)
