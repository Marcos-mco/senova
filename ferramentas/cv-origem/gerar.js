// CV-origem a partir do Perfil — ferramenta local, fora do app (09/out/2026).
//
// Por que existe: o CV-origem (o PDF que vai nos envios manuais e nos portais) era gerado por um
// script solto numa pasta temporária, que se perdeu. Sem o gerador, o PDF virou uma fonte à parte,
// e as correções de carreira passaram a ir para um lugar e não para o outro. Agora a regra é uma
// só: a fonte é o Perfil salvo no Senova; o PDF e o DOCX são fotografia dele, nunca o contrário.
//
// O que lê: os textos `cv_master_pt|en|es` do Perfil (o CV completo, em texto, que a tela de
// Perfil mostra). Por padrão lê direto do KV de produção (só leitura); com --perfil <arquivo.json>
// lê de um backup exportado.
//
// Uso (a partir da raiz do repositório):
//   node ferramentas/cv-origem/gerar.js                 # lê do KV, gera PT/EN/ES em cvs/
//   node ferramentas/cv-origem/gerar.js --perfil x.json # lê de um arquivo
//
// Nunca apaga: antes de substituir um arquivo em cvs/, copia o anterior para cvs/_anterior_<data>/.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const PDFDocument = require('pdfkit');
const docx = require('docx');

const RAIZ = path.resolve(__dirname, '..', '..');
const PASTA_CVS = path.join(RAIZ, 'cvs');
const IDIOMAS = ['pt', 'en', 'es'];

// Brand book do Senova: navy nos títulos, dourado no filete, carvão no texto.
const COR = { navy: '#1A3A5C', dourado: '#C9A84C', texto: '#2C2C2A', cinza: '#55524C' };
const FONTES = 'C:/Windows/Fonts';

function arg(nome) {
  const i = process.argv.indexOf(nome);
  return i > 0 ? process.argv[i + 1] : null;
}

function lerPerfil() {
  const arquivo = arg('--perfil');
  if (arquivo) return JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  // Só leitura. A chave do dono vem de `perfil_dono_legado` — a mesma que o Worker usa.
  const kv = (chave) => execSync(`npx wrangler kv key get --binding SENOVA_KV "${chave}" --remote`,
    { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const dono = kv('perfil_dono_legado');
  return JSON.parse(kv(dono ? `perfil_usuario:${dono}` : 'perfil_usuario'));
}

// ── Do texto do Perfil para uma estrutura ─────────────────────────────────────────────────────
// O texto segue o formato da tela de Perfil: 3 linhas de cabeçalho; seções com título em
// MAIÚSCULAS; blocos separados por linha em branco; bullets começando com "• ".
function estruturar(texto) {
  const linhas = texto.replace(/\r/g, '').split('\n').filter(l => !/^━+$/.test(l.trim()));
  const [nome, titulo, contato] = linhas.filter(l => l.trim()).slice(0, 3);
  const corpo = linhas.slice(linhas.indexOf(contato) + 1);
  const blocos = [];
  let atual = [];
  for (const l of corpo) {
    if (l.trim()) { atual.push(l.trim()); continue; }
    if (atual.length) blocos.push(atual);
    atual = [];
  }
  if (atual.length) blocos.push(atual);

  const secoes = [];
  const ehTitulo = b => b.length === 1 && /\p{L}/u.test(b[0]) && b[0] === b[0].toUpperCase();
  for (const b of blocos) {
    if (ehTitulo(b)) { secoes.push({ titulo: b[0], blocos: [] }); continue; }
    if (!secoes.length) throw new Error('Texto antes da primeira seção: ' + b[0]);
    secoes[secoes.length - 1].blocos.push(b);
  }
  if (!nome || !secoes.length) throw new Error('CV vazio ou fora do formato.');
  return { nome, titulo, contato, secoes };
}

// Classifica cada bloco pelo seu desenho, não pelo nome da seção — o nome muda com o idioma.
//   paragrafo : 1 linha (resumo, competências, idiomas)
//   cargo     : título / empresa / período / bullets
//   linha     : "Cargo — detalhe · anos" + descrição (experiência anterior)
//   item      : título + detalhe (formação)
function tipoDoBloco(b) {
  if (b.length === 1) return 'paragrafo';
  if (b.length >= 3 && !b[1].startsWith('• ') && !b[2].startsWith('• ')) return 'cargo';
  if (b.length === 2 && b[0].includes(' — ') && b[0].includes(' · ')) return 'linha';
  return 'item';
}

// ── PDF ───────────────────────────────────────────────────────────────────────────────────────
function gerarPDF(cv, destino) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 48, bottom: 48, left: 54, right: 54 },
    info: { Title: `${cv.nome} — CV`, Author: cv.nome } });
  doc.registerFont('nome', `${FONTES}/georgiab.ttf`);
  doc.registerFont('r', `${FONTES}/times.ttf`);
  doc.registerFont('b', `${FONTES}/timesbd.ttf`);
  doc.registerFont('i', `${FONTES}/timesi.ttf`);
  doc.pipe(fs.createWriteStream(destino));
  const L = doc.page.margins.left, W = doc.page.width - L - doc.page.margins.right;

  doc.font('nome').fontSize(24).fillColor(COR.navy).text(cv.nome, L);
  doc.font('r').fontSize(12).fillColor(COR.cinza).text(cv.titulo, L, undefined, { width: W });
  doc.fontSize(9.5).text(cv.contato, L, undefined, { width: W });
  doc.moveDown(0.6);
  doc.moveTo(L, doc.y).lineTo(L + W, doc.y).lineWidth(1.2).strokeColor(COR.dourado).stroke();
  doc.moveDown(0.8);

  for (const s of cv.secoes) {
    if (doc.y > doc.page.height - 110) doc.addPage();
    doc.font('b').fontSize(12.5).fillColor(COR.navy).text(s.titulo, L, undefined, { width: W });
    doc.moveDown(0.25);
    for (const b of s.blocos) {
      const tipo = tipoDoBloco(b);
      if (tipo !== 'paragrafo' && doc.y > doc.page.height - 90) doc.addPage();
      if (tipo === 'paragrafo') {
        doc.font('r').fontSize(10.5).fillColor(COR.texto).text(b[0], L, undefined, { width: W, align: 'left' });
      } else if (tipo === 'cargo') {
        doc.font('b').fontSize(11).fillColor(COR.texto).text(b[0], L, undefined, { width: W });
        doc.font('i').fontSize(10.5).fillColor(COR.cinza).text(b[1], L, undefined, { width: W });
        doc.font('r').fontSize(9.5).fillColor(COR.navy).text(b[2], L, undefined, { width: W });
        doc.moveDown(0.15);
        for (const bl of b.slice(3)) {
          const y = doc.y;
          doc.font('r').fontSize(10.5).fillColor(COR.texto).text('•', L + 14, y);
          doc.text(bl.replace(/^• /, ''), L + 30, y, { width: W - 30 });
          doc.moveDown(0.1);
        }
      } else if (tipo === 'linha') {
        const [cargo, ...resto] = b[0].split(' — ');
        doc.font('b').fontSize(11).fillColor(COR.texto).text(cargo, L, undefined, { continued: true });
        doc.font('r').fontSize(11).fillColor(COR.navy).text(' — ' + resto.join(' — '));
        doc.font('r').fontSize(10.5).fillColor(COR.texto).text(b[1], L, undefined, { width: W });
      } else {
        doc.font('b').fontSize(11).fillColor(COR.texto).text(b[0], L, undefined, { width: W });
        for (const l of b.slice(1)) doc.font('r').fontSize(9.5).fillColor(COR.navy).text(l, L, undefined, { width: W });
      }
      doc.moveDown(0.45);
    }
    doc.moveDown(0.3);
  }
  doc.end();
  return new Promise(ok => doc.on('end', ok));
}

// ── DOCX ──────────────────────────────────────────────────────────────────────────────────────
function gerarDOCX(cv, destino) {
  const { Document, Packer, Paragraph, TextRun, BorderStyle } = docx;
  const hex = c => c.replace('#', '');
  const run = (text, o = {}) => new TextRun({ text, font: o.font || 'Times New Roman', size: o.size || 21,
    bold: o.bold, italics: o.italics, color: hex(o.color || COR.texto) });
  const p = (filhos, o = {}) => new Paragraph({ children: filhos, spacing: { after: o.after ?? 0, before: o.before ?? 0 }, ...o.extra });

  const filhos = [
    p([run(cv.nome, { font: 'Georgia', size: 48, bold: true, color: COR.navy })]),
    p([run(cv.titulo, { size: 24, color: COR.cinza })]),
    p([run(cv.contato, { size: 19, color: COR.cinza })], { after: 160,
      extra: { border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: hex(COR.dourado), space: 6 } } } }),
  ];
  for (const s of cv.secoes) {
    filhos.push(p([run(s.titulo, { size: 25, bold: true, color: COR.navy })], { before: 200, after: 60 }));
    for (const b of s.blocos) {
      const tipo = tipoDoBloco(b);
      if (tipo === 'paragrafo') {
        filhos.push(p([run(b[0])], { after: 100 }));
      } else if (tipo === 'cargo') {
        filhos.push(p([run(b[0], { bold: true, size: 22 })], { before: 80 }));
        filhos.push(p([run(b[1], { italics: true, color: COR.cinza })]));
        filhos.push(p([run(b[2], { size: 19, color: COR.navy })], { after: 40 }));
        for (const bl of b.slice(3)) filhos.push(p([run(bl.replace(/^• /, ''))], { extra: { bullet: { level: 0 } } }));
      } else if (tipo === 'linha') {
        const [cargo, ...resto] = b[0].split(' — ');
        filhos.push(p([run(cargo, { bold: true, size: 22 }), run(' — ' + resto.join(' — '), { size: 22, color: COR.navy })], { before: 80 }));
        filhos.push(p([run(b[1])]));
      } else {
        filhos.push(p([run(b[0], { bold: true, size: 22 })], { before: 80 }));
        for (const l of b.slice(1)) filhos.push(p([run(l, { size: 19, color: COR.navy })]));
      }
    }
  }
  const documento = new Document({ creator: cv.nome, title: `${cv.nome} — CV`,
    sections: [{ properties: { page: { margin: { top: 960, bottom: 960, left: 1080, right: 1080 } } }, children: filhos }] });
  return Packer.toBuffer(documento).then(buf => fs.writeFileSync(destino, buf));
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────
async function main() {
  const perfil = lerPerfil();
  const iniciais = String(perfil.nome || 'CV').split(/\s+/).filter(Boolean).map(n => n[0].toUpperCase());
  const prefixo = `CV_${iniciais[0] || ''}${iniciais[iniciais.length - 1] || ''}_${new Date().getFullYear()}`;
  const hoje = new Date();
  const meses = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const pastaAnterior = path.join(PASTA_CVS, `_anterior_${String(hoje.getDate()).padStart(2,'0')}${meses[hoje.getMonth()]}`);

  const travados = [];
  for (const lang of IDIOMAS) {
    const texto = perfil[`cv_master_${lang}`] || (lang === 'pt' ? perfil.cv_master : '');
    if (!texto || !texto.trim()) { console.log(`${lang.toUpperCase()}: Perfil sem CV neste idioma — pulado.`); continue; }
    const cv = estruturar(texto);
    for (const ext of ['pdf', 'docx']) {
      const destino = path.join(PASTA_CVS, `${prefixo}_${lang.toUpperCase()}.${ext}`);
      if (fs.existsSync(destino)) {
        // O Windows trava o arquivo aberto num leitor de PDF/Word: avisa e segue com os outros.
        try { fs.closeSync(fs.openSync(destino, 'r+')); } catch (e) {
          travados.push(path.relative(RAIZ, destino));
          continue;
        }
        fs.mkdirSync(pastaAnterior, { recursive: true });
        const copia = path.join(pastaAnterior, path.basename(destino));
        if (!fs.existsSync(copia)) fs.copyFileSync(destino, copia);
      }
      if (ext === 'pdf') await gerarPDF(cv, destino); else await gerarDOCX(cv, destino);
      console.log('gerado:', path.relative(RAIZ, destino));
    }
  }
  if (travados.length) {
    console.log('\nNÃO gerados — arquivo aberto em outro programa. Feche e rode de novo:\n  ' + travados.join('\n  '));
    process.exitCode = 1;
  }
}

main().catch(e => { console.error('Falhou:', e.message); process.exit(1); });
