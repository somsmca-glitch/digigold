import * as React from 'react'
import { motion } from 'framer-motion'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface GoldButtonProps extends ButtonProps {
  whileHover?: any
  whileTap?: any
}

export const GoldButton = React.forwardRef<HTMLButtonElement, GoldButtonProps>(
  ({ className, children, whileHover = { scale: 1.03 }, whileTap = { scale: 0.97 }, ...props }, ref) => (
    <motion.div whileHover={whileHover} whileTap={whileTap} className="inline-block">
      <Button
        ref={ref}
        variant="gold"
        className={cn('font-semibold shadow-md', className)}
        {...props}
      >
        {children}
      </Button>
    </motion.div>
  )
)
GoldButton.displayName = 'GoldButton'
