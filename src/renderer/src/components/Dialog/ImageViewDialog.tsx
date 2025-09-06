import { FC, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import Drawer from 'react-modern-drawer'
import { Button } from '../ui/button'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import 'react-modern-drawer/dist/index.css'

interface ImageItem {
  src: string
  name?: string
  size?: string
  type?: string
}

interface ImageViewDialogProps {
  open: boolean
  onClose: () => void
  images: ImageItem[]
  currentIndex: number
  onNavigate?: (idx: number) => void
}

export const ImageViewDialog: FC<ImageViewDialogProps> = ({
  open,
  onClose,
  images,
  currentIndex,
  onNavigate
}) => {
  const img =
    images && images.length > 0 && currentIndex >= 0 && currentIndex < images.length
      ? images[currentIndex]
      : undefined
  const atFirst = currentIndex === 0
  const atLast = currentIndex === images.length - 1

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return

      if (e.key === 'Escape') {
        // ADD these two lines:
        e.stopPropagation?.()
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation()

        onClose()
      } else if (
        onNavigate &&
        images.length > 1 &&
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      ) {
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          onNavigate(currentIndex - 1)
        } else if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
          onNavigate(currentIndex + 1)
        }
      }
    },
    [open, onClose, onNavigate, images.length, currentIndex, atFirst, atLast]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [open, handleKeyDown])

  // Lock scroll when modal open
  useEffect(() => {
    if (open) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [open])

  // Custom overlay blocker
  const overlayBlocker = open
    ? ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999998,
            background: 'transparent',
            pointerEvents: 'all'
          }}
          aria-hidden="true"
        />,
        document.body
      )
    : null

  const drawer = ReactDOM.createPortal(
    <Drawer
      open={open}
      onClose={onClose}
      direction="bottom"
      size="100vw"
      style={{
        height: '100dvh',
        maxWidth: '100vw',
        background: '#f6f6f6',
        padding: 0,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999
      }}
      className="!rounded-none"
      overlayColor="rgba(0,0,0,0.7)"
    >
      {img ? (
        <div className="relative w-full h-full flex items-center justify-center bg-transparent select-none">
          {/* File name top center */}
          <div className="absolute top-2 left-0 w-full flex justify-center z-20">
            <span className="text-base sm:text-lg md:text-xl font-medium text-gray-900 px-3 py-1 rounded-lg pointer-events-none">
              {img.name}
            </span>
          </div>
          {/* Close button top right */}
          <Button
            aria-label="Đóng"
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="absolute top-5 right-5 z-30 text-black rounded-lg"
            style={{ pointerEvents: 'auto' }}
          >
            <X className="w-6 h-6" />
          </Button>
          {/* Prev button */}
          {onNavigate && images.length > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute left-4 top-1/2 -translate-y-1/2 border bg-yellow-500 hover:border-[#52aaaf] text-white disabled:opacity-40 z-20"
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={atFirst}
              tabIndex={-1}
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronLeft className="w-7 h-7" />
            </Button>
          )}
          {/* Next button */}
          {onNavigate && images.length > 1 && (
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-4 top-1/2 -translate-y-1/2 border bg-blue-500 hover:border-[#52aaaf] text-white disabled:opacity-40 z-20"
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={atLast}
              tabIndex={-1}
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              <ChevronRight className="w-7 h-7" />
            </Button>
          )}
          {/* Main Image */}
          <img
            src={img.src}
            alt={img.name || ''}
            className="max-h-[76vh] max-w-[96vw] md:max-h-[82vh] object-contain mx-auto rounded-[8px] shadow-xl bg-white/30 transition-all"
            style={{ userSelect: 'none' }}
            draggable={false}
          />
          {/* Bottom Center: Total & index */}
          <div className="absolute bottom-7 left-0 w-full flex justify-center items-center">
            <span className="text-xs md:text-sm text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow pointer-events-none">
              {images.length > 1 ? `Ảnh ${currentIndex + 1} / ${images.length}` : `1 / 1`}
            </span>
          </div>
          {/* Bottom left: size */}
          {img.size && (
            <div className="absolute bottom-7 left-6 text-xs text-gray-700 bg-white/70 px-2 py-0.5 rounded shadow pointer-events-none">
              {img.size}
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg">
          Không có ảnh để hiển thị
        </div>
      )}
    </Drawer>,
    document.body
  )

  return (
    <>
      {overlayBlocker}
      {drawer}
    </>
  )
}

export default ImageViewDialog
