import React, { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { DatasetProvider, useDatasets } from './contexts/DatasetContext'
import { StreamingProvider } from './contexts/StreamingContext'
import { NotificationProvider, useNotifications } from './contexts/NotificationContext'
import Notification from './components/Notification'
import AuthWrapper from './components/AuthWrapper'
import DatasetUpload from './components/DatasetUpload'
import DatasetList from './components/DatasetList'
import SensorDashboard from './components/SensorDashboard'
import PersistenceDiagram from './components/PersistenceDiagram'
import BarcodeChart from './components/BarcodeChart'
import DatasetSelector from './components/DatasetSelector'
import TDAExplanation from './components/TDAExplanation'
import StyleSentinel from './components/StyleSentinel'

function Dashboard() {
  const [activeTab, setActiveTab] = useState('datasets')
  const [selectedDataset, setSelectedDataset] = useState('circle')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('static') // 'static' or 'dynamic'
  const { addNotification } = useNotifications()
  
  const { user, logout } = useAuth()
  const { getTDAResults } = useDatasets()

  const loadStaticData = async (dataset) => {
    setLoading(true)
    setError(null)
    
    try {
      const dataPath = import.meta.env.VITE_DATA_PATH || '/data'
      const response = await fetch(`${dataPath}/${dataset}-persistence.json`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      console.error('Error loading TDA data:', err)
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const loadDynamicData = async (dataset) => {
    setLoading(true)
    setError(null)
    
    try {
      const results = await getTDAResults(dataset.id)
      // Transform backend format to frontend format
      const transformedData = {
        persistence_diagram: results.results.persistenceDiagram,
        barcodes: results.results.barcodes
      }
      setData(transformedData)
    } catch (err) {
      console.error('Error loading dynamic TDA data:', err)
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (viewMode === 'static' && typeof selectedDataset === 'string') {
      loadStaticData(selectedDataset)
    } else if (viewMode === 'dynamic' && selectedDataset && typeof selectedDataset === 'object') {
      loadDynamicData(selectedDataset)
    }
  }, [selectedDataset, viewMode])

  const handleDatasetChange = (dataset) => {
    setSelectedDataset(dataset)
  }

  const handleSelectUserDataset = (dataset) => {
    setViewMode('dynamic')
    setSelectedDataset(dataset)
    setActiveTab('visualizations')
  }

  const handleUploadSuccess = (dataset) => {
    // Optionally switch to the uploaded dataset
    console.log('Dataset uploaded successfully:', dataset)
  }

  return (
    <div className="h-screen bg-orange-50 flex flex-col overflow-hidden relative">
      <NotificationManager />
      <StyleSentinel />
      <nav className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-900">XK-Fi TDA Platform</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-2 flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-2 flex-shrink-0">
          <button
            onClick={() => setActiveTab('datasets')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeTab === 'datasets'
                ? 'bg-orange-200 text-orange-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            My Datasets
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeTab === 'upload'
                ? 'bg-orange-200 text-orange-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Upload Dataset
          </button>
          <button
            onClick={() => setActiveTab('streaming')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeTab === 'streaming'
                ? 'bg-orange-200 text-orange-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Real-time Sensors
          </button>
          <button
            onClick={() => {
              setActiveTab('visualizations')
              setViewMode('static')
              setSelectedDataset('circle')
            }}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              activeTab === 'visualizations'
                ? 'bg-orange-200 text-orange-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Visualizations
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'datasets' && (
          <div className="flex-1 overflow-hidden bg-green-100 p-2 rounded">
            <DatasetList onSelectDataset={handleSelectUserDataset} />
          </div>
        )}

        {activeTab === 'upload' && (
          <div className="flex-1 overflow-hidden bg-blue-100 p-2 rounded">
            <div className="max-w-2xl mx-auto h-full">
              <DatasetUpload onUploadSuccess={handleUploadSuccess} />
            </div>
          </div>
        )}

        {activeTab === 'streaming' && (
          <div className="flex-1 overflow-hidden bg-red-100 p-2 rounded">
            <SensorDashboard />
          </div>
        )}

        {activeTab === 'visualizations' && (
          <div className="flex-1 bg-yellow-100 p-2 rounded flex flex-col overflow-hidden">
            <header className="text-center mb-2 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                Topological Data Analysis Visualization
              </h2>
              <p className="text-sm text-gray-600">
                Interactive exploration of persistent homology
              </p>
            </header>

            <div className="flex-1 flex flex-col lg:flex-row gap-2 overflow-hidden">
              <div className="lg:w-1/3 overflow-y-auto">
                {viewMode === 'static' && (
                  <DatasetSelector 
                    selectedDataset={selectedDataset}
                    onDatasetChange={handleDatasetChange}
                  />
                )}
                
                {viewMode === 'dynamic' && selectedDataset && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Selected Dataset
                    </h3>
                    <div className="flex flex-col lg:flex-row gap-2">
                      <p className="font-medium">{selectedDataset.name}</p>
                      {selectedDataset.description && (
                        <p className="text-sm text-gray-600">{selectedDataset.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        {selectedDataset.pointCount} points • {selectedDataset.dimensions}D
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setViewMode('static')
                        setSelectedDataset('circle')
                      }}
                      className="mt-4 text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      ← Back to demo datasets
                    </button>
                  </div>
                )}
                
                <div className="mt-2">
                  <TDAExplanation />
                </div>
              </div>

              <div className="lg:flex-1 overflow-y-auto">
                {loading && (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <p className="text-red-700">{error}</p>
                  </div>
                )}

                {data && !loading && !error && (
                  <div className="flex flex-col lg:flex-row gap-2">
                    <div className="bg-white rounded-lg shadow-md p-3 flex-1 min-w-0 lg:w-1/2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Persistence Diagram
                      </h3>
                      <div className="h-64">
                        <PersistenceDiagram data={data.persistence_diagram} />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-3 flex-1 min-w-0 lg:w-1/2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Barcode Chart
                      </h3>
                      <div className="h-64">
                        <BarcodeChart data={data.barcodes} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <DatasetProvider>
          <StreamingProvider>
            <AppContent />
          </StreamingProvider>
        </DatasetProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

function AppContent() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-700">Loading...</span>
      </div>
    )
  }

  // If user is authenticated, show the dashboard
  if (isAuthenticated && user) {
    console.log('[AppContent] User is authenticated, showing dashboard');
    return <Dashboard />;
  }

  // Otherwise, show the auth forms
  console.log('[AppContent] User not authenticated, showing auth forms');
  return <AuthWrapper />;
}

const NotificationManager = () => {
  const { notifications, removeNotification } = useNotifications()
  
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          type={notification.type}
          message={notification.message}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  )
}

export default App