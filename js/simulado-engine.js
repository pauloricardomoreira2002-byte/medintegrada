/**
 * MEDINTEGRADA - MOTOR DE SIMULADOS PSICOMÉTRICOS & BANCO DE QUESTÕES
 * Padrão ENAMED/INEP com Raio-X Cognitivo dos Distratores
 * 100% dos Requisitos Obrigatórios Implementados
 */

(function(window) {
  'use strict';

  const STORAGE_CUSTOM_EXAMS_KEY = 'med_custom_exams_v1';
  const STORAGE_HIGHLIGHTER_GLOBAL_KEY = 'med_highlighter_enabled_pref';
  const STORAGE_HIGHLIGHTER_COLOR_KEY = 'med_highlighter_color_pref';

  function getCardIllustration(id, title) {
    const t = ((id || '') + ' ' + (title || '')).toLowerCase();
    if (t.includes('reumat') || t.includes('artrite_reumatoide') || t.includes('artrite reumatoide')) {
      return { themeClass: 'theme-reumato', icon: '🦴', color: '#0ea5e9' };
    }
    if (t.includes('gota') || t.includes('uric') || t.includes('hiperuricemia')) {
      return { themeClass: 'theme-gota', icon: '🦶', color: '#f59e0b' };
    }
    if (t.includes('lupus') || t.includes('lúpus') || t.includes('les')) {
      return { themeClass: 'theme-lupus', icon: '🦋', color: '#f43f5e' };
    }
    if (t.includes('mieloma') || t.includes('gamopatia')) {
      return { themeClass: 'theme-mieloma', icon: '🩸', color: '#a855f7' };
    }
    if (t.includes('septica') || t.includes('séptica') || t.includes('osteo') || t.includes('infecc')) {
      return { themeClass: 'theme-infecciosa', icon: '🦠', color: '#10b981' };
    }
    return { themeClass: 'theme-default', icon: '📋', color: '#38bdf8' };
  }

  const SimuladoEngine = {
    allExams: [],
    activeExam: null,
    currentQuestionIndex: 0,
    
    // Global Highlighter state (persists across questions and reloads)
    highlighterEnabled: true,
    activeHighlightColor: 'yellow', // 'yellow' | 'green'

    // Active session state for current exam
    examState: {
      currentIndex: 0,
      answers: {},        // { [qId]: { selected: 'B', confirmed: true, isCorrect: true } }
      strikes: {},        // { [qId]: ['A', 'D'] }
      highlights: {},     // { [qId]: 'saved-inner-html-or-ranges' }
      score: 0,
      totalAnswered: 0
    },

    _eventsBound: false,

    init(defaultExams) {
      this.migrateLegacyExamDataIfNeeded();
      this.loadHighlighterPreferences();
      this.refreshExamsList(defaultExams);
      if (!this._eventsBound) {
        this.bindGlobalEvents();
        this._eventsBound = true;
      }
    },

    getCurrentUsername() {
      if (window.AuthManager && typeof window.AuthManager.getCurrentUser === 'function') {
        const u = window.AuthManager.getCurrentUser();
        if (u && u.username) return u.username.trim().toLowerCase();
      }
      return 'guest';
    },

    migrateLegacyExamDataIfNeeded() {
      try {
        const user = this.getCurrentUsername();
        const users = (window.AuthManager && typeof window.AuthManager.getUsers === 'function')
          ? window.AuthManager.getUsers().map(u => u.username.toLowerCase())
          : ['admin', 'aluno'];

        const legacyKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('med_simulado_state_')) {
            const suffix = k.substring('med_simulado_state_'.length);
            // Verifica se já tem o formato: med_simulado_state_{username}_{examId}
            const hasUserPrefix = users.some(u => suffix.startsWith(`${u}_`));
            if (!hasUserPrefix) {
              legacyKeys.push({ key: k, examId: suffix });
            }
          }
        }

        legacyKeys.forEach(({ key, examId }) => {
          const val = localStorage.getItem(key);
          if (val) {
            // Os dados legados anteriores pertencem ao admin principal
            const adminKey = `med_simulado_state_admin_${examId}`;
            if (!localStorage.getItem(adminKey)) {
              localStorage.setItem(adminKey, val);
            }
          }
          localStorage.removeItem(key);
        });
      } catch (e) {
        console.warn('Erro ao migrar dados legados de simulado:', e);
      }
    },

    cleanUserExamData(username) {
      if (!username) return;
      try {
        const cleanUser = username.trim().toLowerCase();
        const prefix = `med_simulado_state_${cleanUser}_`;
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(prefix)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
        localStorage.removeItem(`med_hl_enabled_${cleanUser}`);
        localStorage.removeItem(`med_hl_color_${cleanUser}`);
      } catch (e) {
        console.warn('Erro ao limpar dados de simulado do usuário:', e);
      }
    },

    loadHighlighterPreferences() {
      const user = this.getCurrentUsername();
      const savedEnabled = localStorage.getItem(`med_hl_enabled_${user}`) ?? localStorage.getItem(STORAGE_HIGHLIGHTER_GLOBAL_KEY);
      if (savedEnabled !== null) {
        this.highlighterEnabled = (savedEnabled === 'true');
      }
      const savedColor = localStorage.getItem(`med_hl_color_${user}`) ?? localStorage.getItem(STORAGE_HIGHLIGHTER_COLOR_KEY);
      if (savedColor === 'yellow' || savedColor === 'green') {
        this.activeHighlightColor = savedColor;
      }
    },

    refreshExamsList(defaultExams) {
      const customRaw = localStorage.getItem(STORAGE_CUSTOM_EXAMS_KEY);
      let customExams = [];
      if (customRaw) {
        try { customExams = JSON.parse(customRaw); } catch(e) {}
      }
      this.allExams = [...(defaultExams || []), ...customExams];
      this.renderExamsCatalog();
    },

    getExamStorageKey(examId, username = null) {
      const user = username || this.getCurrentUsername();
      return `med_simulado_state_${user}_${examId}`;
    },

    loadExamState(examId) {
      const raw = localStorage.getItem(this.getExamStorageKey(examId));
      if (!raw) {
        return {
          currentIndex: 0,
          answers: {},
          strikes: {},
          highlights: {},
          score: 0,
          totalAnswered: 0
        };
      }
      try {
        return JSON.parse(raw);
      } catch (e) {
        return {
          currentIndex: 0,
          answers: {},
          strikes: {},
          highlights: {},
          score: 0,
          totalAnswered: 0
        };
      }
    },

    saveExamState() {
      if (!this.activeExam) return;
      localStorage.setItem(this.getExamStorageKey(this.activeExam.id), JSON.stringify(this.examState));
      this.updateAutoSaveIndicator();

      if (window.MedSupabase && typeof window.MedSupabase.saveExamState === 'function') {
        window.MedSupabase.saveExamState(
          this.getCurrentUsername(),
          this.activeExam.id,
          this.examState,
          this.activeExam.folder || this.activeFolder
        );
      }
    },

    updateAutoSaveIndicator() {
      const el = document.getElementById('autosave-indicator');
      if (!el) return;
      el.innerHTML = '<span class="pulse-indicator"></span> Progresso salvo automaticamente';
    },

    activeFolder: 'UCT20 CAB',

    bindFolderEvents() {
      const folderTabs = document.getElementById('simulados-folder-tabs');
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
      const folderTabs = document.getElementById('simulados-folder-tabs');
      if (folderTabs) {
        folderTabs.querySelectorAll('.folder-nav-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-folder') === folder);
        });
      }
      this.renderExamsCatalog();
    },

    updateFolderBadges() {
      const list = this.allExams || [];
      const countCab = list.filter(e => (e.folder || 'UCT20 CAB') === 'UCT20 CAB').length;
      const countTutoria = list.filter(e => e.folder === 'UCT20 Tutoria').length;

      const badgeCab = document.getElementById('badge-count-simulados-cab');
      const badgeTutoria = document.getElementById('badge-count-simulados-tutoria');
      if (badgeCab) badgeCab.textContent = countCab;
      if (badgeTutoria) badgeTutoria.textContent = countTutoria;
    },

    /* ===================================================================
       1. CATÁLOGO DE SIMULADOS
       =================================================================== */
    renderExamsCatalog() {
      const container = document.getElementById('simulados-catalog-grid');
      if (!container) return;

      this.bindFolderEvents();
      this.updateFolderBadges();

      const filtered = this.allExams.filter(exam => (exam.folder || 'UCT20 CAB') === this.activeFolder);

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="empty-folder-box" style="grid-column: 1 / -1;">
            <div class="empty-folder-icon">📝</div>
            <h3 class="empty-folder-title">Pasta ${this.activeFolder} Vazia</h3>
            <p class="empty-folder-desc">Nenhum simulado cadastrado nesta pasta ainda. Os simulados vinculados a ${this.activeFolder} aparecerão automaticamente aqui.</p>
            <span class="empty-folder-badge" style="margin-top:16px;">📂 Diretório: data/simulados/${this.activeFolder}</span>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(exam => {
        const state = this.loadExamState(exam.id);
        const total = exam.questions ? exam.questions.length : 0;
        const answered = Object.values(state.answers).filter(a => a.confirmed).length;
        const correct = Object.values(state.answers).filter(a => a.confirmed && a.isCorrect).length;
        const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
        const progressPct = total > 0 ? Math.round((answered / total) * 100) : 0;

        const cleanTitle = (exam.title || '')
          .replace(/^Simulado\s+Comentado\s*[•:\-]?\s*/i, '')
          .trim();
        const ill = getCardIllustration(exam.id, cleanTitle);

        return `
          <div class="simulado-card" data-exam-id="${exam.id}">
            <div class="card-illustration-header ${ill.themeClass}">
              <div class="card-illustration-glow"></div>
              <div class="card-illustration-circle">
                <span class="card-illustration-emoji">${ill.icon}</span>
              </div>
            </div>

            <div class="simulado-card-body">
              <h3 class="simulado-card-title">${cleanTitle}</h3>

              <div class="simulado-card-stats">
                <div class="simulado-stat-item">
                  <span class="stat-label">Progresso</span>
                  <span class="stat-value">${answered} / ${total}</span>
                </div>
                <div class="simulado-stat-item">
                  <span class="stat-label">Aproveitamento</span>
                  <span class="stat-value" style="color: ${pct >= 70 ? 'var(--color-success)' : pct > 0 ? 'var(--color-warning)' : 'inherit'};">${answered > 0 ? `${pct}%` : '--'}</span>
                </div>
              </div>

              <div>
                <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-dim); margin-bottom: 4px;">
                  <span>Conclusão</span>
                  <span>${progressPct}%</span>
                </div>
                <div class="simulado-progress-bar-bg">
                  <div class="simulado-progress-bar-fill" style="width: ${progressPct}%;"></div>
                </div>
              </div>

              <button class="btn btn-primary btn-start-exam" data-exam-id="${exam.id}" style="width: 100%;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                ${answered === 0 ? 'Iniciar Simulado' : answered === total ? 'Revisar Simulado' : 'Continuar Simulado'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Bind buttons
      container.querySelectorAll('.btn-start-exam').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const examId = btn.getAttribute('data-exam-id');
          this.startExam(examId);
        });
      });
    },

    /* ===================================================================
       2. INÍCIO E RUNNER DO SIMULADO
       =================================================================== */
    startExam(examId, pushHistory = true) {
      const found = this.allExams.find(e => e.id === examId);
      if (!found || !found.questions || found.questions.length === 0) {
        if (window.App) window.App.showToast('Simulado não possui questões disponíveis.', 'danger');
        return;
      }

      this.activeExam = found;
      this.examState = this.loadExamState(examId);
      this.currentQuestionIndex = this.examState.currentIndex || 0;

      // Switch view: hide catalog, show runner
      document.getElementById('simulados-view-catalog').style.display = 'none';
      document.getElementById('simulados-view-runner').style.display = 'block';

      this.renderSmartHeader();
      this.renderNavPills();
      this.renderQuestion(this.currentQuestionIndex);

      // Sincronização em nuvem em segundo plano se houver dados mais recentes no Supabase
      if (window.MedSupabase && typeof window.MedSupabase.loadExamState === 'function') {
        const username = this.getCurrentUsername();
        if (username !== 'guest') {
          window.MedSupabase.loadExamState(username, examId).then(cloudState => {
            if (cloudState && cloudState.totalAnswered > (this.examState.totalAnswered || 0)) {
              this.examState = cloudState;
              localStorage.setItem(this.getExamStorageKey(examId), JSON.stringify(cloudState));
              this.currentQuestionIndex = this.examState.currentIndex || 0;
              this.renderSmartHeader();
              this.renderNavPills();
              this.renderQuestion(this.currentQuestionIndex);
            }
          }).catch(e => console.warn('[SimuladoEngine] Erro ao sincronizar estado da nuvem:', e));
        }
      }
      // Registra no histórico de navegação para permitir voltar pelo navegador
      if (pushHistory && window.history && window.history.pushState) {
        const hash = `#simulado-${examId}`;
        if (window.location.hash !== hash) {
          window.history.pushState({ type: 'simulado', id: examId }, '', hash);
        }
      }
    },

    closeRunner(updateHistory = true) {
      if (document.getElementById('simulados-view-runner')) {
        document.getElementById('simulados-view-runner').style.display = 'none';
      }
      if (document.getElementById('simulados-view-catalog')) {
        document.getElementById('simulados-view-catalog').style.display = 'block';
      }
      this.activeExam = null;
      this.renderExamsCatalog();

      if (updateHistory && window.location.hash.startsWith('#simulado-')) {
        if (window.history && window.history.back) {
          window.history.back();
          setTimeout(() => {
            if (window.location.hash.startsWith('#simulado-')) {
              window.history.replaceState({ type: 'tab', tab: 'simulados' }, '', '#tab-simulados');
            }
          }, 150);
        }
      }
    },

    restartExam() {
      if (!confirm('Deseja realmente reiniciar todo o progresso deste simulado? Todas as respostas, grifos e anotações serão limpos.')) {
        return;
      }

      this.examState = {
        currentIndex: 0,
        answers: {},
        strikes: {},
        highlights: {},
        score: 0,
        totalAnswered: 0
      };

      this.currentQuestionIndex = 0;
      this.saveExamState();
      this.renderSmartHeader();
      this.renderNavPills();
      this.renderQuestion(0);
      if (window.App) window.App.showToast('Simulado reiniciado com sucesso!', 'info');
    },

    /* ===================================================================
       3. RENDERIZAÇÃO DO CABEÇALHO INTELIGENTE & PÍLULAS
       =================================================================== */
    renderSmartHeader() {
      const titleEl = document.getElementById('exam-runner-title');
      const subtitleEl = document.getElementById('exam-runner-subtitle');
      const badgeEl = document.getElementById('exam-runner-badge');
      const scoreEl = document.getElementById('exam-dynamic-score');

      if (titleEl) titleEl.textContent = this.activeExam.title;
      if (subtitleEl) subtitleEl.textContent = this.activeExam.subtitle || '';
      if (badgeEl) badgeEl.textContent = this.activeExam.badge || 'ENAMED / Residência Médica';

      this.updateScoreCounter();
      this.updateAutoSaveIndicator();
    },

    updateScoreCounter() {
      const scoreEl = document.getElementById('exam-dynamic-score');
      if (!scoreEl || !this.activeExam) return;

      const total = this.activeExam.questions.length;
      const confirmedAnswers = Object.values(this.examState.answers).filter(a => a.confirmed);
      const answeredCount = confirmedAnswers.length;
      const correctCount = confirmedAnswers.filter(a => a.isCorrect).length;
      const pct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

      scoreEl.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
        <span>${correctCount} / ${answeredCount} acertos (${pct}%)</span>
      `;
    },

    renderNavPills() {
      const pillsGrid = document.getElementById('nav-pills-grid');
      if (!pillsGrid || !this.activeExam) return;

      const questions = this.activeExam.questions;
      pillsGrid.innerHTML = questions.map((q, idx) => {
        const qId = q.id;
        const answerData = this.examState.answers[qId];
        
        let stateClass = 'pending';
        let icon = '';

        if (idx === this.currentQuestionIndex) {
          stateClass = 'active';
        } else if (answerData && answerData.confirmed) {
          if (answerData.isCorrect) {
            stateClass = 'correct';
            icon = ' ✓';
          } else {
            stateClass = 'incorrect';
            icon = ' ✕';
          }
        }

        return `
          <div class="nav-pill ${stateClass}" data-index="${idx}" title="Questão ${idx + 1}">
            ${idx + 1}${icon}
          </div>
        `;
      }).join('');

      pillsGrid.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          const idx = parseInt(pill.getAttribute('data-index'), 10);
          this.navigateToQuestion(idx);
        });
      });
    },

    navigateToQuestion(idx) {
      if (idx < 0 || idx >= this.activeExam.questions.length) return;
      this.currentQuestionIndex = idx;
      this.examState.currentIndex = idx;
      this.saveExamState();
      this.renderNavPills();
      this.renderQuestion(idx);
    },

    /* ===================================================================
       4. RENDERIZAÇÃO DA QUESTÃO ATIVA
       =================================================================== */
    renderQuestion(idx) {
      const q = this.activeExam.questions[idx];
      if (!q) return;

      const qId = q.id;
      const totalQ = this.activeExam.questions.length;

      // Meta & Tag
      const numBadge = document.getElementById('q-number-badge');
      const tagBadge = document.getElementById('q-tag-badge');
      const stemContainer = document.getElementById('q-stem-container');
      const optionsList = document.getElementById('q-options-list');
      const feedbackBox = document.getElementById('q-feedback-box');
      const btnConfirm = document.getElementById('btn-confirm-answer');
      const btnPrev = document.getElementById('btn-prev-question');
      const btnNext = document.getElementById('btn-next-question');
      const btnScoreboard = document.getElementById('btn-view-scoreboard');
      const btnClearHighlights = document.getElementById('btn-clear-highlights');

      if (numBadge) numBadge.textContent = `Questão ${idx + 1} de ${totalQ}`;
      if (tagBadge) tagBadge.textContent = q.tag || 'Clínica Médica';

      // Enunciado com grifos restaurados
      const savedStemHtml = this.examState.highlights[qId] || q.stem;
      stemContainer.innerHTML = savedStemHtml;

      // Update highlighter buttons & visibility
      this.updateHighlighterControls();

      // Check if question has highlights to show clear button
      const hasHighlights = stemContainer.querySelectorAll('.stem-highlight').length > 0;
      if (btnClearHighlights) {
        btnClearHighlights.classList.toggle('visible', hasHighlights);
      }

      // Re-bind click on highlights inside stem
      this.bindHighlightClickEvents(stemContainer);

      // Alternatives & Strikes
      const answerData = this.examState.answers[qId] || {};
      const strikesList = this.examState.strikes[qId] || [];
      const isConfirmed = !!answerData.confirmed;

      optionsList.innerHTML = q.options.map(opt => {
        const letter = opt.letter;
        const isStruck = strikesList.includes(letter);
        const isSelected = answerData.selected === letter;

        let postConfirmClass = '';
        if (isConfirmed) {
          if (letter === q.answer) {
            postConfirmClass = 'correct-answer';
          } else if (isSelected && !answerData.isCorrect) {
            postConfirmClass = 'wrong-selected';
          }
        }

        return `
          <div class="option-item ${isSelected ? 'selected' : ''} ${isStruck ? 'struck' : ''} ${isConfirmed ? 'locked' : ''} ${postConfirmClass}" data-letter="${letter}">
            <div class="option-main" data-letter="${letter}">
              <div class="option-letter-badge">${letter}</div>
              <div class="option-text">${opt.text}</div>
            </div>
            <button class="btn-strike" data-letter="${letter}" title="${isStruck ? 'Desmarcar risco' : 'Riscar/eliminar alternativa'}" ${isConfirmed ? 'disabled' : ''}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="4" y1="4" x2="20" y2="20"/><path d="M16 16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h1"/></svg>
            </button>
          </div>
        `;
      }).join('');

      // Bind events for options
      optionsList.querySelectorAll('.option-item').forEach(item => {
        const letter = item.getAttribute('data-letter');

        // Click on alternative body: selects it and removes strike if it was struck
        item.querySelector('.option-main').addEventListener('click', (e) => {
          if (isConfirmed) return;
          this.selectOption(letter);
        });

        // Click on strike button: strikes/unstrikes and auto-deselects if was selected
        item.querySelector('.btn-strike').addEventListener('click', (e) => {
          e.stopPropagation();
          if (isConfirmed) return;
          this.toggleStrikeOption(letter);
        });
      });

      // Confirm Button state
      if (btnConfirm) {
        if (isConfirmed) {
          btnConfirm.style.display = 'none';
        } else {
          btnConfirm.style.display = 'inline-flex';
          const validSelected = answerData.selected && !strikesList.includes(answerData.selected);
          btnConfirm.disabled = !validSelected;
        }
      }

      // Prev / Next button state
      if (btnPrev) btnPrev.disabled = (idx === 0);
      if (btnNext) {
        btnNext.disabled = (idx === totalQ - 1);
      }
      if (btnScoreboard) {
        btnScoreboard.style.display = 'inline-flex';
      }

      // Render feedback box if confirmed
      if (isConfirmed) {
        this.renderFeedbackBox(q, answerData);
      } else {
        feedbackBox.classList.remove('active');
        feedbackBox.innerHTML = '';
      }
    },

    /* ===================================================================
       5. SELEÇÃO, RISCAR & CONFIRMAÇÃO DE ALTERNATIVAS
       =================================================================== */
    selectOption(letter) {
      const q = this.activeExam.questions[this.currentQuestionIndex];
      const qId = q.id;

      // If option is currently struck, clicking it UNSTRIKES and selects it!
      const strikes = this.examState.strikes[qId] || [];
      if (strikes.includes(letter)) {
        this.examState.strikes[qId] = strikes.filter(l => l !== letter);
      }

      // Set selected
      if (!this.examState.answers[qId]) {
        this.examState.answers[qId] = {};
      }
      this.examState.answers[qId].selected = letter;

      this.saveExamState();
      this.renderQuestion(this.currentQuestionIndex);
    },

    toggleStrikeOption(letter) {
      const q = this.activeExam.questions[this.currentQuestionIndex];
      const qId = q.id;

      let strikes = this.examState.strikes[qId] || [];
      if (strikes.includes(letter)) {
        strikes = strikes.filter(l => l !== letter);
      } else {
        strikes.push(letter);
        // Deselect if this was selected!
        if (this.examState.answers[qId] && this.examState.answers[qId].selected === letter) {
          delete this.examState.answers[qId].selected;
        }
      }

      this.examState.strikes[qId] = strikes;
      this.saveExamState();
      this.renderQuestion(this.currentQuestionIndex);
    },

    confirmCurrentAnswer() {
      const q = this.activeExam.questions[this.currentQuestionIndex];
      const qId = q.id;
      const answerData = this.examState.answers[qId];

      if (!answerData || !answerData.selected) return;

      const strikes = this.examState.strikes[qId] || [];
      if (strikes.includes(answerData.selected)) {
        if (window.App) window.App.showToast('Selecione uma alternativa válida (não riscada).', 'warning');
        return;
      }

      const isCorrect = (answerData.selected === q.answer);
      answerData.confirmed = true;
      answerData.isCorrect = isCorrect;
      answerData.confirmedAt = new Date().toISOString();

      this.saveExamState();
      this.updateScoreCounter();
      this.renderNavPills();
      this.renderQuestion(this.currentQuestionIndex);

      // Smooth scroll to feedback
      setTimeout(() => {
        const feedbackEl = document.getElementById('q-feedback-box');
        if (feedbackEl) {
          feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    },

    renderFeedbackBox(q, answerData) {
      const box = document.getElementById('q-feedback-box');
      if (!box) return;

      const isCorrect = answerData.isCorrect;
      const bannerClass = isCorrect ? 'correct' : 'incorrect';
      const bannerIcon = isCorrect ? '✓ Parabéns! Resposta Correta' : `✕ Atenção! Gabarito Oficial: Alternativa ${q.answer}`;

      // Distractors list
      const distractorsHtml = q.distractors && q.distractors.length > 0
        ? q.distractors.map(d => `<div class="distractor-item">${d}</div>`).join('')
        : '<p class="text-muted">Análise de distratores não disponível.</p>';

      box.className = 'feedback-box active';
      box.innerHTML = `
        <div class="feedback-banner ${bannerClass}">
          <span>${bannerIcon}</span>
        </div>

        <div class="feedback-section">
          <div class="feedback-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Fundamentação do Gabarito
          </div>
          <div class="feedback-rationale-text">${q.rationale}</div>
        </div>

        <div class="feedback-section">
          <div class="feedback-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
            Raio-X Psicométrico dos Distratores (Vetores Cognitivos)
          </div>
          <div>${distractorsHtml}</div>
        </div>

        ${q.pearl ? `
          <div class="pearl-box">
            <div class="pearl-icon">⭐</div>
            <div class="pearl-content">
              <strong>Pérola de Prova & Dica do Especialista:</strong><br>
              ${q.pearl}
            </div>
          </div>
        ` : ''}
      `;
    },

    /* ===================================================================
       6. GRIFO INTERATIVO NO ENUNCIADO (2 CORES + PERSISTÊNCIA)
       =================================================================== */
    toggleHighlighter() {
      this.highlighterEnabled = !this.highlighterEnabled;
      const user = this.getCurrentUsername();
      localStorage.setItem(`med_hl_enabled_${user}`, this.highlighterEnabled);
      this.updateHighlighterControls();
      if (window.App) {
        window.App.showToast(this.highlighterEnabled ? 'Modo Grifo ativado (permanecerá ativo nas próximas questões)' : 'Modo Grifo desativado', 'info');
      }
    },

    setHighlightColor(color) {
      if (color !== 'yellow' && color !== 'green') return;
      this.activeHighlightColor = color;
      const user = this.getCurrentUsername();
      localStorage.setItem(`med_hl_color_${user}`, color);
      this.updateHighlighterControls();
    },

    updateHighlighterControls() {
      const btnToggle = document.getElementById('btn-toggle-highlighter');
      const dotYellow = document.getElementById('color-dot-yellow');
      const dotGreen = document.getElementById('color-dot-green');
      const stemContainer = document.getElementById('q-stem-container');

      if (btnToggle) {
        btnToggle.classList.toggle('active', this.highlighterEnabled);
        btnToggle.innerHTML = this.highlighterEnabled
          ? '🖊️ Grifo: Ativado'
          : '🖊️ Grifo: Desativado';
      }

      if (dotYellow) dotYellow.classList.toggle('active', this.activeHighlightColor === 'yellow');
      if (dotGreen) dotGreen.classList.toggle('active', this.activeHighlightColor === 'green');

      if (stemContainer) {
        stemContainer.style.cursor = this.highlighterEnabled ? 'crosshair' : 'text';
      }
    },

    applyHighlightToSelection() {
      if (!this.highlighterEnabled) return;
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) return;

      const stem = document.getElementById('q-stem-container');
      if (!stem) return;

      const range = selection.getRangeAt(0);
      if (!stem.contains(range.commonAncestorContainer)) return;

      const selectedText = range.toString().trim();
      if (!selectedText) return;

      // Wrap selection in span
      const span = document.createElement('span');
      span.className = `stem-highlight hl-${this.activeHighlightColor}`;
      span.setAttribute('data-color', this.activeHighlightColor);

      try {
        range.surroundContents(span);
        selection.removeAllRanges();
        this.saveCurrentStemHighlights();
      } catch (err) {
        // Fallback for complex cross-tag selection
        console.warn('Highlight surround exception:', err);
      }
    },

    saveCurrentStemHighlights() {
      const q = this.activeExam.questions[this.currentQuestionIndex];
      const stem = document.getElementById('q-stem-container');
      if (!q || !stem) return;

      this.examState.highlights[q.id] = stem.innerHTML;
      this.saveExamState();

      const btnClear = document.getElementById('btn-clear-highlights');
      if (btnClear) {
        const hasHighlights = stem.querySelectorAll('.stem-highlight').length > 0;
        btnClear.classList.toggle('visible', hasHighlights);
      }

      this.bindHighlightClickEvents(stem);
    },

    clearCurrentHighlights() {
      const q = this.activeExam.questions[this.currentQuestionIndex];
      const stem = document.getElementById('q-stem-container');
      if (!q || !stem) return;

      delete this.examState.highlights[q.id];
      stem.innerHTML = q.stem;
      this.saveExamState();

      const btnClear = document.getElementById('btn-clear-highlights');
      if (btnClear) btnClear.classList.remove('visible');

      this.removeFloatingPopover();
      if (window.App) window.App.showToast('Grifos da questão removidos.', 'info');
    },

    bindHighlightClickEvents(stemContainer) {
      stemContainer.querySelectorAll('.stem-highlight').forEach(hl => {
        hl.onclick = (e) => {
          e.stopPropagation();
          this.openHighlightPopover(hl, e.clientX, e.clientY);
        };
      });
    },

    openHighlightPopover(hlSpan, clientX, clientY) {
      this.removeFloatingPopover();

      const popover = document.createElement('div');
      popover.id = 'active-highlight-popover';
      popover.className = 'highlight-popover';
      popover.style.left = `${clientX + 10}px`;
      popover.style.top = `${clientY - 40}px`;

      popover.innerHTML = `
        <span style="font-size:0.75rem; font-weight:700; color:var(--text-dim);">Cor:</span>
        <button class="color-dot-btn color-yellow" title="Amarelo"></button>
        <button class="color-dot-btn color-green" title="Verde"></button>
        <button class="btn btn-ghost btn-sm" id="btn-popover-remove" style="color:var(--color-danger); padding:2px 8px; font-size:0.75rem;">✕ Desgrifar</button>
      `;

      document.body.appendChild(popover);

      // Event: Change to yellow
      popover.querySelector('.color-yellow').onclick = (e) => {
        e.stopPropagation();
        hlSpan.className = 'stem-highlight hl-yellow';
        hlSpan.setAttribute('data-color', 'yellow');
        this.saveCurrentStemHighlights();
        this.removeFloatingPopover();
      };

      // Event: Change to green
      popover.querySelector('.color-green').onclick = (e) => {
        e.stopPropagation();
        hlSpan.className = 'stem-highlight hl-green';
        hlSpan.setAttribute('data-color', 'green');
        this.saveCurrentStemHighlights();
        this.removeFloatingPopover();
      };

      // Event: Remove highlight
      popover.querySelector('#btn-popover-remove').onclick = (e) => {
        e.stopPropagation();
        const parent = hlSpan.parentNode;
        while (hlSpan.firstChild) {
          parent.insertBefore(hlSpan.firstChild, hlSpan);
        }
        parent.removeChild(hlSpan);
        this.saveCurrentStemHighlights();
        this.removeFloatingPopover();
      };
    },

    removeFloatingPopover() {
      const existing = document.getElementById('active-highlight-popover');
      if (existing) existing.remove();
    },

    /* ===================================================================
       7. PAINEL DE RESULTADOS FINAL (SCOREBOARD)
       =================================================================== */
    openScoreboard() {
      const modal = document.getElementById('exam-scoreboard-modal');
      if (!modal || !this.activeExam) return;

      const questions = this.activeExam.questions;
      const total = questions.length;
      const confirmedAnswers = Object.values(this.examState.answers).filter(a => a.confirmed);
      const answeredCount = confirmedAnswers.length;
      const correctCount = confirmedAnswers.filter(a => a.isCorrect).length;
      const pct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

      // Values
      document.getElementById('scoreboard-pct').textContent = `${pct}%`;
      document.getElementById('scoreboard-fraction').textContent = `${correctCount} acertos de ${total} questões`;

      // SVG circle circumference: r=70 -> 2 * PI * 70 ≈ 440
      const circleProgress = document.getElementById('scoreboard-circle-progress');
      if (circleProgress) {
        const offset = 440 - (440 * pct) / 100;
        circleProgress.style.strokeDashoffset = offset;
        circleProgress.style.stroke = pct >= 80 ? 'var(--color-success)' : pct >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
      }

      // Parecer Pedagógico Customizado
      const titlePedagogic = document.getElementById('pedagogic-title');
      const descPedagogic = document.getElementById('pedagogic-desc');

      if (pct >= 85) {
        titlePedagogic.textContent = '🌟 Desempenho de Elite (Nível R1 / ENAMED Top 5%)';
        descPedagogic.textContent = 'Você demonstrou domínio psicométrico avançado, neutralizando os distratores de micro-inversão e salto de etapa. Está pronto para gabaritar este tema nas provas de residência!';
      } else if (pct >= 70) {
        titlePedagogic.textContent = '👍 Desempenho Sólido e Competitivo';
        descPedagogic.textContent = 'Excelente domínio dos fundamentos clínicos. Para alcançar o patamar de excelência, revise a análise cirúrgica das questões que errou para blindar as pegadinhas de cronologia e dosagem.';
      } else if (pct >= 50) {
        titlePedagogic.textContent = '⚠️ Desempenho Intermediário';
        descPedagogic.textContent = 'Você fixou a base, mas caiu em armadilhas de mimetismo clínico ou diretrizes do SUS. Recomendamos reler o Resumo Detalhado e consultar os Mapas Comparativos em SVG antes de refazer.';
      } else {
        titlePedagogic.textContent = '🚨 Atenção Prioritária Necessária';
        descPedagogic.textContent = 'Taxa de retenção abaixo do esperado. Não desanime: retorne à aba de Resumos Detalhados (.md), estude os esquemas fisiopatológicos e refaça o simulado em seguida.';
      }

      // Grade de Revisão Rápida (1-clique)
      const reviewGrid = document.getElementById('scoreboard-review-grid');
      if (reviewGrid) {
        reviewGrid.innerHTML = questions.map((q, idx) => {
          const ans = this.examState.answers[q.id];
          const isAnswered = ans && ans.confirmed;
          const isCorrect = isAnswered && ans.isCorrect;
          const statusClass = !isAnswered ? '' : isCorrect ? 'cell-correct' : 'cell-incorrect';

          return `
            <div class="review-cell ${statusClass}" data-index="${idx}" title="Questão ${idx + 1}: ${!isAnswered ? 'Pendente' : isCorrect ? 'Correta' : 'Incorreta'}">
              ${idx + 1}
            </div>
          `;
        }).join('');

        reviewGrid.querySelectorAll('.review-cell').forEach(cell => {
          cell.addEventListener('click', (e) => {
            const idx = parseInt(cell.getAttribute('data-index'), 10);
            this.closeScoreboard();
            this.navigateToQuestion(idx);
          });
        });
      }

      modal.classList.add('active');
    },

    closeScoreboard() {
      const modal = document.getElementById('exam-scoreboard-modal');
      if (modal) modal.classList.remove('active');
    },

    /* ===================================================================
       8. IMPORTADOR DE SIMULADOS JSON
       =================================================================== */
    importExamJson(jsonString, targetFolder = null) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.id || !parsed.title || !Array.isArray(parsed.questions)) {
          return { success: false, message: 'Estrutura JSON inválida. O simulado precisa conter id, title e array de questions.' };
        }

        if (targetFolder) {
          parsed.folder = targetFolder;
        } else if (!parsed.folder) {
          parsed.folder = this.activeFolder || 'UCT20 CAB';
        }

        const customRaw = localStorage.getItem(STORAGE_CUSTOM_EXAMS_KEY);
        let customExams = customRaw ? JSON.parse(customRaw) : [];

        // Replace if exists or append
        const existingIdx = customExams.findIndex(e => e.id === parsed.id);
        if (existingIdx !== -1) {
          customExams[existingIdx] = parsed;
        } else {
          customExams.push(parsed);
        }

        localStorage.setItem(STORAGE_CUSTOM_EXAMS_KEY, JSON.stringify(customExams));
        this.refreshExamsList(window.MED_SIMULADOS || []);
        if (parsed.folder) {
          this.setFolder(parsed.folder);
        }
        if (window.MedSupabase && typeof window.MedSupabase.saveSharedExam === 'function') {
          window.MedSupabase.saveSharedExam(parsed, this.getCurrentUsername()).catch(e => {
            console.warn('[SimuladoEngine] Falha ao compartilhar exame na nuvem:', e);
          });
        }
        return { success: true, exam: parsed };
      } catch (err) {
        return { success: false, message: `Erro ao analisar JSON: ${err.message}` };
      }
    },

    /* ===================================================================
       9. EVENTOS GLOBAIS
       =================================================================== */
    bindGlobalEvents() {
      // Highlighter toggle & colors
      const btnToggleHl = document.getElementById('btn-toggle-highlighter');
      const dotYellow = document.getElementById('color-dot-yellow');
      const dotGreen = document.getElementById('color-dot-green');
      const btnClearHl = document.getElementById('btn-clear-highlights');

      if (btnToggleHl) btnToggleHl.onclick = () => this.toggleHighlighter();
      if (dotYellow) dotYellow.onclick = () => this.setHighlightColor('yellow');
      if (dotGreen) dotGreen.onclick = () => this.setHighlightColor('green');
      if (btnClearHl) btnClearHl.onclick = () => this.clearCurrentHighlights();

      // Selection event for highlighting inside stem
      const stemContainer = document.getElementById('q-stem-container');
      if (stemContainer) {
        stemContainer.addEventListener('mouseup', () => {
          this.applyHighlightToSelection();
        });
      }

      // Close popover when clicking anywhere else
      document.addEventListener('click', (e) => {
        if (!e.target.closest('#active-highlight-popover') && !e.target.closest('.stem-highlight')) {
          this.removeFloatingPopover();
        }
      });

      // Actions in question runner
      const btnConfirm = document.getElementById('btn-confirm-answer');
      const btnPrev = document.getElementById('btn-prev-question');
      const btnNext = document.getElementById('btn-next-question');
      const btnRestart = document.getElementById('btn-restart-exam');
      const btnBackCatalog = document.getElementById('btn-back-to-catalog');
      const btnScoreboard = document.getElementById('btn-view-scoreboard');
      const btnCloseScoreboard = document.getElementById('btn-close-scoreboard');
      const btnScoreboardRestart = document.getElementById('btn-scoreboard-restart');

      if (btnConfirm) btnConfirm.onclick = () => this.confirmCurrentAnswer();
      if (btnPrev) btnPrev.onclick = () => this.navigateToQuestion(this.currentQuestionIndex - 1);
      if (btnNext) btnNext.onclick = () => this.navigateToQuestion(this.currentQuestionIndex + 1);
      if (btnRestart) btnRestart.onclick = () => this.restartExam();
      if (btnBackCatalog) btnBackCatalog.onclick = () => this.closeRunner();
      if (btnScoreboard) btnScoreboard.onclick = () => this.openScoreboard();
      if (btnCloseScoreboard) btnCloseScoreboard.onclick = () => this.closeScoreboard();
      if (btnScoreboardRestart) {
        btnScoreboardRestart.onclick = () => {
          this.closeScoreboard();
          this.restartExam();
        };
      }
    }
  };

  window.SimuladoEngine = SimuladoEngine;
})(window);
