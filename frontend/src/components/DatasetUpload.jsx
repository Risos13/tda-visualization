import React, { useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../contexts/NotificationContext';

const DatasetUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dataType: 'point_cloud'
  });

  const { token } = useAuth();
  const { addNotification } = useNotifications();
  const API_URL = import.meta.env.VITE_API_URL || '/api';

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/json',
      'text/plain'
    ];
    if (!allowedTypes.includes(file.type)) {
      const errorMsg = 'Invalid file type. Please upload CSV, JSON, or TXT files.';
      setError(errorMsg);
      addNotification('error', errorMsg);
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      const errorMsg = 'File size too large. Maximum size is 10MB.';
      setError(errorMsg);
      addNotification('error', errorMsg);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('dataset', file);
      uploadFormData.append('name', formData.name || file.name);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('dataType', formData.dataType);

      const response = await fetch(`${API_URL}/datasets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadProgress(100);
        addNotification('success', 'Dataset uploaded successfully!');
        if (onUploadSuccess) {
          onUploadSuccess(result.data);
        }
        // Reset form
        setFormData({
          name: '',
          description: '',
          dataType: 'point_cloud'
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to upload dataset';
      setError(errorMsg);
      addNotification('error', errorMsg);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="bg-blue-50 rounded-lg shadow-md p-3 h-full flex flex-col overflow-hidden">
      <h3 className="text-base font-semibold text-blue-900 mb-2 flex-shrink-0">
        Upload Dataset
      </h3>

      <div className="flex-1 overflow-y-auto">
        {/* Upload Form */}
        <div className="space-y-2 mb-3">
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
              Dataset Name (optional)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Leave empty to use filename"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-xs font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe your dataset..."
            />
          </div>

          <div>
            <label htmlFor="dataType" className="block text-xs font-medium text-gray-700 mb-1">
              Data Type
            </label>
            <select
              id="dataType"
              name="dataType"
              value={formData.dataType}
              onChange={handleInputChange}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option value="point_cloud">Point Cloud</option>
              <option value="time_series">Time Series</option>
            </select>
          </div>
        </div>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-100'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="fileInput"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept=".csv,.json,.txt"
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto"></div>
            <div>
              <p className="text-gray-600">Uploading...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">
                Drop your dataset here
              </p>
              <p className="text-sm text-gray-600">
                or <span className="text-indigo-600 font-medium">browse files</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                CSV, JSON, TXT, PNG, JPG, SVG (max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

        {/* Error Display */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

        {/* Success Message */}
        {uploadProgress === 100 && !error && (
          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">Dataset uploaded successfully!</p>
            </div>
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatasetUpload;
