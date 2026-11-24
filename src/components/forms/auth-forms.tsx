"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { login, signup } from "@/actions/auth";
import { fieldError, type ActionState } from "@/lib/types";

export function LoginForm({ next, suspended }: { next?: string; suspended: boolean }) {
  const [state, action] = useActionState(login, {} as ActionState);
  return (
    <form action={action} className="panel grid gap-4 p-6">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {suspended ? (
        <p className="text-sm text-danger">This account is suspended. Contact the marketplace operator.</p>
      ) : null}
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <label>
        <span className="label">Email</span>
        <input name="email" type="email" required autoComplete="email" className="field" />
      </label>
      <label>
        <span className="label">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      <Submit label="Log in" />
      <p className="text-sm text-muted">
        New here? <Link href="/signup" className="font-semibold text-pine">Create an account</Link>
      </p>
    </form>
  );
}

export function SignupForm({ defaultRole }: { defaultRole: "BUYER" | "SELLER" }) {
  const [state, action] = useActionState(signup, {} as ActionState);
  return (
    <form action={action} className="panel grid gap-4 p-6">
      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      <label>
        <span className="label">Name</span>
        <input name="name" required className="field" />
        <FieldError message={fieldError(state, "name")} />
      </label>
      <label>
        <span className="label">Work email</span>
        <input name="email" type="email" required className="field" />
        <FieldError message={fieldError(state, "email")} />
      </label>
      <label>
        <span className="label">Password</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
        <FieldError message={fieldError(state, "password")} />
      </label>
      <label>
        <span className="label">Company</span>
        <input name="company" className="field" />
        <FieldError message={fieldError(state, "company")} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="label">Phone</span>
          <input name="phone" className="field" />
        </label>
        <label>
          <span className="label">Location</span>
          <input name="location" placeholder="Bend, OR" className="field" />
        </label>
      </div>
      <fieldset>
        <legend className="label">Account type</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="BUYER" defaultChecked={defaultRole !== "SELLER"} />
            Buyer — inquire on equipment
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="SELLER" defaultChecked={defaultRole === "SELLER"} />
            Seller — list equipment
          </label>
        </div>
      </fieldset>
      <Submit label="Create account" />
      <p className="text-sm text-muted">
        Already registered? <Link href="/login" className="font-semibold text-pine">Log in</Link>
      </p>
    </form>
  );
}

export function DemoAccounts() {
  const rows = [
    ["Seller", "maya@cascadecritical.example", "SellerDemo!2026"],
    ["Seller", "james@ironcladsurplus.example", "SellerDemo!2026"],
    ["Seller", "priya@ashburnspares.example", "SellerDemo!2026"],
    ["Buyer", "dana@northlinecolo.example", "BuyerDemo!2026"],
    ["Admin", "admin@axiveris.example", "AxiverisAdmin!2026"],
  ];
  return (
    <aside className="panel mt-6 p-4 text-sm">
      <p className="label">Local demo accounts</p>
      <p className="mb-3 text-muted">Shown only when the app is not running in production.</p>
      <ul className="space-y-1 font-mono text-xs">
        {rows.map(([role, email, password]) => (
          <li key={email}>
            {role}: {email} / {password}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="mt-1 block text-sm text-danger">{message}</span>;
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending}>
      {pending ? "Please wait…" : label}
    </button>
  );
}
