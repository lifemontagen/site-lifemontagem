/* Life Montagens — página de trabalhos: filtros por ambiente e visualizador em tela cheia */

(() => {
  const grade = document.getElementById("obras");
  if (!grade) return;
  const itens = [...grade.querySelectorAll(".work")];
  const filtros = [...document.querySelectorAll(".filter[data-cat]")];
  const contagem = document.getElementById("obras-contagem");
  const visor = document.getElementById("visor");
  const img = document.getElementById("visor-img");
  const titulo = document.getElementById("visor-titulo");
  const cat = document.getElementById("visor-cat");
  const pos = document.getElementById("visor-pos");
  const cta = document.getElementById("visor-cta");
  const miniaturas = document.getElementById("visor-miniaturas");
  const WHATSAPP = "5511980157249";
  let visiveis = itens;
  let atual = 0;

  const aplicarFiltro = (categoria) => {
    filtros.forEach((f) => f.setAttribute("aria-pressed", String(f.dataset.cat === categoria)));
    itens.forEach((li) => { li.hidden = categoria !== "todos" && li.dataset.cat !== categoria; });
    visiveis = itens.filter((li) => !li.hidden);
    contagem.textContent = visiveis.length === 1 ? "1 foto" : `${visiveis.length} fotos`;
  };
  filtros.forEach((f) => f.addEventListener("click", () => aplicarFiltro(f.dataset.cat)));

  const montarMiniaturas = () => {
    miniaturas.replaceChildren(...visiveis.map((li, i) => {
      const b = document.createElement("button");
      b.type = "button";
      const d = li.querySelector("button").dataset;
      b.setAttribute("aria-label", d.titulo);
      b.innerHTML = `<img src="${d.thumb}" alt="" width="480" height="600" loading="lazy">`;
      b.addEventListener("click", () => mostrar(i));
      return b;
    }));
  };

  function mostrar(i) {
    atual = (i + visiveis.length) % visiveis.length;
    const d = visiveis[atual].querySelector("button").dataset;
    img.classList.add("loading");
    img.onload = () => img.classList.remove("loading");
    img.width = Number(d.w);
    img.height = Number(d.h);
    img.src = d.full;
    img.alt = `${d.titulo}, trabalho da Life Montagens`;
    titulo.textContent = d.titulo;
    cat.textContent = d.categoria;
    pos.textContent = `${atual + 1} de ${visiveis.length}`;
    cta.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá! Vi no site da Life Montagens o trabalho "${d.titulo}" e gostaria de um orçamento para algo parecido. Poderia me orientar?`)}`;
    [...miniaturas.children].forEach((b, j) => {
      b.setAttribute("aria-current", String(j === atual));
      if (j === atual) b.scrollIntoView({ block: "nearest", inline: "nearest" });
    });
    // pré-carrega a próxima
    const prox = visiveis[(atual + 1) % visiveis.length]?.querySelector("button").dataset.full;
    if (prox) new Image().src = prox;
    history.replaceState(null, "", `#${visiveis[atual].id}`);
  }

  const abrir = (li) => {
    if (li.hidden) aplicarFiltro("todos");
    montarMiniaturas();
    mostrar(visiveis.indexOf(li));
    if (!visor.open) visor.showModal();
  };
  itens.forEach((li) => li.querySelector("button").addEventListener("click", () => abrir(li)));

  visor.addEventListener("click", (e) => {
    const ir = e.target.closest("[data-ir]");
    if (ir) mostrar(atual + Number(ir.dataset.ir));
    if (e.target.closest("[data-fechar]")) visor.close();
  });
  visor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); mostrar(atual - 1); }
    if (e.key === "ArrowRight") { e.preventDefault(); mostrar(atual + 1); }
  });
  visor.addEventListener("close", () => {
    history.replaceState(null, "", location.pathname);
    visiveis[atual]?.querySelector("button").focus();
  });

  // Deslizar para os lados no celular
  let inicioX = null;
  const palco = visor.querySelector(".viewer-stage");
  palco.addEventListener("pointerdown", (e) => { inicioX = e.clientX; });
  palco.addEventListener("pointerup", (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    inicioX = null;
    if (Math.abs(dx) > 50) mostrar(atual + (dx < 0 ? 1 : -1));
  });

  aplicarFiltro("todos");
  // Link direto para uma foto (ex.: trabalhos.html#foto-13)
  const abrirPeloEndereco = () => {
    const alvo = location.hash.startsWith("#foto-") && document.getElementById(location.hash.slice(1));
    if (alvo && !(visor.open && visiveis[atual] === alvo)) abrir(alvo);
  };
  addEventListener("hashchange", abrirPeloEndereco);
  abrirPeloEndereco();
})();
