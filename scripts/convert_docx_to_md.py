"""
Conversor avançado de Guias de Estudo em Word (.docx) para Markdown (.md)
Preserva 100% do conteúdo teórico, tabelas comparativas, caixas de alerta
e insere os esquemas vetoriais SVG de cada capítulo com legenda e lightbox.
"""

import os
import re
import docx
from docx.text.paragraph import Paragraph
from docx.table import Table

DOCS_CONFIG = [
    {
        'id': 'artrite-reumatoide',
        'docx': 'assets/docx/Resumo_Artrite_Reumatoide_UCT20_Prof_Paula.docx',
        'md': 'data/resumos/resumo_artrite_reumatoide.md',
        'svg_dir': 'assets/svg/reumato',
        'svg_prefix': 'fig',
        'title': 'Artrite Reumatoide (AR) • Guia Definitivo',
        'svg_map': {
            1: 'assets/svg/reumato/fig01_tolerancia_autoimunidade.svg',
            2: 'assets/svg/reumato/fig02_epidemiologia_impacto.svg',
            3: 'assets/svg/reumato/fig03_cascata_patogenica.svg',
            4: 'assets/svg/reumato/fig04_citrulinizacao_bioquimica.svg',
            5: 'assets/svg/reumato/fig05_rede_citocinas_sinovia.svg',
            6: 'assets/svg/reumato/fig06_mecanismo_osteoclasto_rankl.svg',
            7: 'assets/svg/reumato/fig07_articulacao_normal_vs_pannus_anquilose.svg',
            8: 'assets/svg/reumato/fig08_anti_ccp_vs_fator_reumatoide.svg',
            9: 'assets/svg/reumato/fig09_distribuicao_articular_cervical.svg',
            10: 'assets/svg/reumato/fig10_deformidades_classicas_maos.svg',
            11: 'assets/svg/reumato/fig11_histologia_nodulo_reumatoide.svg',
            12: 'assets/svg/reumato/fig12_achados_radiograficos_cronologia.svg',
            13: 'assets/svg/reumato/fig13_criterios_acr_eular_2010.svg',
            14: 'assets/svg/reumato/fig14_sintese_caso_clinico_professora.svg',
        }
    },
    {
        'id': 'gota-hiperuricemia',
        'docx': 'assets/docx/Resumo_Hiperuricemia_e_Gota_UCT20_Prof_Paula_Ana.docx',
        'md': 'data/resumos/resumo_gota_hiperuricemia.md',
        'svg_dir': 'assets/svg/gota',
        'title': 'Hiperuricemia, Dinâmica da Uricosúria & Artrite Gotosa',
        'svg_map': {
            1: 'assets/svg/gota/svg_gota_01_metabolismo_purinas_uricase.svg',
            2: 'assets/svg/gota/svg_gota_02_comportamento_dual_urato.svg',
            3: 'assets/svg/gota/svg_gota_03_manejo_renal_transportadores.svg',
            4: 'assets/svg/gota/svg_gota_04_etiologia_primaria_secundaria.svg',
            5: 'assets/svg/gota/svg_gota_05_fisiopatologia_crise_inflamassoma.svg',
            6: 'assets/svg/gota/svg_gota_06_historia_natural_4_fases.svg',
            7: 'assets/svg/gota/svg_gota_07_topografia_e_fator_temperatura.svg',
            8: 'assets/svg/gota/svg_gota_08_liquido_sinovial_gota_vs_pseudogota.svg',
            9: 'assets/svg/gota/svg_gota_09_radiologia_sinal_saca_bocado.svg',
            10: 'assets/svg/gota/svg_gota_10_farmacologia_crise_vs_manutencao.svg',
            11: 'assets/svg/gota/svg_gota_11_farmacos_influenciadores_e_losartana.svg',
        }
    },
    {
        'id': 'lupus-eritematoso-sistemico',
        'docx': 'assets/docx/Resumo_Lupus_Eritematoso_Sistemico_UCT20_Prof_Ana.docx',
        'md': 'data/resumos/resumo_lupus_eritematoso_sistemico.md',
        'svg_dir': 'assets/svg/les',
        'title': 'Lúpus Eritematoso Sistêmico (LES) • Guia Definitivo',
        'svg_map': {
            1: 'assets/svg/les/svg_les_01_tolerancia_e_autoimunidade.svg',
            2: 'assets/svg/les/svg_les_02_epidemiologia_e_grupos_de_risco.svg',
            3: 'assets/svg/les/svg_les_03_fatores_etiologicos_interacao.svg',
            4: 'assets/svg/les/svg_les_04_fisiopatologia_4_etapas_molecular.svg',
            5: 'assets/svg/les/svg_les_05_imunocomplexos_e_complemento.svg',
            6: 'assets/svg/les/svg_les_06_espectro_cutaneo_lupus.svg',
            7: 'assets/svg/les/svg_les_07_artropatia_jaccoud_vs_artrite_reumatoide.svg',
            8: 'assets/svg/les/svg_les_08_manifestacoes_hematologicas_citopenias.svg',
            9: 'assets/svg/les/svg_les_09_nefrite_lupica_anatomia_e_classes.svg',
            10: 'assets/svg/les/svg_les_10_acometimento_cardiopulmonar_e_risco_bimodal.svg',
            11: 'assets/svg/les/svg_les_11_les_na_gestacao_e_lupus_neonatal.svg',
            12: 'assets/svg/les/svg_les_12_fator_antinuclear_padroes_ifi.svg',
            13: 'assets/svg/les/svg_les_13_painel_autoanticorpos_especificidade.svg',
            14: 'assets/svg/les/svg_les_14_criterios_classificacao_eular_acr_2019.svg',
            15: 'assets/svg/les/svg_les_15_algoritmo_terapeutico_integrado.svg',
        }
    },
    {
        'id': 'mieloma-multiplo',
        'docx': 'assets/docx/Resumo_Mieloma_Multiplo_UCT20_Prof_Paula.docx',
        'md': 'data/resumos/resumo_mieloma_multiplo.md',
        'svg_dir': 'assets/svg/mieloma',
        'title': 'Mieloma Múltiplo & Gamopatias Monoclonais',
        'svg_map': {
            1: 'assets/svg/mieloma/svg_mm_01_linhagem_e_plasmocito.svg',
            2: 'assets/svg/mieloma/svg_mm_02_modelo_duas_etapas.svg',
            3: 'assets/svg/mieloma/svg_mm_03_imunoglobulina_e_bence_jones.svg',
            4: 'assets/svg/mieloma/svg_mm_04_fisiopatologia_ossea.svg',
            5: 'assets/svg/mieloma/svg_mm_05_cintilografia_vs_raiox.svg',
            6: 'assets/svg/mieloma/svg_mm_06_eletroforese_e_imunofixacao.svg',
            7: 'assets/svg/mieloma/svg_mm_07_criterios_crab.svg',
            8: 'assets/svg/mieloma/svg_mm_08_rouleaux_e_anemia.svg',
            9: 'assets/svg/mieloma/svg_mm_09_nefropatia_do_mieloma.svg',
            10: 'assets/svg/mieloma/svg_mm_10_estadiamento_iss_riss.svg',
            11: 'assets/svg/mieloma/svg_mm_11_emergencias_no_mieloma.svg',
            12: 'assets/svg/mieloma/svg_mm_12_estrategia_terapeutica.svg',
        }
    },
    {
        'id': 'osteomielite-artrite-septica',
        'docx': 'assets/docx/Resumo_Osteomielite_e_Artrite_Septica_UCT20_Prof_Paula_Ana.docx',
        'md': 'data/resumos/resumo_osteomielite_artrite_septica.md',
        'svg_dir': 'assets/svg/infeccoes',
        'title': 'Osteomielite & Artrite Séptica • Infecções Osteoarticulares',
        'svg_map': {
            1: 'assets/svg/infeccoes/svg_infec_01_anatomia_articular_liquido.svg',
            2: 'assets/svg/infeccoes/svg_infec_06_osso_vascularizacao_metafise.svg',
            3: 'assets/svg/infeccoes/svg_infec_02_classificacao_liquido_sinovial.svg',
            4: 'assets/svg/infeccoes/svg_infec_03_fisiopatologia_artrite_septica.svg',
            5: 'assets/svg/infeccoes/svg_infec_04_artrite_gonococica_vs_nao.svg',
            6: 'assets/svg/infeccoes/svg_infec_05_pediatria_kocher_posicao.svg',
            7: 'assets/svg/infeccoes/svg_infec_09_classificacao_cierny_gustilo.svg',
            8: 'assets/svg/infeccoes/svg_infec_07_fisiopatologia_osteomielite_sequestro.svg',
            9: 'assets/svg/infeccoes/svg_infec_08_cronologia_imagem_osteomielite.svg',
            10: 'assets/svg/infeccoes/svg_infec_10_algoritmo_terapeutico_integrated.svg',
        }
    }
]

def format_paragraph_text(p):
    """Formata o texto de um parágrafo preservando negrito e itálico dos runs."""
    runs = p.runs
    if not runs:
        return p.text.strip()
    
    parts = []
    for r in runs:
        t = r.text
        if not t:
            continue
        
        # Preserva espaços externos
        leading_space = ' ' if t.startswith(' ') and not t.strip() == '' else ''
        trailing_space = ' ' if t.endswith(' ') and not t.strip() == '' else ''
        core_text = t.strip()
        
        if not core_text:
            parts.append(t)
            continue
        
        if r.bold and r.italic:
            parts.append(f"{leading_space}***{core_text}***{trailing_space}")
        elif r.bold:
            parts.append(f"{leading_space}**{core_text}**{trailing_space}")
        elif r.italic:
            parts.append(f"{leading_space}*{core_text}*{trailing_space}")
        else:
            parts.append(t)
            
    res = "".join(parts).strip()
    # Limpa artefatos comuns como **** ou ****
    res = re.sub(r'\*\*\s*\*\*', '', res)
    return res

def format_table_as_markdown(table):
    """Converte tabela docx em tabela markdown com alinhamento limpo."""
    rows = table.rows
    if not rows:
        return ""
    
    table_matrix = []
    for row in rows:
        row_cells = []
        for cell in row.cells:
            # Pega o texto da célula, limpando quebras extras
            cell_text = " ".join(p.text.strip() for p in cell.paragraphs if p.text.strip())
            cell_text = cell_text.replace('|', '\\|')
            row_cells.append(cell_text)
        table_matrix.append(row_cells)
    
    if not table_matrix:
        return ""
    
    header = table_matrix[0]
    num_cols = len(header)
    
    md_lines = []
    # Header row
    md_lines.append("| " + " | ".join(header) + " |")
    # Separator
    md_lines.append("| " + " | ".join(["---"] * num_cols) + " |")
    
    # Body rows
    for row in table_matrix[1:]:
        # Ajusta comprimento caso células mescladas alterem contagem
        while len(row) < num_cols:
            row.append("")
        md_lines.append("| " + " | ".join(row[:num_cols]) + " |")
        
    return "\n".join(md_lines) + "\n"

def convert_document(config):
    docx_path = config['docx']
    md_path = config['md']
    svg_map = config['svg_map']
    
    if not os.path.exists(docx_path):
        print(f"ERRO: Arquivo {docx_path} não encontrado!")
        return
        
    doc = docx.Document(docx_path)
    output_lines = [f"# {config['title']}"]
    first_title_set = True
    
    for child in doc.element.body:
        if child.tag.endswith('p'):
            p = Paragraph(child, doc)
            raw_text = p.text.strip()
            if not raw_text:
                continue
                
            formatted = format_paragraph_text(p)
            
            # Se for figura
            fig_match = re.match(r'^Figura\s+(\d+)\s*:\s*(.+)$', raw_text, re.IGNORECASE)
            if fig_match:
                fig_num = int(fig_match.group(1))
                fig_caption = fig_match.group(2).strip()
                svg_file = svg_map.get(fig_num)
                
                # Gera o bloco de figura enriquecido com SVG embutido
                if svg_file and os.path.exists(svg_file):
                    fig_html = f"""
<div class="resumo-figure-card" id="figura-{fig_num}">
  <div class="figure-media-box" onclick="ResumosViewer.openLightbox('{svg_file}', 'Figura {fig_num}: {fig_caption}')" title="Clique para ampliar em tela cheia">
    <img src="{svg_file}" alt="Figura {fig_num}: {fig_caption}" class="resumo-svg-image" loading="lazy">
    <div class="figure-overlay-hint">
      <span class="btn-zoom-hint">🔍 Expandir Esquema em Alta Resolução</span>
    </div>
  </div>
  <p class="figure-caption"><strong>Figura {fig_num}:</strong> {fig_caption}</p>
</div>
"""
                    output_lines.append(fig_html.strip())
                else:
                    output_lines.append(f"*{formatted}*")
                continue
            
            # Cabeçalhos principais do tipo 1. 2. 3.
            # Nível 1: "1. Título" ou "2. Título" (ignora parágrafos longos explicativos com numeração)
            h3_match = re.match(r'^(\d+\.\d+\.\d+)\.?\s+(.+)$', raw_text)
            h2_match = re.match(r'^(\d+\.\d+)\.?\s+(.+)$', raw_text)
            h1_match = re.match(r'^(\d+)\.\s+(.+)$', raw_text)
            
            if h3_match and len(raw_text) <= 95:
                output_lines.append(f"#### {h3_match.group(1)} {h3_match.group(2)}")
            elif h2_match and len(raw_text) <= 95:
                output_lines.append(f"### {h2_match.group(1)} {h2_match.group(2)}")
            elif h1_match and len(raw_text) <= 95:
                # Se tiver dois pontos seguido de frase longa com ponto final, é parágrafo explicativo
                parts = raw_text.split(':', 1)
                if len(parts) == 2 and parts[1].strip().endswith('.') and len(parts[1].strip()) > 40:
                    output_lines.append(formatted)
                else:
                    output_lines.append(f"## {h1_match.group(1)}. {h1_match.group(2)}")
            elif p.style.name == 'List Bullet' or raw_text.startswith(('• ', '- ', '– ')):
                cleaned = re.sub(r'^[•\-\–]\s*', '', formatted)
                output_lines.append(f"- {cleaned}")
            else:
                # Parágrafo normal
                output_lines.append(formatted)
                    
        elif child.tag.endswith('tbl'):
            t = Table(child, doc)
            if len(t.rows) == 1 and len(t.columns) == 1:
                # Caixa de destaque (Callout Box)
                box_text = t.rows[0].cells[0].text.strip()
                if '🚨' in box_text or 'FOCO DE PROVA' in box_text.upper():
                    output_lines.append(f"> [!IMPORTANT]\n> {box_text}")
                elif '💡' in box_text or 'PEGADINHA' in box_text.upper():
                    output_lines.append(f"> [!TIP]\n> {box_text}")
                elif '📌' in box_text or 'CONCEITO' in box_text.upper() or 'OBJETIVO' in box_text.upper():
                    output_lines.append(f"> [!NOTE]\n> {box_text}")
                else:
                    output_lines.append(f"> {box_text}")
            else:
                # Tabela comparativa tradicional
                md_table = format_table_as_markdown(t)
                if md_table.strip():
                    output_lines.append(md_table.strip())
                    
    content = "\n\n".join(output_lines)
    
    # Salva no arquivo destino
    os.makedirs(os.path.dirname(md_path), exist_ok=True)
    with open(md_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Sucesso: {md_path} gerado com {len(output_lines)} blocos e figuras SVG embutidas!")

if __name__ == '__main__':
    for cfg in DOCS_CONFIG:
        convert_document(cfg)
