"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { requestMatch } from "@/actions/match";
import type { ActionState } from "@/lib/types";

export function RequestMatch({
  listingId,
  label,
  score,
  reasons,
}: {
  listingId: string;
  label: string;
  score: number;
  reasons: string[];
}) {
  const [state, action] = useActionState(requestMatch, {} as ActionState);
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="score" value={score} />
      <input type="hidden" name="reasons" value={reasons.join(" ")} />
      {state.success ? <p className="text-sm text-pine">{state.success}</p> : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <input name="name" required placeholder="Name" className="field" aria-label="Name" />
        <input name="email" type="email" required placeholder="Work email" className="field" aria-label="Work email" />
      </div>
      <RequestButton />
    </form>
  );
}

function RequestButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-copper" disabled={pending}>
      {pending ? "Sending…" : "Request a quote"}
    </button>
  );
}
