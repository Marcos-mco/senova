// Portão único do status: setStatus sempre deixa rastro + aplica a trava anti-sumiço (S24).
// Cobre o que fazia o TV Integração sumir (arquivar processo real sem confirmar/sem histórico).
const { carregarApp, exec, assert } = require('./_lib');
const { t, fim } = assert();

// setStatus muta a vaga por referência → uso exec() referenciando vagas[0] no sandbox.
function cenario(vaga, mocks = {}) {
  const s = carregarApp([], mocks);
  s.vagas = [Object.assign({ id: 1, empresa: 'ACME', cargo: 'Diretor', status: 'lead', timeline: [] }, vaga)];
  return s;
}
const card = s => s.vagas[0];
const tl = s => (card(s).timeline || []).map(e => e.texto);

console.log('=== NO-OP: mesmo status não mexe em nada ===');
let s = cenario({ status: 'entrevista', timeline: [{ ts: 1, texto: 'já existia' }] });
let r = exec(s, 'setStatus(vagas[0],"entrevista")');
t('retorna true', r === true);
t('não duplicou timeline', tl(s).length === 1, 'len=' + tl(s).length);

console.log('\n=== AVANÇO simples deixa rastro (era um dos buracos) ===');
s = cenario({ status: 'lead' });
r = exec(s, 'setStatus(vagas[0],"entrevista")');
t('avançou', card(s).status === 'entrevista' && r === true);
t('registrou a transição no histórico', tl(s).some(x => /Oportunidade → Entrevista/.test(x)), tl(s).join(' | '));
t('marcou updatedAt', !!card(s).updatedAt);

console.log('\n=== ARQUIVAR lead (não protegido) — sem confirmar, com rastro ===');
s = cenario({ status: 'lead' });
r = exec(s, 'setStatus(vagas[0],"arquivado",{motivo:"fora do perfil"})');
t('arquivou', card(s).status === 'arquivado' && r === true);
t('rastro com motivo', tl(s).some(x => /Processo arquivado — fora do perfil/.test(x)));

console.log('\n=== TRAVA S24: arquivar PROCESSO REAL exige confirmação ===');
// confirm=false → NÃO arquiva (era o buraco do dropVaga)
s = cenario({ status: 'entrevista' }, { confirm: () => false });
r = exec(s, 'setStatus(vagas[0],"arquivado")');
t('trava barrou (retorna false)', r === false);
t('status INTACTO — não sumiu', card(s).status === 'entrevista');
t('nada escrito no histórico', tl(s).length === 0);

console.log('\n=== ... e com confirmação, arquiva COM rastro ===');
s = cenario({ status: 'entrevista' }, { confirm: () => true });
r = exec(s, 'setStatus(vagas[0],"arquivado")');
t('arquivou após confirmar', card(s).status === 'arquivado' && r === true);
t('deixou rastro (nunca silencioso)', tl(s).some(x => /Processo arquivado/.test(x)));

console.log('\n=== skipConfirm arquiva processo real sem perguntar (uso interno) ===');
s = cenario({ status: 'proposta' }, { confirm: () => false });
r = exec(s, 'setStatus(vagas[0],"arquivado",{skipConfirm:true})');
t('skipConfirm ignora a trava', card(s).status === 'arquivado' && r === true);

console.log('\n=== REATIVAR (arquivado → ativo) deixa rastro claro ===');
s = cenario({ status: 'arquivado' });
r = exec(s, 'setStatus(vagas[0],"aplicado")');
t('reativou', card(s).status === 'aplicado');
t('rastro de reativação', tl(s).some(x => /Processo reativado — CV Enviado/.test(x)));

console.log('\n=== texto do chamador tem prioridade sobre a descrição automática ===');
s = cenario({ status: 'lead' });
exec(s, 'setStatus(vagas[0],"aplicado",{texto:"CV enviado pela vaga (LinkedIn)"})');
t('usa a frase do chamador', tl(s)[0] === 'CV enviado pela vaga (LinkedIn)');

console.log('\n=== robustez: vaga sem timeline, args inválidos ===');
s = cenario({ status: 'lead' }); delete card(s).timeline;
exec(s, 'setStatus(vagas[0],"entrevista")');
t('cria timeline se não existir', Array.isArray(card(s).timeline) && card(s).timeline.length === 1);
t('setStatus(null) não quebra', exec(s, 'setStatus(null,"lead")') === false);
t('setStatus sem novo status não quebra', exec(s, 'setStatus(vagas[0],"")') === false);

fim('STATUS');
