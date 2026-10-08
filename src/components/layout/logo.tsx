import Image from "next/image";
import { cn } from "@/lib/cn";
import wordmark from "../../../public/brand/wordmark.png";
import wordmarkBranco from "../../../public/brand/wordmark-branco.png";

type LogoProps = {
  /** Fundo sobre o qual a marca aparece: "escuro" usa a versão branca (sidebar, painel do login). */
  fundo?: "claro" | "escuro";
  className?: string;
  priority?: boolean;
};

/** Marca kairus.edu (wordmark). A altura é definida por className; a largura acompanha a proporção. */
export function Logo({ fundo = "escuro", className, priority }: LogoProps) {
  return (
    <Image
      src={fundo === "escuro" ? wordmarkBranco : wordmark}
      alt="KairusEdu"
      priority={priority}
      className={cn("h-6 w-auto", className)}
    />
  );
}
