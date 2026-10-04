const express = require('express');
const http = require('http');
const connectDB = require('./config/database');
const app = require('./app');
const WebSocketService = require('./services/websocketService');

// Load environment variables
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    startServer();
  })
  .catch((error) => {
    console.error('❌ Failed to connect to MongoDB:', error);
    process.exit(1);
  });

function startServer() {
  // Create HTTP server
  const server = http.createServer(app);

  // Initialize WebSocket service
  const wsService = new WebSocketService(server);

  // Handle server errors
  server.on('error', (error) => {
    if (error.syscall !== 'listen') {
      throw error;
    }

    // Handle specific listen errors with friendly messages
    switch (error.code) {
      case 'EACCES':
        console.error(`Port ${PORT} requires elevated privileges`);
        process.exit(1);
        break;
      case 'EADDRINUSE':
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  // Start server
  server.listen(PORT, '0.0.0.0', () => {
    const addr = server.address();
    const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
    
    console.log(`🚀 Server running on ${bind}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoints: http://localhost:${PORT}/api`);
    console.log(`🔌 WebSocket server ready for real-time connections`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down server...');
    
    // Close the server and exit
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });

    // Force close after 5 seconds
    setTimeout(() => {
      console.error('❌ Could not close connections in time, forcing shutdown');
      process.exit(1);
    }, 5000);
  };

  // Listen for termination signals
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown();
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    shutdown();
  });
}

// Export the server for testing
module.exports = { startServer };
