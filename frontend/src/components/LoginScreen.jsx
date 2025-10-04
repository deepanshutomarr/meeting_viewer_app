import React, { useState, useEffect } from "react";
import axios from "axios";
import { Calendar, Sparkles, Lock, CheckCircle } from "lucide-react";
import LoadingSpinner from "./LoadingSpinner";

function LoginScreen({ onLogin, onConnectionSuccess, user, apiBaseUrl }) {
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [showMockLogin, setShowMockLogin] = useState(!user);

  useEffect(() => {
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const connectionId = urlParams.get("state");

    if (code && user) {
      handleOAuthCallback(code, connectionId);
    }
  }, [user]);

  const handleMockLogin = (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      setError("Please enter a user ID");
      return;
    }
    if (!userName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!userEmail.trim()) {
      setError("Please enter your email");
      return;
    }

    const userData = {
      id: userId,
      name: userName,
      email: userEmail,
      isMock: true,
    };

    onLogin(userData);
    setShowMockLogin(false);
  };

  const handleConnectCalendar = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const response = await axios.post(`${apiBaseUrl}/connection/initiate`, {
        userId: user.id,
      });

      // Open OAuth in a popup window
      const popup = window.open(
        response.data.connectionUrl,
        "composio-oauth",
        "width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for popup completion
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          // Check if connection was successful
          checkConnectionStatus();
        }
      }, 1000);

      // Listen for messages from popup
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === "OAUTH_SUCCESS") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageHandler);
          setIsConnecting(false);
          onConnectionSuccess();
        } else if (event.data.type === "OAUTH_ERROR") {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener("message", messageHandler);
          setIsConnecting(false);
          setError(event.data.error || "OAuth authentication failed");
        }
      };

      window.addEventListener("message", messageHandler);
    } catch (err) {
      console.error("Error connecting to calendar:", err);
      
      // Handle specific error types
      if (err.response?.data?.fallback) {
        setError(
          "Composio API key not configured. Please configure your Composio API key to connect to Google Calendar."
        );
      } else if (err.response?.data?.error === 'Composio API key not configured') {
        setError(
          "Composio API key not configured. Please configure your Composio API key in the backend .env file to connect to Google Calendar."
        );
      } else {
        setError(
          err.response?.data?.error || "Failed to connect to Google Calendar"
        );
      }
      setIsConnecting(false);
    }
  };

  const checkConnectionStatus = async () => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/connection/status?userId=${user.id}`
      );
      if (response.data.connected) {
        onConnectionSuccess();
      }
    } catch (err) {
      console.error("Error checking connection status:", err);
    }
  };


  if (showMockLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="card animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Calendar MCP
              </h1>
              <p className="text-gray-600">AI-Powered Meeting Intelligence</p>
            </div>

            <form onSubmit={handleMockLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="userId"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  User ID
                </label>
                <input
                  type="text"
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your user ID"
                  autoFocus
                />
              </div>

              <div>
                <label
                  htmlFor="userName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label
                  htmlFor="userEmail"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="userEmail"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your email address"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="font-medium mb-1">Connection Failed</div>
                  <div>{error}</div>
                  {error.includes('Composio API key') && (
                    <div className="mt-2 text-xs text-red-600">
                      <p>To fix this:</p>
                      <ol className="list-decimal list-inside mt-1 space-y-1">
                        <li>Get a Composio API key from <a href="https://app.composio.dev" target="_blank" rel="noopener noreferrer" className="underline">app.composio.dev</a></li>
                        <li>Create a <code className="bg-red-100 px-1 rounded">.env</code> file in the backend directory</li>
                        <li>Add <code className="bg-red-100 px-1 rounded">COMPOSIO_API_KEY=your_key_here</code></li>
                        <li>Restart the backend server</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full flex items-center justify-center space-x-2"
              >
                <Lock className="w-4 h-4" />
                <span>Continue</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start space-x-3 text-sm text-gray-600">
                <Sparkles className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>
                  Connect your Google Calendar to view meetings and get
                  AI-powered insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Connect Google Calendar
            </h1>
            <p className="text-gray-600">
              Logged in as <span className="font-semibold">{user?.name}</span>
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                <div className="font-medium mb-1">Connection Failed</div>
                <div>{error}</div>
                {error.includes('Composio API key') && (
                  <div className="mt-2 text-xs text-red-600">
                    <p>To fix this:</p>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Get a Composio API key from <a href="https://app.composio.dev" target="_blank" rel="noopener noreferrer" className="underline">app.composio.dev</a></li>
                      <li>Create a <code className="bg-red-100 px-1 rounded">.env</code> file in the backend directory</li>
                      <li>Add <code className="bg-red-100 px-1 rounded">COMPOSIO_API_KEY=your_key_here</code></li>
                      <li>Restart the backend server</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                What you'll get:
              </h3>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>View your upcoming and past meetings</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>AI-powered meeting summaries</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Smart insights and context</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnectCalendar}
              disabled={isConnecting}
              className="btn-primary w-full flex items-center justify-center space-x-2"
            >
              {isConnecting ? (
                <>
                  <LoadingSpinner size="small" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  <span>Connect Google Calendar</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Powered by Composio MCP Integration
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
