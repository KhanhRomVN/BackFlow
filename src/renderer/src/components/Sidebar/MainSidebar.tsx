import { useState } from 'react'
import { cn } from '../../shared/lib/utils'
import { Button } from '../ui/button'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  GraduationCap,
  StickyNote,
  BarChart2,
  BookOpen,
  Mic,
  Headphones,
  PenLine,
  LogOut,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '../../presentation/providers/theme-provider'

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

const menuItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    iconClassName: 'text-[#52aaa5]',
    href: '/'
  },
  {
    icon: GraduationCap,
    label: 'My Course',
    iconClassName: 'text-[#eab308]',
    href: '/my-course'
  },
  {
    icon: StickyNote,
    label: 'Note',
    iconClassName: 'text-[#f43f5e]',
    href: '/note'
  },
  {
    icon: BarChart2,
    label: 'Analytic',
    iconClassName: 'text-[#28b4e0]',
    href: '/analytics'
  },
  {
    icon: BookOpen,
    label: 'Notebook',
    iconClassName: 'text-[#22c55e]',
    href: '/notebook'
  }
]

const practiceItems = [
  {
    label: 'Reading',
    icon: BookOpen,
    iconClassName: 'text-[#6928e0]', // Vibrant purple
    href: '/practice/reading'
  },
  {
    label: 'Listening',
    icon: Headphones,
    iconClassName: 'text-[#ff512f]', // Hot orange-red
    href: '/practice/listening'
  },
  {
    label: 'Speaking',
    icon: Mic,
    iconClassName: 'text-[#03dac6]', // Bright aqua/cyan
    href: '/practice/speaking'
  },
  {
    label: 'Writing',
    icon: PenLine,
    iconClassName: 'text-[#f50057]', // Neon magenta
    href: '/practice/writing'
  }
]

const sidebarVariants = {
  hidden: { x: -300, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 100,
      damping: 20
    }
  }
}

export function Sidebar({ className }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  useTheme()
  const [, setActiveItem] = useState<string>(location.pathname)
  const [practiceOpen, setPracticeOpen] = useState(location.pathname.startsWith('/practice'))

  // Fake user data
  const fakeUser = {
    username: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com'
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={sidebarVariants}
      className={cn(
        'fixed inset-y-0 left-0 w-72 border-r border-[#52aaa5]/10',
        'flex flex-col p-6',
        className
      )}
    >
      {/* Logo */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D3748]">Fluency</h1>
      </div>

      {/* Menu Items */}
      <div className="flex-1 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <div key={item.label}>
            <Button
              variant="ghost"
              className={cn(
                'w-full justify-start gap-3 rounded-2xl py-6 text-base transition-colors',
                location.pathname === item.href
                  ? 'bg-[#52aaa5] text-white hover:bg-[#52aaa5]/90 hover:text-white'
                  : 'text-[#2D3748] hover:bg-[#52aaa5]/10'
              )}
              onClick={() => {
                setActiveItem(item.href)
                item.href && navigate(item.href)
              }}
            >
              <item.icon
                className={cn(
                  'h-5 w-5',
                  location.pathname === item.href ? 'text-white' : item.iconClassName
                )}
              />
              <span>{item.label}</span>
            </Button>
          </div>
        ))}

        {/* Practice menu (collapsible) */}
        <div>
          {/* Standardize Practice icon color logic */}
          {(() => {
            const isPracticeActive = location.pathname.startsWith('/practice')
            const practiceIconColor = isPracticeActive ? 'text-white' : 'text-[#7c3aed]' // Deep violet
            return (
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 rounded-2xl py-6 text-base transition-colors',
                  'text-[#2D3748] hover:bg-[#52aaa5]/10'
                )}
                onClick={() => setPracticeOpen((open) => !open)}
              >
                <BookOpen className={cn('h-5 w-5', practiceIconColor)} />
                <span>Practice</span>
                {practiceOpen ? (
                  <ChevronDown className="ml-auto h-4 w-4" />
                ) : (
                  <ChevronRight className="ml-auto h-4 w-4" />
                )}
              </Button>
            )
          })()}
          {practiceOpen && (
            <div className="pl-8 space-y-1 transition-all">
              {practiceItems.map((sub) => (
                <Button
                  key={sub.label}
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-2 rounded-xl py-3 text-sm transition-colors',
                    location.pathname === sub.href
                      ? 'bg-[#14b8a6] text-white hover:bg-[#14b8a6]/90 hover:text-white'
                      : 'text-[#2D3748] hover:bg-[#14b8a6]/10'
                  )}
                  onClick={() => {
                    setActiveItem(sub.href)
                    navigate(sub.href)
                  }}
                >
                  <sub.icon
                    className={cn(
                      'h-4 w-4',
                      sub.iconClassName // Always use the designated vibrant color
                    )}
                  />
                  <span>{sub.label}</span>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="space-y-2 pt-4 border-t border-[#52aaa5]/10">
        {/* User Info */}
        <div className="px-3 py-2">
          <p className="text-sm font-medium text-[#2D3748]">{fakeUser.username}</p>
          <p className="text-xs text-gray-500">{fakeUser.email}</p>
        </div>

        <div>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-3 rounded-2xl py-4',
              'text-red-500 hover:bg-red-50',
              'transition-colors'
            )}
          >
            <LogOut className="h-4 w-4" />
            <span>Đăng xuất</span>
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
