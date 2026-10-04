import React from 'react'

// Hidden component to force Tailwind to generate specific utilities in production.
// This helps when content scanning/safelist misses some classes during Docker builds.
export default function StyleSentinel() {
  return (
    <div className="hidden
      bg-green-100 bg-blue-100 bg-red-100 bg-yellow-100 bg-orange-50 bg-orange-200
      text-orange-800 text-green-900 text-blue-900 text-red-900 text-yellow-900
      border border-2 border-green-200 border-blue-300 border-red-200 border-yellow-500
      rounded rounded-md rounded-lg p-2 p-3 p-4 p-6 p-8
      bg-white text-gray-900 text-gray-700 text-gray-600 text-gray-500
    ">
      {/* Sentinel classes to ensure inclusion in production CSS */}
    </div>
  )
}
