# Resend Email Integration

This document describes the Resend email integration for sending transactional emails from the CRM.

## Overview

The Resend integration allows the CRM to send transactional emails (notifications, confirmations, etc.) via Resend's API. All emails are sent from a single configured address (e.g., `no-reply@mycrm.com`).

**Features:**
- Send HTML and/or plain text emails
- Support for multiple recipients (to, cc, bcc)
- Attachment support
- Email tagging for tracking
- RBAC-protected endpoints
- Tenant isolation ready

## Setup

### 1. Get Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** in your dashboard
3. Create a new API key
4. Copy the API key (starts with `re_...`)

### 2. Verify Domain (Optional but Recommended)

1. In Resend dashboard, go to **Domains**
2. Add your domain (e.g., `mycrm.com`)
3. Add the required DNS records
4. Wait for verification

### 3. Set Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=no-reply@mycrm.com
```

**Note:** If you haven't verified a domain, you can use Resend's test domain: `onboarding@resend.dev` (for testing only)

### 4. Restart Backend Server

After setting environment variables, restart your backend:

```bash
cd CRMS/backend
python app.py
```

## API Endpoints

### Send Email

```bash
POST /api/email/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "html": "<h1>HTML content</h1>",
  "text": "Plain text content",
  "from": "custom@example.com",  // Optional
  "reply_to": "reply@example.com",  // Optional
  "cc": ["cc@example.com"],  // Optional
  "bcc": ["bcc@example.com"],  // Optional
  "tags": [{"name": "category", "value": "notification"}]  // Optional
}
```

**Required Permission:** `email:create`

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "email_id": "abc123",
  "result": {
    "id": "abc123"
  }
}
```

### Get Email Status

```bash
GET /api/email/status
Authorization: Bearer <token>
```

**Required Permission:** `email:read`

**Response:**
```json
{
  "configured": true,
  "from_email": "no-reply@mycrm.com",
  "message": "Resend is configured and ready"
}
```

## Frontend Usage

### TypeScript Service

```typescript
import { sendEmail, getEmailStatus } from '@/services/email';

// Send an email
const response = await sendEmail({
  to: 'customer@example.com',
  subject: 'Complaint Update',
  html: '<h1>Your complaint has been updated</h1>',
  text: 'Your complaint has been updated'
});

// Check email service status
const status = await getEmailStatus();
```

## RBAC Permissions

| Role | Create | Read |
|------|--------|------|
| SUPER_ADMIN | ✅ | ✅ |
| TENANT_ADMIN | ✅ | ✅ |
| MANAGER | ✅ | ✅ |
| SALES_REP | ✅ | ✅ |
| SUPPORT | ✅ | ✅ |
| VIEWER | ❌ | ✅ |

## Email Service Methods

### Basic Email

```python
from services.email_service import get_email_service

email_service = get_email_service()
result = email_service.send_email(
    to="customer@example.com",
    subject="Welcome",
    html="<h1>Welcome to our CRM!</h1>",
    text="Welcome to our CRM!"
)
```

### Email with Multiple Recipients

```python
email_service.send_email(
    to=["customer1@example.com", "customer2@example.com"],
    subject="Notification",
    html="<p>Message</p>",
    cc=["manager@example.com"],
    bcc=["archive@example.com"]
)
```

### Transactional Email with Tags

```python
email_service.send_transactional_email(
    to="customer@example.com",
    subject="Order Confirmation",
    template_name="order_confirmation",
    html="<h1>Your order is confirmed</h1>",
    tags=[{"name": "type", "value": "order"}]
)
```

## Integration Examples

### Send Email on Complaint Creation

```python
# In complaints.py after creating complaint
try:
    from services.email_service import get_email_service
    email_service = get_email_service()
    
    if email_service.is_configured():
        # Get customer email
        customer_doc = db.collection("customers").document(customer_id).get()
        customer_email = customer_doc.to_dict().get("email")
        
        if customer_email:
            email_service.send_email(
                to=customer_email,
                subject=f"Complaint Created: {ticket_number}",
                html=f"<h2>Your complaint has been created</h2><p>Ticket: {ticket_number}</p>",
                tags=[{"name": "type", "value": "complaint_created"}]
            )
except Exception as e:
    print(f"Warning: Failed to send email: {e}")
```

## Error Handling

- All email operations are non-blocking (failures don't break main operations)
- Errors are logged for debugging
- Invalid configuration returns clear error messages
- Missing required fields return 400 errors

## Security

- ✅ **RBAC**: All endpoints require appropriate permissions
- ✅ **No hardcoded secrets**: All credentials from environment variables
- ✅ **Tenant isolation ready**: Service can be extended for per-tenant email configs
- ✅ **Input validation**: All required fields are validated

## Resend API Limits

- **Free tier**: 3,000 emails/month
- **Pro tier**: 50,000+ emails/month
- Rate limits apply (check Resend dashboard)

## Troubleshooting

### "Resend not configured"
- Check `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set
- Restart backend server after updating `.env`

### "Invalid API key"
- Verify API key is correct (starts with `re_`)
- Check API key hasn't been revoked in Resend dashboard

### "Domain not verified"
- If using custom domain, verify it in Resend dashboard
- For testing, use `onboarding@resend.dev`

### Emails not sending
- Check Resend dashboard for delivery status
- Verify recipient email addresses are valid
- Check spam folder
- Review server logs for error messages

## Future Enhancements

- Email templates stored in database
- Per-tenant email configuration
- Email queue for bulk sending
- Email delivery tracking
- Email history/logs
- Automatic email sending on events (complaint updates, etc.)

