
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "acoes_permanencia": {
                  Row: {
                    "concluida_em": string | null,"created_at": string,"criada_por": string,"descricao": string,"estudante_id": string,"id": string,"instituicao_id": string,"prazo": string,"responsavel_id": string,"status": Database["public"]['Enums']["status_acao"],"tipo": Database["public"]['Enums']["tipo_acao"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "concluida_em"?: string | null,"created_at"?: string,"criada_por"?: string,"descricao": string,"estudante_id": string,"id"?: string,"instituicao_id": string,"prazo": string,"responsavel_id": string,"status"?: Database["public"]['Enums']["status_acao"],"tipo": Database["public"]['Enums']["tipo_acao"],"updated_at"?: string
                  }
                  Update: {
                    "concluida_em"?: string | null,"created_at"?: string,"criada_por"?: string,"descricao"?: string,"estudante_id"?: string,"id"?: string,"instituicao_id"?: string,"prazo"?: string,"responsavel_id"?: string,"status"?: Database["public"]['Enums']["status_acao"],"tipo"?: Database["public"]['Enums']["tipo_acao"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "acoes_permanencia_criada_por_instituicao_id_fkey"
      columns: ["criada_por","instituicao_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "acoes_permanencia_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "acoes_permanencia_responsavel_id_instituicao_id_fkey"
      columns: ["responsavel_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"area_passos": {
                  Row: {
                    "area_id": string,"descricao": string,"id": string,"instituicao_id": string,"ordem": number,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "area_id": string,"descricao": string,"id"?: string,"instituicao_id": string,"ordem": number,"titulo": string
                  }
                  Update: {
                    "area_id"?: string,"descricao"?: string,"id"?: string,"instituicao_id"?: string,"ordem"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "area_passos_area_id_instituicao_id_fkey"
      columns: ["area_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "areas_atuacao"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"areas_atuacao": {
                  Row: {
                    "curso_id": string,"descricao": string,"id": string,"instituicao_id": string,"nome": string,"ordem": number
                  }
                  ComputedFields: never
                  Insert: {
                    "curso_id": string,"descricao": string,"id"?: string,"instituicao_id": string,"nome": string,"ordem"?: number
                  }
                  Update: {
                    "curso_id"?: string,"descricao"?: string,"id"?: string,"instituicao_id"?: string,"nome"?: string,"ordem"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "areas_atuacao_curso_id_instituicao_id_fkey"
      columns: ["curso_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "acao": string,"ator_id": string | null,"detalhes": NonNullable<Json>,"entidade": string,"entidade_id": string | null,"id": number,"instituicao_id": string,"ocorrido_em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acao": string,"ator_id"?: string | null,"detalhes"?: NonNullable<Json>,"entidade": string,"entidade_id"?: string | null,"id"?: never,"instituicao_id": string,"ocorrido_em"?: string
                  }
                  Update: {
                    "acao"?: string,"ator_id"?: string | null,"detalhes"?: NonNullable<Json>,"entidade"?: string,"entidade_id"?: string | null,"id"?: never,"instituicao_id"?: string,"ocorrido_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"avaliacoes_risco": {
                  Row: {
                    "acao_sugerida": string | null,"acao_sugerida_descricao": string | null,"created_at": string,"estudante_id": string,"faixa": Database["public"]['Enums']["faixa_risco"],"fatores": NonNullable<Json>,"gerada_em": string,"id": string,"instituicao_id": string,"modelo_versao": string,"periodo_letivo_id": string,"probabilidade": number
                  }
                  ComputedFields: never
                  Insert: {
                    "acao_sugerida"?: string | null,"acao_sugerida_descricao"?: string | null,"created_at"?: string,"estudante_id": string,"faixa": Database["public"]['Enums']["faixa_risco"],"fatores"?: NonNullable<Json>,"gerada_em"?: string,"id"?: string,"instituicao_id": string,"modelo_versao": string,"periodo_letivo_id": string,"probabilidade": number
                  }
                  Update: {
                    "acao_sugerida"?: string | null,"acao_sugerida_descricao"?: string | null,"created_at"?: string,"estudante_id"?: string,"faixa"?: Database["public"]['Enums']["faixa_risco"],"fatores"?: NonNullable<Json>,"gerada_em"?: string,"id"?: string,"instituicao_id"?: string,"modelo_versao"?: string,"periodo_letivo_id"?: string,"probabilidade"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "avaliacoes_risco_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "avaliacoes_risco_periodo_letivo_id_instituicao_id_fkey"
      columns: ["periodo_letivo_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "periodos_letivos"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"candidaturas": {
                  Row: {
                    "created_at": string,"estudante_id": string,"id": string,"instituicao_id": string,"status": Database["public"]['Enums']["status_candidatura"],"updated_at": string,"vaga_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estudante_id": string,"id"?: string,"instituicao_id": string,"status"?: Database["public"]['Enums']["status_candidatura"],"updated_at"?: string,"vaga_id": string
                  }
                  Update: {
                    "created_at"?: string,"estudante_id"?: string,"id"?: string,"instituicao_id"?: string,"status"?: Database["public"]['Enums']["status_candidatura"],"updated_at"?: string,"vaga_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidaturas_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "candidaturas_vaga_id_instituicao_id_fkey"
      columns: ["vaga_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "vagas"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"competencias": {
                  Row: {
                    "created_at": string,"id": string,"instituicao_id": string,"nome": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"instituicao_id": string,"nome": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"instituicao_id"?: string,"nome"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "competencias_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"coordenacoes_curso": {
                  Row: {
                    "created_at": string,"curso_id": string,"instituicao_id": string,"perfil_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"curso_id": string,"instituicao_id": string,"perfil_id": string
                  }
                  Update: {
                    "created_at"?: string,"curso_id"?: string,"instituicao_id"?: string,"perfil_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "coordenacoes_curso_curso_id_instituicao_id_fkey"
      columns: ["curso_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "coordenacoes_curso_perfil_id_instituicao_id_fkey"
      columns: ["perfil_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"curriculos": {
                  Row: {
                    "competencias_texto": string | null,"competencias_vivencias": NonNullable<Json>,"created_at": string,"curriculo_gerado_em": string | null,"estudante_id": string,"experiencia_texto": string | null,"id": string,"instituicao_id": string,"resumo": string | null,"updated_at": string,"vivencias": string | null,"vivencias_geradas_em": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "competencias_texto"?: string | null,"competencias_vivencias"?: NonNullable<Json>,"created_at"?: string,"curriculo_gerado_em"?: string | null,"estudante_id": string,"experiencia_texto"?: string | null,"id"?: string,"instituicao_id": string,"resumo"?: string | null,"updated_at"?: string,"vivencias"?: string | null,"vivencias_geradas_em"?: string | null
                  }
                  Update: {
                    "competencias_texto"?: string | null,"competencias_vivencias"?: NonNullable<Json>,"created_at"?: string,"curriculo_gerado_em"?: string | null,"estudante_id"?: string,"experiencia_texto"?: string | null,"id"?: string,"instituicao_id"?: string,"resumo"?: string | null,"updated_at"?: string,"vivencias"?: string | null,"vivencias_geradas_em"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "curriculos_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"cursos": {
                  Row: {
                    "created_at": string,"id": string,"instituicao_id": string,"modalidade": Database["public"]['Enums']["modalidade_curso"],"nome": string,"total_periodos": number,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"instituicao_id": string,"modalidade": Database["public"]['Enums']["modalidade_curso"],"nome": string,"total_periodos": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"instituicao_id"?: string,"modalidade"?: Database["public"]['Enums']["modalidade_curso"],"nome"?: string,"total_periodos"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cursos_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"empresas": {
                  Row: {
                    "areas": string,"cidade": string,"created_at": string,"distancia_campus_km": number | null,"id": string,"instituicao_id": string,"nome": string,"setor": string
                  }
                  ComputedFields: never
                  Insert: {
                    "areas": string,"cidade": string,"created_at"?: string,"distancia_campus_km"?: number | null,"id"?: string,"instituicao_id": string,"nome": string,"setor": string
                  }
                  Update: {
                    "areas"?: string,"cidade"?: string,"created_at"?: string,"distancia_campus_km"?: number | null,"id"?: string,"instituicao_id"?: string,"nome"?: string,"setor"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "empresas_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"estudante_competencias": {
                  Row: {
                    "competencia_id": string,"created_at": string,"estudante_id": string,"instituicao_id": string,"nivel": Database["public"]['Enums']["nivel_competencia"],"origem": string | null,"progresso": number
                  }
                  ComputedFields: never
                  Insert: {
                    "competencia_id": string,"created_at"?: string,"estudante_id": string,"instituicao_id": string,"nivel": Database["public"]['Enums']["nivel_competencia"],"origem"?: string | null,"progresso"?: number
                  }
                  Update: {
                    "competencia_id"?: string,"created_at"?: string,"estudante_id"?: string,"instituicao_id"?: string,"nivel"?: Database["public"]['Enums']["nivel_competencia"],"origem"?: string | null,"progresso"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "estudante_competencias_competencia_id_instituicao_id_fkey"
      columns: ["competencia_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "competencias"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "estudante_competencias_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"estudantes": {
                  Row: {
                    "codigo": string,"created_at": string,"curso_id": string,"id": string,"instituicao_id": string,"perfil_id": string | null,"periodo_atual": number,"situacao": Database["public"]['Enums']["situacao_estudante"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"created_at"?: string,"curso_id": string,"id"?: string,"instituicao_id": string,"perfil_id"?: string | null,"periodo_atual": number,"situacao"?: Database["public"]['Enums']["situacao_estudante"],"updated_at"?: string
                  }
                  Update: {
                    "codigo"?: string,"created_at"?: string,"curso_id"?: string,"id"?: string,"instituicao_id"?: string,"perfil_id"?: string | null,"periodo_atual"?: number,"situacao"?: Database["public"]['Enums']["situacao_estudante"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "estudantes_curso_id_instituicao_id_fkey"
      columns: ["curso_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "estudantes_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "estudantes_perfil_id_instituicao_id_fkey"
      columns: ["perfil_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"ia_uso": {
                  Row: {
                    "criado_em": string,"custo_usd": number | null,"funcao": string,"id": number,"instituicao_id": string,"modelo": string,"perfil_id": string,"sucesso": boolean,"tokens_entrada": number | null,"tokens_saida": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "criado_em"?: string,"custo_usd"?: number | null,"funcao": string,"id"?: never,"instituicao_id": string,"modelo": string,"perfil_id": string,"sucesso": boolean,"tokens_entrada"?: number | null,"tokens_saida"?: number | null
                  }
                  Update: {
                    "criado_em"?: string,"custo_usd"?: number | null,"funcao"?: string,"id"?: never,"instituicao_id"?: string,"modelo"?: string,"perfil_id"?: string,"sucesso"?: boolean,"tokens_entrada"?: number | null,"tokens_saida"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ia_uso_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ia_uso_perfil_id_fkey"
      columns: ["perfil_id"]
isOneToOne: false
      referencedRelation: "perfis"
      referencedColumns: ["id"]
    }
                  ]
                },"indicadores_academicos": {
                  Row: {
                    "coeficiente": number | null,"created_at": string,"creditos_concluidos_pct": number | null,"disciplinas": number | null,"entregas_atrasadas": number | null,"estudante_id": string,"frequencia": number | null,"id": string,"instituicao_id": string,"periodo_letivo_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "coeficiente"?: number | null,"created_at"?: string,"creditos_concluidos_pct"?: number | null,"disciplinas"?: number | null,"entregas_atrasadas"?: number | null,"estudante_id": string,"frequencia"?: number | null,"id"?: string,"instituicao_id": string,"periodo_letivo_id": string,"updated_at"?: string
                  }
                  Update: {
                    "coeficiente"?: number | null,"created_at"?: string,"creditos_concluidos_pct"?: number | null,"disciplinas"?: number | null,"entregas_atrasadas"?: number | null,"estudante_id"?: string,"frequencia"?: number | null,"id"?: string,"instituicao_id"?: string,"periodo_letivo_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "indicadores_academicos_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "indicadores_academicos_periodo_letivo_id_instituicao_id_fkey"
      columns: ["periodo_letivo_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "periodos_letivos"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"insights": {
                  Row: {
                    "acao_sugerida": string | null,"categoria": string,"contexto": string,"created_at": string,"gerado_em": string | null,"id": string,"instituicao_id": string,"ordem": number,"origem": string,"texto": string
                  }
                  ComputedFields: never
                  Insert: {
                    "acao_sugerida"?: string | null,"categoria": string,"contexto": string,"created_at"?: string,"gerado_em"?: string | null,"id"?: string,"instituicao_id": string,"ordem"?: number,"origem"?: string,"texto": string
                  }
                  Update: {
                    "acao_sugerida"?: string | null,"categoria"?: string,"contexto"?: string,"created_at"?: string,"gerado_em"?: string | null,"id"?: string,"instituicao_id"?: string,"ordem"?: number,"origem"?: string,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "insights_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"instituicoes": {
                  Row: {
                    "created_at": string,"frequencia_minima": number,"id": string,"nome": string,"sigla": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"frequencia_minima"?: number,"id"?: string,"nome": string,"sigla"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"frequencia_minima"?: number,"id"?: string,"nome"?: string,"sigla"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"metricas_modelo": {
                  Row: {
                    "auc": number,"base_simulada": boolean,"captura_top20": number | null,"created_at": string,"id": string,"instituicao_id": string,"modelo_versao": string,"momento": string,"periodo_teste": string,"periodo_treino": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auc": number,"base_simulada"?: boolean,"captura_top20"?: number | null,"created_at"?: string,"id"?: string,"instituicao_id": string,"modelo_versao": string,"momento": string,"periodo_teste": string,"periodo_treino": string
                  }
                  Update: {
                    "auc"?: number,"base_simulada"?: boolean,"captura_top20"?: number | null,"created_at"?: string,"id"?: string,"instituicao_id"?: string,"modelo_versao"?: string,"momento"?: string,"periodo_teste"?: string,"periodo_treino"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "metricas_modelo_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"pedidos_desligamento": {
                  Row: {
                    "aberto_em": string,"concluido_em": string | null,"created_at": string,"estudante_id": string,"id": string,"instituicao_id": string,"pesquisa_respondida": boolean,"sinalizado_previamente": boolean,"status": Database["public"]['Enums']["status_pedido"],"tipo": Database["public"]['Enums']["tipo_desligamento"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "aberto_em"?: string,"concluido_em"?: string | null,"created_at"?: string,"estudante_id": string,"id"?: string,"instituicao_id": string,"pesquisa_respondida"?: boolean,"sinalizado_previamente"?: boolean,"status"?: Database["public"]['Enums']["status_pedido"],"tipo": Database["public"]['Enums']["tipo_desligamento"],"updated_at"?: string
                  }
                  Update: {
                    "aberto_em"?: string,"concluido_em"?: string | null,"created_at"?: string,"estudante_id"?: string,"id"?: string,"instituicao_id"?: string,"pesquisa_respondida"?: boolean,"sinalizado_previamente"?: boolean,"status"?: Database["public"]['Enums']["status_pedido"],"tipo"?: Database["public"]['Enums']["tipo_desligamento"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "pedidos_desligamento_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"perfis": {
                  Row: {
                    "ativo": boolean,"created_at": string,"id": string,"instituicao_id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativo"?: boolean,"created_at"?: string,"id": string,"instituicao_id": string,"nome": string,"papel": Database["public"]['Enums']["papel_usuario"],"updated_at"?: string
                  }
                  Update: {
                    "ativo"?: boolean,"created_at"?: string,"id"?: string,"instituicao_id"?: string,"nome"?: string,"papel"?: Database["public"]['Enums']["papel_usuario"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "perfis_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"periodos_letivos": {
                  Row: {
                    "codigo": string,"created_at": string,"encerrado": boolean,"fim": string,"id": string,"inicio": string,"instituicao_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"created_at"?: string,"encerrado"?: boolean,"fim": string,"id"?: string,"inicio": string,"instituicao_id": string,"updated_at"?: string
                  }
                  Update: {
                    "codigo"?: string,"created_at"?: string,"encerrado"?: boolean,"fim"?: string,"id"?: string,"inicio"?: string,"instituicao_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "periodos_letivos_instituicao_id_fkey"
      columns: ["instituicao_id"]
isOneToOne: false
      referencedRelation: "instituicoes"
      referencedColumns: ["id"]
    }
                  ]
                },"respostas_desligamento": {
                  Row: {
                    "comentario": string | null,"consentimento": boolean,"id": string,"instituicao_id": string,"motivo_principal": Database["public"]['Enums']["motivo_desligamento"],"pedido_id": string,"respondida_em": string
                  }
                  ComputedFields: never
                  Insert: {
                    "comentario"?: string | null,"consentimento": boolean,"id"?: string,"instituicao_id": string,"motivo_principal": Database["public"]['Enums']["motivo_desligamento"],"pedido_id": string,"respondida_em"?: string
                  }
                  Update: {
                    "comentario"?: string | null,"consentimento"?: boolean,"id"?: string,"instituicao_id"?: string,"motivo_principal"?: Database["public"]['Enums']["motivo_desligamento"],"pedido_id"?: string,"respondida_em"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "respostas_desligamento_pedido_id_instituicao_id_fkey"
      columns: ["pedido_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "pedidos_desligamento"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"solicitacoes_apoio": {
                  Row: {
                    "assunto": Database["public"]['Enums']["assunto_apoio"],"created_at": string,"estudante_id": string,"id": string,"instituicao_id": string,"mensagem": string,"status": Database["public"]['Enums']["status_solicitacao"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assunto": Database["public"]['Enums']["assunto_apoio"],"created_at"?: string,"estudante_id": string,"id"?: string,"instituicao_id": string,"mensagem": string,"status"?: Database["public"]['Enums']["status_solicitacao"],"updated_at"?: string
                  }
                  Update: {
                    "assunto"?: Database["public"]['Enums']["assunto_apoio"],"created_at"?: string,"estudante_id"?: string,"id"?: string,"instituicao_id"?: string,"mensagem"?: string,"status"?: Database["public"]['Enums']["status_solicitacao"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solicitacoes_apoio_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"trilha_carreira_etapas": {
                  Row: {
                    "curso_id": string,"descricao": string,"entrega": string,"id": string,"instituicao_id": string,"periodo": number,"titulo": string
                  }
                  ComputedFields: never
                  Insert: {
                    "curso_id": string,"descricao": string,"entrega": string,"id"?: string,"instituicao_id": string,"periodo": number,"titulo": string
                  }
                  Update: {
                    "curso_id"?: string,"descricao"?: string,"entrega"?: string,"id"?: string,"instituicao_id"?: string,"periodo"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "trilha_carreira_etapas_curso_id_instituicao_id_fkey"
      columns: ["curso_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"vaga_competencias": {
                  Row: {
                    "competencia_id": string,"instituicao_id": string,"vaga_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "competencia_id": string,"instituicao_id": string,"vaga_id": string
                  }
                  Update: {
                    "competencia_id"?: string,"instituicao_id"?: string,"vaga_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vaga_competencias_competencia_id_instituicao_id_fkey"
      columns: ["competencia_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "competencias"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "vaga_competencias_vaga_id_instituicao_id_fkey"
      columns: ["vaga_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "vagas"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"vagas": {
                  Row: {
                    "ativa": boolean,"carga_horaria": string,"cidade": string,"created_at": string,"curso_id": string,"descricao": string,"empresa_id": string,"id": string,"instituicao_id": string,"periodo_minimo": number,"titulo": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ativa"?: boolean,"carga_horaria": string,"cidade": string,"created_at"?: string,"curso_id": string,"descricao": string,"empresa_id": string,"id"?: string,"instituicao_id": string,"periodo_minimo"?: number,"titulo": string,"updated_at"?: string
                  }
                  Update: {
                    "ativa"?: boolean,"carga_horaria"?: string,"cidade"?: string,"created_at"?: string,"curso_id"?: string,"descricao"?: string,"empresa_id"?: string,"id"?: string,"instituicao_id"?: string,"periodo_minimo"?: number,"titulo"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vagas_curso_id_instituicao_id_fkey"
      columns: ["curso_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "cursos"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "vagas_empresa_id_instituicao_id_fkey"
      columns: ["empresa_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "empresas"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                },"vinculos_periodo": {
                  Row: {
                    "created_at": string,"estudante_id": string,"id": string,"instituicao_id": string,"periodo_curso": number,"periodo_letivo_id": string,"situacao_final": Database["public"]['Enums']["situacao_estudante"] | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"estudante_id": string,"id"?: string,"instituicao_id": string,"periodo_curso": number,"periodo_letivo_id": string,"situacao_final"?: Database["public"]['Enums']["situacao_estudante"] | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"estudante_id"?: string,"id"?: string,"instituicao_id"?: string,"periodo_curso"?: number,"periodo_letivo_id"?: string,"situacao_final"?: Database["public"]['Enums']["situacao_estudante"] | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "vinculos_periodo_estudante_id_instituicao_id_fkey"
      columns: ["estudante_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "estudantes"
      referencedColumns: ["id","instituicao_id"]
    },{
      foreignKeyName: "vinculos_periodo_periodo_letivo_id_instituicao_id_fkey"
      columns: ["periodo_letivo_id","instituicao_id"]
isOneToOne: false
      referencedRelation: "periodos_letivos"
      referencedColumns: ["id","instituicao_id"]
    }
                  ]
                }
          }
          Views: {
            "v_acoes": {
                  Row: {
                    "codigo": string | null,"concluida_em": string | null,"created_at": string | null,"curso_nome": string | null,"descricao": string | null,"estudante_id": string | null,"id": string | null,"prazo": string | null,"responsavel_id": string | null,"responsavel_nome": string | null,"status": Database["public"]['Enums']["status_acao"] | null,"tipo": Database["public"]['Enums']["tipo_acao"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_carteira": {
                  Row: {
                    "codigo": string | null,"curso_id": string | null,"curso_nome": string | null,"estudante_id": string | null,"faixa": Database["public"]['Enums']["faixa_risco"] | null,"periodo_atual": number | null,"probabilidade": number | null,"situacao_acao": string | null,"ultima_acao_status": Database["public"]['Enums']["status_acao"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_pedidos_desligamento": {
                  Row: {
                    "aberto_em": string | null,"codigo": string | null,"concluido_em": string | null,"curso_nome": string | null,"estudante_id": string | null,"id": string | null,"pesquisa_respondida": boolean | null,"sinalizado_previamente": boolean | null,"status": Database["public"]['Enums']["status_pedido"] | null,"tipo": Database["public"]['Enums']["tipo_desligamento"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"v_solicitacoes_apoio": {
                  Row: {
                    "assunto": Database["public"]['Enums']["assunto_apoio"] | null,"codigo": string | null,"created_at": string | null,"curso_nome": string | null,"estudante_id": string | null,"id": string | null,"mensagem": string | null,"status": Database["public"]['Enums']["status_solicitacao"] | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "abrir_ficha":
{ Args: { "p_codigo": string }; Returns: {
              "acao_sugerida": string,"acao_sugerida_descricao": string,"codigo": string,"coeficiente": number,"curso_nome": string,"estudante_id": string,"faixa": Database["public"]['Enums']["faixa_risco"],"fatores": Json,"frequencia": number,"gerada_em": string,"modelo_versao": string,"periodo_atual": number,"probabilidade": number
            }[]
                           },
"carteira_resumo":
{ Args: { "p_curso"?: string }; Returns: {
              "alto": number,"alto_com_acao": number,"atencao": number,"total": number
            }[]
                           },
"ia_usos_hoje":
{ Args: { "p_funcao": string }; Returns: number
                           },
"painel_evasao_por":
{ Args: { "p_recorte": string }; Returns: {
              "evadidos": number,"ordem": number,"rotulo": string,"taxa": number,"total": number
            }[]
                           },
"painel_evasao_semestres":
{ Args: Record<PropertyKey, never>; Returns: {
              "codigo": string,"evadidos": number,"taxa": number,"total": number
            }[]
                           },
"painel_fatores":
{ Args: Record<PropertyKey, never>; Returns: {
              "alunos": number,"fator": string,"peso_medio": number
            }[]
                           },
"painel_kpis":
{ Args: Record<PropertyKey, never>; Returns: {
              "alunos_em_andamento": number,"alunos_risco": number,"alunos_risco_anterior": number,"cancelamentos": number,"cancelamentos_anterior": number,"periodo_corrente": string,"periodo_encerrado": string,"taxa_evasao": number,"taxa_evasao_anterior": number,"trancamentos": number,"trancamentos_anterior": number
            }[]
                           },
"painel_motivos":
{ Args: Record<PropertyKey, never>; Returns: {
              "motivo": Database["public"]['Enums']["motivo_desligamento"],"percentual": number,"total": number,"total_respostas": number
            }[]
                           },
"painel_risco_faixas":
{ Args: Record<PropertyKey, never>; Returns: {
              "faixa": Database["public"]['Enums']["faixa_risco"],"total": number
            }[]
                           }
          }
          Enums: {
            "assunto_apoio": "frequencia"|"financeiro"|"grade"|"trancamento"|"outro","faixa_risco": "baixo"|"atencao"|"alto","modalidade_curso": "presencial"|"ead","motivo_desligamento": "acesso_internet_equipamento"|"financeira"|"trabalho_estudo"|"deslocamento"|"dificuldade_conteudo"|"adaptacao_curso"|"outro","nivel_competencia": "tem"|"desenvolvendo","papel_usuario": "gestor"|"coordenador"|"estudante","situacao_estudante": "ativo"|"trancado"|"cancelado"|"evadido"|"formado","status_acao": "pendente"|"em_andamento"|"concluida"|"cancelada","status_candidatura": "enviada"|"em_analise"|"encerrada","status_pedido": "aberto"|"concluido"|"revertido","status_solicitacao": "aberta"|"em_atendimento"|"encerrada","tipo_acao": "conversa_individual"|"tutoria"|"apoio_financeiro"|"monitoria"|"ajuste_grade"|"outro","tipo_desligamento": "trancamento"|"cancelamento"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "assunto_apoio": ["frequencia", "financeiro", "grade", "trancamento", "outro"],"faixa_risco": ["baixo", "atencao", "alto"],"modalidade_curso": ["presencial", "ead"],"motivo_desligamento": ["acesso_internet_equipamento", "financeira", "trabalho_estudo", "deslocamento", "dificuldade_conteudo", "adaptacao_curso", "outro"],"nivel_competencia": ["tem", "desenvolvendo"],"papel_usuario": ["gestor", "coordenador", "estudante"],"situacao_estudante": ["ativo", "trancado", "cancelado", "evadido", "formado"],"status_acao": ["pendente", "em_andamento", "concluida", "cancelada"],"status_candidatura": ["enviada", "em_analise", "encerrada"],"status_pedido": ["aberto", "concluido", "revertido"],"status_solicitacao": ["aberta", "em_atendimento", "encerrada"],"tipo_acao": ["conversa_individual", "tutoria", "apoio_financeiro", "monitoria", "ajuste_grade", "outro"],"tipo_desligamento": ["trancamento", "cancelamento"]
          }
        }
} as const
