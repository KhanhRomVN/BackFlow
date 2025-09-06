import { FC, useState, useMemo } from "react";
import { Eye } from "lucide-react";
import ImageViewDialog from "../Dialog/ImageViewDialog";

interface ImagePreviewProps {
  images: string[]; // Array of image URLs
  gridCols?: number; // optional: columns count, default 3
}

const ImagePreview: FC<ImagePreviewProps> = ({ images, gridCols = 3 }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const handleOpen = (idx: number) => {
    setOpenIdx(idx);
  };

  const handleClose = () => {
    setOpenIdx(null);
  };

  // Tạo cấu trúc cho ImageViewDialog
  const dialogImages = useMemo(
    () =>
      images.map((src, idx) => ({
        src,
        name: `Ảnh ${idx + 1}`,
      })),
    [images]
  );

  if (!images.length) {
    return (
      <div className="w-full py-8 text-center text-gray-500 text-sm">
        Không có ảnh để hiển thị
      </div>
    );
  }

  return (
    <>
      <div
        className={`grid gap-4 bg-transparent ${
          gridCols === 1
            ? "grid-cols-1"
            : gridCols === 2
            ? "grid-cols-2"
            : gridCols >= 4
            ? "grid-cols-2 md:grid-cols-4"
            : "grid-cols-2 md:grid-cols-3"
        }`}
      >
        {images.map((url, idx) => (
          <div
            key={idx}
            className="aspect-square rounded-lg shadow-sm overflow-hidden flex items-center justify-center relative group bg-gray-100"
          >
            <img
              src={url}
              alt={`Ảnh ${idx + 1}`}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              loading="lazy"
              draggable={false}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition group-hover:backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
              <button
                type="button"
                onClick={() => handleOpen(idx)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-sky-600/90 hover:bg-sky-700/90 text-white shadow-lg focus-visible:ring-2 focus-visible:ring-sky-400 transition"
                tabIndex={0}
                aria-label="Phóng lớn ảnh"
              >
                <Eye className="h-6 w-6" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {/* Image View Dialog */}
      {openIdx !== null && (
        <ImageViewDialog
          open={openIdx !== null}
          onClose={handleClose}
          images={dialogImages}
          currentIndex={openIdx}
          onNavigate={(newIdx) => {
            if (newIdx >= 0 && newIdx < dialogImages.length) {
              setOpenIdx(newIdx);
            }
          }}
        />
      )}
    </>
  );
};

export default ImagePreview;
