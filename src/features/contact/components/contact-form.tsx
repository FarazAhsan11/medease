import { SendIcon } from "lucide-react";

import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Send us a message</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        We usually respond within 24 hours.
      </p>

      <form className="mt-6 grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="contact-name" label="Full name">
            <Input id="contact-name" name="name" placeholder="Ali Raza" />
          </FormField>
          <FormField id="contact-email" label="Email">
            <Input
              id="contact-email"
              name="email"
              type="email"
              placeholder="you@example.com"
            />
          </FormField>
        </div>
        <FormField id="contact-subject" label="Subject">
          <Input
            id="contact-subject"
            name="subject"
            placeholder="How can we help?"
          />
        </FormField>
        <FormField id="contact-message" label="Message">
          <Textarea
            id="contact-message"
            name="message"
            rows={5}
            placeholder="Tell us a bit more…"
          />
        </FormField>
        <Button type="button" className="h-9 w-full gap-2 sm:w-fit sm:px-5">
          <SendIcon aria-hidden />
          Send message
        </Button>
      </form>
    </div>
  );
}
