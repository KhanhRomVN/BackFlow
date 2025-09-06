import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../shared/lib/utils'

// Mảng template styles: styleName & className
export const buttonTemplateStyles = [
  {
    styleName: 'gradientBlue',
    className:
      'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800'
  },
  {
    styleName: 'minimalOutline',
    className: 'bg-transparent border border-gray-400 text-gray-700 hover:bg-gray-100'
  },
  {
    styleName: 'darkGlass',
    className:
      'bg-black bg-opacity-60 border border-gray-700 text-white shadow-lg backdrop-blur-sm hover:bg-opacity-70'
  },
  {
    styleName: 'limePop',
    className: 'bg-lime-400 text-lime-900 font-bold shadow hover:bg-lime-500'
  },
  {
    styleName: 'dangerRed',
    className: 'bg-red-600 text-white font-semibold shadow-md hover:bg-red-700'
  },
  {
    styleName: 'tealRounded',
    className: `
      flex items-center gap-2 px-4 py-2 rounded-lg
      bg-[#52aaa5] text-white
      border border-[#52aaa5]
      transition-colors duration-200
      hover:bg-[#318e83] hover:text-yellow-100 hover:border-[#318e83]
      active:bg-[#25746b]
    `
  },
  {
    styleName: 'tealGhost',
    className: `
      flex items-center gap-2 px-4 py-2 rounded-lg
      bg-transparent text-[#52aaa5]
      transition-colors duration-200
      hover:bg-[#daf3f2] hover:text-white hover:bg-teal-600
      active:bg-[#cce9e7]
    `
  },
  {
    styleName: 'tealDanger',
    className: `
      flex items-center gap-2 px-4 py-2 rounded-lg
      bg-[#ffebeb] text-[#e55757]
      transition-colors duration-200
      hover:bg-[#eaa2a2] hover:text-white hover:bg-red-400
      active:bg-[#e57373]
    `
  },
  {
    styleName: 'tealNumber',
    className: `
      flex items-center justify-center
      border border-[#52aaaf]
      text-[#52aaaf]
      bg-transparent
      rounded-lg
      font-semibold
      hover:bg-[#52aaaf] hover:text-white
    `
  }
]

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline'
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  templateStyle?: string // styleName, như "gradientBlue"
}

const CustomButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, templateStyle, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    // Tìm template style nếu được truyền
    const matchedTemplate = templateStyle
      ? buttonTemplateStyles.find((x) => x.styleName === templateStyle)
      : undefined

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), matchedTemplate?.className, className)}
        ref={ref}
        {...props}
      />
    )
  }
)

CustomButton.displayName = 'CustomButton'
export { CustomButton, buttonVariants }
