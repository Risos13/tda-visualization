/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    // General utility
    'p-8', 'p-6', 'p-4', 'p-3', 'p-2',
    'px-6', 'py-2',
    'border', 'border-2', 'rounded-lg', 'rounded-md', 'rounded',
    'text-3xl', 'text-xl', 'text-lg', 'text-sm', 'text-xs', 'font-bold', 'font-medium',
    'mb-8', 'mb-6', 'mb-4', 'mb-3', 'mb-2', 'mt-8', 'mt-4',
    'space-y-8', 'space-y-6', 'space-y-4', 'space-y-2',
    'transition-colors', 'text-white',
    'h-screen', 'h-full', 'overflow-y-auto',

    // Gray text used widely
    'text-gray-900', 'text-gray-700', 'text-gray-600', 'text-gray-500',

    // Indigo legacy classes
    'bg-indigo-600', 'hover:bg-indigo-700', 'focus:ring-indigo-500', 'border-indigo-500', 'hover:border-indigo-300', 'bg-indigo-50', 'text-indigo-700', 'bg-indigo-100',

    // Blue theme (Upload)
    'bg-blue-50', 'bg-blue-100', 'text-blue-900', 'border-blue-300', 'focus:ring-blue-500', 'focus:border-blue-500',
    'border-blue-500', 'border-blue-600', 'text-blue-600',

    // Green theme (Datasets)
    'bg-green-50', 'bg-green-100', 'text-green-900', 'border-green-200', 'hover:bg-green-100',
    'text-green-600', 'hover:text-green-700', 'text-emerald-600', 'hover:text-emerald-700',

    // Orange theme (Dashboard nav)
    'bg-orange-50', 'bg-orange-200', 'text-orange-800',

    // Yellow theme (Dataset selector / visualizations wrapper)
    'bg-yellow-50', 'bg-yellow-100', 'text-yellow-900', 'border-yellow-500', 'hover:border-yellow-300', 'hover:bg-yellow-50',

    // Red theme (Sensor dashboard)
    'bg-red-50', 'bg-red-100', 'text-red-900', 'text-red-700', 'text-red-600', 'border-red-200', 'border-red-500',

    // Purple theme (Login)
    'bg-gradient-to-br', 'from-purple-50', 'to-pink-100', 'bg-purple-600', 'hover:bg-purple-700', 'focus:ring-purple-500', 'text-purple-600', 'hover:text-purple-500',

    // Emerald/Teal theme (Register)
    'bg-gradient-to-br', 'from-emerald-50', 'to-teal-100', 'bg-emerald-600', 'hover:bg-emerald-700', 'focus:ring-emerald-500', 'text-emerald-600', 'hover:text-emerald-500',

    // Cyan theme (TDAExplanation)
    'bg-cyan-50', 'text-cyan-900',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        }
      }
    },
  },
  plugins: [],
}