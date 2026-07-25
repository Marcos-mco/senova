// DEDUP DA VARREDURA — a mesma vaga não pode virar dois cards.
//
// 25/jul/2026: a varredura do Adzuna trouxe a MESMA vaga (Superintendente Comercial, Sicoob, 78%)
// em dois dias e criou DOIS cards. Um veio com empresa "Sicoob Sul", o outro com "#SejaSicoobSul"
// (a hashtag da campanha do anúncio). O dedup `_vagaSimilarExistente` exigia empresa parecida ANTES
// de olhar o cargo, e a comparação por tokens dá 0 entre "sicoob sul" e "sejasicoobsul" (palavra
// colada, sem tokens em comum) — então o portão da empresa reprovava e o cargo (match perfeito)
// nunca era avaliado. Resultado: duplicata criada em silêncio.
//
// A correção: (1) casar por URL real primeiro (mesma URL = mesma vaga); (2) reconhecer a empresa
// mesmo colada, por continência sem espaços. Ser generoso é seguro: a duplicata é SUGERIDA num
// modal — quem decide é Marcos —, nunca criada calada. O risco real é o oposto: deixar passar.
const { carregarApp, assert } = require('./_lib');
const { t, fim } = assert();

const s = carregarApp(['function _normStr(', 'function _tokenSim(', 'function _mesmaEmpresa(', 'function _vagaSimilarExistente(']);
const vm = require('vm');
const sim = (nova) => vm.runInContext('_vagaSimilarExistente(' + JSON.stringify(nova) + ')', s);
const setVagas = (arr) => { s.vagas.length = 0; arr.forEach(v => s.vagas.push(v)); };

console.log('=== o caso real: "#SejaSicoobSul" x "Sicoob Sul", mesmo cargo ===');
setVagas([{ id: 1, empresa: '#SejaSicoobSul', cargo: 'Superintendente Comercial', origemUrl: 'https://adzuna.com.br/land/ad/111' }]);
let r = sim({ empresa: 'Sicoob Sul', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/land/ad/222' });
t('reconhece a mesma vaga apesar da hashtag da campanha', !!r && r.id === 1, JSON.stringify(r));

console.log('\n=== URL real igual = mesma vaga, mesmo com empresa ilegível ===');
setVagas([{ id: 2, empresa: 'Confidencial', cargo: 'Diretor', origemUrl: 'https://adzuna.com.br/land/ad/999?utm=x' }]);
r = sim({ empresa: 'Empresa Contratante', titulo: 'Gerente', url: 'https://adzuna.com.br/land/ad/999#topo' });
t('casa por URL ignorando ?query e #âncora', !!r && r.id === 2, JSON.stringify(r));

console.log('\n=== NÃO sobre-mescla: mesmo cargo, empresas de verdade diferentes ===');
setVagas([{ id: 3, empresa: 'Bradesco', cargo: 'Superintendente Comercial', origemUrl: 'https://adzuna.com.br/a/1' }]);
r = sim({ empresa: 'Itaú', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/a/2' });
t('Bradesco ≠ Itaú não vira duplicata', r === null, JSON.stringify(r));

console.log('\n=== mesma empresa, cargo diferente → não é a mesma vaga ===');
setVagas([{ id: 4, empresa: 'Sicoob Sul', cargo: 'Analista Financeiro', origemUrl: 'https://adzuna.com.br/a/3' }]);
r = sim({ empresa: 'Sicoob Sul', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/a/4' });
t('cargos distintos na mesma empresa não deduplicam', r === null, JSON.stringify(r));

console.log('\n=== o token clássico continua funcionando ("Sicoob" ⊂ "Sicoob Sul") ===');
setVagas([{ id: 5, empresa: 'Sicoob', cargo: 'Superintendente Comercial', origemUrl: 'https://adzuna.com.br/a/5' }]);
r = sim({ empresa: 'Sicoob Sul', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/a/6' });
t('empresa por token (interseção ≥0.7) segue casando', !!r && r.id === 5, JSON.stringify(r));

console.log('\n=== guarda: sigla curta não casa por continência ("SAP" não some em qualquer coisa) ===');
setVagas([{ id: 6, empresa: 'SAP', cargo: 'Superintendente Comercial', origemUrl: 'https://adzuna.com.br/a/7' }]);
r = sim({ empresa: 'Sapataria Central', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/a/8' });
t('empresa de ≤4 letras não dispara continência', r === null, JSON.stringify(r));

console.log('\n=== empresa vazia nunca casa (evita colar tudo que veio sem nome) ===');
setVagas([{ id: 7, empresa: '', cargo: 'Superintendente Comercial', origemUrl: 'https://adzuna.com.br/a/9' }]);
r = sim({ empresa: '', titulo: 'Superintendente Comercial', url: 'https://adzuna.com.br/a/10' });
t('sem empresa nos dois lados → não deduplica por cargo só', r === null, JSON.stringify(r));

console.log('\n=== pipeline vazio → nada a casar ===');
setVagas([]);
t('sem cards, retorna null', sim({ empresa: 'Sicoob Sul', titulo: 'Superintendente Comercial', url: 'https://x/1' }) === null);

fim('DEDUP DA VARREDURA');
