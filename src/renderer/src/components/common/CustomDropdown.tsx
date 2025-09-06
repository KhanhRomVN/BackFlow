import React, { useRef, useEffect } from 'react'
import { cn } from '../../shared/lib/utils'

export interface DropdownOption {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
}

interface CustomDropdownProps {
  open: boolean
  onClose: () => void
  options: DropdownOption[]
  anchorRef: React.RefObject<HTMLButtonElement>
  className?: string
  alignLeft?: boolean // custom prop: if true, align dropdown to left of anchor (for right-edge avatars)
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  open,
  onClose,
  options,
  anchorRef,
  className,
  alignLeft = false
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!open) return

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose, anchorRef])

  // Position: absolute below anchor; supports alignLeft (dropdown grows to left of anchor)
  const [style, setStyle] = React.useState<React.CSSProperties>({})
  useEffect(() => {
    if (open && anchorRef.current && dropdownRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect()
      if (alignLeft) {
        setStyle({
          position: 'fixed',
          right: window.innerWidth - anchorRect.right,
          top: anchorRect.bottom + 8,
          zIndex: 50,
          minWidth: anchorRect.width + 40 < 160 ? 160 : anchorRect.width + 16
        })
      } else {
        setStyle({
          position: 'fixed',
          left: anchorRect.left,
          top: anchorRect.bottom + 8,
          zIndex: 50,
          minWidth: anchorRect.width + 40 < 160 ? 160 : anchorRect.width + 16
        })
      }
    }
  }, [open, anchorRef, className, alignLeft])

  if (!open) return null

  return (
    <div
      ref={dropdownRef}
      className={cn(
        'rounded-xl shadow-lg border border-[#eaebee] bg-white dark:bg-[#181d28] py-2 px-2',
        'transition-opacity animate-in fade-in z-50',
        'mt-1',
        className,
        alignLeft ? 'align-dropdown-left' : ''
      )}
      style={style}
    >
      <ul>
        {options.map((option) => (
          <li key={option.label}>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 rounded-lg text-[#2D3748] dark:text-white hover:bg-[#f0fdfa] hover:text-[#52aaaf] transition-colors text-base'
              )}
              type="button"
              onClick={() => {
                option.onClick?.()
                onClose()
              }}
            >
              {option.icon && <span className="w-5 h-5">{option.icon}</span>}
              <span>{option.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CustomDropdown
