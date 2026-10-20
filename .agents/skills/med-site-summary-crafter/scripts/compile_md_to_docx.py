# -*- coding: utf-8 -*-
"""
Compilador Automático de Resumos Médicos: Markdown (.md) -> Word (.docx)
Lê o arquivo Markdown estruturado pelo padrão MedIntegrada,
localiza os esquemas vetoriais SVG, renderiza os PNGs em 2x Retina (se necessário),
e constrói o documento .docx formatado editorialmente via OpenXML.
"""

import os
import sys
import re
import docx
from docx.shared import Inches, Pt, RGBColor

# Importa módulos locais de estilo e renderização
script_dir = os.path.dirname(os.path.abspath(__file__))
skill_dir = os.path.dirname(script_dir)
sys.path.insert(0, os.path.join(skill_dir, "templates"))
sys.path.insert(0, script_dir)

try:
    import docx_styles
    from render_svg import render_svgs
except ImportError as e:
    print(f"Erro ao importar módulos locais: {e}")

def compile_summary(md_file_path, output_docx_path, temp_png_dir=None):
    if not os.path.exists(md_file_path):
        print(f"Erro: Arquivo Markdown não encontrado: {md_file_path}")
        return False

    project_root = os.path.abspath(os.path.join(skill_dir, "..", "..", ".."))

    with open(md_file_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    # Prepara diretório temporário para renderizar PNGs
    if not temp_png_dir:
        temp_png_dir = os.path.join(project_root, "scratch", "temp_pngs")
    os.makedirs(temp_png_dir, exist_ok=True)

    # Identifica todos os SVGs mencionados no Markdown
    svg_paths = re.findall(r'src=["\']([^"\']+\.svg)["\']', md_text)
    svg_abs_map = {}
    for rel_path in svg_paths:
        abs_p = os.path.normpath(os.path.join(project_root, rel_path))
        if os.path.exists(abs_p):
            svg_abs_map[rel_path] = abs_p

    # Renderiza SVGs para PNG
    svg_to_png = {}
    if svg_abs_map:
        print(f"Renderizando {len(svg_abs_map)} esquemas vetoriais para 2x Retina PNG...")
        # Cria subpasta temporária de SVGs se estiverem espalhados
        unique_svg_dirs = set(os.path.dirname(p) for p in svg_abs_map.values())
        for sdir in unique_svg_dirs:
            render_svgs(sdir, temp_png_dir, width=900, height=500, scale=2)

        for rel, abs_p in svg_abs_map.items():
            base_name = os.path.splitext(os.path.basename(abs_p))[0]
            png_p = os.path.join(temp_png_dir, f"{base_name}.png")
            if os.path.exists(png_p):
                svg_to_png[rel] = png_p

    # Inicializa Documento Word
    doc = docx.Document()
    docx_styles.setup_page_a4(doc, margin_in=0.8)

    lines = md_text.split("\n")
    i = 0
    in_code = False

    while i < lines.length if hasattr(lines, 'length') else i < len(lines):
        line = lines[i]
        trimmed = line.strip()

        if not trimmed:
            i += 1
            continue

        # Título Principal (H1)
        if trimmed.startswith("# "):
            title_text = trimmed[2:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(0)
            p.paragraph_format.space_after = Pt(12)
            run = p.add_run(title_text)
            run.font.name = "Arial"
            run.font.size = Pt(20)
            run.font.bold = True
            run.font.color.rgb = RGBColor(30, 58, 138)
            i += 1
            continue

        # Heading 1 (##)
        if trimmed.startswith("## "):
            h1_text = trimmed[3:].strip()
            docx_styles.add_heading_1(doc, h1_text)
            i += 1
            continue

        # Heading 2 (###)
        if trimmed.startswith("### "):
            h2_text = trimmed[4:].strip()
            docx_styles.add_heading_2(doc, h2_text)
            i += 1
            continue

        # Heading 3 (####)
        if trimmed.startswith("#### "):
            h3_text = trimmed[5:].strip()
            docx_styles.add_heading_3(doc, h3_text)
            i += 1
            continue

        # Callout Boxes (> [!IMPORTANT], > [!TIP], > [!NOTE], etc.)
        if trimmed.startswith("> [!IMPORTANT]") or trimmed.startswith("> [!TIP]") or trimmed.startswith("> [!NOTE]") or trimmed.startswith("> [!WARNING]"):
            box_type = "blue"
            title = "CONCEITO-CHAVE"
            if "IMPORTANT" in trimmed or "WARNING" in trimmed:
                box_type = "red"
                title = "FOCO DE PROVA"
            elif "TIP" in trimmed:
                box_type = "amber"
                title = "PEGADINHA DE BANCA"

            callout_content = []
            while i + 1 < len(lines) and lines[i + 1].strip().startswith(">"):
                i += 1
                cleaned_line = re.sub(r'^>\s*', '', lines[i].strip())
                if cleaned_line:
                    callout_content.append(cleaned_line)

            full_text = " ".join(callout_content)
            # Remove prefixo duplicado de emoji se houver
            full_text = re.sub(r'^[🚨📌💡⚠️✓]\s*[^:]+:\s*', '', full_text)
            docx_styles.create_callout_box(doc, full_text, title=title, box_type=box_type)
            i += 1
            continue

        # Tabela Markdown (| ... |)
        if trimmed.startswith("|") and trimmed.endswith("|"):
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1

            if len(table_lines) >= 3:
                # Linha 0 = Cabeçalho, Linha 1 = Separador, Linhas 2+ = Dados
                headers = [c.strip() for c in table_lines[0].split("|")[1:-1]]
                data_rows = []
                for row_line in table_lines[2:]:
                    cells = [c.strip() for c in row_line.split("|")[1:-1]]
                    data_rows.append(cells)

                # Larguras padrão
                num_cols = len(headers)
                col_w = Inches(6.6 / max(1, num_cols))
                widths = [col_w] * num_cols

                docx_styles.format_zebra_table(doc, headers, data_rows, widths)
            continue

        # Cartão de Figura HTML ou tag img
        if "<div class=\"resumo-figure-card\"" in trimmed or "<figure" in trimmed or trimmed.startswith("<img"):
            fig_block = []
            while i < len(lines):
                fig_block.append(lines[i])
                if "</div>" in lines[i] or "</figure>" in lines[i] or (trimmed.startswith("<img") and ">" in lines[i]):
                    break
                i += 1
            full_fig_html = "\n".join(fig_block)

            # Extrai o caminho da imagem e a legenda
            src_m = re.search(r'src=["\']([^"\']+)["\']', full_fig_html)
            cap_m = re.search(r'<p class="figure-caption">(.*?)</p>', full_fig_html, re.DOTALL)
            caption_text = ""
            if cap_m:
                caption_text = re.sub(r'<[^>]+>', '', cap_m.group(1)).strip()

            if src_m:
                svg_rel = src_m.group(1)
                base_name = os.path.splitext(os.path.basename(svg_rel))[0]
                png_path = svg_to_png.get(svg_rel)
                if not png_path:
                    test_p = os.path.join(temp_png_dir, f"{base_name}.png")
                    if os.path.exists(test_p):
                        png_path = test_p

                if png_path and os.path.exists(png_path):
                    docx_styles.insert_figure(doc, png_path, caption_text or f"Figura: {base_name}", width_inches=6.2)
                else:
                    print(f"Aviso: PNG para figura {svg_rel} não encontrado, inserindo marcador textual.")
                    doc.add_paragraph(f"[{caption_text or svg_rel}]")

            i += 1
            continue

        # Item de Lista com marcador (- ou •)
        if trimmed.startswith("- ") or trimmed.startswith("• ") or trimmed.startswith("* "):
            bullet_text = trimmed[2:].strip()
            parts = bullet_text.split(":", 1)
            if len(parts) == 2 and len(parts[0]) < 50:
                docx_styles.add_bullet(doc, parts[0].strip(), parts[1].strip())
            else:
                docx_styles.add_bullet(doc, "•", bullet_text)
            i += 1
            continue

        # Separador horizontal (--- ou ―――)
        if trimmed.startswith("---") or trimmed.startswith("―――"):
            i += 1
            continue

        # Parágrafo normal
        # Verifica se começa com negrito de destaque: **Texto:** restante
        bold_prefix_m = re.match(r'^\*\*([^*]+)\*\*:?\s*(.*)$', trimmed)
        if bold_prefix_m:
            prefix = bold_prefix_m.group(1) + ": "
            rest = bold_prefix_m.group(2)
            docx_styles.add_paragraph_styled(doc, rest, bold_prefix=prefix)
        else:
            cleaned_p = re.sub(r'\*\*([^*]+)\*\*', r'\1', trimmed)
            cleaned_p = re.sub(r'\*([^*]+)\*', r'\1', cleaned_p)
            docx_styles.add_paragraph_styled(doc, cleaned_p)

        i += 1

    os.makedirs(os.path.dirname(os.path.abspath(output_docx_path)), exist_ok=True)
    doc.save(output_docx_path)
    print(f"\n✓ Documento Word gerado com sucesso: {output_docx_path}")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python compile_md_to_docx.py <arquivo.md> <saida.docx>")
        sys.exit(1)
    compile_summary(sys.argv[1], sys.argv[2])
