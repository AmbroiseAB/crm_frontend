import mark from "../../assets/infonova-mark.svg";
import lightMark from "../../assets/infonova-mark-light.svg";
import { cn } from "../../lib/utils";

/**
 * Brand lockup: the clean, text-less icon mark + a crisp HTML wordmark
 * ("Infonova" + a small orange "CRM"), typeset in the app's own fonts rather
 * than baked into the SVG.
 *
 * - `className` sizes the icon (e.g. "h-9 w-auto").
 * - `light`     selects the mark + text colors for dark backgrounds.
 * - `showText`  set false for an icon-only lockup in tight spaces.
 */
export function BrandMark({ className = "h-9 w-auto", light = false, showText = true }) {
  const icon = (
    <img
      src={light ? lightMark : mark}
      alt="Infonova CRM"
      draggable={false}
      className={className}
    />
  );

  if (!showText) return icon;

  return (
    <span className="inline-flex items-center gap-2.5">
      {icon}
      <span className="flex flex-col leading-none">
        <span className={cn("font-display text-lg font-bold tracking-tight", light ? "text-white" : "text-ink")}>
          Infonova
        </span>
        <span className={cn("text-[10px] font-bold uppercase tracking-[0.22em]", light ? "text-accent-300" : "text-accent-400")}>
          CRM
        </span>
      </span>
    </span>
  );
}
