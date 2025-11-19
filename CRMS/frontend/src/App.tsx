// frontend/src/App.tsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import CustomerForm from "./pages/CustomerForm";
import LogForm from "./pages/LogForm";
import LogsPage from "./pages/Logs";
import CallHistory from "./pages/CallHistory";
import Complaints from "./pages/Complaints";
import ComplaintForm from "./pages/ComplaintForm";
import ComplaintDetail from "./pages/ComplaintDetail";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import Reports from "./pages/Reports";

/** ✅ Protected route wrapper */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

/** ✅ Smart root redirect (decides login or dashboard) */
const RootRedirect: React.FC = () => {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-purple"></div>
      </div>
    );
  }

  return <Navigate to={authenticated ? "/dashboard" : "/login"} replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 🔐 Auth routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* 🏠 Protected dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 👥 Customers list */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute>
                <Customers />
              </ProtectedRoute>
            }
          />

          {/* 📝 Add Customer Form (before :id route) */}
          <Route
            path="/customers/new"
            element={
              <ProtectedRoute>
                <CustomerForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customers/edit/:id"
            element={
              <ProtectedRoute>
                <CustomerForm />
              </ProtectedRoute>
            }
          />

          {/* 👤 Single customer details */}
          <Route
            path="/customers/:id"
            element={
              <ProtectedRoute>
                <CustomerDetail />
              </ProtectedRoute>
            }
          />

          {/* 📝 Logs List */}
          <Route
            path="/logs"
            element={
              <ProtectedRoute>
                <LogsPage />
              </ProtectedRoute>
            }
          />

          {/* 📝 Add/Edit Log Form */}
          <Route
            path="/logs/new"
            element={
              <ProtectedRoute>
                <LogForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/logs/edit/:id"
            element={
              <ProtectedRoute>
                <LogForm />
              </ProtectedRoute>
            }
          />

          {/* 📞 Call History */}
          <Route
            path="/calls"
            element={
              <ProtectedRoute>
                <CallHistory />
              </ProtectedRoute>
            }
          />

          {/* 📝 Add Complaint Form (before :id route) */}
          <Route
            path="/complaints/new"
            element={
              <ProtectedRoute>
                <ComplaintForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/edit/:id"
            element={
              <ProtectedRoute>
                <ComplaintForm />
              </ProtectedRoute>
            }
          />

          {/* 📋 Single Complaint Details */}
          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute>
                <ComplaintDetail />
              </ProtectedRoute>
            }
          />

          {/* 📋 Complaints List (must be last) */}
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <Complaints />
              </ProtectedRoute>
            }
          />

          {/* 👤 User Profile */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* ⚙️ Settings */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* 📊 Reports */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />

          {/* 🚀 Smart redirect for "/" */}
          <Route path="/" element={<RootRedirect />} />

          {/* ❌ Fallback for any unknown route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
