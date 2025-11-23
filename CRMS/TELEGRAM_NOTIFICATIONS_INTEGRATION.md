# Telegram Notifications Integration

This document describes the automatic Telegram notification system integrated into the CRM.

## Overview

The CRM now automatically sends Telegram notifications for:
- ✅ **Complaint Creation** - When a new complaint is created
- ✅ **Complaint Updates** - When complaint details are updated
- ✅ **Complaint Status Changes** - When complaint status changes
- ✅ **Customer Creation** - When a new customer is created
- ✅ **Customer Updates** - When customer information is updated

All notifications respect **tenant isolation** and only send if Telegram is configured for the tenant.

## How It Works

### 1. Configuration

First, configure your Telegram bot and set notification recipients:

```bash
POST /api/telegram/config
Authorization: Bearer <token>
Content-Type: application/json

{
  "bot_token": "123456:ABC-DEF...",
  "notification_chat_ids": ["123456789", "987654321"]  // Telegram chat IDs to notify
}
```

**Required Permission:** `telegram:update` (TENANT_ADMIN, SUPER_ADMIN)

### 2. Automatic Notifications

Once configured, notifications are sent automatically when:
- A complaint is created
- A complaint is updated (any field)
- A complaint status changes
- A customer is created
- A customer is updated

### 3. Notification Format

#### Complaint Created
```
🔔 New Complaint Created

Complaint: [Title]
Ticket: COMP-XXXX
Customer: [Customer Name]
Priority: [Priority Level]
```

#### Complaint Status Changed
```
🔄 Complaint Status Changed

Complaint: [Title/Ticket]
Status: old_status → new_status
```

#### Complaint Updated
```
📝 Complaint Updated

Complaint: [Title/Ticket]
Changes: [List of changed fields]
```

#### Customer Created
```
👤 New Customer Created

Customer: [Customer Name]
Contact: [Email/Phone]
```

#### Customer Updated
```
📝 Customer Updated

Customer: [Customer Name]
Changes: [List of changed fields]
```

## Configuration

### Setting Notification Recipients

Notification recipients are configured per tenant in the `telegram_bots` collection:

```json
{
  "tenant_id": "tenant123",
  "bot_token": "123456:ABC-DEF...",
  "notification_chat_ids": ["123456789", "987654321"],
  "updated_at": "2025-11-21T...",
  "updated_by": "user123"
}
```

### Getting Chat IDs

To get your Telegram chat ID:

1. Start a chat with your bot
2. Send any message to the bot
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find your chat ID in the response (field: `message.chat.id`)

Or use the `/start` command and check the webhook logs.

## Error Handling

- **Non-blocking**: Notification failures never break the main operation
- **Graceful degradation**: If Telegram is not configured, operations continue normally
- **Error logging**: All notification errors are logged for debugging
- **Multiple recipients**: Notifications are sent to all configured chat IDs

## Security

- ✅ **Tenant isolation**: Each tenant has separate notification settings
- ✅ **RBAC**: Only authorized users can configure notifications
- ✅ **No token exposure**: Bot tokens are never exposed in API responses
- ✅ **Error handling**: Notification errors don't expose sensitive information

## Example Flow

1. User creates a complaint via API
2. Complaint is saved to Firestore
3. System checks if Telegram is configured for tenant
4. If configured, notification is sent to all `notification_chat_ids`
5. API response returns success (even if notification fails)

## Customization

### Adding More Notification Types

To add notifications for other events, use the helper functions in `utils/telegram_notifications.py`:

```python
from utils.telegram_notifications import send_telegram_notification

send_telegram_notification(
    tenant_id=tenant_id,
    chat_ids=["123456789"],  # Optional, uses tenant defaults if not provided
    title="Custom Event",
    message="Something happened",
    action_type="custom",
    action_id="event123"
)
```

### Customizing Message Format

Edit the notification functions in `utils/telegram_notifications.py` to customize message formatting.

## Troubleshooting

### Notifications Not Sending

1. **Check bot configuration**: Verify bot is configured for your tenant
   ```bash
   GET /api/telegram/config
   ```

2. **Check chat IDs**: Ensure `notification_chat_ids` are set correctly
   ```bash
   GET /api/telegram/config
   # Look for "notification_chat_ids" in response
   ```

3. **Check bot status**: Verify bot is working
   ```bash
   GET /api/telegram/status
   ```

4. **Check logs**: Look for notification errors in server logs
   - Errors are logged with "Warning: Failed to send Telegram notification"

### Common Issues

- **"Bot not configured"**: Configure bot token first via `/api/telegram/config`
- **"No chat IDs"**: Set `notification_chat_ids` when configuring bot
- **"Invalid chat ID"**: Verify chat IDs are correct (must be strings or numbers)
- **"Bot token invalid"**: Re-check bot token from @BotFather

## Future Enhancements

- User-level notification preferences
- Notification templates per event type
- Notification channels (groups, channels)
- Notification scheduling
- Notification history/logs
- Rich formatting with buttons and links

