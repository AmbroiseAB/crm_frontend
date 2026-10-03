import { cn } from "../../lib/utils";
import mark from "../../assets/infonova-mark.svg";
import lightMark from "../../assets/infonova-mark-light.svg";

/**
 * Brand lockup: the text-free Infonova mark next to a two-line wordmark —
 * "Infonova" (black on light surfaces, white on dark) above "CRM" (always orange).
 *   • default  → blue mark on a white/light background
 *   • light    → white mark + white wordmark for blue/dark backgrounds
 *   • compact  → hides the wordmark on narrow screens, leaving just the mark
 */
export function BrandMark({ className = "h-9 w-auto", light = false, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img src={light ? lightMark : mark} alt="Infonova CRM" className={className} />
      <span className={cn("flex flex-col leading-none", compact && "hidden sm:flex")}>
        <span
          className={cn(
            "font-display text-lg font-bold tracking-tight",
            light ? "text-white" : "text-black"
          )}
        >
          Infonova
        </span>
        <span className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-[0.35em] text-[#F58220]">
          CRM
        </span>
      </span>
    </span>
  );
}
