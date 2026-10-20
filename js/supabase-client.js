/**
 * MEDINTEGRADA - CLIENTE SUPABASE & SINCRONIZAÇÃO EM NUVEM
 * Comunicação direta com banco de dados PostgreSQL (Supabase)
 * com fallback transparente e resiliente para localStorage offline.
 */

(function(window) {
  'use strict';

  const SUPABASE_URL = 'https://lllfkqfeffsqpyxvdhst.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_XpdejS2UDzbUEhlDc01OnA_h3t3MGrb';

  const MedSupabase = {
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    online: true,

    getHeaders() {
      return {
        'apikey': this.key,
        'Authorization': `Bearer ${this.key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };
    },

    async _fetch(endpoint, options = {}) {
      try {
        const url = `${this.url}/rest/v1/${endpoint}`;
        const headers = { ...this.getHeaders(), ...(options.headers || {}) };
        const res = await fetch(url, { ...options, headers });
        if (!res.ok) {
          const errText = await res.text();
          console.warn(`[MedSupabase] ${options.method || 'GET'} ${endpoint} retornou ${res.status}:`, errText);
          return { ok: false, status: res.status, error: errText };
        }
        const data = await res.json().catch(() => null);
        this.online = true;
        return { ok: true, data };
      } catch (err) {
        console.warn(`[MedSupabase] Erro de rede ou offline em ${endpoint}:`, err.message);
        this.online = false;
        return { ok: false, error: err.message, isNetworkError: true };
      }
    },

    /* ===================================================================
       1. GESTÃO DE USUÁRIOS E PERFIS (PROFILES)
       =================================================================== */
    async fetchUsers() {
      const res = await this._fetch('profiles?select=*&order=created_at.asc');
      if (res.ok && Array.isArray(res.data)) {
        return res.data;
      }
      return null;
    },

    async authenticateUser(username, password) {
      const cleanUser = username.trim().toLowerCase();
      const res = await this._fetch(`profiles?username=eq.${encodeURIComponent(cleanUser)}&limit=1`);
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        const profile = res.data[0];
        if (!profile.active) {
          return { success: false, message: 'Acesso temporariamente bloqueado. Contate o administrador.' };
        }
        if (profile.password !== password) {
          return { success: false, message: 'Senha incorreta. Verifique os dados fornecidos.' };
        }
        return { success: true, user: profile };
      }
      return null; // Null indica que deve consultar fallback ou não encontrou
    },

    async createUser(name, username, password, role = 'student') {
      const cleanUser = username.trim().toLowerCase();
      const payload = {
        name: name.trim(),
        username: cleanUser,
        password: password.trim(),
        role: role,
        active: true
      };

      const res = await this._fetch('profiles', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok && res.data) {
        return { success: true, user: Array.isArray(res.data) ? res.data[0] : payload };
      }
      return { success: false, error: res.error };
    },

    async updateUserStatus(username, active) {
      const cleanUser = username.trim().toLowerCase();
      const res = await this._fetch(`profiles?username=eq.${encodeURIComponent(cleanUser)}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: active, updated_at: new Date().toISOString() })
      });
      return res.ok;
    },

    async updatePassword(username, newPassword) {
      const cleanUser = username.trim().toLowerCase();
      const res = await this._fetch(`profiles?username=eq.${encodeURIComponent(cleanUser)}`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPassword.trim(), updated_at: new Date().toISOString() })
      });
      return res.ok;
    },

    async deleteUser(username) {
      const cleanUser = username.trim().toLowerCase();
      const res = await this._fetch(`profiles?username=eq.${encodeURIComponent(cleanUser)}`, {
        method: 'DELETE'
      });
      return res.ok;
    },

    /* ===================================================================
       2. PROGRESSO DE SIMULADOS (EXAM PROGRESS & QUESTION ANSWERS)
       =================================================================== */
    async loadExamState(username, examId) {
      const cleanUser = (username || 'guest').trim().toLowerCase();
      
      // 1. Buscar resumo geral do exame
      const progressRes = await this._fetch(
        `exam_progress?username=eq.${encodeURIComponent(cleanUser)}&exam_id=eq.${encodeURIComponent(examId)}&limit=1`
      );

      // 2. Buscar respostas detalhadas de cada questão
      const answersRes = await this._fetch(
        `question_answers?username=eq.${encodeURIComponent(cleanUser)}&exam_id=eq.${encodeURIComponent(examId)}`
      );

      if (progressRes.ok && progressRes.data && progressRes.data.length > 0) {
        const prog = progressRes.data[0];
        const answersMap = {};
        const strikesMap = {};
        const highlightsMap = {};

        if (answersRes.ok && Array.isArray(answersRes.data)) {
          answersRes.data.forEach(row => {
            const qId = row.question_id;
            if (row.selected_option || row.confirmed) {
              answersMap[qId] = {
                selected: row.selected_option,
                confirmed: row.confirmed,
                isCorrect: row.is_correct
              };
            }
            if (Array.isArray(row.strikes) && row.strikes.length > 0) {
              strikesMap[qId] = row.strikes;
            }
            if (row.highlights) {
              highlightsMap[qId] = row.highlights;
            }
          });
        }

        return {
          currentIndex: prog.current_index || 0,
          answers: answersMap,
          strikes: strikesMap,
          highlights: highlightsMap,
          score: prog.score || 0,
          totalAnswered: prog.total_answered || 0
        };
      }

      return null;
    },

    async saveExamState(username, examId, state, folder = 'UCT20 CAB') {
      const cleanUser = (username || 'guest').trim().toLowerCase();
      if (cleanUser === 'guest') return;

      const progressPayload = {
        username: cleanUser,
        exam_id: examId,
        folder: folder,
        current_index: state.currentIndex || 0,
        score: state.score || 0,
        total_answered: state.totalAnswered || 0,
        completed: (state.totalAnswered > 0 && state.score > 0),
        updated_at: new Date().toISOString()
      };

      // 1. Upsert exam_progress via POST com Prefer: resolution=merge-duplicates
      fetch(`${this.url}/rest/v1/exam_progress`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(progressPayload)
      }).catch(e => console.warn('[MedSupabase] Erro ao sincronizar exam_progress:', e));

      // 2. Upsert question_answers das questões respondidas/modificadas
      const answersRows = [];
      const allQIds = new Set([
        ...Object.keys(state.answers || {}),
        ...Object.keys(state.strikes || {}),
        ...Object.keys(state.highlights || {})
      ]);

      allQIds.forEach(qId => {
        const a = (state.answers && state.answers[qId]) || {};
        const s = (state.strikes && state.strikes[qId]) || [];
        const h = (state.highlights && state.highlights[qId]) || null;

        answersRows.push({
          username: cleanUser,
          exam_id: examId,
          question_id: String(qId),
          selected_option: a.selected || null,
          is_correct: !!a.isCorrect,
          confirmed: !!a.confirmed,
          strikes: s,
          highlights: h,
          answered_at: new Date().toISOString()
        });
      });

      if (answersRows.length > 0) {
        fetch(`${this.url}/rest/v1/question_answers`, {
          method: 'POST',
          headers: {
            ...this.getHeaders(),
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(answersRows)
        }).catch(e => console.warn('[MedSupabase] Erro ao sincronizar question_answers:', e));
      }
    },

    /* ===================================================================
       3. PREFERÊNCIAS INDIVIDUAIS DE ESTUDO
       =================================================================== */
    async loadUserPreferences(username) {
      const cleanUser = (username || '').trim().toLowerCase();
      if (!cleanUser || cleanUser === 'guest') return null;

      const res = await this._fetch(`user_preferences?username=eq.${encodeURIComponent(cleanUser)}&limit=1`);
      if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
        return res.data[0];
      }
      return null;
    },

    async saveUserPreferences(username, prefs) {
      const cleanUser = (username || '').trim().toLowerCase();
      if (!cleanUser || cleanUser === 'guest') return;

      const payload = {
        username: cleanUser,
        highlighter_enabled: prefs.highlighterEnabled ?? true,
        highlighter_color: prefs.activeHighlightColor || 'yellow',
        theme: prefs.theme || 'dark',
        updated_at: new Date().toISOString()
      };

      fetch(`${this.url}/rest/v1/user_preferences`, {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      }).catch(e => console.warn('[MedSupabase] Erro ao salvar preferências:', e));
    },

    /* ===================================================================
       4. SIMULADOS COMPARTILHADOS (SHARED EXAMS)
       =================================================================== */
    async fetchSharedExams() {
      const res = await this._fetch('shared_exams?select=*&order=created_at.desc');
      if (res.ok && Array.isArray(res.data)) {
        return res.data;
      }
      return null;
    },

    async saveSharedExam(exam, createdBy = 'admin') {
      const payload = {
        id: exam.id,
        title: exam.title,
        subtitle: exam.subtitle || '',
        badge: exam.badge || 'ENAMED / Residência Médica',
        theme: exam.theme || 'Clínica Médica',
        folder: exam.folder || 'UCT20 CAB',
        questions: exam.questions || [],
        created_by: createdBy
      };

      const res = await this._fetch('shared_exams', {
        method: 'POST',
        headers: {
          ...this.getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(payload)
      });
      return res.ok;
    }
  };

  window.MedSupabase = MedSupabase;
})(window);
