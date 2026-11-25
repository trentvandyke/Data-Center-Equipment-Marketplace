"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { sendInquiry } from "@/actions/inquiries";
import { fieldError, type ActionState } from "@/lib/types";

export function InquiryForm({
  listingId,
  defaults,
}: {
  listingId: string;
  defaults: { name: string; email: string; company: string; phone: string };
}) {
  const [state, action] = useActionState(sendInquiry, {} as ActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <form ref={formRef} action={action} className="grid gap-3">
      <input type="hidden" name="listingId" value={listingId} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="rounded-lg bg-pine/10 px-3 py-2 text-sm text-pine">{state.success}</p> : null}
      <label>
        <span className="label">Name</span>
        <input name="name" required defaultValue={defaults.name} className="field" />
        <Error message={fieldError(state, "name")} />
      </label>
      <label>
        <span className="label">Work email</span>
        <input name="email" type="email" required defaultValue={defaults.email} className="field" />
        <Error message={fieldError(state, "email")} />
      </label>
      <label>
        <span className="label">Company</span>
        <input name="company" defaultValue={defaults.company} className="field" />
      </label>
      <label>
        <span className="label">Phone</span>
        <input name="phone" defaultValue={defaults.phone} className="field" />
      </label>
      <label>
        <span className="label">Quantity</span>
        <input name="quantityRequested" inputMode="numeric" className="field" placeholder="1" />
        <Error message={fieldError(state, "quantityRequested")} />
      </label>
      <label>
        <span className="label">Message</span>
        <textarea
          name="message"
          required
          minLength={10}
          className="field"
          placeholder="What you need, timing, and whether you can inspect in person."
        />
        <Error message={fieldError(state, "message")} />
      </label>
      <Submit />
    </form>
  );
}

function Error({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-sm text-danger">{message}</span>;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-copper" disabled={pending}>
      {pending ? "Sending…" : "Request a quote"}
    </button>
  );
}
