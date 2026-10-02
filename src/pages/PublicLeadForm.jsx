import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Send, Building2, Loader2 } from "lucide-react";
import { Button, Field, Input, Textarea } from "../components/ui";
import { BrandMark } from "../components/common/BrandMark";
import { publicApi } from "../lib/services";
import { PHONE_COUNTRIES, emailValidation, nameValidation, normalizeName, normalizeEmail, phoneValidation } from "../lib/validation";

/**
 * Branded, public web-to-lead form rendered at /f/:orgSlug. Lets a prospect
 * submit their own details (no login). Includes a hidden honeypot field.
 */
export default function PublicLeadForm() {
  const { orgSlug } = useParams();
  const [org, setOrg] = useState(undefined); // undefined = loading, null = not found
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { phoneCountry: "CM", website: "" } });

  useEffect(() => {
    publicApi
      .getOrg(orgSlug)
      .then((res) => setOrg(res.org))
      .catch(() => setOrg(null));
  }, [orgSlug]);

  const onSubmit = async (form) => {
    try {
      await publicApi.submitLead(orgSlug, {
        ...form,
        name: normalizeName(form.name),
        email: form.email ? normalizeEmail(form.email) : "",
        phone: form.phone?.trim() || "",
      });
      setDone(true);
    } catch (err) {
      toast.error(err.message || "Could not send. Please try again in a moment.");
    }
  };

  if (org === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (org === null) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas px-4">
        <div className="max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-xl font-bold text-ink">Form unavailable</h1>
          <p className="mt-2 text-sm text-ink-soft">This link is invalid or no longer active. Please check with whoever shared it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark className="h-9 w-auto" compact />
          <div>
            <h1 className="text-2xl font-bold text-ink">Get in touch with {org.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">Tell us a little about you and we'll reach out shortly.</p>
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow-card)] sm:p-8">
          {done ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                <CheckCircle2 className="h-7 w-7 text-brand-600" />
              </div>
              <h2 className="mt-4 text-lg font-bold text-ink">Thank you!</h2>
              <p className="mt-1.5 text-sm text-ink-soft">
                Your details reached the {org.name} team. Someone will be in touch soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Honeypot — hidden from humans, tempting to bots. */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="absolute left-[-9999px] h-0 w-0 opacity-0"
                {...register("website")}
              />

              <Field label="Your name" error={errors.name?.message}>
                <Input placeholder="Full name" {...register("name", { validate: nameValidation("Name") })} />
              </Field>

              <Field label="Email" error={errors.email?.message}>
                <Input type="email" placeholder="you@company.com" {...register("email", { validate: emailValidation() })} />
              </Field>

              <Field label="Phone" error={errors.phone?.message}>
                <div className="flex gap-2">
                  <select className="w-28 rounded-xl border border-line bg-surface px-2 text-sm" {...register("phoneCountry")}>
                    {PHONE_COUNTRIES.map(([code, callingCode, label]) => (
                      <option key={code} value={code}>{callingCode} {label}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="6 55 00 00 00"
                    {...register("phone", { validate: (value) => phoneValidation(watch("phoneCountry"))(value) })}
                  />
                </div>
              </Field>

              <Field label="Company">
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/50" />
                  <Input placeholder="Your company" className="pl-9" {...register("company")} />
                </div>
              </Field>

              <Field label="How can we help?">
                <Textarea rows={4} placeholder="Tell us what you need…" {...register("message")} />
              </Field>

              <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
                <Send className="h-4 w-4" /> Send
              </Button>
              <p className="text-center text-xs text-ink-soft">
                We'll only use your details to respond to this enquiry.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
