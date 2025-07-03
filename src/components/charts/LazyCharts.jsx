import React, { Suspense } from 'react'
import { lazyPreload } from '../../utils/lazyPreload.jsx'
import LoadingSpinner from '../common/LoadingSpinner'

// Simple lazy loading untuk recharts - satu per satu component
const LazyLineChart = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.LineChart }))
)

const LazyBarChart = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.BarChart }))
)

const LazyPieChart = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.PieChart }))
)

const LazyAreaChart = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.AreaChart }))
)

const LazyResponsiveContainer = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.ResponsiveContainer }))
)

const LazyXAxis = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.XAxis }))
)

const LazyYAxis = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.YAxis }))
)

const LazyCartesianGrid = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.CartesianGrid }))
)

const LazyTooltip = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Tooltip }))
)

const LazyLegend = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Legend }))
)

const LazyLine = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Line }))
)

const LazyBar = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Bar }))
)

const LazyPie = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Pie }))
)

const LazyCell = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Cell }))
)

const LazyArea = lazyPreload(() => 
  import('recharts').then(module => ({ default: module.Area }))
)

// Chart loading fallback
const ChartLoader = () => (
  <div className="h-64 w-full flex items-center justify-center">
    <LoadingSpinner message="Loading chart..." />
  </div>
)

// Wrapper components yang lebih sederhana
export const LineChartWrapper = ({ children, data, ...props }) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyResponsiveContainer width="100%" height="100%">
      <LazyLineChart data={data} {...props}>
        {children}
      </LazyLineChart>
    </LazyResponsiveContainer>
  </Suspense>
)

export const BarChartWrapper = ({ children, data, ...props }) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyResponsiveContainer width="100%" height="100%">
      <LazyBarChart data={data} {...props}>
        {children}
      </LazyBarChart>
    </LazyResponsiveContainer>
  </Suspense>
)

export const PieChartWrapper = ({ children, ...props }) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyResponsiveContainer width="100%" height="100%">
      <LazyPieChart {...props}>
        {children}
      </LazyPieChart>
    </LazyResponsiveContainer>
  </Suspense>
)

export const AreaChartWrapper = ({ children, data, ...props }) => (
  <Suspense fallback={<ChartLoader />}>
    <LazyResponsiveContainer width="100%" height="100%">
      <LazyAreaChart data={data} {...props}>
        {children}
      </LazyAreaChart>
    </LazyResponsiveContainer>
  </Suspense>
)

// Export individual components untuk fleksibilitas
export {
  LazyXAxis as XAxis,
  LazyYAxis as YAxis,
  LazyCartesianGrid as CartesianGrid,
  LazyTooltip as Tooltip,
  LazyLegend as Legend,
  LazyLine as Line,
  LazyBar as Bar,
  LazyPie as Pie,
  LazyCell as Cell,
  LazyArea as Area
}

// Preload function
export const preloadCharts = () => {
  LazyLineChart.preload()
  LazyBarChart.preload()
  LazyResponsiveContainer.preload()
}