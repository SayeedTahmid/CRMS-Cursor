# Telegram Notifications Debugging Guide

## Quick Diagnostic Steps

### 1. Check if Bot is Configured

```bash
GET /api/telegram/config
Authorization: Bearer <token>
```

**Expected Response:**
```json
{
  "configured": true,
  "notification_chat_ids": ["123456789"],
  "webhook_url": "...",
  "updated_at": "...",
  "updated_by": "..."
}
```

**If `configured: false` or `notification_chat_ids` is empty:**
- Configure the bot first: `POST /api/telegram/config` with `bot_token` and `notification_chat_ids`

### 2. Test Notification Manually

```bash
POST /api/telegram/test-notification
Authorization: Bearer <token>
Content-Type: application/json

{
  "chat_id": "123456789"  // Optional, uses tenant defaults if not provided
}
```

This will send a test notification and show detailed logs.

### 3. Check Server Logs

When you create a complaint/customer or change status, look for these log messages:

```
[Telegram Notification] notify_complaint_created called: tenant=..., complaint=...
[Telegram Notification] Starting notification for tenant: ...
[Telegram Notification] Bot is configured for tenant: ...
[Telegram Notification] Retrieved chat IDs from config: [...]
[Telegram Notification] Sending to X chat ID(s): [...]
[Telegram Notification] Successfully sent to chat_id: ...
```

### 4. Common Issues

#### Issue: "Bot not configured"
**Solution:** Configure bot via `POST /api/telegram/config`

#### Issue: "No chat IDs configured"
**Solution:** Set `notification_chat_ids` when configuring bot:
```json
{
  "bot_token": "123456:ABC-DEF...",
  "notification_chat_ids": ["123456789"]
}
```

#### Issue: "Error sending to chat_id"
**Possible causes:**
- Invalid chat ID
- Bot hasn't been started by user (user needs to send `/start` to bot first)
- Bot is blocked by user

**Solution:**
1. Verify chat ID is correct
2. Start a chat with the bot and send `/start`
3. Check if bot is blocked

#### Issue: Notifications not being called
**Check:**
- Server logs should show `[Telegram Notification] notify_* called`
- If not showing, the notification function isn't being invoked
- Check if there are import errors

### 5. Verify Configuration in Firestore

Check the `telegram_bots` collection:
- Document ID should be your `tenant_id`
- Should have `bot_token` field
- Should have `notification_chat_ids` field (array of strings/numbers)

### 6. Get Your Chat ID

1. Start chat with your bot
2. Send any message
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find `message.chat.id` in the response

### 7. Enable Detailed Logging

All notification functions now log detailed information. Check your server console/logs for:
- `[Telegram Notification]` prefixed messages
- Error tracebacks
- Success confirmations

## Testing Checklist

- [ ] Bot is configured (`GET /api/telegram/config` returns `configured: true`)
- [ ] `notification_chat_ids` is set and not empty
- [ ] Test notification works (`POST /api/telegram/test-notification`)
- [ ] Server logs show notification attempts
- [ ] Chat ID is correct and user has started bot
- [ ] Bot token is valid (check via `GET /api/telegram/status`)

## Next Steps

If notifications still don't work after checking all above:
1. Share server logs showing `[Telegram Notification]` messages
2. Share response from `GET /api/telegram/config`
3. Share response from `POST /api/telegram/test-notification`

