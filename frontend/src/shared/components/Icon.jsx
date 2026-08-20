export default function Icon({ name, filled, className = '', size }) {
  const style = filled ? { fontVariationSettings: "'FILL' 1" } : undefined
  const sizeClass = size ? `text-[${size}px]` : ''
  return (
    <span
      className={`material-symbols-outlined ${sizeClass} ${className}`}
      style={style}
      aria-hidden="true"
    >
      {name}
    </span>
  )
}
