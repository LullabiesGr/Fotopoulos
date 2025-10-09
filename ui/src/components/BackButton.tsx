import React from 'react'
import { useNavigate } from 'react-router-dom'

export function BackButton({ className = '' }: { className?: string }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(-1)}
      className={`px-3 py-2 rounded border hover:bg-gray-50 ${className}`}
      title="Πίσω"
    >
      ← Πίσω
    </button>
  )
}
