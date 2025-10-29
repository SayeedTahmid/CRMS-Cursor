# Getting Started with Modern CRM System

This guide will help you get the CRM system up and running locally.

## Prerequisites

Before you begin, make sure you have:

- **Python 3.9 or higher** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download Node.js](https://nodejs.org/)
- **Firebase Account** - [Sign up for Firebase](https://firebase.google.com/)
- **Git** (optional) - For version control

## Step 1: Firebase Setup

Follow the instructions in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) to:

1. Create a Firebase project
2. Enable Firestore Database
3. Enable Authentication
4. Get your Firebase configuration
5. Download the service account key

**Important:** Complete this step before running the application!

## Step 2: Backend Setup

### 1. Navigate to Backend Directory

```bash
cd CRMS/backend
```

### 2. Create Virtual Environment

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
```

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Add Service Account Key

Place your downloaded Firebase service account key in the backend directory:

```
CRMS/backend/serviceAccountKey.json
```

### 5. Configure Environment (Optional)

Create a `.env` file in the backend directory:

```bash
# Copy example
# cp .env.example .env

# Or create manually
```

### 6. Run Backend Server

```bash
python app.py
```

You should see:
```
✅ Firebase Admin initialized successfully
📍 Project: next-gen-crm-system
 * Running on http://127.0.0.1:5000
```

## Step 3: Frontend Setup

### 1. Navigate to Frontend Directory

Open a new terminal:

```bash
cd CRMS/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the frontend directory:

```env
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=next-gen-crm-system.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=next-gen-crm-system
VITE_FIREBASE_STORAGE_BUCKET=next-gen-crm-system.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=630199087821
VITE_FIREBASE_APP_ID=your-app-id-here
VITE_API_URL=http://localhost:5000/api
```

Replace the placeholder values with your actual Firebase configuration.

### 4. Run Frontend Development Server

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

## Step 4: Access the Application

1. Open your browser and go to: `http://localhost:5173`
2. You should see the login page
3. Click "Register here" to create a new account
4. Fill in the registration form
5. You'll be redirected to the dashboard

## Step 5: Test the Application

### Create Your First Customer

1. From the dashboard, click "Manage Customers"
2. Click "Add Customer"
3. Fill in the customer information
4. Save and view your customer

### Available Features

- ✅ **Authentication** - Register, login, logout
- ✅ **Customer List** - View all customers
- ✅ **Customer Detail** - View individual customer information
- ✅ **Search** - Search customers by name, email, or phone
- ✅ **Dashboard** - Overview of your CRM data

## Troubleshooting

### Backend Issues

**Firebase credentials not found**
- Ensure `serviceAccountKey.json` is in `CRMS/backend/` directory
- Check that the file name is exactly `serviceAccountKey.json`

**Connection errors**
- Verify Firestore is enabled in Firebase Console
- Check your internet connection
- Ensure Firestore rules are published

**Port 5000 already in use**
- Change the port in `app.py` or kill the process using port 5000

### Frontend Issues

**Blank page after npm run dev**
- Check browser console for errors
- Verify all environment variables are set
- Ensure the backend is running

**Authentication errors**
- Verify Firebase configuration in `.env`
- Check that Email/Password authentication is enabled in Firebase Console
- Ensure Firestore security rules allow authenticated access

**API connection errors**
- Ensure backend is running on port 5000
- Check CORS settings in `app.py`
- Verify `VITE_API_URL` in frontend `.env`

### Common Solutions

**Clear npm cache:**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**Clear pip cache:**
```bash
pip cache purge
pip install --upgrade pip
pip install -r requirements.txt
```

**Reset virtual environment:**
```bash
# Deactivate current environment
deactivate

# Remove venv
rm -rf venv

# Recreate venv
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Next Steps

Now that the application is running:

1. **Add more customers** - Populate your CRM with real data
2. **Explore the dashboard** - Get familiar with the interface
3. **Try searching** - Test the search functionality
4. **Review the code** - Explore the project structure

## Development

### Making Changes

- **Backend changes** - Restart the Flask server to see changes
- **Frontend changes** - Changes are automatically reloaded by Vite
- **Model changes** - May require database migrations (manual for now)

### Adding Features

See [BUILD_PROGRESS.md](./BUILD_PROGRESS.md) for what's implemented and what's next.

## Support

If you encounter issues:

1. Check the [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) guide
2. Review the [BUILD_PROGRESS.md](./BUILD_PROGRESS.md) status
3. Check console/terminal for error messages
4. Verify all configuration files are correct

## Configuration Files

Make sure these files exist and are configured:

**Backend:**
- `serviceAccountKey.json` - Firebase Admin SDK credentials
- `.env` (optional) - Environment variables

**Frontend:**
- `.env` - Firebase and API configuration

Both `.env` files are in `.gitignore` for security.

## Success Checklist

- [ ] Firebase project created
- [ ] Service account key downloaded
- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] Can access login page
- [ ] Can register new user
- [ ] Can login
- [ ] Can view dashboard
- [ ] Can access customers page

## 🎉 You're Ready!

Your CRM system is now running. Start managing your customers!

For more information, see:
- [README.md](./README.md) - Project overview
- [BUILD_PROGRESS.md](./BUILD_PROGRESS.md) - Current status
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Firebase configuration


