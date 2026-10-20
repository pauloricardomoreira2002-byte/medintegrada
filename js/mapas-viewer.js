/**
 * MEDINTEGRADA - MÓDULO DE MAPAS PANORÂMICOS COMPARATIVOS (SVG)
 * Focado exclusivamente nos grandes mapas comparativos da UCT20
 */

(function(window) {
  'use strict';

  const MapasViewer = {
    allMapas: [],
    activeMap: null,
    zoomLevel: 1.0,
    panX: 0,
    panY: 0,
    isPanning: false,
    startX: 0,
    startY: 0,
    textSelectionEnabled: false,

    activeFolder: 'UCT20 CAB',

    init(mapas) {
      this.allMapas = mapas || [];
      this.bindFolderEvents();
      this.updateFolderBadges();
      this.render();
      this.bindEvents();
    },

    bindFolderEvents() {
      const folderTabs = document.getElementById('mapas-folder-tabs');
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
      const folderTabs = document.getElementById('mapas-folder-tabs');
      if (folderTabs) {
        folderTabs.querySelectorAll('.folder-nav-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-folder') === folder);
        });
      }
      this.render();
    },

    updateFolderBadges() {
      const list = this.allMapas || [];
      const countCab = list.filter(m => (m.folder || 'UCT20 CAB') === 'UCT20 CAB').length;
      const countTutoria = list.filter(m => m.folder === 'UCT20 Tutoria').length;

      const badgeCab = document.getElementById('badge-count-mapas-cab');
      const badgeTutoria = document.getElementById('badge-count-mapas-tutoria');
      if (badgeCab) badgeCab.textContent = countCab;
      if (badgeTutoria) badgeTutoria.textContent = countTutoria;
    },

    bindEvents() {
      // Zoom controls in lightbox
      const btnZoomIn = document.getElementById('btn-zoom-in');
      const btnZoomOut = document.getElementById('btn-zoom-out');
      const btnZoomReset = document.getElementById('btn-zoom-reset');
      const btnDownloadSvg = document.getElementById('btn-download-svg');
      const btnCloseLightbox = document.getElementById('btn-close-svg-lightbox');
      const btnToggleTextSelect = document.getElementById('btn-toggle-text-selection');
      const viewport = document.getElementById('svg-canvas-viewport');

      if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => this.zoom(0.2));
      }
      if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => this.zoom(-0.2));
      }
      if (btnZoomReset) {
        btnZoomReset.addEventListener('click', () => this.resetTransform());
      }
      if (btnCloseLightbox) {
        btnCloseLightbox.addEventListener('click', () => this.closeLightbox());
      }
      if (btnDownloadSvg) {
        btnDownloadSvg.addEventListener('click', () => this.downloadActiveSvg());
      }
      if (btnToggleTextSelect) {
        btnToggleTextSelect.addEventListener('click', () => this.toggleTextSelection());
      }

      // Pan drag events on viewport
      if (viewport) {
        viewport.addEventListener('mousedown', (e) => {
          // SE O MODO SELEÇÃO ESTIVER ATIVO:
          // A movimentação fica 100% DESABILITADA! Permite selecionar texto com o mouse.
          if (this.textSelectionEnabled) {
            this.isPanning = false;
            return;
          }

          // SE O MODO MOVER ESTIVER ATIVO (padrão):
          // A seleção de texto fica 100% DESABILITADA! Move o mapa suavemente.
          e.preventDefault();
          if (window.getSelection) {
            window.getSelection().removeAllRanges();
          }
          this.isPanning = true;
          this.startX = e.clientX - this.panX;
          this.startY = e.clientY - this.panY;
        });

        window.addEventListener('mousemove', (e) => {
          if (!this.isPanning || this.textSelectionEnabled) return;
          this.panX = e.clientX - this.startX;
          this.panY = e.clientY - this.startY;
          this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
          this.isPanning = false;
        });

        viewport.addEventListener('wheel', (e) => {
          e.preventDefault();
          const delta = e.deltaY > 0 ? -0.15 : 0.15;
          this.zoom(delta);
        }, { passive: false });
      }
    },

    render() {
      const container = document.getElementById('mapas-panoramicos-container');
      if (!container) return;

      this.updateFolderBadges();

      const filtered = (this.allMapas || []).filter(m => (m.folder || 'UCT20 CAB') === this.activeFolder);

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-folder-box">
            <div class="empty-folder-icon">🗺️</div>
            <h3 class="empty-folder-title">Pasta ${this.activeFolder} Vazia</h3>
            <p class="empty-folder-desc">Nenhum mapa comparativo cadastrado nesta pasta ainda. Os esquemas conceituais e panorâmicos adicionados a ${this.activeFolder} aparecerão aqui.</p>
            <span class="empty-folder-badge">📂 Diretório: assets/mapas_html/${this.activeFolder}</span>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="mapas-panoramicos-grid">
          ${filtered.map(m => {
            const pathologies = m.pathologies || (m.desc ? m.desc.split(/,\s*|\s+e\s+/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean) : []);
            return `
            <div class="mapa-panoramico-card" data-id="${m.id}">
              <!-- Preview Pane -->
              <div class="mapa-preview-pane btn-trigger-viewer" data-id="${m.id}">
                <div class="mapa-thumbnail-wrapper">
                  ${m.svgContent ? m.svgContent : `<img src="${m.svgPath}" alt="${m.title}" />`}
                </div>
                <div class="mapa-preview-overlay-hint">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  <span>Clique para Explorar em HD</span>
                </div>
              </div>

              <!-- Info Pane -->
              <div class="mapa-info-pane">
                <div class="mapa-info-header">
                  <h3 class="mapa-title">${m.title}</h3>
                  <div class="mapa-pills-container">
                    ${pathologies.map(p => `<span class="mapa-pill"><span class="mapa-pill-dot"></span>${p}</span>`).join('')}
                  </div>
                </div>

                <div class="mapa-actions-row">
                  <button class="btn btn-primary btn-sm btn-trigger-viewer" data-id="${m.id}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    Visualizar em HD
                  </button>
                  <a href="${m.htmlPath}" target="_blank" class="btn btn-secondary btn-sm" title="Abrir em nova aba do navegador">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    Nova Aba
                  </a>
                  <a href="${m.svgPath}" download="${m.id}.svg" class="btn btn-ghost btn-sm" title="Baixar arquivo vetorial SVG original">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Baixar SVG
                  </a>
                </div>
              </div>
            </div>
          `;
          }).join('')}
        </div>
      `;

      // Bind trigger buttons to open Lightbox
      container.querySelectorAll('.btn-trigger-viewer').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = btn.getAttribute('data-id');
          const found = this.allMapas.find(m => m.id === id);
          if (found) {
            this.openLightbox(found);
          }
        });
      });
    },

    openLightbox(mapa, pushHistory = true) {
      this.activeMap = mapa;
      const modal = document.getElementById('svg-lightbox-modal');
      const titleEl = document.getElementById('svg-lightbox-title');
      const catEl = document.getElementById('svg-lightbox-category');
      const canvasInner = document.getElementById('svg-canvas-inner');

      if (!modal || !canvasInner) return;

      titleEl.textContent = mapa.title;
      catEl.textContent = mapa.categoryLabel || 'Mapa Comparativo';

      if (mapa.svgContent) {
        canvasInner.innerHTML = mapa.svgContent;
      } else {
        canvasInner.innerHTML = `<img src="${mapa.svgPath}" alt="${mapa.title}" style="max-width:100%; height:auto;" />`;
      }

      this.resetTransform();
      // Sempre inicia com seleção de texto desabilitada para evitar seleção acidental ao arrastar
      this.textSelectionEnabled = false;
      this.updateTextSelectionUI();
      modal.classList.add('active');

      // Registra no histórico de navegação para permitir voltar pelo navegador
      if (pushHistory && window.history && window.history.pushState) {
        const hash = `#mapa-${mapa.id}`;
        if (window.location.hash !== hash) {
          window.history.pushState({ type: 'mapa', id: mapa.id }, '', hash);
        }
      }
    },

    toggleTextSelection() {
      this.textSelectionEnabled = !this.textSelectionEnabled;
      this.isPanning = false; // Cancela qualquer arraste imediatamente
      this.updateTextSelectionUI();
      if (window.App) {
        window.App.showToast(
          this.textSelectionEnabled
            ? '📝 Modo Seleção de Texto Ativado: movimentação desabilitada para permitir cópia.'
            : '✋ Modo Mover/Arrastar Ativado: seleção de texto bloqueada para navegação suave.',
          'info'
        );
      }
    },

    updateTextSelectionUI() {
      const viewport = document.getElementById('svg-canvas-viewport');
      const btn = document.getElementById('btn-toggle-text-selection');
      const icon = document.getElementById('text-select-icon');
      const label = document.getElementById('text-select-label');

      if (viewport) {
        viewport.classList.toggle('text-selection-enabled', this.textSelectionEnabled);
        viewport.classList.toggle('text-selection-disabled', !this.textSelectionEnabled);
      }

      if (btn && icon && label) {
        if (this.textSelectionEnabled) {
          btn.classList.add('active-selection');
          btn.classList.remove('btn-secondary');
          btn.classList.add('btn-primary');
          icon.textContent = '📝';
          label.textContent = 'Modo: Seleção de Texto (Mover Desligado)';
          btn.title = 'Clique para alternar para o Modo Mover/Arrastar (desabilita seleção de texto)';
        } else {
          btn.classList.remove('active-selection');
          btn.classList.remove('btn-primary');
          btn.classList.add('btn-secondary');
          icon.textContent = '✋';
          label.textContent = 'Modo: Mover / Arrastar (Texto Bloqueado)';
          btn.title = 'Clique para alternar para o Modo Seleção de Texto (desabilita movimentação)';
        }
      }
    },

    closeLightbox(updateHistory = true) {
      const modal = document.getElementById('svg-lightbox-modal');
      if (modal) modal.classList.remove('active');
      this.activeMap = null;

      if (updateHistory && window.location.hash.startsWith('#mapa-')) {
        if (window.history && window.history.back) {
          window.history.back();
          setTimeout(() => {
            if (window.location.hash.startsWith('#mapa-')) {
              window.history.replaceState({ type: 'tab', tab: 'mapas' }, '', '#tab-mapas');
            }
          }, 150);
        }
      }
    },

    zoom(delta) {
      this.zoomLevel = Math.max(0.3, Math.min(4.5, this.zoomLevel + delta));
      this.updateTransform();
    },

    resetTransform() {
      this.zoomLevel = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.updateTransform();
    },

    updateTransform() {
      const canvasInner = document.getElementById('svg-canvas-inner');
      const zoomBadge = document.getElementById('zoom-percentage-badge');
      if (canvasInner) {
        canvasInner.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;
      }
      if (zoomBadge) {
        zoomBadge.textContent = `${Math.round(this.zoomLevel * 100)}%`;
      }
    },

    downloadActiveSvg() {
      if (!this.activeMap) return;
      if (this.activeMap.svgContent) {
        const blob = new Blob([this.activeMap.svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.activeMap.id}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const a = document.createElement('a');
        a.href = this.activeMap.svgPath;
        a.download = `${this.activeMap.id}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    }
  };

  window.MapasViewer = MapasViewer;
})(window);
