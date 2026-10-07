import { cn } from "@/lib/cn";

/** Marca do protótipo: quadrado branco com ponto azul. */
export function Logo({ className, label = "KairusEdu" }: { className?: string; label?: string }) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <span aria-hidden className="flex size-7 items-center justify-center rounded-control bg-white">
        <span className="size-2 rounded-full bg-accent" />
      </span>
      <span className="text-lg font-extrabold">{label}</span>
    </span>
  );
}
