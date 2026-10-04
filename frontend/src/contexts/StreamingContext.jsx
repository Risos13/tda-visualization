import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const StreamingContext = createContext()

export const useStreaming = () => {
  const context = useContext(StreamingContext)
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider')
  }
  return context
}

export const StreamingProvider = ({ children }) => {
  const { user, token } = useAuth()
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const [sensorData, setSensorData] = useState(null)
  const [sensorHistory, setSensorHistory] = useState([])
  const [anomalyAlerts, setAnomalyAlerts] = useState([])
  const [simulationRunning, setSimulationRunning] = useState(false)
  const [subscriptions, setSubscriptions] = useState({
    sensorStream: false,
    anomalyAlerts: false
  })

  const maxHistoryLength = 100 // Keep last 100 data points
  const socketRef = useRef(null)

  useEffect(() => {
    initializeSocket()
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [token])

  const initializeSocket = () => {
    // Use environment variable for backend URL or default to localhost:5000
    const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    // Convert http:// to ws:// and https:// to wss://
    const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
    const host = backendUrl.replace(/^https?:\/\//, '');
    const socketUrl = `${wsProtocol}://${host}`;

    const socketOptions = {
      transports: ['websocket', 'polling'],
      auth: token ? { token } : {},
      reconnection: true,
      reconnectionAttempts: 5,
      autoConnect: true, // Auto-connect when socket is created
      withCredentials: true,
      reconnectionDelay: 1000,
      timeout: 10000
    }

    console.log('Initializing WebSocket connection to:', socketUrl);
    const newSocket = io(socketUrl, socketOptions)
    socketRef.current = newSocket
    setSocket(newSocket)
    
    // Force connection if not already connected
    if (!newSocket.connected) {
      console.log('Manually connecting WebSocket...');
      newSocket.connect();
    }

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 Connected to WebSocket server')
      setConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 Disconnected from WebSocket server')
      setConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setConnected(false)
    })

    // Sensor data events
    newSocket.on('sensor-data', (data) => {
      setSensorData(data)
      setSensorHistory(prev => {
        const newHistory = [...prev, data]
        return newHistory.slice(-maxHistoryLength)
      })
    })

    // Anomaly alerts
    newSocket.on('anomaly-alert', (alert) => {
      setAnomalyAlerts(prev => {
        const newAlerts = [alert, ...prev]
        return newAlerts.slice(0, 50) // Keep last 50 alerts
      })
    })

    // Simulation status
    newSocket.on('simulation-status', (status) => {
      setSimulationRunning(status.running)
    })

    return newSocket
  }

  const subscribeToSensorStream = () => {
    if (socket && !subscriptions.sensorStream) {
      socket.emit('subscribe-sensor-stream')
      setSubscriptions(prev => ({ ...prev, sensorStream: true }))
    }
  }

  const unsubscribeFromSensorStream = () => {
    if (socket && subscriptions.sensorStream) {
      socket.emit('unsubscribe-sensor-stream')
      setSubscriptions(prev => ({ ...prev, sensorStream: false }))
      setSensorData(null)
      setSensorHistory([])
    }
  }

  const subscribeToAnomalyAlerts = () => {
    if (socket && !subscriptions.anomalyAlerts) {
      socket.emit('subscribe-anomaly-alerts')
      setSubscriptions(prev => ({ ...prev, anomalyAlerts: true }))
    }
  }

  const unsubscribeFromAnomalyAlerts = () => {
    if (socket && subscriptions.anomalyAlerts) {
      socket.emit('unsubscribe-anomaly-alerts')
      setSubscriptions(prev => ({ ...prev, anomalyAlerts: false }))
      setAnomalyAlerts([])
    }
  }

  const startSimulation = () => {
    if (socket) {
      // Force reconnect if not connected
      if (!socket.connected) {
        socket.connect()
      }
      socket.emit('start-simulation')
      setSimulationRunning(true)
    }
  }

  const stopSimulation = () => {
    if (socket && user) {
      socket.emit('stop-simulation')
    }
  }

  const updateSimulationConfig = (config) => {
    if (socket && user) {
      socket.emit('update-simulation-config', config)
    }
  }

  const clearHistory = () => {
    setSensorHistory([])
  }

  const clearAlerts = () => {
    setAnomalyAlerts([])
  }

  const value = {
    // Connection state
    connected,
    socket,
    
    // Data
    sensorData,
    sensorHistory,
    anomalyAlerts,
    simulationRunning,
    subscriptions,
    
    // Actions
    subscribeToSensorStream,
    unsubscribeFromSensorStream,
    subscribeToAnomalyAlerts,
    unsubscribeFromAnomalyAlerts,
    startSimulation,
    stopSimulation,
    updateSimulationConfig,
    clearHistory,
    clearAlerts
  }

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  )
}
