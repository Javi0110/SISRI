'use client'

import { useEffect } from 'react'
import { Button } from '@mui/material'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <Button
        variant="contained"
        onClick={reset}
      >
        Try again
      </Button>
    </div>
  )
} 