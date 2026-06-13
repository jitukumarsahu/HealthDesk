import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';
import { UserPayload } from '../middleware/auth.js';

let io: Server | null = null;

// Map to track active connections (userId -> socketId[])
const activeUsers = new Map<string, string[]>();

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const secret = process.env.JWT_ACCESS_SECRET || 'your_super_secret_access_token_secret_key_1234567890';
      const decoded = jwt.verify(token, secret) as UserPayload;
      
      // Attach user information to socket data
      socket.data.user = decoded;
      next();
    } catch (err) {
      logger.error('Socket authentication failed:', err);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as UserPayload;
    const userId = user.id;

    logger.info(`User connected to socket: ${user.email} (ID: ${userId}), Socket ID: ${socket.id}`);

    // Join room named after user's ID
    socket.join(userId);

    // Track active connection
    const userSockets = activeUsers.get(userId) || [];
    userSockets.push(socket.id);
    activeUsers.set(userId, userSockets);

    socket.on('send_message', (data: { receiverId: string; appointmentId: string; text: string }) => {
      const messageData = {
        senderId: userId,
        receiverId: data.receiverId,
        appointmentId: data.appointmentId,
        text: data.text,
        createdAt: new Date()
      };
      emitToUser(data.receiverId, 'message', messageData);
    });

    socket.on('disconnect', () => {
      logger.info(`User disconnected from socket: ${user.email}, Socket ID: ${socket.id}`);
      
      const sockets = activeUsers.get(userId) || [];
      const updatedSockets = sockets.filter(id => id !== socket.id);
      if (updatedSockets.length === 0) {
        activeUsers.delete(userId);
      } else {
        activeUsers.set(userId, updatedSockets);
      }
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Please call initSocket first.');
  }
  return io;
};

/**
 * Emits a real-time event to a specific user's room
 */
export const emitToUser = (userId: string, event: string, data: any): boolean => {
  try {
    if (!io) {
      logger.warn(`Cannot emit to user ${userId}: Socket.io not initialized`);
      return false;
    }
    
    // Broadcast message to the user room
    io.to(userId).emit(event, data);
    logger.debug(`Real-time notification emitted to user room: ${userId}`);
    return true;
  } catch (error) {
    logger.error(`Failed to emit event to user ${userId}:`, error);
    return false;
  }
};

/**
 * Checks if a user is currently connected online
 */
export const isUserOnline = (userId: string): boolean => {
  return activeUsers.has(userId) && (activeUsers.get(userId)?.length || 0) > 0;
};
