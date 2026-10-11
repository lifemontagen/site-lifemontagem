"""Atualiza assets/data/avaliacoes.json com as avaliações públicas do Google.

Busca as avaliações do perfil da Life Montagens pela Apify (ator
compass/Google-Maps-Reviews-Scraper) e grava o arquivo lido pelo site.
Precisa da variável de ambiente APIFY_TOKEN. Só usa a biblioteca padrão.

Uso:  APIFY_TOKEN=... python3 scripts/atualizar_avaliacoes.py
      python3 scripts/atualizar_avaliacoes.py --entrada itens.json   (teste offline)
"""
import argparse
import datetime as dt
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

PERFIL = "https://www.google.com/maps?cid=8878258052331817972"
ATOR = "compass~Google-Maps-Reviews-Scraper"
ARQUIVO = Path(__file__).resolve().parent.parent / "assets" / "data" / "avaliacoes.json"
EMAIL = re.compile(r"\S+@\S+\s*")


def buscar(token):
    url = f"https://api.apify.com/v2/acts/{ATOR}/run-sync-get-dataset-items?format=json&clean=true"
    entrada = {
        "startUrls": [{"url": PERFIL}],
        "maxReviews": 2000,
        "reviewsSort": "newest",
        "language": "pt-BR",
        "personalData": True,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(entrada).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def foto_perfil(url):
    # foto pequena (120 px) em vez da original de 1920 px
    return re.sub(r"=s\d+", "=s120", url) if url else ""


def converter(itens):
    avaliacoes = []
    for i in itens:
        if not i.get("stars"):
            continue
        nome = EMAIL.sub("", i.get("name") or "").strip() or "Cliente do Google"
        resposta = None
        if i.get("responseFromOwnerText"):
            resposta = {
                "texto": i["responseFromOwnerText"].strip(),
                "data": (i.get("responseFromOwnerDate") or "")[:10],
            }
        avaliacoes.append({
            "nome": nome,
            "foto": foto_perfil(i.get("reviewerPhotoUrl")),
            "localGuide": bool(i.get("isLocalGuide")),
            "qtdAvaliacoes": i.get("reviewerNumberOfReviews") or 0,
            "nota": int(i["stars"]),
            "data": (i.get("publishedAtDate") or "")[:10],
            "texto": (i.get("text") or "").strip(),
            "fotos": i.get("reviewImageUrls") or [],
            "resposta": resposta,
            "link": i.get("reviewUrl") or "",
        })
    avaliacoes.sort(key=lambda a: a["data"], reverse=True)
    primeiro = itens[0] if itens else {}
    nota = primeiro.get("totalScore") or (round(sum(a["nota"] for a in avaliacoes) / len(avaliacoes), 1) if avaliacoes else 0)
    total = primeiro.get("reviewsCount") or len(avaliacoes)
    return {"nota": nota, "total": total, "avaliacoes": avaliacoes}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entrada", help="arquivo JSON com itens da Apify (para teste, sem chamar a API)")
    args = ap.parse_args()

    if args.entrada:
        itens = json.loads(Path(args.entrada).read_text(encoding="utf-8"))
    else:
        token = os.environ.get("APIFY_TOKEN")
        if not token:
            sys.exit("Defina a variável de ambiente APIFY_TOKEN.")
        itens = buscar(token)

    novo = converter(itens)
    if not novo["avaliacoes"]:
        sys.exit("Nenhuma avaliação recebida; arquivo mantido como está.")

    atual = json.loads(ARQUIVO.read_text(encoding="utf-8")) if ARQUIVO.exists() else {}
    comparar = lambda d: (d.get("nota"), d.get("total"), [(a["nome"], a["data"], a["nota"], a["texto"], a.get("resposta")) for a in d.get("avaliacoes", [])])
    if atual and comparar(atual) == comparar(novo):
        print("Nenhuma avaliação nova.")
        return

    saida = {"atualizadoEm": dt.date.today().isoformat(), **novo}
    ARQUIVO.write_text(json.dumps(saida, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Atualizado: nota {novo['nota']}, {novo['total']} avaliações, {len(novo['avaliacoes'])} exibidas.")


if __name__ == "__main__":
    main()
