import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

function OAuthCallback({ apiBaseUrl, userId }) {
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        if (error) {
          setStatus('error');
          setMessage(`Authentication failed: ${error}`);
          // Notify parent window
          window.opener?.postMessage({
            type: 'OAUTH_ERROR',
            error: error
          }, window.location.origin);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('No authorization code received');
          // Notify parent window
          window.opener?.postMessage({
            type: 'OAUTH_ERROR',
            error: 'No authorization code received'
          }, window.location.origin);
          return;
        }

        setMessage('Completing authentication...');

        // Complete the OAuth flow
        const response = await axios.post(`${apiBaseUrl}/connection/callback`, {
          userId: userId,
          code: code,
          connectionId: state,
        });

        if (response.data.success) {
          setStatus('success');
          setMessage('Successfully connected to Google Calendar!');
          
          // Notify parent window
          window.opener?.postMessage({
            type: 'OAUTH_SUCCESS',
            data: response.data
          }, window.location.origin);

          // Close popup after a short delay
          setTimeout(() => {
            window.close();
          }, 2000);
        } else {
          throw new Error(response.data.error || 'Authentication failed');
        }
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setMessage(err.response?.data?.error || err.message || 'Authentication failed');
        
        // Notify parent window
        window.opener?.postMessage({
          type: 'OAUTH_ERROR',
          error: err.response?.data?.error || err.message || 'Authentication failed'
        }, window.location.origin);
      }
    };

    handleCallback();
  }, [apiBaseUrl, userId]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            {status === 'processing' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {status === 'processing' && 'Connecting to Google Calendar'}
            {status === 'success' && 'Successfully Connected!'}
            {status === 'error' && 'Connection Failed'}
          </h2>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status === 'success' && (
            <div className="text-sm text-gray-500">
              This window will close automatically...
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={() => window.close()}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close Window
              </button>
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OAuthCallback;
