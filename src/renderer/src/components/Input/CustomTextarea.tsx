import { FC, useState, useRef, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Color from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Palette
} from 'lucide-react'

interface CustomTextareaProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
  count?: boolean
  min?: boolean
  hideToolbar?: boolean
  hideColor?: boolean // hide color picker button if true
  hideH1?: boolean // hide H1 button if true
  hideH2?: boolean // hide H2 button if true
}

export const CustomTextarea: FC<CustomTextareaProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'Type here...',
  count = true,
  min = false,
  hideToolbar = false,
  hideColor = false,
  hideH1 = false,
  hideH2 = false
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [wordCount, setWordCount] = useState(0)
  const [charCount, setCharCount] = useState(0)
  const [isFocused, setIsFocused] = useState(false)
  const colorPickerRef = useRef<HTMLDivElement>(null)

  // Count words and characters
  const updateCounts = (text: string) => {
    const cleanText = text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    setCharCount(cleanText.length)
    const words = cleanText.split(/\s+/).filter((word) => word.length > 0)
    setWordCount(words.length)
  }

  // Close color picker on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Initialize tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: { HTMLAttributes: {} }
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          style:
            'background-color: #fef08a; border-radius: 2px; padding: 0 2px; margin: 0 -2px; border-bottom: 2px solid #f59e0b;'
        }
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      const text = editor.getText()
      const cleanHtml = html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
      onChange(cleanHtml)
      updateCounts(text)
    }
  })

  // Sync prop value to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  // Is the editor empty?
  const isEmpty = !value || value.trim() === '' || value === '<p></p>' || value === '<p><br></p>'

  // Minimal mode (no toolbar, no count)
  const isMinimal = min && !count

  return (
    <div
      className={`${isMinimal ? 'h-10' : 'space-y-2'} relative rounded-lg bg-[#fdfdfb] ${className}`}
    >
      {/* Toolbar (shown unless min or hideToolbar) */}
      {!isMinimal && !hideToolbar && (
        <div className="absolute bottom-0 left-2 z-10 flex items-center gap-1 p-1">
          <div className="flex items-center gap-1 pr-2">
            {!hideH1 && (
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
                className="p-1 text-gray-500 focus:text-[#587b79] focus:outline-none"
              >
                <Heading1
                  size={14}
                  className={
                    editor?.isActive('heading', { level: 1 }) ? 'text-[#52aaa5]' : 'text-gray-500'
                  }
                />
              </button>
            )}
            {!hideH2 && (
              <button
                type="button"
                onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
                className="p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none"
              >
                <Heading2
                  size={14}
                  className={
                    editor?.isActive('heading', { level: 2 }) ? 'text-[#52aaa5]' : 'text-gray-500'
                  }
                />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className="p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none"
            >
              <Bold
                size={14}
                className={editor?.isActive('bold') ? 'text-[#52aaa5]' : 'text-gray-500'}
              />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className="p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none"
            >
              <Italic
                size={14}
                className={editor?.isActive('italic') ? 'text-[#52aaa5]' : 'text-gray-500'}
              />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className="p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none"
            >
              <UnderlineIcon
                size={14}
                className={editor?.isActive('underline') ? 'text-[#52aaa5]' : 'text-gray-500'}
              />
            </button>
          </div>
          {/* Color picker block, conditionally hidden */}
          {!hideColor && (
            <div className="relative flex items-center gap-1 px-2 border-r border-gray-300">
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none"
              >
                <Palette
                  size={14}
                  className={showColorPicker ? 'text-[#52aaa5]' : 'text-gray-500'}
                />
              </button>
              {showColorPicker && (
                <div
                  ref={colorPickerRef}
                  className="absolute top-full left-0 mt-1 p-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10"
                >
                  {/* All quick access colors: black, white, red, green, blue, yellow */}
                  <div className="flex items-center gap-2 mb-2">
                    {[
                      { value: '#000000' }, // Black
                      { value: '#FFFFFF', border: true }, // White
                      { value: '#FF0000' }, // Red
                      { value: '#008000' }, // Green
                      { value: '#0000FF' }, // Blue
                      { value: '#FFD700' } // Yellow
                    ].map((color, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          editor?.chain().focus().setColor(color.value).run()
                          setShowColorPicker(false)
                        }}
                        className="w-6 h-6"
                        style={{ backgroundColor: color.value, borderRadius: 8 }}
                        title={color.value}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              className={`p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none`}
            >
              <AlignLeft
                size={14}
                className={`${editor?.isActive({ textAlign: 'left' }) ? 'text-[#52aaa5]' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              className={`p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none`}
            >
              <AlignCenter
                size={14}
                className={`${editor?.isActive({ textAlign: 'center' }) ? 'text-[#52aaa5]' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              className={`p-1 text-gray-500 focus:text-[#52aaa5] focus:outline-none`}
            >
              <AlignRight
                size={14}
                className={`${editor?.isActive({ textAlign: 'right' }) ? 'text-[#52aaa5]' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative w-full">
        {/* Placeholder */}
        {isEmpty && !isFocused && (
          <div
            className={`
              pointer-events-none select-none absolute left-3
              ${isMinimal ? 'top-1/2 -translate-y-1/2 text-base leading-none' : 'top-4'}
              text-[#718096] opacity-70
            `}
            style={{ zIndex: 1 }}
          >
            {placeholder}
          </div>
        )}
        {/* @ts-ignore: Tiptap EditorContent doesn't have onFocus/onBlur DOM events but they work */}
        <EditorContent
          editor={editor}
          className={
            (isMinimal ? 'px-3 py-0 text-base h-full min-h-0' : 'min-h-[64px] p-3 pb-8') +
            ' border border-gray-300 rounded-lg text-[#2D3748] w-full outline-none focus:outline-none focus:ring-0 bg-transparent ' +
            className
          }
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'anywhere',
            ...(isMinimal
              ? {
                  minHeight: '2.5rem',
                  maxHeight: '2.5rem',
                  height: '2.5rem',
                  overflow: 'hidden',
                  lineHeight: '2.25rem',
                  boxSizing: 'border-box',
                  paddingTop: 0,
                  paddingBottom: 0,
                  marginTop: 0,
                  marginBottom: 0
                }
              : {}),
            borderRadius: 8
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {count && (
          <div
            className={`absolute ${
              isMinimal ? 'bottom-1 right-2 text-xs' : 'bottom-2 right-3'
            } flex gap-4 text-xs text-[#52aaa5]/70`}
          >
            <span className={className}>{wordCount} words</span>
            <span className={className}>{charCount} characters</span>
          </div>
        )}
      </div>
      <style>{`
        .ProseMirror, .ProseMirror * {
          outline: none !important;
          box-shadow: none !important;
        }
        .ProseMirror {
          min-height: 64px;
          color: #2D3748;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: anywhere !important;
        }
        .ProseMirror p {
          margin: 0.5em 0;
        }
        .ProseMirror h1 {
          font-size: 1.5em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #2D3748;
        }
        .ProseMirror h2 {
          font-size: 1.3em;
          font-weight: 600;
          margin: 0.5em 0;
          color: #2D3748;
        }
        .ProseMirror ul, .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
        }
        .ProseMirror li {
          margin: 0.2em 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
      `}</style>
    </div>
  )
}
