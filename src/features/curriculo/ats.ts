import "server-only";

/**
 * Scanner de compatibilidade de leitura (ATS). Determinístico: analisa o texto que um sistema
 * de recrutamento consegue extrair do arquivo. É uma estimativa do KairusEdu, não a nota de um
 * ATS real, e não garante aprovação em nenhum processo seletivo.
 */

export type Prioridade = "critico" | "alto" | "medio";

export type Verificacao = {
  id: string;
  titulo: string;
  ok: boolean;
  prioridade: Prioridade;
  detalhe: string;
};

export type ResultadoScan = {
  versao: 1;
  pontuacao: number;
  paginas: number;
  palavras: number;
  verificacoes: Verificacao[];
  termosVaga?: { vaga: string; encontrados: string[]; ausentes: string[] };
};

const PENALIDADE: Record<Prioridade, number> = { critico: 25, alto: 12, medio: 5 };

export async function extrairTexto(arquivo: Uint8Array, formato: "pdf" | "docx"): Promise<{ texto: string; paginas: number }> {
  if (formato === "pdf") {
    const { extractText, getDocumentProxy } = await import("unpdf");
    // O pdf.js transfere (desanexa) o buffer recebido; usa uma cópia para o original seguir utilizável.
    const pdf = await getDocumentProxy(arquivo.slice());
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    return { texto: text, paginas: totalPages };
  }
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(arquivo) });
  // DOCX não tem páginas fixas; estimativa de ~500 palavras por página.
  const palavras = value.split(/\s+/).filter(Boolean).length;
  return { texto: value, paginas: Math.max(1, Math.ceil(palavras / 500)) };
}

/** Confere a assinatura do arquivo, sem confiar na extensão ou no tipo informado pelo navegador. */
export function detectarFormato(bytes: Uint8Array): "pdf" | "docx" | null {
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf"; // %PDF
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "docx"; // ZIP (OOXML)
  return null;
}

function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

const SECOES = {
  formacao: /(^|\n)\s*(forma[cç][aã]o|educa[cç][aã]o|escolaridade|forma[cç][aã]o acad[eê]mica)\b/i,
  experiencia: /(^|\n)\s*(experi[eê]ncias?( profissional| profissionais)?|hist[oó]rico profissional)\b/i,
  competencias: /(^|\n)\s*(compet[eê]ncias|habilidades|conhecimentos|qualifica[cç][oõ]es)\b/i,
  resumo: /(^|\n)\s*(resumo|perfil( profissional)?|objetivo|sobre mim)\b/i,
};

export function escanear(texto: string, paginas: number, vaga?: { titulo: string; termos: string[] }): ResultadoScan {
  const limpo = texto.replace(/\r/g, "");
  const palavras = limpo.split(/\s+/).filter(Boolean).length;
  const linhas = limpo.split("\n").map((l) => l.trim()).filter(Boolean);
  const v: Verificacao[] = [];

  const legivel = palavras >= 60 && /[a-zà-ú]{3,}/i.test(limpo);
  v.push({
    id: "texto",
    titulo: "Texto extraível",
    ok: legivel,
    prioridade: "critico",
    detalhe: legivel
      ? `${palavras} palavras lidas do arquivo.`
      : "Quase nenhum texto pôde ser lido. O arquivo provavelmente é uma imagem; gere um PDF com texto selecionável.",
  });

  const artefatos = [
    /https?:\/\/(localhost|127\.0\.0\.1)[^\s]*/i,
    /(^|\n)\s*\d{2}\/\d{2}\/\d{4},?\s+\d{2}:\d{2}/,
    /about:blank/i,
    /(^|\n)\s*\d+\s*\/\s*\d+\s*$/m,
    /(^|\n)\s*p[aá]gina \d+ de \d+/i,
  ].filter((r) => r.test(limpo));
  v.push({
    id: "artefatos",
    titulo: "Sem marcas de impressão do navegador",
    ok: artefatos.length === 0,
    prioridade: "critico",
    detalhe:
      artefatos.length === 0
        ? "Nenhum endereço, data de impressão ou numeração de página encontrada."
        : "Há endereço da página, data e hora de impressão ou numeração vindos da impressão do navegador. Gere o PDF pelo KairusEdu ou desative cabeçalhos e rodapés na impressão.",
  });

  const email = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(limpo);
  v.push({
    id: "email",
    titulo: "E-mail de contato",
    ok: email,
    prioridade: "critico",
    detalhe: email ? "E-mail encontrado." : "Nenhum e-mail encontrado. Recrutadores precisam de um contato.",
  });

  const telefone = /(\(?\d{2}\)?[\s.-]?)?9?\d{4}[\s.-]?\d{4}/.test(limpo);
  v.push({
    id: "telefone",
    titulo: "Telefone",
    ok: telefone,
    prioridade: "alto",
    detalhe: telefone ? "Telefone encontrado." : "Inclua um telefone com DDD.",
  });

  const cidade = /[A-ZÀ-Ú][a-zà-ú]+(\s[A-Za-zÀ-ú]+)*\s?[,/-]\s?[A-Z]{2}\b/.test(limpo);
  v.push({
    id: "cidade",
    titulo: "Cidade e estado",
    ok: cidade,
    prioridade: "medio",
    detalhe: cidade ? "Localização encontrada." : "Inclua sua cidade e estado (ex.: Volta Redonda, RJ).",
  });

  const faltando = (["formacao", "competencias"] as const).filter((s) => !SECOES[s].test(limpo));
  v.push({
    id: "secoes",
    titulo: "Seções com títulos padrão",
    ok: faltando.length === 0,
    prioridade: "alto",
    detalhe:
      faltando.length === 0
        ? "Formação e competências identificadas por títulos que os sistemas reconhecem."
        : `Não encontramos título de ${faltando.map((f) => (f === "formacao" ? "Formação" : "Competências")).join(" e ")}. Use títulos padrão, como "Formação acadêmica" e "Competências".`,
  });

  const temExperiencia = SECOES.experiencia.test(limpo);
  // mm/aaaa sem um dia antes (não conta datas completas, como a data de impressão do navegador).
  const datas = (limpo.match(/(?<![\d/])(0[1-9]|1[0-2])\/(19|20)\d{2}\b|\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?\s+(de\s+)?(19|20)\d{2}\b|\b(19|20)\d{2}\s*[–-]\s*((19|20)\d{2}|atual)\b/gi) ?? []).length;
  v.push({
    id: "datas",
    titulo: "Datas nas experiências",
    ok: !temExperiencia || datas >= 1,
    prioridade: "alto",
    detalhe: !temExperiencia
      ? "Sem seção de experiência; tudo bem para quem está no começo do curso."
      : datas >= 1
        ? `${datas} ${datas === 1 ? "data encontrada" : "datas encontradas"}.`
        : "Inclua mês e ano de início e fim de cada experiência (ex.: 03/2024 – atual).",
  });

  const topicos = linhas.filter((l) => /^[•●▪◦\-–*]\s?\S/.test(l)).length;
  v.push({
    id: "topicos",
    titulo: "Experiências em tópicos",
    ok: topicos >= 3,
    prioridade: "alto",
    detalhe:
      topicos >= 3
        ? `${topicos} tópicos encontrados.`
        : "Descreva o que você fez em tópicos curtos, em vez de um parágrafo único.",
  });

  const tamanhoOk = palavras >= 150 && palavras <= 900 && paginas <= 2;
  v.push({
    id: "tamanho",
    titulo: "Tamanho adequado",
    ok: tamanhoOk,
    prioridade: "medio",
    detalhe: tamanhoOk
      ? `${paginas} ${paginas === 1 ? "página" : "páginas"}, ${palavras} palavras.`
      : paginas > 2
        ? "Mais de 2 páginas. Para estágio, prefira 1 página."
        : palavras < 150
          ? "Pouco conteúdo. Inclua projetos, atividades e competências."
          : "Texto longo. Prefira tópicos objetivos.",
  });

  const icones = (limpo.match(/[-]|\p{Extended_Pictographic}/gu) ?? []).length;
  v.push({
    id: "icones",
    titulo: "Sem ícones e símbolos decorativos",
    ok: icones === 0,
    prioridade: "medio",
    detalhe:
      icones === 0
        ? "Nenhum ícone ou emoji encontrado."
        : "Há ícones ou emojis no texto. Sistemas de recrutamento podem ler isso como caracteres estranhos.",
  });

  let termosVaga: ResultadoScan["termosVaga"];
  if (vaga && vaga.termos.length) {
    const alvo = normalizar(limpo);
    const encontrados = vaga.termos.filter((t) => alvo.includes(normalizar(t)));
    termosVaga = { vaga: vaga.titulo, encontrados, ausentes: vaga.termos.filter((t) => !encontrados.includes(t)) };
  }

  const pontuacao = Math.max(0, 100 - v.filter((x) => !x.ok).reduce((s, x) => s + PENALIDADE[x.prioridade], 0));
  return { versao: 1, pontuacao, paginas, palavras, verificacoes: v, termosVaga };
}
