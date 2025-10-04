import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:3001';

export function useWebSocket(userId) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('🔌 WebSocket connected');
      setIsConnected(true);

      // Identify user
      socket.emit('identify', userId);
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
    });

    socket.on('identified', (data) => {
      console.log('👤 Identified as:', data.userId);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [userId]);

  // Subscribe to calendar updates
  const onCalendarUpdate = useCallback((callback) => {
    if (!socketRef.current) return;

    // Remove previous listeners to avoid duplicates
    socketRef.current.off('calendar_updated');
    socketRef.current.off('calendar_changed');

    socketRef.current.on('calendar_updated', (data) => {
      console.log('Calendar updated:', data);
      setLastUpdate(data);
      callback(data);
    });

    socketRef.current.on('calendar_changed', (data) => {
      console.log('Calendar changed:', data);
      setLastUpdate(data);
      callback(data);
    });
  }, []);

  // Subscribe to refresh requests
  const onRefreshRequest = useCallback((callback) => {
    if (!socketRef.current) return;

    // Remove previous listener to avoid duplicates
    socketRef.current.off('refresh_meetings');

    socketRef.current.on('refresh_meetings', (data) => {
      console.log('Refresh requested:', data);
      callback(data);
    });
  }, []);

  // Request manual refresh
  const requestRefresh = useCallback(() => {
    if (!socketRef.current) return;

    socketRef.current.emit('request_refresh', { userId });
  }, [userId]);

  return {
    isConnected,
    lastUpdate,
    onCalendarUpdate,
    onRefreshRequest,
    requestRefresh,
  };
}
