---
name: med-site-comparative-map-crafter
description: >-
  Elabora, formata, valida e insere mapas conceituais e infográficos comparativos panorâmicos em SVG de alta
  resolução (FHD 1920) diretamente na plataforma MedIntegrada: confronta de 2 a 4 patologias médicas com eixos
  clínicos dinâmicos e adaptados ao domínio estudado (geralmente de 6 a 8 eixos discriminadores), aplica algoritmo
  matemático de clearance anti-sobreposição (>= 14px), gera o visualizador HTML responsivo, salva nas pastas da
  disciplina (assets/mapas_html/ e data/mapas/) e reindexa instantaneamente o site via script de registro.
---

# MedSite Comparative Map Crafter • Elaborador & Injetor de Mapas Comparativos

Esta skill é a ferramenta oficial do projeto **MedIntegrada** para conceber, formatar, validar e **inserir automaticamente** mapas conceituais e infográficos comparativos panorâmicos (em formato vetorial SVG de alta resolução FHD 1920) diretamente na aplicação web, sem exigir etapas manuais de transferência ou configuração por parte do usuário.

Ela combina **raciocínio médico de diagnóstico diferencial de alto rendimento (padrão ENAMED/INEP/Revalida/Residência)** com **automação direta de banco de dados (`data/mapas/`, `assets/mapas_html/` e `js/data.js`)**.

---

## 1. Quando Ativar Esta Skill

Ative esta skill sempre que o usuário:
1. **Pedir para criar um mapa comparativo, quadro sinóptico ou tabela visual de diagnóstico diferencial** entre 2, 3 ou 4 patologias médicas (ex.: *"Crie um mapa comparativo entre Mieloma Múltiplo e Lúpus para a UCT20 CAB"*, *"Faça um quadro comparativo entre as glomerulopatias"*).
2. **Fornecer lâminas de aula, casos clínicos PBL ou diretrizes** e pedir uma síntese visual comparativa com eixos sob medida para o tema.
3. **Solicitar a inserção de um novo mapa comparativo no site** em uma pasta específica (**"UCT20 CAB"** ou **"UCT20 Tutoria"**).
4. **Pedir modificações, correções ou ajustes em mapas comparativos já existentes** (ex.: alterar ou renomear eixos clínicos, atualizar condutas terapêuticas, ajustar cores, badges ou pérolas de prova).
5. **Auditar ou reindexar os mapas cadastrados na plataforma**.

---

## 2. Fluxo Operacional 100% Autônomo no MedIntegrada

Ao ser acionada, esta skill executa todo o ciclo operacional diretamente no workspace:

```
[Solicitação Médica do Usuário / PDFs de Aula]
                     │
                     ├── 1. Formulação dos Eixos Clínicos Dinâmicos:
                     │    - Seleção de 2 a 4 patologias
                     │    - Proposição de 6 a 8 eixos discriminadores sob medida para o tema
                     │    - Definição de pérolas de alto rendimento (★) por cartão
                     │
                     ├── 2. Geração da Matriz de Dados JSON:
                     │    - Monta estrutura com títulos, cores temáticas, ícones e eixos propostos
                     │    - Aplica templates oficiais (template_2_diseases, etc.)
                     │
                     ├── 3. Compilação & Instalação Automática:
                     │    - Executa: python .agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py build --input <mapa.json> --folder "<PASTA>"
                     │    - Calcula quebras de linha e clearance anti-sobreposição (>= 14px)
                     │    - Gera SVG vetorial puro (viewBox 0 0 1920 {h})
                     │    - Gera visualizador HTML standalone responsivo
                     │    - Salva em:
                     │        • assets/mapas_html/<PASTA>/<id>.svg  e  assets/mapas_html/<id>.svg
                     │        • assets/mapas_html/<PASTA>/<id>.html e  assets/mapas_html/<id>.html
                     │        • data/mapas/<PASTA>/<id>.json
                     │
                     ├── 4. Reindexação Instantânea da Aplicação:
                     │    - Executa automaticamente scripts/register_exam.py
                     │    - Atualiza window.MED_MAPAS em js/data.js
                     │
                     └── 5. Retorno ao Usuário:
                          - Confirma que o mapa já está disponível no site
                          - Apresenta resumo dos eixos, patologias comparadas e pérolas
```

---

## 3. Modelagem Dinâmica de Eixos por Domínio Clínico

**Regra de Ouro:** Os eixos de um mapa comparativo **NUNCA são fixos nem genéricos**. Não faz sentido cobrar *"Líquido Sinovial"* em patologias glomerulares ou neurológicas, assim como não faz sentido cobrar *"Eletrocardiograma"* em doenças osteometabólicas.

Ao conceber um mapa comparativo, a skill deve **propor e desenhar os eixos (geralmente entre 6 e 8 eixos discriminadores)** especificamente adequados ao grupo de patologias em estudo. Os eixos devem capturar os pontos exatos onde as patologias mais se assemelham (mimetismo clínico) e onde se diferenciam decisivamente na prática médica e nas provas de alto nível.

### Critérios para Formulação dos Eixos no Caso Concreto:
1. **Fisiopatologia & Sítio:** Qual é a estrutura, célula ou compartimento primariamente lesado?
2. **Perfil & Gatilhos:** Quais são as faixas etárias, fatores precipitantes ou predisposições típicas?
3. **Clínica & Semiótica:** Qual é o sintoma ou sinal guia que orienta o raciocínio na anamnese e exame físico?
4. **Exame Padrão-Ouro / Diagnóstico Confirmatório:** Qual método isola o diagnóstico (biópsia, fluido específico, microbiologia, genética, cateterismo, etc.)?
5. **Métodos de Imagem / Gráficos:** Qual exame de imagem ou funcional revela o dano (RX, RM, TC, USG, ECG, Eco)?
6. **Biomarcadores & Cinética Laboratorial:** Quais exames de sangue/urina mostram atividade, lesão de órgão-alvo ou autoimunidade?
7. **Estratégia Terapêutica & Manejo Agudo:** O que muda na conduta farmacológica, cirúrgica ou de suporte imediato?
8. **Pérolas Psicométricas & Pegadinhas de Prova (`★`):** Quais são as armadilhas clássicas de banca e falso-negativos?

---

### Catálogo de Arquétipos de Eixos por Domínio Clínico

#### Arquétipo A: Reumatologia & Aparelho Locomotor (ex.: Artrites, Gota, Osteomielite)
1. **Sítio Anatômico & Mecanismo Etiopatogênico:** Membrana sinovial, osso cortical/medular, cartilagem ou fáscia.
2. **Perfil Epidemiológico, Demografia & Fatores Precipitantes:** Razão H:M, idade de início, dieta, trauma prévio.
3. **Semiótica da Dor, Simetria Articular & Rigidez Matinal:** Padrão inflamatório vs mecânico, tempo de rigidez.
4. **Líquido Sinovial / Órgão-Alvo / Celularidade & Cristais:** Artrocentese, celularidade, % PMN, luz polarizada.
5. **Radiologia, Métodos de Imagem & Janela de Sensibilidade:** RX simples (sinais precoces vs tardios), USG, RM.
6. **Marcadores Laboratoriais, Cinética Inflamatória & Autoanticorpos:** PCR, VHS, FR, Anti-CCP, Ácido Úrico.
7. **Critérios Diagnósticos Oficiais & Manejo Terapêutico:** Alívio na crise aguda vs drogas de remissão/manutenção.
8. **Pontos Críticos de Prova & Pegadinhas de Alto Rendimento (`★`):** Falso-negativos, dosagens em crise, axiomas.

#### Arquétipo B: Nefrologia & Glomerulopatias (ex.: GNPE vs Berger vs Nefropatia Membranosa vs LES)
1. **Compartimento Glomerular Acometido & Fisiopatologia:** Podócito, mesângio, endotélio ou membrana basal.
2. **Faixa Etária, Tempo de Latência Pós-Infecciosa & Gatilhos:** Criança vs adulto, faringite/piodermite prévia.
3. **Síndrome Clínica Dominante & Gravidade:** Síndrome Nefrítica vs Nefrótica vs Hematúria Assintomática vs RPGN.
4. **Sedimento Urinário, Dismorfismo Eritrocitário & Nível de Proteinúria:** Hematúria glomerular, cilindros hemáticos.
5. **Cinética do Complemento Sérico (C3/C4) & Autoanticorpos:** Consumo transitório vs persistente de C3, ASLO, ANCA, FAN.
6. **Histopatologia, Imunofluorescência (IF) & Microscopia Eletrônica:** Depósitos subepiteliais/subendoteliais, corcoveamento.
7. **Abordagem Terapêutica, Indicação de Biópsia & Diálise:** IECA/BRA, restrição volêmica, imunossupressão.
8. **Pegadinhas de Prova & Critérios de Mau Prognóstico (`★`):** Hipocomplementemia > 8 semanas, oligúria persistente.

#### Arquétipo C: Cardiologia & Doenças Cardiovasculares (ex.: IC com FE reduzida vs preservada, Valvopatias)
1. **Alteração Hemodinâmica Central & Fisiopatologia:** Sobrecarga de pressão vs volume, remodelamento miocárdico.
2. **Etiologias Prevalentes & Fatores de Descompensação:** Isquemia, HAS, doença de Chagas, má adesão, AINEs.
3. **Semiótica Cardiovascular, Ausculta & Sinais de Congestão:** B3 vs B4, características de sopros, estase jugular.
4. **Eletrocardiograma (ECG) & Biomarcadores Cardíacos:** Sinais de sobrecarga cavitária, BNP, NT-proBNP, Troponinas.
5. **Ecocardiograma, Fração de Ejeção & Parâmetros Estruturais:** FEVE, disfunção diastólica, áreas valvares, gradientes.
6. **Classificação Funcional & Estadiamento Clínico:** Escores NYHA, Killip, Forrester ou estágios ACC/AHA.
7. **Arsenal Farmacológico Modificador de Sobrevida & Intervenções:** 4 pilares da IC, troca valvar, suporte inotrópico.
8. **Pegadinhas de Bancas & Contraindicações Críticas (`★`):** Medicações que reduzem mortalidade vs apenas sintomas.

#### Arquétipo D: Hematologia & Distúrbios Linfoproliferativos / Anemias (ex.: Mieloma vs Linfoma vs Anemias)
1. **Linhagem Hematopoiética Acometida & Biologia Clonal:** Plasmócitos, linfócitos B/T ou precursores mieloides.
2. **Perfil do Paciente, Cronologia & Sintomas B:** Febre vespertina, sudorese noturna, perda ponderal, astenia.
3. **Apresentação Clínica, Lesão Óssea & Visceromegalias:** Dores ósseas axiais, adenomegalias palpáveis, esplenomegalia.
4. **Hemograma, Sangue Periférico & Cinética Celular:** Rouleaux eritrocitário, reticulócitos, pancitopenia.
5. **Eletroforese / Imunofixação & Marcadores Tumorais:** Pico monoclonal gama (M), cadeias leves livres (kappa/lambda), DHL.
6. **Medula Óssea (Aspirado / Biópsia) & Citogenética:** % plasmócitos clonais medulares, imunofenotipagem, FISH.
7. **Critérios Diagnósticos (ex: CRAB/SLiM, Ann Arbor) & Conduta:** Tratamento de suporte imediato, quimioterapia.
8. **Armadilhas de Avaliação Médica & Complicações Agudas (`★`):** Hipercalcemia aguda, rim do mieloma, lise tumoral.

#### Arquétipo E: Infectologia & Síndromes Febris / Infecções do SNC / Sepse (ex.: Meningites, Pneumonias)
1. **Agente Etiológico Primário & Patogênese:** Bactéria capsulada, vírus, fungo, produção de endotoxinas.
2. **Epidemiologia, Transmissão & Populações de Risco:** Idade, vacinação, sazonalidade, imunossupressão.
3. **Síndrome Clínica, Cronologia & Sinais de Gravidade:** Tríade clássica, rigidez de nuca, petéquias/púrpura, qSOFA.
4. **Análise de Fluidos Nobres (ex: Líquor / LCR):** Pressão de abertura, celularidade (% PMN vs linfomonócitos), glicorraquia/glicemia, proteinorraquia.
5. **Identificação Microbiológica Direta & Métodos Moleculares:** Bacterioscopia por Gram, culturas, antígenos rápidos, PCR/Painel Multiplex.
6. **Cinética Inflamatória Sistêmica & Biomarcadores:** Leucograma com desvio, procalcitonina, proteína C reativa, lactato.
7. **Esquema Antimicrobiano Empírico & Corticoterapia Adjuvante:** Cobertura inicial por faixa etária, dexametasona antes do ATB.
8. **Profilaxia de Contatantes & Pegadinhas Decisivas (`★`):** Rifampicina/ceftriaxona para contatos, janela diagnóstica.

---

## 4. Engenharia de Layout e Limites Tipográficos

Para garantir legibilidade cirúrgica, estética premium e ausência total de sobreposição de elementos:

### 1. Grid e Largura Útil (FHD 1920)
* Largura total do canvas: `1920 px`. Margens laterais: `40 px`. Largura útil total: `1840 px`.
* **2 Patologias (ex.: Mieloma Múltiplo vs. Lúpus):**
  * 2 colunas largas de **908 px** cada (espaçamento entre colunas: `24 px` -> $2 \times 908 + 24 = 1840\text{ px}$).
  * Quebra de texto automática em **115 caracteres** por linha.
* **3 Patologias (ex.: Síndromes Glomerulares ou Artrites):**
  * 3 colunas de **600 px** cada (espaçamento entre colunas: `20 px` -> $3 \times 600 + 40 = 1840\text{ px}$).
  * Quebra de texto automática em **78 caracteres** por linha.
* **4 Patologias (ex.: Osteomielite vs. Artrite Séptica vs. Gota vs. Artrite Reumatoide):**
  * 4 colunas de **448 px** cada (espaçamento entre colunas: `16 px` -> $4 \times 448 + 48 = 1840\text{ px}$).
  * Quebra de texto automática em **54 caracteres** por linha.

### 2. Algoritmo Anti-Sobreposição (Clearance Guarantee)
* Cada cartão de patologia possui uma **pílula inferior destacada (`★`)** de `height="22"` posicionada em `pill_y = card_height - 28`.
* É terminantemente proibido texto invadindo a pílula. O motor `manage_map.py` calcula dinamicamente:
  $$\text{min\_required\_h} = \text{max\_card\_text\_y} + 44$$
  Garantindo folga mínima de **16 px** entre a última linha do texto do corpo e a borda superior da pílula (`clearance = pill_y - max_card_text_y >= 16px`).

### 3. Tipografia e Identidade Visual
* Fonte padrão: `'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif`.
* Rótulos de tópicos em negrito com cor primária escura: `<tspan class="bold" fill="{dark}">• Rótulo: </tspan>`.
* Corpo do texto em `font-size="11.5"` com entrelinha de 16 px e cor `#334155` (Slate escuro de alto contraste sobre fundo branco).

---

## 5. Sistema Cromático e Identidade Visual por Especialidade

### 1. Os 5 Tokens de Cor Obrigatórios por Doença
Cada patologia no mapa é regida por 5 tokens cromáticos que garantem harmonia e contraste acessível:
* `primary`: Cor primária e de acento da patologia (barra lateral de 5 px no cartão e final do degradê do cabeçalho).
* `dark`: Cor escura de alto contraste (início do degradê do cabeçalho e cor dos rótulos em negrito `<tspan class="bold">`).
* `border`: Borda inferior do cabeçalho e contorno externo sutil do cartão (`stroke-opacity="0.45"`).
* `badge_bg`: Fundo pastel suave da pílula de categoria no topo e da pílula inferior com pérola (`★`).
* `badge_text`: Texto escuro e legível da pílula, com contraste mínimo de 4.5:1 (WCAG AA/AAA) sobre o `badge_bg`.

### 2. Princípio da Distinção Cromática Inter-Colunas
Ao montar um mapa de 2, 3 ou 4 colunas, **colunas vizinhas NUNCA devem ter a mesma família de cor** (ex.: nunca colocar duas doenças em tons de vermelho ou azul lado a lado). Cada coluna deve ter uma matiz visualmente contrastante para permitir que o estudante escaneie a coluna da doença verticalmente de relance.

### 3. Matriz de Paletas Oficiais por Domínio Médico

| Domínio Clínico / Patologia | Cor Primária (`primary`) | Fundo Escuro (`dark`) | Borda (`border`) | Fundo Pílula (`badge_bg`) | Texto Pílula (`badge_text`) | Significado Semiótico |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Tecido Ósseo / Ortopedia** | `#0d9488` (Teal) | `#115e59` | `#14b8a6` | `#ccfbf1` | `#0f766e` | Matriz óssea e mineral |
| **Emergência / Infecciosa** | `#e11d48` (Rose/Ruby) | `#9f1239` | `#f43f5e` | `#ffe4e6` | `#be123c` | Alerta biológico / urgência |
| **Metabólica / Cristais (Gota)** | `#d97706` (Amber) | `#92400e` | `#f59e0b` | `#fef3c7` | `#b45309` | Microcristais / urato |
| **Imunologia / Reumato (AR)** | `#6366f1` (Indigo) | `#4338ca` | `#818cf8` | `#e0e7ff` | `#3730a3` | Sinovite imune / pannus |
| **Neoplasia Clonal (Mieloma)** | `#7c3aed` (Violet) | `#5b21b6` | `#8b5cf6` | `#f3e8ff` | `#6b21a8` | Proliferação plasmocitária |
| **Autoimune Sistêmica (LES)** | `#be185d` (Magenta) | `#831843` | `#f43f5e` | `#fce7f3` | `#9d174d` | Asa de borboleta / multissistêmico |
| **Nefrologia / Glomerular** | `#0284c7` (Sky Blue) | `#0369a1` | `#38bdf8` | `#e0f2fe` | `#075985` | Filtração glomerular / urina |
| **Cardiovascular / Vascular** | `#dc2626` (Red) | `#991b1b` | `#ef4444` | `#fee2e2` | `#991b1b` | Pressão arterial / miocárdio |
| **Pneumologia / Respiratória** | `#0891b2` (Cyan) | `#0e7490` | `#22d3ee` | `#cffafe` | `#155e75` | Vias aéreas / trocas gasosas |
| **Gastroenterologia / Fígado** | `#059669` (Emerald) | `#065f46` | `#10b981` | `#d1fae5` | `#065f46` | Hepatócitos / trato digestivo |
| **Neurologia / Neurovascular** | `#4f46e5` (Royal Blue)| `#3730a3` | `#6366f1` | `#e0e7ff` | `#312e81` | Encéfalo / sinapses / LCR |
| **Endocrinologia / Metabólica**| `#ea580c` (Tangerine) | `#9a3412` | `#f97316` | `#ffedd5` | `#9a3412` | Glândulas / eixos hormonais |

### 4. Biblioteca de Ícones Vetoriais Integrados (`icon_type`)
O motor `manage_map.py` possui ícones vetoriais inline embutidos para cada especialidade, acionados pelo campo `"icon_type"`:
* `"bone"`: Osso e osteoblasto (Ortopedia / Osteomielite).
* `"warning"`: Exclamação de urgência infecciosa (Artrite Séptica / Emergências).
* `"crystal"`: Prisma de microcristais (Gota / Urolitíase).
* `"immune"`: Célula imune / Linfócito com escudo de check (Artrite Reumatoide).
* `"dna"`: Hélice e núcleos tumorais (Neoplasias clonais / Mieloma).
* `"butterfly"`: Asa de borboleta (Lúpus Eritematoso Sistêmico).
* `"heart"`: Coração estilizado (Cardiologia / Insuficiência Cardíaca / Valvopatias).
* `"kidney"`: Rim e néfrons (Nefrologia / Glomerulopatias).
* `"lungs"`: Árvore brônquica e pulmões (Pneumologia / DPOC / Asma).
* `"brain"`: Hemisférios cerebrais (Neurologia / AVC / Esclerose Múltipla).
* `"stomach"`: Trato digestivo (Gastroenterologia / DII / Úlceras).
* `"virus"`: Vírus capsulado / Bactéria (Infectologia / Sepse).
* `"drop"`: Gota de sangue / Urina (Hematologia / Anemias / Urinálise).
* `"default"`: Símbolo médico padrão.
*(Nota: Também é possível fornecer um SVG customizado diretamente no campo `"icon"` de qualquer patologia).*

---

## 6. Comandos do Gerenciador CLI (`manage_map.py`)

A skill disponibiliza um utilitário CLI completo em `.agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py`:

### 1. Compilar e Instalar um Mapa no Site
```bash
python .agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py build \
  --input "caminho/para/mapa.json" \
  --folder "UCT20 CAB"
```
*Gera o `.svg`, o `.html`, salva a matriz em `data/mapas/<pasta>/` e executa automaticamente `scripts/register_exam.py`.*

### 2. Validar Estrutura e Clearances
```bash
python .agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py validate \
  --input "caminho/para/mapa.json"
```

### 3. Listar Todos os Mapas Cadastrados
```bash
python .agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py list
```

### 4. Forçar Reindexação dos Dados do Site
```bash
python .agents/skills/med-site-comparative-map-crafter/scripts/manage_map.py reindex
```

---

## 7. Modelos Iniciais Disponíveis (Templates)

Na pasta `templates/`, estão disponíveis três matrizes completas prontas para uso:
* `template_2_diseases.json`: Modelo de 2 colunas largas (ex.: MM vs LES).
* `template_3_diseases.json`: Modelo de 3 colunas (confronto triplo).
* `template_4_diseases.json`: Modelo de 4 colunas (ex.: Aparelho Locomotor).

---

## 8. Integração com os Recursos Interativos do Visualizador Web

Os mapas gerados por esta skill se integram nativamente a todas as ferramentas do visualizador (`js/mapas-viewer.js`):
1. **Filtro por Pasta no Topo:** Alternância fluida entre as abas **"UCT20 CAB"** e **"UCT20 Tutoria"** com badges dinâmicos de contagem.
2. **Visualização em HD com Lightbox:** Abertura instantânea do mapa vetorial completo em tela cheia.
3. **Zoom & Pan Suave:** Arrastar com o mouse para navegar pelo mapa panorâmico e controle de ampliação via botões ou scroll do mouse.
4. **Modo Seleção de Texto Inteligente:** Botão comutador que desabilita o arrasto para permitir que o estudante selecione e copie trechos, tabelas ou pérolas diretamente do SVG.
5. **Acesso Externo & Download:** Botão *"Nova Aba"* para abrir o arquivo HTML standalone e botão *"Baixar SVG"* para download direto do arquivo vetorial original.
