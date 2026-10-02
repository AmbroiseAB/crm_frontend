import { TrendingUp, Bot, ShieldCheck } from "lucide-react";
import { BrandMark } from "../../components/common/BrandMark";

/* Split-screen auth layout: marketing panel on the left, form on the right. */
export function AuthShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-brand-700 lg:flex-row">
      {/* Brand / marketing panel */}
      <div className="relative flex min-h-[190px] w-full flex-col justify-between overflow-hidden bg-brand-700 p-6 text-white sm:min-h-[220px] sm:p-8 lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:min-h-0 lg:w-1/2 lg:self-start lg:p-12">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-600/50 blur-3xl" />

        <div className="relative flex items-center">
          <BrandMark className="h-9 w-auto max-w-[75vw] sm:h-10" light />
        </div>

        <div className="relative mt-8 lg:mt-0">
          <h2 className="max-w-2xl font-display text-2xl font-bold leading-tight sm:text-3xl lg:text-4xl">
            Close more deals with an AI co-pilot in your pipeline.
          </h2>
          <p className="mt-3 hidden max-w-md text-sm text-white/70 sm:block lg:mt-4 lg:text-base">
            INFONOVA CRM unifies your leads, contacts and follow-ups — then layers
            Gemini-powered summaries, email drafts and sales insights on top.
          </p>

          <div className="mt-6 hidden space-y-4 md:block lg:mt-10">
            {[
              { icon: TrendingUp, text: "Visual pipeline with drag-and-drop stages" },
              { icon: Bot, text: "AI lead scoring & instant email drafting" },
              { icon: ShieldCheck, text: "Secure JWT auth, your data stays yours" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                <span className="text-sm text-white/90">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative -mt-6 flex w-full flex-1 flex-col items-center justify-start overflow-y-auto rounded-t-[2rem] bg-canvas px-5 py-8 shadow-[0_-12px_30px_rgba(4,31,52,0.16)] sm:-mt-8 sm:px-8 sm:py-10 lg:mt-0 lg:h-screen lg:max-h-screen lg:min-h-0 lg:w-1/2 lg:justify-center lg:rounded-none lg:px-6 lg:py-12 lg:shadow-none">
        <div className="w-full max-w-sm animate-fade-up">{children}</div>
      </div>
    </div>
  );
}
