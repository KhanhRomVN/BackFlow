import { FC, useMemo, useRef, useState, KeyboardEvent, useEffect } from 'react'
import { ChevronDown, Search, X as XIcon } from 'lucide-react'
import { cn } from '../../shared/lib/utils'
type Option = {
  value: string
  label: string
}

interface CustomComboboxProps {
  label: string
  value: string | string[]
  options: Option[]
  onChange: (value: string | string[]) => void
  className?: string
  placeholder?: string
  searchable?: boolean
  multiple?: boolean
  creatable?: boolean
}

const OPTION_INPUT_THRESHOLD = 10

const CustomCombobox: FC<CustomComboboxProps> = ({
  label,
  value,
  options,
  onChange,
  className,
  placeholder = 'Vui lòng nhập/chọn lựa chọn của bạn...',
  searchable,
  multiple = false,
  creatable = false
}) => {
  const isInput =
    multiple === true
      ? true
      : typeof searchable === 'boolean'
        ? searchable
        : options.length >= OPTION_INPUT_THRESHOLD

  return (
    <ComboboxInput
      label={label}
      value={value}
      options={options}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      multiple={multiple}
      isInput={isInput}
      creatable={creatable}
    />
  )
}

const ComboboxInput: FC<Omit<CustomComboboxProps, 'searchable'> & { isInput?: boolean }> = ({
  label,
  value,
  options,
  onChange,
  className,
  placeholder,
  multiple = false,
  creatable = false
}) => {
  const [input, setInput] = useState('')
  const [showDrop, setShowDrop] = useState(false)
  const [dynamicOptions, setDynamicOptions] = useState<Option[]>([])
  const isMulti = !!multiple
  const inputRef = useRef<HTMLInputElement>(null)

  // --- ADD: Sync dynamicOptions for values from outside (AI, setValue, etc.) ---
  useEffect(() => {
    if (isMulti && Array.isArray(value)) {
      const missing = value.filter(
        (v) =>
          !options.some((opt) => opt.value === v) && !dynamicOptions.some((opt) => opt.value === v)
      )
      if (missing.length > 0) {
        setDynamicOptions((prev) => [
          ...prev,
          ...missing.map((v) => ({
            value: v,
            label: v.charAt(0).toUpperCase() + v.slice(1)
          }))
        ])
      }
    }
    if (!isMulti && typeof value === 'string' && value) {
      if (
        !options.some((opt) => opt.value === value) &&
        !dynamicOptions.some((opt) => opt.value === value)
      ) {
        setDynamicOptions((prev) => [
          ...prev,
          {
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1)
          }
        ])
      }
    }
    // eslint-disable-next-line
  }, [value, options])
  // --- END ADD ---

  // Merge options
  const allOptions = useMemo(
    () => [
      ...options,
      ...dynamicOptions.filter((opt) => !options.some((o) => o.value === opt.value))
    ],
    [options, dynamicOptions]
  )

  // Filtered options
  const filteredOpts = useMemo(() => {
    if (isMulti && Array.isArray(value)) {
      return allOptions
        .filter((opt) => !value.includes(opt.value))
        .filter((opt) =>
          input
            ? opt.label.toLowerCase().includes(input.toLowerCase()) ||
              opt.value.toLowerCase().includes(input.toLowerCase())
            : true
        )
    }
    return input
      ? allOptions.filter(
          (opt) =>
            opt.label.toLowerCase().includes(input.toLowerCase()) ||
            opt.value.toLowerCase().includes(input.toLowerCase())
        )
      : allOptions
  }, [allOptions, input, value, isMulti])

  // Selected options
  const selectedOpts: Option[] =
    isMulti && Array.isArray(value)
      ? allOptions.filter((o) => value.includes(o.value))
      : typeof value === 'string' && value
        ? allOptions.filter((o) => o.value === value)
        : []

  // --- displayValue logic here ---
  let displayValue: string = input
  if (isMulti && Array.isArray(value)) {
    // badges handle display, input is just search
  } else if (
    !isMulti &&
    typeof value === 'string' &&
    value &&
    allOptions.find((o) => o.value === value)
  ) {
    displayValue = input !== '' ? input : allOptions.find((o) => o.value === value)!.label
  }
  // --- END FIX ---

  // Dropdown toggles
  const openDropdown = () => {
    setShowDrop(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }
  const closeDropdown = () => {
    setShowDrop(false)
    setInput('')
  }

  const toggleMulti = (val: string) => {
    if (!isMulti) {
      onChange(val)
      setShowDrop(false)
      return
    }
    const arr = Array.isArray(value) ? value.slice() : []
    if (arr.includes(val)) {
      onChange(arr.filter((v) => v !== val))
    } else {
      onChange([...arr, val])
    }
    setInput('')
    setShowDrop(true)
  }

  // Remove badge for multi
  const handleRemoveBadge = (val: string) => {
    if (!isMulti) return
    const arr = Array.isArray(value) ? value.slice() : []
    onChange(arr.filter((v) => v !== val))
  }

  // Creatable: when pressing Enter, create new tag
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (
      creatable &&
      e.key === 'Enter' &&
      input.trim() !== '' &&
      !allOptions.some((opt) => opt.value.toLowerCase() === input.trim().toLowerCase())
    ) {
      e.preventDefault()
      const newOption: Option = {
        value: input.trim(),
        label: input.trim()
      }
      setDynamicOptions((prev) => [...prev, newOption])
      if (isMulti) {
        const curArr = Array.isArray(value) ? value.slice() : []
        onChange([...curArr, newOption.value])
      } else {
        onChange(newOption.value)
        setShowDrop(false)
      }
      setInput('')
    }
  }

  return (
    <div className={cn('w-full', className)}>
      {label && <label className="block text-sm font-medium text-[#2D3748] mb-2">{label}</label>}
      {/* Input + icons */}
      <div className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            value={displayValue}
            placeholder={placeholder}
            className={cn(
              'w-full px-10 py-2 rounded-xl border border-[#ddd] text-[#2D3748] placeholder-[#718096] focus:outline-none transition-colors bg-transparent focus:border-[#52aaaf]'
            )}
            onChange={(e) => {
              setInput(e.target.value)
              setShowDrop(true)
            }}
            onFocus={() => setShowDrop(true)}
            onBlur={() => setTimeout(() => setShowDrop(false), 100)}
            readOnly={false}
            onKeyDown={handleKeyDown}
          />
          {/* Icon Search */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#718096] pointer-events-none" />
          {showDrop ? (
            <button
              type="button"
              aria-label="Đóng menu"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded transition-colors"
              tabIndex={0}
              onClick={closeDropdown}
            >
              <XIcon className="w-4 h-4 text-[#52aaa5]" />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Mở menu"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-1 rounded transition-colors"
              tabIndex={0}
              onClick={openDropdown}
              onMouseDown={(e) => {
                e.preventDefault()
              }}
            >
              <ChevronDown className="w-4 h-4 text-[#718096] transition-colors hover:text-[#52aaa5]" />
            </button>
          )}
        </div>
        {/* Dropdown */}
        {showDrop && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 w-full max-h-60 overflow-auto bg-white rounded-xl border hover:border-[#52aaa5] py-1">
            {filteredOpts.length === 0 ? (
              <li className="px-4 py-2 text-[#bdbdbd]">
                Không tìm thấy
                {creatable &&
                  input.trim() !== '' &&
                  !allOptions.some(
                    (opt) => opt.value.toLowerCase() === input.trim().toLowerCase()
                  ) && (
                    <div className="text-[#52aaa5] mt-1">
                      Nhấn <b>Enter</b> để tạo "{input.trim()}"
                    </div>
                  )}
              </li>
            ) : (
              filteredOpts.map((opt: Option) => (
                <li
                  key={opt.value}
                  tabIndex={0}
                  className={cn(
                    'px-4 py-2 cursor-pointer hover:bg-[#f0fdfa] hover:text-[#52aaaf]',
                    isMulti && Array.isArray(value)
                      ? value.includes(opt.value)
                        ? 'text-[#2D3748] font-semibold bg-[#e6fffa]'
                        : 'text-[#333]'
                      : value === opt.value
                        ? 'text-[#2D3748] font-semibold bg-[#e6fffa]'
                        : 'text-[#333]'
                  )}
                  onMouseDown={() => toggleMulti(opt.value)}
                >
                  {isMulti && Array.isArray(value) && value.includes(opt.value) && <span>✓ </span>}
                  {opt.label}
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {/* BADGES cho multiple, đặt ngoài input+dropdown */}
      {isMulti && selectedOpts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedOpts.map((opt) => (
            <span
              key={opt.value}
              className="bg-[#52aaa5]/10 text-[#52aaa5] text-sm px-3 py-1 rounded-lg flex items-center gap-1"
            >
              {opt.label}
              <button
                type="button"
                className="ml-1 hover:text-red-500 focus:outline-none"
                onClick={() => handleRemoveBadge(opt.value)}
              >
                <XIcon className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default CustomCombobox
