# -*- coding: utf-8 -*-
"""
Utilitário de Renderização de SVGs em Lote para PNG em Alta Resolução (Retina 2x)
Usa o motor Chromium/Edge headless nativo do sistema operacional Windows/Linux/macOS.
Utilizado pela skill med-site-summary-crafter.
"""

import os
import sys
import subprocess
import glob

def find_browser_executable():
    paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
    ]
    for p in paths:
        if os.path.exists(p):
            return p
    # Linux / macOS fallback
    for name in ["microsoft-edge", "google-chrome", "chromium", "google-chrome-stable"]:
        res = subprocess.run(["where" if os.name == "nt" else "which", name], capture_output=True, text=True)
        if res.returncode == 0:
            return res.stdout.strip().splitlines()[0]
    return None

def render_svgs(svg_dir, png_dir, width=900, height=500, scale=2):
    browser = find_browser_executable()
    if not browser:
        print("Erro: Nenhum executável do Edge ou Chrome encontrado no sistema.", file=sys.stderr)
        sys.exit(1)

    svg_dir = os.path.abspath(svg_dir)
    png_dir = os.path.abspath(png_dir)
    os.makedirs(png_dir, exist_ok=True)

    svg_files = glob.glob(os.path.join(svg_dir, "*.svg"))
    if not svg_files:
        print(f"Nenhum arquivo .svg encontrado em: {svg_dir}")
        return

    print(f"Navegador localizado: {browser}")
    print(f"Processando {len(svg_files)} arquivos SVG com escala {scale}x...")

    temp_html = os.path.join(png_dir, "_temp_render.html")

    for svg_path in svg_files:
        base_name = os.path.splitext(os.path.basename(svg_path))[0]
        png_path = os.path.join(png_dir, f"{base_name}.png")

        # Gerar o invólucro HTML temporário com fundo transparente
        with open(temp_html, "w", encoding="utf-8") as f:
            f.write(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ background: transparent; overflow: hidden; }}
</style>
</head>
<body>
<img src="file:///{svg_path.replace(os.sep, '/')}" style="display:block; width: {width}px;" />
</body>
</html>""")

        args = [
            browser,
            "--headless=new",
            "--disable-gpu",
            f"--force-device-scale-factor={scale}",
            "--hide-scrollbars",
            f"--screenshot={png_path}",
            f"--window-size={width},{height}",
            temp_html
        ]

        subprocess.run(args, capture_output=True)
        if os.path.exists(png_path) and os.path.getsize(png_path) > 0:
            print(f"✓ Renderizado: {base_name}.png ({os.path.getsize(png_path)} bytes)")
        else:
            print(f"✗ Falha ao renderizar: {base_name}.svg")

    if os.path.exists(temp_html):
        os.remove(temp_html)

    print("\nRenderização em lote concluída com sucesso!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python render_svg.py <diretorio_svg> <diretorio_png> [largura] [altura] [escala]")
        sys.exit(1)
    s_dir = sys.argv[1]
    p_dir = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 900
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 500
    sc = int(sys.argv[5]) if len(sys.argv) > 5 else 2
    render_svgs(s_dir, p_dir, w, h, sc)
