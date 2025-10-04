import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar,
  LogOut,
  RefreshCw,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import MeetingCard from "./MeetingCard";
import LoadingSpinner from "./LoadingSpinner";
import ErrorMessage from "./ErrorMessage";
import { useWebSocket } from "../hooks/useWebSocket";

function CalendarDashboard({ user, apiBaseUrl, onLogout }) {
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [pastMeetings, setPastMeetings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);

  // Initialize WebSocket for live sync
  const { isConnected, onCalendarUpdate, onRefreshRequest } = useWebSocket(
    user?.id
  );

  useEffect(() => {
    fetchMeetings();
    setupWebhook();

    // Set up auto-refresh every 60 seconds (fallback)
    const interval = setInterval(() => {
      fetchMeetings(true);
    }, 60000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Separate useEffect for WebSocket listeners
  useEffect(() => {
    if (!onCalendarUpdate || !onRefreshRequest) return;

    // Listen for calendar updates via WebSocket
    onCalendarUpdate((data) => {
      console.log("Calendar update received:", data);
      setShowUpdateNotification(true);

      // Auto-refresh after notification
      setTimeout(() => {
        fetchMeetings(true);
        setShowUpdateNotification(false);
      }, 2000);
    });

    // Listen for refresh requests
    onRefreshRequest(() => {
      fetchMeetings(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCalendarUpdate, onRefreshRequest]);

  const fetchMeetings = async (silent = false) => {
    try {
      if (!silent) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      const [upcomingRes, pastRes] = await Promise.all([
        axios.get(`${apiBaseUrl}/meetings/upcoming`, {
          params: { userId: user.id },
        }),
        axios.get(`${apiBaseUrl}/meetings/past`, {
          params: { userId: user.id },
        }),
      ]);

      setUpcomingMeetings(upcomingRes.data.meetings || []);
      setPastMeetings(pastRes.data.meetings || []);
    } catch (err) {
      console.error("Error fetching meetings:", err);
      setError(err.response?.data?.error || "Failed to fetch meetings");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const setupWebhook = async () => {
    try {
      await axios.post(`${apiBaseUrl}/webhook/setup`, {
        userId: user.id,
      });
      console.log("Webhook setup complete");
    } catch (error) {
      console.log("Webhook setup failed, using polling:", error);
    }
  };

  const handleRefresh = () => {
    fetchMeetings();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Calendar App
                </h1>
                <p className="text-xs text-gray-500">AI-Powered Meetings</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Live Sync Indicator */}
              <div
                className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${isConnected
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-100 text-gray-600"
                  }`}
                title={
                  isConnected ? "Live sync active" : "Live sync disconnected"
                }
              >
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                title="Refresh meetings"
              >
                <RefreshCw
                  className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </button>

              <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Update Notification */}
        {showUpdateNotification && (
          <div className="mb-6 animate-slide-up">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="text-blue-900 font-semibold">
                  Calendar Updated
                </h3>
                <p className="text-blue-700 text-sm">
                  Refreshing your meetings...
                </p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={handleRefresh} />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">
                  Upcoming Meetings
                </p>
                <p className="text-3xl font-bold mt-1">
                  {upcomingMeetings.length}
                </p>
              </div>
              <Calendar className="w-12 h-12 text-blue-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">
                  Past Meetings
                </p>
                <p className="text-3xl font-bold mt-1">{pastMeetings.length}</p>
              </div>
              <Calendar className="w-12 h-12 text-purple-200" />
            </div>
          </div>

          <div className="card bg-gradient-to-br from-pink-500 to-pink-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-medium">
                  AI Summaries
                </p>
                <p className="text-3xl font-bold mt-1">Available</p>
              </div>
              <Sparkles className="w-12 h-12 text-pink-200" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-6 py-3 font-medium transition-all ${activeTab === "upcoming"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Upcoming Meetings ({upcomingMeetings.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-6 py-3 font-medium transition-all ${activeTab === "past"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
              }`}
          >
            Past Meetings ({pastMeetings.length})
          </button>
        </div>

        {/* Meeting Lists */}
        <div className="space-y-4">
          {activeTab === "upcoming" && (
            <>
              {upcomingMeetings.length === 0 ? (
                <div className="card text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No upcoming meetings
                  </h3>
                  <p className="text-gray-600">
                    You're all caught up! No meetings scheduled in the next 30
                    days.
                  </p>
                </div>
              ) : (
                upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isPast={false}
                    apiBaseUrl={apiBaseUrl}
                    userId={user.id}
                  />
                ))
              )}
            </>
          )}

          {activeTab === "past" && (
            <>
              {pastMeetings.length === 0 ? (
                <div className="card text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No past meetings
                  </h3>
                  <p className="text-gray-600">
                    No meetings found in the last 30 days.
                  </p>
                </div>
              ) : (
                pastMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    isPast={true}
                    apiBaseUrl={apiBaseUrl}
                    userId={user.id}
                  />
                ))
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default CalendarDashboard;
