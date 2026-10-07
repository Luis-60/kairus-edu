import { NextResponse } from "next/server";
import { carregarVisaoGeral } from "@/features/gestao/queries";
import { getSessao } from "@/lib/auth/session";
import { MODALIDADE, MOTIVO } from "@/lib/labels";

function linha(campos: (string | number | null | undefined)[]) {
  return campos
    .map((c) => {
      const texto = c == null ? "" : String(c);
      return /[";\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    })
    .join(";");
}

/** Relatório da visão geral em CSV. Apenas dados agregados, sem identificação de alunos. */
export async function GET() {
  const sessao = await getSessao();
  if (!sessao || sessao.papel !== "gestor") {
    return new NextResponse("Acesso não permitido.", { status: 403 });
  }

  const d = await carregarVisaoGeral();
  if (!d.kpis.ok || !d.semestres.ok || !d.cursos.ok || !d.periodos.ok || !d.modalidades.ok || !d.motivos.ok) {
    return new NextResponse("Não foi possível gerar o relatório. Tente novamente.", { status: 500 });
  }

  const k = d.kpis.data;
  const linhas: string[] = [
    linha(["Indicador", "Valor", "Período anterior"]),
    linha(["Semestre encerrado", k.periodo_encerrado, ""]),
    linha(["Taxa de evasão (%)", k.taxa_evasao, k.taxa_evasao_anterior]),
    linha(["Cancelamentos", k.cancelamentos, k.cancelamentos_anterior]),
    linha(["Trancamentos", k.trancamentos, k.trancamentos_anterior]),
    linha(["Alunos em risco", k.alunos_risco, k.alunos_risco_anterior]),
    "",
    linha(["Semestre", "Alunos", "Evadidos", "Evasão (%)"]),
    ...d.semestres.data.map((s) => linha([s.codigo, s.total, s.evadidos, s.taxa])),
    "",
    linha(["Curso", "Alunos", "Evadidos", "Evasão (%)"]),
    ...d.cursos.data.map((c) => linha([c.rotulo, c.total, c.evadidos, c.taxa])),
    "",
    linha(["Período do curso", "Alunos", "Evadidos", "Evasão (%)"]),
    ...d.periodos.data.map((p) => linha([p.rotulo, p.total, p.evadidos, p.taxa])),
    "",
    linha(["Modalidade", "Alunos", "Evadidos", "Evasão (%)"]),
    ...d.modalidades.data.map((m) =>
      linha([MODALIDADE[m.rotulo as keyof typeof MODALIDADE] ?? m.rotulo, m.total, m.evadidos, m.taxa]),
    ),
    "",
    linha(["Motivo de desligamento", "Respostas", "Percentual (%)"]),
    ...d.motivos.data.map((m) => linha([MOTIVO[m.motivo], m.total, m.percentual])),
  ];

  // BOM para que planilhas abram os acentos corretamente.
  const corpo = "﻿" + linhas.join("\r\n");
  const nome = `relatorio-permanencia-${k.periodo_encerrado ?? "atual"}.csv`;

  return new NextResponse(corpo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
