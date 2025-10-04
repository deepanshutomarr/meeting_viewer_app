import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginScreen from './components/LoginScreen';
import CalendarDashboard from './components/CalendarDashboard';
import LoadingSpinner from './components/LoadingSpinner';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [user, setUser] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if this is an OAuth callback (in popup window)
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    const userId = urlParams.get('userId');

    // Handle OAuth callback in popup window
    if (code || error) {
      handleOAuthCallback(code, state, error, userId);
      return;
    }

    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem('user');

      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);

        // Check if still connected
        const response = await axios.get(`${API_BASE_URL}/connection/status`, {
          params: { userId: userData.id },
        });

        if (response.data.connected) {
          setIsConnected(true);
        }
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleConnectionSuccess = () => {
    setIsConnected(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsConnected(false);
    localStorage.removeItem('user');
  };

  const handleOAuthCallback = async (code, state, error, userId) => {
    try {
      setIsLoading(true);
      
      if (error) {
        setError(`Authentication failed: ${error}`);
        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: error
          }, window.location.origin);
        }
        return;
      }

      if (!code) {
        setError('No authorization code received');
        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: 'No authorization code received'
          }, window.location.origin);
        }
        return;
      }

      // Complete the OAuth flow
      const response = await axios.post(`${API_BASE_URL}/connection/callback`, {
        userId: userId,
        code: code,
        connectionId: state,
      });

      if (response.data.success) {
        // Clean up URL
        window.history.replaceState({}, document.title, "/");
        setIsConnected(true);
        setError(null);
        
        // Notify parent window of success
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            data: response.data
          }, window.location.origin);
        }
      } else {
        setError(response.data.error || 'Authentication failed');
        // Notify parent window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: response.data.error || 'Authentication failed'
          }, window.location.origin);
        }
      }
    } catch (err) {
      console.error('Error completing OAuth:', err);
      setError(
        err.response?.data?.error || err.message || 'Authentication failed'
      );
      
      // Notify parent window of error
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_ERROR',
          error: err.response?.data?.error || err.message || 'Authentication failed'
        }, window.location.origin);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check if this is an OAuth callback popup
  const urlParams = new URLSearchParams(window.location.search);
  const isOAuthCallback = urlParams.get('code') || urlParams.get('error');

  if (isLoading || isOAuthCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <LoadingSpinner size="large" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {isOAuthCallback ? 'Processing Authentication...' : 'Loading...'}
            </h2>
            <p className="text-gray-600">
              {isOAuthCallback ? 'Please wait while we complete your Google Calendar connection.' : 'Please wait...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !isConnected) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onConnectionSuccess={handleConnectionSuccess}
        user={user}
        apiBaseUrl={API_BASE_URL}
      />
    );
  }

  return (
    <CalendarDashboard
      user={user}
      apiBaseUrl={API_BASE_URL}
      onLogout={handleLogout}
    />
  );
}

export default App;
