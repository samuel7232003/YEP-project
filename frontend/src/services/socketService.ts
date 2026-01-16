import { io, Socket } from 'socket.io-client';

// Socket.IO server runs on root, not /api
const getSocketUrl = (): string => {
  // Check if there's a specific Socket.IO URL
  const socketUrl = process.env.REACT_APP_SOCKET_URL;
  if (socketUrl) {
    return socketUrl;
  }
  
  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  // If it's a relative path (starts with /), convert to absolute URL
  if (apiUrl.startsWith('/')) {
    // Use current origin and remove /api suffix if present
    // Socket.IO is mounted on root of backend server, not /api
    const path = apiUrl.replace(/\/api$/, '');
    return window.location.origin + path;
  }
  
  // If it's already an absolute URL, remove /api suffix if present
  // Socket.IO is mounted on root of backend server, not /api
  return apiUrl.replace(/\/api$/, '');
};

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const socketUrl = getSocketUrl();
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event: string, callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  getIsConnected(): boolean {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
