# CRM Frontend

React TypeScript frontend for the Modern CRM System.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env` and configure with your Firebase credentials:

```bash
cp .env.example .env
```

Update the values in `.env` with your Firebase project configuration.

### 3. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth, etc.)
├── hooks/          # Custom React hooks
├── pages/          # Page components
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Dashboard.tsx
│   ├── Customers.tsx
│   └── CustomerDetail.tsx
├── services/       # API and external services
│   ├── api.ts
│   ├── auth.ts
│   ├── firebase.ts
│   └── customers.ts
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
├── App.tsx         # Main app component
├── main.tsx        # Entry point
└── index.css       # Global styles
```

## Features

- 🔐 Firebase Authentication (email/password)
- 👥 Customer Management (CRUD)
- 📊 Dashboard with statistics
- 📝 Activity logging
- 🎨 Modern dark theme UI
- 📱 Responsive design

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Firebase Auth
- React Router
- Axios

## Authentication Flow

1. User signs in/registers via Firebase Auth
2. ID token is sent to backend for verification
3. User data is stored in local storage
4. Token is included in API requests via axios interceptor

## API Integration

All API calls are made through services in `src/services/`:

- `api.ts` - Axios instance with interceptors
- `auth.ts` - Authentication functions
- `customers.ts` - Customer CRUD operations
- `firebase.ts` - Firebase initialization

## Styling

Uses TailwindCSS with custom theme:

- **Colors**: Purple accent (#6C63FF), dark backgrounds
- **Typography**: Inter font family
- **Components**: Custom styled components

## Development

### Linting

```bash
npm run lint
```

### Adding New Pages

1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. Create service methods if needed
4. Add types in `src/types/`
