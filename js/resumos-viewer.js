/**
 * MEDINTEGRADA - MÓDULO DE VISUALIZAÇÃO DE RESUMOS DETALHADOS (.MD)
 * Leitor imersivo em tela inteira como próxima página,
 * ajuste dinâmico de tipografia (A- / A+),
 * índice lateral colapsável com ScrollSpy,
 * e ilustrações vetoriais SVG de cada capítulo integradas com Lightbox.
 */

(function(window) {
  'use strict';

  let currentResumoData = null;
  let parsedTocItems = [];
  let currentFontScale = 1.0;
  let isSidebarCollapsed = false;
  let isEventsBound = false;

  function parseMarkdown(md) {
    if (!md) return { html: '', toc: [] };

    parsedTocItems = [];
    let headingIndex = 0;
    let html = '';
    const lines = md.split('\n');

    let inTable = false;
    let tableRows = [];
    let inHtmlBlock = false;
    let htmlBuffer = [];

    function flushTable() {
      if (!inTable || tableRows.length === 0) return '';
      let res = '<div class="table-responsive"><table><thead>';
      const headerCells = tableRows[0];
      res += '<tr>' + headerCells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
      for (let i = 2; i < tableRows.length; i++) {
        res += '<tr>' + tableRows[i].map(c => `<td>${c}</td>`).join('') + '</tr>';
      }
      res += '</tbody></table></div>';
      inTable = false;
      tableRows = [];
      return res;
    }

    function flushHtmlBuffer() {
      if (!inHtmlBlock || htmlBuffer.length === 0) return '';
      const res = htmlBuffer.join('\n');
      inHtmlBlock = false;
      htmlBuffer = [];
      return res;
    }

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      let trimmed = line.trim();

      // Check if starting an HTML block (like <div class="resumo-figure-card" or <figure)
      if (trimmed.startsWith('<div') || trimmed.startsWith('<figure') || inHtmlBlock) {
        if (inTable) html += flushTable();
        inHtmlBlock = true;
        htmlBuffer.push(line);
        if (trimmed.endsWith('</div>') || trimmed.endsWith('</figure>')) {
          html += flushHtmlBuffer();
        }
        continue;
      }

      // Check table row
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        const cells = trimmed.split('|').slice(1, -1).map(c => formatInline(c.trim()));
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        html += flushTable();
      }

      if (!trimmed) {
        continue;
      }

      // Headers (1 to 4)
      if (trimmed.startsWith('#### ')) {
        const title = trimmed.replace('#### ', '').trim();
        headingIndex++;
        const id = `sec-${headingIndex}`;
        parsedTocItems.push({ id, title, level: 3 });
        html += `<h4 id="${id}">${formatInline(title)}</h4>`;
      } else if (trimmed.startsWith('### ')) {
        const title = trimmed.replace('### ', '').trim();
        headingIndex++;
        const id = `sec-${headingIndex}`;
        parsedTocItems.push({ id, title, level: 2 });
        html += `<h3 id="${id}">${formatInline(title)}</h3>`;
      } else if (trimmed.startsWith('## ')) {
        const title = trimmed.replace('## ', '').trim();
        headingIndex++;
        const id = `sec-${headingIndex}`;
        parsedTocItems.push({ id, title, level: 1 });
        html += `<h2 id="${id}">${formatInline(title)}</h2>`;
      } else if (trimmed.startsWith('# ')) {
        const title = trimmed.replace('# ', '').trim();
        headingIndex++;
        const id = `sec-${headingIndex}`;
        parsedTocItems.push({ id, title, level: 1 });
        html += `<h1 id="${id}">${formatInline(title)}</h1>`;
      }
      // GitHub alerts / Callout boxes
      else if (trimmed.startsWith('> [!IMPORTANT]')) {
        let alertContent = '';
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          i++;
          alertContent += ' ' + lines[i].trim().replace(/^>\s*/, '');
        }
        html += `<div class="md-alert md-alert-important"><strong>🚨 FOCO DE PROVA:</strong> ${formatInline(alertContent.trim())}</div>`;
      } else if (trimmed.startsWith('> [!TIP]')) {
        let alertContent = '';
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          i++;
          alertContent += ' ' + lines[i].trim().replace(/^>\s*/, '');
        }
        html += `<div class="md-alert md-alert-tip"><strong>💡 PEGADINHA DE BANCA:</strong> ${formatInline(alertContent.trim())}</div>`;
      } else if (trimmed.startsWith('> [!NOTE]')) {
        let alertContent = '';
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          i++;
          alertContent += ' ' + lines[i].trim().replace(/^>\s*/, '');
        }
        html += `<div class="md-alert md-alert-note"><strong>📌 CONCEITO-CHAVE:</strong> ${formatInline(alertContent.trim())}</div>`;
      } else if (trimmed.startsWith('> ')) {
        let quoteContent = trimmed.replace(/^>\s*/, '');
        while (i + 1 < lines.length && lines[i + 1].trim().startsWith('>')) {
          i++;
          quoteContent += ' ' + lines[i].trim().replace(/^>\s*/, '');
        }
        html += `<div class="md-alert md-alert-note">${formatInline(quoteContent.trim())}</div>`;
      }
      // Lists
      else if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        html += `<ul><li>${formatInline(text)}</li></ul>`;
      }
      // Horizontal dividers
      else if (trimmed.startsWith('――――') || trimmed.startsWith('----') || trimmed.startsWith('***')) {
        html += `<hr style="margin: 28px 0; border: none; border-top: 1px solid var(--border-subtle);" />`;
      }
      // Paragraphs
      else {
        html += `<p>${formatInline(trimmed)}</p>`;
      }
    }

    if (inTable) html += flushTable();
    if (inHtmlBlock) html += flushHtmlBuffer();

    // Clean adjacent ul tags
    html = html.replace(/<\/ul>\s*<ul>/g, '');

    return { html, toc: parsedTocItems };
  }

  function formatInline(str) {
    if (!str) return '';
    return str
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  const ResumosViewer = {
    currentResumo: null,
    scrollSpyListener: null,

    init() {
      if (isEventsBound) return;
      isEventsBound = true;

      // Recupera preferências salvas
      const savedScale = localStorage.getItem('med_reader_font_scale');
      if (savedScale) {
        currentFontScale = parseFloat(savedScale) || 1.0;
      }

      const savedSidebar = localStorage.getItem('med_reader_sidebar_collapsed');
      if (savedSidebar !== null) {
        isSidebarCollapsed = savedSidebar === 'true';
      }

      this.bindControls();
    },

    bindControls() {
      // Font size buttons
      const btnDec = document.getElementById('btn-font-dec');
      const btnInc = document.getElementById('btn-font-inc');
      const badgeVal = document.getElementById('reader-font-val');

      if (btnDec) {
        btnDec.addEventListener('click', () => this.adjustFontSize(-0.1));
      }
      if (btnInc) {
        btnInc.addEventListener('click', () => this.adjustFontSize(0.1));
      }
      if (badgeVal) {
        badgeVal.addEventListener('click', () => this.resetFontSize());
      }

      // Sidebar collapse / expand buttons (Collapse on sidebar header, Expand on left floating tab)
      const btnSidebarCollapse = document.getElementById('btn-sidebar-collapse');
      const btnFloatingToc = document.getElementById('btn-floating-toc');

      if (btnSidebarCollapse) {
        btnSidebarCollapse.addEventListener('click', () => this.toggleSidebar(true));
      }
      if (btnFloatingToc) {
        btnFloatingToc.addEventListener('click', () => this.toggleSidebar(false));
      }

      // Navigation back and close
      const btnBack = document.getElementById('btn-reader-back');
      const btnClose = document.getElementById('btn-close-reader');

      if (btnBack) {
        btnBack.addEventListener('click', () => this.closeReader());
      }
      if (btnClose) {
        btnClose.addEventListener('click', () => this.closeReader());
      }

      // Copy markdown
      const btnCopy = document.getElementById('btn-reader-copy-md');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => this.copyCurrentMarkdown());
      }

      // Keyboard shortcuts: ESC to close, +/- for font
      window.addEventListener('keydown', (e) => {
        const modal = document.getElementById('resumo-reader-modal');
        if (!modal || !modal.classList.contains('active')) return;

        if (e.key === 'Escape') {
          this.closeReader();
        }
      });
    },

    activeFolder: 'UCT20 CAB',
    allResumos: [],
    containerId: 'resumos-grid-container',
    searchQuery: '',

    bindFolderEvents() {
      const folderTabs = document.getElementById('resumos-folder-tabs');
      if (!folderTabs || folderTabs._eventsBound) return;
      folderTabs._eventsBound = true;

      folderTabs.querySelectorAll('.folder-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const folder = btn.getAttribute('data-folder');
          this.setFolder(folder);
        });
      });
    },

    setFolder(folder) {
      this.activeFolder = folder;
      const folderTabs = document.getElementById('resumos-folder-tabs');
      if (folderTabs) {
        folderTabs.querySelectorAll('.folder-nav-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-folder') === folder);
        });
      }
      this.render();
    },

    setSearchQuery(q) {
      this.searchQuery = (q || '').trim().toLowerCase();
      this.render();
    },

    updateFolderBadges() {
      const list = this.allResumos || [];
      const countCab = list.filter(r => (r.folder || 'UCT20 CAB') === 'UCT20 CAB').length;
      const countTutoria = list.filter(r => r.folder === 'UCT20 Tutoria').length;

      const badgeCab = document.getElementById('badge-count-resumos-cab');
      const badgeTutoria = document.getElementById('badge-count-resumos-tutoria');
      if (badgeCab) badgeCab.textContent = countCab;
      if (badgeTutoria) badgeTutoria.textContent = countTutoria;
    },

    renderCatalog(resumos, containerId) {
      this.init();
      if (resumos) this.allResumos = resumos;
      if (containerId) this.containerId = containerId;
      this.bindFolderEvents();
      this.updateFolderBadges();
      this.render();
    },

    render() {
      const container = document.getElementById(this.containerId);
      if (!container) return;

      this.updateFolderBadges();

      // Filter by active folder
      let filtered = (this.allResumos || []).filter(r => (r.folder || 'UCT20 CAB') === this.activeFolder);

      // Filter by search query if any
      if (this.searchQuery) {
        filtered = filtered.filter(r =>
          r.title.toLowerCase().includes(this.searchQuery) ||
          r.author.toLowerCase().includes(this.searchQuery) ||
          (r.tags && r.tags.some(t => t.toLowerCase().includes(this.searchQuery)))
        );
      }

      if (filtered.length === 0) {
        if (this.searchQuery) {
          container.innerHTML = `
            <div class="empty-folder-box" style="grid-column: 1 / -1;">
              <div class="empty-folder-icon">🔍</div>
              <h3 class="empty-folder-title">Nenhum resultado encontrado</h3>
              <p class="empty-folder-desc">Nenhum resumo na pasta "${this.activeFolder}" corresponde à busca "${this.searchQuery}".</p>
            </div>
          `;
        } else {
          container.innerHTML = `
            <div class="empty-folder-box" style="grid-column: 1 / -1;">
              <div class="empty-folder-icon">📁</div>
              <h3 class="empty-folder-title">Pasta ${this.activeFolder} Vazia</h3>
              <p class="empty-folder-desc">Nenhum resumo nesta pasta ainda. Os cadernos e resumos de estudo vinculados a ${this.activeFolder} aparecerão automaticamente aqui.</p>
              <span class="empty-folder-badge">📂 Diretório: data/resumos/${this.activeFolder}</span>
            </div>
          `;
        }
        return;
      }

      container.innerHTML = filtered.map(r => {
        const cleanTitle = (r.title || '')
          .replace(/\s*•\s*Guia Definitivo/gi, '')
          .replace(/\s*•\s*Infecções Osteoarticulares/gi, '')
          .trim();

        return `
        <div class="resumo-card" data-id="${r.id}">
          <div class="resumo-card-header">
            <span class="resumo-module-tag">${r.folder || 'UCT20 CAB'}</span>
          </div>
          <h3 class="resumo-card-title">${cleanTitle}</h3>
          <div class="resumo-card-footer">
            <button class="btn btn-primary btn-sm btn-open-reader" data-id="${r.id}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              Ler Resumo
            </button>
          </div>
        </div>
      `;
      }).join('');

      // Bind click events
      container.querySelectorAll('.btn-open-reader').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const found = this.allResumos.find(r => r.id === id);
          if (found) {
            this.openReader(found);
          }
        });
      });
    },

    openReader(resumo, pushHistory = true) {
      this.init();
      this.currentResumo = resumo;
      currentResumoData = resumo;

      const modal = document.getElementById('resumo-reader-modal');
      const titleEl = document.getElementById('reader-title');
      const metaEl = document.getElementById('reader-meta');
      const contentEl = document.getElementById('reader-markdown-content');
      const scrollContainer = document.getElementById('reader-content-scroll');
      const tocEl = document.getElementById('reader-toc-list');
      const btnDownloadMd = document.getElementById('btn-reader-download-md');
      const btnDownloadDocx = document.getElementById('btn-reader-download-docx');

      if (!modal || !contentEl) return;

      // Metadados
      const cleanReaderTitle = (resumo.title || '')
        .replace(/\s*•\s*Guia Definitivo/gi, '')
        .replace(/\s*•\s*Infecções Osteoarticulares/gi, '')
        .trim();
      titleEl.textContent = cleanReaderTitle;
      metaEl.innerHTML = `<span>${resumo.folder || 'UCT20 CAB'}</span>`;

      if (btnDownloadMd) btnDownloadMd.href = resumo.mdFile;
      if (btnDownloadDocx) btnDownloadDocx.href = resumo.docxFile;

      // Parse markdown e gera TOC
      const { html, toc } = parseMarkdown(resumo.content);
      contentEl.innerHTML = html;

      // Renderiza Sumário / Índice
      this.renderToc(toc);

      // Aplica estado de fonte e sidebar
      this.applyFontScale();
      this.updateSidebarUI();

      // Ativa modal em tela cheia
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';

      // Rola para o início
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
        this.setupScrollSpy(scrollContainer);
      }

      // Registra no histórico de navegação para permitir voltar pelo navegador
      if (pushHistory && window.history && window.history.pushState) {
        const hash = `#resumo-${resumo.id}`;
        if (window.location.hash !== hash) {
          window.history.pushState({ type: 'resumo', id: resumo.id }, '', hash);
        }
      }
    },

    renderToc(toc) {
      const tocEl = document.getElementById('reader-toc-list');
      if (!tocEl) return;

      if (!toc || toc.length === 0) {
        tocEl.innerHTML = '<span class="text-dim" style="font-size:0.8rem; padding: 10px;">Sem seções detectadas.</span>';
        return;
      }

      tocEl.innerHTML = toc.map(item => `
        <a href="#${item.id}" class="reader-toc-item level-${item.level}" data-target="${item.id}" title="${item.title}">
          ${item.title}
        </a>
      `).join('');

      // Adiciona clique suave para rolar diretamente até a seção
      tocEl.querySelectorAll('.reader-toc-item').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetId = link.getAttribute('data-target');
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            tocEl.querySelectorAll('.reader-toc-item').forEach(el => el.classList.remove('active'));
            link.classList.add('active');
          }
        });
      });
    },

    setupScrollSpy(scrollContainer) {
      if (this.scrollSpyListener) {
        scrollContainer.removeEventListener('scroll', this.scrollSpyListener);
      }

      let ticking = false;
      this.scrollSpyListener = () => {
        if (!ticking) {
          window.requestAnimationFrame(() => {
            this.updateScrollSpy();
            ticking = false;
          });
          ticking = true;
        }
      };

      scrollContainer.addEventListener('scroll', this.scrollSpyListener, { passive: true });
      this.updateScrollSpy();
    },

    updateScrollSpy() {
      const scrollContainer = document.getElementById('reader-content-scroll');
      const tocEl = document.getElementById('reader-toc-list');
      if (!scrollContainer || !tocEl) return;

      const headings = scrollContainer.querySelectorAll('h1[id], h2[id], h3[id], h4[id]');
      if (headings.length === 0) return;

      const containerTop = scrollContainer.getBoundingClientRect().top;
      let activeId = null;

      for (let i = 0; i < headings.length; i++) {
        const rect = headings[i].getBoundingClientRect();
        // Se o cabeçalho estiver logo abaixo do topo ou acima mas ainda relevante
        if (rect.top - containerTop <= 120) {
          activeId = headings[i].id;
        } else {
          break;
        }
      }

      if (!activeId && headings.length > 0) {
        activeId = headings[0].id;
      }

      if (activeId) {
        tocEl.querySelectorAll('.reader-toc-item').forEach(item => {
          const match = item.getAttribute('data-target') === activeId;
          item.classList.toggle('active', match);
          if (match) {
            // Garante visibilidade no menu lateral
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
        });
      }
    },

    adjustFontSize(delta) {
      let newScale = Math.round((currentFontScale + delta) * 10) / 10;
      newScale = Math.max(0.8, Math.min(1.5, newScale));
      currentFontScale = newScale;
      this.applyFontScale();
      localStorage.setItem('med_reader_font_scale', currentFontScale.toString());
    },

    resetFontSize() {
      currentFontScale = 1.0;
      this.applyFontScale();
      localStorage.setItem('med_reader_font_scale', '1.0');
      if (window.App) window.App.showToast('Tamanho de texto redefinido para 100%', 'info');
    },

    applyFontScale() {
      const contentEl = document.getElementById('reader-markdown-content');
      const badgeVal = document.getElementById('reader-font-val');

      if (contentEl) {
        contentEl.style.setProperty('--reader-font-scale', currentFontScale.toString());
      }
      if (badgeVal) {
        const percent = Math.round(currentFontScale * 100);
        badgeVal.textContent = `${percent}%`;
        badgeVal.title = `Tamanho da fonte: ${percent}%. Clique para redefinir para 100%`;
      }
    },

    toggleSidebar(forceState) {
      if (typeof forceState === 'boolean') {
        isSidebarCollapsed = forceState;
      } else {
        isSidebarCollapsed = !isSidebarCollapsed;
      }

      this.updateSidebarUI();
      localStorage.setItem('med_reader_sidebar_collapsed', isSidebarCollapsed.toString());
    },

    updateSidebarUI() {
      const bodyContainer = document.getElementById('reader-body-container');
      if (bodyContainer) {
        bodyContainer.classList.toggle('sidebar-collapsed', isSidebarCollapsed);
      }
    },

    closeReader(updateHistory = true) {
      const modal = document.getElementById('resumo-reader-modal');
      const scrollContainer = document.getElementById('reader-content-scroll');

      if (scrollContainer && this.scrollSpyListener) {
        scrollContainer.removeEventListener('scroll', this.scrollSpyListener);
        this.scrollSpyListener = null;
      }

      if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
      this.currentResumo = null;
      currentResumoData = null;

      if (updateHistory && window.location.hash.startsWith('#resumo-')) {
        if (window.history && window.history.back) {
          window.history.back();
          // Fallback seguro caso a navegação histórica não altere a hash (ex: nova aba ou direto)
          setTimeout(() => {
            if (window.location.hash.startsWith('#resumo-')) {
              window.history.replaceState({ type: 'tab', tab: 'resumos' }, '', '#tab-resumos');
            }
          }, 150);
        }
      }
    },

    copyCurrentMarkdown() {
      if (!this.currentResumo || !this.currentResumo.content) return;
      navigator.clipboard.writeText(this.currentResumo.content).then(() => {
        if (window.App) window.App.showToast('Conteúdo completo em Markdown copiado para a área de transferência!', 'success');
      }).catch(() => {
        if (window.App) window.App.showToast('Não foi possível copiar o texto automaticamente.', 'warning');
      });
    },

    openLightbox(svgPath, title) {
      // Abre o esquema no visualizador interativo em alta resolução
      if (window.MapasViewer && typeof window.MapasViewer.openLightbox === 'function') {
        window.MapasViewer.openLightbox({
          id: 'figura_' + Date.now(),
          title: title || 'Esquema Vetorial do Resumo',
          categoryLabel: 'Ilustração do Guia Teórico',
          dimensions: 'Vetor SVG Alta Resolução',
          svgPath: svgPath,
          svgContent: null
        });
      } else {
        // Fallback: abre nova aba
        window.open(svgPath, '_blank');
      }
    }
  };

  window.ResumosViewer = ResumosViewer;
})(window);
