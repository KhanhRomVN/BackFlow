import { FC } from "react";

interface RichtextViewProps {
  content: string;
  className?: string;
}

export const RichtextView: FC<RichtextViewProps> = ({
  content,
  className = "",
}) => {
  return (
    <div
      className={`prose prose-sm max-w-none break-words break-all whitespace-pre-wrap leading-relaxed
        prose-p:my-1 prose-headings:my-2 prose-headings:text-[#2D3748]
        prose-p:break-words prose-p:break-all prose-p:whitespace-pre-wrap ${className}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};
