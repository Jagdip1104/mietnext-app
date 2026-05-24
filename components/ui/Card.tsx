'use client'
import { HTMLAttributes, ReactNode } from 'react'

type CardPadding = 'sm' | 'md' | 'lg'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: CardPadding
  hover?: boolean
  children: ReactNode
}

const paddingClasses: Record<CardPadding, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  padding = 'md',
  hover = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white border border-[#e8e6e0] rounded-xl ${paddingClasses[padding]} ${hover ? 'transition-colors hover:border-[#1a1a1a] cursor-pointer' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
