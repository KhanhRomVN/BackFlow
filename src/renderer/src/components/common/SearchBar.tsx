import { Search } from 'lucide-react'
import { useState } from 'react'

const randomColors = [
  'border-l-[#52aaa5]', // teal
  'border-l-[#f59e42]', // orange
  'border-l-[#a855f7]', // purple
  'border-l-[#eab308]', // yellow
  'border-l-[#22c55e]', // green
  'border-l-[#f43f5e]', // pink
  'border-l-[#28b4e0]' // blue
]

export function SearchBar() {
  const [focused, setFocused] = useState(false)
  const [hovered, setHovered] = useState(false)
  // Pick a random color for left border (per mount/focus)
  const [randomIdx] = useState(() => Math.floor(Math.random() * randomColors.length))

  const borderColorClass = focused || hovered ? randomColors[randomIdx] : 'border-l-transparent'
  return (
    <div className="w-full max-w-lg relative">
      <input
        type="text"
        className={[
          'w-full pl-10 pr-4 py-2 rounded-xl border transition text-base text-[#2D3748] placeholder-gray-400 outline-none',
          'border border-[#a3bfc8]/30', // neutral border
          'bg-transparent', // no bg
          'focus:border-[#52aaa5]/70',
          `border-l-4 ${borderColorClass}`
        ].join(' ')}
        placeholder=""
        autoComplete="off"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        // aria-label="Tìm kiếm"
      />
      {/* Icon + text as placeholder, overlay when input empty */}
      <span
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-gray-400 text-base select-none"
        style={{
          opacity: 'var(--sb-placeholder-opacity, 1)'
        }}
        aria-disabled="true"
      >
        <Search className="w-5 h-5" />
        <span>Tìm kiếm…</span>
      </span>
      {/* JS placeholder show/hide */}
      <style>
        {`
          .w-full:focus + span,
          .w-full:not(:placeholder-shown) + span {
            --sb-placeholder-opacity: 0;
          }
        `}
      </style>
    </div>
  )
}
