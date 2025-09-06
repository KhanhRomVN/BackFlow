import { FC, useState, useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, Eye } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Button } from "../ui/button";

// Helper for formatting file size
function formatSize(bytes: number): string {
  if (typeof bytes !== "number" || isNaN(bytes)) return "";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024)
    return (bytes / 1024).toFixed(1).replace(/\.0$/, "") + " KB";
  return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
}

interface MultiImageDropzoneProps {
  files?: File[]; // Controlled files
  imageUrls?: string[];
  onChange?: (files: File[]) => void;
  maxCount?: number;
  onRemoveImageUrl?: (idx: number) => void;
  onPreviewImage?: (
    idx: number,
    images: { src: string; name?: string; size?: string; type?: string }[]
  ) => void;
}

export const MultiImageDropzone: FC<MultiImageDropzoneProps> = ({
  files,
  imageUrls = [],
  onChange,
  maxCount = 10,
  onRemoveImageUrl,
  onPreviewImage,
}) => {
  // Local state for uncontrolled use
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const currentFiles = files ?? localFiles;

  // Handle drop & compress images
  const handleDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: "image/webp",
      };
      try {
        const compressedFiles: File[] = [];
        for (const file of acceptedFiles) {
          let compressedFile = file;
          if (
            file.type !== "image/webp" ||
            file.size > options.maxSizeMB * 1024 * 1024
          ) {
            compressedFile = await imageCompression(file, options);
          }
          if (!compressedFile.name.toLowerCase().endsWith(".webp")) {
            compressedFile = new File(
              [compressedFile],
              file.name.replace(/\.[^/.]+$/, "") + ".webp",
              { type: "image/webp" }
            );
          }
          compressedFiles.push(compressedFile);
        }
        const nextFiles = [...currentFiles, ...compressedFiles].slice(
          0,
          maxCount
        );
        if (files && onChange) {
          onChange(nextFiles);
        } else {
          setLocalFiles(nextFiles);
          onChange?.(nextFiles);
        }
      } catch (err) {
        alert("Có lỗi khi nén/chuyển đổi hình ảnh.");
      }
    },
    [files, currentFiles, maxCount, onChange]
  );

  // Dropzone setup
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"] },
    onDrop: handleDrop,
    multiple: true,
    maxFiles: maxCount,
  });

  // Duplicate logic (still keep user-friendly alert UI)
  const nameCount: Record<string, number> = {};
  const duplicateIndexes = useMemo(() => {
    const set = new Set<number>();
    currentFiles.forEach((file, idx) => {
      nameCount[file.name] = (nameCount[file.name] ?? 0) + 1;
      if (nameCount[file.name] > 1) set.add(idx + imageUrls.length);
    });
    return set;
    // eslint-disable-next-line
  }, [currentFiles, imageUrls.length]);

  // XÓA ẢNH
  const handleRemove = (idx: number) => {
    if (idx < imageUrls.length) {
      // URL
      onRemoveImageUrl?.(idx);
    } else {
      // File
      const fileIdx = idx - imageUrls.length;
      if (files && onChange) {
        onChange(currentFiles.filter((_, i) => i !== fileIdx));
      } else {
        setLocalFiles((prev) => {
          const next = prev.filter((_, i) => i !== fileIdx);
          onChange?.(next);
          return next;
        });
      }
    }
  };

  // Preview images
  const images = useMemo(() => {
    const urlPreviews = imageUrls.map((url, i) => ({
      src: url,
      name: `Ảnh #${i + 1}`,
      size: "",
      type: "URL",
      isUrl: true,
    }));
    const filePreviews = (currentFiles ?? []).map((file) => ({
      src: URL.createObjectURL(file),
      name: file.name,
      size: formatSize(file.size),
      type: (file.type.split("/")[1] || "").toUpperCase(),
      isUrl: false,
    }));
    return [...urlPreviews, ...filePreviews];
  }, [imageUrls, currentFiles]);

  return (
    <div className="space-y-4">
      {/* DROPZONE */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-[#52aaaf]"
        }
        ${images.length >= maxCount ? "opacity-60 pointer-events-none" : ""}
      `}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">
          {isDragActive
            ? "Thả file vào đây"
            : `Kéo thả hình ảnh hoặc click để chọn (${images.length}/${maxCount})`}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Ảnh sẽ được tự động nén và chuyển sang WebP để tối ưu dung lượng!
        </p>
      </div>
      {/* PREVIEW */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {images.map((img, idx) => {
              const isDuplicate = duplicateIndexes.has(idx);
              return (
                <div
                  key={idx}
                  className={`
                    relative group aspect-square rounded-lg shadow shrink-0 bg-gray-100 overflow-hidden
                    ${isDuplicate ? "outline outline-2 outline-red-500" : ""}
                  `}
                >
                  <img
                    src={img.src}
                    alt={img.name}
                    className="w-full h-full object-cover rounded-lg select-none pointer-events-none"
                    draggable={false}
                  />
                  <div
                    className="absolute bottom-0 left-0 w-full
                        bg-black/50 text-xs text-white font-medium
                        px-2 py-1 truncate whitespace-nowrap overflow-hidden
                        opacity-0 group-hover:opacity-100 transition"
                    title={img.name}
                    style={{ textOverflow: "ellipsis" }}
                  >
                    {img.name}
                  </div>
                  <div className="absolute inset-0 transition-all duration-150 bg-black/0 group-hover:bg-black/20">
                    {/* Top left: size & type */}
                    <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition">
                      {(img.size || img.type) && (
                        <span className="bg-black/60 px-2 py-0.5 rounded text-xs text-white shadow flex items-center gap-1">
                          {img.size && <span>{img.size}</span>}
                          <span>{img.type}</span>
                        </span>
                      )}
                    </div>
                    {/* Top right: chỉ 1 nút X và 1 nút view nếu file, 1 nút X nếu url */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                      {!isDuplicate && (
                        <>
                          <Button
                            type="button"
                            onClick={() => handleRemove(idx)}
                            className={`w-8 h-8 p-0 ${
                              img.isUrl
                                ? "bg-rose-700 hover:bg-rose-900"
                                : "bg-rose-500 hover:bg-rose-600"
                            } text-white rounded-lg flex items-center justify-center`}
                            tabIndex={-1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            onClick={() => {
                              if (onPreviewImage) {
                                // dùng callback props -> truyền lên WikiManagePage
                                onPreviewImage(idx, images);
                              } // KHÔNG dùng setOpenIndex ở đây nữa!
                            }}
                            className="w-8 h-8 p-0 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center justify-center"
                            tabIndex={-1}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Duplicate overlay */}
                  {isDuplicate && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                      <span className="bg-red-600 text-white text-xs px-3 py-1 rounded shadow">
                        Trùng tên file!
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Image Viewer Dialog */}
      {/* <ImageViewDialog
        open={openIndex !== null}
        onClose={() => setOpenIndex(null)}
        images={images}
        currentIndex={openIndex ?? 0}
        onNavigate={(idx) => {
          if (idx >= 0 && idx < images.length) setOpenIndex(idx);
        }}
      /> */}
    </div>
  );
};

export default MultiImageDropzone;
