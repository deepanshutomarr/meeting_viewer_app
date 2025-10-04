import React, { useState } from 'react';
import axios from 'axios';
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  Video,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

function MeetingCard({ meeting, isPast, apiBaseUrl, userId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate - startDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `${diffMins}m`;
    }

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getResponseStatusIcon = (status) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const generateSummary = async () => {
    try {
      setIsLoadingSummary(true);
      const response = await axios.post(`${apiBaseUrl}/meetings/summarize`, {
        meeting,
        userId,
      });

      setSummary(response.data.summary);
    } catch (err) {
      console.error('Error generating summary:', err);
      setSummary('Unable to generate summary at this time.');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && isPast && !summary) {
      generateSummary();
    }
  };

  const isToday = () => {
    const today = new Date();
    const meetingDate = new Date(meeting.start);
    return (
      today.getDate() === meetingDate.getDate() &&
      today.getMonth() === meetingDate.getMonth() &&
      today.getFullYear() === meetingDate.getFullYear()
    );
  };

  const isSoon = () => {
    if (isPast) return false;
    const now = new Date();
    const meetingDate = new Date(meeting.start);
    const diffHours = (meetingDate - now) / (1000 * 60 * 60);
    return diffHours <= 1 && diffHours > 0;
  };

  return (
    <div className="card animate-slide-up hover:shadow-2xl">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-start space-x-3">
            <div
              className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-gray-100' : 'bg-blue-100'
                }`}
            >
              <Calendar className={`w-6 h-6 ${isPast ? 'text-gray-600' : 'text-blue-600'}`} />
            </div>

            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {meeting.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(meeting.start)}</span>
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatTime(meeting.start)} - {formatTime(meeting.end)}
                      </span>
                    </span>
                    <span className="text-gray-400">•</span>
                    <span>{calculateDuration(meeting.start, meeting.end)}</span>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-col items-end space-y-2">
                  {isToday() && !isPast && (
                    <span className="badge bg-blue-100 text-blue-800">Today</span>
                  )}
                  {isSoon() && (
                    <span className="badge bg-orange-100 text-orange-800 animate-pulse">
                      Starting Soon
                    </span>
                  )}
                  {isPast && (
                    <span className="badge bg-gray-100 text-gray-800">Completed</span>
                  )}
                </div>
              </div>

              {/* Quick Info */}
              <div className="mt-3 space-y-2">
                {meeting.attendees && meeting.attendees.length > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>
                      {meeting.attendees.length} attendee{meeting.attendees.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {meeting.location && (
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="truncate">{meeting.location}</span>
                  </div>
                )}

                {meeting.meetLink && (
                  <a
                    href={meeting.meetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Meeting</span>
                  </a>
                )}
              </div>

              {/* AI Summary for Past Meetings */}
              {isPast && isExpanded && (
                <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    <h4 className="font-semibold text-purple-900">AI Summary</h4>
                  </div>
                  {isLoadingSummary ? (
                    <div className="flex items-center space-x-2 text-purple-700">
                      <LoadingSpinner size="small" />
                      <span className="text-sm">Generating summary...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-purple-800 leading-relaxed whitespace-pre-line">
                      {summary}
                    </p>
                  )}
                </div>
              )}

              {/* Expanded Details */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  {meeting.description && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Description</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {meeting.description}
                      </p>
                    </div>
                  )}

                  {meeting.attendees && meeting.attendees.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Attendees</h4>
                      <div className="space-y-2">
                        {meeting.attendees.map((attendee, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {attendee.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-gray-900">{attendee.name}</p>
                                <p className="text-gray-500 text-xs">{attendee.email}</p>
                              </div>
                            </div>
                            {getResponseStatusIcon(attendee.responseStatus)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {meeting.organizer && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-1">Organizer</h4>
                      <p className="text-sm text-gray-700">
                        {meeting.organizer.displayName || meeting.organizer.email}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Expand/Collapse Button */}
      <button
        onClick={handleToggleExpand}
        className="w-full mt-4 pt-4 border-t border-gray-200 flex items-center justify-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default MeetingCard;
