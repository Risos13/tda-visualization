import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const BarcodeChart = ({ data }) => {
  const svgRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 60 }
    const parentWidth = Math.max(0, containerRef.current.clientWidth)
    const width = Math.max(240, parentWidth) - margin.left - margin.right
    const height = 200 - margin.top - margin.bottom

    const totalW = width + margin.left + margin.right
    const totalH = height + margin.top + margin.bottom

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Handle different data formats
    let allIntervals = []
    
    if (data.barcodes) {
      // New format from backend
      allIntervals = data.barcodes.map((d, i) => 
        d.intervals.map((interval, j) => ({
          dimension: d.dimension,
          start: interval[0],
          end: interval[1] === -1 ? interval[0] + 2 : interval[1], // Handle infinity
          index: i * 10 + j
        }))
      ).flat()
    } else if (Array.isArray(data)) {
      // Old format or direct array
      allIntervals = data.map((d, i) => {
        if (d.intervals) {
          return d.intervals.map((interval, j) => ({
            dimension: d.dimension || 0,
            start: interval[0],
            end: interval[1] === -1 ? interval[0] + 2 : interval[1],
            index: i * 10 + j
          }))
        } else if (Array.isArray(d)) {
          // Direct interval format
          return {
            dimension: 0,
            start: d[0],
            end: d[1] === -1 ? d[0] + 2 : d[1],
            index: i
          }
        }
        return null
      }).flat().filter(Boolean)
    }

    if (allIntervals.length === 0) return

    // Get unique dimensions
    const dimensions = [...new Set(allIntervals.map(d => d.dimension))].sort()
    const maxTime = Math.max(...allIntervals.map(d => d.end))

    // Scales
    const xScale = d3.scaleLinear()
      .domain([0, maxTime])
      .range([0, width])

    const yScale = d3.scaleBand()
      .domain(dimensions.map(d => `Dimension ${d}`))
      .range([0, height])
      .padding(0.1)

    // Color scale for dimensions
    const colorScale = d3.scaleOrdinal()
      .domain(dimensions)
      .range(['#3b82f6', '#ef4444', '#10b981'])

    // Add barcode lines
    svg.selectAll('.barcode-line')
      .data(allIntervals)
      .enter()
      .append('line')
      .attr('class', 'barcode-line')
      .attr('x1', d => xScale(d.start))
      .attr('x2', d => xScale(d.end))
      .attr('y1', d => yScale(`Dimension ${d.dimension}`) + yScale.bandwidth() / 2)
      .attr('y2', d => yScale(`Dimension ${d.dimension}`) + yScale.bandwidth() / 2)
      .attr('stroke', d => colorScale(d.dimension))
      .attr('stroke-width', 3)

    // Add birth points
    svg.selectAll('.birth-point')
      .data(allIntervals)
      .enter()
      .append('circle')
      .attr('class', 'birth-point')
      .attr('cx', d => xScale(d.start))
      .attr('cy', d => yScale(`Dimension ${d.dimension}`) + yScale.bandwidth() / 2)
      .attr('r', 3)
      .attr('fill', d => colorScale(d.dimension))

    // Add death points
    svg.selectAll('.death-point')
      .data(allIntervals)
      .enter()
      .append('circle')
      .attr('class', 'death-point')
      .attr('cx', d => xScale(d.end))
      .attr('cy', d => yScale(`Dimension ${d.dimension}`) + yScale.bandwidth() / 2)
      .attr('r', 3)
      .attr('fill', d => colorScale(d.dimension))

    // Add axes
    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)

    svg.append('g')
      .call(yAxis)

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + margin.bottom - 5)
      .style('text-anchor', 'middle')
      .text('Time')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .text('Homology Dimension')

  }, [data])

  // Redraw on resize
  useEffect(() => {
    const handle = () => {
      if (data) {
        if (svgRef.current) {
          d3.select(svgRef.current).attr('data-resize-ts', Date.now())
        }
      }
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [data])

  return (
    <div ref={containerRef} className="flex justify-center w-full">
      <svg ref={svgRef} className="tda-chart"></svg>
    </div>
  )
}

export default BarcodeChart
