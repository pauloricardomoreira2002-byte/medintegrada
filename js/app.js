/**
 * MEDINTEGRADA - CONTROLADOR PRINCIPAL DA APLICAÇÃO (SPA)
 * Coordenação de Autenticação, Módulos, Temas e Notificações
 */

(function(window) {
  'use strict';

  const App = {
    currentTab: 'resumos',

    init() {
      // 1. Init Auth
      window.AuthManager.init();

      // 2. Check Theme Preference
      this.initTheme();

      // 3. Bind UI Events
      this.bindAuthEvents();
      this.bindNavigationEvents();
      this.bindAdminEvents();
      this.bindImporterEvents();
      this.bindHistoryRouting();

      // 4. Verify Active Session
      this.checkSession();
    },

    /* ===================================================================
       SESSÃO & AUTENTICAÇÃO
       =================================================================== */
    checkSession() {
      const user = window.AuthManager.getCurrentUser();
      const loginView = document.getElementById('view-login');
      const dashboardView = document.getElementById('view-dashboard');

      if (!user) {
        if (loginView) loginView.style.display = 'flex';
        if (dashboardView) dashboardView.style.display = 'none';
      } else {
        if (loginView) loginView.style.display = 'none';
        if (dashboardView) dashboardView.style.display = 'flex';

        this.updateUserInterface(user);
        this.loadModulesData();
      }
    },

    updateUserInterface(user) {
      const userNameEl = document.getElementById('header-user-name');
      const userAvatarEl = document.getElementById('header-user-avatar');
      const userRoleEl = document.getElementById('header-user-role');
      const adminTabBtn = document.getElementById('nav-btn-admin');

      if (userNameEl) userNameEl.textContent = user.name;
      if (userRoleEl) userRoleEl.textContent = user.role === 'admin' ? 'Administrador' : 'Estudante UCT20';
      if (userAvatarEl) {
        userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
      }

      // Hide or show admin tab
      if (adminTabBtn) {
        adminTabBtn.style.display = (user.role === 'admin') ? 'flex' : 'none';
      }

      // If non-admin had admin tab open, switch to resumos
      if (user.role !== 'admin' && this.currentTab === 'admin') {
        this.switchTab('resumos');
      }
    },

    bindAuthEvents() {
      const form = document.getElementById('form-login');
      const btnTogglePwd = document.getElementById('btn-toggle-password');
      const pwdInput = document.getElementById('login-password');
      const btnLogout = document.getElementById('btn-logout');

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const userVal = document.getElementById('login-username').value;
          const pwdVal = pwdInput.value;
          const remember = document.getElementById('login-remember').checked;

          const res = window.AuthManager.login(userVal, pwdVal, remember);
          if (res.success) {
            if (window.SimuladoEngine && typeof window.SimuladoEngine.closeRunner === 'function') {
              window.SimuladoEngine.closeRunner();
            }
            this.showToast(`Bem-vindo(a), ${res.user.name}!`, 'success');
            this.checkSession();
          } else {
            this.showToast(res.message, 'danger');
          }
        });
      }

      // Toggle Password Visibility
      if (btnTogglePwd && pwdInput) {
        btnTogglePwd.addEventListener('click', () => {
          const type = pwdInput.type === 'password' ? 'text' : 'password';
          pwdInput.type = type;
        });
      }

      // Logout
      if (btnLogout) {
        btnLogout.addEventListener('click', () => {
          if (window.SimuladoEngine && typeof window.SimuladoEngine.closeRunner === 'function') {
            window.SimuladoEngine.closeRunner();
          }
          window.AuthManager.logout();
          this.showToast('Sessão encerrada com sucesso.', 'info');
          this.checkSession();
        });
      }
    },

    /* ===================================================================
       NAVEGAÇÃO DE ABAS
       =================================================================== */
    bindNavigationEvents() {
      const navButtons = document.querySelectorAll('.nav-tab-btn');
      navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tabName = btn.getAttribute('data-tab');
          this.switchTab(tabName);
        });
      });

      // Filter pills for Mapas
      const mapaFilterPills = document.querySelectorAll('#mapas-filters .filter-pill');
      mapaFilterPills.forEach(pill => {
        pill.addEventListener('click', () => {
          mapaFilterPills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cat = pill.getAttribute('data-category');
          if (window.MapasViewer) window.MapasViewer.setFilter(cat);
        });
      });

      // Search input for Mapas
      const mapaSearch = document.getElementById('mapas-search-input');
      if (mapaSearch) {
        mapaSearch.addEventListener('input', (e) => {
          if (window.MapasViewer) window.MapasViewer.setSearch(e.target.value);
        });
      }

      // Search input for Resumos
      const resumoSearch = document.getElementById('resumos-search-input');
      if (resumoSearch) {
        resumoSearch.addEventListener('input', (e) => {
          if (window.ResumosViewer && typeof window.ResumosViewer.setSearchQuery === 'function') {
            window.ResumosViewer.setSearchQuery(e.target.value);
          }
        });
      }
    },

    switchTab(tabName, pushHistory = true) {
      this.currentTab = tabName;

      // Update Nav Buttons
      document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
      });

      // Update Panes
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });

      const activePane = document.getElementById(`tab-${tabName}`);
      if (activePane) {
        activePane.classList.add('active');
      }

      // If switching to admin, refresh users
      if (tabName === 'admin') {
        this.renderAdminUsersTable();
      }

      // If switching to simulados, refresh catalog for current user
      if (tabName === 'simulados' && window.SimuladoEngine && typeof window.SimuladoEngine.renderExamsCatalog === 'function') {
        window.SimuladoEngine.renderExamsCatalog();
      }

      if (pushHistory && window.history && window.history.pushState) {
        const hash = `#tab-${tabName}`;
        if (window.location.hash !== hash) {
          window.history.pushState({ type: 'tab', tab: tabName }, '', hash);
        }
      }
    },

    /* ===================================================================
       SISTEMA DE HISTÓRICO & BOTÃO VOLTAR DO NAVEGADOR
       =================================================================== */
    bindHistoryRouting() {
      // Se a URL não tiver hash (exemplo: acessou via https://med.site.je/?i=1),
      // inicializa o histórico com #tab-resumos via replaceState preservando parâmetros (como ?i=1).
      // Isso cria uma âncora inicial segura no histórico sem poluir o botão voltar.
      if (!window.location.hash) {
        if (window.history && window.history.replaceState) {
          const path = window.location.pathname || '/';
          const search = window.location.search || '';
          window.history.replaceState({ type: 'tab', tab: 'resumos' }, '', `${path}${search}#tab-resumos`);
        }
      }

      // Escuta o botão Voltar e Avançar do navegador (computador e celular)
      window.addEventListener('popstate', (e) => {
        this.handleBrowserBackNavigation(e.state);
      });

      // Se o usuário abriu com uma hash específica na URL (deeplinking)
      setTimeout(() => {
        this.routeFromCurrentHash(false);
      }, 150);
    },

    handleBrowserBackNavigation(state) {
      // 1. Se modal genérico estiver aberto (ex: importador, gabarito detalhado), fechar
      const activeModal = document.querySelector('.modal-overlay.active:not(#resumo-reader-modal):not(#svg-lightbox-modal)');
      if (activeModal) {
        activeModal.classList.remove('active');
        return;
      }

      // 2. Se o visualizador SVG Lightbox estiver aberto, fechar
      const svgLightbox = document.getElementById('svg-lightbox-modal');
      if (svgLightbox && svgLightbox.classList.contains('active')) {
        if (window.MapasViewer && typeof window.MapasViewer.closeLightbox === 'function') {
          window.MapasViewer.closeLightbox(false);
          return;
        }
      }

      // 3. Se o leitor de Resumos estiver aberto, fechar
      const readerModal = document.getElementById('resumo-reader-modal');
      if (readerModal && readerModal.classList.contains('active')) {
        if (window.ResumosViewer && typeof window.ResumosViewer.closeReader === 'function') {
          window.ResumosViewer.closeReader(false);
          return;
        }
      }

      // 4. Se estiver dentro de um Simulado em execução, fechar e voltar para o catálogo
      const runnerView = document.getElementById('simulados-view-runner');
      if (runnerView && runnerView.style.display !== 'none' && runnerView.style.display !== '') {
        if (window.SimuladoEngine && typeof window.SimuladoEngine.closeRunner === 'function') {
          window.SimuladoEngine.closeRunner(false);
          return;
        }
      }

      // 5. Restaura a aba correspondente ao histórico
      const hash = window.location.hash || '';
      if (hash.startsWith('#tab-')) {
        const tab = hash.replace('#tab-', '');
        this.switchTab(tab, false);
      } else {
        this.switchTab('resumos', false);
      }
    },

    routeFromCurrentHash(pushHistory = false) {
      const hash = window.location.hash || '';
      if (!hash) return;

      if (hash.startsWith('#tab-')) {
        const tab = hash.replace('#tab-', '');
        const validTabs = ['resumos', 'mapas', 'simulados', 'admin'];
        if (validTabs.includes(tab)) {
          this.switchTab(tab, pushHistory);
        }
      } else if (hash.startsWith('#resumo-')) {
        const resumoId = hash.replace('#resumo-', '');
        this.switchTab('resumos', false);
        if (window.MED_RESUMOS && window.ResumosViewer) {
          const found = window.MED_RESUMOS.find(r => r.id === resumoId);
          if (found) window.ResumosViewer.openReader(found, pushHistory);
        }
      } else if (hash.startsWith('#simulado-')) {
        const examId = hash.replace('#simulado-', '');
        this.switchTab('simulados', false);
        if (window.SimuladoEngine) {
          window.SimuladoEngine.startExam(examId, pushHistory);
        }
      } else if (hash.startsWith('#mapa-')) {
        const mapaId = hash.replace('#mapa-', '');
        this.switchTab('mapas', false);
        if (window.MED_MAPAS && window.MapasViewer) {
          const found = window.MED_MAPAS.find(m => m.id === mapaId);
          if (found) window.MapasViewer.openLightbox(found, pushHistory);
        }
      }
    },

    /* ===================================================================
       CARREGAMENTO DE DADOS DOS MÓDULOS
       =================================================================== */
    loadModulesData() {
      // 1. Resumos Detalhados
      if (window.ResumosViewer && window.MED_RESUMOS) {
        window.ResumosViewer.renderCatalog(window.MED_RESUMOS, 'resumos-grid-container');
      }

      // 2. Mapas & Esquemas SVG
      if (window.MapasViewer && window.MED_MAPAS) {
        window.MapasViewer.init(window.MED_MAPAS);
      }

      // 3. Simulados
      if (window.SimuladoEngine && window.MED_SIMULADOS) {
        window.SimuladoEngine.init(window.MED_SIMULADOS);
      }

      // 4. Admin stats if admin
      if (window.AuthManager.isAdmin()) {
        this.renderAdminStats();
      }
    },

    /* ===================================================================
       PAINEL DO ADMINISTRADOR (GESTÃO DE USUÁRIOS)
       =================================================================== */
    bindAdminEvents() {
      const formAdd = document.getElementById('form-add-student');
      const btnGeneratePwd = document.getElementById('btn-suggest-password');
      const inputPwd = document.getElementById('new-student-password');

      if (btnGeneratePwd && inputPwd) {
        btnGeneratePwd.addEventListener('click', () => {
          inputPwd.value = window.AuthManager.generateSuggestedPassword();
        });
      }

      if (formAdd) {
        formAdd.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('new-student-name').value;
          const login = document.getElementById('new-student-username').value;
          const pwd = inputPwd.value;

          const res = window.AuthManager.addUser(name, login, pwd);
          if (res.success) {
            this.showToast(`Acesso liberado com sucesso para ${name}!`, 'success');
            formAdd.reset();
            this.renderAdminUsersTable();
            this.renderAdminStats();
          } else {
            this.showToast(res.message, 'danger');
          }
        });
      }
    },

    renderAdminStats() {
      const users = window.AuthManager.getUsers();
      const students = users.filter(u => u.role === 'student');
      const activeCount = users.filter(u => u.active).length;
      const examsCount = (window.MED_SIMULADOS || []).length;

      const statStudents = document.getElementById('stat-total-students');
      const statActive = document.getElementById('stat-active-users');
      const statExams = document.getElementById('stat-available-exams');

      if (statStudents) statStudents.textContent = students.length;
      if (statActive) statActive.textContent = activeCount;
      if (statExams) statExams.textContent = examsCount;
    },

    renderAdminUsersTable() {
      const tbody = document.getElementById('admin-users-tbody');
      if (!tbody) return;

      const users = window.AuthManager.getUsers();
      tbody.innerHTML = users.map(u => {
        const isAdmin = u.role === 'admin';
        return `
          <tr>
            <td>
              <div class="user-cell-name">${u.name}</div>
            </td>
            <td>
              <span class="user-cell-login">${u.username}</span>
            </td>
            <td>
              <span class="badge ${isAdmin ? 'badge-primary' : 'badge-indigo'}">${isAdmin ? 'Administrador' : 'Estudante'}</span>
            </td>
            <td>${u.createdAt || '2026-10-20'}</td>
            <td>
              <span class="user-status-dot ${u.active ? 'active' : 'blocked'}"></span>
              ${u.active ? 'Ativo' : 'Bloqueado'}
            </td>
            <td>
              <div class="table-actions-cell">
                <button class="btn btn-secondary btn-sm btn-copy-access" data-username="${u.username}" title="Copiar mensagem para WhatsApp">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copiar Acesso
                </button>
                ${!isAdmin ? `
                  <button class="btn btn-ghost btn-sm btn-toggle-status" data-username="${u.username}" title="${u.active ? 'Bloquear Acesso' : 'Ativar Acesso'}">
                    ${u.active ? '🚫' : '✓'}
                  </button>
                  <button class="btn btn-ghost btn-sm btn-delete-user" data-username="${u.username}" style="color:var(--color-danger);" title="Excluir Aluno">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      // Copy Access Button
      tbody.querySelectorAll('.btn-copy-access').forEach(btn => {
        btn.addEventListener('click', () => {
          const username = btn.getAttribute('data-username');
          const found = users.find(u => u.username === username);
          if (found) {
            const text = window.AuthManager.formatWhatsAppMessage(found);
            navigator.clipboard.writeText(text).then(() => {
              this.showToast(`Dados de acesso de ${found.name} copiados para o WhatsApp!`, 'success');
            });
          }
        });
      });

      // Toggle Status Button
      tbody.querySelectorAll('.btn-toggle-status').forEach(btn => {
        btn.addEventListener('click', () => {
          const username = btn.getAttribute('data-username');
          const res = window.AuthManager.toggleUserStatus(username);
          if (res.success) {
            this.showToast(`Status do usuário ${username} alterado.`, 'info');
            this.renderAdminUsersTable();
            this.renderAdminStats();
          } else {
            this.showToast(res.message, 'danger');
          }
        });
      });

      // Delete User Button
      tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
        btn.addEventListener('click', () => {
          const username = btn.getAttribute('data-username');
          if (confirm(`Deseja realmente remover o usuário ${username}?`)) {
            const res = window.AuthManager.deleteUser(username);
            if (res.success) {
              this.showToast(`Usuário ${username} removido com sucesso.`, 'info');
              this.renderAdminUsersTable();
              this.renderAdminStats();
            }
          }
        });
      });
    },

    /* ===================================================================
       IMPORTADOR DE SIMULADOS JSON
       =================================================================== */
    bindImporterEvents() {
      const btnOpenImport = document.getElementById('btn-open-exam-importer');
      const modal = document.getElementById('modal-exam-importer');
      const btnClose = document.getElementById('btn-close-importer');
      const form = document.getElementById('form-exam-importer');
      const fileInput = document.getElementById('importer-file-input');
      const textarea = document.getElementById('importer-json-textarea');

      if (btnOpenImport) {
        btnOpenImport.addEventListener('click', () => {
          if (modal) modal.classList.add('active');
        });
      }

      if (btnClose) {
        btnClose.addEventListener('click', () => {
          if (modal) modal.classList.remove('active');
        });
      }

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (textarea) textarea.value = evt.target.result;
          };
          reader.readAsText(file);
        });
      }

      if (form) {
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const jsonVal = textarea.value.trim();
          if (!jsonVal) {
            this.showToast('Cole o conteúdo JSON ou carregue um arquivo .json.', 'warning');
            return;
          }

          const folderSelect = document.getElementById('importer-folder-select');
          const folderVal = folderSelect ? folderSelect.value : 'UCT20 CAB';
          const res = window.SimuladoEngine.importExamJson(jsonVal, folderVal);
          if (res.success) {
            this.showToast(`Simulado "${res.exam.title}" importado com sucesso!`, 'success');
            if (modal) modal.classList.remove('active');
            textarea.value = '';
          } else {
            this.showToast(res.message, 'danger');
          }
        });
      }
    },

    /* ===================================================================
       TEMA DARK / LIGHT
       =================================================================== */
    initTheme() {
      const savedTheme = localStorage.getItem('med_theme_pref') || 'dark';
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateThemeButton(savedTheme);

      const btnToggle = document.getElementById('btn-theme-toggle');
      if (btnToggle) {
        btnToggle.addEventListener('click', () => {
          const current = document.documentElement.getAttribute('data-theme') || 'dark';
          const next = current === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('med_theme_pref', next);
          this.updateThemeButton(next);
        });
      }
    },

    updateThemeButton(theme) {
      const btnToggle = document.getElementById('btn-theme-toggle');
      if (!btnToggle) return;
      btnToggle.innerHTML = theme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    },

    /* ===================================================================
       NOTIFICAÇÕES TOAST
       =================================================================== */
    showToast(message, type = 'info') {
      const container = document.getElementById('toast-container');
      if (!container) return;

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.innerHTML = `
        <div style="flex:1;">${message}</div>
        <button class="btn btn-ghost btn-sm" style="padding:0; width:20px; height:20px;">✕</button>
      `;

      toast.querySelector('button').onclick = () => toast.remove();

      container.appendChild(toast);
      setTimeout(() => {
        if (toast.parentNode) toast.remove();
      }, 4000);
    }
  };

  window.App = App;

  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
})(window);
