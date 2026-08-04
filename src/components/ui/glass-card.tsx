import React from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface GlassCardProps extends HTMLMotionProps<'div'> {
  children?: React.ReactNode
}

export const GlassCard: React.FC<GlassCardProps> = ({
  className,
  children,
  variants,
  initial = { opacity: 0, y: 15 },
  animate = { opacity: 1, y: 0 },
  exit,
  ...props
}) => {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-md transition-shadow hover:shadow-md',
        className
      )}
      variants={variants}
      initial={initial}
      animate={animate}
      exit={exit}
      {...props}
    >
      {children}
    </motion.div>
  )
}
