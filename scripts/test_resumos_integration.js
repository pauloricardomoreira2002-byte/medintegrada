/**
 * Script de Verificação e Validação Integral dos Resumos
 */
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('  TESTE DE INTEGRAÇÃO: RESUMOS, SVGS, ÍNDICE & CONTROLES');
console.log('====================================================');

let totalErrors = 0;

// 1. Verificar index.html para todos os elementos exigidos
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

const requiredIds = [
  'resumo-reader-modal',
  'btn-reader-back',
  'btn-font-dec',
  'reader-font-val',
  'btn-font-inc',
  'btn-sidebar-collapse',
  'btn-floating-toc',
  'reader-toc-sidebar',
  'reader-toc-list',
  'reader-content-scroll',
  'reader-markdown-content',
  'btn-reader-copy-md',
  'btn-reader-download-md',
  'btn-reader-download-docx',
  'btn-close-reader'
];

console.log('\n[1/4] Verificando Elementos no index.html:');
requiredIds.forEach(id => {
  if (htmlContent.includes(`id="${id}"`)) {
    console.log(`  ✓ ID "${id}" presente`);
  } else {
    console.error(`  ✗ ERRO: ID "${id}" ausente!`);
    totalErrors++;
  }
});

// 2. Verificar parser e TOC em resumos-viewer.js
console.log('\n[2/4] Verificando Parser e Lógica de TOC / Font Size:');
const viewerPath = path.join(__dirname, '..', 'js', 'resumos-viewer.js');
const viewerContent = fs.readFileSync(viewerPath, 'utf-8');

const checks = [
  { name: 'Função parseMarkdown', pattern: /function parseMarkdown/ },
  { name: 'Detecção de blocos HTML', pattern: /inHtmlBlock/ },
  { name: 'Controle de fonte A- / A+', pattern: /adjustFontSize/ },
  { name: 'Redefinição de fonte (100%)', pattern: /resetFontSize/ },
  { name: 'Alternância de barra lateral (Recolher/Mostrar)', pattern: /toggleSidebar/ },
  { name: 'Rolo suave no clique do TOC', pattern: /scrollIntoView/ },
  { name: 'ScrollSpy de cabeçalhos', pattern: /updateScrollSpy/ },
  { name: 'Abertura de Lightbox para SVG', pattern: /openLightbox/ }
];

checks.forEach(c => {
  if (c.pattern.test(viewerContent)) {
    console.log(`  ✓ ${c.name} implementado`);
  } else {
    console.error(`  ✗ ERRO: ${c.name} não encontrado!`);
    totalErrors++;
  }
});

// 3. Verificar todos os 5 arquivos Markdown gerados
console.log('\n[3/4] Verificando Conteúdo dos Resumos .md e Figuras SVG:');
const resumosDir = path.join(__dirname, '..', 'data', 'resumos');
const mdFiles = fs.readdirSync(resumosDir).filter(f => f.endsWith('.md'));

let totalFiguresFound = 0;

mdFiles.forEach(f => {
  const p = path.join(resumosDir, f);
  const content = fs.readFileSync(p, 'utf-8');

  // Conta títulos e figuras
  const h1Count = (content.match(/^#\s+/gm) || []).length;
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const h3Count = (content.match(/^###\s+/gm) || []).length;
  const figCards = (content.match(/class="resumo-figure-card"/g) || []).length;
  totalFiguresFound += figCards;

  console.log(`  📄 ${f}:`);
  console.log(`     H1: ${h1Count} | H2: ${h2Count} | H3: ${h3Count} | Figuras SVG: ${figCards}`);

  // Verifica se todos os caminhos de SVG apontados existem no disco
  const svgMatches = content.match(/src="(assets\/svg\/[^"]+)"/g) || [];
  svgMatches.forEach(m => {
    const rel = m.replace('src="', '').replace('"', '');
    const abs = path.join(__dirname, '..', rel);
    if (!fs.existsSync(abs)) {
      console.error(`     ✗ ERRO: SVG não encontrado no disco: ${rel}`);
      totalErrors++;
    }
  });
});

console.log(`\n  Total de Figuras SVG integradas nos 5 resumos: ${totalFiguresFound}`);

// 4. Verificar compilação em js/data.js
console.log('\n[4/4] Verificando js/data.js:');
const dataJsPath = path.join(__dirname, '..', 'js', 'data.js');
const dataJsContent = fs.readFileSync(dataJsPath, 'utf-8');

if (dataJsContent.includes('window.MED_RESUMOS = [') && dataJsContent.includes('resumo-figure-card')) {
  console.log('  ✓ js/data.js contém todos os resumos enriquecidos com HTML e SVGs');
} else {
  console.error('  ✗ ERRO: js/data.js não possui o conteúdo enriquecido!');
  totalErrors++;
}

console.log('\n====================================================');
if (totalErrors === 0) {
  console.log('  🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
} else {
  console.error(`  ⚠️ DETECTADOS ${totalErrors} ERROS`);
}
console.log('====================================================\n');
process.exit(totalErrors === 0 ? 0 : 1);
