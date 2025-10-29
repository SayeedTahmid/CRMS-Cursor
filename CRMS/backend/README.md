# CRM Backend API

Flask REST API for the Modern CRM System.

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Firebase Setup

Download the Firebase service account key from the Firebase Console and save it as `serviceAccountKey.json` in this directory.

Alternatively, set environment variables:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`

### 4. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### 5. Run the Server

```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify ID token
- `GET /api/auth/user` - Get current user
- `PUT /api/auth/user` - Update current user

### Customers

- `GET /api/customers` - List all customers
- `GET /api/customers/:id` - Get customer by ID
- `POST /api/customers` - Create customer
- `PUT /api/customers/:id` - Update customer
- `DELETE /api/customers/:id` - Delete customer
- `GET /api/customers/:id/logs` - Get customer logs
- `GET /api/customers/:id/complaints` - Get customer complaints

### Logs

- `GET /api/logs` - List all logs
- `GET /api/logs/:id` - Get log by ID
- `POST /api/logs` - Create log
- `PUT /api/logs/:id` - Update log
- `DELETE /api/logs/:id` - Delete log

### Health Check

- `GET /api/health` - Check API health

## Authentication

All endpoints (except auth endpoints) require a Bearer token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

## Data Models

### Customer

- id, name, email, phone, company, address
- type (customer/prospect/vendor)
- status (active/inactive/archived)
- created_at, updated_at, tenant_id

### Log

- id, type (call/email/meeting/note/sample/task/other)
- customer_id, title, description, content
- log_date, duration, participants
- attachments, priority, status

### Complaint

- id, customer_id, subject, description
- type, status (new/acknowledged/in_progress/resolved/closed)
- priority, assigned_to
- sla_deadline, resolution

## Development

### Running Tests

```bash
pytest
```

### Code Style

Follow PEP 8 style guide.
