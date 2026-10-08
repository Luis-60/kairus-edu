import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { Sessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Acesso ao modelo de linguagem pelo OpenRouter, usando o endpoint compatível com a API
 * Messages da Anthropic e o SDK oficial. A chave fica apenas no servidor.
 */
const MODELO = process.env.AI_MODEL ?? "anthropic/claude-opus-5.5";
const BASE_URL = "https://openrouter.ai/api";

export type FuncaoIA = "vivencias" | "curriculo" | "insights";

/** Gerações por usuário em 24 horas, por função. */
export const LIMITE_DIARIO: Record<FuncaoIA, number> = {
  vivencias: 10,
  curriculo: 10,
  insights: 5,
};

export type ErroIA = "indisponivel" | "limite" | "recusa" | "falha";

export type ResultadoIA<T> = { ok: true; data: T } | { ok: false; erro: ErroIA };

export const MENSAGEM_ERRO_IA: Record<ErroIA, string> = {
  indisponivel: "A IA não está configurada neste ambiente.",
  limite: "Você atingiu o limite diário de gerações com IA. Tente novamente amanhã.",
  recusa: "A IA não conseguiu gerar uma resposta para este conteúdo. Revise o texto e tente de novo.",
  falha: "Não foi possível gerar agora. Tente novamente em instantes.",
};

let cliente: Anthropic | null = null;

function obterCliente(): Anthropic | null {
  const chave = process.env.OPENROUTER_API_KEY;
  if (!chave) return null;
  cliente ??= new Anthropic({
    baseURL: BASE_URL,
    apiKey: null,
    authToken: chave,
    timeout: 90_000,
    maxRetries: 1,
  });
  return cliente;
}

const RESTRICOES_NAO_SUPORTADAS = new Set(["$schema", "maxLength", "minLength", "maxItems", "minItems", "pattern", "format"]);

/** JSON Schema para a saída estruturada; limites de tamanho são validados depois, com Zod. */
function schemaParaModelo(schema: z.ZodType): Record<string, unknown> {
  const limpar = (valor: unknown): unknown => {
    if (Array.isArray(valor)) return valor.map(limpar);
    if (valor && typeof valor === "object") {
      return Object.fromEntries(
        Object.entries(valor)
          .filter(([chave]) => !RESTRICOES_NAO_SUPORTADAS.has(chave))
          .map(([chave, v]) => [chave, limpar(v)]),
      );
    }
    return valor;
  };
  return limpar(z.toJSONSchema(schema, { target: "draft-7" })) as Record<string, unknown>;
}

type Opcoes<T extends z.ZodType> = {
  funcao: FuncaoIA;
  sessao: Sessao;
  sistema: string;
  conteudo: string;
  schema: T;
  esforco?: "low" | "medium" | "high";
  maxTokens?: number;
};

/**
 * Gera uma resposta estruturada e validada. Aplica o limite diário por usuário e registra o uso
 * (tokens e custo, nunca o conteúdo) em ia_uso.
 */
export async function gerarEstruturado<T extends z.ZodType>({
  funcao,
  sessao,
  sistema,
  conteudo,
  schema,
  esforco = "low",
  maxTokens = 8000,
}: Opcoes<T>): Promise<ResultadoIA<z.infer<T>>> {
  const ia = obterCliente();
  if (!ia) return { ok: false, erro: "indisponivel" };

  const supabase = await createClient();
  const { data: usos } = await supabase.rpc("ia_usos_hoje", { p_funcao: funcao });
  if ((usos ?? 0) >= LIMITE_DIARIO[funcao]) return { ok: false, erro: "limite" };

  const registrar = async (sucesso: boolean, uso?: Anthropic.Usage) => {
    const custo = (uso as (Anthropic.Usage & { cost?: number }) | undefined)?.cost;
    const { error } = await supabase.from("ia_uso").insert({
      instituicao_id: sessao.instituicaoId,
      perfil_id: sessao.userId,
      funcao,
      modelo: MODELO,
      sucesso,
      tokens_entrada: uso?.input_tokens ?? null,
      tokens_saida: uso?.output_tokens ?? null,
      custo_usd: typeof custo === "number" ? custo : null,
    });
    if (error) console.error("[ia] falha ao registrar uso", error.code);
  };

  try {
    const resposta = await ia.messages.create({
      model: MODELO,
      max_tokens: maxTokens,
      system: sistema,
      output_config: {
        effort: esforco,
        format: { type: "json_schema", schema: schemaParaModelo(schema) },
      },
      messages: [{ role: "user", content: conteudo }],
    });

    if (resposta.stop_reason === "refusal") {
      await registrar(false, resposta.usage);
      return { ok: false, erro: "recusa" };
    }
    if (resposta.stop_reason === "max_tokens") {
      await registrar(false, resposta.usage);
      return { ok: false, erro: "falha" };
    }

    const texto = resposta.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    let json: unknown;
    try {
      json = JSON.parse(texto);
    } catch {
      await registrar(false, resposta.usage);
      return { ok: false, erro: "falha" };
    }

    const validado = schema.safeParse(json);
    await registrar(validado.success, resposta.usage);
    if (!validado.success) {
      console.error("[ia] resposta fora do formato esperado", funcao);
      return { ok: false, erro: "falha" };
    }
    return { ok: true, data: validado.data };
  } catch (error) {
    // Registra apenas o tipo do erro; nunca o conteúdo enviado.
    if (error instanceof Anthropic.RateLimitError) console.error("[ia] limite do provedor", funcao);
    else if (error instanceof Anthropic.AuthenticationError) console.error("[ia] chave inválida", funcao);
    else if (error instanceof Anthropic.APIError) console.error("[ia] erro da API", error.status, funcao);
    else console.error("[ia] falha de conexão", funcao);
    await registrar(false);
    return { ok: false, erro: "falha" };
  }
}
