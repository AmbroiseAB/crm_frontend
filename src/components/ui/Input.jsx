import { forwardRef, useState, useRef, useEffect, Children, isValidElement } from "react";
import { ChevronDown, Check } from "lucide-react";
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

/**
 * Styled select that matches the app's own dropdown menus (same look as the
 * profile menu) rather than the browser's native option list. A visually-hidden
 * real <select> stays mounted as the source of truth, so this is a drop-in
 * replacement: it works both with `value`/`onChange` and with react-hook-form's
 * `register` (ref, name, onChange/onBlur all land on the hidden <select>).
 */
export const Select = forwardRef(function Select(
  { className, children, value, defaultValue, onChange, disabled, placeholder, ...props },
  ref
) {
  const nativeRef = useRef(null);
  const wrapRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const [activeIndex, setActiveIndex] = useState(-1);

  const setRefs = (el) => {
    nativeRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  // Flatten <option> (and <optgroup>) children into a list we can render ourselves.
  const options = [];
  const walk = (nodes) =>
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === "optgroup") return walk(child.props.children);
      if (child.type === "option") {
        const val = child.props.value !== undefined ? child.props.value : child.props.children;
        options.push({ value: val, label: child.props.children, disabled: child.props.disabled });
      }
    });
  walk(children);

  const current = value !== undefined ? value : uncontrolled;
  const selected = options.find((o) => String(o.value) === String(current));

  // Keep the displayed value in sync when the native value is set externally
  // (e.g. react-hook-form resetting the form). The guard avoids a render loop.
  useEffect(() => {
    if (value !== undefined) return;
    const v = nativeRef.current?.value;
    if (v !== undefined && v !== uncontrolled) setUncontrolled(v);
  });

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const choose = (val) => {
    const el = nativeRef.current;
    if (el) {
      // Bypass React's value setter so it registers the change and fires onChange.
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
      setter.call(el, String(val));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (value === undefined) setUncontrolled(String(val));
    setOpen(false);
  };

  const openMenu = () => {
    if (disabled) return;
    setActiveIndex(options.findIndex((o) => String(o.value) === String(current)));
    setOpen(true);
  };

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt && !opt.disabled) choose(opt.value);
    }
  };

  return (
    <div className={cn("relative", className)} ref={wrapRef}>
      {/* Hidden real <select>: the source of truth for value + RHF/controlled wiring. */}
      <select
        ref={setRefs}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        {...props}
      >
        {children}
      </select>

      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          baseField,
          "flex h-10 items-center justify-between gap-2 pr-9 text-left",
          !selected && "text-ink-soft/70"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder || "Select…"}</span>
        <ChevronDown
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-2 max-h-64 w-full overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-pop)] animate-fade-up"
        >
          {options.map((opt, i) => {
            const isSelected = String(opt.value) === String(current);
            return (
              <button
                key={`${opt.value}-${i}`}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={opt.disabled}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => !opt.disabled && choose(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                  opt.disabled && "cursor-not-allowed opacity-40",
                  isSelected
                    ? "bg-brand-50 font-medium text-brand-700"
                    : i === activeIndex
                    ? "bg-surface-muted text-ink"
                    : "text-ink hover:bg-surface-muted"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
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
