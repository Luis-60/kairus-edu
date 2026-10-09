import "server-only";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { TITULO_SECAO, type Conteudo, type ItemConteudo, type Secao } from "./conteudo";

/**
 * Currículo em PDF para ATS: coluna única, fonte padrão (Helvetica), títulos de seção
 * padronizados, texto selecionável, sem tabelas, ícones, imagens, cabeçalhos ou rodapés.
 */

type Modelo = "classico" | "compacto";

function estilos(modelo: Modelo) {
  const compacto = modelo === "compacto";
  return StyleSheet.create({
    pagina: {
      paddingVertical: compacto ? 32 : 40,
      paddingHorizontal: compacto ? 40 : 48,
      fontFamily: "Helvetica",
      fontSize: compacto ? 9.5 : 10.5,
      lineHeight: 1.35,
      color: "#111111",
    },
    // lineHeight próprio: herdando 1.35, a caixa do nome invade a linha seguinte e leitores de ATS
    // juntam nome e título numa palavra só ("Ana LimaEstudante").
    nome: { fontFamily: "Helvetica-Bold", fontSize: compacto ? 17 : 20, lineHeight: 1.1 },
    titulo: { marginTop: 4, fontSize: compacto ? 10 : 11 },
    contato: { marginTop: 4, color: "#333333" },
    secao: { marginTop: compacto ? 10 : 14 },
    secaoTitulo: {
      fontFamily: "Helvetica-Bold",
      fontSize: compacto ? 10 : 11,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      borderBottomWidth: 0.75,
      borderBottomColor: "#999999",
      paddingBottom: 2,
      marginBottom: compacto ? 4 : 6,
    },
    item: { marginBottom: compacto ? 5 : 7 },
    itemCabecalho: { flexDirection: "row", justifyContent: "space-between" },
    itemTitulo: { fontFamily: "Helvetica-Bold", flexShrink: 1, paddingRight: 8 },
    itemPeriodo: { color: "#333333" },
    itemSubtitulo: { color: "#333333" },
    topico: { flexDirection: "row", marginTop: 1.5 },
    marcador: { width: 10 },
    topicoTexto: { flex: 1 },
  });
}

type Estilos = ReturnType<typeof estilos>;

function Item({ item, s }: { item: ItemConteudo; s: Estilos }) {
  return (
    <View style={s.item} wrap={false}>
      <View style={s.itemCabecalho}>
        <Text style={s.itemTitulo}>{item.titulo}</Text>
        {item.periodo ? <Text style={s.itemPeriodo}>{item.periodo}</Text> : null}
      </View>
      {item.subtitulo ? <Text style={s.itemSubtitulo}>{item.subtitulo}</Text> : null}
      {item.topicos.map((t, i) => (
        <View key={i} style={s.topico}>
          <Text style={s.marcador}>•</Text>
          <Text style={s.topicoTexto}>{t}</Text>
        </View>
      ))}
    </View>
  );
}

function Secao({ secao, c, s }: { secao: Secao; c: Conteudo; s: Estilos }) {
  const listas: Partial<Record<Secao, ItemConteudo[]>> = {
    formacao: c.formacao,
    experiencia: c.experiencia,
    projetos: c.projetos,
    atividades: c.atividades,
    certificacoes: c.certificacoes,
  };

  let corpo: React.ReactNode = null;
  if (secao === "resumo") {
    if (!c.resumo) return null;
    corpo = <Text>{c.resumo}</Text>;
  } else if (secao === "habilidades") {
    const { tecnicas, comportamentais } = c.habilidades;
    if (!tecnicas.length && !comportamentais.length) return null;
    corpo = (
      <View>
        {tecnicas.length ? <Text>Técnicas: {tecnicas.join(", ")}</Text> : null}
        {comportamentais.length ? <Text>Comportamentais: {comportamentais.join(", ")}</Text> : null}
      </View>
    );
  } else if (secao === "idiomas") {
    if (!c.idiomas.length) return null;
    corpo = <Text>{c.idiomas.join(" · ")}</Text>;
  } else {
    const itens = listas[secao] ?? [];
    if (!itens.length) return null;
    corpo = itens.map((it) => <Item key={it.id} item={it} s={s} />);
  }

  return (
    <View style={s.secao}>
      <Text style={s.secaoTitulo}>{TITULO_SECAO[secao]}</Text>
      {corpo}
    </View>
  );
}

export async function renderizarCurriculo(c: Conteudo, modelo: Modelo): Promise<Uint8Array> {
  const s = estilos(modelo);
  const contato = [c.contato.email, c.contato.telefone, c.contato.cidade].filter(Boolean).join(" · ");
  const links = [c.contato.linkedin, c.contato.portfolio].filter(Boolean).join(" · ");

  const documento = (
    <Document title={`Currículo - ${c.nome}`} author={c.nome} language="pt-BR" creator="KairusEdu" producer="KairusEdu">
      <Page size="A4" style={s.pagina}>
        <Text style={s.nome}>{c.nome}</Text>
        {c.titulo ? <Text style={s.titulo}>{c.titulo}</Text> : null}
        {contato ? <Text style={s.contato}>{contato}</Text> : null}
        {links ? <Text style={s.contato}>{links}</Text> : null}
        {c.secoes.map((secao) => (
          <Secao key={secao} secao={secao} c={c} s={s} />
        ))}
      </Page>
    </Document>
  );

  const buffer = await renderToBuffer(documento);
  return new Uint8Array(buffer);
}
