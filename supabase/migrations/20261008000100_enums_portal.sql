-- Valores novos de enum ficam numa migration própria: o Postgres não permite usá-los
-- na mesma transação em que são criados.

-- Equipe de apoio ao estudante: atua na instituição inteira, sem escopo de curso.
alter type public.papel_usuario add value if not exists 'apoio';

-- Motivos do questionário de desligamento (seleção múltipla).
alter type public.motivo_desligamento add value if not exists 'insatisfacao_curso';
alter type public.motivo_desligamento add value if not exists 'identificacao_carreira';
alter type public.motivo_desligamento add value if not exists 'pessoal_familiar';
alter type public.motivo_desligamento add value if not exists 'saude';
alter type public.motivo_desligamento add value if not exists 'falta_oportunidades';
