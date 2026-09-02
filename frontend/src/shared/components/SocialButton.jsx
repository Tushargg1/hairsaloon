const ICONS = {
  instagram: (
    <svg height={26} viewBox="0 0 128 128" width={26} xmlns="http://www.w3.org/2000/svg">
      <linearGradient id="ig-grad" gradientTransform="matrix(1 0 0 -1 594 633)" gradientUnits="userSpaceOnUse" x1="-566.711" x2="-493.288" y1="516.569" y2="621.43">
        <stop offset={0} stopColor="#ffb900" />
        <stop offset={1} stopColor="#9100eb" />
      </linearGradient>
      <circle cx={64} cy={64} fill="url(#ig-grad)" r={64} />
      <g fill="#fff">
        <path d="m82.333 104h-36.666c-11.947 0-21.667-9.719-21.667-21.667v-36.666c0-11.948 9.72-21.667 21.667-21.667h36.666c11.948 0 21.667 9.719 21.667 21.667v36.667c0 11.947-9.719 21.666-21.667 21.666zm-36.666-73.333c-8.271 0-15 6.729-15 15v36.667c0 8.271 6.729 15 15 15h36.666c8.271 0 15-6.729 15-15v-36.667c0-8.271-6.729-15-15-15z" />
        <path d="m64 84c-11.028 0-20-8.973-20-20 0-11.029 8.972-20 20-20s20 8.971 20 20c0 11.027-8.972 20-20 20zm0-33.333c-7.352 0-13.333 5.981-13.333 13.333 0 7.353 5.981 13.333 13.333 13.333s13.333-5.98 13.333-13.333c0-7.352-5.98-13.333-13.333-13.333z" />
        <circle cx="85.25" cy="42.75" r="4.583" />
      </g>
    </svg>
  ),
  youtube: (
    <svg fill="none" height={26} viewBox="0 0 120 120" width={26} xmlns="http://www.w3.org/2000/svg">
      <path d="m120 60c0 33.1371-26.8629 60-60 60s-60-26.8629-60-60 26.8629-60 60-60 60 26.8629 60 60z" fill="#cd201f" />
      <path d="m25 49c0-7.732 6.268-14 14-14h42c7.732 0 14 6.268 14 14v22c0 7.732-6.268 14-14 14h-42c-7.732 0-14-6.268-14-14z" fill="#fff" />
      <path d="m74 59.5-21 10.8253v-21.6506z" fill="#cd201f" />
    </svg>
  ),
  facebook: (
    <svg xmlns="http://www.w3.org/2000/svg" width={26} viewBox="0 0 512 512" height={26}>
      <g fillRule="evenodd" clipRule="evenodd">
        <path fill="#3a5ba2" d="m256.23 512c140.58 0 255.77-115.19 255.77-255.77 0-141.046-115.19-256.23-255.77-256.23-141.046 0-256.23 115.184-256.23 256.23 0 140.58 115.184 255.77 256.23 255.77z" />
        <path fill="#fff" d="m224.023 160.085c0-35.372 28.575-63.946 63.938-63.946h48.072v63.946h-32.199c-8.608 0-15.873 7.257-15.873 15.873v32.192h48.072v63.938h-48.072v144.22h-63.938v-144.22h-48.065v-63.938h48.065z" />
      </g>
    </svg>
  ),
}

const BEFORE_BG = {
  instagram: 'radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
  youtube: '#cd201f',
  facebook: '#3a5ba2',
}

const BORDER = {
  instagram: '#FFB700',
  youtube: '#cd201f',
  facebook: '#3a5ba2',
}

export default function SocialButton({ brand, label, url }) {
  const icon = ICONS[brand]
  if (!icon) return null
  return (
    <a href={url} target="_blank" rel="noreferrer" aria-label={label} className="social-btn"
      style={{ '--social-border': BORDER[brand] }}>
      <span className="social-btn-icon" style={{ '--social-before': BEFORE_BG[brand] }}>{icon}</span>
      <span className="social-btn-text">{label}</span>
    </a>
  )
}
