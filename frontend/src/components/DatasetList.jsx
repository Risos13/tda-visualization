import React, { useEffect, useRef, useState } from 'react';
import { useDatasets } from '../contexts/DatasetContext';

// Processing timer component
const ProcessingTimer = ({ startTime }) => {
  const [seconds, setSeconds] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - new Date(startTime)) / 1000);
      setSeconds(Math.min(elapsed, 60)); // Cap at 60 seconds
    }, 1000);
    
    return () => clearInterval(interval);
  }, [startTime]);
  
  return (
    <span className="inline-flex items-center ml-2">
      <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span className="text-xs">{seconds}s</span>
      {seconds >= 60 && <span className="text-xs text-red-500 ml-1">(stuck)</span>}
    </span>
  );
};

const DatasetList = ({ onSelectDataset }) => {
  const { 
    datasets, 
    loading, 
    error, 
    fetchDatasets, 
    deleteDataset, 
    computeTDA, 
    getTDAStatus,
    clearError 
  } = useDatasets();
  
  const [processingDatasets, setProcessingDatasets] = useState(new Set());
  // Track polling timers per dataset and mounted state for cleanup
  const pollersRef = useRef({});
  const mountedRef = useRef(true);

  useEffect(() => {
    fetchDatasets();
    return () => {
      // Cleanup all active timers on unmount
      mountedRef.current = false;
      Object.values(pollersRef.current).forEach((timeoutId) => {
        if (timeoutId) clearTimeout(timeoutId);
      });
      pollersRef.current = {};
    };
  }, [fetchDatasets]);

  useEffect(() => {
    clearError();
  }, [clearError]);

  const handleDelete = async (datasetId, datasetName) => {
    if (window.confirm(`Are you sure you want to delete "${datasetName}"?`)) {
      await deleteDataset(datasetId);
    }
  };

  const handleComputeTDA = async (datasetId) => {
    try {
      setProcessingDatasets(prev => new Set(prev).add(datasetId));
      await computeTDA(datasetId);

      // Exponential backoff polling with max timeout
      const MAX_DURATION_MS = 2 * 60 * 1000; // 2 minutes
      const BASE_DELAY_MS = 2000; // 2 seconds base
      const MAX_DELAY_MS = 15000; // cap to 15 seconds
      const startTime = Date.now();

      const stopPolling = () => {
        const t = pollersRef.current[datasetId];
        if (t) clearTimeout(t);
        delete pollersRef.current[datasetId];
      };

      const scheduleNext = async (attempt) => {
        if (!mountedRef.current) return; // do not schedule if unmounted
        const elapsed = Date.now() - startTime;
        if (elapsed >= MAX_DURATION_MS) {
          // Timed out waiting; stop polling and clear processing indicator
          stopPolling();
          setProcessingDatasets(prev => {
            const newSet = new Set(prev);
            newSet.delete(datasetId);
            return newSet;
          });
          return;
        }
        const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS);
        pollersRef.current[datasetId] = setTimeout(async () => {
          try {
            const status = await getTDAStatus(datasetId);
            if (status.status === 'processed' || status.status === 'error') {
              stopPolling();
              setProcessingDatasets(prev => {
                const newSet = new Set(prev);
                newSet.delete(datasetId);
                return newSet;
              });
              return;
            }
            // Continue polling with backoff
            scheduleNext(attempt + 1);
          } catch (err) {
            // On transient error, retry with backoff until timeout
            scheduleNext(attempt + 1);
          }
        }, delay);
      };

      // Kick off polling
      scheduleNext(0);

    } catch (error) {
      setProcessingDatasets(prev => {
        const newSet = new Set(prev);
        newSet.delete(datasetId);
        return newSet;
      });
      // Ensure any pending poller is cleared on failure
      const t = pollersRef.current[datasetId];
      if (t) {
        clearTimeout(t);
        delete pollersRef.current[datasetId];
      }
    }
  };

  const getStatusBadge = (status, dataset) => {
    const badges = {
      uploaded: 'bg-gray-100 text-gray-800',
      processing: 'bg-yellow-100 text-yellow-800',
      processed: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800'
    };

    return (
      <div className="inline-flex items-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badges[status] || badges.uploaded}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
        {status === 'processing' && dataset.updatedAt && (
          <ProcessingTimer startTime={dataset.updatedAt} />
        )}
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && datasets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-lg shadow-md p-4 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-green-900">
          Your Datasets ({datasets.length})
        </h3>
        {loading && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No datasets</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by uploading your first dataset.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {dataset.name}
                    </h4>
                    {getStatusBadge(dataset.processingStatus, dataset)}
                  </div>
                  
                  {dataset.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {dataset.description}
                    </p>
                  )}
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(dataset.fileSize)}</span>
                    <span>{dataset.dataType.replace('_', ' ')}</span>
                    {dataset.pointCount && (
                      <span>{dataset.pointCount} points</span>
                    )}
                    {dataset.dimensions && (
                      <span>{dataset.dimensions}D</span>
                    )}
                    <span>{formatDate(dataset.uploadedAt || dataset.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  {dataset.processingStatus === 'processed' && (
                    <button
                      onClick={() => onSelectDataset && onSelectDataset(dataset)}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      View
                    </button>
                  )}
                  
                  {dataset.processingStatus === 'uploaded' && (
                    <button
                      onClick={() => handleComputeTDA(dataset.id)}
                      disabled={processingDatasets.has(dataset.id)}
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium disabled:opacity-50"
                    >
                      {processingDatasets.has(dataset.id) ? 'Computing...' : 'Compute TDA'}
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(dataset.id, dataset.name)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DatasetList;
