import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckCircle2, Send, Building2, Mail, Phone, User, MessageSquare } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Field,
  Input,
  Textarea,
  Button,
  Spinner,
} from "../../components/ui";
import { BrandMark } from "../../components/common/BrandMark";
import { publicApi } from "../../lib/services";
import {
  emailValidation,
  nameValidation,
  normalizeEmail,
  normalizeName,
  phoneValidation,
} from "../../lib/validation";

/**
 * Public, unauthenticated lead-capture form reached via /lead/:token.
 * A visitor fills it in; the submission lands as a "New" lead in the owner's CRM.
 */
export default function PublicLeadForm() {
  const { token } = useParams();
  const [state, setState] = useState("loading"); // loading | ready | invalid
  const [business, setBusiness] = useState("");
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    let active = true;
    publicApi
      .form(token)
      .then((res) => {
        if (!active) return;
        setBusiness(res.business || "");
        setState("ready");
      })
      .catch(() => active && setState("invalid"));
    return () => {
      active = false;
    };
  }, [token]);

  const onSubmit = async (data) => {
    // At least one way to reach back must be provided.
    if (!data.email?.trim() && !data.phone?.trim()) {
      setError("email", { message: "Add an email or a phone number so they can reach you" });
      return;
    }
    clearErrors();
    try {
      await publicApi.submitLead(token, {
        name: normalizeName(data.name),
        email: data.email ? normalizeEmail(data.email) : "",
        phone: data.phone?.trim() || "",
        company: data.company?.trim() || "",
        message: data.message?.trim() || "",
      });
      setDone(true);
    } catch (err) {
      toast.error(err.message || "Could not send your details. Please try again.");
    }
  };

  /* ── Framing shell shared by every state ─────────────────────────── */
  const Shell = ({ children }) => (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 py-10">
      <div className="mb-6">
        <BrandMark className="h-10 w-auto" />
      </div>
      <div className="w-full max-w-lg">{children}</div>
      <p className="mt-6 text-center text-xs text-ink-soft">Powered by Infonova CRM</p>
    </div>
  );

  if (state === "loading") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      </Shell>
    );
  }

  if (state === "invalid") {
    return (
      <Shell>
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-base font-semibold text-ink">This form link is not valid</p>
            <p className="mt-2 text-sm text-ink-soft">
              The link may be incorrect or no longer active. Please ask for an up-to-date link.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  if (done) {
    return (
      <Shell>
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50">
              <CheckCircle2 className="h-6 w-6 text-brand-600" />
            </div>
            <p className="text-lg font-semibold text-ink">Thank you!</p>
            <p className="mt-2 text-sm text-ink-soft">
              Your details were received{business ? ` by ${business}` : ""}. Someone will be in touch soon.
            </p>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell>
      <Card>
        <CardHeader>
          <CardTitle>Get in touch{business ? ` with ${business}` : ""}</CardTitle>
          <CardDescription>
            Share a few details and the team will follow up with you shortly.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Your name" error={errors.name?.message}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                <Input
                  placeholder="Full name"
                  className="pl-9"
                  {...register("name", { validate: nameValidation("Your name") })}
                />
              </div>
            </Field>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Email" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    className="pl-9"
                    {...register("email", { validate: emailValidation(false) })}
                  />
                </div>
              </Field>

              <Field label="Phone" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                  <Input
                    placeholder="+237 6 00 00 00 00"
                    className="pl-9"
                    {...register("phone", { validate: phoneValidation("CM") })}
                  />
                </div>
              </Field>
            </div>

            <Field label="Company (optional)" error={errors.company?.message}>
              <div className="relative">
                <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft/60" />
                <Input
                  placeholder="Your company"
                  className="pl-9"
                  {...register("company", {
                    maxLength: { value: 200, message: "Company must be 200 characters or fewer" },
                  })}
                />
              </div>
            </Field>

            <Field label="How can we help? (optional)" error={errors.message?.message}>
              <div className="relative">
                <MessageSquare className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-soft/60" />
                <Textarea
                  rows={4}
                  placeholder="Tell us what you're looking for…"
                  className="pl-9"
                  {...register("message", {
                    maxLength: { value: 5000, message: "Message must be 5000 characters or fewer" },
                  })}
                />
              </div>
            </Field>

            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              <Send className="h-4 w-4" /> Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </Shell>
  );
}
