import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-control border border-line-strong bg-surface px-4 py-3 text-[15px] leading-6 text-navy placeholder:text-muted aria-[invalid=true]:border-danger disabled:bg-canvas";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("text-[13px] leading-5 font-semibold", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "appearance-auto py-2.5", className)} {...props} />;
}

type FieldProps = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

/** Rótulo + controle + mensagem de erro, ligados por id/aria. */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-[13px] leading-5 text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-[13px] leading-5 font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "bg-danger-bg text-danger",
  success: "bg-ok-bg text-ok",
  info: "bg-tint text-navy",
};

export function FormMessage({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-control px-3 py-2 text-[13px] leading-5 font-semibold", tones[tone])}
    >
      {children}
    </div>
  );
}
