// frontend/src/components/Navigation.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchBar from './SearchBar';
import { UserCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const Navigation: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-dark-bg-secondary border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <Link to="/dashboard" className="text-2xl font-bold text-text-primary hover:text-primary-purple transition-colors">
            Modern CRM
          </Link>
          
          <div className="flex-1 max-w-lg">
            <SearchBar />
          </div>
          
          <nav className="flex items-center space-x-4">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Dashboard
            </Link>
            <Link
              to="/customers"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Customers
            </Link>
            <Link
              to="/complaints"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Complaints
            </Link>
            <Link
              to="/reports"
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Reports
            </Link>
            
            <div className="flex items-center space-x-2 ml-4">
              <span className="text-text-secondary text-sm">
                {user?.displayName || user?.display_name || user?.email}
              </span>
              
              <div className="flex items-center space-x-2">
                <Link
                  to="/profile"
                  className="p-2 text-text-secondary hover:text-primary-purple transition-colors rounded-lg hover:bg-dark-bg-input"
                  title="Profile"
                >
                  <UserCircleIcon className="w-5 h-5" />
                </Link>
                
                <Link
                  to="/settings"
                  className="p-2 text-text-secondary hover:text-primary-purple transition-colors rounded-lg hover:bg-dark-bg-input"
                  title="Settings"
                >
                  <Cog6ToothIcon className="w-5 h-5" />
                </Link>
                
                <button
                  onClick={logout}
                  className="px-4 py-2 text-sm font-medium text-text-primary hover:text-primary-purple transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Navigation;

