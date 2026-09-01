import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label?: string;
  icon?: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  prefix?: React.ReactNode;
  accentColor?: string;
  width?: string | number;
  mono?: boolean;
  placeholder?: string;
}

// Fully custom, theme-consistent dropdown that replaces native <select> so the
// popup matches the app's dark UI instead of the default browser styling.
export default function Select({
  value,
  onChange,
  options,
  prefix,
  accentColor = "#CBE353",
  width,
  mono,
  placeholder,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div ref={rootRef} className="relative" style={{ width }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors select-none"
        style={{
          width: width || "100%",
          justifyContent: "space-between",
          background: "#18181C",
          border: open ? `1px solid ${accentColor}` : "1px solid #2A2A32",
          color: accentColor,
          fontFamily: mono ? "'DM Mono', monospace" : "inherit",
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {prefix}
          <span className="truncate">
            {current?.icon && <span>{current.icon} </span>}
            {current?.label || current?.value || placeholder}
          </span>
        </span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="M7 15l5 5 5-5M7 9l5-5 5 5" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1.5 rounded-xl overflow-hidden shadow-2xl"
          style={{
            top: "100%",
            left: 0,
            right: 0,
            background: "#18181C",
            border: "1px solid #2A2A32",
          }}
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left cursor-pointer transition-colors"
                style={{
                  background: selected ? "#22222B" : "transparent",
                  color: selected ? accentColor : "#E4E4E7",
                  fontFamily: mono ? "'DM Mono', monospace" : "inherit",
                }}
                onMouseEnter={(e) => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "#1E1E26";
                }}
                onMouseLeave={(e) => {
                  if (!selected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                }}
              >
                {o.icon && <span>{o.icon}</span>}
                <span className="flex-1 truncate">{o.label || o.value}</span>
                {selected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
