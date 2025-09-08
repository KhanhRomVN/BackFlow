import React, { useRef, useEffect } from "react";
import { cn } from "@/shared/lib/utils";

interface CustomTextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  autoResize?: boolean;
  maxRows?: number;
  minRows?: number;
}

const CustomTextArea: React.FC<CustomTextAreaProps> = ({
  value,
  onChange,
  placeholder = "",
  rows = 3,
  className,
  disabled = false,
  autoResize = true,
  maxRows = 8,
  minRows = 3,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (!autoResize || !textareaRef.current) return;

    const textarea = textareaRef.current;

    // Reset height to measure content
    textarea.style.height = "auto";

    // Calculate line height and max/min heights
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20;
    const minHeight = lineHeight * minRows;
    const maxHeight = lineHeight * maxRows;

    // Set height based on content with constraints
    const contentHeight = textarea.scrollHeight;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, contentHeight));

    textarea.style.height = `${newHeight}px`;

    // Show scrollbar if content exceeds max height
    if (contentHeight > maxHeight) {
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.overflowY = "hidden";
    }
  };

  // Auto resize when value changes
  useEffect(() => {
    adjustHeight();
  }, [value, autoResize, maxRows, minRows]);

  // Auto resize on mount
  useEffect(() => {
    adjustHeight();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleInput = () => {
    adjustHeight();
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={handleChange}
      onInput={handleInput}
      placeholder={placeholder}
      rows={autoResize ? minRows : rows}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl",
        "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors duration-200",
        "text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400",
        "backdrop-blur-sm leading-relaxed",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        autoResize ? "resize-none" : "resize-none",
        className
      )}
      style={autoResize ? { overflow: "hidden" } : {}}
    />
  );
};

export default CustomTextArea;
