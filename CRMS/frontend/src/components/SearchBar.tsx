// frontend/src/components/SearchBar.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { searchService } from '../services/search';

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Close results when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch();
      } else {
        setResults({});
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await searchService.search(query, 'all', 5);
      setResults(data.results);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
      setResults({});
    } finally {
      setLoading(false);
    }
  };

  const handleResultClick = (type: string, id: string) => {
    setShowResults(false);
    setQuery('');
    
    if (type === 'customers') {
      navigate(`/customers/${id}`);
    } else if (type === 'complaints') {
      navigate(`/complaints/${id}`);
    } else if (type === 'logs') {
      // Navigate to log or customer detail with log
      navigate(`/customers/${id}`);
    }
  };

  const clearSearch = () => {
    setQuery('');
    setResults({});
    setShowResults(false);
  };

  const getTotalResults = () => {
    return (
      (results.customers?.length || 0) +
      (results.complaints?.length || 0) +
      (results.logs?.length || 0)
    );
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-lg">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setShowResults(true)}
          placeholder="Search customers, complaints, logs..."
          className="w-full pl-10 pr-10 py-2 bg-dark-bg-card border border-border rounded-lg text-text-primary placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-purple"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
        {loading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary-purple"></div>
          </div>
        )}
      </div>

      {showResults && query.trim().length >= 2 && getTotalResults() > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-dark-bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.customers && results.customers.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-semibold text-text-secondary uppercase px-2 py-1">Customers</h3>
              {results.customers.map((customer: any) => (
                <button
                  key={customer.id}
                  onClick={() => handleResultClick('customers', customer.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-dark-bg-secondary transition-colors"
                >
                  <div className="font-medium text-text-primary">{customer.name}</div>
                  {customer.email && (
                    <div className="text-sm text-text-secondary">{customer.email}</div>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.complaints && results.complaints.length > 0 && (
            <div className="p-2 border-t border-border">
              <h3 className="text-xs font-semibold text-text-secondary uppercase px-2 py-1">Complaints</h3>
              {results.complaints.map((complaint: any) => (
                <button
                  key={complaint.id}
                  onClick={() => handleResultClick('complaints', complaint.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-dark-bg-secondary transition-colors"
                >
                  <div className="font-medium text-text-primary">
                    {complaint.title || complaint.subject || 'Untitled Complaint'}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {complaint.ticket_number && `#${complaint.ticket_number} • `}
                    {complaint.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          {results.logs && results.logs.length > 0 && (
            <div className="p-2 border-t border-border">
              <h3 className="text-xs font-semibold text-text-secondary uppercase px-2 py-1">Logs</h3>
              {results.logs.map((log: any) => (
                <button
                  key={log.id}
                  onClick={() => handleResultClick('logs', log.customer_id || log.id)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-dark-bg-secondary transition-colors"
                >
                  <div className="font-medium text-text-primary">
                    {log.title || log.type || 'Log Entry'}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {log.log_date || log.created_at}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {showResults && query.trim().length >= 2 && !loading && getTotalResults() === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-dark-bg-card border border-border rounded-lg shadow-lg p-4 text-center text-text-secondary">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
};

export default SearchBar;

