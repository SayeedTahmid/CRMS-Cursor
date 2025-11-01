import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signIn } from '../services/auth';
//import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
 // const { logout } = useAuth();

  // Clear any existing session on login page
  /*React.useEffect(() => {
    logout();
   }, [logout]);
 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await signIn(email, password);
      console.log("Login successful:",userData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-text-primary">
            Welcome Next Gen CRM System
          </h2>
          <p className="mt-2 text-center text-sm text-text-secondary">
            Please sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-border rounded-md placeholder-gray-400 text-text-primary focus:outline-none focus:ring-primary-purple focus:border-primary-purple"
                placeholder="Enter your email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none relative block w-full px-3 py-2 border border-border rounded-md placeholder-gray-400 text-text-primary focus:outline-none focus:ring-primary-purple focus:border-primary-purple"
                placeholder="Enter your password"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-900/20 p-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-purple hover:bg-secondary-purple focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-purple disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-text-secondary">Don't have an account? </span>
            <Link to="/register" className="font-medium text-primary-purple hover:text-secondary-purple">
              Register here
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;


