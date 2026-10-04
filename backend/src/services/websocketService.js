/**
 * WebSocket Service for Real-time Data Streaming
 * Handles WebSocket connections and real-time sensor data broadcasting
 */

const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const SensorSimulationService = require('./sensorSimulationService')

class WebSocketService {
  constructor(server) {
    const corsOptions = {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000',
      methods: ["GET", "POST"],
      credentials: true
    };
    
    this.io = new Server(server, {
      cors: corsOptions,
      // Required for WebSocket connections in containerized environments
      transports: ['websocket', 'polling'],
      allowEIO3: true
    })

    this.sensorService = new SensorSimulationService()
    this.connectedClients = new Map()
    this.rooms = new Set(['sensor-stream', 'anomaly-alerts'])
    
    this.setupSocketHandlers()
    this.setupSensorDataStreaming()
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupSocketHandlers() {
    this.io.use(this.authenticateSocket.bind(this))

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`)
      
      // Store client info
      this.connectedClients.set(socket.id, {
        userId: socket.userId,
        connectedAt: new Date(),
        subscriptions: new Set()
      })

      // Handle room subscriptions
      socket.on('subscribe-sensor-stream', () => {
        socket.join('sensor-stream')
        this.connectedClients.get(socket.id).subscriptions.add('sensor-stream')
        console.log(`📡 Client ${socket.id} subscribed to sensor stream`)
        
        // Send current sensor state immediately
        socket.emit('sensor-data', this.sensorService.getCurrentState())
      })

      socket.on('unsubscribe-sensor-stream', () => {
        socket.leave('sensor-stream')
        this.connectedClients.get(socket.id).subscriptions.delete('sensor-stream')
        console.log(`📡 Client ${socket.id} unsubscribed from sensor stream`)
      })

      socket.on('subscribe-anomaly-alerts', () => {
        socket.join('anomaly-alerts')
        this.connectedClients.get(socket.id).subscriptions.add('anomaly-alerts')
        console.log(`🚨 Client ${socket.id} subscribed to anomaly alerts`)
      })

      socket.on('unsubscribe-anomaly-alerts', () => {
        socket.leave('anomaly-alerts')
        this.connectedClients.get(socket.id).subscriptions.delete('anomaly-alerts')
        console.log(`🚨 Client ${socket.id} unsubscribed from anomaly alerts`)
      })

      // Handle simulation control
      socket.on('start-simulation', () => {
        if (socket.userId) { // Only authenticated users can control simulation
          this.sensorService.start()
          this.io.emit('simulation-status', { running: true })
          console.log(`🚗 Simulation started by user ${socket.userId}`)
        }
      })

      socket.on('stop-simulation', () => {
        if (socket.userId) {
          this.sensorService.stop()
          this.io.emit('simulation-status', { running: false })
          console.log(`🛑 Simulation stopped by user ${socket.userId}`)
        }
      })

      socket.on('update-simulation-config', (config) => {
        if (socket.userId) {
          this.sensorService.updateConfig(config)
          console.log(`⚙️ Simulation config updated by user ${socket.userId}`)
        }
      })

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`)
        this.connectedClients.delete(socket.id)
        
        // Stop simulation if no clients are connected
        if (this.connectedClients.size === 0) {
          this.sensorService.stop()
        }
      })

      // Send initial status
      socket.emit('simulation-status', { running: this.sensorService.isRunning })
    })
  }

  /**
   * Authenticate WebSocket connections using JWT
   */
  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        // Allow anonymous connections but mark them
        socket.userId = null
        return next()
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      next()
    } catch (error) {
      console.error('WebSocket authentication error:', error)
      socket.userId = null
      next() // Allow connection but without user privileges
    }
  }

  /**
   * Setup sensor data streaming
   */
  setupSensorDataStreaming() {
    // Subscribe to sensor data updates
    this.sensorService.subscribe((sensorData) => {
      // Broadcast to all clients subscribed to sensor stream
      this.io.to('sensor-stream').emit('sensor-data', sensorData)

      // Check for anomalies and send alerts
      if (sensorData.metrics.anomalyScore > 0.5) {
        const alert = {
          timestamp: sensorData.timestamp,
          type: 'anomaly_detected',
          score: sensorData.metrics.anomalyScore,
          sensors: this.identifyAnomalouseSensors(sensorData),
          message: `Anomaly detected with score ${sensorData.metrics.anomalyScore.toFixed(2)}`
        }
        
        this.io.to('anomaly-alerts').emit('anomaly-alert', alert)
        console.log(`🚨 Anomaly alert sent: score ${sensorData.metrics.anomalyScore.toFixed(2)}`)
      }
    })
  }

  /**
   * Identify which sensors are showing anomalous values
   */
  identifyAnomalouseSensors(sensorData) {
    const anomalous = []
    
    if (sensorData.wheelSlip > 20) anomalous.push('wheelSlip')
    if (sensorData.temperature > 90) anomalous.push('temperature')
    if (Math.abs(sensorData.acceleration) > 4) anomalous.push('acceleration')
    if (Math.abs(sensorData.steeringAngle) > 30) anomalous.push('steeringAngle')
    
    return anomalous
  }

  /**
   * Get connected clients statistics
   */
  getStats() {
    const stats = {
      connectedClients: this.connectedClients.size,
      authenticatedClients: Array.from(this.connectedClients.values()).filter(c => c.userId).length,
      subscriptions: {
        sensorStream: this.io.sockets.adapter.rooms.get('sensor-stream')?.size || 0,
        anomalyAlerts: this.io.sockets.adapter.rooms.get('anomaly-alerts')?.size || 0
      },
      simulationRunning: this.sensorService.isRunning
    }
    
    return stats
  }

  /**
   * Broadcast custom message to specific room
   */
  broadcastToRoom(room, event, data) {
    this.io.to(room).emit(event, data)
  }

  /**
   * Send message to specific client
   */
  sendToClient(socketId, event, data) {
    this.io.to(socketId).emit(event, data)
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    console.log('🔌 Shutting down WebSocket service...')
    this.sensorService.stop()
    this.io.close()
  }
}

module.exports = WebSocketService
