import React, { useState, useEffect } from 'react'
import { useStreaming } from '../contexts/StreamingContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'

const SensorDashboard = () => {
  const {
    connected,
    sensorData,
    sensorHistory,
    anomalyAlerts,
    simulationRunning,
    subscriptions,
    subscribeToSensorStream,
    unsubscribeFromSensorStream,
    subscribeToAnomalyAlerts,
    unsubscribeFromAnomalyAlerts,
    startSimulation,
    stopSimulation,
    clearHistory,
    clearAlerts
  } = useStreaming()

  const [selectedMetrics, setSelectedMetrics] = useState({
    speed: true,
    acceleration: true,
    wheelSlip: false,
    engineRPM: false,
    temperature: false
  })

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const formatChartData = () => {
    return sensorHistory.slice(-50).map(data => ({
      time: formatTime(data.timestamp),
      timestamp: data.timestamp,
      speed: Math.round(data.speed * 10) / 10,
      acceleration: Math.round(data.acceleration * 100) / 100,
      wheelSlip: Math.round(data.wheelSlip * 10) / 10,
      engineRPM: Math.round(data.engineRPM),
      temperature: Math.round(data.temperature * 10) / 10,
      anomalyScore: Math.round(data.metrics?.anomalyScore * 1000) / 1000
    }))
  }

  const getStatusColor = (value, type) => {
    switch (type) {
      case 'speed':
        return value > 80 ? 'text-red-600' : value > 50 ? 'text-yellow-600' : 'text-green-600'
      case 'acceleration':
        return Math.abs(value) > 3 ? 'text-red-600' : Math.abs(value) > 1.5 ? 'text-yellow-600' : 'text-green-600'
      case 'wheelSlip':
        return value > 20 ? 'text-red-600' : value > 10 ? 'text-yellow-600' : 'text-green-600'
      case 'temperature':
        return value > 90 ? 'text-red-600' : value > 70 ? 'text-yellow-600' : 'text-green-600'
      case 'anomaly':
        return value > 0.7 ? 'text-red-600' : value > 0.3 ? 'text-yellow-600' : 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Connection Status & Controls */}
      <div className="bg-red-50 rounded-lg shadow-md p-3 mb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-red-900">Real-time Sensor Dashboard</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Stream Controls */}
          <div className="space-y-2">
            <button
              onClick={subscriptions.sensorStream ? unsubscribeFromSensorStream : subscribeToSensorStream}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                subscriptions.sensorStream
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              {subscriptions.sensorStream ? 'Stop Stream' : 'Start Stream'}
            </button>
          </div>

          {/* Simulation Controls */}
          <div className="space-y-2">
            <button
              onClick={simulationRunning ? stopSimulation : startSimulation}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                simulationRunning
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {simulationRunning ? 'Stop Simulation' : 'Start Simulation'}
            </button>
          </div>

          {/* Alert Controls - Hidden as per requirements */}
          <div className="space-y-2 hidden">
            <button
              onClick={subscriptions.anomalyAlerts ? unsubscribeFromAnomalyAlerts : subscribeToAnomalyAlerts}
              className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                subscriptions.anomalyAlerts
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {subscriptions.anomalyAlerts ? 'Disable Alerts' : 'Enable Alerts'}
            </button>
          </div>

          {/* Clear Data */}
          <div className="space-y-2">
            <button
              onClick={clearHistory}
              className="w-full px-4 py-2 rounded-md text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Clear History
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {/* Current Sensor Values */}
        {sensorData && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <h3 className="text-base font-semibold text-red-900 mb-2">Current Sensor Readings</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
              <div className="text-center">
                <div className={`text-xl font-bold ${getStatusColor(sensorData.speed, 'speed')}`}>
                {Math.round(sensorData.speed)}
                </div>
                <div className="text-xs text-gray-500">Speed (km/h)</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${getStatusColor(sensorData.acceleration, 'acceleration')}`}>
                {sensorData.acceleration.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Acceleration (m/s²)</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${getStatusColor(sensorData.wheelSlip, 'wheelSlip')}`}>
                {Math.round(sensorData.wheelSlip)}%
                </div>
                <div className="text-xs text-gray-500">Wheel Slip</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                {Math.round(sensorData.engineRPM)}
                </div>
                <div className="text-xs text-gray-500">Engine RPM</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${getStatusColor(sensorData.temperature, 'temperature')}`}>
                {Math.round(sensorData.temperature)}°C
                </div>
                <div className="text-xs text-gray-500">Temperature</div>
              </div>
              <div className="text-center">
                <div className={`text-xl font-bold ${getStatusColor(sensorData.metrics?.anomalyScore || 0, 'anomaly')}`}>
                {((sensorData.metrics?.anomalyScore || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-gray-500">Anomaly Score</div>
              </div>
            </div>
          </div>
        )}

        {/* Chart Controls */}
        <div className="bg-white rounded-lg shadow-md p-3">
          <h3 className="text-base font-semibold text-red-900 mb-2">Chart Settings</h3>
          <div className="flex flex-wrap gap-2">
          {Object.entries(selectedMetrics).map(([metric, selected]) => (
            <label key={metric} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => setSelectedMetrics(prev => ({
                  ...prev,
                  [metric]: e.target.checked
                }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 capitalize">
                {metric.replace(/([A-Z])/g, ' $1').trim()}
              </span>
            </label>
          ))}
        </div>
      </div>

        {/* Real-time Charts */}
        {sensorHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <h3 className="text-base font-semibold text-red-900 mb-2">Real-time Sensor Data</h3>
            <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value, name) => [value, name]}
                />
                <Legend />
                
                {selectedMetrics.speed && (
                  <Line 
                    type="monotone" 
                    dataKey="speed" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    name="Speed (km/h)"
                  />
                )}
                {selectedMetrics.acceleration && (
                  <Line 
                    type="monotone" 
                    dataKey="acceleration" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={false}
                    name="Acceleration (m/s²)"
                  />
                )}
                {selectedMetrics.wheelSlip && (
                  <Line 
                    type="monotone" 
                    dataKey="wheelSlip" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    dot={false}
                    name="Wheel Slip (%)"
                  />
                )}
                {selectedMetrics.engineRPM && (
                  <Line 
                    type="monotone" 
                    dataKey="engineRPM" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={false}
                    name="Engine RPM"
                  />
                )}
                {selectedMetrics.temperature && (
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={false}
                    name="Temperature (°C)"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

        {/* Anomaly Score Chart */}
        {sensorHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <h3 className="text-base font-semibold text-red-900 mb-2">Anomaly Detection</h3>
            <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formatChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  domain={[0, 1]}
                />
                <Tooltip 
                  labelFormatter={(value) => `Time: ${value}`}
                  formatter={(value) => [(value * 100).toFixed(1) + '%', 'Anomaly Score']}
                />
                <Area 
                  type="monotone" 
                  dataKey="anomalyScore" 
                  stroke="#DC2626" 
                  fill="#FEE2E2"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

        {/* Anomaly Alerts */}
        {anomalyAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-red-900">Recent Anomaly Alerts</h3>
            <button
              onClick={clearAlerts}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear All
            </button>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {anomalyAlerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded-md">
                <div>
                  <div className="text-sm font-medium text-red-800">{alert.message}</div>
                  <div className="text-xs text-red-600">
                    Affected sensors: {alert.sensors.join(', ')}
                  </div>
                </div>
                <div className="text-xs text-red-500">
                  {formatTime(alert.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

        {/* No Data State */}
        {!subscriptions.sensorStream && (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Sensor Data</h3>
          <p className="text-gray-500 mb-4">
            Start the sensor stream to see real-time vehicle data and anomaly detection.
          </p>
          <button
            onClick={subscribeToSensorStream}
            disabled={!connected}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Start Sensor Stream
          </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default SensorDashboard
