'use client'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-white/5 rounded-lg ${className}`} aria-hidden="true" />
  )
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4" aria-label="Loading...">
      <div className="flex justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

export function PolicySkeleton() {
  return (
    <div className="card flex justify-between items-center" aria-label="Loading policy...">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  )
}
