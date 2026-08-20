import { Link } from 'react-router-dom'

export default function BrassButton({ children, to, onClick, type = 'button', disabled, className = '', size = 'md', variant = 'primary', icon }) {
  const base = 'inline-flex items-center justify-center gap-1 font-body font-semibold tracking-wide transition-all duration-300 rounded'
  const sizes = {
    sm: 'px-3 py-1.5 text-label-sm',
    md: 'px-6 py-2.5 text-label-md',
    lg: 'px-8 py-3 text-label-md uppercase tracking-wider',
  }
  const variants = {
    primary: 'brass-gradient hover:scale-105 shadow-sm hover:shadow-amber-glow-lg',
    outline: 'border border-secondary text-secondary hover:bg-secondary/10',
    ghost: 'text-secondary hover:text-secondary-fixed hover:bg-surface-container-high/50',
  }
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${disabledClass} ${className}`

  if (to) {
    return <Link to={to} className={classes}>{icon}{children}</Link>
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {icon}{children}
    </button>
  )
}
