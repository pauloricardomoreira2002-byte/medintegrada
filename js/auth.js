/**
 * MEDINTEGRADA - MÓDULO DE AUTENTICAÇÃO E GESTÃO DE USUÁRIOS
 * Sincronização em nuvem via Supabase com cache resiliente em localStorage
 */

(function(window) {
  'use strict';

  const STORAGE_USERS_KEY = 'med_users_db_v1';
  const STORAGE_SESSION_KEY = 'med_current_session_v1';

  // Contas padrão de fábrica
  const DEFAULT_USERS = [
    {
      name: 'Dr. Paulo (Administrador)',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      createdAt: '2026-10-20',
      active: true
    },
    {
      name: 'Estudante UCT20',
      username: 'aluno',
      password: 'aluno123',
      role: 'student',
      createdAt: '2026-10-20',
      active: true
    }
  ];

  function initUsersDatabase() {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  }

  const AuthManager = {
    init() {
      initUsersDatabase();
      this.syncUsersFromCloud();
    },

    async syncUsersFromCloud() {
      if (window.MedSupabase && typeof window.MedSupabase.fetchUsers === 'function') {
        try {
          const cloudUsers = await window.MedSupabase.fetchUsers();
          if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
            const localUsers = initUsersDatabase();
            const merged = [...localUsers];

            cloudUsers.forEach(cu => {
              const idx = merged.findIndex(lu => lu.username.toLowerCase() === cu.username.toLowerCase());
              const userObj = {
                name: cu.name,
                username: cu.username,
                password: cu.password,
                role: cu.role,
                createdAt: (cu.created_at || '').split('T')[0] || '2026-10-20',
                active: cu.active
              };
              if (idx >= 0) {
                merged[idx] = userObj;
              } else {
                merged.push(userObj);
              }
            });

            saveUsers(merged);
            if (window.App && typeof window.App.renderAdminUsersTable === 'function') {
              window.App.renderAdminUsersTable();
              window.App.renderAdminStats();
            }
          }
        } catch (e) {
          console.warn('[AuthManager] Falha silenciosa ao sincronizar usuários da nuvem:', e);
        }
      }
    },

    getCurrentUser() {
      const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    isAdmin() {
      const user = this.getCurrentUser();
      return user && user.role === 'admin';
    },

    login(username, password, rememberMe = true) {
      const users = initUsersDatabase();
      const cleanUser = username.trim().toLowerCase();
      const found = users.find(u => u.username.toLowerCase() === cleanUser);

      if (!found) {
        return { success: false, message: 'Usuário não cadastrado. Solicite seu acesso ao administrador.' };
      }

      if (!found.active) {
        return { success: false, message: 'Acesso temporariamente bloqueado. Contate o administrador.' };
      }

      if (found.password !== password) {
        return { success: false, message: 'Senha incorreta. Verifique os dados fornecidos.' };
      }

      const sessionObj = {
        name: found.name,
        username: found.username,
        role: found.role,
        loginAt: new Date().toISOString()
      };

      if (rememberMe) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionObj));
      } else {
        sessionStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(sessionObj));
      }

      return { success: true, user: sessionObj };
    },

    logout() {
      localStorage.removeItem(STORAGE_SESSION_KEY);
      sessionStorage.removeItem(STORAGE_SESSION_KEY);
    },

    getUsers() {
      return initUsersDatabase();
    },

    addUser(name, username, password) {
      const users = initUsersDatabase();
      const cleanLogin = username.trim().toLowerCase();

      if (!name.trim() || !cleanLogin || !password.trim()) {
        return { success: false, message: 'Preencha todos os campos obrigatórios.' };
      }

      if (users.some(u => u.username.toLowerCase() === cleanLogin)) {
        return { success: false, message: 'Este nome de usuário já está cadastrado.' };
      }

      const newUser = {
        name: name.trim(),
        username: cleanLogin,
        password: password.trim(),
        role: 'student',
        createdAt: new Date().toISOString().split('T')[0],
        active: true
      };

      users.push(newUser);
      saveUsers(users);

      // Sincronização assíncrona com Supabase
      if (window.MedSupabase && typeof window.MedSupabase.createUser === 'function') {
        window.MedSupabase.createUser(name, cleanLogin, password, 'student').catch(err => {
          console.warn('[AuthManager] Falha ao enviar novo usuário para Supabase:', err);
        });
      }

      return { success: true, user: newUser };
    },

    updatePassword(username, newPassword) {
      const users = initUsersDatabase();
      const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
      if (idx === -1) return { success: false, message: 'Usuário não encontrado.' };

      users[idx].password = newPassword.trim();
      saveUsers(users);

      // Sincronização com Supabase
      if (window.MedSupabase && typeof window.MedSupabase.updatePassword === 'function') {
        window.MedSupabase.updatePassword(username, newPassword).catch(err => {
          console.warn('[AuthManager] Falha ao atualizar senha no Supabase:', err);
        });
      }

      return { success: true };
    },

    toggleUserStatus(username) {
      const users = initUsersDatabase();
      const idx = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
      if (idx === -1) return { success: false, message: 'Usuário não encontrado.' };

      if (users[idx].role === 'admin') {
        return { success: false, message: 'Não é permitido desativar a conta do administrador principal.' };
      }

      users[idx].active = !users[idx].active;
      saveUsers(users);

      // Sincronização com Supabase
      if (window.MedSupabase && typeof window.MedSupabase.updateUserStatus === 'function') {
        window.MedSupabase.updateUserStatus(username, users[idx].active).catch(err => {
          console.warn('[AuthManager] Falha ao alterar status no Supabase:', err);
        });
      }

      return { success: true, active: users[idx].active };
    },

    deleteUser(username) {
      const users = initUsersDatabase();
      if (username.toLowerCase() === 'admin') {
        return { success: false, message: 'Não é possível excluir o administrador geral.' };
      }

      const filtered = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
      saveUsers(filtered);

      if (window.SimuladoEngine && typeof window.SimuladoEngine.cleanUserExamData === 'function') {
        window.SimuladoEngine.cleanUserExamData(username);
      }

      // Sincronização com Supabase
      if (window.MedSupabase && typeof window.MedSupabase.deleteUser === 'function') {
        window.MedSupabase.deleteUser(username).catch(err => {
          console.warn('[AuthManager] Falha ao excluir usuário no Supabase:', err);
        });
      }

      return { success: true };
    },

    generateSuggestedPassword() {
      const prefixes = ['Med', 'Clinica', 'UCT20', 'Doctor', 'Neuro', 'Reumato', 'Cardio'];
      const suffixes = ['2026!', '#2026', '7Per!', 'App#26', '@Top'];
      const p = prefixes[Math.floor(Math.random() * prefixes.length)];
      const s = suffixes[Math.floor(Math.random() * suffixes.length)];
      return `${p}${s}`;
    },

    formatWhatsAppMessage(user) {
      return `🩺 *Acesso Liberado • MedIntegrada (UCT20)*\n\nOlá, *${user.name}*!\nSeu acesso à plataforma de estudos de Medicina está pronto.\n\n👤 *Usuário:* \`${user.username}\`\n🔑 *Senha:* \`${user.password}\`\n\nBons estudos nos resumos, mapas e simulados!`;
    }
  };

  window.AuthManager = AuthManager;
})(window);
