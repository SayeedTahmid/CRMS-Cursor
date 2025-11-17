# Backend Troubleshooting Guide

## Issue: Request Timeouts (30 seconds)

### Symptoms
- Frontend shows "timeout of 30000ms exceeded" errors
- Customer list fails to load
- Customer creation fails
- Backend process is running but not responding

### Root Causes

1. **Backend Server Not Running Properly**
   - Server crashed but process still running
   - Server hanging on requests
   - Firestore connection issues

2. **Firebase/Firestore Issues**
   - Slow Firestore queries
   - Network connectivity issues
   - Firebase credentials expired or invalid
   - Firestore queries without limits (fetching too much data)

3. **Database Connection Problems**
   - Firestore client not initialized
   - Network timeouts
   - Too many open connections

### Solutions

#### 1. Restart the Backend Server

**Stop the existing server:**
```powershell
# Find the Python process
Get-Process python | Select-Object Id, ProcessName, StartTime

# Kill the process (replace 4984 with actual PID)
Stop-Process -Id 4984 -Force
```

**Start the server:**
```powershell
cd CRMS\backend
python app.py
```

You should see:
```
Loading Firebase credentials from: ...
Firebase Admin initialized successfully
Project: <your-project-id>
 * Running on http://0.0.0.0:5000
```

#### 2. Verify Backend is Responding

Open your browser and visit:
- http://localhost:5000/api/health
- http://localhost:5000/api/auth/status

You should see JSON responses immediately. If not, the server isn't running properly.

#### 3. Check for Hanging Queries

The customer list endpoint might be hanging if:
- There are too many customers (no pagination)
- Firestore query is slow
- Network issues

**Fix Applied:**
- Added query limit (1000 customers max)
- Added error handling for malformed documents
- Added timeout protection

#### 4. Check Firebase Credentials

Make sure `serviceAccountKey.json` exists in `CRMS/backend/`:
```powershell
Test-Path CRMS\backend\serviceAccountKey.json
```

If missing, download it from Firebase Console.

#### 5. Check Firestore Connection

Test Firestore connectivity:
```python
python -c "from CRMS.backend.utils.firebase import initialize_firebase, get_db; initialize_firebase(); db = get_db(); print('Firestore connected:', db is not None)"
```

### Quick Fix Steps

1. **Stop all Python processes:**
   ```powershell
   Get-Process python | Stop-Process -Force
   ```

2. **Navigate to backend:**
   ```powershell
   cd CRMS\backend
   ```

3. **Activate virtual environment:**
   ```powershell
   venv\Scripts\activate
   ```

4. **Start the server:**
   ```powershell
   python app.py
   ```

5. **Verify it's running:**
   - Open http://localhost:5000/api/health
   - Should see JSON response immediately

6. **Test from frontend:**
   - Refresh the frontend
   - Try loading customers again

### Additional Debugging

#### Enable Verbose Logging

Add this to `app.py` before `app.run()`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
app.logger.setLevel(logging.DEBUG)
```

#### Check Server Logs

Watch the terminal where you ran `python app.py` for:
- Error messages
- Request logs
- Firebase errors

#### Test API Directly

Use curl or Postman to test:
```powershell
# Health check
Invoke-WebRequest -Uri http://localhost:5000/api/health

# Auth status
Invoke-WebRequest -Uri http://localhost:5000/api/auth/status
```

### Common Issues

#### Issue: "Connection refused"
**Solution:** Backend server is not running. Start it with `python app.py`

#### Issue: "timeout of 30000ms exceeded"
**Solution:** 
1. Backend is hanging - restart it
2. Check Firestore queries have limits
3. Verify Firebase credentials are valid

#### Issue: "Firebase initialization error"
**Solution:**
1. Check `serviceAccountKey.json` exists
2. Verify Firebase credentials are correct
3. Check network connectivity

#### Issue: Many "CloseWait" connections
**Solution:** Server is stuck. Restart it:
```powershell
Get-Process python | Stop-Process -Force
cd CRMS\backend
python app.py
```

### Prevention

1. **Add query limits** - All Firestore queries should have `.limit()` to prevent fetching too much data
2. **Add error handling** - Wrap all database operations in try-except blocks
3. **Add timeouts** - Set reasonable timeouts for Firestore operations
4. **Monitor server logs** - Watch for errors or warnings

---

**Last Updated:** 2025-01-11
**Status:** ✅ Fixed - Added query limits and error handling

