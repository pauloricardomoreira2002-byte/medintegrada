# -*- coding: utf-8 -*-
"""
MEDINTEGRADA - UTILITÁRIO DE REGISTRO E COMPILAÇÃO DE CONTEÚDOS
Execução: python scripts/register_exam.py

Escaneará:
- data/resumos/*.md
- data/simulados/*.json
- assets/mapas_html (Mapas Panorâmicos Comparativos em SVG)
e regerará o arquivo js/data.js atualizado para carregar tudo 100% offline.
"""

import os
import json

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
resumos_dir = os.path.join(base_dir, "data", "resumos")
simulados_dir = os.path.join(base_dir, "data", "simulados")
mapas_html_dir = os.path.join(base_dir, "assets", "mapas_html")
docx_dir = os.path.join(base_dir, "assets", "docx")

print("==================================================")
print("  MEDINTEGRADA • REGISTRADOR & COMPILADOR DE DADOS")
print("==================================================")

# 1. Carregar Resumos Detalhados (.md) por Pastas
resumos_data = []
folders_to_scan = [("UCT20 CAB", os.path.join(resumos_dir, "UCT20 CAB")), ("UCT20 Tutoria", os.path.join(resumos_dir, "UCT20 Tutoria"))]
seen_ids = set()

# Escanear subpastas UCT20 CAB e UCT20 Tutoria
for folder_name, folder_path in folders_to_scan:
    if os.path.isdir(folder_path):
        for f in sorted(os.listdir(folder_path)):
            if f.endswith(".md"):
                p = os.path.join(folder_path, f)
                with open(p, "r", encoding="utf-8") as rfile:
                    content = rfile.read()

                first_heading = ""
                for line in content.split("\n"):
                    if line.startswith("# "):
                        first_heading = line.replace("# ", "").strip()
                        break

                clean_id = f.replace(".md", "").replace("resumo_", "")
                title = first_heading or clean_id.replace("_", " ").title()

                docx_path = ""
                if os.path.isdir(docx_dir):
                    for df in os.listdir(docx_dir):
                        if clean_id.split("_")[0] in df.lower():
                            docx_path = f"assets/docx/{df}"
                            break

                seen_ids.add(clean_id)
                resumos_data.append({
                    "id": clean_id,
                    "title": title,
                    "author": "Docentes UCT20",
                    "module": f"{folder_name} • 7º Período de Medicina",
                    "folder": folder_name,
                    "theme": title.split(":")[0],
                    "readingTime": f"{max(10, len(content)//2000)} min",
                    "tags": [clean_id.replace("_", " ").title(), folder_name, "Medicina", "Clínica Médica"],
                    "mdFile": f"data/resumos/{folder_name}/{f}",
                    "docxFile": docx_path or f"data/resumos/{folder_name}/{f}",
                    "content": content
                })

# Fallback: se houver algum .md na raiz de data/resumos não lido ainda
if os.path.isdir(resumos_dir):
    for f in sorted(os.listdir(resumos_dir)):
        if f.endswith(".md"):
            clean_id = f.replace(".md", "").replace("resumo_", "")
            if clean_id not in seen_ids:
                p = os.path.join(resumos_dir, f)
                with open(p, "r", encoding="utf-8") as rfile:
                    content = rfile.read()
                first_heading = ""
                for line in content.split("\n"):
                    if line.startswith("# "):
                        first_heading = line.replace("# ", "").strip()
                        break
                title = first_heading or clean_id.replace("_", " ").title()
                docx_path = ""
                if os.path.isdir(docx_dir):
                    for df in os.listdir(docx_dir):
                        if clean_id.split("_")[0] in df.lower():
                            docx_path = f"assets/docx/{df}"
                            break
                seen_ids.add(clean_id)
                resumos_data.append({
                    "id": clean_id,
                    "title": title,
                    "author": "Docentes UCT20",
                    "module": "UCT20 CAB • 7º Período de Medicina",
                    "folder": "UCT20 CAB",
                    "theme": title.split(":")[0],
                    "readingTime": f"{max(10, len(content)//2000)} min",
                    "tags": [clean_id.replace("_", " ").title(), "UCT20 CAB", "Medicina", "Clínica Médica"],
                    "mdFile": f"data/resumos/{f}",
                    "docxFile": docx_path or f"data/resumos/{f}",
                    "content": content
                })

print(f"✓ Resumos compilados: {len(resumos_data)} (distribuídos por pastas)")

# 2. Carregar Apenas os Mapas Panorâmicos Comparativos
mapas_data = []

# Mapa 1: Patologias do Aparelho Locomotor
locomotor_svg_path = os.path.join(mapas_html_dir, "mapa_comparativo_patologias_locomotor.svg")
locomotor_content = ""
if os.path.exists(locomotor_svg_path):
    with open(locomotor_svg_path, "r", encoding="utf-8", errors="ignore") as f:
        locomotor_content = f.read()

mapas_data.append({
    "id": "mapa_locomotor",
    "title": "Mapa Comparativo Panorâmico: Patologias do Aparelho Locomotor",
    "subtitle": "Quadro Sinóptico de Diagnóstico Diferencial Integrado",
    "folder": "UCT20 CAB",
    "category": "panoramicos",
    "categoryLabel": "Mapa Panorâmico Integrado",
    "dimensions": "1920 × 2756 px",
    "htmlPath": "assets/mapas_html/mapa_comparativo_patologias_locomotor.html",
    "svgPath": "assets/mapas_html/mapa_comparativo_patologias_locomotor.svg",
    "type": "svg_map",
    "svgContent": locomotor_content,
    "desc": "Confronto sistemático e multidimensional entre Artrite Reumatoide, Gota Úrica, Lúpus Eritematoso Sistêmico, Mieloma Múltiplo e Infecções Osteoarticulares (Artrite Séptica e Osteomielite). Abrange fisiopatologia, clínica diferencial, raio-X e alvos terapêuticos."
})

# Mapa 2: Mieloma Múltiplo vs Lúpus Eritematoso Sistêmico
mm_les_svg_path = os.path.join(mapas_html_dir, "mapa_comparativo_mieloma_vs_lupus.svg")
mm_les_content = ""
if os.path.exists(mm_les_svg_path):
    with open(mm_les_svg_path, "r", encoding="utf-8", errors="ignore") as f:
        mm_les_content = f.read()

mapas_data.append({
    "id": "mapa_mm_vs_les",
    "title": "Mapa Comparativo: Mieloma Múltiplo vs Lúpus Eritematoso Sistêmico",
    "subtitle": "Confronto Imunológico, Renal e Hematológico",
    "folder": "UCT20 CAB",
    "category": "panoramicos",
    "categoryLabel": "Confronto Discriminador Fino",
    "dimensions": "1920 × 2541 px",
    "htmlPath": "assets/mapas_html/mapa_comparativo_mieloma_vs_lupus.html",
    "svgPath": "assets/mapas_html/mapa_comparativo_mieloma_vs_lupus.svg",
    "type": "svg_map",
    "svgContent": mm_les_content,
    "desc": "Matriz analítica confrontando proliferação plasmocitária clonal maligna com autoimunidade sistêmica por perda de tolerância. Comparação minuciosa entre lesão renal por cilindros vs glomerulonefrite mediada por imunocomplexos, critérios CRAB vs EULAR/ACR 2019 e condutas."
})

print(f"✓ Mapas Panorâmicos Comparativos compilados: {len(mapas_data)}")

# 3. Carregar Simulados JSON por Pastas
simulados_data = []
seen_sim_ids = set()
sim_folders = [("UCT20 CAB", os.path.join(simulados_dir, "UCT20 CAB")), ("UCT20 Tutoria", os.path.join(simulados_dir, "UCT20 Tutoria"))]

for s_folder, s_path in sim_folders:
    if os.path.isdir(s_path):
        for fname in sorted(os.listdir(s_path)):
            if fname.endswith(".json"):
                sim_file = os.path.join(s_path, fname)
                with open(sim_file, "r", encoding="utf-8") as sf:
                    sim_json = json.load(sf)
                    sim_json["folder"] = s_folder
                    seen_sim_ids.add(sim_json.get("id"))
                    simulados_data.append(sim_json)

# Fallback: raiz de data/simulados
if os.path.isdir(simulados_dir):
    for fname in sorted(os.listdir(simulados_dir)):
        if fname.endswith(".json"):
            sim_file = os.path.join(simulados_dir, fname)
            with open(sim_file, "r", encoding="utf-8") as sf:
                sim_json = json.load(sf)
                if sim_json.get("id") not in seen_sim_ids:
                    sim_json["folder"] = "UCT20 CAB"
                    seen_sim_ids.add(sim_json.get("id"))
                    simulados_data.append(sim_json)

total_questions = sum(len(s.get("questions", [])) for s in simulados_data)
print(f"✓ Simulados compilados: {len(simulados_data)} ({total_questions} questões)")

# 4. Gravar js/data.js
js_content = "/**\n * MEDINTEGRADA - CENTRAL DE DADOS & METADADOS\n * Carregamento offline 100% autônomo\n */\n\n"
js_content += "window.MED_RESUMOS = " + json.dumps(resumos_data, ensure_ascii=False, indent=2) + ";\n\n"
js_content += "window.MED_MAPAS = " + json.dumps(mapas_data, ensure_ascii=False, indent=2) + ";\n\n"
js_content += "window.MED_SIMULADOS = " + json.dumps(simulados_data, ensure_ascii=False, indent=2) + ";\n"

out_js = os.path.join(base_dir, "js", "data.js")
with open(out_js, "w", encoding="utf-8") as jf:
    jf.write(js_content)

print(f"--> Sucesso! Arquivo js/data.js regerado com {len(js_content)} caracteres.")
print("==================================================")
