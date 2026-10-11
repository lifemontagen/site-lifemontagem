/* Life Montagens — comportamento do site */

const CONFIG = {
  whatsapp: "5511980157249",
  mensagemPadrao: "Olá! Conheci a Life Montagens pelo site e gostaria de solicitar um orçamento. Poderia me orientar?",
};

const waLink = (texto) => `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(texto)}`;
const reduzMovimento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Links diretos do WhatsApp
document.querySelectorAll("[data-wa]").forEach((a) => { a.href = waLink(CONFIG.mensagemPadrao); });

// Ano no rodapé
const ano = document.getElementById("ano");
if (ano) ano.textContent = new Date().getFullYear();

// Menu do celular
const toggle = document.querySelector(".menu-toggle");
const nav = document.getElementById("menu-principal");
if (toggle && nav) {
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
  });
  matchMedia("(min-width: 901px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
}

// Orçamento por cômodo: itens com quantidade, nome e cidade
const pedido = document.getElementById("pedido");
const barra = document.getElementById("select-bar");
if (pedido) {
  const comodos = [...document.querySelectorAll(".room[data-room]")];
  const paineis = [...document.querySelectorAll(".panel[data-room]")];
  const vazio = document.getElementById("comodos-vazio");
  const lista = document.getElementById("pedido-lista");
  const total = document.getElementById("pedido-total");
  const rotulo = document.getElementById("pedido-botao");
  const barraTexto = document.getElementById("select-bar-texto");
  const erro = document.getElementById("pedido-erro");
  const icone = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;
  const esc = (t) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  let ticketVisivel = false;

  const painelDe = (id) => paineis.find((p) => p.dataset.room === id);

  // Detalhe por unidade: portas (guarda-roupa), módulos (modular e cozinha) e tamanho (rack e painel)
  const SPECS = {
    portas: { rotulo: "portas", vazio: "Quantas portas?", opcoes: Array.from({ length: 11 }, (_, i) => i + 2).map((n) => [String(n), `${n} portas`]) },
    modulos: { rotulo: "módulos", vazio: "Quantos módulos?", opcoes: Array.from({ length: 20 }, (_, i) => i + 1).map((n) => [String(n), `${n} ${n === 1 ? "módulo" : "módulos"}`]) },
    metros: { rotulo: "tamanho", vazio: "Arraste para o tamanho", opcoes: Array.from({ length: 18 }, (_, i) => (0.8 + i * 0.1).toFixed(2)).map((m) => [m, `${m.replace(".", ",")} m`]) },
  };
  const detalhes = new Map(); // "cômodo|item|ação|n" -> valor escolhido
  const chave = (p, item, acao, n) => `${p.dataset.room}|${item}|${acao}|${n}`;
  const desenharSpecs = (li) => {
    const spec = li.dataset.spec;
    const tipo = SPECS[spec];
    const caixa = li.querySelector(".specs");
    const p = li.closest(".panel");
    const linhas = [];
    li.querySelectorAll(".acao").forEach((a) => {
      const acao = a.dataset.acao;
      const out = a.querySelector("output");
      const n = Number(out.textContent);
      for (let i = 1; i <= n; i++) {
        const k = chave(p, out.dataset.item, acao, i);
        const row = document.createElement("div");
        row.className = `spec ${acao}`;
        const nomeUn = `${acao === "montar" ? "Montar" : "Desmontar"}${n > 1 ? ` ${i}` : ""}`;
        row.innerHTML = `<span class="spec-who">${nomeUn}</span>`;
        const texto = (v) => (v ? tipo.opcoes.find(([x]) => x === v)[1] : tipo.vazio);
        if (spec === "metros") {
          // Tamanho: barra de arrastar de 0,80 a 2,50 m
          const wrap = document.createElement("span");
          wrap.className = "spec-range";
          const range = document.createElement("input");
          range.type = "range"; range.min = "0.8"; range.max = "2.5"; range.step = "0.1";
          range.value = detalhes.get(k) || "1.6";
          range.setAttribute("aria-label", `Tamanho: ${out.dataset.item}, ${nomeUn}`);
          const val = document.createElement("output");
          const pintar = () => {
            const v = detalhes.get(k);
            val.textContent = texto(v);
            row.classList.toggle("unset", !v);
            range.style.setProperty("--p", `${((Number(range.value) - 0.8) / 1.7) * 100}%`);
          };
          range.addEventListener("input", () => { detalhes.set(k, Number(range.value).toFixed(2)); pintar(); resumo(); });
          wrap.append(range, val);
          row.appendChild(wrap);
          pintar();
        } else {
          // Portas e módulos: contador; o primeiro "+" já marca o mínimo
          const min = Number(tipo.opcoes[0][0]);
          const max = Number(tipo.opcoes[tipo.opcoes.length - 1][0]);
          const st = document.createElement("span");
          st.className = "spec-step";
          st.innerHTML = `<button type="button" data-d="-1">${icone("i-minus")}</button><output></output><button type="button" data-d="1">${icone("i-plus")}</button>`;
          const [menos, val, mais] = st.children;
          menos.setAttribute("aria-label", `Menos ${tipo.rotulo}: ${out.dataset.item}, ${nomeUn}`);
          mais.setAttribute("aria-label", `Mais ${tipo.rotulo}: ${out.dataset.item}, ${nomeUn}`);
          const pintar = () => {
            const v = detalhes.get(k);
            val.textContent = texto(v);
            row.classList.toggle("unset", !v);
            menos.disabled = !v;
            mais.disabled = Number(v) >= max;
          };
          st.addEventListener("click", (e) => {
            const b = e.target.closest("[data-d]");
            if (!b) return;
            const atual = Number(detalhes.get(k) || 0);
            let novo = atual ? atual + Number(b.dataset.d) : (b.dataset.d === "1" ? min : 0);
            if (novo < min) novo = 0;
            novo = Math.min(max, novo);
            if (novo) detalhes.set(k, String(novo)); else detalhes.delete(k);
            pintar();
            resumo();
          });
          row.appendChild(st);
          pintar();
        }
        linhas.push(row);
      }
    });
    caixa.replaceChildren(...linhas);
    caixa.hidden = !linhas.length;
  };
  const textoDetalhe = (p, item, acao, qtd, spec) => {
    if (!spec) return "";
    const tipo = SPECS[spec];
    const vals = [];
    for (let i = 1; i <= qtd; i++) {
      const v = detalhes.get(chave(p, item, acao, i));
      if (v) vals.push(tipo.opcoes.find(([x]) => x === v)[1]);
    }
    return vals.join("; ");
  };
  // Pedido separado por serviço: montar, desmontar e pequenos reparos
  const ACOES = [["montar", "Montar"], ["desmontar", "Desmontar"], ["reparo", "Pequenos reparos"]];
  const escolhidos = () => ACOES
    .map(([acao, titulo]) => ({
      titulo,
      itens: paineis.filter((p) => !p.hidden).flatMap((p) =>
        [...p.querySelectorAll(`output[data-acao="${acao}"]`)]
          .map((o) => {
            const qtd = Number(o.textContent);
            const spec = o.closest(".item").dataset.spec;
            return { nome: o.dataset.item, comodo: acao === "reparo" ? "" : p.dataset.nome, qtd, det: textoDetalhe(p, o.dataset.item, acao, qtd, spec) };
          })
          .filter((i) => i.qtd > 0)),
    }))
    .filter((g) => g.itens.length);

  const resumo = () => {
    const grupos = escolhidos();
    const n = grupos.reduce((s, g) => s + g.itens.reduce((t, i) => t + i.qtd, 0), 0);
    lista.innerHTML = grupos.length
      ? grupos.map((g) =>
          `<div class="order-group"><h5>${esc(g.titulo)}</h5><ul>${g.itens.map((i) =>
            `<li><span>${esc(i.nome)}${i.comodo ? ` <small>· ${esc(i.comodo)}</small>` : ""}${i.det ? `<span class="det">${esc(i.det)}</span>` : ""}</span><b>${i.qtd}</b></li>`).join("")}</ul></div>`).join("")
      : '<p class="empty">Os itens que você marcar aparecem aqui.</p>';
    total.textContent = n;
    total.classList.toggle("has", n > 0);
    rotulo.textContent = n ? `Enviar pedido (${n} ${n === 1 ? "item" : "itens"})` : "Enviar pedido no WhatsApp";
    comodos.forEach((c) => {
      const p = painelDe(c.dataset.room);
      const q = p.hidden ? 0 : [...p.querySelectorAll("output[data-item]")].reduce((s, o) => s + Number(o.textContent), 0);
      c.classList.toggle("has-items", q > 0);
      c.querySelector(".room-badge").textContent = q || "";
    });
    if (barra) {
      barraTexto.textContent = `${n} ${n === 1 ? "item" : "itens"} no pedido`;
      barra.classList.toggle("is-visible", n > 0 && !ticketVisivel);
    }
    document.dispatchEvent(new Event("layoutchange"));
  };

  const alternarComodo = (id, ligar) => {
    const c = comodos.find((x) => x.dataset.room === id);
    const p = painelDe(id);
    c.setAttribute("aria-pressed", String(ligar));
    p.hidden = !ligar;
    if (ligar) {
      // novo cômodo aparece por último, na ordem em que foi escolhido
      p.parentElement.appendChild(p);
    } else {
      p.querySelectorAll("output[data-item]").forEach((o) => { o.textContent = "0"; o.closest(".acao").classList.remove("on"); o.closest(".item").classList.remove("on"); });
      p.querySelectorAll(".specs").forEach((c) => { c.replaceChildren(); c.hidden = true; });
      [...detalhes.keys()].filter((k) => k.startsWith(`${id}|`)).forEach((k) => detalhes.delete(k));
      p.querySelectorAll('[data-q="-1"]').forEach((b) => { b.disabled = true; });
    }
    vazio.hidden = paineis.some((x) => !x.hidden);
    resumo();
  };
  comodos.forEach((c) => c.addEventListener("click", () => {
    const ligar = c.getAttribute("aria-pressed") !== "true";
    alternarComodo(c.dataset.room, ligar);
    if (ligar) painelDe(c.dataset.room).querySelector('[data-q="1"]').focus({ preventScroll: true });
  }));
  document.querySelectorAll("[data-fechar-comodo]").forEach((b) => b.addEventListener("click", () => {
    const id = b.dataset.fecharComodo;
    alternarComodo(id, false);
    comodos.find((x) => x.dataset.room === id).focus();
  }));

  document.querySelectorAll(".panel .stepper button").forEach((b) => b.addEventListener("click", () => {
    const acao = b.closest(".acao");
    const item = b.closest(".item");
    const out = acao.querySelector("output");
    const n = Math.min(99, Math.max(0, Number(out.textContent) + Number(b.dataset.q)));
    out.textContent = n;
    acao.classList.toggle("on", n > 0);
    item.classList.toggle("on", [...item.querySelectorAll("output")].some((o) => Number(o.textContent) > 0));
    acao.querySelector('[data-q="-1"]').disabled = n === 0;
    acao.querySelector('[data-q="1"]').disabled = n === 99;
    if (item.dataset.spec) desenharSpecs(item);
    resumo();
  }));

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([en]) => { ticketVisivel = en.isIntersecting; resumo(); }, { threshold: 0.2 }).observe(pedido);
  }
  const inicial = new URLSearchParams(location.search).get("comodo");
  if (inicial && painelDe(inicial)) alternarComodo(inicial, true);

  // Cidade: sugestões das cidades a até 200 km de São Paulo
  const REGIOES = {
    abc: { tag: "Sem pedágio", cls: "ok", aviso: "Atendemos sua cidade (ABC), sem pedágio.", rotulo: "ABC, sem pedágio" },
    capital: { tag: "Sem pedágio", cls: "ok", aviso: "Atendemos sua cidade (São Paulo), sem pedágio.", rotulo: "capital, sem pedágio" },
    pedagio: { tag: "Com pedágio", cls: "toll", aviso: "Atendemos sua cidade. O pedágio do trajeto é cobrado à parte.", rotulo: "com pedágio" },
    outra: { tag: "Consultar", cls: "ask", aviso: "Informe a cidade nos detalhes. O pedágio do trajeto é cobrado à parte.", rotulo: "outra cidade" },
  };
  const TAG_CLS = { ok: "tag-ok", ask: "tag-ask", toll: "tag-toll" };
  const campo = document.getElementById("pedido-cidade");
  const caixa = document.getElementById("pedido-cidades");
  const regiao = document.getElementById("pedido-regiao");
  const norm = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  let cidades = [];
  let opcoes = [];
  let ativo = -1;
  let escolhida = null;

  fetch("assets/data/cidades.json").then((r) => r.json()).then((d) => {
    cidades = d.map(([nome, uf, g, km]) => {
      const exibir = uf === "SP" ? nome : `${nome} - ${uf}`;
      return { nome: exibir, g, km, k: norm(exibir), kb: norm(nome) };
    });
  });

  const destacar = (nome, termo) => {
    const i = norm(nome).indexOf(termo);
    if (!termo || i < 0) return esc(nome);
    return esc(nome.slice(0, i)) + "<mark>" + esc(nome.slice(i, i + termo.length)) + "</mark>" + esc(nome.slice(i + termo.length));
  };
  const opcaoHtml = (c, i, termo) => {
    const r = REGIOES[c.g];
    return `<li role="option" id="cidade-op-${i}" data-i="${i}" aria-selected="false"><span>${destacar(c.nome, termo)}</span><span class="tag ${TAG_CLS[r.cls]}">${r.tag}</span></li>`;
  };

  const abrirLista = () => {
    const termo = norm(campo.value);
    const outra = { nome: "Minha cidade não está na lista", g: "outra", k: "" };
    let html = "";
    if (!termo) {
      const sem = cidades.filter((c) => c.g !== "pedagio");
      opcoes = [...sem, outra];
      html = '<li class="head" role="presentation">Sem pedágio</li>' + sem.map((c, i) => opcaoHtml(c, i, "")).join("")
        + '<li class="head" role="presentation">Com pedágio · digite para buscar</li>' + opcaoHtml(outra, sem.length, "");
    } else {
      const peso = (c) => (c.g === "pedagio" ? 1 : 0);
      const ordenar = (a, b) => peso(a) - peso(b) || a.k.localeCompare(b.k);
      const comeca = cidades.filter((c) => c.kb.startsWith(termo) || c.k.startsWith(termo)).sort(ordenar);
      const contem = cidades.filter((c) => !comeca.includes(c) && c.k.includes(termo)).sort(ordenar);
      opcoes = [...comeca, ...contem].slice(0, 8);
      if (!opcoes.length) html = '<li class="head" role="presentation">Nenhuma cidade encontrada</li>';
      opcoes.push(outra);
      html += opcoes.map((c, i) => opcaoHtml(c, i, termo)).join("");
    }
    ativo = -1;
    caixa.innerHTML = html;
    caixa.hidden = false;
    campo.setAttribute("aria-expanded", "true");
  };
  const fecharLista = () => {
    caixa.hidden = true;
    campo.setAttribute("aria-expanded", "false");
    campo.removeAttribute("aria-activedescendant");
  };
  const marcarAtivo = (i) => {
    const lis = caixa.querySelectorAll('[role="option"]');
    if (!lis.length) return;
    ativo = (i + lis.length) % lis.length;
    lis.forEach((li, j) => li.setAttribute("aria-selected", String(j === ativo)));
    campo.setAttribute("aria-activedescendant", lis[ativo].id);
    lis[ativo].scrollIntoView({ block: "nearest" });
  };
  const escolher = (c) => {
    escolhida = c;
    campo.value = c.g === "outra" ? "" : c.nome;
    if (c.g === "outra") campo.placeholder = "Cidade fora da lista";
    const r = REGIOES[c.g];
    regiao.className = `region ${r.cls}`;
    regiao.innerHTML = icone(r.cls === "ok" ? "i-check" : "i-pin") + `<span>${r.aviso}</span>`;
    regiao.hidden = false;
    campo.closest(".field").classList.remove("invalid");
    erro.textContent = "";
    fecharLista();
  };

  campo.addEventListener("focus", abrirLista);
  campo.addEventListener("input", () => { escolhida = null; regiao.hidden = true; abrirLista(); });
  campo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); if (caixa.hidden) abrirLista(); marcarAtivo(ativo + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcarAtivo(ativo - 1); }
    else if (e.key === "Enter" && !caixa.hidden && ativo >= 0) { e.preventDefault(); escolher(opcoes[ativo]); }
    else if (e.key === "Escape") fecharLista();
  });
  caixa.addEventListener("mousedown", (e) => {
    const li = e.target.closest('[role="option"]');
    if (li) { e.preventDefault(); escolher(opcoes[Number(li.dataset.i)]); }
  });
  campo.addEventListener("blur", () => {
    if (!escolhida && campo.value.trim()) {
      const t = norm(campo.value);
      const exata = cidades.find((c) => c.k === t) || cidades.find((c) => c.kb === t);
      if (exata) escolher(exata);
    }
    setTimeout(fecharLista, 120);
  });

  const falhar = (msg, el) => {
    erro.textContent = msg;
    el?.closest(".field")?.classList.add("invalid");
    (el || erro).focus?.();
  };
  pedido.nome.addEventListener("input", () => pedido.nome.closest(".field").classList.remove("invalid"));

  pedido.addEventListener("submit", (e) => {
    e.preventDefault();
    const nome = pedido.nome.value.trim();
    const grupos = escolhidos();
    const detalhes = pedido.detalhes.value.trim();
    if (!nome) return falhar("Informe seu nome.", pedido.nome);
    if (!escolhida) return falhar("Escolha sua cidade na lista.", campo);
    if (!grupos.length && !detalhes) return falhar("Escolha ao menos um item ou descreva o que precisa nos detalhes.", document.querySelector(".room"));
    erro.textContent = "";
    const bairro = pedido.bairro.value.trim();
    const linhas = [`Olá! Meu nome é ${nome}. Conheci a Life Montagens pelo site e gostaria de um orçamento.`];
    grupos.forEach((g) => {
      linhas.push("", `*${g.titulo}*`, ...g.itens.map((i) => `• ${i.nome}${i.comodo ? ` (${i.comodo.toLowerCase()})` : ""}: ${i.qtd}${i.det ? ` (${i.det})` : ""}`));
    });
    linhas.push("", escolhida.g === "outra"
      ? "*Cidade:* outra (informo nos detalhes)"
      : `*Cidade:* ${escolhida.nome} (${REGIOES[escolhida.g].rotulo})`);
    if (bairro) linhas.push(`*Bairro:* ${bairro}`);
    if (detalhes) linhas.push(`*Detalhes:* ${detalhes}`);
    linhas.push("", "Poderia me orientar?");
    window.open(waLink(linhas.join("\n")), "_blank", "noopener");
  });
}

// Nota e total de avaliações sempre iguais aos do arquivo atualizado automaticamente
const camposNota = document.querySelectorAll("[data-rv]");
if (camposNota.length) {
  fetch("assets/data/avaliacoes.json", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((d) => {
      const valores = {
        nota: d.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        total: d.total,
        cinco: d.avaliacoes.filter((r) => r.nota === 5).length,
      };
      camposNota.forEach((c) => { c.textContent = valores[c.dataset.rv]; });
    })
    .catch(() => {});
}

// Álbum horizontal de trabalhos
const album = document.getElementById("album");
if (album) {
  const fotos = [...album.querySelectorAll(".shot")];
  const contador = document.getElementById("album-contador");
  const progresso = document.getElementById("album-progresso");
  const [anterior, proxima] = document.querySelectorAll(".carousel-ctrl .round");
  const passo = () => fotos[0].getBoundingClientRect().width + parseFloat(getComputedStyle(album).columnGap || 18);
  const dois = (n) => String(n).padStart(2, "0");
  const atualizar = () => {
    const max = album.scrollWidth - album.clientWidth;
    const atual = Math.min(fotos.length, Math.round(album.scrollLeft / passo()) + 1);
    contador.textContent = `${dois(max - album.scrollLeft < 4 ? fotos.length : atual)} / ${dois(fotos.length)}`;
    progresso.style.width = `${max > 0 ? Math.max(6, (album.scrollLeft / max) * 100) : 100}%`;
    anterior.disabled = album.scrollLeft < 4;
    proxima.disabled = max - album.scrollLeft < 4;
  };
  [anterior, proxima].forEach((b) => b.addEventListener("click", () => {
    album.scrollBy({ left: Number(b.dataset.dir) * passo(), behavior: reduzMovimento ? "auto" : "smooth" });
  }));
  album.addEventListener("scroll", atualizar, { passive: true });
  addEventListener("resize", atualizar);
  atualizar();
}

// Letreiro de avaliações: duplica o conteúdo para o loop contínuo e permite pausar
const marquee = document.getElementById("marquee");
const pausa = document.getElementById("marquee-pausa");
if (marquee) {
  if (reduzMovimento) {
    if (pausa) pausa.hidden = true;
  } else {
    marquee.querySelectorAll(".marquee-row").forEach((row) => {
      [...row.children].forEach((card) => {
        const copia = card.cloneNode(true);
        copia.setAttribute("aria-hidden", "true");
        row.appendChild(copia);
      });
    });
  }
  pausa?.addEventListener("click", () => {
    const pausado = pausa.getAttribute("aria-pressed") !== "true";
    pausa.setAttribute("aria-pressed", String(pausado));
    marquee.classList.toggle("is-paused", pausado);
    pausa.querySelector("span").textContent = pausado ? "Continuar" : "Pausar";
  });
}

// Botão flutuante (começa oculto no HTML). Fica escondido na primeira dobra, no contato,
// no rodapé, quando a barra de serviços está visível e sempre que estiver por cima de outro controle.
const flutuante = document.querySelector(".wa-float");
if (flutuante) {
  const zonas = [document.getElementById("inicio"), document.querySelector(".page-hero"), document.getElementById("contato"), document.querySelector(".contact"), document.querySelector(".site-footer")].filter(Boolean);
  const controles = [...document.querySelectorAll("a, button, input, textarea, select, summary")]
    .filter((el) => !flutuante.contains(el) && !el.closest(".select-bar"));
  const margem = 8;
  const cobreControle = () => {
    const r = flutuante.getBoundingClientRect();
    return controles.some((el) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.right > r.left - margem && b.left < r.right + margem
        && b.bottom > r.top - margem && b.top < r.bottom + margem;
    });
  };
  const emZona = () => zonas.some((el) => {
    const b = el.getBoundingClientRect();
    return b.top < innerHeight * 0.85 && b.bottom > innerHeight * 0.15;
  });
  const atualizar = () => flutuante.classList.toggle("is-hidden",
    emZona() || cobreControle() || Boolean(barra?.classList.contains("is-visible")));
  addEventListener("scroll", atualizar, { passive: true });
  addEventListener("resize", atualizar);
  document.addEventListener("toggle", atualizar, true);
  document.addEventListener("layoutchange", atualizar);
  atualizar();
}
