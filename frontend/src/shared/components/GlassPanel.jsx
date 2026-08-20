export default function GlassPanel({ children, className = '', as: Tag = 'div', ...props }) {
  return (
    <Tag className={`glass-panel rounded-xl p-6 ${className}`} {...props}>
      {children}
    </Tag>
  )
}
