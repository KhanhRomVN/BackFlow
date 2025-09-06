export interface Option<T> {
  value: T;
  label: string;
}

export interface ButtonColor {
  bg: string;
  text: string;
  border: string;
  selectedBg?: string;
  selectedText?: string;
  selectedBorder?: string;
}

export const colorVariants: Record<string, ButtonColor> = {
  red: {
    bg: "#FFECEA",
    text: "#FF6B6B",
    border: "#FF6B6B",
    selectedBg: "#FF6B6B",
    selectedText: "#fff",
    selectedBorder: "#FF6B6B",
  },
  teal: {
    bg: "#E3FAF7",
    text: "#4ECDC4",
    border: "#4ECDC4",
    selectedBg: "#4ECDC4",
    selectedText: "#fff",
    selectedBorder: "#4ECDC4",
  },
  blueSky: {
    bg: "#E4F7FB",
    text: "#45B7D1",
    border: "#45B7D1",
    selectedBg: "#45B7D1",
    selectedText: "#fff",
    selectedBorder: "#45B7D1",
  },
  greenPastel: {
    bg: "#E4F5EC",
    text: "#96CEB4",
    border: "#96CEB4",
    selectedBg: "#96CEB4",
    selectedText: "#fff",
    selectedBorder: "#96CEB4",
  },
  indigo: {
    bg: "#ECECFF",
    text: "#6366F1",
    border: "#6366F1",
    selectedBg: "#6366F1",
    selectedText: "#fff",
    selectedBorder: "#6366F1",
  },
  yellow: {
    bg: "#FFF9E2",
    text: "#E6B800",
    border: "#E6B800",
    selectedBg: "#E6B800",
    selectedText: "#fff",
    selectedBorder: "#E6B800",
  },
  blueGray: {
    bg: "#F3F4F6",
    text: "#6B7280",
    border: "#6B7280",
    selectedBg: "#6B7280",
    selectedText: "#fff",
    selectedBorder: "#6B7280",
  },
  pink: {
    bg: "#FFE4F4",
    text: "#FF4DA6",
    border: "#FF4DA6",
    selectedBg: "#FF4DA6",
    selectedText: "#fff",
    selectedBorder: "#FF4DA6",
  },
  orange: {
    bg: "#FFF3E0",
    text: "#FF9800",
    border: "#FF9800",
    selectedBg: "#FF9800",
    selectedText: "#fff",
    selectedBorder: "#FF9800",
  },
  violet: {
    bg: "#F3E8FF",
    text: "#A15EFF",
    border: "#A15EFF",
    selectedBg: "#A15EFF",
    selectedText: "#fff",
    selectedBorder: "#A15EFF",
  },
  dark: {
    bg: "#23272A",
    text: "#FAFAFA",
    border: "#1E1E1E",
    selectedBg: "#1E1E1E",
    selectedText: "#fff",
    selectedBorder: "#333",
  },
  grayDark: {
    bg: "#41424A",
    text: "#B8B9BE",
    border: "#41424A",
    selectedBg: "#363844",
    selectedText: "#fff",
    selectedBorder: "#363844",
  },
  lime: {
    bg: "#F3FFE4",
    text: "#B2FF59",
    border: "#B2FF59",
    selectedBg: "#B2FF59",
    selectedText: "#2E7D32",
    selectedBorder: "#B2FF59",
  },
  cyan: {
    bg: "#E0F7FA",
    text: "#00BCD4",
    border: "#00BCD4",
    selectedBg: "#00BCD4",
    selectedText: "#fff",
    selectedBorder: "#00BCD4",
  },
  purple: {
    bg: "#EDE7F6",
    text: "#7C4DFF",
    border: "#7C4DFF",
    selectedBg: "#7C4DFF",
    selectedText: "#fff",
    selectedBorder: "#7C4DFF",
  },
  brown: {
    bg: "#EFEBE9",
    text: "#795548",
    border: "#795548",
    selectedBg: "#795548",
    selectedText: "#fff",
    selectedBorder: "#795548",
  },
};

interface ButtonGroupProps<T> {
  options: Option<T>[];
  selected: T | T[];
  onClick: (value: T) => void;
  colorNames: string[]; // ex: ['red', 'teal']
  multiple?: boolean;
  className?: string;
}

export function ButtonGroup<T extends string | number>({
  options,
  selected,
  onClick,
  colorNames,
  multiple = false,
  className = "",
}: ButtonGroupProps<T>) {
  const isSelected = (value: T) =>
    multiple
      ? Array.isArray(selected) && selected.includes(value)
      : selected === value;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((opt, idx) => {
        const color = colorVariants[colorNames[idx]];
        if (!color)
          return (
            <button
              key={opt.value}
              disabled
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-400 border"
            >
              {opt.label}
            </button>
          );
        const isSel = isSelected(opt.value);
        const style = isSel
          ? {
              background: color.selectedBg ?? color.bg,
              color: color.selectedText ?? "#fff",
              border: `1.5px solid ${color.selectedBorder ?? color.border}`,
              boxShadow: `0 2px 8px ${color.selectedBg ?? color.bg}44`,
              cursor: "pointer",
            }
          : {
              background: color.bg,
              color: color.text,
              border: `1.5px solid transparent`,
              cursor: "pointer",
            };
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onClick(opt.value)}
            className={`px-4 py-2 rounded-xl font-medium transition-colors duration-150 outline-none border ${
              isSel ? "shadow-md" : ""
            }`}
            style={style}
            tabIndex={0}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
