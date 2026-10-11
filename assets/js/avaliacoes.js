/* Life Montagens — página de avaliações (lê assets/data/avaliacoes.json) */

(() => {
  const lista = document.getElementById("rv-lista");
  if (!lista) return;
  const POR_PAGINA = 12;
  const maisBtn = document.getElementById("rv-mais");
  const ordem = document.getElementById("rv-ordem");
  const filtros = [...document.querySelectorAll("[data-filtro]")];
  const dialogo = document.getElementById("rv-foto");
  const dialogoImg = document.getElementById("rv-foto-img");
  let todas = [];
  let filtro = "todas";
  let mostrando = POR_PAGINA;

  const tempo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const dataLonga = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const relativo = (iso) => {
    const dias = Math.round((Date.now() - new Date(iso + "T12:00:00")) / 864e5);
    if (dias < 1) return "hoje";
    if (dias < 30) return tempo.format(-dias, "day");
    if (dias < 365) return tempo.format(-Math.round(dias / 30.4), "month");
    return tempo.format(-Math.round(dias / 365), "year");
  };
  // As fotos do Google aceitam o tamanho no fim do endereço
  const tamanho = (url, px) => url.replace(/=[^=/]*k-no$/, `=w${px}-h${px}-k-no`);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const estrelas = (nota, cls = "") => {
    const w = el("span", `stars-wrap ${cls}`);
    w.setAttribute("role", "img");
    w.setAttribute("aria-label", `${nota} de 5 estrelas`);
    w.innerHTML = `<svg class="base stars5" aria-hidden="true"><use href="#i-stars5"/></svg><svg class="fill stars5" aria-hidden="true" style="clip-path:inset(0 ${100 - nota * 20}% 0 0)"><use href="#i-stars5"/></svg>`;
    return w;
  };
  const avatar = (r) => {
    const a = el("span", "rv-avatar");
    a.textContent = (r.nome || "?").trim().charAt(0).toUpperCase();
    if (r.foto) {
      // A inicial fica por baixo; se a foto não carregar, ela continua visível
      const img = new Image(44, 44);
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => img.remove();
      img.src = r.foto;
      a.appendChild(img);
    }
    return a;
  };

  const cartao = (r) => {
    const c = el("article", "rv-card");
    const head = el("header");
    head.appendChild(avatar(r));
    const quem = el("div");
    quem.appendChild(el("b", "", r.nome));
    const meta = el("small");
    if (r.localGuide) meta.appendChild(el("span", "lg", "Local Guide · "));
    meta.append(r.qtdAvaliacoes === 1 ? "1 avaliação" : `${r.qtdAvaliacoes || 0} avaliações`);
    quem.appendChild(meta);
    head.appendChild(quem);
    c.appendChild(head);

    const linha = el("div", "rv-meta");
    linha.appendChild(estrelas(r.nota));
    const t = el("time", "", relativo(r.data));
    t.dateTime = r.data;
    t.title = dataLonga.format(new Date(r.data + "T12:00:00"));
    linha.appendChild(t);
    c.appendChild(linha);

    c.appendChild(r.texto ? el("p", "rv-text", r.texto) : el("p", "rv-text none", `Avaliou com ${r.nota} ${r.nota === 1 ? "estrela" : "estrelas"}, sem comentário.`));

    if (r.fotos?.length) {
      const fotos = el("div", "rv-photos");
      r.fotos.forEach((url, i) => {
        const b = el("button");
        b.type = "button";
        b.setAttribute("aria-label", `Ampliar foto ${i + 1} da avaliação de ${r.nome}`);
        const img = new Image(92, 92);
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        img.onerror = () => { if (img.src !== url) img.src = url; };
        img.src = tamanho(url, 240);
        b.appendChild(img);
        b.addEventListener("click", () => abrirFoto(url, `Foto enviada por ${r.nome}`));
        fotos.appendChild(b);
      });
      c.appendChild(fotos);
    }

    if (r.resposta?.texto) {
      const resp = el("div", "rv-reply");
      resp.appendChild(el("b", "", `Resposta da Life Montagens · ${relativo(r.resposta.data)}`));
      resp.append(r.resposta.texto);
      c.appendChild(resp);
    }

    if (r.link) {
      const a = el("a", "link-arrow", "Ver no Google");
      a.href = r.link;
      a.target = "_blank";
      a.rel = "noopener";
      a.insertAdjacentHTML("beforeend", '<svg aria-hidden="true"><use href="#i-arrow"/></svg>');
      c.appendChild(a);
    }
    return c;
  };

  function abrirFoto(url, alt) {
    dialogoImg.referrerPolicy = "no-referrer";
    dialogoImg.onerror = () => { if (dialogoImg.src !== url) dialogoImg.src = url; };
    dialogoImg.src = tamanho(url, 1200);
    dialogoImg.alt = alt;
    dialogo.showModal();
  }
  dialogo?.addEventListener("click", (e) => {
    if (e.target === dialogo || e.target.closest("[data-fechar]")) dialogo.close();
  });

  const visiveis = () => {
    let v = todas.filter((r) => filtro === "todas" || (filtro === "texto" ? r.texto : r.fotos?.length));
    const porData = (a, b) => b.data.localeCompare(a.data);
    switch (ordem.value) {
      case "antigas": v = v.sort((a, b) => a.data.localeCompare(b.data)); break;
      case "maior": v = v.sort((a, b) => b.nota - a.nota || porData(a, b)); break;
      case "menor": v = v.sort((a, b) => a.nota - b.nota || porData(a, b)); break;
      default: v = v.sort(porData);
    }
    return v;
  };

  const render = () => {
    const v = visiveis();
    lista.replaceChildren(...(v.length ? v.slice(0, mostrando).map(cartao) : [el("p", "rv-empty", "Nenhuma avaliação com esse filtro.")]));
    maisBtn.hidden = v.length <= mostrando;
    maisBtn.textContent = `Mostrar mais avaliações (${v.length - mostrando} restantes)`;
  };

  const resumo = (d) => {
    const nota = d.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    document.getElementById("rv-nota").textContent = nota;
    document.getElementById("rv-nota-estrelas").style.clipPath = `inset(0 ${100 - d.nota * 20}% 0 0)`;
    document.getElementById("rv-total").textContent = d.total;
    const barras = document.getElementById("rv-barras");
    const n = d.avaliacoes.length;
    barras.replaceChildren(...[5, 4, 3, 2, 1].map((s) => {
      const qtd = d.avaliacoes.filter((r) => r.nota === s).length;
      const b = el("div", "bar");
      b.setAttribute("aria-label", `${s} estrelas: ${qtd}`);
      b.innerHTML = `<span>${s}</span><span class="t"><span style="width:${n ? (qtd / n) * 100 : 0}%"></span></span><b>${qtd}</b>`;
      return b;
    }));
    const atual = new Date(d.atualizadoEm + "T12:00:00");
    document.getElementById("rv-atualizado").textContent = `Avaliações públicas do Google, atualizadas em ${dataLonga.format(atual)}.`;
    filtros.forEach((f) => {
      const qtd = f.dataset.filtro === "todas" ? n : d.avaliacoes.filter((r) => (f.dataset.filtro === "texto" ? r.texto : r.fotos?.length)).length;
      f.textContent = `${f.textContent.replace(/\s*\(\d+\)$/, "")} (${qtd})`;
    });
  };

  filtros.forEach((f) => f.addEventListener("click", () => {
    filtros.forEach((x) => x.setAttribute("aria-pressed", String(x === f)));
    filtro = f.dataset.filtro;
    mostrando = POR_PAGINA;
    render();
  }));
  ordem.addEventListener("change", () => { mostrando = POR_PAGINA; render(); });
  maisBtn.addEventListener("click", () => { mostrando += POR_PAGINA; render(); });

  fetch("assets/data/avaliacoes.json", { cache: "no-cache" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { todas = d.avaliacoes; resumo(d); render(); })
    .catch(() => {
      lista.replaceChildren(el("p", "rv-empty", "Não foi possível carregar as avaliações agora."));
      const a = el("a", "link-arrow", "Ver todas no Google");
      a.href = document.querySelector('[data-g="ver"]').href;
      a.target = "_blank";
      a.rel = "noopener";
      lista.firstChild.append(" ", a);
    });
})();
