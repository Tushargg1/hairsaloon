import Icon from './Icon.jsx'

export default function InputField({ label, icon, type = 'text', name, value, onChange, placeholder, required, minLength, maxLength, autoComplete, readOnly, inputMode, children }) {
  return (
    <div>
      {label && (
        <label className="block font-body text-label-sm text-on-surface-variant mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <Icon name={icon} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]" />
        )}
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoComplete={autoComplete}
          readOnly={readOnly}
          inputMode={inputMode}
          className={`input-glass w-full rounded py-2.5 text-body-md ${icon ? 'pl-10 pr-3' : 'px-3'}`}
        />
      </div>
      {children}
    </div>
  )
}
