# -*- coding: utf-8 -*-
"""
MEDINTEGRADA - UTILITÁRIO DE GESTÃO E INJEÇÃO AUTOMÁTICA DE SIMULADOS
Utilizado pela skill med-site-exam-crafter.

Comandos disponíveis:
  python manage_exam.py validate <arquivo.json>
  python manage_exam.py install <arquivo.json> [pasta: "UCT20 CAB" | "UCT20 Tutoria"]
  python manage_exam.py rebalance <arquivo.json>
  python manage_exam.py stats <arquivo.json>
  python manage_exam.py append <simulado_existente.json> <novas_questoes.json>
"""

import os
import sys
import json
import re
import random
import subprocess

script_dir = os.path.dirname(os.path.abspath(__file__))
curr = script_dir
project_root = curr
for _ in range(6):
    if os.path.exists(os.path.join(curr, "index.html")) or os.path.exists(os.path.join(curr, "scripts", "register_exam.py")):
        project_root = curr
        break
    curr = os.path.dirname(curr)

register_script = os.path.join(project_root, "scripts", "register_exam.py")

LETTERS_4 = ["A", "B", "C", "D"]
LETTERS_5 = ["A", "B", "C", "D", "E"]

def validate_exam(data):
    """Valida integridade estrutural, psicométrica e anti-bias de um simulado."""
    errors = []
    warnings = []

    for req_field in ["id", "title", "questions"]:
        if req_field not in data or not data[req_field]:
            errors.append(f"Campo obrigatório ausente ou vazio: '{req_field}'")

    questions = data.get("questions", [])
    if not isinstance(questions, list) or len(questions) == 0:
        errors.append("O simulado deve conter uma lista não vazia de questões.")
        return errors, warnings, {}

    answer_counts = {}
    consecutive_repeats = 0
    max_consecutive = 0
    last_ans = None

    for idx, q in enumerate(questions, 1):
        q_id = q.get("id", idx)
        stem = q.get("stem", "")
        options = q.get("options", [])
        ans = q.get("answer", "")
        rationale = q.get("rationale", "")
        distractors = q.get("distractors", [])

        # Checa dados vitais em negrito para grifos
        if "<strong>" not in stem:
            warnings.append(f"Questão {q_id}: Enunciado não possui termos em <strong>...</strong> (recomendado para grifo interativo).")

        # Checa opções
        if len(options) not in [4, 5]:
            errors.append(f"Questão {q_id}: Deve possuir 4 ou 5 opções (encontradas {len(options)}).")

        opt_letters = [o.get("letter", "") for o in options]
        if ans not in opt_letters:
            errors.append(f"Questão {q_id}: Gabarito '{ans}' não corresponde a nenhuma opção válida ({opt_letters}).")

        # Checa distratores
        expected_distractors = len(options) - 1
        if len(distractors) < expected_distractors:
            warnings.append(f"Questão {q_id}: Esperados {expected_distractors} distratores explicados, encontrados {len(distractors)}.")

        # Contagem para anti-bias
        answer_counts[ans] = answer_counts.get(ans, 0) + 1

        if ans == last_ans:
            consecutive_repeats += 1
            if consecutive_repeats > max_consecutive:
                max_consecutive = consecutive_repeats
        else:
            consecutive_repeats = 1
        last_ans = ans

    if max_consecutive > 2:
        warnings.append(f"Alerta Anti-Bias: Foram detectadas {max_consecutive} questões consecutivas com a mesma letra de gabarito (máximo recomendado: 2).")

    stats = {
        "total": len(questions),
        "distribution": answer_counts,
        "max_consecutive": max_consecutive
    }

    return errors, warnings, stats

def rebalance_exam_data(data):
    """Aplica o algoritmo anti-bias balanceando ~25% de cada letra e remapeando os distratores."""
    questions = data.get("questions", [])
    total = len(questions)
    if total == 0:
        return data

    num_opts = len(questions[0].get("options", []))
    letters = LETTERS_5 if num_opts == 5 else LETTERS_4
    per_letter = total // len(letters)

    pool = []
    for l in letters:
        pool.extend([l] * per_letter)
    while len(pool) < total:
        pool.append(letters[len(pool) % len(letters)])

    # Embaralha garantindo no máximo 2 consecutivas
    valid = False
    attempts = 0
    while not valid and attempts < 2000:
        attempts += 1
        random.shuffle(pool)
        valid = True
        for i in range(2, len(pool)):
            if pool[i] == pool[i - 1] == pool[i - 2]:
                valid = False
                break

    new_questions = []
    for idx, (q, target_ans) in enumerate(zip(questions, pool)):
        old_ans = q.get("answer")
        options = q.get("options", [])
        all_letters = [o["letter"] for o in options]

        correct_opt = next((o for o in options if o["letter"] == old_ans), None)
        distractor_opts = [o for o in options if o["letter"] != old_ans]
        remaining_letters = [l for l in all_letters if l != target_ans]
        random.shuffle(remaining_letters)

        letter_map = {old_ans: target_ans}
        for d_opt, new_l in zip(distractor_opts, remaining_letters):
            letter_map[d_opt["letter"]] = new_l

        # Remonta opções ordenadas
        new_opts = []
        for l in all_letters:
            old_l = next(k for k, v in letter_map.items() if v == l)
            orig = next(o for o in options if o["letter"] == old_l)
            new_opts.append({"letter": l, "text": orig["text"]})

        # Remapeia distratores
        new_distractors = []
        for d in q.get("distractors", []):
            match = re.match(r"^<strong>([A-E])([\s\S]*)$", d, re.IGNORECASE)
            if match:
                old_l = match.group(1).upper()
                new_l = letter_map.get(old_l, old_l)
                new_distractors.append(f"<strong>{new_l}{match.group(2)}")
            else:
                new_distractors.append(d)

        new_distractors.sort(key=lambda s: re.match(r"^<strong>([A-E])", s, re.IGNORECASE).group(1) if re.match(r"^<strong>([A-E])", s, re.IGNORECASE) else "")

        q_copy = dict(q)
        q_copy["options"] = new_opts
        q_copy["answer"] = target_ans
        q_copy["distractors"] = new_distractors
        new_questions.append(q_copy)

    data["questions"] = new_questions
    return data

def run_register():
    """Executa scripts/register_exam.py para compilar js/data.js."""
    if os.path.exists(register_script):
        res = subprocess.run([sys.executable, register_script], capture_output=True, text=True)
        if res.returncode == 0:
            print("✓ js/data.js regerado com sucesso!")
            return True
        else:
            print(f"✗ Erro ao regerar js/data.js: {res.stderr}")
            return False
    else:
        print(f"Aviso: register_exam.py não encontrado em {register_script}")
        return False

def cmd_install(json_file, folder="UCT20 CAB"):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    data["folder"] = folder
    data["total_questions"] = len(data.get("questions", []))

    errs, warns, stats = validate_exam(data)
    if errs:
        print("✗ Erros de validação encontrados:")
        for e in errs:
            print(f"  - {e}")
        sys.exit(1)

    if warns:
        print("⚠️ Avisos:")
        for w in warns:
            print(f"  - {w}")

    # Salva na subpasta e na raiz como compatibilidade
    filename = os.path.basename(json_file)
    target_folder_dir = os.path.join(project_root, "data", "simulados", folder)
    os.makedirs(target_folder_dir, exist_ok=True)
    dest_path = os.path.join(target_folder_dir, filename)

    with open(dest_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✓ Simulado salvo com sucesso em: {dest_path}")
    print(f"  Total de questões: {stats['total']}")
    print(f"  Distribuição do Gabarito: {stats['distribution']}")

    # Executa o registro
    run_register()

def cmd_rebalance(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    rebalanced = rebalance_exam_data(data)
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(rebalanced, f, ensure_ascii=False, indent=2)

    print(f"✓ Simulado rebalanceado com sucesso: {json_file}")
    errs, warns, stats = validate_exam(rebalanced)
    print(f"  Nova Distribuição: {stats['distribution']}")
    run_register()

def cmd_stats(json_file):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    errs, warns, stats = validate_exam(data)
    print("==========================================")
    print(f"Simulado: {data.get('title')} ({data.get('id')})")
    print(f"Pasta: {data.get('folder', 'UCT20 CAB')}")
    print(f"Total de Questões: {stats.get('total')}")
    print(f"Distribuição do Gabarito: {stats.get('distribution')}")
    print(f"Máximo de Consecutivas Iguais: {stats.get('max_consecutive')}")
    print("==========================================")
    if errs:
        print("Erros:")
        for e in errs:
            print(f"  ✗ {e}")
    if warns:
        print("Avisos:")
        for w in warns:
            print(f"  ⚠️ {w}")

def cmd_append(main_json_file, new_questions_file):
    with open(main_json_file, "r", encoding="utf-8") as f:
        main_data = json.load(f)
    with open(new_questions_file, "r", encoding="utf-8") as f:
        new_data = json.load(f)

    new_list = new_data.get("questions", new_data if isinstance(new_data, list) else [])
    current_count = len(main_data.get("questions", []))

    for idx, q in enumerate(new_list, current_count + 1):
        q["id"] = idx
        main_data["questions"].append(q)

    main_data["total_questions"] = len(main_data["questions"])

    with open(main_json_file, "w", encoding="utf-8") as f:
        json.dump(main_data, f, ensure_ascii=False, indent=2)

    print(f"✓ Adicionadas {len(new_list)} questões. Total atual: {main_data['total_questions']}.")
    run_register()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1].lower()
    target = sys.argv[2]

    if cmd == "validate":
        with open(target, "r", encoding="utf-8") as f:
            d = json.load(f)
        errs, warns, stats = validate_exam(d)
        print(f"Erros: {len(errs)} | Avisos: {len(warns)} | Total Questões: {stats.get('total', 0)}")
        for e in errs:
            print(f"✗ {e}")
        for w in warns:
            print(f"⚠️ {w}")
    elif cmd == "install":
        folder = sys.argv[3] if len(sys.argv) > 3 else "UCT20 CAB"
        cmd_install(target, folder)
    elif cmd == "rebalance":
        cmd_rebalance(target)
    elif cmd == "stats":
        cmd_stats(target)
    elif cmd == "append":
        if len(sys.argv) < 4:
            print("Uso: python manage_exam.py append <simulado_existente.json> <novas_questoes.json>")
            sys.exit(1)
        cmd_append(target, sys.argv[3])
    else:
        print(f"Comando desconhecido: {cmd}")
