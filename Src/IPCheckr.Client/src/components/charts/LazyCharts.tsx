import { lazy, Suspense } from "react"
import type { BarChartProps, LineChartProps, RadarChartProps } from "@mui/x-charts"
import Skeleton from "@mui/material/Skeleton"

const BarChartImpl = lazy(() =>
  import("@mui/x-charts").then(m => ({ default: m.BarChart }))
)
const LineChartImpl = lazy(() =>
  import("@mui/x-charts").then(m => ({ default: m.LineChart }))
)
const RadarChartImpl = lazy(() =>
  import("@mui/x-charts").then(m => ({ default: m.RadarChart }))
)

const ChartSkeleton = ({ height }: { height?: number | string }) => (
  <Skeleton variant="rectangular" width="100%" height={height ?? 300} />
)

export const LazyBarChart = (props: BarChartProps) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <BarChartImpl {...props} />
  </Suspense>
)

export const LazyLineChart = (props: LineChartProps) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <LineChartImpl {...props} />
  </Suspense>
)

export const LazyRadarChart = (props: RadarChartProps) => (
  <Suspense fallback={<ChartSkeleton height={props.height} />}>
    <RadarChartImpl {...props} />
  </Suspense>
)