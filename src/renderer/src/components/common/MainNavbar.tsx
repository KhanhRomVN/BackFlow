import { Heart, Bell, Settings, LogOut } from 'lucide-react'
import { cn } from '../../shared/lib/utils'
import CustomDropdown from './CustomDropdown'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const fakeUser = {
  username: 'Nguyễn Văn A',
  email: 'nguyenvana@gmail.com'
}

export default function MainNavbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const avatarRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const handleLogout = () => {
    // Replace with real logout logic.
    console.log('Logging out...')
    // window.location.reload()
  }

  const dropdownOptions = [
    {
      label: 'Setting',
      icon: <Settings className="w-5 h-5" />,
      onClick: () => navigate('/settings')
    },
    {
      label: 'Logout',
      icon: <LogOut className="w-5 h-5" />,
      onClick: handleLogout
    }
  ]

  return (
    <nav
      className={cn(
        'w-full h-14 flex items-center justify-between px-6', // height increased
        'border-b border-[#52aaa5]/10',
        'bg-background',
        'pl-0',
        'sticky top-0 z-30'
      )}
      style={{ minWidth: 0 }}
    >
      <div className="flex items-center gap-4 ml-auto">
        {/* Heart Icon */}
        <button
          className="rounded-full hover:bg-[#f59e4228] transition-colors p-1.5"
          type="button"
          aria-label="Favorites"
          onClick={() => navigate('/favorite')}
        >
          <Heart className="w-5 h-5 text-[#f59e42]" />
        </button>

        {/* Notification Icon */}
        <button
          className="rounded-full hover:bg-[#a855f728] transition-colors p-1.5"
          type="button"
          aria-label="Notifications"
          onClick={() => navigate('/notification')}
        >
          <Bell className="w-5 h-5 text-[#a855f7]" />
        </button>

        {/* User info */}
        <div className="flex flex-col items-end mr-2">
          <span className="font-medium text-sm text-[#2D3748] leading-none">
            {fakeUser.username}
          </span>
          <span className="text-xs font-semibold text-gray-500 leading-tight">
            {fakeUser.email}
          </span>
        </div>

        {/* Avatar as button */}
        <div className="relative">
          <button
            ref={avatarRef}
            className="w-10 h-10 flex items-center justify-center"
            style={{
              background: '#52aaa5',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 16,
              outline: 'none'
            }}
            onClick={() => setDropdownOpen((open) => !open)}
            aria-label="User menu"
            tabIndex={0}
          >
            {fakeUser.username
              .split(' ')
              .map((x) => x[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </button>
          <CustomDropdown
            open={dropdownOpen}
            onClose={() => setDropdownOpen(false)}
            options={dropdownOptions}
            anchorRef={avatarRef}
            alignLeft // always open leftward (for right-edge avatar)
          />
        </div>
      </div>
    </nav>
  )
}
