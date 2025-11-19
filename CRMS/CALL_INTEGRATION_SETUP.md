# Call Integration Setup Guide

This guide explains how to set up Twilio VoIP integration for the CRM system.

## Overview

The call integration allows users to:
- Make outbound calls directly from the CRM
- Receive inbound calls (with proper Twilio configuration)
- Automatically log all calls as activity logs
- View call history with duration, status, and outcomes
- Link calls to customer records

## Prerequisites

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Twilio Phone Number**: Purchase a phone number from Twilio
3. **Python Twilio SDK**: Already added to `requirements.txt`

## Setup Steps

### 1. Install Twilio SDK

```bash
cd CRMS/backend
pip install twilio
```

### 2. Get Twilio Credentials

From your Twilio Console Dashboard:
- **Account SID**: Found in the dashboard
- **Auth Token**: Found in the dashboard (keep this secret!)
- **Phone Number**: Your Twilio phone number (e.g., +1234567890)

### 3. Create TwiML App (Optional, for advanced features)

1. Go to Twilio Console → TwiML → TwiML Apps
2. Create a new TwiML App
3. Note the **Application SID**

### 4. Set Environment Variables

Add these to your `.env` file in the `backend` directory:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_API_KEY=SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret_here
TWILIO_APP_SID=APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Optional, for TwiML App

# Base URL for webhooks (use ngrok or similar for local development)
BASE_URL=https://your-domain.com
```

### 5. Generate API Key and Secret (for access tokens)

1. Go to Twilio Console → Account → API Keys & Tokens
2. Create a new API Key
3. Save the **API Key SID** and **API Secret** (only shown once!)

### 6. Configure Webhooks (for production)

For local development, use [ngrok](https://ngrok.com) to expose your backend:

```bash
ngrok http 5000
```

Update `BASE_URL` in `.env` with the ngrok URL.

For production, set `BASE_URL` to your production domain.

## API Endpoints

### Generate Call Token
```
POST /api/calls/token
Authorization: Bearer <token>
```
Returns a Twilio access token for making calls via WebRTC.

### Initiate Call
```
POST /api/calls/initiate
Authorization: Bearer <token>
Content-Type: application/json

{
  "to": "+1234567890",
  "customer_id": "customer123",  // Optional
  "from": "+0987654321"  // Optional, defaults to TWILIO_PHONE_NUMBER
}
```

### Get Call History
```
GET /api/calls/history?customer_id=xxx&direction=outbound
Authorization: Bearer <token>
```

### Webhooks (called by Twilio)

- `/api/calls/webhook` - TwiML instructions during call
- `/api/calls/status` - Status updates (ringing, answered, completed, etc.)

## Frontend Integration

### Using the Call Dialer

The `CallDialer` component is already integrated into:
- Customer Detail page (call button next to phone number)
- Can be used standalone anywhere in the app

### Example Usage

```tsx
import CallDialer from '../components/CallDialer';

<CallDialer
  customerId="customer123"
  customerPhone="+1234567890"
  customerName="John Doe"
  onCallEnd={(logId) => {
    console.log('Call ended, log ID:', logId);
  }}
  onClose={() => setShowDialer(false)}
/>
```

## Features

### Automatic Call Logging

When a call is initiated:
1. A log entry is created immediately with status "pending"
2. When the call completes, the log is updated with:
   - Call duration
   - Call outcome (answered, busy, no-answer, failed)
   - Final status (completed, cancelled)
   - Direction (inbound/outbound)

### Call History

View all calls at `/calls`:
- Filter by direction (inbound/outbound)
- See call duration, status, and outcome
- Link to customer records
- View call timestamps

## Testing

### Test Call Flow

1. Navigate to a customer detail page
2. Click the "Call" button next to the phone number
3. The call dialer opens with the customer's phone pre-filled
4. Click "Call" to initiate
5. The call is logged automatically
6. View the call in the activity timeline

### Test Webhooks Locally

1. Use ngrok to expose your backend:
   ```bash
   ngrok http 5000
   ```
2. Update `BASE_URL` in `.env` with the ngrok URL
3. Restart the backend server
4. Make a test call
5. Check backend logs for webhook calls

## Troubleshooting

### "Twilio not configured" error
- Check that all environment variables are set
- Restart the backend server after setting env vars

### "Twilio SDK not installed" error
- Run: `pip install twilio`

### Calls not connecting
- Verify your Twilio phone number is active
- Check that webhook URLs are accessible (use ngrok for local)
- Verify phone number format (must include country code, e.g., +1)

### Call logs not updating
- Check webhook endpoint is accessible
- Verify `BASE_URL` is correct in `.env`
- Check backend logs for webhook errors

## Security Notes

- **Never commit** `.env` file with real credentials
- Use environment variables or secure secret management
- Rotate API keys regularly
- Use HTTPS in production for webhooks

## Cost Considerations

Twilio charges per minute for calls:
- Outbound calls: ~$0.013 per minute (varies by country)
- Inbound calls: ~$0.0085 per minute
- Phone number: ~$1/month

Monitor usage in Twilio Console to avoid unexpected charges.

## Next Steps

- [ ] Set up call recording (requires Twilio Recording API)
- [ ] Add call transcription (requires Twilio Speech Recognition)
- [ ] Implement WebRTC for browser-based calling (requires Twilio Voice SDK in frontend)
- [ ] Add call queuing for support teams
- [ ] Integrate with customer satisfaction surveys

## Support

- Twilio Documentation: https://www.twilio.com/docs
- Twilio Support: https://support.twilio.com
- Twilio Voice SDK: https://www.twilio.com/docs/voice/javascript

