# 🔧 How to Start the Backend Server

## Quick Start

1. **Navigate to the backend directory:**
   ```bash
   cd CRMS/backend
   ```

2. **Activate virtual environment (if you have one):**
   ```bash
   # Windows
   venv\Scripts\activate
   
   # Mac/Linux
   source venv/bin/activate
   ```

3. **Install dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the server:**
   ```bash
   python app.py
   ```

You should see:
```
✅ Firebase Admin initialized successfully
📍 Project: <your-project-id>
 * Running on http://0.0.0.0:5000
```

## Verify Backend is Running

Open your browser and visit:
- http://localhost:5000/api/health
- http://localhost:5000/api/auth/status

You should see JSON responses if the backend is working.

## Common Issues

### Backend won't start
- Check if port 5000 is already in use
- Make sure `serviceAccountKey.json` exists in `CRMS/backend/`
- Check Firebase credentials are correct

### Still getting timeouts after starting
- Make sure the backend is running on port 5000
- Check your firewall isn't blocking connections
- Verify CORS settings in `app.py` match your frontend URL

## Troubleshooting

If you see Firebase errors:
1. Make sure `serviceAccountKey.json` is in `CRMS/backend/`
2. Or set environment variables: `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`

If port 5000 is busy:
- Change the port in `app.py` line 117: `port = int(os.getenv('PORT', 5000))`
- Update `VITE_API_BASE_URL` in frontend `.env` to match

