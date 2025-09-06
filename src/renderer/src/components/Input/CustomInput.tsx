import React, {
  useState,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  KeyboardEvent
} from 'react'

export interface CustomInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void
  onFocus?: () => void
  onBlur?: () => void
  disabled?: boolean
  onFocusChange?: (focused: boolean) => void
  [key: string]: any
}

export interface CustomInputHandle {
  focus: () => void
}

export const CustomInput = forwardRef<CustomInputHandle, CustomInputProps>(
  (
    {
      value,
      onChange,
      className = '',
      onKeyDown,
      onFocus,
      onBlur,
      disabled = false,
      onFocusChange,
      ...rest
    },
    ref
  ) => {
    const [, setIsFocused] = useState(false)
    const divRef = useRef<HTMLDivElement>(null)
    const isFocusedRef = useRef(false)

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          divRef.current?.focus()
        }
      }),
      []
    )

    const recalcHeight = () => {
      const el = divRef.current
      if (!el) return
      if (isFocusedRef.current || (el.innerText ?? '').trim() !== '') {
        el.style.height = 'auto'
        el.style.height = `${el.scrollHeight}px`
      } else {
        el.style.height = '20px'
      }
    }

    useEffect(() => {
      const el = divRef.current
      if (el && el.innerText !== value) {
        el.innerText = value
        recalcHeight()
      }
    }, [value])

    // Handle paste to strip formatting
    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }

    const handleInput = () => {
      const el = divRef.current
      if (!el || disabled) return
      const text = el.innerText ?? ''
      onChange(text)
      recalcHeight()
    }

    useEffect(() => {
      const el = divRef.current
      if (!el) return
      requestAnimationFrame(() => {
        if (!el) return
        recalcHeight()
      })
    }, [value])

    return (
      <div
        className={`relative w-full min-w-0 overflow-hidden whitespace-normal ${className} rounded-lg border border-[#ddd] p-2 bg-[#fdfdfb] ${
          disabled ? 'bg-[#fdfdfb] cursor-not-allowed opacity-70' : ''
        }`}
        style={{ borderRadius: 8, ...(rest.style || {}) }}
        {...rest}
      >
        <div
          ref={divRef}
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          onInput={handleInput}
          onPaste={handlePaste}
          onFocus={() => {
            if (disabled) return
            setIsFocused(true)
            isFocusedRef.current = true
            onFocus?.()
            onFocusChange?.(true)
            recalcHeight()
          }}
          onBlur={() => {
            setIsFocused(false)
            isFocusedRef.current = false
            onBlur?.()
            onFocusChange?.(false)
            recalcHeight()
          }}
          onKeyDown={onKeyDown}
          className="w-full break-words break-all whitespace-normal outline-none bg-transparent text-[#2D3748] min-h-[20px] relative"
          style={{
            minHeight: 20,
            whiteSpace: 'pre-wrap',
            boxSizing: 'border-box',
            wordBreak: 'break-all',
            overflowWrap: 'break-word',
            wordWrap: 'break-word',
            overflow: 'auto',
            pointerEvents: disabled ? 'none' : 'auto'
          }}
          aria-disabled={disabled}
        />
      </div>
    )
  }
)

CustomInput.displayName = 'CustomInput'
