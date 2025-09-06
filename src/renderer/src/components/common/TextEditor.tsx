import { FC, useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import { Card } from '../ui/card'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Palette,
} from 'lucide-react'

interface TextEditorProps {
  value: string
  onChange?: (value: string) => void
  height?: string
  readOnly?: boolean
  className?: string
  onInit?: () => void
}

const COLORS = [
  { name: 'Default', value: '#2D3748' },
  { name: 'Primary', value: '#52aaa5' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Purple', value: '#a855f7' },
]

export const TextEditor: FC<TextEditorProps> = ({
  value,
  onChange,
  height = "600px",
  readOnly = false,
  className = "",
  onInit
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: {
          HTMLAttributes: {}, // Remove default class attributes
        },
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TextStyle,
      Color,
    ],
    content: value,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const html = editor.getHTML()
        // Clean up any extra whitespace and normalize HTML
        const cleanHtml = html
          .replace(/\s+/g, ' ') // Replace multiple spaces with single space
          .replace(/>\s+</g, '><') // Remove spaces between tags
          .trim()
        onChange(cleanHtml)
      }
    },
    onCreate: () => {
      setInitialized(true)
      if (onInit) {
        onInit()
      }
    },
  })

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && initialized && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
  }, [editor, value, initialized])

  // Update editor editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly)
    }
  }, [editor, readOnly])

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    active = false,
    disabled = false,
    title,
    children 
  }: { 
    onClick: () => void
    active?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
  }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded hover:bg-[#52aaa5]/10 ${
        active ? 'bg-[#52aaa5]/10 text-[#52aaa5]' : 'text-[#718096]'
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={disabled || readOnly}
      title={title}
    >
      {children}
    </button>
  )

  return (
    <Card className={`overflow-hidden ${className}`} style={{ height }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border-b border-[#52aaa5]/10 bg-white">
        {/* Text Style */}
        <div className="flex items-center gap-1 pr-2 border-r border-[#52aaa5]/10">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            <Heading1 size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            <Heading2 size={18} />
          </ToolbarButton>
        </div>

        {/* Text Formatting */}
        <div className="flex items-center gap-1 px-2 border-r border-[#52aaa5]/10">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <Bold size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <Italic size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon size={18} />
          </ToolbarButton>
        </div>

        {/* Color Picker */}
        <div className="relative flex items-center gap-1 px-2 border-r border-[#52aaa5]/10">
          <ToolbarButton
            onClick={() => setShowColorPicker(!showColorPicker)}
            active={showColorPicker}
            title="Text Color"
          >
            <Palette size={18} />
          </ToolbarButton>
          
          {/* Color Dropdown */}
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 p-2 bg-white border border-[#52aaa5]/10 rounded-md shadow-lg z-50">
              <div className="grid grid-cols-4 gap-1">
                {COLORS.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => {
                      editor.chain().focus().setColor(color.value).run()
                      setShowColorPicker(false)
                    }}
                    className="flex flex-col items-center gap-1 p-1 rounded hover:bg-[#52aaa5]/5"
                    title={color.name}
                  >
                    <div 
                      className="w-6 h-6 rounded border border-[#52aaa5]/10" 
                      style={{ backgroundColor: color.value }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Alignment */}
        <div className="flex items-center gap-1 px-2 border-r border-[#52aaa5]/10">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight size={18} />
          </ToolbarButton>
        </div>

        {/* Lists */}
        <div className="flex items-center gap-1 px-2">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List size={18} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered size={18} />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div 
        className="h-full overflow-auto bg-white"
        style={{ height: `calc(${height} - 45px)` }}
      >
        <EditorContent 
          editor={editor} 
          className="h-full prose max-w-none p-4"
        />
      </div>

      <style>{`
        .ProseMirror {
          min-height: 100%;
          outline: none;
        }
        .ProseMirror p {
          margin: 1em 0;
          color: #4A5568;
        }
        .ProseMirror h1 {
          font-size: 1.75em;
          margin: 0.75em 0 0.5em;
          color: #2D3748;
        }
        .ProseMirror h2 {
          font-size: 1.5em;
          margin: 0.75em 0 0.5em;
          color: #2D3748;
        }
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5em;
          margin: 0.5em 0;
          color: #4A5568;
        }
        .ProseMirror li {
          margin: 0.2em 0;
        }
        .ProseMirror li p {
          margin: 0;
        }
        .ProseMirror strong {
          color: #2D3748;
        }
      `}</style>
    </Card>
  )
}

export default TextEditor