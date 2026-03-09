'use client'

export default function Select({
  label,
  options,
  ...props
}: {
  label: string
  options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="mb-6">
      <label className="block text-xl mb-2">{label}</label>
      <select
        className="w-full px-4 py-3 border rounded-lg text-xl"
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
