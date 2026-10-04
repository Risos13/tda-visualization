import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const PersistenceDiagram = ({ data }) => {
  const svgRef = useRef()
  const containerRef = useRef()

  useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    const margin = { top: 20, right: 20, bottom: 40, left: 40 }
    const parentWidth = Math.max(0, containerRef.current.clientWidth)
    const width = Math.max(240, parentWidth) - margin.left - margin.right
    const height = 300 - margin.top - margin.bottom

    const totalW = width + margin.left + margin.right
    const totalH = height + margin.top + margin.bottom

    const svg = d3.select(svgRef.current)
      .attr('viewBox', `0 0 ${totalW} ${totalH}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`)

    // Handle both formats: array of objects or birth_death_pairs
    let points = []
    if (data.persistenceDiagram) {
      // New format from backend
      points = data.persistenceDiagram.map(p => ({
        birth: p.birth,
        death: p.death === -1 ? p.birth + 2 : p.death, // Handle infinity
        dimension: p.dimension
      }))
    } else if (data.birth_death_pairs) {
      // Old format
      points = data.birth_death_pairs.map(p => ({
        birth: p[0],
        death: p[1],
        dimension: 0
      }))
    } else if (Array.isArray(data)) {
      // Direct array format
      points = data.map(p => ({
        birth: p.birth || p[0] || 0,
        death: p.death !== undefined ? (p.death === -1 ? p.birth + 2 : p.death) : (p[1] || 1),
        dimension: p.dimension || 0
      }))
    }

    if (points.length === 0) return

    // Scales
    const maxBirth = Math.max(...points.map(p => p.birth))
    const maxDeath = Math.max(...points.map(p => p.death))
    const maxValue = Math.max(maxBirth, maxDeath) * 1.1
    
    const xScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, width])

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([height, 0])

    // Add diagonal line (birth = death)
    svg.append('line')
      .attr('x1', 0)
      .attr('y1', height)
      .attr('x2', width)
      .attr('y2', 0)
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5')

    // Color scale for dimensions
    const colorScale = d3.scaleOrdinal()
      .domain([0, 1, 2])
      .range(['#3b82f6', '#ef4444', '#10b981'])

    // Add points
    svg.selectAll('circle')
      .data(points)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.birth))
      .attr('cy', d => yScale(d.death))
      .attr('r', 4)
      .attr('fill', d => colorScale(d.dimension))
      .attr('stroke', d => d3.color(colorScale(d.dimension)).darker())
      .attr('stroke-width', 1)
      .attr('opacity', 0.8)

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
      .text('Birth Time')

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -height / 2)
      .style('text-anchor', 'middle')
      .text('Death Time')

  }, [data])

  // Redraw on resize
  useEffect(() => {
    const handle = () => {
      if (data) {
        // Trigger redraw by forcing effect to run via changing ref size
        // We simply clear and re-run by updating a noop attribute
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

export default PersistenceDiagram
