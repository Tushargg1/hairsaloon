import Icon from './Icon.jsx'

export default function StarRating({ rating, max = 5, size = 16, interactive, onChange }) {
  const stars = []
  for (let i = 1; i <= max; i++) {
    const filled = i <= Math.floor(rating)
    const half = !filled && i - 0.5 <= rating
    stars.push(
      <button
        key={i}
        type={interactive ? 'button' : undefined}
        onClick={interactive ? () => onChange?.(i) : undefined}
        className={interactive ? 'cursor-pointer' : 'cursor-default'}
        disabled={!interactive}
        aria-label={`${i} star${i > 1 ? 's' : ''}`}
      >
        <Icon
          name={half ? 'star_half' : 'star'}
          filled={filled || half}
          className={`text-[${size}px] ${filled || half ? 'text-brass' : 'text-outline-variant'}`}
        />
      </button>
    )
  }
  return <div className="flex items-center">{stars}</div>
}
