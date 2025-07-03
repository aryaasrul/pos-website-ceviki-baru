import React from 'react'

const LoadingSpinner = ({ 
  size = 'default', 
  message = 'Loading...', 
  fullScreen = false,
  className = '' 
}) => {
  const sizeClasses = {
    small: 'h-6 w-6',
    default: 'h-12 w-12',
    large: 'h-16 w-16'
  }

  const containerClasses = fullScreen 
    ? 'min-h-screen flex items-center justify-center bg-gray-100'
    : 'flex items-center justify-center p-8'

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="text-center">
        <div 
          className={`animate-spin rounded-full border-b-2 border-blue-600 mx-auto ${sizeClasses[size]}`}
          role="status"
          aria-label="Loading"
        >
          <span className="sr-only">Loading...</span>
        </div>
        {message && (
          <p className="mt-4 text-gray-600 font-medium text-sm md:text-base">
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

export default LoadingSpinner

// Export variant khusus untuk full page loading
export const PageLoader = ({ message = 'Loading page...' }) => (
  <LoadingSpinner fullScreen message={message} />
)

// Export variant untuk component loading
export const ComponentLoader = ({ message = 'Loading...' }) => (
  <LoadingSpinner message={message} />
)

// Export variant untuk button loading
export const ButtonLoader = () => (
  <LoadingSpinner size="small" message="" className="inline-flex p-0" />
)