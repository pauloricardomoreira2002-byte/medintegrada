---
name: med-site-summary-crafter
description: >-
  Transforma apresentações de slides médicas (PDFs de aulas, casos clínicos PBL/Morfofuncional) em Guias de Estudo
  completos e integrados na plataforma MedIntegrada: gera o resumo em Markdown (.md) com tipografia médica e caixas
  pedagógicas, esquemas vetoriais (SVG) de cada capítulo com lightbox, índice dinâmico (TOC), compilação editorial
  em Word (.docx) com OpenXML e upload automático para o Cloudflare R2 ("D2"), vinculando o link de download direto
  na plataforma. Suporta protocolo completo de iterações e modificações sob demanda no .md, nos SVGs e no .docx/R2.
---

# MedSite Summary Crafter • Criação & Gestão Integrada de Resumos Médicos

Esta skill padroniza, automatiza e gerencia o ciclo completo de vida dos **Resumos Teóricos Detalhados (.md)**, **Esquemas Vetoriais (SVG)** e **Documentos Word (.docx)** na plataforma web **MedIntegrada**.

Ela conecta a leitura analítica de lâminas de aula (PDFs) à arquitetura técnica do aplicativo, garantindo que todo material novo seja imediatamente indexado, legível com índice lateral dinâmico (TOC), ilustrado com vetores em alta definição (com lightbox) e disponibilizado para download em `.docx` hospedado no Cloudflare R2 (*"D2"*). Além disso, esta skill define o protocolo para **aceitar qualquer solicitação de modificação** em qualquer das três camadas (.md, .svg e .docx).

---

## 1. Quando Ativar Esta Skill

Ative esta skill sempre que o usuário:
1. **Fornecer um PDF de aula médica** (ex.: `@aula.pdf`, casos clínicos de PBL, UCT ou Tutoria) e pedir a elaboração de um resumo detalhado para o aplicativo.
2. **Solicitar a inserção de um novo resumo no site** com seus respectivos esquemas vetoriais e sumário/índice.
3. **Pedir para compilar a versão em Word (`.docx`)** do resumo e fazer upload para o Cloudflare R2 (*"D2"*), atualizando o link de download na plataforma.
4. **Solicitar alterações ou refinamentos** em resumos já existentes:
   - Modificações textuais, conceituais ou estruturais no arquivo `.md`.
   - Modificações de design, labels, cores ou fluxos anatômicos nos arquivos `.svg`.
   - Modificações no documento `.docx` e sincronização/re-upload no Cloudflare R2.

---

## 2. A Arquitetura do Resumo no MedIntegrada

Para que um resumo funcione perfeitamente na plataforma, ele deve respeitar a estrutura de pastas do projeto:

```
[PDF da Aula]
      │
      ├── 1. Gera SVGs ────────────> assets/svg/<tema>/figXX_<nome>.svg
      │
      ├── 2. Gera Markdown (.md) ──> data/resumos/<pasta>/resumo_<tema>.md
      │                              (UCT20 CAB ou UCT20 Tutoria)
      │
      ├── 3. Compila Word (.docx) ──> assets/docx/Resumo_<Tema>_UCT20_<Docente>.docx
      │
      ├── 4. Upload Cloudflare R2 ──> https://pub-...r2.dev/docx/Resumo_...docx
      │                               (atualiza scripts/r2_uploaded_files.json)
      │
      └── 5. Indexa no App ────────> Executa: python scripts/register_exam.py
                                     (atualiza js/data.js -> TOC + Leitor + Download)
```

---

## 3. O Protocolo de Execução em 6 Fases

### Fase 1: Mapeamento e Extração Clínica do PDF
1. **Leitura Exaustiva:** Examine todo o PDF com `view_file` (sem pular lâminas, gráficos ou anexos de fechamento).
2. **Extração dos 7 Elementos Críticos de Prova:**
   - **Caso Clínico Disparador:** Anote idade, sexo, queixa principal, tempo de evolução, sinais vitais, achados físicos e as perguntas feitas pelo docente.
   - **Definições Conceituais Rigorosas:** Extraia os termos formais segundo as referências clássicas (Robbins & Cotran, Abbas, Murray, Guyton, Harrison).
   - **Fisiopatologia & Bioquímica Molecular:** Enzimas ativadas (ex.: PAD, bombas de prótons H⁺-ATPase, anidrase carbônica), cascatas de citocinas (TNF-α, IL-1, IL-6, IL-17, IFN-γ) e receptores celulares (ex.: RANKL/RANK).
   - **Dados Numéricos e Estatísticos:** Prevalência populacional, proporção sexual (ex.: 3:1), faixas etárias de pico, impacto em mortalidade e riscos relativos (RR).
   - **Tabelas de Critérios Oficiais:** Critérios diagnósticos e de classificação com seus escores e pontuações (ex.: ACR/EULAR, Jones, Duke, CRAB, etc.).
   - **Topografia e "O que a Doença Poupa":** Identifique minuciosamente articulações/regiões poupadas e exceções anatômicas (pegadinhas de avaliação médica).
   - **Cronologia Radiográfica & Histopatologia:** Sinais de imagem por tempo evolutivo e arquitetura microscópica concêntrica/zonas de necrose.
3. **Plano de Esquemas Gráficos:** Liste entre 10 e 15 esquemas vetoriais (SVG) a serem criados para cobrir visualmente cada capítulo do resumo.

---

### Fase 2: Design e Geração dos Esquemas Vetoriais (SVG)
Crie um arquivo `.svg` individual na pasta `assets/svg/<pasta_tema>/` para cada tópico conceitual.

**Diretrizes de Design SVG:**
- **Dimensões e ViewBox:** Padronize a largura em `900px` (`viewBox="0 0 900 450"` ou `viewBox="0 0 900 480"`).
- **Paleta de Cores Médica & Elegante:**
  - Fundo geral: degradê suave cinza/azulado (`#f8fafc` a `#f1f5f9`) com cantos arredondados (`rx="16"`).
  - Títulos de cabeçalho: Deep Navy (`#1e3a8a`) com texto branco em negrito.
  - Fisiologia / Normal / Acerto: Esmeralda / Verde-azulado (`#10b981`, `#059669`, `#ecfdf5`).
  - Patologia / Dano / Inflamação: Carmesim / Vermelho (`#dc2626`, `#ef4444`, `#fef2f2`).
  - Enzimas / Alertas / Atenção: Âmbar / Laranja (`#f59e0b`, `#d97706`, `#fffbeb`).
  - Células T / Destaques / Receptores: Royal Blue / Roxo (`#2563eb`, `#9333ea`, `#eff6ff`).
- **Regras Críticas de Renderização:**
  - **NUNCA** use tags HTML como `<b>`, `<strong>`, `<i>` ou `<div>` dentro de `<text>` no SVG. Use `<tspan font-weight="bold">` ou `<tspan font-style="italic">`.
  - Quebre textos longos em múltiplos `<tspan x="..." dy="...">` para evitar cortes laterais (*clipping*).
  - Adicione filtros sutis de sombra (`<filter id="shadow">`) nos cartões internos para acabamento moderno.

---

### Fase 3: Estruturação e Inserção do Resumo em Markdown (.md)
Crie o arquivo na subpasta apropriada em `data/resumos/<pasta>/resumo_<tema>.md` (onde `<pasta>` é `UCT20 CAB` ou `UCT20 Tutoria`).

**Regras Mandatórias de Estruturação Markdown:**
1. **Título Principal (H1):** `# <Tema da Aula> • Guia Definitivo`
2. **Subtítulo e Metadados Acadêmicos:**
   ```markdown
   **GUIA DEFINITIVO DE ESTUDO & REVISÃO PARA AVALIAÇÃO: <TEMA>**
   *UCT20 – Morfofuncional | Medicina | Situação Problema (SPX)
   Docente Responsável: Prof(a). <Nome>
   Bases Teóricas: <Livros-texto de Referência>*
   ――――――――――――――――――――――――――――――――――――――――――――――――――――――――――
   ```
3. **Hierarquia de Títulos (Alimenta o Índice Lateral Dinâmico / TOC):**
   - Use `## 1. Nome do Capítulo` para títulos de nível 1.
   - Use `### 1.1. Subtópico` para títulos de nível 2.
   - Use `#### 1.1.1. Detalhe Específico` para títulos de nível 3.
   > **Nota Técnica:** O leitor `resumos-viewer.js` extrai automaticamente esses cabeçalhos e gera o sumário clicável com indicador visual ativo (*ScrollSpy*).
4. **Caixas Pedagógicas de Destaque:**
   - `> [!IMPORTANT]` ➔ Foco de Prova / Alerta Crítico / Risco Vital
   - `> [!TIP]` ➔ Pegadinha de Banca / Atenção Estudante
   - `> [!NOTE]` ➔ Conceito-Chave / Ponto Crítico de Avaliação
5. **Tabelas Comparativas:** Use a sintaxe Markdown padrão com cabeçalho e separadores `| --- |`.
6. **Inserção dos Esquemas Vetoriais com Lightbox em Tela Cheia:**
   Cada figura deve ser inserida com a estrutura HTML abaixo:
   ```html
   <div class="resumo-figure-card" id="figura-X">
     <div class="figure-media-box" onclick="ResumosViewer.openLightbox('assets/svg/<tema>/figXX_nome.svg', 'Figura X: Legenda explicativa com detalhamento visual')" title="Clique para ampliar em tela cheia">
       <img src="assets/svg/<tema>/figXX_nome.svg" alt="Figura X: Legenda explicativa" class="resumo-svg-image" loading="lazy">
       <div class="figure-overlay-hint">
         <span class="btn-zoom-hint">🔍 Expandir Esquema em Alta Resolução</span>
       </div>
     </div>
     <p class="figure-caption"><strong>Figura X:</strong> Legenda explicativa com detalhamento visual.</p>
   </div>
   ```
7. **Fechamento Mandatório com Simulado Comentado:**
   - **Resolução Oficial do Caso Disparador:** Responda detalhadamente a cada pergunta formulada pelo docente.
   - **Banco de Questões Inéditas (6 a 10 itens):** No padrão de avaliação médica (Morfofuncional/ENAMED/Residência), com 4 alternativas, indicação do gabarito em caixa de destaque e desconstrução cirúrgica dos distratores.

---

### Fase 4: Compilação Editorial no Word (.docx) via OpenXML
Para gerar a versão imprimível em Word:
1. Execute o compilador automático integrado da skill:
   ```powershell
   python .agents/skills/med-site-summary-crafter/scripts/compile_md_to_docx.py "data/resumos/<pasta>/resumo_<tema>.md" "assets/docx/Resumo_<Tema>_UCT20_<Docente>.docx"
   ```
2. O script executa automaticamente:
   - Identificação dos SVGs referenciados no Markdown.
   - Renderização em lote de cada SVG para PNG em alta resolução (Retina 2x, 300 DPI) via Microsoft Edge headless nativo.
   - Configuração de margens A4 (0.8 polegadas / 2.0 cm).
   - Tipografia profissional (Arial para títulos Navy `#1E3A8A` / Royal Blue `#2563EB`, Calibri para texto e entrelinhas 1.15).
   - Criação de Caixas de Destaque OpenXML com bordas grossas esquerdas e fundos sombreados.
   - Tabelas zebradas com cabeçalho Navy e texto contrastante.
   - Inserção das imagens centralizadas com largura de 6.2 polegadas e legendas formatadas.

---

### Fase 5: Upload para Cloudflare R2 ("D2") e Registro no Aplicativo
1. **Upload para Cloudflare R2:**
   Envie o arquivo `.docx` gerado diretamente para o bucket remoto executando:
   ```powershell
   node scripts/upload_docx_to_r2.js "assets/docx/Resumo_<Tema>_UCT20_<Docente>.docx"
   ```
   - O script calcula a assinatura AWS S3 Signature v4, faz o upload HTTPS para o bucket `medintegrada-arquivos` e salva a URL pública correspondente no arquivo `scripts/r2_uploaded_files.json`.

2. **Indexação e Registro Automático no Aplicativo:**
   Reindexe os dados da plataforma executando:
   ```powershell
   python scripts/register_exam.py
   ```
   - O registrador detecta o novo resumo `.md`, mapeia a pasta (`UCT20 CAB` ou `UCT20 Tutoria`), vincula a URL pública do Cloudflare R2 no metadado `docxFile` e regera o arquivo central `js/data.js`.
   - O novo resumo passa a aparecer imediatamente no catálogo de resumos da plataforma com contadores de pasta atualizados, busca instantânea e botão de download oficial funcionando diretamente do Cloudflare R2!

---

### Fase 6: Protocolo de Modificações e Ciclo de Vida Contínuo

Esta skill foi projetada para atender prontamente a solicitações de modificação do usuário em qualquer etapa:

#### A. Pedidos de Modificação no Conteúdo (.md)
Quando o usuário pedir alterações de texto, correções de conceitos, adição de tabelas ou inclusão de novos tópicos:
1. Edite o arquivo Markdown correspondente em `data/resumos/<pasta>/resumo_<tema>.md` com a ferramenta `replace_file_content`.
2. Execute `python scripts/register_exam.py` para sincronizar o texto atualizado com `js/data.js`.
3. Notifique o usuário que o texto e o sumário (TOC) foram atualizados no site.
4. Caso o usuário queira que a alteração também conste no Word, siga para o passo C abaixo.

#### B. Pedidos de Modificação nos Esquemas Vetoriais (.svg)
Quando o usuário pedir alterações visuais em uma figura (ex.: *"mude a cor dos macrófagos para vermelho"*, *"corrija o texto do receptor para RANK"*, *"aumente o contraste"*):
1. Localize o arquivo SVG em `assets/svg/<tema>/figXX_...svg`.
2. Edite o código SVG diretamente com as tags e coordenadas ajustadas.
3. Como o leitor web carrega os SVGs diretamente, a visualização e o Lightbox no site passam a exibir a nova versão imediatamente.
4. Se o `.docx` já havia sido gerado, execute a recompilação (passo C) para atualizar a imagem no Word.

#### C. Pedidos de Modificação no Word (.docx) & Sincronização no Cloudflare R2 ("D2")
Quando o usuário pedir alteração no documento Word (formatação, estilos, imagens atualizadas ou conteúdo revisto):
1. Recompile o documento `.docx`:
   ```powershell
   python .agents/skills/med-site-summary-crafter/scripts/compile_md_to_docx.py "data/resumos/<pasta>/resumo_<tema>.md" "assets/docx/Resumo_<Tema>_UCT20_<Docente>.docx"
   ```
2. Faça o novo upload para o Cloudflare R2 com substituição do arquivo:
   ```powershell
   node scripts/upload_docx_to_r2.js "assets/docx/Resumo_<Tema>_UCT20_<Docente>.docx"
   ```
3. Execute `python scripts/register_exam.py` para garantir que o link esteja perfeitamente vinculado no `js/data.js`.
4. Confirme ao usuário a nova versão do arquivo e o link atualizado no Cloudflare R2.

---

## 4. Estrutura de Arquivos da Skill

- `SKILL.md`: Diretrizes operacionais e protocolos da skill (este documento).
- `scripts/render_svg.py`: Utilitário para converter SVGs em PNGs Retina 2x via Edge/Chrome headless.
- `scripts/compile_md_to_docx.py`: Compilador de Markdown com SVGs para documentos Word `.docx` com estilos OpenXML.
- `templates/docx_styles.py`: Biblioteca de estilos OpenXML para `python-docx` (caixas de destaque, tabelas zebradas, títulos e paginação A4).
- `scripts/upload_docx_to_r2.js` *(raiz do projeto)*: Sincronizador de arquivos com o bucket Cloudflare R2 com persistência de URLs.
- `scripts/register_exam.py` *(raiz do projeto)*: Registrador e gerador de `js/data.js` para carregamento 100% offline.
