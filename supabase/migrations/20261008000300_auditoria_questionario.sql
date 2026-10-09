-- Leitura de respostas individuais do questionário de desligamento fica registrada na auditoria.
create function public.registrar_leitura_questionario(p_questionario uuid)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inst uuid;
begin
  if not private.questionario_visivel_equipe(p_questionario) then
    return false;
  end if;
  select q.instituicao_id into v_inst from public.questionarios_desligamento q where q.id = p_questionario;
  perform private.registrar_auditoria(v_inst, 'questionario.visualizado', 'questionarios_desligamento', p_questionario);
  return true;
end;
$$;

revoke execute on function public.registrar_leitura_questionario(uuid) from public, anon;
grant execute on function public.registrar_leitura_questionario(uuid) to authenticated;
