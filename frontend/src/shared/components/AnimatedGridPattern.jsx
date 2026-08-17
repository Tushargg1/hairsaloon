import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export default function AnimatedGridPattern({ className = '', width = 38, height = 38, numSquares = 18, maxOpacity = .16 }) {
  const id = useId()
  const svgRef = useRef(null)
  const shouldReduceMotion = useReducedMotion()
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [squares, setSquares] = useState([])

  const randomPosition = useCallback(() => [
    Math.floor(Math.random() * size.width / width),
    Math.floor(Math.random() * size.height / height),
  ], [height, size.height, size.width, width])

  useEffect(() => {
    const element = svgRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => {
      const next = entry.contentRect
      setSize((current) => current.width === next.width && current.height === next.height
        ? current : { width: next.width, height: next.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!size.width || !size.height || shouldReduceMotion) return
    setSquares(Array.from({ length: numSquares }, (_, index) => ({ id: index, position: randomPosition(), iteration: 0 })))
  }, [numSquares, randomPosition, shouldReduceMotion, size.height, size.width])

  function moveSquare(squareId) {
    setSquares((current) => current.map((square) => square.id === squareId
      ? { ...square, position: randomPosition(), iteration: square.iteration + 1 } : square))
  }

  return <svg ref={svgRef} className={`magic-grid-pattern ${className}`} aria-hidden="true">
    <defs><pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse"><path d={`M.5 ${height}V.5H${width}`} fill="none" /></pattern></defs>
    <rect width="100%" height="100%" fill={`url(#${id})`} />
    {!shouldReduceMotion && squares.map(({ id: squareId, position, iteration }, index) => <motion.rect
      key={`${squareId}-${iteration}`} width={width - 1} height={height - 1}
      x={position[0] * width + 1} y={position[1] * height + 1}
      initial={{ opacity: 0 }} animate={{ opacity: maxOpacity }}
      transition={{ duration: 3.5, repeat: 1, repeatType: 'reverse', delay: index * .08, repeatDelay: .8 }}
      onAnimationComplete={() => moveSquare(squareId)}
    />)}
  </svg>
}
