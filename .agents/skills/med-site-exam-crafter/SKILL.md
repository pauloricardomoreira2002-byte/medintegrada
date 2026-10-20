---
name: med-site-exam-crafter
description: >-
  Elabora questões médicas de alto nível psicométrico (padrão ENAMED/INEP, Revalida, ENARE e Residência Médica)
  e as insere automaticamente na plataforma MedIntegrada: aplica anti-bias rigoroso (25% por alternativa, máx. 2 consecutivas),
  os 6 vetores de distratores de elite, formatação com dados vitais em negrito para grifo interativo, salva o JSON na pasta do
  projeto (UCT20 CAB ou UCT20 Tutoria) e reindexa o site instantaneamente via script de registro. Suporta também adição, edição
  e balanceamento de questões em simulados já existentes.
---

# MedSite Exam Crafter • Elaborador & Injetor Psicométrico Automático

Esta skill é a ferramenta oficial do projeto **MedIntegrada** para conceber, formatar, validar e **inserir automaticamente** simulados e bancos de questões médicas diretamente na aplicação web, sem exigir nenhuma etapa manual de copiar/colar por parte do usuário.

Ela combina **engenharia psicométrica avançada de bancas médicas (INEP/ENAMED/Revalida/Residência)** com **automação direta de banco de dados (`data/simulados/` e `js/data.js`)**.

---

## 1. Quando Ativar Esta Skill

Ative esta skill sempre que o usuário:
1. **Pedir para criar um simulado ou questões sobre qualquer tema médico** (ex.: *"Gere um simulado com 20 questões sobre Insuficiência Cardíaca"* ou *"Crie 10 questões de trauma para a UCT20 CAB"*).
2. **Pedir para adicionar mais questões a um simulado existente** na plataforma (ex.: *"Adicione mais 5 questões sobre crise gotosa ao simulado de Gota"*).
3. **Solicitar alterações ou correções em questões existentes** (ex.: *"Corrija o gabarito da questão 12 de Artrite Reumatoide"*, *"Altere o distrator B da questão 4"*).
4. **Pedir para auditar ou rebalancear o gabarito (Anti-Bias)** de qualquer simulado da plataforma.

---

## 2. O Fluxo de Execução 100% Autônomo no Projeto

Diferente de geradores genéricos de texto, esta skill executa todo o ciclo operacional no workspace:

```
[Solicitação do Usuário]
         │
         ├── 1. Engenharia Psicométrica: Elabora questões no padrão ENAMED/INEP
         │    - Vinhetas clínicas realistas e ricas
         │    - Dados objetivos em negrito (<strong>...</strong>) para Grifo Interativo
         │    - Matriz dos 6 Vetores de Distratores de Elite
         │    - Anti-Bias: distribuição balanceada (25% A, 25% B, 25% C, 25% D)
         │
         ├── 2. Gravação Direta no Disco:
         │    - Salva em data/simulados/<pasta>/simulado_<tema>.json
         │    - Pastas suportadas: "UCT20 CAB" (padrão) ou "UCT20 Tutoria"
         │
         ├── 3. Validação & Injeção Automática no Aplicativo:
         │    - Executa: python .agents/skills/med-site-exam-crafter/scripts/manage_exam.py install <caminho.json> <pasta>
         │    - Recompila automaticamente js/data.js via scripts/register_exam.py
         │
         └── 4. Retorno ao Usuário:
              - Notifica que o simulado já está disponível no site
              - Exibe sumário da prova, distribuição do gabarito e destaque de pérolas
```

---

## 3. Os 4 Pilares Psicométricos Obrigatórios (Padrão ENAMED/INEP)

Toda questão gerada deve obedecer rigorosamente a 4 regras estruturais:

### 1. Vinheta Clínica Enriquecida (Contexto Realista)
- Idade, sexo, profissão/contexto socioeconômico e nível de atenção explicitado (UBS, UPA, Emergência Hospitalar, UTI, Ambulatório Especializado, CAPS).
- Cronologia precisa da queixa (*"início há 2 horas"*, *"febre há 5 dias"*, *"evolução de 3 meses"*).
- **Formatação Mandatória para Grifo Interativo:** Todo dado objetivo vital DEVE ser envolvido na tag `<strong>...</strong>`. Isso permite que o estudante utilize o marca-texto dinâmico da plataforma sobre os dados relevantes:
  - Sinais vitais numéricos: `<strong>PA 160x100 mmHg</strong>`, `<strong>FC 114 bpm</strong>`, `<strong>FR 26 irpm</strong>`, `<strong>SatO₂ 88% em ar ambiente</strong>`, `<strong>Tax 38,9 ºC</strong>`.
  - Achados físicos chave: `<strong>sopro telessistólico em foco mitral 3+/6+</strong>`, `<strong>desvio de rima para a esquerda</strong>`.
  - Exames complementares com valores: `<strong>creatinina de 3,2 mg/dL</strong>`, `<strong>leucocitose de 18.500/mm³ com 12% de bastões</strong>`, `<strong>elevação de troponina ultrassensível</strong>`.

### 2. Comando Direto, Positivo e Unívoco
- Uma ordem clínica clara e objetiva:
  - *"Qual é a conduta farmacológica imediata indicada?"*
  - *"Qual método diagnóstico confirma a principal hipótese clínica?"*
  - *"Qual alteração fisiopatológica justifica o quadro apresentado?"*

### 3. Isomorfismo e Paralelismo Sintático
- 4 alternativas (A, B, C, D) no padrão ENAMED/INEP ou 5 alternativas (A, B, C, D, E) no padrão Residência Médica.
- **Extensão visual equivalente** ($\pm 15\%$ de variação de palavras entre a menor e a maior alternativa).
- Mesma classe gramatical em todas as opções (todas começam por verbo no infinitivo ou todas são substantivos/sintagmas nominais).
- Sem pistas gramaticais ou termos absolutos (*"sempre"*, *"nunca"*, *"apenas"*), salvo quando estritamente previsto em texto legal.

### 4. Regra Mandatória Anti-Bias (Balanceamento do Gabarito)
- **Proibição Total de Concentração:** O gabarito oficial JAMAIS deve se concentrar em uma letra preferida.
- **Distribuição Uniforme:**
  - Em 4 alternativas: aproximadamente **25% A, 25% B, 25% C e 25% D** (ex.: em 20 questões = 5 A, 5 B, 5 C, 5 D; em 40 questões = 10 A, 10 B, 10 C, 10 D).
- **Repetição Máxima:** No máximo **2 questões consecutivas** podem ter a mesma letra de gabarito.

---

## 4. A Matriz dos 6 Vetores Cognitivos de Distratores de Elite

Cada alternativa incorreta deve incorporar um vetor pedagógico específico:

```
[Distrator de Elite]
      ├── Vetor 1: Micro-Inversão Conceitual (90% verdadeiro + 1 termo crítico invertido)
      ├── Vetor 2: Janela Biológica & Cronologia (exame/fármaco certo no tempo errado)
      ├── Vetor 3: Salto de Etapa & Precipitação (superintervenção antes do primeiro passo)
      ├── Vetor 4: Mimetismo Clínico / Síndrome Vizinha (diagnóstico diferencial fino)
      ├── Vetor 5: Protocolo Oficial SUS/PCDT vs Vício de Plantão (diretriz vs costume)
      └── Vetor 6: Permutação Ético-Legal e Sigilo (autonomia, menor de idade, denúncia)
```

- **Vetor 1 (Micro-Inversão):** Texto técnico e formal perfeito, com um detalhe invertido (*aferente* vs *eferente*; *hipercalcemia* vs *hipocalcemia*; *cadeia leve* vs *pesada*).
- **Vetor 2 (Janela Biológica):** Fármaco ou teste padrão-ouro, mas fora do tempo (*NS1* no D7 de dengue em vez de *IgM*; *trombolítico* após 4,5h de AVCi).
- **Vetor 3 (Salto de Etapa):** Pula a conduta imediata para propor conduta terciária/cirúrgica (*toracotomia de urgência* em vez de *drenagem em selo d'água*).
- **Vetor 4 (Mimetismo Clínico):** Doença que compartilha 80% do quadro mas é discriminada por um sinal específico da vinheta (*epiglotite* vs *laringite*; *artrite séptica* vs *gota*).
- **Vetor 5 (Diretriz vs Vício):** Explora condutas empíricas informais superadas pelas diretrizes (*oxigênio de rotina em IAM sem hipoxemia*; *antitérmico profilático em vacina*).
- **Vetor 6 (Ético-Legal):** Dilemas reais de confidencialidade, planejamento reprodutivo, notificação compulsória e autonomia do paciente menor de idade.

---

## 5. Estrutura Padrão do JSON do Simulado

Ao gerar o arquivo, utilize rigorosamente a estrutura esperada pelo motor [`simulado-engine.js`](file:///g:/Meu%20Drive/Aplicativo%20Medicina%20Integrada/js/simulado-engine.js):

```json
{
  "id": "simulado_<tema_sem_acentos>",
  "title": "<Título do Tema>",
  "subtitle": "<Subtítulo informativo>",
  "badge": "ENAMED / Residência Médica • Nível Avançado",
  "folder": "UCT20 CAB",
  "theme": "<Tema Principal>",
  "area": "Clínica Médica • <Especialidade>",
  "total_questions": 20,
  "questions": [
    {
      "id": 1,
      "tag": "Clínica Médica • <Subtópico>",
      "stem": "Vinheta clínica detalhada com dados em <strong>...</strong> e comando final claro.",
      "options": [
        { "letter": "A", "text": "Texto da alternativa A..." },
        { "letter": "B", "text": "Texto da alternativa B..." },
        { "letter": "C", "text": "Texto da alternativa C..." },
        { "letter": "D", "text": "Texto da alternativa D..." }
      ],
      "answer": "B",
      "rationale": "Fundamentação fisiopatológica e clínica completa comprovando o gabarito oficial.",
      "distractors": [
        "<strong>A está incorreta [Vetor 1 - Micro-Inversão]:</strong> Explicação do distrator... <em>(Ímã cognitivo: ...)</em>",
        "<strong>C está incorreta [Vetor 2 - Janela Biológica]:</strong> Explicação do distrator... <em>(Ímã cognitivo: ...)</em>",
        "<strong>D está incorreta [Vetor 3 - Salto de Etapa]:</strong> Explicação do distrator... <em>(Ímã cognitivo: ...)</em>"
      ],
      "pearl": "Pérola de prova de alta retenção / regra prática de cabeceira."
    }
  ]
}
```

---

## 6. Procedimento de Instalação e Registro Automático

Quando a IA terminar de redigir o JSON do simulado:

1. **Grave o arquivo** no disco em:
   `data/simulados/<pasta>/simulado_<tema>.json`
   *(ex.: `data/simulados/UCT20 CAB/simulado_cardiologia_ic.json`)*

2. **Execute o utilitário de validação e instalação do projeto:**
   ```powershell
   python .agents/skills/med-site-exam-crafter/scripts/manage_exam.py install "data/simulados/<pasta>/simulado_<tema>.json" "<pasta>"
   ```
   - O utilitário verifica se não há erros estruturais, checa os dados em `<strong>`, avalia o balanceamento das alternativas e executa `scripts/register_exam.py` automaticamente.
   - O arquivo `js/data.js` é atualizado na hora e o novo simulado já aparece no aplicativo, com contador na aba de simulados e busca ativa!

---

## 7. Protocolo de Modificações e Operações Sob Demanda

### A. Adicionar Novas Questões a um Simulado Existente
Quando o usuário pedir: *"Adicione mais 10 questões ao simulado de Mieloma"*:
1. Elabore as 10 novas questões com anti-bias próprio (balanceadas entre si).
2. Salve as novas questões em um arquivo temporário no scratch (ex.: `scratch/novas_questoes.json`).
3. Execute:
   ```powershell
   python .agents/skills/med-site-exam-crafter/scripts/manage_exam.py append "data/simulados/<pasta>/simulado_<tema>.json" "scratch/novas_questoes.json"
   ```
4. O script atualiza os IDs sequenciais, ajusta `total_questions` e regera `js/data.js`.

### B. Editar Enunciado, Gabarito ou Comentário de Questão
Quando o usuário pedir: *"Na questão 5 do simulado de Lúpus, mude o gabarito de A para C e adicione a justificativa..."*:
1. Abra o arquivo JSON correspondente em `data/simulados/<pasta>/simulado_<tema>.json`.
2. Localize a questão pelo campo `"id": 5` e atualize o enunciado, as opções ou o gabarito usando `replace_file_content`.
3. Execute:
   ```powershell
   python scripts/register_exam.py
   ```
4. O site já refletirá a correção em tempo real.

### C. Rebalancear o Gabarito (Anti-Bias Automático)
Se um simulado existente tiver muitas questões na mesma letra:
1. Execute:
   ```powershell
   python .agents/skills/med-site-exam-crafter/scripts/manage_exam.py rebalance "data/simulados/<pasta>/simulado_<tema>.json"
   ```
2. O algoritmo redistribui as letras homogeneamente (~25% cada), reordena as opções e remapeia automaticamente os distratores (`<strong>A está incorreta...</strong>`).

---

## 8. Arquivos da Skill no Projeto

- `SKILL.md`: Diretrizes e protocolo operacional (este arquivo).
- `scripts/manage_exam.py`: Utilitário de validação, injeção, rebalanceamento anti-bias e união de questões.
- `scripts/register_exam.py` *(raiz do projeto)*: Compilador mestre de dados offline para `js/data.js`.
