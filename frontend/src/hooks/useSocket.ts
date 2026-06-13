'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { addNotification } from '../redux/slices/notificationSlice';

export const useSocket = () => {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);
  
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const user = useAppSelector((state) => state.auth.user);

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
    
    // Connect to Socket.io server
    const socket = io(socketUrl, {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'], // Use WebSocket transport for better reliability
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket.io connected successfully');
    });

    // Listen for real-time notifications
    socket.on('notification', (notification) => {
      dispatch(addNotification(notification));
      
      // Dispatch custom DOM event to show a toast in UI (e.g. via Sonner or custom toast)
      const event = new CustomEvent('app-notification', { detail: notification });
      window.dispatchEvent(event);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, accessToken, user, dispatch]);

  return socketRef.current;
};
