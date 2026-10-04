import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { useAuth } from './AuthContext';

const DatasetContext = createContext();

const initialState = {
  datasets: [],
  selectedDataset: null,
  loading: false,
  error: null,
  uploadProgress: 0
};

const datasetReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: null
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };
    case 'FETCH_DATASETS_SUCCESS':
      return {
        ...state,
        datasets: action.payload,
        loading: false,
        error: null
      };
    case 'UPLOAD_DATASET_SUCCESS':
      return {
        ...state,
        datasets: [action.payload, ...state.datasets],
        loading: false,
        error: null
      };
    case 'DELETE_DATASET_SUCCESS':
      return {
        ...state,
        datasets: state.datasets.filter(d => d.id !== action.payload),
        selectedDataset: state.selectedDataset?.id === action.payload ? null : state.selectedDataset,
        loading: false,
        error: null
      };
    case 'SELECT_DATASET':
      return {
        ...state,
        selectedDataset: action.payload
      };
    case 'UPDATE_DATASET':
      return {
        ...state,
        datasets: state.datasets.map(d => 
          d.id === action.payload.id ? { ...d, ...action.payload } : d
        ),
        selectedDataset: state.selectedDataset?.id === action.payload.id 
          ? { ...state.selectedDataset, ...action.payload }
          : state.selectedDataset
      };
    case 'SET_UPLOAD_PROGRESS':
      return {
        ...state,
        uploadProgress: action.payload
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };
    default:
      return state;
  }
};

export const DatasetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(datasetReducer, initialState);
  const { token } = useAuth();
  
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  // Fetch all datasets
  const fetchDatasets = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const response = await fetch(`${API_URL}/datasets`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        dispatch({ type: 'FETCH_DATASETS_SUCCESS', payload: result.data });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to fetch datasets' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error while fetching datasets' });
    }
  }, [token, API_URL]);

  // Upload dataset
  const uploadDataset = useCallback(async (file, metadata) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 0 });

    try {
      const formData = new FormData();
      formData.append('dataset', file);
      formData.append('name', metadata.name || file.name);
      formData.append('description', metadata.description || '');
      formData.append('dataType', metadata.dataType || 'point_cloud');

      const response = await fetch(`${API_URL}/datasets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        dispatch({ type: 'UPLOAD_DATASET_SUCCESS', payload: result.data });
        dispatch({ type: 'SET_UPLOAD_PROGRESS', payload: 100 });
        return result.data;
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [token, API_URL]);

  // Delete dataset
  const deleteDataset = useCallback(async (datasetId) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        dispatch({ type: 'DELETE_DATASET_SUCCESS', payload: datasetId });
      } else {
        dispatch({ type: 'SET_ERROR', payload: result.error || 'Failed to delete dataset' });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Network error while deleting dataset' });
    }
  }, [token, API_URL]);

  // Get dataset details
  const getDataset = useCallback(async (datasetId) => {
    try {
      const response = await fetch(`${API_URL}/datasets/${datasetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch dataset');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [token, API_URL]);

  // Compute TDA for dataset
  const computeTDA = useCallback(async (datasetId) => {
    dispatch({ type: 'SET_LOADING', payload: true });

    try {
      const response = await fetch(`${API_URL}/tda/compute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ datasetId })
      });

      const result = await response.json();

      if (response.ok) {
        // Update dataset status
        dispatch({ 
          type: 'UPDATE_DATASET', 
          payload: { 
            id: datasetId, 
            processingStatus: 'processing' 
          }
        });
        return result.data;
      } else {
        throw new Error(result.error || 'TDA computation failed');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [token, API_URL]);

  // Get TDA results
  const getTDAResults = useCallback(async (datasetId) => {
    try {
      const response = await fetch(`${API_URL}/tda/results/${datasetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch TDA results');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [token, API_URL]);

  // Get TDA status
  const getTDAStatus = useCallback(async (datasetId) => {
    try {
      const response = await fetch(`${API_URL}/tda/status/${datasetId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok) {
        // Update dataset with status info
        dispatch({ 
          type: 'UPDATE_DATASET', 
          payload: { 
            id: datasetId, 
            processingStatus: result.data.status,
            pointCount: result.data.pointCount,
            dimensions: result.data.dimensions
          }
        });
        return result.data;
      } else {
        throw new Error(result.error || 'Failed to fetch TDA status');
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  }, [token, API_URL]);

  // Select dataset
  const selectDataset = useCallback((dataset) => {
    dispatch({ type: 'SELECT_DATASET', payload: dataset });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value = {
    datasets: state.datasets,
    selectedDataset: state.selectedDataset,
    loading: state.loading,
    error: state.error,
    uploadProgress: state.uploadProgress,
    fetchDatasets,
    uploadDataset,
    deleteDataset,
    getDataset,
    computeTDA,
    getTDAResults,
    getTDAStatus,
    selectDataset,
    clearError
  };

  return (
    <DatasetContext.Provider value={value}>
      {children}
    </DatasetContext.Provider>
  );
};

export const useDatasets = () => {
  const context = useContext(DatasetContext);
  if (context === undefined) {
    throw new Error('useDatasets must be used within a DatasetProvider');
  }
  return context;
};

export default DatasetContext;
