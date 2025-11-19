# Jitsi WebRTC Integration Guide

This guide explains the Jitsi Meet integration for browser-based video/audio calls in the CRM system.

## Overview

Jitsi Meet provides **free, browser-based video/audio calling** using WebRTC technology. Unlike phone calls (Twilio), Jitsi calls:
- ✅ **No per-minute costs** - Completely free
- ✅ **Video + Audio** - Full video conferencing
- ✅ **Multiple participants** - Team calls, demos, meetings
- ✅ **No phone numbers needed** - Works entirely in browser
- ✅ **Easy sharing** - Just share the room link

## Features

### What Users See

1. **Customer Detail Page**
   - "Start Call" button (green/purple button)
   - Opens embedded Jitsi room in fullscreen overlay

2. **Jitsi Interface**
   - Full video/audio controls
   - Screen sharing
   - Chat
   - Recording (if enabled)
   - Participant management

3. **Automatic Logging**
   - Call start time logged automatically
   - Call end time logged automatically
   - Participants tracked
   - Duration calculated
   - Linked to customer record

## How It Works

### 1. User Clicks "Start Call"

```typescript
// Generates unique room name
const roomName = generateRoomName(customerId, customerName);
// Example: "customer123-john-doe-1703123456789-abc123"
```

### 2. Jitsi Room Opens

- Loads Jitsi Meet external API
- Creates embedded iframe
- Connects to `meet.jit.si` (or self-hosted server)
- User can invite others via room link

### 3. Call Logging

**On Start:**
- Creates log entry with status "in-progress"
- Records `call_started_at` timestamp
- Stores `room_name` and `customer_id`
- Initial participant list (caller)

**On End:**
- Updates log entry with status "completed"
- Records `call_ended_at` timestamp
- Calculates `duration` (in minutes)
- Updates `participants` list
- Sets `call_outcome` to "completed"

## API Endpoints

### Start Call Logging
```
POST /api/calls/jitsi/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "room_name": "crm-customer-1234567890-abc123",
  "customer_id": "customer123",
  "customer_name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "logId": "log_abc123",
  "room_name": "crm-customer-1234567890-abc123"
}
```

### End Call Logging
```
POST /api/calls/jitsi/end
Authorization: Bearer <token>
Content-Type: application/json

{
  "log_id": "log_abc123",  // Optional
  "room_name": "crm-customer-1234567890-abc123",
  "customer_id": "customer123",
  "duration": 300,  // seconds
  "participants": ["user1", "user2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Call ended and logged"
}
```

## Log Data Structure

Jitsi calls are stored as log entries with these fields:

```typescript
{
  type: 'call',
  call_type: 'jitsi',
  customer_id: 'customer123',
  title: 'Video call with John Doe',
  description: 'Jitsi video call - Room: crm-customer-1234567890-abc123',
  direction: 'outbound',
  status: 'completed',
  duration: 5,  // minutes
  participants: ['user1', 'user2'],
  room_name: 'crm-customer-1234567890-abc123',
  call_started_at: Timestamp,
  call_ended_at: Timestamp,
  call_outcome: 'completed',
  log_date: Timestamp,
  created_at: Timestamp,
  updated_at: Timestamp,
  created_by: 'user_id',
  tenant_id: 'default'
}
```

## Configuration

### Using Public Jitsi (Default)

The component uses `meet.jit.si` by default - no configuration needed!

```typescript
const domain = 'meet.jit.si'; // Public Jitsi server
```

### Self-Hosted Jitsi (Optional)

For production or privacy, you can self-host Jitsi:

1. **Install Jitsi Meet Server**
   - Follow: https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart
   - Or use Docker: https://github.com/jitsi/docker-jitsi-meet

2. **Update Component**
   ```typescript
   const domain = 'meet.yourdomain.com'; // Your self-hosted domain
   ```

3. **Configure SSL**
   - Jitsi requires HTTPS for WebRTC
   - Use Let's Encrypt or your SSL certificate

## Room Name Generation

Room names are generated to be:
- **Unique**: Timestamp + random string
- **Readable**: Includes customer ID/name prefix
- **URL-safe**: No special characters

```typescript
generateRoomName(customerId, customerName)
// Returns: "customer123-john-doe-1703123456789-abc123"
```

## Sharing Calls

Users can share the room link with:
- Customers (for demos/meetings)
- Team members (for collaboration)
- External participants

**Room URL Format:**
```
https://meet.jit.si/crm-customer-1234567890-abc123
```

## Features Available

### Video/Audio Controls
- ✅ Mute/unmute microphone
- ✅ Turn camera on/off
- ✅ Screen sharing
- ✅ Chat messaging
- ✅ Raise hand
- ✅ Participant list

### Advanced Features (if enabled)
- Recording (requires Jitsi recording service)
- Live streaming (requires YouTube/Twitch integration)
- Transcription (requires Jitsi transcription service)

## Troubleshooting

### "Jitsi container or API not available"
- Check internet connection
- Verify Jitsi script loads: `https://8x8.vc/external_api.js`
- Check browser console for errors

### Video/Audio not working
- Check browser permissions (camera/microphone)
- Verify HTTPS (required for WebRTC)
- Check firewall/proxy settings

### Call not logging
- Check backend API is accessible
- Verify authentication token
- Check browser console for API errors

### Room not connecting
- Verify room name is valid (no special characters)
- Check Jitsi server is accessible
- Try different browser

## Comparison: Jitsi vs Twilio

| Feature | Jitsi (WebRTC) | Twilio (Phone) |
|---------|---------------|----------------|
| **Cost** | Free | ~$0.01-0.02/min |
| **Video** | ✅ Yes | ❌ No |
| **Audio** | ✅ Yes | ✅ Yes |
| **Participants** | Multiple | 2 (or conference) |
| **Phone Numbers** | Not needed | Required |
| **Browser Only** | ✅ Yes | ❌ No (needs phone) |
| **Recording** | ✅ (if enabled) | ✅ (paid) |
| **Best For** | Demos, team calls | Customer phone calls |

## Security Considerations

### Public Jitsi (meet.jit.si)
- ✅ No account needed
- ⚠️ Room names are guessable (use random names)
- ⚠️ No password by default (add password in component)

### Self-Hosted Jitsi
- ✅ Full control
- ✅ Can require authentication
- ✅ Can set passwords
- ✅ Can restrict domains

### Adding Password Protection

Update `JitsiCall.tsx`:

```typescript
const options = {
  // ... other options
  configOverwrite: {
    // ... other config
    requireDisplayName: true,
    enableWelcomePage: true,
  },
  // Add password
  password: 'your-secure-password',
};
```

## Next Steps

- [ ] Add password protection for sensitive calls
- [ ] Implement call recording
- [ ] Add transcription service
- [ ] Create call scheduling feature
- [ ] Add calendar integration
- [ ] Implement call reminders

## Support

- Jitsi Documentation: https://jitsi.github.io/handbook/
- Jitsi Meet API: https://github.com/jitsi/jitsi-meet/blob/master/doc/api.md
- Jitsi Community: https://community.jitsi.org/

