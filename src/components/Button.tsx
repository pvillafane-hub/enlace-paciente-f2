'use client'

import React from 'react'

type Variant = 'primary' | 'secondary'

export default function Button({
  children,
  variant = 'primary',
  ...props
}: {
  children: React.ReactNode
  variant?: Variant
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = 'px-6 py-4 rounded-lg text-xl font-semibold'
  const styles =
    variant === 'primary'
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-200 hover:bg-gray-300'

  return (
    <button className={`${base} ${styles}`} {...props}>
      {children}
    </button>
  )
}
