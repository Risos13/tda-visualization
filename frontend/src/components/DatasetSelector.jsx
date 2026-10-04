import React from 'react'

const DatasetSelector = ({ selectedDataset, onDatasetChange }) => {
  const datasets = [
    { id: 'circle', name: 'Circle', description: 'Points sampled from a circle' },
    { id: 'sine', name: 'Sine Wave', description: 'Time series from a sine wave' }
  ]

  return (
    <div className="bg-yellow-50 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-yellow-900 mb-3">
        Select Dataset
      </h3>
      <div className="grid grid-cols-1 gap-3">
        {datasets.map((dataset) => (
          <button
            key={dataset.id}
            onClick={() => onDatasetChange(dataset.id)}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedDataset === dataset.id
                ? 'border-yellow-500 bg-yellow-100'
                : 'border-gray-200 hover:border-yellow-300 hover:bg-yellow-50'
            }`}
          >
            <div className="text-left">
              <h4 className="font-medium text-gray-900">{dataset.name}</h4>
              <p className="text-sm text-gray-600">{dataset.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default DatasetSelector