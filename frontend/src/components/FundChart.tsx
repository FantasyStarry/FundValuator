"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface FundChartProps {
  option: any;
  className?: string;
}

export function FundChart({ option, className }: FundChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !option) return;

    // Initialize chart if needed
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }

    // Update option
    chartInstance.current.setOption(option);

    const handleResize = () => {
      chartInstance.current?.resize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      // Do NOT dispose here if we want to reuse the instance, 
      // but since we might unmount, we should dispose.
      // However, to prevent "removeChild" errors, we ensure cleanup is safe.
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, [option]);

  return <div ref={chartRef} className={className} />;
}
