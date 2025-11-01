# Firebase Setup Guide for "next gen crm system"

## ✅ What You Have Done
- Created Firebase project: **next gen crm system**
- Region: **Asia South 1 (Mumbai)** - Recommended for Bangladesh

## 📋 Complete Setup Steps

### Step 1: Enable Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select **"next gen crm system"** project
3. Click **"Build"** → **"Firestore Database"**
4. Click **"Create database"**
5. Choose **"Production mode"** (we'll update rules later)
6. **Select location**: **asia-south1 (Mumbai)** ✅
7. Click **"Enable"**

### Step 2: Enable Authentication

1. Click **"Build"** → **"Authentication"**
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Click on **"Email/Password"**
5. Toggle **"Enable"** to ON
6. Click **"Save"**

### Step 3: Get Frontend Configuration

1. Click **⚙️ Settings** (gear icon) → **"Project settings"**
2. Scroll down to **"Your apps"** section
3. Click **"Web"** icon (</>)
4. Register your app:
   - App nickname: `CRM Web App`
5. Copy the Firebase configuration object
6. You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "next-gen-crm-system.firebaseapp.com",
  projectId: "next-gen-crm-system",
  storageBucket: "next-gen-crm-system.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdefg"
};
```

### Step 4: Create Frontend Environment File

Create `CRMS/frontend/.env` with the values:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=next-gen-crm-system.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=next-gen-crm-system
VITE_FIREBASE_STORAGE_BUCKET=next-gen-crm-system.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_API_URL=http://localhost:5000
```

**⚠️ Replace the placeholder values with your actual Firebase config values from Step 3**

### Step 5: Get Backend Service Account Key

1. In Firebase Console, go to **⚙️ Settings** → **"Project settings"**
2. Click **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** in the popup
5. **A JSON file will download** - this contains your admin credentials
6. **Rename the file** to `serviceAccountKey.json`
7. **Move it** to `CRMS/backend/serviceAccountKey.json`

### Step 6: Set Firestore Security Rules

1. In Firebase Console, go to **"Firestore Database"**
2. Click **"Rules"** tab
3. Replace with this **development rule**:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. Click **"Publish"**

⚠️ **Note**: This is a basic rule for development. You'll need stricter rules for production with proper RBAC.

### Step 7: Install Backend Dependencies

```bash
cd CRMS/backend
pip install firebase-admin
```

### Step 8: Test the Setup

```bash
cd CRMS/backend
python app.py
```

You should see:
```
📁 Loading Firebase credentials from: ...
✅ Firebase Admin initialized successfully
📍 Project: next-gen-crm-system
```

Visit `http://localhost:5000/api/health` to verify:
```json
{
  "status": "healthy",
  "database": "connected",
  "auth": "configured",
  "firebase_region": "asia-south1",
  "location_recommendation": "Asia South 1 (Mumbai) - Closest to Bangladesh"
}
```

## 🎯 Next Steps

1. **Test backend**: Run `python CRMS/backend/app.py`
2. **Test frontend**: Run `npm run dev` in `CRMS/frontend`
3. **Create first user** via Authentication in Firebase Console
4. **Start building** Phase 1 features

## 📁 File Structure After Setup

```
CRMS/
├── backend/
│   ├── serviceAccountKey.json  ← Add this file
│   ├── .env                    ← Optional (for env vars)
│   └── utils/
│       └── firebase.py         ← Already created ✅
├── frontend/
│   └── .env                    ← Create this file
└── FIREBASE_SETUP.md          ← This file
```

## 🔒 Security Notes

1. **Never commit** `serviceAccountKey.json` to Git (already in `.gitignore`)
2. **Never commit** `.env` files
3. Use **proper Firestore rules** in production
4. Implement **RBAC** (Role-Based Access Control) in Phase 1

## ❓ Troubleshooting

### Error: "Firebase credentials not found"
- Make sure `serviceAccountKey.json` is in `CRMS/backend/` folder
- Check file name is exactly: `serviceAccountKey.json`

### Error: "Failed to initialize Firebase"
- Verify Firestore is enabled in Firebase Console
- Check you selected the correct region
- Verify service account key is valid

### Database connection fails
- Check Firestore security rules are published
- Verify authentication is enabled
- Check network/firewall settings

---

**Your Firebase project is ready!** 🎉
Start implementing Phase 1 features!

