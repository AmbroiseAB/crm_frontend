import { forwardRef, useState, useRef, useEffect, useCallback, Children, isValidElement } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";

const baseField =
  "w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-soft/60 transition focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(baseField, "h-10", className)} {...props} />;
});

export const Textarea = forwardRef(function Textarea(
  { className, rows = 4, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(baseField, "py-2.5 resize-none leading-relaxed", className)}
      {...props}
    />
  );
});

/* ── Icons (inline so this module stays dependency-light) ──────────────── */
const Chevron = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const Check = ({ className }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Read the real <option> children into {value, label, disabled} descriptors. */
function parseOptions(children) {
  const out = [];
  Children.toArray(children).forEach((child) => {
    if (!isValidElement(child) || child.type !== "option") return;
    const label = child.props.children;
    const value = child.props.value !== undefined ? child.props.value : label;
    out.push({ value: String(value ?? ""), label, disabled: Boolean(child.props.disabled) });
  });
  return out;
}

// Bypasses React's value tracker so a programmatic change still fires onChange
// (works for both controlled handlers and react-hook-form's register).
const nativeSelectValueSetter =
  typeof window !== "undefined"
    ? Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set
    : null;

/**
 * Select rendered as a styled popover (matching the profile menu) instead of
 * the native OS list — while a visually-hidden native <select> remains the
 * source of truth, so controlled (`value`/`onChange`) and react-hook-form
 * (`register`) call sites keep working exactly as before.
 */
export const Select = forwardRef(function Select(
  { className, children, value, disabled, ...props },
  ref
) {
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(() => (value !== undefined ? String(value ?? "") : ""));
  const [coords, setCoords] = useState(null);
  const wrapRef = useRef(null);
  const selectRef = useRef(null);
  const menuRef = useRef(null);

  const options = parseOptions(children);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? String(value ?? "") : internalValue;
  const selected = options.find((o) => o.value === currentValue);

  const setRefs = useCallback(
    (node) => {
      selectRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  // Keep the display in sync when the hidden <select> is updated imperatively
  // (e.g. react-hook-form's reset). Converges in at most one extra render.
  useEffect(() => {
    if (isControlled) return;
    const v = selectRef.current?.value ?? "";
    if (v !== internalValue) setInternalValue(v);
  });

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const estHeight = Math.min(256, options.length * 40 + 12);
    const above = spaceBelow < estHeight + 12 && r.top > spaceBelow;
    setCoords({
      left: r.left,
      width: r.width,
      top: above ? undefined : r.bottom + 6,
      bottom: above ? window.innerHeight - r.top + 6 : undefined,
    });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    place();
    const reposition = () => place();
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Capture-phase + stop so an enclosing Dialog/Drawer doesn't also close.
        e.stopPropagation();
        e.stopImmediatePropagation?.();
      }
    };
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, place]);

  const choose = (optValue) => {
    const el = selectRef.current;
    if (el && nativeSelectValueSetter) {
      nativeSelectValueSetter.call(el, optValue);
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (!isControlled) setInternalValue(optValue);
    setOpen(false);
  };

  return (
    <div className="relative" ref={wrapRef}>
      {/* Hidden real control — holds the value, integrates with forms + RHF. */}
      <select
        ref={setRefs}
        value={isControlled ? String(value ?? "") : undefined}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        {...props}
      >
        {children}
      </select>

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          baseField,
          "flex h-10 w-full cursor-pointer items-center justify-between gap-2 pr-3 text-left font-medium",
          "hover:border-ink-soft/35",
          open && "border-brand-400 ring-2 ring-brand-500/20",
          className,
        )}
      >
        <span className={cn("truncate", !selected && "text-ink-soft/70")}>{selected ? selected.label : ""}</span>
        <Chevron className={cn("shrink-0 text-ink-soft transition", open && "rotate-180")} />
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            role="listbox"
            style={{
              position: "fixed",
              left: coords.left,
              top: coords.top,
              bottom: coords.bottom,
              width: coords.width,
              zIndex: 60,
            }}
            className="max-h-64 overflow-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)] animate-fade-up"
          >
            {options.map((opt) => {
              const isSel = opt.value === currentValue;
              return (
                <button
                  key={`${opt.value}:${String(opt.label)}`}
                  type="button"
                  role="option"
                  aria-selected={isSel}
                  disabled={opt.disabled}
                  onClick={() => choose(opt.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                    isSel ? "bg-brand-50 font-medium text-brand-700" : "text-ink hover:bg-surface-muted",
                    opt.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSel && <Check className="shrink-0 text-brand-600" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
});

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn("block text-sm font-medium text-ink mb-1.5", className)}
      {...props}
    >
      {children}
    </label>
  );
}

/** Field wrapper that renders a label + optional error message. */
export function Field({ label, error, children, className }) {
  return (
    <div className={className}>
      {label && <Label>{label}</Label>}
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
