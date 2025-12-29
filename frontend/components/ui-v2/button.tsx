import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils/cn'

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Primary - Orange background
        default:
          'bg-primary text-white shadow-primary hover:bg-primary-600 active:scale-[0.98]',
        // Secondary - White/Dark with border
        secondary:
          'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 dark:bg-surface-dark dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-neutral-800',
        // Ghost - Transparent
        ghost:
          'bg-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-white/5',
        // Destructive - Red
        destructive:
          'bg-error text-white shadow-sm hover:bg-error-600 active:scale-[0.98]',
        // Outline - Border only
        outline:
          'border border-neutral-300 bg-transparent hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-800',
        // Link - Text only
        link: 'text-primary underline-offset-4 hover:underline',
        // Success - Green
        success:
          'bg-success text-white shadow-sm hover:bg-success-600 active:scale-[0.98]',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render as a child component (for use with Link, etc.) */
  asChild?: boolean
  /** Show loading spinner */
  isLoading?: boolean
  /** Icon to show on the left */
  leftIcon?: React.ReactNode
  /** Icon to show on the right */
  rightIcon?: React.ReactNode
}

/**
 * Button component with multiple variants and sizes
 *
 * @example
 * ```tsx
 * <Button>Click me</Button>
 * <Button variant="secondary" size="sm">Small button</Button>
 * <Button isLoading>Loading...</Button>
 * <Button asChild><Link href="/dashboard">Go to dashboard</Link></Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'

    // When using asChild, Slot requires a single React child element
    // We cannot inject leftIcon, rightIcon, or loading spinner
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    // For regular buttons (not asChild), render with all features
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && leftIcon}
        {children}
        {!isLoading && rightIcon}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
