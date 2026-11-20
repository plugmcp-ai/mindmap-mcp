import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

/** Small line icons, drawn here so the view ships no icon package. */
const PATHS = {
  structure: "M12 5v4M6 15v-3h12v3M12 9v3M4 15h4v4H4zM10 15h4v4h-4zM16 15h4v4h-4zM10 3h4v2h-4z",
  theme: "M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 11c0-4.400-4-8-9-8zM7.500 12h.010M9.500 8h.010M14.500 8h.010",
  motion: "M5 12h9M5 7h5M5 17h5M14 8l4 4-4 4",
  undo: "M9 7 5 11l4 4M5 11h9a5 5 0 0 1 0 10h-2",
  redo: "M15 7l4 4-4 4M19 11h-9a5 5 0 0 0 0 10h2",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  fit: "M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5",
  expand: "M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5M4 4l6 6M20 4l-6 6M4 20l6-6M20 20l-6-6",
  shrink: "M4 9h5V4M20 9h-5V4M4 15h5v5M20 15h-5v5",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  chat: "M4 5h16v11H9l-5 4z",
  check: "M5 12l5 5 9-10",
  close: "M6 6l12 12M18 6 6 18",
  chevron: "M7 10l5 5 5-5",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function IconButton(props: { icon: IconName; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean; text?: string }) {
  return (
    <button
      type="button"
      className={`mm-btn${props.text ? " mm-btn-text" : ""}`}
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.pressed}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon name={props.icon} />
      {props.text ? <span>{props.text}</span> : null}
    </button>
  );
}

export interface MenuItem<T extends string> {
  id: T;
  label: string;
  hint?: string;
}

/** A button that opens a short list. Built by hand: a native select cannot be styled or recorded. */
export function Menu<T extends string>(props: {
  icon: IconName;
  label: string;
  value?: T;
  items: Array<MenuItem<T>>;
  onPick: (id: T) => void;
  /** Show the picked item's name on the button. */
  showValue?: boolean;
  align?: "left" | "right";
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const key = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const current = props.items.find((item) => item.id === props.value);
  return (
    <div className="mm-menu" ref={root} data-testid={props.testId}>
      <button
        type="button"
        className="mm-btn mm-btn-text"
        title={props.label}
        aria-label={current ? `${props.label}: ${current.label}` : props.label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={props.icon} />
        {props.showValue && current ? <span>{current.label}</span> : null}
        <Icon name="chevron" size={12} />
      </button>
      {open ? (
        <div className={`mm-pop${props.align === "right" ? " mm-pop-right" : ""}`} role="menu" aria-label={props.label}>
          {props.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitemradio"
              aria-checked={item.id === props.value}
              className="mm-item"
              data-value={item.id}
              onClick={() => {
                props.onPick(item.id);
                setOpen(false);
              }}
            >
              <span className="mm-item-mark">{item.id === props.value ? <Icon name="check" size={14} /> : null}</span>
              <span className="mm-item-text">
                <span>{item.label}</span>
                {item.hint ? <span className="mm-item-hint">{item.hint}</span> : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="mm-toast" role="status">
      {children}
    </div>
  );
}
