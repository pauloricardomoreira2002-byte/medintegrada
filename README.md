# 🩺 MedIntegrada • Plataforma de Estudos Médicos (UCT20 - 7º Período)

Bem-vindo à **MedIntegrada**, a plataforma web acadêmica desenvolvida para centralizar, estruturar e potencializar o estudo de Medicina (Clínica Médica e Reumatologia), integrando **Resumos Teóricos Detalhados (.md)**, **Mapas Conceituais e Esquemas Vetoriais (SVG)** e **Simulados Psicométricos Comentados no Padrão ENAMED/INEP**.

---

## 🔑 1. Credenciais de Acesso Inicial

A plataforma conta com controle de acesso por perfis e persistência em `localStorage`:

| Perfil | Usuário | Senha Padrão | Descrição de Permissões |
| :--- | :--- | :--- | :--- |
| **👑 Administrador Geral** | `admin` | `admin123` | Acesso irrestrito a todos os materiais + Painel de Gestão de Usuários (cadastrar alunos, alterar senhas, copiar acessos) |
| **🎓 Estudante Padrão** | `aluno` | `aluno123` | Acesso de estudo aos Resumos Detalhados, Mapas em SVG e Simulados interativos |

> [!TIP]
> **Atalhos Rápidos na Tela de Login:** Há dois botões de 1 clique (*"Entrar como Admin"* e *"Entrar como Aluno"*) para facilitar seus testes e alternâncias rápidas de perfil.

---

## 👥 2. Gestão de Alunos pelo Administrador

Como administrador da turma, você possui controle total sobre a liberação de contas:

1. Faça login com o usuário **`admin`** e senha **`admin123`**.
2. Na barra superior de navegação, acerte a aba **`Gestão de Usuários`** *(visível apenas para administradores)*.
3. No formulário **"Liberar Novo Acesso para Estudante"**:
   - Informe o **Nome Completo** do aluno.
   - Defina o **Nome de Usuário (Login)** (ex: `mariana.silva`).
   - Digite uma senha ou clique no atalho **`⚡ Gerar Sugestão`** para criar uma senha médica amigável e segura (ex: `Med2026!`).
   - Clique em **Cadastrar e Liberar**.
4. **Enviar para o Aluno via WhatsApp em 1 Clique:**
   - Na tabela de estudantes, clique no botão **`📋 Copiar Acesso`**.
   - O sistema copia uma mensagem pronta e personalizada com emojis, nome, login e senha diretamente para o seu clipboard. Basta colar no WhatsApp ou Telegram do estudante!
5. **Bloqueio e Exclusão:**
   - É possível bloquear/desbloquear temporariamente um aluno ou excluir a conta quando necessário.

---

## 📚 3. Estrutura dos Módulos Integrados

### 📖 Aba 1: Resumos Detalhados (.md)
- Guias completos de estudo das disciplinas (Artrite Reumatoide, Gota e Hiperuricemia, Lúpus Eritematoso Sistêmico, Mieloma Múltiplo, Osteomielite e Artrite Séptica).
- **Leitor Imersivo em Markdown:** Leitura com tipografia refinada, índice lateral dinâmico para saltar entre seções, caixas de destaque pedagógico (*Foco de Prova / Alerta Crítico*, *Pegadinha de Banca*, *Conceito-Chave*).
- **Downloads e Cópia:** Botões para copiar o Markdown completo, baixar o arquivo `.md` ou baixar a versão oficial em Word (`.docx`).

### 🗺️ Aba 2: Mapas Panorâmicos Comparativos (SVG)
Focado exclusivamente nos grandes painéis comparativos de alta resolução vetorial (1920px) para raciocínio clínico diferencial:
- **Mapa 1: Aparelho Locomotor (1920 × 2756 px):** Quadro sinóptico completo confrontando Artrite Reumatoide, Gota, Lúpus, Mieloma Múltiplo e Infecções Osteoarticulares (fisiopatologia, clínica diferencial, raio-X e metas terapêuticas).
- **Mapa 2: Mieloma Múltiplo vs Lúpus Eritematoso Sistêmico (1920 × 2541 px):** Confronto discriminador fino entre proliferação plasmocitária clonal e autoimunidade lúpica (critérios CRAB vs EULAR/ACR 2019, nefropatia por cilindros vs nefrite lúpica membranoproliferativa e eletroforese de proteínas).
- **Recursos Interativos:** Visualizador HD com zoom até 450% sem perda de nitidez, arraste (pan) com o mouse, abertura independente em nova aba e download direto em `.svg`.

### 📝 Aba 3: Simulados & Banco de Questões (ENAMED)
Todos os recursos técnicos psicométricos obrigatórios implementados com perfeição:
- **Cabeçalho Inteligente:** Título, subtítulo, badge temático, indicador de salvamento automático em `localStorage` (pulse verde), botão discreto de **"🔄 Reiniciar Simulado"** com confirmação e contador dinâmico de acertos.
- **Barra de Progresso & Pílulas de Navegação (1 a N):** Estados visuais claros: *pendente* (cinza), *ativa* (anel azul brilhante), *correta* (verde com check) e *incorreta* (vermelho com X).
- **Grifo Interativo no Enunciado:**
  - Botão de habilitar/desabilitar grifo com indicador de estado.
  - **Permanece ativo quando o aluno navega entre as questões.**
  - 2 cores de marca-texto: 🟡 Amarelo Flúor e 🟢 Verde Neon.
  - Clicar em qualquer grifo existente abre uma barra flutuante para trocar a cor ou remover o destaque (*✕ Desgrifar*).
  - Botão **`🧹 Limpar Grifos`** aparece no topo da questão sempre que houver destaques ativos.
  - Grifos persistidos individualmente por questão no navegador.
- **Alternativas com Botão de Riscar / Eliminar (`btn-strike`):**
  - Cada alternativa possui no canto direito um botão tachado (`btn-strike`).
  - Ao clicar, a alternativa é riscada (`line-through`) e atenuada, facilitando a eliminação de distratores.
  - Se a alternativa estava selecionada, ela é automaticamente desselecionada.
  - Clicar no texto da alternativa restaura o estado normal e a seleciona.
  - Suporte completo a 4 opções (A-D) ou 5 opções (A-E).
- **Botão "Confirmar Resposta":** Habilitado apenas após selecionar uma alternativa válida (não riscada).
- **Feedback Imediato (Caixa Expansível):** Banner colorido de acerto/erro informando o gabarito oficial, Fundamentação Teórica, Análise Cirúrgica dos Distratores (com indicação do vetor cognitivo da armadilha) e Pérola de Prova dourada.
- **Painel de Resultados Final (*Scoreboard*):** Medidor circular com porcentagem e acertos, parecer pedagógico customizado conforme a faixa de nota e grade de revisão rápida de 1 clique para saltar a qualquer questão.

---

## 🤖 4. Geração de Novos Simulados por IA com a Skill Dedicada

Para criar novas questões e simulados no futuro, foi desenvolvida a skill personalizada:
`/med-site-exam-crafter` (localizada em `C:\Users\Paulo\.gemini\config\skills\med-site-exam-crafter\SKILL.md`).

### Como Usar a IA para Gerar Novos Simulados:
No chat com o assistente, execute ou solicite:
> *"Gere um simulado com 20 questões sobre Cardiologia (Insuficiência Cardíaca) usando a skill /med-site-exam-crafter"*

A IA gerará o arquivo estruturado em JSON com:
- Distribuição anti-bias balanceada (25% A, 25% B, 25% C, 25% D).
- Os 6 vetores de distratores de elite.
- Enunciados com dados vitais em negrito (`<strong>...</strong>`).

### Como Inserir o Novo Simulado na Plataforma:

#### Método A: Pelo Próprio Navegador (Sem Código)
1. Abra a plataforma MedIntegrada e vá até a aba **Simulados & Questões**.
2. Clique no botão **`📥 Importar Simulado (JSON)`** no canto superior direito.
3. Cole o JSON gerado ou selecione o arquivo `.json`.
4. Clique em **Salvar e Carregar Simulado**. O simulado fica salvo imediatamente no seu navegador!

#### Método B: Adição Permanente no Código do Projeto
1. Salve o arquivo na pasta do projeto:
   `g:\Meu Drive\Aplicativo Medicina Integrada\data\simulados\simulado_<tema>.json`
2. No terminal, execute:
   ```bash
   python scripts/register_exam.py
   ```
3. O script reindexará e atualizará o arquivo `js/data.js` automaticamente.

---

## 🚀 5. Como Executar a Plataforma

- **Acesso Direto (Offline):** Abra o arquivo [`index.html`](file:///g:/Meu%20Drive/Aplicativo%20Medicina%20Integrada/index.html) com 2 cliques em qualquer navegador (Edge, Chrome, Firefox, Brave). Funciona 100% offline, sem necessidade de internet ou dependências.
- **Servidor Local (Opcional):**
  ```bash
  python -m http.server 8080
  ```
  Acesse em seu navegador: `http://localhost:8080`.
