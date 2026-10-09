import { z } from "zod";

/**
 * Conteúdo estruturado do currículo. É o que o estudante edita, o que vai para o PDF e o que
 * fica guardado em cada versão. A IA só preenche textos (resumo e tópicos); nunca a estrutura.
 */
export const SECOES = [
  "resumo",
  "experiencia",
  "formacao",
  "projetos",
  "atividades",
  "habilidades",
  "certificacoes",
  "idiomas",
] as const;

export type Secao = (typeof SECOES)[number];

/** Títulos de seção padronizados, reconhecidos por sistemas de recrutamento. */
export const TITULO_SECAO: Record<Secao, string> = {
  resumo: "Resumo profissional",
  experiencia: "Experiência profissional",
  formacao: "Formação acadêmica",
  projetos: "Projetos",
  atividades: "Atividades complementares e voluntariado",
  habilidades: "Competências",
  certificacoes: "Certificações e cursos",
  idiomas: "Idiomas",
};

const texto = (max: number) => z.string().trim().max(max);

const itemSchema = z.object({
  id: z.string().max(60),
  titulo: texto(160).min(1),
  subtitulo: texto(200).optional().default(""),
  periodo: texto(60).optional().default(""),
  topicos: z.array(texto(260).min(1)).max(8),
});

export const conteudoSchema = z.object({
  nome: texto(120).min(1),
  titulo: texto(160).optional().default(""),
  contato: z.object({
    email: texto(254).optional().default(""),
    telefone: texto(30).optional().default(""),
    cidade: texto(80).optional().default(""),
    linkedin: texto(200).optional().default(""),
    portfolio: texto(200).optional().default(""),
  }),
  resumo: texto(900).optional().default(""),
  secoes: z.array(z.enum(SECOES)).max(SECOES.length),
  formacao: z.array(itemSchema).max(5),
  experiencia: z.array(itemSchema).max(12),
  projetos: z.array(itemSchema).max(12),
  atividades: z.array(itemSchema).max(12),
  habilidades: z.object({
    tecnicas: z.array(texto(100).min(1)).max(40),
    comportamentais: z.array(texto(100).min(1)).max(20),
  }),
  certificacoes: z.array(itemSchema).max(20),
  idiomas: z.array(texto(100).min(1)).max(10),
  vagaAlvo: texto(160).optional().default(""),
});

export type Conteudo = z.infer<typeof conteudoSchema>;
export type ItemConteudo = z.infer<typeof itemSchema>;

export type Pendencia = { nivel: "critico" | "alto" | "medio"; texto: string };

/** Verificações antes de exportar. Não bloqueiam a exportação, mas são mostradas ao estudante. */
export function verificarConteudo(c: Conteudo): Pendencia[] {
  const p: Pendencia[] = [];
  if (!c.contato.email) p.push({ nivel: "critico", texto: "Inclua um e-mail de contato." });
  if (!c.contato.telefone) p.push({ nivel: "alto", texto: "Inclua um telefone de contato." });
  if (!c.contato.cidade) p.push({ nivel: "medio", texto: "Inclua sua cidade e estado." });
  if (!c.resumo) p.push({ nivel: "alto", texto: "Escreva um resumo profissional de 2 a 3 frases." });
  const semData = [...c.experiencia, ...c.atividades].filter((i) => !i.periodo);
  if (semData.length) {
    p.push({ nivel: "alto", texto: `Informe o período (mês e ano) de: ${semData.map((i) => i.titulo).join(", ")}.` });
  }
  const semTopicos = [...c.experiencia, ...c.projetos, ...c.atividades].filter((i) => i.topicos.length === 0);
  if (semTopicos.length) {
    p.push({ nivel: "medio", texto: `Descreva em tópicos o que você fez em: ${semTopicos.map((i) => i.titulo).join(", ")}.` });
  }
  if (c.habilidades.tecnicas.length === 0) p.push({ nivel: "alto", texto: "Confirme ao menos uma competência técnica." });
  if (c.experiencia.length === 0 && c.projetos.length === 0 && c.atividades.length === 0) {
    p.push({ nivel: "medio", texto: "Inclua projetos ou atividades para mostrar o que você já fez." });
  }
  return p;
}
