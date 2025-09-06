import { FC, useCallback, useMemo, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Eye, Upload } from 'lucide-react'
import { Button } from '../ui/button'
import imageCompression from 'browser-image-compression'
import ImageViewDialog from '../Dialog/ImageViewDialog'

// Helper
function formatSize(bytes: number): string {
  if (typeof bytes !== 'number' || isNaN(bytes)) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(/\.0$/, '') + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB'
}

interface CustomSingleImageDropzoneProps {
  imageFile?: File
  onChange?: (file: File | undefined) => void
}

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp'
  }
  let compressedFile = file
  if (file.type !== 'image/webp' || file.size > options.maxSizeMB * 1024 * 1024) {
    compressedFile = await imageCompression(file, options)
  }
  // Ensure file name ends with .webp
  if (!compressedFile.name.toLowerCase().endsWith('.webp')) {
    compressedFile = new File([compressedFile], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
      type: 'image/webp'
    })
  }
  return compressedFile
}

export const CustomSingleImageDropzone: FC<CustomSingleImageDropzoneProps> = ({
  imageFile,
  onChange
}) => {
  const [localImage, setLocalImage] = useState<File | undefined>(undefined)
  const file = imageFile ?? localImage
  const [openDialog, setOpenDialog] = useState(false)

  // Xử lý nén, đổi tên
  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (!acceptedFiles || acceptedFiles.length === 0) return
      try {
        const compressed = await compressImage(acceptedFiles[0])
        if (imageFile && onChange) {
          onChange(compressed)
        } else {
          setLocalImage(compressed)
          onChange?.(compressed) // fallback fire
        }
      } catch (err) {
        alert('Có lỗi khi nén/chuyển đổi hình ảnh.')
      }
    },
    [imageFile, onChange]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'] },
    onDrop: handleDrop,
    multiple: false,
    maxFiles: 1,
    disabled: !!file
  })

  // info cho dialog
  const img = useMemo(() => {
    if (!file) return null
    return {
      src: URL.createObjectURL(file),
      name: file.name,
      size: formatSize(file.size),
      type: (file.type.split('/')[1] || '').toUpperCase()
    }
  }, [file])

  // Xử lý xoá
  const handleDelete = () => {
    setLocalImage(undefined)
    onChange?.(undefined)
  }

  return (
    <div className="space-y-2 w-full">
      {/* KHI CHƯA CÓ FILE */}
      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-[#52aaaf]'
          }`}
          style={{ borderRadius: 8 }}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Thả file vào đây' : 'Kéo thả hình ảnh hoặc click để chọn (chỉ 1 ảnh)'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Ảnh sẽ được tự động nén và chuyển sang WebP!</p>
        </div>
      ) : (
        // KHI ĐÃ CÓ FILE - PHẦN NÀY THEO UI MULTI IMAGE
        <div className="relative group aspect-square rounded-lg shadow bg-gray-100 overflow-hidden max-w-sm mx-auto">
          <img
            src={img?.src}
            alt={img?.name}
            className="w-full h-full object-cover rounded-lg select-none pointer-events-none"
            draggable={false}
          />
          {/* Overlay hover các action */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-150 flex flex-col justify-between">
            {/* Top right action */}
            <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 p-0 bg-rose-500 hover:bg-rose-600 text-white rounded-lg flex items-center justify-center shadow"
                onClick={handleDelete}
                tabIndex={-1}
                type="button"
              >
                <X className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 p-0 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center justify-center shadow"
                onClick={() => setOpenDialog(true)}
                tabIndex={-1}
                type="button"
              >
                <Eye className="h-5 w-5" />
              </Button>
            </div>
            {/* Bottom info  */}
            <div
              className="absolute bottom-0 left-0 w-full bg-black/50 text-xs text-white font-medium px-2 py-1 truncate whitespace-nowrap overflow-hidden opacity-0 group-hover:opacity-100 transition"
              title={img?.name}
            >
              {img?.name}
            </div>
            {/* Top left size-type */}
            <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition">
              <span className="bg-black/60 px-2 py-0.5 rounded text-xs text-white shadow flex items-center gap-1">
                <span>{img?.size}</span>
                <span>{img?.type}</span>
              </span>
            </div>
          </div>
        </div>
      )}
      {/* Image viewer dialog */}
      <ImageViewDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        images={img ? [img] : []}
        currentIndex={0}
      />
    </div>
  )
}

export default CustomSingleImageDropzone
