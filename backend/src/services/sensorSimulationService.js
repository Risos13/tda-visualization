/**
 * Vehicle Sensor Simulation Service
 * Generates realistic synthetic sensor data for real-time streaming
 */

class SensorSimulationService {
  constructor() {
    this.isRunning = false
    this.intervalId = null
    this.subscribers = new Set()
    this.currentTime = Date.now()
    
    // Vehicle state variables
    this.vehicleState = {
      speed: 0,           // km/h
      acceleration: 0,    // m/s²
      wheelSlip: 0,       // percentage
      engineRPM: 800,     // RPM
      brakeForce: 0,      // percentage
      steeringAngle: 0,   // degrees
      temperature: 20,    // °C
      fuelLevel: 100,     // percentage
      timestamp: this.currentTime
    }
    
    // Simulation parameters
    this.config = {
      updateInterval: 100,    // ms (10Hz)
      maxSpeed: 120,         // km/h
      maxAcceleration: 5,    // m/s²
      anomalyProbability: 0.02, // 2% chance per update
      noiseLevel: 0.1        // noise factor
    }
  }

  /**
   * Subscribe to sensor data updates
   */
  subscribe(callback) {
    this.subscribers.add(callback)
    return () => this.subscribers.delete(callback)
  }

  /**
   * Start the sensor simulation
   */
  start() {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.updateSensorData()
      this.broadcastData()
    }, this.config.updateInterval)

    console.log('🚗 Vehicle sensor simulation started')
  }

  /**
   * Stop the sensor simulation
   */
  stop() {
    if (!this.isRunning) return

    this.isRunning = false
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    console.log('🛑 Vehicle sensor simulation stopped')
  }

  /**
   * Update sensor data with realistic vehicle dynamics
   */
  updateSensorData() {
    const dt = this.config.updateInterval / 1000 // Convert to seconds
    this.currentTime = Date.now()

    // Simulate driving scenario
    this.simulateDrivingBehavior(dt)
    
    // Add sensor noise
    this.addSensorNoise()
    
    // Inject occasional anomalies
    this.injectAnomalies()
    
    // Update timestamp
    this.vehicleState.timestamp = this.currentTime
  }

  /**
   * Simulate realistic driving behavior
   */
  simulateDrivingBehavior(dt) {
    const state = this.vehicleState
    
    // Generate driving pattern (acceleration/deceleration cycles)
    const timeInCycle = (this.currentTime / 1000) % 60 // 60-second cycles
    let targetSpeed = 0
    
    if (timeInCycle < 15) {
      // Acceleration phase
      targetSpeed = Math.min(60, timeInCycle * 4)
    } else if (timeInCycle < 30) {
      // Cruise phase
      targetSpeed = 60
    } else if (timeInCycle < 45) {
      // Deceleration phase
      targetSpeed = Math.max(0, 60 - (timeInCycle - 30) * 4)
    } else {
      // Stop phase
      targetSpeed = 0
    }

    // Calculate acceleration needed to reach target speed
    const speedDiff = targetSpeed - state.speed
    state.acceleration = Math.max(-this.config.maxAcceleration, 
                                 Math.min(this.config.maxAcceleration, speedDiff * 0.5))

    // Update speed based on acceleration
    state.speed = Math.max(0, Math.min(this.config.maxSpeed, 
                                      state.speed + state.acceleration * dt * 3.6)) // Convert m/s to km/h

    // Update engine RPM based on speed and acceleration
    const baseRPM = 800 + (state.speed * 25) // Base RPM increases with speed
    const accelRPM = Math.max(0, state.acceleration * 200) // Additional RPM during acceleration
    state.engineRPM = Math.max(800, baseRPM + accelRPM)

    // Calculate brake force (higher when decelerating)
    state.brakeForce = Math.max(0, -state.acceleration * 20)

    // Simulate wheel slip during hard acceleration/braking
    const slipFactor = Math.abs(state.acceleration) > 3 ? Math.abs(state.acceleration) * 2 : 0
    state.wheelSlip = Math.min(100, slipFactor + (Math.random() - 0.5) * 5)

    // Random steering variations
    state.steeringAngle += (Math.random() - 0.5) * 2
    state.steeringAngle = Math.max(-45, Math.min(45, state.steeringAngle * 0.95)) // Decay to center

    // Engine temperature increases with RPM
    const targetTemp = 20 + (state.engineRPM - 800) / 100
    state.temperature += (targetTemp - state.temperature) * 0.01

    // Fuel consumption
    const consumption = (state.engineRPM / 1000) * dt * 0.001
    state.fuelLevel = Math.max(0, state.fuelLevel - consumption)
  }

  /**
   * Add realistic sensor noise
   */
  addSensorNoise() {
    const noise = this.config.noiseLevel
    const state = this.vehicleState

    state.speed += (Math.random() - 0.5) * noise * 2
    state.acceleration += (Math.random() - 0.5) * noise * 0.1
    state.wheelSlip += (Math.random() - 0.5) * noise * 1
    state.engineRPM += (Math.random() - 0.5) * noise * 50
    state.brakeForce += (Math.random() - 0.5) * noise * 2
    state.steeringAngle += (Math.random() - 0.5) * noise * 1
    state.temperature += (Math.random() - 0.5) * noise * 0.5
  }

  /**
   * Inject anomalies for testing anomaly detection
   */
  injectAnomalies() {
    if (Math.random() < this.config.anomalyProbability) {
      const anomalyType = Math.floor(Math.random() * 4)
      
      switch (anomalyType) {
        case 0: // Sudden wheel slip
          this.vehicleState.wheelSlip = Math.random() * 50 + 30
          console.log('🚨 Anomaly injected: Wheel slip spike')
          break
        case 1: // Engine temperature spike
          this.vehicleState.temperature += Math.random() * 20 + 10
          console.log('🚨 Anomaly injected: Temperature spike')
          break
        case 2: // Erratic steering
          this.vehicleState.steeringAngle = (Math.random() - 0.5) * 60
          console.log('🚨 Anomaly injected: Erratic steering')
          break
        case 3: // Sudden acceleration/deceleration
          this.vehicleState.acceleration = (Math.random() - 0.5) * 8
          console.log('🚨 Anomaly injected: Sudden acceleration change')
          break
      }
    }
  }

  /**
   * Broadcast data to all subscribers
   */
  broadcastData() {
    const data = {
      ...this.vehicleState,
      // Add computed metrics
      metrics: {
        powerOutput: (this.vehicleState.engineRPM * this.vehicleState.speed) / 1000,
        efficiency: this.vehicleState.speed > 0 ? this.vehicleState.fuelLevel / this.vehicleState.speed : 0,
        anomalyScore: this.calculateAnomalyScore()
      }
    }

    this.subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error broadcasting sensor data:', error)
      }
    })
  }

  /**
   * Calculate simple anomaly score based on sensor values
   */
  calculateAnomalyScore() {
    const state = this.vehicleState
    let score = 0

    // High wheel slip
    if (state.wheelSlip > 20) score += (state.wheelSlip - 20) / 80

    // High temperature
    if (state.temperature > 90) score += (state.temperature - 90) / 20

    // Extreme acceleration
    if (Math.abs(state.acceleration) > 4) score += (Math.abs(state.acceleration) - 4) / 6

    // Extreme steering
    if (Math.abs(state.steeringAngle) > 30) score += (Math.abs(state.steeringAngle) - 30) / 15

    return Math.min(1, score) // Normalize to 0-1
  }

  /**
   * Get current sensor state
   */
  getCurrentState() {
    return { ...this.vehicleState }
  }

  /**
   * Update simulation configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
  }
}

module.exports = SensorSimulationService
