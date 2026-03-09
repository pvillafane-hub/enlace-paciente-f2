'use client'

export default function Input({
  label,
  ...props
}: {
  label: string
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-6">
      <label className="block text-xl mb-2">{label}</label>
      <input
        className="w-full px-4 py-3 border rounded-lg text-xl"
        {...props}
      />
    </div>
  )
}
