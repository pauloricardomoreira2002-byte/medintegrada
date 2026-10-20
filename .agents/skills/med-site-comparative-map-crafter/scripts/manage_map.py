# -*- coding: utf-8 -*-
"""
MEDINTEGRADA • GERADOR & GERENCIADOR DE MAPAS COMPARATIVOS PANORÂMICOS
Utilizado pela skill med-site-comparative-map-crafter.

Comandos disponíveis:
  python manage_map.py build --input <mapa.json> [--folder "UCT20 CAB" | "UCT20 Tutoria"] [--id <id_opcional>]
  python manage_map.py validate --input <mapa.json>
  python manage_map.py list
  python manage_map.py reindex
"""

import os
import sys
import json
import argparse
import subprocess
import xml.etree.ElementTree as ET

# Localização das pastas do projeto
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
curr = SCRIPT_DIR
PROJECT_ROOT = curr
for _ in range(6):
    if os.path.exists(os.path.join(curr, "index.html")) or os.path.exists(os.path.join(curr, "scripts", "register_exam.py")):
        PROJECT_ROOT = curr
        break
    curr = os.path.dirname(curr)

MAPAS_DATA_DIR = os.path.join(PROJECT_ROOT, "data", "mapas")
MAPAS_HTML_DIR = os.path.join(PROJECT_ROOT, "assets", "mapas_html")
REGISTER_SCRIPT = os.path.join(PROJECT_ROOT, "scripts", "register_exam.py")

VALID_FOLDERS = ["UCT20 CAB", "UCT20 Tutoria"]

# Ícones médicos SVG padrão para doenças quando não fornecido
DEFAULT_ICONS = {
    "bone": """<path d="M12 2C8 2 5 5 5 8C5 9.5 5.8 10.8 7 11.6V18.4C5.8 19.2 5 20.5 5 22C5 25 8 28 12 28C16 28 19 25 19 22C19 20.5 18.2 19.2 17 18.4V11.6C18.2 10.8 19 9.5 19 8C19 5 16 2 12 2Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15" r="3" fill="#ffffff" opacity="0.8"/>""",
    "warning": """<circle cx="14" cy="14" r="11" fill="none" stroke="#ffffff" stroke-width="2"/><path d="M14 7V15M14 19V20" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>""",
    "crystal": """<path d="M14 3L23 9V20L14 26L5 20V9L14 3Z" fill="none" stroke="#ffffff" stroke-width="2"/><circle cx="14" cy="14.5" r="3.5" fill="#ffffff"/>""",
    "immune": """<circle cx="14" cy="14" r="10" fill="none" stroke="#ffffff" stroke-width="2"/><path d="M9 14L12 17L19 10" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>""",
    "dna": """<circle cx="10" cy="9" r="3" fill="#ffffff"/><circle cx="18" cy="18" r="4" fill="#ffffff"/><path d="M7 7L21 21" stroke="#ffffff" stroke-width="2" stroke-dasharray="2,2"/>""",
    "butterfly": """<path d="M14 5C10 8 6 7 6 12C6 16 10 17 14 15C18 17 22 16 22 12C22 7 18 8 14 5Z" fill="#ffffff"/><circle cx="14" cy="14" r="2" fill="#1e293b"/>""",
    "heart": """<path d="M14 6C11 2 5 3 5 9C5 15 14 22 14 22C14 22 23 15 23 9C23 3 17 2 14 6Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>""",
    "kidney": """<path d="M8 8C5 12 5 18 9 21C13 24 19 22 21 17C23 12 21 7 17 6C14 5 11 9 8 8Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "lungs": """<path d="M14 5V14M14 9C10 9 7 11 6 15C5 19 8 22 11 22C13 22 14 20 14 18M14 9C18 9 21 11 22 15C23 19 20 22 17 22C15 22 14 20 14 18" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "brain": """<path d="M14 4V24M10 5C7 6 5 9 5 12C5 14 6 16 8 17C6 19 6 22 10 23M18 5C21 6 23 9 23 12C23 14 22 16 20 17C22 19 22 22 18 23" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "virus": """<circle cx="14" cy="14" r="6" fill="none" stroke="#ffffff" stroke-width="2"/><path d="M14 4V7M14 21V24M4 14H7M21 14H24M7 7L9 9M19 19L21 21M7 21L9 19M19 7L21 9" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "drop": """<path d="M14 4C14 4 6 13 6 18C6 22.4 9.6 26 14 26C18.4 26 22 22.4 22 18C22 13 14 4 14 4Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "stomach": """<path d="M9 6C12 4 17 5 19 8C21 11 20 16 18 20C15 24 10 23 8 20C6 17 6 11 9 6Z" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>""",
    "default": """<circle cx="14" cy="14" r="10" fill="none" stroke="#ffffff" stroke-width="2"/><path d="M14 8V15M14 18V19" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>"""
}

def escape_xml(text):
    if not isinstance(text, str):
        text = str(text)
    return (text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace('"', "&quot;")
                .replace("'", "&apos;"))

def wrap_text(prefix, val, max_chars):
    """
    Quebra o texto em linhas respeitando o limite de max_chars por linha.
    Retorna uma lista de tuplas: (é_primeira_linha, prefixo_se_houver, pedaço_de_texto)
    """
    words = val.split(' ')
    lines = []
    current_line = []
    current_len = len(prefix) + 1
    first = True

    for w in words:
        if current_len + len(w) + 1 > max_chars:
            if first:
                lines.append((True, prefix, " ".join(current_line)))
                first = False
            else:
                lines.append((False, "", " ".join(current_line)))
            current_line = [w]
            current_len = 2 + len(w)
        else:
            current_line.append(w)
            current_len += len(w) + 1

    if current_line:
        if first:
            lines.append((True, prefix, " ".join(current_line)))
        else:
            lines.append((False, "", " ".join(current_line)))

    return lines

def build_comparative_map_svg(map_data):
    """
    Constrói o código SVG de alta fidelidade e resolução (FHD 1920)
    com garantia matemática de clearance anti-sobreposição.
    """
    width = 1920
    margin_x = 40
    content_width = 1840

    diseases = map_data.get("diseases", [])
    num_cols = len(diseases)
    if num_cols < 2 or num_cols > 4:
        raise ValueError(f"O mapa comparativo suporta de 2 a 4 patologias. Foram fornecidas {num_cols}.")

    # Espaçamento e limites de caracteres por coluna
    if num_cols == 2:
        col_gap = 24
        wrap_limit = 115
    elif num_cols == 3:
        col_gap = 20
        wrap_limit = 78
    else: # 4 colunas
        col_gap = 16
        wrap_limit = 54

    col_width = (content_width - (num_cols - 1) * col_gap) / num_cols
    cols_x = [margin_x + i * (col_width + col_gap) for i in range(num_cols)]

    # Cálculo dinâmico de alturas com garantia de clearance
    axes = map_data.get("axes", [])
    if len(axes) == 0:
        raise ValueError("O mapa deve conter pelo menos 1 eixo (padrão: 8 eixos clínicos).")

    for axis in axes:
        max_card_text_y = 0
        card_rendered_lines = []

        for col_i in range(num_cols):
            items = axis["data"][col_i] if col_i < len(axis.get("data", [])) else []
            line_y = 22
            col_lines = []
            for item in items:
                if isinstance(item, (list, tuple)) and len(item) >= 2:
                    prefix, val = item[0], item[1]
                elif isinstance(item, str):
                    prefix, val = "• ", item
                else:
                    prefix, val = "• ", str(item)

                wrapped = wrap_text(prefix, val, wrap_limit)
                for is_first, pfx, text_chunk in wrapped:
                    col_lines.append((line_y, is_first, pfx, text_chunk))
                    line_y += 16
                line_y += 2
            card_rendered_lines.append(col_lines)
            if col_lines:
                last_y = col_lines[-1][0]
                if last_y > max_card_text_y:
                    max_card_text_y = last_y

        # Clearance Guarantee: distância mínima de 14px entre último texto e a pílula
        min_required_h = max_card_text_y + 44
        configured_h = axis.get("height", 230)
        axis["computed_height"] = max(configured_h, min_required_h)
        axis["rendered_cards"] = card_rendered_lines

    # Posicionamento vertical
    header_height = 110
    col_header_y = 125
    col_header_height = 100
    curr_y = col_header_y + col_header_height + 15

    axes_positions = []
    for axis in axes:
        bar_y = curr_y
        cards_y = curr_y + 34
        card_h = axis["computed_height"]
        axes_positions.append({
            "bar_y": bar_y,
            "cards_y": cards_y,
            "card_h": card_h
        })
        curr_y = cards_y + card_h + 18

    footer_y = curr_y + 5
    total_svg_height = footer_y + 55

    # Montagem do SVG
    svg = []
    svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {total_svg_height}" width="{width}" height="{total_svg_height}">')
    
    # Definições de Estilos, Filtros e Gradientes
    svg.append('<defs>')
    svg.append('''
    <style>
      .font-sans { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; }
      .title { font-weight: 800; }
      .bold { font-weight: 700; }
      .semibold { font-weight: 600; }
      .regular { font-weight: 400; }
    </style>
    <filter id="mainShadow" x="-2%" y="-2%" width="104%" height="106%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.08"/>
    </filter>
    <filter id="cardShadow" x="-2%" y="-2%" width="104%" height="106%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.06"/>
    </filter>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="50%" stop-color="#f1f5f9"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
    <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#090d16"/>
      <stop offset="35%" stop-color="#0f172a"/>
      <stop offset="70%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    ''')

    for i, d in enumerate(diseases):
        dark_c = d.get('dark', '#1e293b')
        prim_c = d.get('primary', '#3b82f6')
        svg.append(f'''
        <linearGradient id="colGrad{i}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="{dark_c}"/>
          <stop offset="100%" stop-color="{prim_c}"/>
        </linearGradient>
        ''')
    svg.append('</defs>')

    # Background
    svg.append(f'<rect width="{width}" height="{total_svg_height}" fill="url(#bgGrad)"/>')

    # Hero Header Superior
    title = map_data.get("title", "MAPA COMPARATIVO INTEGRADO")
    subtitle = map_data.get("subtitle", "UCT • MEDICINA INTEGRADA • RACIOCÍNIO CLÍNICO & MORFOFUNCIONAL")
    meta_chips = map_data.get("meta_chips", [f"{num_cols} PATOLOGIAS", f"{len(axes)} EIXOS CLÍNICOS", "PADRÃO ENAMED / REVALIDA"])

    svg.append(f'''
    <!-- HERO HEADER -->
    <g transform="translate(40, 20)">
      <rect width="{content_width}" height="{header_height - 20}" rx="14" fill="url(#heroGrad)" filter="url(#mainShadow)"/>
      <rect x="0" y="0" width="8" height="{header_height - 20}" rx="4" fill="#38bdf8"/>
      
      <text x="32" y="38" class="font-sans title" font-size="24" fill="#ffffff" letter-spacing="0.5">
        {escape_xml(title)}
      </text>
      <text x="32" y="65" class="font-sans semibold" font-size="13" fill="#94a3b8">
        {escape_xml(subtitle)}
      </text>

      <!-- Badges / Chips à direita -->
      <g transform="translate({content_width - 560}, 24)">
        <rect width="135" height="30" rx="15" fill="#1e3a8a"/>
        <text x="67" y="19" class="font-sans semibold" font-size="11" fill="#93c5fd" text-anchor="middle">{escape_xml(meta_chips[0] if len(meta_chips)>0 else '')}</text>

        <rect x="145" width="145" height="30" rx="15" fill="#14532d"/>
        <text x="217" y="19" class="font-sans semibold" font-size="11" fill="#86efac" text-anchor="middle">{escape_xml(meta_chips[1] if len(meta_chips)>1 else '')}</text>

        <rect x="300" width="245" height="30" rx="15" fill="#701a75"/>
        <text x="422" y="19" class="font-sans semibold" font-size="11" fill="#f5d0fe" text-anchor="middle">{escape_xml(meta_chips[2] if len(meta_chips)>2 else '')}</text>
      </g>
    </g>
    ''')

    # Cabeçalhos das Colunas
    svg.append('<!-- CABEÇALHOS DAS COLUNAS -->')
    for i, d in enumerate(diseases):
        x = cols_x[i]
        icon_raw = d.get("icon")
        if not icon_raw:
            icon_key = d.get("icon_type", "default")
            icon_raw = DEFAULT_ICONS.get(icon_key, DEFAULT_ICONS["default"])

        svg.append(f'''
        <g transform="translate({x}, {col_header_y})">
          <rect width="{col_width}" height="{col_header_height}" rx="12" fill="url(#colGrad{i})" filter="url(#cardShadow)"/>
          <rect x="0" y="{col_header_height - 4}" width="{col_width}" height="4" fill="{d.get('border', '#3b82f6')}"/>
          
          <rect x="16" y="12" width="180" height="20" rx="10" fill="{d.get('badge_bg', '#e2e8f0')}"/>
          <text x="106" y="26" class="font-sans bold" font-size="10" fill="{d.get('badge_text', '#1e293b')}" text-anchor="middle" letter-spacing="0.5">
            {escape_xml(d.get('tag', 'CATEGORIA'))}
          </text>

          <g transform="translate({col_width - 44}, 12)">
            {icon_raw}
          </g>

          <text x="16" y="58" class="font-sans title" font-size="20" fill="#ffffff">
            {escape_xml(d.get('name', 'NOME DA DOENÇA'))}
          </text>

          <text x="16" y="82" class="font-sans semibold" font-size="11.5" fill="#e2e8f0" opacity="0.95">
            {escape_xml(d.get('subtitle', 'Subtítulo descritivo'))}
          </text>
        </g>
        ''')

    # Linhas dos Eixos Clínicos
    for a_idx, axis in enumerate(axes):
        pos = axes_positions[a_idx]
        b_y = pos["bar_y"]
        c_y = pos["cards_y"]
        c_h = pos["card_h"]
        rendered_cards = axis["rendered_cards"]

        axis_num_str = str(axis.get('num', a_idx + 1))
        axis_title_str = axis.get('title', 'TÍTULO DO EIXO')
        axis_theme_str = axis.get('theme', '')

        svg.append(f'''
        <!-- EIXO {axis_num_str} BARRA DE TÍTULO -->
        <g transform="translate(40, {b_y})">
          <rect width="{content_width}" height="30" rx="6" fill="#1e293b"/>
          <rect x="0" y="0" width="6" height="30" rx="3" fill="#38bdf8"/>
          
          <text x="16" y="20" class="font-sans bold" font-size="12" fill="#38bdf8" letter-spacing="0.5">
            EIXO {escape_xml(axis_num_str)}: {escape_xml(axis_title_str)}
          </text>
          <text x="{content_width - 16}" y="20" class="font-sans regular" font-size="11" fill="#94a3b8" text-anchor="end">
            {escape_xml(axis_theme_str)}
          </text>
        </g>
        ''')

        # Cartões de cada doença para este eixo
        for col_i in range(num_cols):
            x = cols_x[col_i]
            d = diseases[col_i]
            col_lines = rendered_cards[col_i]
            highlights_list = axis.get("highlights", [])
            highlight_text = highlights_list[col_i] if col_i < len(highlights_list) else ""

            svg.append(f'''
            <!-- Eixo {axis_num_str} Cartão Coluna {col_i+1} -->
            <g transform="translate({x}, {c_y})">
              <rect width="{col_width}" height="{c_h}" rx="10" fill="#ffffff" stroke="{d.get('border', '#cbd5e1')}" stroke-width="1.2" stroke-opacity="0.45" filter="url(#cardShadow)"/>
              <rect x="0" y="0" width="5" height="{c_h}" rx="2.5" fill="{d.get('primary', '#3b82f6')}"/>
            ''')

            # Renderizar linhas de texto pré-quebradas
            for l_y, is_first, pfx, text_chunk in col_lines:
                if is_first:
                    svg.append(f'<text x="16" y="{l_y}" class="font-sans" font-size="11.5">')
                    svg.append(f'<tspan class="bold" fill="{d.get("dark", "#1e293b")}">{escape_xml(pfx)} </tspan>')
                    svg.append(f'<tspan fill="#334155">{escape_xml(text_chunk)}</tspan></text>')
                else:
                    svg.append(f'<text x="24" y="{l_y}" class="font-sans" font-size="11.5"><tspan fill="#334155">{escape_xml(text_chunk)}</tspan></text>')

            # Pílula inferior com pérola psicométrica (★)
            pill_y = c_h - 28
            svg.append(f'''
              <rect x="12" y="{pill_y}" width="{col_width - 24}" height="22" rx="6" fill="{d.get('badge_bg', '#f1f5f9')}"/>
              <text x="{col_width / 2}" y="{pill_y + 15}" class="font-sans bold" font-size="10.5" fill="{d.get('badge_text', '#0f172a')}" text-anchor="middle">
                ★ {escape_xml(highlight_text)}
              </text>
            </g>
            ''')

    # Rodapé
    footer_left = map_data.get("footer_left", "MEDINTEGRADA • MAPA COMPARATIVO CLÍNICO INTEGRADO")
    footer_right = map_data.get("footer_right", "Fontes: UpToDate (2024-2026), Diretrizes e Livros-Texto de Referência.")

    svg.append(f'''
    <!-- RODAPÉ -->
    <g transform="translate(40, {footer_y})">
      <rect width="{content_width}" height="42" rx="8" fill="#1e293b"/>
      <text x="20" y="26" class="font-sans semibold" font-size="11" fill="#cbd5e1">
        {escape_xml(footer_left)}
      </text>
      <text x="{content_width - 20}" y="26" class="font-sans regular" font-size="11" fill="#94a3b8" text-anchor="end">
        {escape_xml(footer_right)}
      </text>
    </g>
    ''')

    svg.append('</svg>')
    full_svg_text = '\n'.join(svg)

    # Validação estrita de XML
    try:
        ET.fromstring(full_svg_text)
    except ET.ParseError as pe:
        raise ValueError(f"Erro de sintaxe XML no SVG gerado: {pe}")

    return full_svg_text, (width, total_svg_height)

def build_standalone_html(svg_content, title):
    """Gera um arquivo HTML autocontido e responsivo para visualização direta em nova aba."""
    return f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape_xml(title)} • MedIntegrada HD</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #090d16;
      color: #f8fafc;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 16px;
      overflow-x: auto;
    }}
    .map-container {{
      max-width: 1920px;
      width: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 40px -15px rgba(0,0,0,0.7);
      overflow: hidden;
      margin: 0 auto;
    }}
    .map-container svg {{
      display: block;
      width: 100%;
      height: auto;
    }}
    .toolbar-info {{
      width: 100%;
      max-width: 1920px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #0f172a;
      border: 1px solid #1e293b;
      border-radius: 8px;
      font-size: 13px;
      color: #94a3b8;
    }}
    .toolbar-info strong {{ color: #38bdf8; }}
  </style>
</head>
<body>
  <div class="toolbar-info">
    <span>Visualizador HD • <strong>MedIntegrada</strong></span>
    <span>Use o zoom do navegador (Ctrl + Scroll) para ampliar qualquer seção</span>
  </div>
  <div class="map-container">
{svg_content}
  </div>
</body>
</html>"""

def build_and_install_map(input_path, folder="UCT20 CAB", map_id=None, reindex=True, generate_png=False):
    """Executa o ciclo completo de compilação, salvamento em pastas e reindexação."""
    if folder not in VALID_FOLDERS:
        raise ValueError(f"Pasta inválida '{folder}'. Opções permitidas: {VALID_FOLDERS}")

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Identificador do mapa
    clean_id = map_id or data.get("id")
    if not clean_id:
        base_name = os.path.basename(input_path).replace(".json", "")
        clean_id = base_name if base_name.startswith("mapa_") else f"mapa_{base_name}"

    data["id"] = clean_id
    data["folder"] = folder
    data["type"] = "svg_map"
    data["category"] = data.get("category", "panoramicos")
    data["categoryLabel"] = data.get("categoryLabel", "Mapa Comparativo Panorâmico")

    # Extrai patologias se ausente
    if "pathologies" not in data and "diseases" in data:
        data["pathologies"] = [d.get("name", "") for d in data["diseases"] if d.get("name")]

    print(f"--> Construindo mapa comparativo '{clean_id}' ({len(data.get('diseases', []))} patologias)...")
    svg_content, (w, h) = build_comparative_map_svg(data)
    dimensions_str = f"{w} × {h} px"
    data["dimensions"] = dimensions_str

    # Pastas de destino
    folder_html_dir = os.path.join(MAPAS_HTML_DIR, folder)
    folder_json_dir = os.path.join(MAPAS_DATA_DIR, folder)
    os.makedirs(folder_html_dir, exist_ok=True)
    os.makedirs(folder_json_dir, exist_ok=True)
    os.makedirs(MAPAS_HTML_DIR, exist_ok=True)

    # Nomes de arquivos
    svg_filename = f"{clean_id}.svg"
    html_filename = f"{clean_id}.html"
    json_filename = f"{clean_id}.json"

    # Salva SVG na pasta da disciplina e na raiz de assets/mapas_html
    target_svg_folder = os.path.join(folder_html_dir, svg_filename)
    target_svg_root = os.path.join(MAPAS_HTML_DIR, svg_filename)
    with open(target_svg_folder, "w", encoding="utf-8") as f:
        f.write(svg_content)
    with open(target_svg_root, "w", encoding="utf-8") as f:
        f.write(svg_content)

    # Salva HTML na pasta da disciplina e na raiz de assets/mapas_html
    html_content = build_standalone_html(svg_content, data.get("title", clean_id))
    target_html_folder = os.path.join(folder_html_dir, html_filename)
    target_html_root = os.path.join(MAPAS_HTML_DIR, html_filename)
    with open(target_html_folder, "w", encoding="utf-8") as f:
        f.write(html_content)
    with open(target_html_root, "w", encoding="utf-8") as f:
        f.write(html_content)

    # Registra caminhos no JSON
    data["svgPath"] = f"assets/mapas_html/{folder}/{svg_filename}"
    data["htmlPath"] = f"assets/mapas_html/{folder}/{html_filename}"

    # Salva JSON na pasta de dados da disciplina
    target_json_path = os.path.join(folder_json_dir, json_filename)
    with open(target_json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ SVG gravado com sucesso em: assets/mapas_html/{folder}/{svg_filename}")
    print(f"✓ HTML visualizador gravado em: assets/mapas_html/{folder}/{html_filename}")
    print(f"✓ Matriz JSON gravada em: data/mapas/{folder}/{json_filename}")

    # Pré-visualização PNG opcional
    if generate_png:
        edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        if os.path.exists(edge_path):
            png_path = os.path.join(folder_html_dir, f"{clean_id}.png")
            temp_html = target_html_folder + ".temp.html"
            with open(temp_html, "w", encoding="utf-8") as tf:
                tf.write(html_content)
            try:
                subprocess.run([
                    edge_path,
                    "--headless",
                    "--disable-gpu",
                    "--hide-scrollbars",
                    f"--window-size={w},{h}",
                    f"--screenshot={png_path}",
                    "file:///" + temp_html.replace("\\", "/")
                ], capture_output=True, text=True, check=True)
                print(f"✓ Pré-visualização PNG gerada em: {png_path}")
            except Exception as e:
                print(f"Aviso ao renderizar PNG: {e}")
            finally:
                if os.path.exists(temp_html):
                    os.remove(temp_html)

    # Reindexação automática no aplicativo
    if reindex and os.path.exists(REGISTER_SCRIPT):
        print("\n--> Reindexando plataforma MedIntegrada (scripts/register_exam.py)...")
        res = subprocess.run([sys.executable, REGISTER_SCRIPT], capture_output=True, text=True)
        print(res.stdout)
        if res.returncode != 0:
            print(f"Aviso de erro no registro: {res.stderr}")

    print("\n==================================================")
    print(f"  MAPA COMPARATIVO INSTALADO COM SUCESSO!")
    print(f"  Título: {data.get('title')}")
    print(f"  Pasta: {folder}")
    print(f"  Dimensões: {dimensions_str}")
    print(f"  Doenças ({len(data.get('diseases', []))}): {', '.join(data.get('pathologies', []))}")
    print("==================================================")
    return target_json_path

def validate_map_data(input_path):
    """Valida a estrutura do JSON e os clearances anti-sobreposição."""
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    errors = []
    warnings = []

    for req in ["title", "diseases", "axes"]:
        if req not in data:
            errors.append(f"Campo obrigatório ausente: '{req}'")

    diseases = data.get("diseases", [])
    if len(diseases) < 2 or len(diseases) > 4:
        errors.append(f"Esperadas entre 2 e 4 patologias, encontradas {len(diseases)}.")

    axes = data.get("axes", [])
    if len(axes) < 4 or len(axes) > 10:
        warnings.append(f"Recomenda-se entre 6 e 8 eixos clínicos adaptados ao tema (encontrados {len(axes)}).")

    try:
        svg_code, (w, h) = build_comparative_map_svg(data)
        print(f"✓ SVG compilado com sucesso e XML validado ({w} × {h} px).")
    except Exception as e:
        errors.append(f"Falha na compilação do SVG: {e}")

    print("==================================================")
    print(f"  VALIDAÇÃO DO MAPA: {data.get('title', input_path)}")
    print("==================================================")
    if errors:
        print(f"✗ Erros encontrados ({len(errors)}):")
        for err in errors:
            print(f"  - {err}")
    else:
        print("✓ Nenhum erro crítico detectado!")

    if warnings:
        print(f"\n! Avisos ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    print("==================================================")
    return len(errors) == 0

def list_maps():
    """Lista todos os mapas presentes nas pastas de dados."""
    print("==================================================")
    print("  MAPAS COMPARATIVOS REGISTRADOS NO MEDINTEGRADA")
    print("==================================================")
    for folder in VALID_FOLDERS:
        f_dir = os.path.join(MAPAS_DATA_DIR, folder)
        print(f"\n📂 Pasta: {folder}")
        if not os.path.isdir(f_dir):
            print("  (Diretório ainda não criado)")
            continue
        files = [f for f in os.listdir(f_dir) if f.endswith(".json")]
        if not files:
            print("  (Nenhum mapa cadastrado)")
            continue
        for f in files:
            p = os.path.join(f_dir, f)
            try:
                with open(p, "r", encoding="utf-8") as jf:
                    meta = json.load(jf)
                print(f"  • [{meta.get('id', f)}] {meta.get('title')}")
                print(f"    Dimensões: {meta.get('dimensions', 'N/D')} | Doenças: {', '.join(meta.get('pathologies', []))}")
            except Exception as e:
                print(f"  • {f} (Erro de leitura: {e})")
    print("==================================================")

def main():
    parser = argparse.ArgumentParser(description="Gerenciador e Compilador de Mapas Comparativos MedIntegrada")
    subparsers = parser.add_subparsers(dest="command")

    # Comando BUILD
    build_p = subparsers.add_parser("build", help="Compila e instala mapa comparativo no aplicativo")
    build_p.add_argument("--input", "-i", required=True, help="Caminho do arquivo JSON do mapa")
    build_p.add_argument("--folder", "-f", default="UCT20 CAB", choices=VALID_FOLDERS, help="Pasta de destino ('UCT20 CAB' ou 'UCT20 Tutoria')")
    build_p.add_argument("--id", help="Identificador único customizado (ex: mapa_espondiloartrites)")
    build_p.add_argument("--no-reindex", action="store_true", help="Não executar register_exam.py após compilar")
    build_p.add_argument("--png", action="store_true", help="Gerar pré-visualização em PNG")

    # Comando VALIDATE
    val_p = subparsers.add_parser("validate", help="Valida integridade e sintaxe de um JSON de mapa")
    val_p.add_argument("--input", "-i", required=True, help="Caminho do arquivo JSON a validar")

    # Comando LIST
    subparsers.add_parser("list", help="Lista todos os mapas cadastrados")

    # Comando REINDEX
    subparsers.add_parser("reindex", help="Reexecuta scripts/register_exam.py")

    args = parser.parse_args()

    if args.command == "build":
        build_and_install_map(
            input_path=args.input,
            folder=args.folder,
            map_id=args.id,
            reindex=not args.no_reindex,
            generate_png=args.png
        )
    elif args.command == "validate":
        validate_map_data(args.input)
    elif args.command == "list":
        list_maps()
    elif args.command == "reindex":
        if os.path.exists(REGISTER_SCRIPT):
            subprocess.run([sys.executable, REGISTER_SCRIPT])
        else:
            print(f"Erro: {REGISTER_SCRIPT} não encontrado.")
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
