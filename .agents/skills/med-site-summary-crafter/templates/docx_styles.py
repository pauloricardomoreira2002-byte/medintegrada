# -*- coding: utf-8 -*-
"""
Módulo de Estilização OpenXML e Componentes Visuais para python-docx
Utilizado pela skill med-site-summary-crafter para construir resumos médicos de alto padrão editorial.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def setup_page_a4(doc, margin_in=0.8):
    """Configura o documento no padrão A4 com margens otimizadas (2.0 cm)."""
    for section in doc.sections:
        section.page_width = Inches(8.27)
        section.page_height = Inches(11.69)
        section.top_margin = Inches(margin_in)
        section.bottom_margin = Inches(margin_in)
        section.left_margin = Inches(margin_in)
        section.right_margin = Inches(margin_in)

def set_cell_background(cell, fill_hex):
    """Aplica cor de preenchimento de fundo em uma célula de tabela via OpenXML."""
    shading_elm = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading_elm)

def set_cell_margins(cell, top=140, bottom=140, left=180, right=180):
    """Define o padding interno (margens) de uma célula de tabela em dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def create_callout_box(doc, text_content, title="FOCO DE PROVA", box_type="blue", width_inches=6.6):
    """
    Cria uma caixa de destaque (Callout Box) estilizada com borda esquerda espessa e fundo colorido.
    Tipos disponíveis:
    - 'blue': Foco de Prova / Mecanismo Molecular / Ponto Crítico
    - 'amber': Pegadinha de Avaliação / Atenção Aluno
    - 'red': Alerta Grave / Emergência / Risco Vital
    - 'green': Gabarito Oficial / Resolução Comentada
    """
    colors = {
        "blue": {"border": "2563EB", "fill": "EFF6FF", "title_col": RGBColor(30, 58, 138), "icon": "📌"},
        "amber": {"border": "D97706", "fill": "FFFBEB", "title_col": RGBColor(180, 83, 9), "icon": "⚠️"},
        "red": {"border": "DC2626", "fill": "FEF2F2", "title_col": RGBColor(185, 28, 28), "icon": "🚨"},
        "green": {"border": "059669", "fill": "ECFDF5", "title_col": RGBColor(6, 95, 70), "icon": "✓"},
    }
    cfg = colors.get(box_type, colors["blue"])

    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False
    tbl.columns[0].width = Inches(width_inches)

    cell = tbl.cell(0, 0)
    set_cell_background(cell, cfg["fill"])
    set_cell_margins(cell, top=140, bottom=140, left=200, right=180)

    # Borda esquerda grossa (36 dxa ~ 4.5pt), demais sem borda
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = parse_xml(
        f'<w:tcBorders {nsdecls("w")}>'
        f'<w:top w:val="none"/>'
        f'<w:left w:val="single" w:sz="36" w:space="0" w:color="{cfg["border"]}"/>'
        f'<w:bottom w:val="none"/>'
        f'<w:right w:val="none"/>'
        f'</w:tcBorders>'
    )
    tcPr.append(tcBorders)

    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.line_spacing = 1.15

    run_t = p.add_run(f"{cfg['icon']} {title}: ")
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(11)
    run_t.font.bold = True
    run_t.font.color.rgb = cfg["title_col"]

    run_body = p.add_run(text_content)
    run_body.font.name = "Calibri"
    run_body.font.size = Pt(10.5)
    run_body.font.color.rgb = RGBColor(30, 41, 59)

    # Respiro pós-caixa
    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(2)
    p_after.paragraph_format.space_after = Pt(6)

def add_heading_1(doc, text):
    """Adiciona um Título de Nível 1 com estilo e cor Navy."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(8)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(30, 58, 138)
    return p

def add_heading_2(doc, text):
    """Adiciona um Título de Nível 2 com estilo e cor Royal Blue."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(4)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.color.rgb = RGBColor(37, 99, 235)
    return p

def add_heading_3(doc, text):
    """Adiciona um Título de Nível 3 com estilo e cor Slate."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Arial"
    run.font.size = Pt(11.5)
    run.font.bold = True
    run.font.color.rgb = RGBColor(71, 85, 105)
    return p

def add_paragraph_styled(doc, text, bold_prefix="", italic_suffix=""):
    """Adiciona parágrafo formatado com entrelinhas 1.15 e justificado."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(5)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Calibri"
        r_pre.font.size = Pt(11)
        r_pre.font.bold = True
        r_pre.font.color.rgb = RGBColor(30, 41, 59)

    r_body = p.add_run(text)
    r_body.font.name = "Calibri"
    r_body.font.size = Pt(11)
    r_body.font.color.rgb = RGBColor(51, 65, 85)

    if italic_suffix:
        r_suf = p.add_run(" " + italic_suffix)
        r_suf.font.name = "Calibri"
        r_suf.font.size = Pt(10.5)
        r_suf.font.italic = True
        r_suf.font.color.rgb = RGBColor(100, 116, 139)
    return p

def add_bullet(doc, title, description):
    """Adiciona item de lista com marcador padronizado."""
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_before = Pt(1)
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    r_t = p.add_run(title + ": ")
    r_t.font.name = "Calibri"
    r_t.font.size = Pt(11)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(30, 41, 59)

    r_d = p.add_run(description)
    r_d.font.name = "Calibri"
    r_d.font.size = Pt(11)
    r_d.font.color.rgb = RGBColor(51, 65, 85)
    return p

def insert_figure(doc, img_path, caption_text, width_inches=6.2):
    """Insere imagem centralizada com legenda padronizada em itálico."""
    if os.path.exists(img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run = p_img.add_run()
        run.add_picture(img_path, width=Inches(width_inches))

        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_before = Pt(2)
        p_cap.paragraph_format.space_after = Pt(10)

        r_cap = p_cap.add_run(caption_text)
        r_cap.font.name = "Calibri"
        r_cap.font.size = Pt(9.5)
        r_cap.font.italic = True
        r_cap.font.color.rgb = RGBColor(71, 85, 105)
    else:
        print(f"Alerta: Arquivo de imagem não encontrado: {img_path}")

def format_zebra_table(doc, headers, data, col_widths, header_bg="1E3A8A"):
    """Cria e estiliza uma tabela profissional zebrada no documento."""
    tbl = doc.add_table(rows=len(data) + 1, cols=len(headers))
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    tbl.autofit = False

    # Cabeçalho
    for j, h in enumerate(headers):
        cell = tbl.cell(0, j)
        cell.width = col_widths[j]
        set_cell_background(cell, header_bg)
        set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
        p = cell.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = p.add_run(h)
        r.font.name = "Calibri"
        r.font.size = Pt(10)
        r.font.bold = True
        r.font.color.rgb = RGBColor(255, 255, 255)

    # Linhas de dados zebradas
    for i, row in enumerate(data):
        fill = "F8FAFC" if i % 2 == 0 else "FFFFFF"
        for j, val in enumerate(row):
            cell = tbl.cell(i + 1, j)
            cell.width = col_widths[j]
            set_cell_background(cell, fill)
            set_cell_margins(cell, top=80, bottom=80, left=100, right=100)
            p = cell.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            r = p.add_run(str(val))
            r.font.name = "Calibri"
            r.font.size = Pt(9.5)
            r.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)
    return tbl
