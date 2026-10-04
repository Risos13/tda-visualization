/**
 * PostgreSQL Database Configuration
 * Production-grade data logging and analytics
 */

const { Pool } = require('pg')

class PostgreSQLService {
  constructor() {
    this.pool = null
    this.isConnected = false
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  async connect() {
    try {
      const config = {
        connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }

      this.pool = new Pool(config)

      // Test connection
      const client = await this.pool.connect()
      await client.query('SELECT NOW()')
      client.release()

      this.isConnected = true
      console.log('✅ PostgreSQL connected successfully')

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('PostgreSQL pool error:', err)
        this.isConnected = false
      })

    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error.message)
      this.isConnected = false
      throw error
    }
  }

  /**
   * Get database client from pool
   */
  async getClient() {
    if (!this.pool) {
      throw new Error('PostgreSQL pool not initialized')
    }
    return await this.pool.connect()
  }

  /**
   * Execute query with automatic client management
   */
  async query(text, params = []) {
    const client = await this.getClient()
    try {
      const result = await client.query(text, params)
      return result
    } finally {
      client.release()
    }
  }

  /**
   * Log sensor data to PostgreSQL
   */
  async logSensorData(sessionId, sensorData) {
    const query = `
      INSERT INTO sensor_data.sensor_readings (
        session_id, timestamp, speed, acceleration, wheel_slip, 
        engine_rpm, brake_force, steering_angle, temperature, 
        fuel_level, anomaly_score, is_anomaly
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `

    const values = [
      sessionId,
      new Date(sensorData.timestamp),
      sensorData.speed,
      sensorData.acceleration,
      sensorData.wheelSlip,
      sensorData.engineRPM,
      sensorData.brakeForce,
      sensorData.steeringAngle,
      sensorData.temperature,
      sensorData.fuelLevel,
      sensorData.metrics?.anomalyScore || 0,
      (sensorData.metrics?.anomalyScore || 0) > 0.5
    ]

    return await this.query(query, values)
  }

  /**
   * Create or get vehicle session
   */
  async createSession(userId, sessionName = null) {
    const query = `
      INSERT INTO sensor_data.vehicle_sessions (user_id, session_name, start_time)
      VALUES ($1, $2, NOW())
      RETURNING id, start_time
    `
    
    const result = await this.query(query, [userId, sessionName])
    return result.rows[0]
  }

  /**
   * End vehicle session
   */
  async endSession(sessionId) {
    const query = `
      UPDATE sensor_data.vehicle_sessions 
      SET end_time = NOW(), 
          total_duration = NOW() - start_time,
          total_data_points = (
            SELECT COUNT(*) FROM sensor_data.sensor_readings 
            WHERE session_id = $1
          ),
          anomaly_count = (
            SELECT COUNT(*) FROM sensor_data.sensor_readings 
            WHERE session_id = $1 AND is_anomaly = true
          )
      WHERE id = $1
      RETURNING *
    `
    
    const result = await this.query(query, [sessionId])
    return result.rows[0]
  }

  /**
   * Get session statistics
   */
  async getSessionStats(userId, limit = 10) {
    const query = `
      SELECT * FROM sensor_data.session_summary 
      WHERE user_id = $1 
      ORDER BY start_time DESC 
      LIMIT $2
    `
    
    const result = await this.query(query, [userId, limit])
    return result.rows
  }

  /**
   * Log TDA computation results
   */
  async logTDAComputation(sessionId, computationType, algorithm, parameters, results, computationTime) {
    const query = `
      INSERT INTO sensor_data.tda_computations (
        session_id, computation_type, algorithm, parameters, 
        persistence_diagram, barcodes, computation_time_ms, data_points_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    const values = [
      sessionId,
      computationType,
      algorithm,
      parameters,
      JSON.stringify(results.persistenceDiagram || results.persistence_diagram),
      JSON.stringify(results.barcodes),
      computationTime,
      results.dataPointsCount || 0
    ]

    return await this.query(query, values)
  }

  /**
   * Log user activity
   */
  async logUserActivity(userId, action, resourceType = null, resourceId = null, metadata = {}, ipAddress = null, userAgent = null) {
    const query = `
      INSERT INTO analytics.user_activity (
        user_id, action, resource_type, resource_id, metadata, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `

    const values = [
      userId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(metadata),
      ipAddress,
      userAgent
    ]

    return await this.query(query, values)
  }

  /**
   * Log system metrics
   */
  async logSystemMetric(metricName, value, unit = null, tags = {}) {
    const query = `
      INSERT INTO analytics.system_metrics (metric_name, metric_value, metric_unit, tags)
      VALUES ($1, $2, $3, $4)
    `

    const values = [metricName, value, unit, JSON.stringify(tags)]
    return await this.query(query, values)
  }

  /**
   * Log API request
   */
  async logAPIRequest(userId, method, endpoint, statusCode, responseTime, requestSize = null, responseSize = null, ipAddress = null, userAgent = null) {
    const query = `
      INSERT INTO audit.api_requests (
        user_id, method, endpoint, status_code, response_time_ms, 
        request_size, response_size, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `

    const values = [
      userId, method, endpoint, statusCode, responseTime,
      requestSize, responseSize, ipAddress, userAgent
    ]

    return await this.query(query, values)
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalyticsDashboard(userId) {
    const queries = {
      totalSessions: `
        SELECT COUNT(*) as count FROM sensor_data.vehicle_sessions WHERE user_id = $1
      `,
      totalDataPoints: `
        SELECT COALESCE(SUM(total_data_points), 0) as count 
        FROM sensor_data.vehicle_sessions WHERE user_id = $1
      `,
      totalAnomalies: `
        SELECT COALESCE(SUM(anomaly_count), 0) as count 
        FROM sensor_data.vehicle_sessions WHERE user_id = $1
      `,
      recentActivity: `
        SELECT action, COUNT(*) as count 
        FROM analytics.user_activity 
        WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '7 days'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 5
      `
    }

    const results = {}
    for (const [key, query] of Object.entries(queries)) {
      const result = await this.query(query, [userId])
      results[key] = result.rows
    }

    return results
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData(daysToKeep = 30) {
    const result = await this.query('SELECT sensor_data.cleanup_old_data($1)', [daysToKeep])
    return result.rows[0].cleanup_old_data
  }

  /**
   * Close connection pool
   */
  async close() {
    if (this.pool) {
      await this.pool.end()
      this.isConnected = false
      console.log('PostgreSQL connection pool closed')
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health')
      return { status: 'healthy', connected: this.isConnected }
    } catch (error) {
      return { status: 'unhealthy', error: error.message, connected: false }
    }
  }
}

// Export singleton instance
const postgresService = new PostgreSQLService()

module.exports = postgresService
