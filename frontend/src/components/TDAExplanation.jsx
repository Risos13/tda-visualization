import React from 'react'

const TDAExplanation = () => {
  return (
    <div className="bg-cyan-50 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-cyan-900 mb-3">
        Understanding Topological Data Analysis
      </h3>
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-cyan-900 mb-2">Persistence Diagram</h4>
          <p className="text-sm text-gray-600 mb-3">
            Each point (birth, death) represents a topological feature that appears at birth time 
            and disappears at death time. Points far from the diagonal represent persistent features.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Points near diagonal: noise or short-lived features</li>
            <li>• Points far from diagonal: significant persistent features</li>
            <li>• Distance from diagonal = persistence (importance)</li>
          </ul>
        </div>
        <div>
          <h4 className="font-medium text-cyan-900 mb-2">Barcode Chart</h4>
          <p className="text-sm text-gray-600 mb-3">
            Each horizontal line represents a topological feature's lifetime. 
            Longer lines indicate more persistent features.
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Dimension 0: connected components</li>
            <li>• Dimension 1: loops/holes</li>
            <li>• Dimension 2: voids/cavities</li>
            <li>• Line length = feature persistence</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default TDAExplanation