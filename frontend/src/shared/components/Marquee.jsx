import { useReducedMotion } from 'motion/react'

export default function Marquee({ children, className = '', repeat = 3, pauseOnHover = true }) {
  const shouldReduceMotion = useReducedMotion()
  const count = shouldReduceMotion ? 1 : repeat

  return (
    <div className={`magic-marquee ${pauseOnHover ? 'pause-on-hover' : ''} ${shouldReduceMotion ? 'motion-reduced' : ''} ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div className="magic-marquee-track" aria-hidden={index > 0 || undefined} key={index}>{children}</div>
      ))}
    </div>
  )
}
