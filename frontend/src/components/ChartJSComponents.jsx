import React, { useRef, useEffect } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  TimeScale
)

// Real-time Line Chart for Sensor Data
export const SensorLineChart = ({ data, selectedMetrics }) => {
  const chartRef = useRef()

  const formatChartData = () => {
    const datasets = []
    const colors = {
      speed: '#3B82F6',
      acceleration: '#EF4444',
      wheelSlip: '#F59E0B',
      engineRPM: '#10B981',
      temperature: '#8B5CF6',
      anomalyScore: '#DC2626'
    }

    Object.entries(selectedMetrics).forEach(([metric, selected]) => {
      if (selected && data.length > 0) {
        datasets.push({
          label: metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1'),
          data: data.map(point => ({
            x: point.timestamp,
            y: point[metric] || 0
          })),
          borderColor: colors[metric] || '#6B7280',
          backgroundColor: colors[metric] + '20' || '#6B728020',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 4
        })
      }
    })

    return { datasets }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0 // Disable animations for real-time performance
    },
    interaction: {
      intersect: false,
      mode: 'index'
    },
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Real-time Sensor Data'
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            return new Date(context[0].parsed.x).toLocaleTimeString()
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            second: 'HH:mm:ss'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Value'
        },
        beginAtZero: true
      }
    }
  }

  return (
    <div className="h-96">
      <Line ref={chartRef} data={formatChartData()} options={options} />
    </div>
  )
}

// Anomaly Score Area Chart
export const AnomalyAreaChart = ({ data }) => {
  const formatChartData = () => ({
    datasets: [{
      label: 'Anomaly Score',
      data: data.map(point => ({
        x: point.timestamp,
        y: point.anomalyScore || 0
      })),
      borderColor: '#DC2626',
      backgroundColor: '#FEE2E2',
      borderWidth: 2,
      fill: true,
      tension: 0.1,
      pointRadius: 0,
      pointHoverRadius: 4
    }]
  })

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Anomaly Detection Score'
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          displayFormats: {
            second: 'HH:mm:ss'
          }
        },
        title: {
          display: true,
          text: 'Time'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Anomaly Score'
        },
        min: 0,
        max: 1,
        ticks: {
          callback: function(value) {
            return (value * 100).toFixed(0) + '%'
          }
        }
      }
    }
  }

  return (
    <div className="h-64">
      <Line data={formatChartData()} options={options} />
    </div>
  )
}

// Sensor Status Bar Chart
export const SensorStatusChart = ({ currentData }) => {
  if (!currentData) return null

  const data = {
    labels: ['Speed', 'Acceleration', 'Wheel Slip', 'Engine RPM', 'Temperature', 'Anomaly Score'],
    datasets: [{
      label: 'Current Values',
      data: [
        currentData.speed || 0,
        Math.abs(currentData.acceleration || 0) * 10, // Scale for visibility
        currentData.wheelSlip || 0,
        (currentData.engineRPM || 0) / 100, // Scale down for visibility
        currentData.temperature || 0,
        (currentData.metrics?.anomalyScore || 0) * 100
      ],
      backgroundColor: [
        '#3B82F6',
        '#EF4444',
        '#F59E0B',
        '#10B981',
        '#8B5CF6',
        '#DC2626'
      ],
      borderColor: [
        '#2563EB',
        '#DC2626',
        '#D97706',
        '#059669',
        '#7C3AED',
        '#B91C1C'
      ],
      borderWidth: 1
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Current Sensor Status'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Normalized Values'
        }
      }
    }
  }

  return (
    <div className="h-64">
      <Bar data={data} options={options} />
    </div>
  )
}

// Vehicle Status Doughnut Chart
export const VehicleStatusChart = ({ currentData }) => {
  if (!currentData) return null

  const getStatusColor = (value, type) => {
    switch (type) {
      case 'speed':
        return value > 80 ? '#EF4444' : value > 50 ? '#F59E0B' : '#10B981'
      case 'temperature':
        return value > 90 ? '#EF4444' : value > 70 ? '#F59E0B' : '#10B981'
      case 'anomaly':
        return value > 0.7 ? '#EF4444' : value > 0.3 ? '#F59E0B' : '#10B981'
      default:
        return '#6B7280'
    }
  }

  const anomalyScore = currentData.metrics?.anomalyScore || 0
  const normalScore = 1 - anomalyScore

  const data = {
    labels: ['Normal Operation', 'Anomaly Risk'],
    datasets: [{
      data: [normalScore * 100, anomalyScore * 100],
      backgroundColor: [
        getStatusColor(anomalyScore, 'anomaly'),
        '#EF4444'
      ],
      borderColor: [
        '#FFFFFF',
        '#FFFFFF'
      ],
      borderWidth: 2
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Vehicle Health Status'
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return context.label + ': ' + context.parsed.toFixed(1) + '%'
          }
        }
      }
    }
  }

  return (
    <div className="h-64">
      <Doughnut data={data} options={options} />
    </div>
  )
}

// Historical Performance Chart
export const PerformanceHistoryChart = ({ sessionData }) => {
  if (!sessionData || sessionData.length === 0) return null

  const data = {
    labels: sessionData.map(session => 
      new Date(session.start_time).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Average Speed (km/h)',
        data: sessionData.map(session => session.avg_speed || 0),
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F620',
        yAxisID: 'y'
      },
      {
        label: 'Max Anomaly Score (%)',
        data: sessionData.map(session => (session.max_anomaly_score || 0) * 100),
        borderColor: '#EF4444',
        backgroundColor: '#EF444420',
        yAxisID: 'y1'
      }
    ]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: 'Historical Performance Trends'
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Speed (km/h)'
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Anomaly Score (%)'
        },
        grid: {
          drawOnChartArea: false
        }
      }
    }
  }

  return (
    <div className="h-80">
      <Line data={data} options={options} />
    </div>
  )
}
