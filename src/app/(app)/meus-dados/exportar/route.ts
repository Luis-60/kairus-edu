import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

/**
 * Exportação dos dados do próprio estudante (direito de acesso e portabilidade, LGPD).
 * Todas as leituras passam pela RLS: só o que pertence ao usuário é incluído.
 */
export async function GET() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "estudante") return new NextResponse("Acesso não permitido.", { status: 403 });

  const supabase = await createClient();
  const { data: estudante } = await supabase
    .from("estudantes")
    .select("id, codigo, periodo_atual, situacao, created_at, cursos(nome)")
    .eq("perfil_id", sessao.userId)
    .maybeSingle();
  if (!estudante) return new NextResponse("Matrícula não vinculada.", { status: 404 });

  const id = estudante.id;
  const [
    indicadores, pedidos, questionarios, solicitacoes, candidaturas, competenciasInstituicao,
    perfil, experiencias, projetos, certificacoes, idiomas, habilidades, versoes, enviados, analises, titular, usoIa,
  ] = await Promise.all([
    supabase.from("indicadores_academicos").select("frequencia, coeficiente, disciplinas, entregas_atrasadas, creditos_concluidos_pct, periodos_letivos(codigo)").eq("estudante_id", id),
    supabase.from("pedidos_desligamento").select("tipo, status, aberto_em, concluido_em").eq("estudante_id", id),
    supabase
      .from("questionarios_desligamento")
      .select("status, versao, reconsideraria, consentimento_saude, enviado_em, questionario_motivos(motivo), questionario_respostas(pergunta, valor)")
      .eq("estudante_id", id),
    supabase.from("solicitacoes_apoio").select("assunto, mensagem, status, origem, created_at").eq("estudante_id", id),
    supabase.from("candidaturas").select("status, created_at, vagas(titulo)").eq("estudante_id", id),
    supabase.from("estudante_competencias").select("nivel, origem, competencias(nome)").eq("estudante_id", id),
    supabase.from("perfis_profissionais").select("tipo_vaga, area_interesse, objetivo, email_contato, telefone, cidade, linkedin, portfolio, disciplinas_relevantes, conquistas_academicas, rascunho, updated_at").eq("estudante_id", id),
    supabase.from("experiencias").select("tipo, cargo, organizacao, inicio, fim, atual, atividades, ferramentas, resultados").eq("estudante_id", id),
    supabase.from("projetos").select("titulo, problema, acoes, ferramentas, resultado, inicio, fim, link").eq("estudante_id", id),
    supabase.from("certificacoes").select("nome, emissor, concluido_em, carga_horaria").eq("estudante_id", id),
    supabase.from("idiomas").select("idioma, nivel").eq("estudante_id", id),
    supabase.from("habilidades").select("nome, categoria, evidencia, origem, status, confirmada_em").eq("estudante_id", id),
    supabase.from("curriculo_versoes").select("titulo, vaga_alvo, modelo, conteudo, scan, created_at").eq("estudante_id", id),
    supabase.from("curriculos_enviados").select("nome_exibicao, formato, tamanho_bytes, scan, created_at").eq("estudante_id", id),
    supabase.from("analises_vaga").select("origem, titulo, descricao, resultado, created_at").eq("estudante_id", id),
    supabase.from("pedidos_titular").select("tipo, mensagem, status, resposta, created_at, concluido_em").eq("perfil_id", sessao.userId),
    supabase.from("ia_uso").select("funcao, modelo, sucesso, criado_em").eq("perfil_id", sessao.userId),
  ]);

  const dados = {
    gerado_em: new Date().toISOString(),
    observacao:
      "Exportação dos seus dados no KairusEdu. Avaliações de risco produzidas pela instituição não são exibidas no portal; para obtê-las, abra um pedido de acesso em Meus dados.",
    titular: { nome: sessao.nome, instituicao: sessao.instituicaoNome },
    matricula: {
      codigo: estudante.codigo,
      curso: estudante.cursos?.nome,
      periodo_atual: estudante.periodo_atual,
      situacao: estudante.situacao,
    },
    academico: {
      indicadores: indicadores.data ?? [],
      competencias_reconhecidas: competenciasInstituicao.data ?? [],
    },
    permanencia: {
      pedidos_de_desligamento: pedidos.data ?? [],
      questionarios_de_desligamento: questionarios.data ?? [],
      pedidos_de_apoio: solicitacoes.data ?? [],
    },
    carreira: {
      perfil_profissional: perfil.data?.[0] ?? null,
      experiencias: experiencias.data ?? [],
      projetos: projetos.data ?? [],
      certificacoes: certificacoes.data ?? [],
      idiomas: idiomas.data ?? [],
      competencias: habilidades.data ?? [],
      versoes_de_curriculo: versoes.data ?? [],
      curriculos_enviados: enviados.data ?? [],
      analises_de_vaga: analises.data ?? [],
      candidaturas: candidaturas.data ?? [],
    },
    privacidade: { pedidos: titular.data ?? [] },
    uso_de_ia: usoIa.data ?? [],
  };

  return new NextResponse(JSON.stringify(dados, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-kairusedu.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
