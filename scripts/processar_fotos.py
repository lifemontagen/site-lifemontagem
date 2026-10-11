"""Atualiza as fotos de trabalhos do site a partir da pasta fotos/.

Como usar: coloque a foto em fotos/<categoria>/ com o título como nome do arquivo,
por exemplo  fotos/cozinhas/Cozinha planejada branca.jpg
O script gera as versões otimizadas (WebP), atualiza assets/data/trabalhos.json
e reescreve o álbum da página inicial e a grade da página de trabalhos.
Fotos apagadas da pasta saem do site. Fotos novas entram no começo da lista.

Uso:  python3 scripts/processar_fotos.py
Precisa do Pillow (pip install pillow pillow-heif para aceitar fotos HEIC do iPhone).
"""
import hashlib
import html
import json
import re
import unicodedata
from pathlib import Path

from PIL import Image, ImageOps

try:  # fotos .heic do iPhone
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass

RAIZ = Path(__file__).resolve().parent.parent
FOTOS = RAIZ / "fotos"
SAIDA = RAIZ / "assets" / "img" / "trabalhos"
DADOS = RAIZ / "assets" / "data" / "trabalhos.json"
EXTENSOES = {".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"}
NO_ALBUM_INICIAL = 15  # quantas fotos aparecem no álbum da página inicial

# pasta -> (chave, nome exibido)
CATEGORIAS = {
    "cozinhas": ("cozinhas", "Cozinhas"),
    "paineis-e-racks": ("paineis", "Painéis e racks de TV"),
    "guarda-roupas-e-armarios": ("armarios", "Guarda-roupas e armários"),
    "quarto-infantil": ("infantil", "Quarto infantil"),
    "outros": ("outros", "Outros ambientes"),
}


def slug(texto):
    t = unicodedata.normalize("NFKD", texto).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-") or "foto"


def titulo_do_arquivo(nome):
    t = re.sub(r"_+", " ", Path(nome).stem).strip()
    t = re.sub(r"\s+", " ", t)
    return t[:1].upper() + t[1:]


def assinatura(caminho):
    return hashlib.sha1(caminho.read_bytes()).hexdigest()[:12]


def gerar_imagens(origem, ident):
    im = ImageOps.exif_transpose(Image.open(origem)).convert("RGB")
    # versão grande sem corte, para o visualizador
    grande = im.copy()
    grande.thumbnail((1400, 1400), Image.LANCZOS)
    grande.save(SAIDA / f"{ident}-full.webp", "WEBP", quality=80, method=6)
    # versões 4:5 (mesmo formato em todo o site)
    w, h = im.size
    cw = min(w, int(h * 4 / 5))
    ch = int(cw * 5 / 4)
    x0, y0 = (w - cw) // 2, (h - ch) // 2
    corte = im.crop((x0, y0, x0 + cw, y0 + ch))
    for largura in (480, 800):
        corte.resize((largura, largura * 5 // 4), Image.LANCZOS).save(
            SAIDA / f"{ident}-{largura}.webp", "WEBP", quality=76, method=6)
    return grande.size


def html_album(fotos):
    linhas = []
    for i, f in enumerate(fotos[:NO_ALBUM_INICIAL]):
        t = html.escape(f["titulo"])
        base = f"assets/img/trabalhos/{f['id']}"
        linhas.append(
            f'      <figure class="shot"><a href="trabalhos.html#foto-{f["id"]}" aria-label="Ver {t} em tela cheia">'
            f'<img src="{base}-800.webp" srcset="{base}-480.webp 480w, {base}-800.webp 800w" '
            f'sizes="(max-width: 640px) 78vw, 340px" width="800" height="1000" loading="{"eager" if i < 3 else "lazy"}" '
            f'alt="{t}, trabalho da Life Montagens"></a><figcaption>{t}</figcaption></figure>')
    return "\n".join(linhas)


def html_filtros(fotos):
    usadas = [c for c in CATEGORIAS.values() if any(f["categoria"] == c[0] for f in fotos)]
    linhas = [f'          <button class="filter" type="button" data-cat="todos" aria-pressed="true">Todos <span class="n">{len(fotos)}</span></button>']
    for chave, nome in usadas:
        n = sum(1 for f in fotos if f["categoria"] == chave)
        linhas.append(f'          <button class="filter" type="button" data-cat="{chave}" aria-pressed="false">{nome} <span class="n">{n}</span></button>')
    return "\n".join(linhas)


def html_grade(fotos):
    nomes = {k: n for k, n in CATEGORIAS.values()}
    linhas = []
    for i, f in enumerate(fotos):
        t = html.escape(f["titulo"])
        cat = nomes[f["categoria"]]
        base = f"assets/img/trabalhos/{f['id']}"
        linhas.append(
            f'        <li class="work" data-cat="{f["categoria"]}" id="foto-{f["id"]}"><button type="button" data-full="{base}-full.webp" '
            f'data-thumb="{base}-480.webp" data-w="{f["w"]}" data-h="{f["h"]}" data-titulo="{t}" data-categoria="{cat}">'
            f'<img src="{base}-800.webp" srcset="{base}-480.webp 480w, {base}-800.webp 800w" '
            f'sizes="(max-width: 640px) 50vw, (max-width: 1100px) 33vw, 290px" width="800" height="1000" loading="{"eager" if i < 4 else "lazy"}" '
            f'alt="{t}, trabalho da Life Montagens">'
            f'<span class="work-zoom" aria-hidden="true"><svg><use href="#i-expand"/></svg></span></button>'
            f'<p class="work-cap"><b>{t}</b><span>{cat}</span></p></li>')
    return "\n".join(linhas)


def trocar(arquivo, marca, conteudo):
    texto = arquivo.read_text(encoding="utf-8")
    padrao = re.compile(rf"([ \t]*)(<!-- {marca}-INICIO -->).*?(<!-- {marca}-FIM -->)", re.S)
    novo, n = padrao.subn(lambda m: f"{m.group(1)}{m.group(2)}\n{conteudo}\n{m.group(1)}{m.group(3)}", texto)
    if not n:
        raise SystemExit(f"Marcador {marca} não encontrado em {arquivo.name}")
    arquivo.write_text(novo, encoding="utf-8")


def main():
    SAIDA.mkdir(parents=True, exist_ok=True)
    anteriores = json.loads(DADOS.read_text(encoding="utf-8")) if DADOS.exists() else []
    por_origem = {f["origem"]: f for f in anteriores}

    encontradas = []
    for pasta in sorted(p for p in FOTOS.iterdir() if p.is_dir()) if FOTOS.exists() else []:
        if pasta.name not in CATEGORIAS:
            print(f"Pasta ignorada (categoria desconhecida): fotos/{pasta.name}")
            continue
        for arq in sorted(pasta.iterdir()):
            if arq.suffix.lower() in EXTENSOES:
                encontradas.append(arq)

    ids_usados = set()
    atuais, novas = [], []
    for arq in encontradas:
        origem = arq.relative_to(RAIZ).as_posix()
        ass = assinatura(arq)
        antiga = por_origem.get(origem)
        ident = antiga["id"] if antiga else slug(arq.stem)
        while ident in ids_usados or (not antiga and any(f["id"] == ident for f in anteriores)):
            ident += "-2"
        ids_usados.add(ident)
        prontas = all((SAIDA / f"{ident}-{s}.webp").exists() for s in ("480", "800", "full"))
        if antiga and antiga["assinatura"] == ass and prontas:
            atuais.append(antiga)
            continue
        w, h = gerar_imagens(arq, ident)
        item = {"id": ident, "titulo": titulo_do_arquivo(arq.name), "categoria": CATEGORIAS[arq.parent.name][0],
                "w": w, "h": h, "origem": origem, "assinatura": ass}
        print(("Atualizada: " if antiga else "Nova: ") + origem)
        (atuais if antiga else novas).append(item)

    # ordem: novas primeiro, depois as que já existiam na ordem anterior
    ordem = {f["origem"]: i for i, f in enumerate(anteriores)}
    atuais.sort(key=lambda f: ordem.get(f["origem"], 0))
    fotos = novas + atuais

    # apaga imagens de fotos removidas
    validos = {f["id"] for f in fotos}
    for img in SAIDA.glob("*.webp"):
        ident = re.sub(r"-(480|800|full)$", "", img.stem)
        if ident not in validos:
            img.unlink()
            print(f"Removida: {img.name}")

    DADOS.write_text(json.dumps(fotos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    trocar(RAIZ / "index.html", "FOTOS", html_album(fotos))
    trocar(RAIZ / "trabalhos.html", "FILTROS", html_filtros(fotos))
    trocar(RAIZ / "trabalhos.html", "GRADE", html_grade(fotos))
    print(f"{len(fotos)} fotos no site.")


if __name__ == "__main__":
    main()
