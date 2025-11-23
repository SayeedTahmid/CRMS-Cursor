# Telegram Bot Integration

This document describes the Telegram Bot integration for the CRM system.

## Overview

The Telegram Bot integration allows tenants to:
- Configure Telegram bots for notifications
- Send notifications to users via Telegram
- Receive webhook updates from Telegram (for future expansion)

All features respect **tenant isolation** and **RBAC permissions**.

## Features

1. **Bot Configuration** - Set up Telegram bot tokens per tenant
2. **Notifications** - Send formatted notifications to users
3. **Webhook Support** - Receive updates from Telegram (logged for future use)
4. **Status Checking** - Verify bot configuration and get bot info

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` command
3. Follow instructions to create your bot
4. Save the bot token (format: `123456:ABC-DEF...`)

### 2. Configure Bot Token via API

```bash
POST /api/telegram/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "bot_token": "123456:ABC-DEF...",
  "webhook_url": "https://your-domain.com/api/telegram/webhook"  // Optional
}
```

**Required Permission:** `telegram:update` (TENANT_ADMIN, SUPER_ADMIN)

### 3. Get Bot Chat ID

1. Start a chat with your bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your chat ID in the response (field: `chat.id`)

## API Endpoints

### Get Bot Configuration

```bash
GET /api/telegram/config
Authorization: Bearer <token>
```

**Required Permission:** `telegram:read`

**Response:**
```json
{
  "configured": true,
  "webhook_url": "https://...",
  "updated_at": "2025-11-21T...",
  "updated_by": "user123"
}
```

### Set Bot Configuration

```bash
POST /api/telegram/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "bot_token": "123456:ABC-DEF...",
  "webhook_url": "https://your-domain.com/api/telegram/webhook"
}
```

**Required Permission:** `telegram:update`

**Response:**
```json
{
  "success": true,
  "message": "Bot configuration saved successfully",
  "bot_info": {
    "username": "your_bot",
    "first_name": "Your Bot",
    "id": 123456789
  }
}
```

### Delete Bot Configuration

```bash
DELETE /api/telegram/config
Authorization: Bearer <token>
```

**Required Permission:** `telegram:delete`

### Get Bot Status

```bash
GET /api/telegram/status
Authorization: Bearer <token>
```

**Required Permission:** `telegram:read`

**Response:**
```json
{
  "configured": true,
  "bot_info": {
    "id": 123456789,
    "username": "your_bot",
    "first_name": "Your Bot",
    "is_bot": true
  }
}
```

### Send Notification

```bash
POST /api/telegram/send
Authorization: Bearer <token>
Content-Type: application/json

{
  "chat_id": "123456789",
  "title": "New Complaint",
  "message": "A new complaint has been created",
  "action_type": "complaint",
  "action_id": "complaint123"
}
```

**Required Permission:** `telegram:create`

**Response:**
```json
{
  "success": true,
  "message": "Notification sent successfully"
}
```

### Webhook Endpoint

```bash
POST /api/telegram/webhook
X-Telegram-Bot-Api-Secret-Token: <secret_token>
Content-Type: application/json

{
  "update_id": 123456789,
  "message": {
    "chat": {...},
    "text": "...",
    "from": {...}
  }
}
```

**Note:** This endpoint does NOT require authentication. Telegram sends a secret token in the header for verification. The endpoint automatically identifies the tenant based on the secret token.

## RBAC Permissions

| Role | Create | Read | Update | Delete |
|------|--------|------|--------|--------|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ |
| TENANT_ADMIN | ✅ | ✅ | ✅ | ✅ |
| MANAGER | ❌ | ✅ | ❌ | ❌ |
| SALES_REP | ❌ | ✅ | ❌ | ❌ |
| SUPPORT | ❌ | ✅ | ❌ | ❌ |
| VIEWER | ❌ | ✅ | ❌ | ❌ |

## Tenant Isolation

- Each tenant has its own bot configuration stored in `telegram_bots/{tenant_id}`
- Bot tokens are isolated per tenant
- Webhook updates are automatically associated with the correct tenant via secret token
- All API endpoints use `request.user.get('tenant_id')` to ensure isolation

## Data Storage

### Firestore Collections

1. **`telegram_bots`** - Bot configurations per tenant
   - Document ID: `{tenant_id}`
   - Fields: `bot_token`, `webhook_url`, `webhook_secret`, `updated_at`, `updated_by`

2. **`telegram_messages`** - Logged webhook messages (optional)
   - Fields: `tenant_id`, `chat_id`, `user_id`, `username`, `text`, `received_at`

## Security

1. **Bot tokens are never exposed** in API responses (only in Firestore)
2. **Webhook verification** using secret tokens prevents unauthorized access
3. **RBAC permissions** ensure only authorized users can configure bots
4. **Tenant isolation** prevents cross-tenant access

## Usage Example

```python
# In your complaint creation code
from services.telegram_service import get_telegram_service

# Send notification when complaint is created
telegram_service = get_telegram_service(tenant_id)
if telegram_service.is_configured():
    telegram_service.send_notification(
        chat_id="123456789",
        title="New Complaint Created",
        message=f"Complaint #{ticket_number} has been created",
        action_type="complaint",
        action_id=complaint_id
    )
```

## Error Handling

- All endpoints return appropriate HTTP status codes
- Errors are logged for debugging
- Invalid bot tokens are rejected during configuration
- Failed notifications are logged but don't block main operations

## Future Enhancements

- Command handling (e.g., `/start`, `/help`, `/status`)
- Query processing for users to check complaint status
- Automatic chat ID association with user accounts
- Notification preferences per user
- Rich message formatting with buttons

## Notes

- The bot service uses the standard Telegram Bot API (no additional dependencies needed beyond `requests`)
- Webhook URL must be HTTPS (required by Telegram)
- Bot tokens should be kept secure and not exposed in logs or client code

