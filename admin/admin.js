'use strict';

/* =========================================================
   CONFIGURAÇÃO
   A chave abaixo é a "publishable" (pública): pode ficar no site.
   NUNCA coloque aqui a chave secreta (secret / service_role).
   ========================================================= */
const SUPABASE_URL = 'https://htdhnwztmaxrzrmuywet.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ir8GAP7Kj3fFv3RtXzSyyQ_a1ZJFkLp';
const BUCKET = 'anexos';

const sb = window.__SB_TESTE || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FORMAS = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Transferência'];
const CAT_ENTRADA = ['Serviço', 'Sinal', 'Deslocamento', 'Outros'];
const CAT_SAIDA = ['Pedágio', 'Gasolina', 'Combustível', 'Funcionário (diária)', 'Refeição', 'Ajudante', 'Material', 'Ferramenta', 'Outros'];
const CAT_EQUIPE = ['Ajudante', 'Funcionário (diária)'];
const CAT_DESPESA_AJUDANTE = ['Pedágio', 'Gasolina', 'Combustível', 'Refeição', 'Material', 'Ferramenta', 'Outros'];
// Mesmos cômodos e itens da página de orçamento do site (lifemontagem.com.br/orcamento.html)
const CATALOGO = [
  ['Quarto', ['Guarda-roupa', 'Guarda-roupa modular', 'Cama', 'Cômoda', 'Mesa de cabeceira', 'Painel de TV', 'Suporte de TV', 'Mesa', 'Cadeira', 'Quadro na parede', 'Cortina', 'Persiana']],
  ['Sala', ['Painel de TV', 'Rack', 'Suporte de TV', 'Mesa', 'Cadeira', 'Quadro na parede', 'Cortina', 'Persiana']],
  ['Cozinha', ['Armário de cozinha', 'Mesa', 'Cadeira', 'Cooktop', 'Quadro na parede', 'Cortina', 'Persiana']],
  ['Banheiro', ['Armário de banheiro', 'Quadro na parede', 'Persiana']],
  ['Lavanderia', ['Armário de lavanderia', 'Cortina', 'Persiana']],
  ['Escritório', ['Mesa', 'Cadeira', 'Quadro na parede', 'Cortina', 'Persiana']],
  ['Pequenos reparos', ['Dobradiças', 'Corrediças', 'Trilhos', 'Puxadores', 'Roldanas', 'Pistões', 'Adaptações', 'Recortes', 'Fechamento de móveis']],
];
const REPAROS = 'Pequenos reparos';
const PRAZOS = [[0, 'À vista'], [15, '15 dias'], [30, '30 dias'], [45, '45 dias'], [60, '60 dias'], [90, '90 dias']];
const CAMPOS_END = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'];
const LIMITE_ARQUIVO = 5 * 1024 * 1024;

const E = { user: null, membro: null, membros: [], aba: null, filtro: {}, mes: null };

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const dono = () => E.membro?.papel === 'dono';
const janela = $('#janela');

/* =========================================================
   UTILIDADES
   ========================================================= */
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const brl = n => moeda.format(Number(n) || 0);
function paraNumero(v) {
  let s = String(v ?? '').replace(/[R$\s]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
}
const paraCampoValor = n => (Number(n) ? Number(n).toFixed(2).replace('.', ',') : '');
const dois = n => String(n).padStart(2, '0');
const isoLocal = d => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const hoje = () => isoLocal(new Date());
function somarDias(iso, dias) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return isoLocal(new Date(y, m - 1, d + Number(dias || 0)));
}
function fmtData(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}
const fmtHora = ts => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
const temHorario = ts => { const d = new Date(ts); return d.getHours() !== 0 || d.getMinutes() !== 0; };
const fmtHoraOuNao = ts => (temHorario(ts) ? fmtHora(ts) : 'Sem horário');
const fmtDataHora = ts => `${new Date(ts).toLocaleDateString('pt-BR')}${temHorario(ts) ? ` às ${fmtHora(ts)}` : ' (sem horário)'}`;
const fmtDia = ts => new Date(ts).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
const soDigitos = s => String(s ?? '').replace(/\D/g, '');
const umaLinha = (t, max = 80) => { const x = String(t ?? '').replace(/\s*\n\s*/g, '; '); return x.length > max ? x.slice(0, max - 1) + '…' : x; };
const semAcento = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function linkWhats(tel) {
  let d = soDigitos(tel);
  if (!d) return '';
  if (d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}`;
}
function enderecoTexto(o) {
  const rua = [o.logradouro, o.numero].filter(Boolean).join(', ');
  const local = [o.bairro, [o.cidade, o.uf].filter(Boolean).join('/')].filter(Boolean).join(', ');
  return [rua, o.complemento, local].filter(Boolean).join(' - ');
}
const nomeMembro = id => E.membros.find(m => m.user_id === id)?.nome || '';
const ajudantes = () => E.membros.filter(m => m.papel === 'ajudante');

function opcoes(lista, selecionado) {
  return lista.map(item => {
    const [valor, texto] = Array.isArray(item) ? item : [item, item];
    const sel = String(valor) === String(selecionado ?? '') ? ' selected' : '';
    return `<option value="${esc(valor)}"${sel}>${esc(texto)}</option>`;
  }).join('');
}

function lerForm(form) {
  const o = {};
  new FormData(form).forEach((v, k) => {
    if (typeof v === 'string') v = v.trim();
    o[k] = v === '' ? null : v;
  });
  return o;
}

function ok(res) {
  if (res.error) throw res.error;
  return res.data;
}

function msgErro(e) {
  const m = String(e?.message || e || '');
  if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(m)) return 'Este e-mail ainda não foi confirmado.';
  if (/row-level security|permission denied/i.test(m)) return 'Você não tem permissão para fazer isso.';
  if (/failed to fetch|network/i.test(m)) return 'Sem conexão com a internet. Tente de novo.';
  if (/should be different/i.test(m)) return 'A nova senha precisa ser diferente da atual.';
  if (/password should be at least/i.test(m)) return 'A senha precisa ter pelo menos 6 caracteres.';
  return m || 'Algo deu errado. Tente de novo.';
}

let avisoTimer;
function aviso(msg, erro = false) {
  const el = $('#aviso');
  el.textContent = msg;
  el.classList.toggle('erro-aviso', erro);
  el.hidden = false;
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => { el.hidden = true; }, erro ? 5000 : 2800);
}

// Executa uma ação e mostra o erro (se houver) sem travar a tela
const acao = fn => async (...args) => {
  try { await fn(...args); } catch (e) { console.error(e); aviso(msgErro(e), true); }
};

async function comBotao(botao, fn) {
  if (botao) botao.disabled = true;
  try { await fn(); } catch (e) { console.error(e); aviso(msgErro(e), true); } finally { if (botao) botao.disabled = false; }
}

/* =========================================================
   JANELA
   ========================================================= */
function abrirJanela(titulo, html) {
  $('#janela-titulo').textContent = titulo;
  const corpo = $('#janela-corpo');
  corpo.innerHTML = html;
  if (!janela.open) janela.showModal();
  janela.scrollTop = 0;
  return corpo;
}
const fecharJanela = () => janela.open && janela.close();
janela.addEventListener('click', e => { if (e.target.closest('[data-fechar]')) fecharJanela(); });

/* =========================================================
   LOGIN
   ========================================================= */
function mostrarLogin(msg) {
  fecharJanela();
  $('#app').hidden = true;
  $('#tela-login').hidden = false;
  const erro = $('#login-erro');
  erro.textContent = msg || '';
  erro.hidden = !msg;
}

$('#form-login').addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = ev.target;
  const erro = $('#login-erro');
  erro.hidden = true;
  await comBotao(f.querySelector('button'), async () => {
    const { data, error } = await sb.auth.signInWithPassword({ email: f.email.value.trim(), password: f.senha.value });
    if (error) { erro.textContent = msgErro(error); erro.hidden = false; return; }
    f.senha.value = '';
    await entrar(data.user);
  });
});

async function entrar(user) {
  const { data, error } = await sb.from('membros').select('user_id, nome, papel').eq('user_id', user.id).maybeSingle();
  if (error || !data) {
    await sb.auth.signOut();
    mostrarLogin(error ? msgErro(error) : 'Este login não tem acesso ao painel.');
    return;
  }
  E.user = user;
  E.membro = data;
  E.membros = dono() ? ok(await sb.from('membros').select('user_id, nome, papel').order('nome')) : [data];
  $('#topo-usuario').textContent = `${data.nome} · ${dono() ? 'dono' : 'ajudante'}`;
  $('#tela-login').hidden = true;
  $('#app').hidden = false;
  montarAbas();
  irPara(location.hash.slice(1));
  $('#btn-avisos').hidden = !dono();
  if (dono()) ligarAvisos();
}

async function sair() {
  E.user = null;
  E.membro = null;
  await sb.auth.signOut();
  history.replaceState(null, '', location.pathname);
  mostrarLogin();
}

/* Menu da conta */
$('#btn-menu').addEventListener('click', e => { e.stopPropagation(); $('#menu-conta').hidden = !$('#menu-conta').hidden; });
document.addEventListener('click', () => { $('#menu-conta').hidden = true; });
$('#menu-conta').addEventListener('click', e => {
  const qual = e.target.closest('[data-acao]')?.dataset.acao;
  if (qual === 'sair') acao(sair)();
  if (qual === 'trocar-senha') formSenha();
});

function formSenha() {
  const c = abrirJanela('Trocar minha senha', `
    <form class="form">
      <label>Nova senha <input type="password" name="s1" minlength="6" required autocomplete="new-password"></label>
      <label>Repita a nova senha <input type="password" name="s2" minlength="6" required autocomplete="new-password"></label>
      <p class="dica">Mínimo de 6 caracteres.</p>
      <button type="submit" class="btn btn-primario btn-largo">Salvar nova senha</button>
    </form>`);
  const f = $('form', c);
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    if (f.s1.value !== f.s2.value) { aviso('As duas senhas não são iguais.', true); return; }
    comBotao(f.querySelector('button'), async () => {
      ok(await sb.auth.updateUser({ password: f.s1.value }));
      fecharJanela();
      aviso('Senha trocada.');
    });
  });
}

/* =========================================================
   ABAS
   ========================================================= */
const ABAS = {
  dono: [['agenda', 'Agenda'], ['clientes', 'Clientes'], ['financeiro', 'Financeiro'], ['aprovacoes', 'Aprovações'], ['equipe', 'Equipe']],
  ajudante: [['agenda', 'Agenda'], ['despesas', 'Minhas despesas'], ['pagamentos', 'Meus pagamentos']],
};

function montarAbas() {
  $('#abas').innerHTML = ABAS[E.membro.papel].map(([id, titulo]) =>
    `<button type="button" class="aba" data-aba="${id}">${titulo}${id === 'aprovacoes' ? ` <span class="contador" id="contador-${id}" hidden></span>` : ''}</button>`
  ).join('');
}
$('#abas').addEventListener('click', e => {
  const b = e.target.closest('[data-aba]');
  if (b) irPara(b.dataset.aba);
});

function irPara(id) {
  const lista = ABAS[E.membro.papel];
  if (!lista.some(a => a[0] === id)) id = lista[0][0];
  E.aba = id;
  history.replaceState(null, '', '#' + id);
  $$('.aba').forEach(b => b.setAttribute('aria-current', b.dataset.aba === id ? 'page' : 'false'));
  $(`.aba[data-aba="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  $('#conteudo').innerHTML = '<p class="carregando">Carregando…</p>';
  recarregar();
}

async function recarregar() {
  const aba = E.aba;
  const conteudo = $('#conteudo');
  if (dono()) atualizarContador();
  try {
    const tela = await TELAS[aba]();
    if (E.aba !== aba) return;
    conteudo.innerHTML = tela.html;
    tela.ligar?.(conteudo);
  } catch (e) {
    console.error(e);
    if (E.aba !== aba) return;
    conteudo.innerHTML = `<div class="vazio">Não foi possível carregar.<br>${esc(msgErro(e))}<br><br><button type="button" class="btn" id="tentar">Tentar de novo</button></div>`;
    $('#tentar').addEventListener('click', recarregar);
  }
}

async function atualizarContador() {
  const mostrar = (id, n) => {
    const el = $('#contador-' + id);
    if (!el) return;
    el.textContent = n;
    el.hidden = !n;
  };
  const { count, error } = await sb.from('lancamentos').select('id', { count: 'exact', head: true }).eq('aprovacao', 'pendente');
  if (!error) mostrar('aprovacoes', count);
  try {
    const [vencidas, deHoje] = await Promise.all([cobrancasVencidas(), servicosDeHoje()]);
    mostrar('avisos', vencidas.length + deHoje.length);
  } catch { /* o contador volta na próxima atualização */ }
}

function filtrosHtml(chave, lista) {
  const atual = E.filtro[chave] || lista[0][0];
  return `<div class="filtros">${lista.map(([id, t]) =>
    `<button type="button" class="filtro" data-filtro="${id}" aria-pressed="${id === atual}">${t}</button>`).join('')}</div>`;
}
function ligarFiltros(el, chave) {
  $$('[data-filtro]', el).forEach(b => b.addEventListener('click', () => { E.filtro[chave] = b.dataset.filtro; recarregar(); }));
}

/* =========================================================
   ENDEREÇO (com busca automática pelo CEP)
   ========================================================= */
function camposEndereco(o = {}, { comCep = true } = {}) {
  return `
    <div class="grade">
      ${comCep ? `<label>CEP <input name="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" value="${esc(o.cep)}"></label>` : ''}
      ${comCep ? '' : `<label class="inteiro">Rua <input name="logradouro" value="${esc(o.logradouro)}"></label>`}
      <label${comCep ? '' : ' class="inteiro"'}>Número <input name="numero" value="${esc(o.numero)}"></label>
      ${comCep ? `<label class="inteiro">Rua <input name="logradouro" value="${esc(o.logradouro)}"></label>` : ''}
      <label class="inteiro">Complemento <input name="complemento" placeholder="Apto, bloco, casa…" value="${esc(o.complemento)}"></label>
      <label class="inteiro">Bairro <input name="bairro" value="${esc(o.bairro)}"></label>
      <label>Cidade <input name="cidade" value="${esc(o.cidade)}"></label>
      <label>UF <input name="uf" maxlength="2" value="${esc(o.uf)}"></label>
    </div>`;
}
function ligarCep(form) {
  const cep = form.elements.cep;
  cep.addEventListener('input', async () => {
    const d = soDigitos(cep.value);
    if (d.length !== 8 || cep.dataset.ultimo === d) return;
    cep.dataset.ultimo = d;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { aviso('CEP não encontrado. Preencha à mão.', true); return; }
      form.elements.logradouro.value = j.logradouro || '';
      form.elements.bairro.value = j.bairro || '';
      form.elements.cidade.value = j.localidade || '';
      form.elements.uf.value = j.uf || '';
      form.elements.numero.focus();
    } catch { /* sem internet: preenche à mão */ }
  });
}
function preencherEndereco(form, o) {
  CAMPOS_END.forEach(k => { if (form.elements[k]) form.elements[k].value = o[k] || ''; });
}
function lerEndereco(d) {
  const o = {};
  CAMPOS_END.forEach(k => { if (d[k] !== undefined) o[k] = d[k]; });
  if (o.uf) o.uf = o.uf.toUpperCase();
  return o;
}

/* =========================================================
   ESCOLHER CLIENTE (ícone 👤)
   ========================================================= */
async function carregarClientesSeletor() {
  if (dono()) {
    return ok(await sb.from('clientes')
      .select('id, tipo, nome, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf, prazo_pagamento_dias')
      .eq('ativo', true).order('nome'));
  }
  return ok(await sb.rpc('clientes_para_agenda'));
}

async function escolherCliente() {
  const todos = await carregarClientesSeletor();
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'janela';
    dlg.innerHTML = `
      <div class="janela-topo"><h2>Escolher cliente</h2><button type="button" class="btn-fechar" aria-label="Fechar">×</button></div>
      <div class="janela-corpo">
        <input type="search" class="busca" placeholder="Buscar por nome ou telefone" aria-label="Buscar cliente">
        <button type="button" class="btn btn-largo" data-avulso>Cliente avulso (digitar à mão)</button>
        <div class="seletor"></div>
      </div>`;
    document.body.append(dlg);
    let visiveis = todos;
    const terminar = valor => { dlg.close(); dlg.remove(); resolve(valor); };
    const pintar = termo => {
      const t = semAcento(termo);
      const td = soDigitos(termo);
      visiveis = todos.filter(c => !t || semAcento(c.nome).includes(t) || (td && soDigitos(c.telefone).includes(td)));
      $('.seletor', dlg).innerHTML = visiveis.length
        ? visiveis.map((c, i) => `
            <button type="button" class="seletor-item" data-i="${i}">
              <strong>${c.tipo === 'pj' ? '🏢' : '👤'} ${esc(c.nome)}</strong>
              <span>${esc([c.telefone, c.bairro, c.cidade].filter(Boolean).join(' · ') || 'Sem telefone')}</span>
            </button>`).join('')
        : `<p class="vazio">${todos.length ? 'Nenhum cliente encontrado.' : 'Nenhum cliente cadastrado ainda.'}</p>`;
    };
    $('.btn-fechar', dlg).addEventListener('click', () => terminar(null));
    dlg.addEventListener('cancel', e => { e.preventDefault(); terminar(null); });
    $('[data-avulso]', dlg).addEventListener('click', () => terminar({ avulso: true }));
    $('.busca', dlg).addEventListener('input', e => pintar(e.target.value));
    $('.seletor', dlg).addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) terminar(visiveis[Number(b.dataset.i)]);
    });
    pintar('');
    dlg.showModal();
  });
}

// Liga o ícone 👤 de um formulário: preenche nome, telefone e (se houver) endereço
function ligarSeletorCliente(form, { comEndereco = false, aoEscolher } = {}) {
  const nome = form.elements.cliente_nome;
  const vinculo = $('[data-vinculo]', form);
  const mostrarVinculo = () => {
    if (vinculo) vinculo.innerHTML = form.elements.cliente_id.value
      ? '<span class="etiqueta azul">Cliente cadastrado</span>'
      : '<span class="etiqueta">Avulso</span>';
  };
  let nomeEscolhido = nome.value;
  nome.addEventListener('input', () => {
    if (form.elements.cliente_id.value && nome.value !== nomeEscolhido) {
      form.elements.cliente_id.value = '';
      mostrarVinculo();
    }
  });
  $('[data-escolher]', form).addEventListener('click', acao(async () => {
    const c = await escolherCliente();
    if (!c) return;
    if (c.avulso) {
      form.elements.cliente_id.value = '';
      nome.focus();
    } else {
      form.elements.cliente_id.value = c.id;
      nome.value = nomeEscolhido = c.nome;
      if (form.elements.cliente_telefone) form.elements.cliente_telefone.value = c.telefone || '';
      if (comEndereco) preencherEndereco(form, c);
      aoEscolher?.(c);
    }
    mostrarVinculo();
  }));
  mostrarVinculo();
}

/* =========================================================
   FOTOS E COMPROVANTES
   ========================================================= */
async function prepararArquivo(f) {
  const nome = f.name.toLowerCase();
  if (f.type === 'application/pdf' || nome.endsWith('.pdf')) {
    if (f.size > LIMITE_ARQUIVO) throw new Error('PDF maior que 5 MB.');
    return { blob: f, tipo: 'application/pdf', ext: 'pdf' };
  }
  try {
    // Reduz a foto para no máximo 1600 px e JPG: fica leve e economiza espaço
    const img = await createImageBitmap(f);
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    img.close?.();
    const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
    if (blob) return { blob, tipo: 'image/jpeg', ext: 'jpg' };
  } catch { /* formato que o navegador não abre (ex.: HEIC no Chrome): envia o original */ }
  const ext = (nome.split('.').pop() || '').replace(/[^a-z0-9]/g, '');
  const tipos = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif' };
  if (!tipos[ext]) throw new Error('Formato não aceito. Envie foto (JPG, PNG, HEIC) ou PDF.');
  if (f.size > LIMITE_ARQUIVO) throw new Error('Foto maior que 5 MB.');
  return { blob: f, tipo: tipos[ext], ext };
}

async function enviarAnexo(arquivo, vinculo) {
  const p = await prepararArquivo(arquivo);
  const caminho = `${E.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${p.ext}`;
  const up = await sb.storage.from(BUCKET).upload(caminho, p.blob, { contentType: p.tipo, upsert: false });
  if (up.error) throw up.error;
  const { error } = await sb.from('anexos').insert({ caminho, ...vinculo });
  if (error) {
    await sb.storage.from(BUCKET).remove([caminho]);
    throw error;
  }
}

async function urlsAssinadas(caminhos) {
  if (!caminhos.length) return {};
  const lista = ok(await sb.storage.from(BUCKET).createSignedUrls(caminhos, 3600));
  const mapa = {};
  lista.forEach(i => { if (i.signedUrl) mapa[i.path] = i.signedUrl; });
  return mapa;
}

function miniatura(a, url, podeApagar) {
  const pdf = a.caminho.endsWith('.pdf');
  const dentro = !url ? '<div class="pdf">…</div>' : pdf ? '<div class="pdf">PDF</div>' : `<img src="${esc(url)}" alt="${esc(a.descricao || 'Foto')}" loading="lazy">`;
  return `<div class="foto">
    <a href="${esc(url || '#')}" target="_blank" rel="noopener">${dentro}</a>
    ${podeApagar ? `<button type="button" data-apagar="${a.id}" aria-label="Apagar">×</button>` : ''}
  </div>`;
}

async function apagarArquivosDe(campo, id) {
  const lista = ok(await sb.from('anexos').select('caminho').eq(campo, id));
  if (lista.length) await sb.storage.from(BUCKET).remove(lista.map(a => a.caminho));
}

// Mostra as fotos ligadas a um agendamento ou lançamento, com botão para enviar mais
async function blocoFotos(el, campo, id, { podeEnviar = true } = {}) {
  const pintar = async () => {
    const lista = ok(await sb.from('anexos').select('*').eq(campo, id).order('criado_em'));
    const urls = await urlsAssinadas(lista.map(a => a.caminho));
    el.innerHTML = `
      ${lista.length ? `<div class="fotos">${lista.map(a => miniatura(a, urls[a.caminho], dono())).join('')}</div>` : '<p class="dica">Nenhuma foto ainda.</p>'}
      ${podeEnviar ? '<label class="btn enviar-foto">📷 Adicionar foto ou PDF<input type="file" accept="image/*,application/pdf" multiple></label>' : ''}`;
    const input = $('input[type=file]', el);
    input?.addEventListener('change', acao(async () => {
      const arquivos = [...input.files];
      if (!arquivos.length) return;
      $('.enviar-foto', el).firstChild.textContent = `Enviando ${arquivos.length}…`;
      input.disabled = true;
      try {
        for (const f of arquivos) await enviarAnexo(f, { [campo]: id });
        aviso(arquivos.length > 1 ? 'Arquivos enviados.' : 'Arquivo enviado.');
      } finally {
        await pintar();
      }
    }));
    $$('[data-apagar]', el).forEach(b => b.addEventListener('click', acao(async () => {
      const a = lista.find(x => String(x.id) === b.dataset.apagar);
      if (!confirm('Apagar esta foto/arquivo?')) return;
      await sb.storage.from(BUCKET).remove([a.caminho]);
      ok(await sb.from('anexos').delete().eq('id', a.id));
      await pintar();
    })));
  };
  try { await pintar(); } catch (e) { el.innerHTML = `<p class="erro">${esc(msgErro(e))}</p>`; }
}

/* =========================================================
   AGENDA
   ========================================================= */
const STATUS = {
  agendado: ['Agendado', 'azul'],
  concluido: ['Concluído', 'verde'],
  cancelado: ['Cancelado', 'vermelho'],
};
const etiquetaStatus = s => `<span class="etiqueta ${STATUS[s][1]}">${STATUS[s][0]}</span>`;
const totalServico = v => (v ? Number(v.valor_servico) + Number(v.valor_deslocamento) : 0);

// Situação do pagamento de um serviço concluído: 'faturado', 'receber' ou 'sem' (ainda não faturado)
function faturamento(a, v, lancs) {
  if (a.status !== 'concluido') return null;
  const doServico = lancs.filter(l => l.agendamento_id === a.id && l.tipo === 'entrada' && l.aprovacao === 'aprovado');
  const semSinal = doServico.filter(l => l.categoria !== 'Sinal');
  if (semSinal.some(l => l.situacao === 'pendente')) return 'receber';
  if (semSinal.length) return 'faturado';
  const sinalPago = doServico.some(l => l.categoria === 'Sinal' && l.situacao === 'pago');
  if (sinalPago && totalServico(v) - Number(v?.sinal_valor || 0) <= 0) return 'faturado';
  return 'sem';
}
function etiquetaAgendamento(a, fat) {
  if (a.status !== 'concluido' || !fat) return etiquetaStatus(a.status);
  if (fat === 'faturado') return '<span class="etiqueta verde">Concluído e faturado</span>';
  if (fat === 'receber') return '<span class="etiqueta laranja">Concluído e a receber</span>';
  return '<span class="etiqueta">Concluído · falta faturar</span>';
}

async function telaAgenda() {
  const filtro = E.filtro.agenda || 'proximos';
  let q = sb.from('agendamentos').select('*');
  if (filtro === 'proximos') q = q.eq('status', 'agendado').order('data_hora', { ascending: true });
  if (filtro === 'concluidos') q = q.eq('status', 'concluido').order('data_hora', { ascending: false }).limit(100);
  if (filtro === 'cancelados') q = q.eq('status', 'cancelado').order('data_hora', { ascending: false }).limit(100);
  if (filtro === 'todos') q = q.order('data_hora', { ascending: false }).limit(200);
  const lista = ok(await q);

  const valores = {};
  let lancs = [];
  if (dono() && lista.length) {
    const ids = lista.map(a => a.id);
    ok(await sb.from('agendamento_valores').select('*').in('agendamento_id', ids))
      .forEach(v => { valores[v.agendamento_id] = v; });
    lancs = ok(await sb.from('lancamentos').select('id, agendamento_id, tipo, categoria, situacao, aprovacao').in('agendamento_id', ids));
  }

  const agora = Date.now();
  let diaAtual = '';
  const itens = lista.map(a => {
    const dia = fmtDia(a.data_hora);
    const cabecalho = dia !== diaAtual ? `<p class="dia">${esc(dia)}</p>` : '';
    diaAtual = dia;
    const limite = new Date(a.data_hora);
    if (!temHorario(a.data_hora)) limite.setDate(limite.getDate() + 1);
    const atrasado = a.status === 'agendado' && limite.getTime() < agora - 3 * 3600e3;
    const v = valores[a.id];
    return `${cabecalho}
      <button type="button" class="cartao" data-ag="${a.id}">
        <div class="cartao-linha">
          <h3>${fmtHoraOuNao(a.data_hora)} · ${esc(a.cliente_nome)}</h3>
          ${atrasado ? '<span class="etiqueta laranja">Passou da data</span>' : etiquetaAgendamento(a, dono() ? faturamento(a, v, lancs) : null)}
        </div>
        <p class="linhas">${esc(a.servico)}</p>
        <div class="cartao-linha">
          <p>${esc([a.bairro, a.cidade].filter(Boolean).join(', '))}</p>
          ${dono() && v ? `<span class="valor">${brl(totalServico(v))}</span>` : ''}
        </div>
      </button>`;
  }).join('');

  return {
    html: `
      <div class="cabeca"><h2>Agenda</h2><button type="button" class="btn btn-primario" id="novo-ag">+ Novo agendamento</button></div>
      ${filtrosHtml('agenda', [['proximos', 'Próximos'], ['concluidos', 'Concluídos'], ['cancelados', 'Cancelados'], ['todos', 'Todos']])}
      <div class="lista">${itens || '<p class="vazio">Nenhum agendamento aqui.</p>'}</div>`,
    ligar(el) {
      ligarFiltros(el, 'agenda');
      $('#novo-ag', el).addEventListener('click', () => formAgendamento());
      $$('[data-ag]', el).forEach(b => b.addEventListener('click', () => acao(detalheAgendamento)(b.dataset.ag)));
    },
  };
}

async function detalheAgendamento(id) {
  abrirJanela('Agendamento', '<p class="carregando">Carregando…</p>');
  const a = ok(await sb.from('agendamentos').select('*').eq('id', id).single());
  let v = null;
  let lancs = [];
  if (dono()) {
    v = ok(await sb.from('agendamento_valores').select('*').eq('agendamento_id', id).maybeSingle());
    lancs = ok(await sb.from('lancamentos').select('*').eq('agendamento_id', id).order('criado_em'));
  }
  const end = enderecoTexto(a);
  const whats = linkWhats(a.cliente_telefone);
  const total = totalServico(v);
  const sinal = Number(v?.sinal_valor || 0);
  const temSinal = lancs.some(l => l.categoria === 'Sinal');

  const c = abrirJanela('Agendamento', `
    <dl class="detalhe">
      <dt>Quando</dt><dd>${fmtDataHora(a.data_hora)}</dd>
      <dt>Cliente</dt><dd>${esc(a.cliente_nome)} ${a.cliente_id ? '' : '<span class="etiqueta">Avulso</span>'}</dd>
      ${a.cliente_telefone ? `<dt>Telefone</dt><dd><a href="tel:${esc(soDigitos(a.cliente_telefone))}">${esc(a.cliente_telefone)}</a>${whats ? ` · <a href="${whats}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</dd>` : ''}
      <dt>Serviço</dt><dd class="linhas">${esc(a.servico)}</dd>
      ${end ? `<dt>Endereço</dt><dd><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(end)}" target="_blank" rel="noopener">${esc(end)}</a></dd>` : ''}
      <dt>Situação</dt><dd>${etiquetaAgendamento(a, dono() ? faturamento(a, v, lancs) : null)}</dd>
      ${a.observacoes ? `<dt>Obs.</dt><dd>${esc(a.observacoes)}</dd>` : ''}
    </dl>

    ${dono() ? `
    <div class="secao">
      <h3>Valores</h3>
      ${v ? `<dl class="detalhe">
        <dt>Serviço</dt><dd>${brl(v.valor_servico)}</dd>
        <dt>Deslocamento</dt><dd>${brl(v.valor_deslocamento)}</dd>
        <dt>Total</dt><dd>${brl(total)}</dd>
        ${sinal ? `<dt>Sinal</dt><dd>${brl(sinal)}${v.sinal_forma_pagamento ? ` (${esc(v.sinal_forma_pagamento)})` : ''}</dd>
        <dt>Falta</dt><dd>${brl(Math.max(total - sinal, 0))}</dd>` : ''}
        ${v.forma_pagamento ? `<dt>Pagamento</dt><dd>${esc(v.forma_pagamento)}</dd>` : ''}
      </dl>` : '<p class="dica">Sem valores. Toque em Editar para colocar.</p>'}
      ${lancs.length ? `<p class="dica">Já lançado no financeiro:</p><div class="lista">${lancs.map(l => cartaoLancamento(l)).join('')}</div>` : ''}
      <div class="botoes">
        ${sinal && !temSinal ? '<button type="button" class="btn btn-pequeno" id="reg-sinal">Registrar sinal recebido</button>' : ''}
        ${!lancs.some(l => l.tipo === 'entrada' && l.categoria !== 'Sinal') && (a.status === 'concluido' || total)
          ? `<button type="button" class="btn btn-pequeno btn-escuro" id="gerar-cobranca">${a.status === 'concluido' ? 'Faturar' : 'Gerar cobrança antecipada'}</button>` : ''}
      </div>
    </div>` : ''}

    <div class="botoes">
      ${a.status === 'agendado' ? `
        <button type="button" class="btn btn-verde" data-status="concluido">✓ Concluído</button>
        <button type="button" class="btn btn-perigo" data-status="cancelado">Cancelar</button>` : `
        <button type="button" class="btn" data-status="agendado">Voltar para agendado</button>`}
      <button type="button" class="btn" id="editar-ag">Editar</button>
      ${dono() ? '<button type="button" class="btn btn-perigo" id="excluir-ag">Excluir</button>' : ''}
    </div>

    <div class="secao"><h3>Fotos do serviço</h3><div id="fotos-ag"></div></div>`);

  blocoFotos($('#fotos-ag', c), 'agendamento_id', a.id);

  $$('[data-status]', c).forEach(b => b.addEventListener('click', () => comBotao(b, async () => {
    // O dono conclui já informando se o cliente pagou (faturado) ou quando vai pagar (a receber)
    if (b.dataset.status === 'concluido' && dono()) { await formConcluir(a, v, lancs); return; }
    if (b.dataset.status === 'cancelado' && !confirm('Cancelar este agendamento?')) return;
    ok(await sb.from('agendamentos').update({ status: b.dataset.status }).eq('id', a.id));
    aviso(b.dataset.status === 'concluido' ? 'Serviço concluído.' : 'Situação atualizada.');
    recarregar();
    await detalheAgendamento(a.id);
  })));
  $('#editar-ag', c).addEventListener('click', () => formAgendamento(a, v));
  $('#excluir-ag', c)?.addEventListener('click', e => comBotao(e.currentTarget, async () => {
    if (!confirm('Excluir este agendamento e as fotos dele? Não dá para desfazer.')) return;
    await apagarArquivosDe('agendamento_id', a.id);
    ok(await sb.from('agendamentos').delete().eq('id', a.id));
    fecharJanela();
    aviso('Agendamento excluído.');
    recarregar();
  }));
  $('#reg-sinal', c)?.addEventListener('click', e => comBotao(e.currentTarget, async () => {
    if (!confirm(`Registrar ${brl(sinal)} de sinal como recebido hoje?`)) return;
    ok(await sb.from('lancamentos').insert({
      tipo: 'entrada', situacao: 'pago', categoria: 'Sinal', valor: sinal,
      descricao: `Sinal - ${a.cliente_nome} - ${umaLinha(a.servico, 60)}`,
      forma_pagamento: v.sinal_forma_pagamento, data_pagamento: hoje(),
      cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, agendamento_id: a.id,
    }));
    aviso('Sinal registrado no financeiro.');
    await detalheAgendamento(a.id);
  }));
  $('#gerar-cobranca', c)?.addEventListener('click', e => comBotao(e.currentTarget, async () => {
    if (a.status === 'concluido') { await formConcluir(a, v, lancs, { jaConcluido: true }); return; }
    let prazo = 0;
    if (a.cliente_id) {
      const cli = ok(await sb.from('clientes').select('prazo_pagamento_dias').eq('id', a.cliente_id).maybeSingle());
      prazo = cli?.prazo_pagamento_dias || 0;
    }
    // Vencimento = data do serviço + prazo do cliente (ex.: B2B 30 dias)
    const base = isoLocal(new Date(a.data_hora));
    formLancamento(null, {
      tipo: 'entrada', situacao: 'pendente', categoria: 'Serviço',
      valor: Math.max(total - sinal, 0),
      descricao: `${a.cliente_nome} - ${umaLinha(a.servico, 60)}`,
      forma_pagamento: v.forma_pagamento,
      data_vencimento: somarDias(base, prazo),
      cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, agendamento_id: a.id,
    });
  }));
}

// Concluir (ou faturar) um serviço: pergunta se o cliente já pagou
async function formConcluir(a, v, lancs, { jaConcluido = false } = {}) {
  const total = totalServico(v);
  const sinal = Number(v?.sinal_valor || 0);
  const sinalLancado = lancs.some(l => l.categoria === 'Sinal');
  let prazo = 0;
  if (a.cliente_id) {
    const cli = ok(await sb.from('clientes').select('prazo_pagamento_dias').eq('id', a.cliente_id).maybeSingle());
    prazo = cli?.prazo_pagamento_dias || 0;
  }
  const vencPadrao = somarDias(isoLocal(new Date(a.data_hora)), prazo);
  const c = abrirJanela(jaConcluido ? 'Faturar serviço' : 'Concluir serviço', `
    <form class="form">
      <p><strong>${esc(a.cliente_nome)}</strong></p>
      <p class="muted linhas pequeno">${esc(a.servico)}</p>
      ${total ? `<p class="dica">Total ${brl(total)}${sinal ? ` · sinal ${brl(sinal)} · falta ${brl(Math.max(total - sinal, 0))}` : ''}</p>` : ''}
      <label>Valor a receber (R$) <input name="valor" inputmode="decimal" placeholder="0,00" value="${paraCampoValor(Math.max(total - sinal, 0))}"></label>
      ${sinal && !sinalLancado ? `<label class="check"><input type="checkbox" name="lancar_sinal" checked> Registrar também o sinal de ${brl(sinal)} como recebido</label>` : ''}
      <p style="font-weight:700;color:var(--ink)">O cliente já pagou?</p>
      <div class="escolha">
        <label><input type="radio" name="pagou" value="sim"> Sim, já recebi</label>
        <label><input type="radio" name="pagou" value="nao"> Não, vai pagar depois</label>
      </div>
      <div class="grade" data-so="sim" hidden>
        <label>Recebido em <input type="date" name="data_pagamento" value="${hoje()}"></label>
        <label>Forma <select name="forma_sim"><option value="">-</option>${opcoes(FORMAS, v?.forma_pagamento)}</select></label>
      </div>
      <div class="grade" data-so="nao" hidden>
        <label>Vai pagar em <input type="date" name="data_vencimento" value="${vencPadrao}"></label>
        <label>Forma <select name="forma_nao"><option value="">-</option>${opcoes(FORMAS, v?.forma_pagamento)}</select></label>
        <p class="dica inteiro">🔔 Nesse dia, o painel vai perguntar se o cliente pagou.</p>
      </div>
      <button type="submit" class="btn btn-verde btn-largo">${jaConcluido ? 'Faturar' : '✓ Concluir serviço'}</button>
      <button type="button" class="btn btn-largo" id="voltar-concluir">Voltar</button>
    </form>`);
  const f = $('form', c);
  $$('input[name=pagou]', f).forEach(r => r.addEventListener('change', () => {
    $('[data-so=sim]', f).hidden = f.pagou.value !== 'sim';
    $('[data-so=nao]', f).hidden = f.pagou.value !== 'nao';
  }));
  $('#voltar-concluir', c).addEventListener('click', () => acao(detalheAgendamento)(a.id));
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      if (!d.pagou) { aviso('Responda se o cliente já pagou.', true); return; }
      const pagou = d.pagou === 'sim';
      const valor = paraNumero(d.valor);
      if (!pagou && !valor) { aviso('Coloque o valor a receber.', true); return; }
      if (pagou ? !d.data_pagamento : !d.data_vencimento) { aviso('Coloque a data.', true); return; }
      if (d.lancar_sinal) {
        ok(await sb.from('lancamentos').insert({
          tipo: 'entrada', situacao: 'pago', categoria: 'Sinal', valor: sinal,
          descricao: `Sinal - ${a.cliente_nome} - ${umaLinha(a.servico, 60)}`,
          forma_pagamento: v?.sinal_forma_pagamento || null, data_pagamento: hoje(),
          cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, agendamento_id: a.id,
        }));
      }
      if (valor) {
        ok(await sb.from('lancamentos').insert({
          tipo: 'entrada', categoria: 'Serviço', valor,
          descricao: `${a.cliente_nome} - ${umaLinha(a.servico, 60)}`,
          situacao: pagou ? 'pago' : 'pendente',
          data_pagamento: pagou ? d.data_pagamento : null,
          data_vencimento: pagou ? null : d.data_vencimento,
          forma_pagamento: pagou ? d.forma_sim : d.forma_nao,
          cliente_id: a.cliente_id, cliente_nome: a.cliente_nome, agendamento_id: a.id,
        }));
      }
      if (!jaConcluido) ok(await sb.from('agendamentos').update({ status: 'concluido' }).eq('id', a.id));
      aviso(pagou ? 'Concluído e faturado.' : `Concluído e a receber. Lembrete em ${fmtData(d.data_vencimento)}.`);
      recarregar();
      await detalheAgendamento(a.id);
    });
  });
}

// Abre o catálogo por cômodo e devolve o texto do serviço (ou null)
function escolherServicos() {
  return new Promise(resolve => {
    const qtd = new Map(); // "cômodo|item|ação" -> quantidade
    let comodo = CATALOGO[0][0];
    const dlg = document.createElement('dialog');
    dlg.className = 'janela';
    dlg.innerHTML = `
      <div class="janela-topo"><h2>Escolher serviços</h2><button type="button" class="btn-fechar" aria-label="Fechar">×</button></div>
      <div class="janela-corpo">
        <div class="filtros" data-comodos>${CATALOGO.map(([n]) => `<button type="button" class="filtro" data-comodo="${esc(n)}">${esc(n)}</button>`).join('')}</div>
        <div class="itens-catalogo"></div>
        <button type="button" class="btn btn-primario btn-largo" data-usar></button>
      </div>`;
    document.body.append(dlg);
    const terminar = valor => { dlg.close(); dlg.remove(); resolve(valor); };
    const acoes = () => (comodo === REPAROS ? [['reparo', 'Quantidade']] : [['montar', 'Montar'], ['desmontar', 'Desmontar']]);
    const total = () => [...qtd.values()].reduce((s, n) => s + n, 0);
    const pintar = () => {
      $$('[data-comodo]', dlg).forEach(b => {
        const n = [...qtd].filter(([k, v]) => v && k.startsWith(b.dataset.comodo + '|')).length;
        b.setAttribute('aria-pressed', b.dataset.comodo === comodo);
        b.textContent = b.dataset.comodo + (n ? ` (${n})` : '');
      });
      const itens = CATALOGO.find(([n]) => n === comodo)[1];
      $('.itens-catalogo', dlg).innerHTML = itens.map(item => `
        <div class="item-cat">
          <strong>${esc(item)}</strong>
          ${acoes().map(([id, rot]) => {
            const n = qtd.get(`${comodo}|${item}|${id}`) || 0;
            return `<div class="passo${n ? ' on' : ''}"><span>${rot}</span>
              <button type="button" data-k="${esc(`${comodo}|${item}|${id}`)}" data-d="-1" aria-label="Menos ${rot} ${esc(item)}">−</button>
              <b>${n}</b>
              <button type="button" data-k="${esc(`${comodo}|${item}|${id}`)}" data-d="1" aria-label="Mais ${rot} ${esc(item)}">+</button></div>`;
          }).join('')}
        </div>`).join('');
      const t = total();
      $('[data-usar]', dlg).textContent = t ? `Usar ${t} ${t === 1 ? 'item' : 'itens'}` : 'Escolha ao menos 1 item';
      $('[data-usar]', dlg).disabled = !t;
    };
    const texto = () => {
      const grupos = { montar: [], desmontar: [], reparo: [] };
      qtd.forEach((n, k) => {
        if (!n) return;
        const [com, item, acao] = k.split('|');
        grupos[acao].push(`${n}× ${item}${acao === 'reparo' ? '' : ` (${com.toLowerCase()})`}`);
      });
      return [['montar', 'Montar'], ['desmontar', 'Desmontar'], ['reparo', 'Reparos']]
        .filter(([id]) => grupos[id].length)
        .map(([id, t]) => `${t}: ${grupos[id].join(', ')}`).join('\n');
    };
    $('.btn-fechar', dlg).addEventListener('click', () => terminar(null));
    dlg.addEventListener('cancel', e => { e.preventDefault(); terminar(null); });
    $('[data-comodos]', dlg).addEventListener('click', e => {
      const b = e.target.closest('[data-comodo]');
      if (b) { comodo = b.dataset.comodo; pintar(); }
    });
    $('.itens-catalogo', dlg).addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      qtd.set(b.dataset.k, Math.max(0, (qtd.get(b.dataset.k) || 0) + Number(b.dataset.d)));
      pintar();
    });
    $('[data-usar]', dlg).addEventListener('click', () => terminar(texto()));
    pintar();
    dlg.showModal();
  });
}

function formAgendamento(a = null, v = null) {
  const c = abrirJanela(a ? 'Editar agendamento' : 'Novo agendamento', `
    <form class="form" id="f-ag">
      <input type="hidden" name="cliente_id" value="${esc(a?.cliente_id)}">
      <div class="campo-cliente">
        <label>Cliente <input name="cliente_nome" required autocomplete="off" value="${esc(a?.cliente_nome)}"></label>
        <button type="button" class="btn btn-icone" data-escolher title="Escolher cliente cadastrado" aria-label="Escolher cliente cadastrado">👤</button>
      </div>
      <p class="dica" data-vinculo></p>
      <label>Telefone / WhatsApp <input name="cliente_telefone" type="tel" inputmode="tel" value="${esc(a?.cliente_telefone)}"></label>

      <div class="secao">
        <h3>Serviço</h3>
        <button type="button" class="btn btn-escuro" id="abrir-catalogo">🛠️ Escolher itens por cômodo</button>
        <label>O que vai ser feito <textarea name="servico" required placeholder="Toque no botão acima ou escreva aqui">${esc(a?.servico)}</textarea></label>
      </div>

      <div class="grade">
        <label>Data <input type="date" name="data" required value="${a ? isoLocal(new Date(a.data_hora)) : ''}"></label>
        <label>Horário (opcional) <input type="time" name="hora" value="${a && temHorario(a.data_hora) ? fmtHora(a.data_hora) : ''}"></label>
      </div>

      <div class="secao"><h3>Endereço do serviço</h3>${camposEndereco(a || {}, { comCep: false })}</div>

      ${dono() ? `
      <div class="secao">
        <h3>Valores</h3>
        <div class="grade">
          <label>Valor do serviço <input name="valor_servico" inputmode="decimal" placeholder="0,00" value="${paraCampoValor(v?.valor_servico)}"></label>
          <label>Deslocamento <input name="valor_deslocamento" inputmode="decimal" placeholder="0,00" value="${paraCampoValor(v?.valor_deslocamento)}"></label>
          <label class="inteiro">Forma de pagamento <select name="forma_pagamento"><option value="">-</option>${opcoes(FORMAS, v?.forma_pagamento)}</select></label>
        </div>
        <label class="check"><input type="checkbox" name="tem_sinal" ${Number(v?.sinal_valor) ? 'checked' : ''}> Cliente pagou sinal</label>
        <div class="grade" id="campos-sinal">
          <label>Valor do sinal <input name="sinal_valor" inputmode="decimal" placeholder="0,00" value="${paraCampoValor(v?.sinal_valor)}"></label>
          <label>Pago via <select name="sinal_forma_pagamento"><option value="">-</option>${opcoes(FORMAS, v?.sinal_forma_pagamento)}</select></label>
        </div>
        <p class="dica" id="soma-ag"></p>
      </div>` : ''}

      <label>Observações <textarea name="observacoes">${esc(a?.observacoes)}</textarea></label>
      <button type="submit" class="btn btn-primario btn-largo">Salvar</button>
      ${a ? '<button type="button" class="btn btn-largo" id="voltar-ag">Voltar sem salvar</button>' : ''}
    </form>`);

  const f = $('form', c);
  ligarSeletorCliente(f, { comEndereco: true });
  $('#abrir-catalogo', c).addEventListener('click', async () => {
    const texto = await escolherServicos();
    if (texto) f.servico.value = texto;
  });
  $('#voltar-ag', c)?.addEventListener('click', () => acao(detalheAgendamento)(a.id));

  if (dono()) {
    const soma = () => {
      $('#campos-sinal', c).hidden = !f.tem_sinal.checked;
      const total = paraNumero(f.valor_servico.value) + paraNumero(f.valor_deslocamento.value);
      const falta = Math.max(total - (f.tem_sinal.checked ? paraNumero(f.sinal_valor.value) : 0), 0);
      $('#soma-ag', c).textContent = total ? `Total ${brl(total)} · falta receber ${brl(falta)}` : '';
    };
    ['valor_servico', 'valor_deslocamento', 'sinal_valor'].forEach(n => f.elements[n].addEventListener('input', soma));
    f.tem_sinal.addEventListener('change', soma);
    soma();
  }

  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      const dados = {
        cliente_id: d.cliente_id ? Number(d.cliente_id) : null,
        cliente_nome: d.cliente_nome,
        cliente_telefone: d.cliente_telefone,
        servico: d.servico,
        data_hora: new Date(`${d.data}T${d.hora || '00:00'}`).toISOString(),
        observacoes: d.observacoes,
        ...lerEndereco(d),
      };
      let id = a?.id;
      if (id) ok(await sb.from('agendamentos').update(dados).eq('id', id));
      else id = ok(await sb.from('agendamentos').insert(dados).select('id').single()).id;

      if (dono()) {
        ok(await sb.from('agendamento_valores').upsert({
          agendamento_id: id,
          valor_servico: paraNumero(d.valor_servico),
          valor_deslocamento: paraNumero(d.valor_deslocamento),
          sinal_valor: d.tem_sinal ? paraNumero(d.sinal_valor) : 0,
          sinal_forma_pagamento: d.tem_sinal ? d.sinal_forma_pagamento : null,
          forma_pagamento: d.forma_pagamento,
          atualizado_em: new Date().toISOString(),
        }));
      }
      aviso('Agendamento salvo.');
      recarregar();
      await detalheAgendamento(id);
    });
  });
}

/* =========================================================
   CLIENTES (só o dono)
   ========================================================= */
const prazoTexto = d => (d ? `${d} dias` : 'À vista');

async function telaClientes() {
  const todos = ok(await sb.from('clientes').select('*').order('nome'));
  const filtro = E.filtro.clientes || 'ativos';
  const base = todos.filter(c =>
    filtro === 'inativos' ? !c.ativo : c.ativo && (filtro === 'ativos' || c.tipo === filtro));

  const cartao = c => `
    <button type="button" class="cartao" data-cli="${c.id}" data-busca="${esc(semAcento(c.nome) + ' ' + soDigitos(c.telefone) + ' ' + soDigitos(c.documento))}">
      <div class="cartao-linha">
        <h3>${c.tipo === 'pj' ? '🏢' : '👤'} ${esc(c.nome)}</h3>
        <span class="etiqueta ${c.tipo === 'pj' ? 'laranja' : ''}">${c.tipo === 'pj' ? `B2B · ${prazoTexto(c.prazo_pagamento_dias)}` : 'B2C'}</span>
      </div>
      <p>${esc([c.telefone, c.bairro, c.cidade].filter(Boolean).join(' · ') || 'Sem telefone')}</p>
    </button>`;

  return {
    html: `
      <div class="cabeca"><h2>Clientes</h2><button type="button" class="btn btn-primario" id="novo-cli">+ Novo cliente</button></div>
      <input type="search" class="busca" id="busca-cli" placeholder="Buscar por nome, telefone, CPF ou CNPJ" aria-label="Buscar cliente">
      ${filtrosHtml('clientes', [['ativos', 'Todos'], ['pf', 'Pessoa física (B2C)'], ['pj', 'Empresas (B2B)'], ['inativos', 'Inativos']])}
      <div class="lista">${base.map(cartao).join('') || '<p class="vazio">Nenhum cliente aqui ainda.</p>'}</div>
      <p class="vazio" id="sem-resultado" hidden>Nenhum cliente encontrado.</p>`,
    ligar(el) {
      ligarFiltros(el, 'clientes');
      $('#novo-cli', el).addEventListener('click', () => formCliente());
      $$('[data-cli]', el).forEach(b => b.addEventListener('click', () => formCliente(todos.find(c => String(c.id) === b.dataset.cli))));
      $('#busca-cli', el).addEventListener('input', e => {
        const t = semAcento(e.target.value);
        const td = soDigitos(e.target.value);
        let algum = false;
        $$('[data-cli]', el).forEach(b => {
          const mostra = !t || b.dataset.busca.includes(t) || (td && b.dataset.busca.includes(td));
          b.hidden = !mostra;
          algum ||= mostra;
        });
        $('#sem-resultado', el).hidden = algum || !base.length;
      });
    },
  };
}

function formCliente(cli = null) {
  const c = abrirJanela(cli ? 'Editar cliente' : 'Novo cliente', `
    <form class="form">
      <div class="escolha">
        <label><input type="radio" name="tipo" value="pf" ${cli?.tipo !== 'pj' ? 'checked' : ''}> Pessoa física (B2C)</label>
        <label><input type="radio" name="tipo" value="pj" ${cli?.tipo === 'pj' ? 'checked' : ''}> Empresa (B2B)</label>
      </div>
      <label><span data-rotulo-nome>Nome</span> <input name="nome" required value="${esc(cli?.nome)}"></label>
      <label><span data-rotulo-doc>CPF</span> <input name="documento" inputmode="numeric" value="${esc(cli?.documento)}"></label>
      <div class="grade">
        <label>Telefone / WhatsApp <input name="telefone" type="tel" inputmode="tel" value="${esc(cli?.telefone)}"></label>
        <label>E-mail <input name="email" type="email" value="${esc(cli?.email)}"></label>
      </div>
      <label>Prazo para pagar
        <select name="prazo_pagamento_dias">${opcoes(PRAZOS, cli?.prazo_pagamento_dias ?? 0)}</select>
        <span class="dica">Usado para calcular a data do "a receber" (ex.: empresa que paga em 30 dias).</span>
      </label>
      <div class="secao"><h3>Endereço</h3>${camposEndereco(cli || {})}</div>
      <label>Observações <textarea name="observacoes">${esc(cli?.observacoes)}</textarea></label>
      <label class="check"><input type="checkbox" name="ativo" ${cli?.ativo === false ? '' : 'checked'}> Cliente ativo (aparece na lista do 👤)</label>
      <button type="submit" class="btn btn-primario btn-largo">Salvar</button>
      ${cli ? '<button type="button" class="btn btn-perigo btn-largo" id="excluir-cli">Excluir cliente</button>' : ''}
    </form>`);

  const f = $('form', c);
  ligarCep(f);
  const ajustarTipo = () => {
    const pj = f.tipo.value === 'pj';
    $('[data-rotulo-nome]', f).textContent = pj ? 'Nome da empresa' : 'Nome';
    $('[data-rotulo-doc]', f).textContent = pj ? 'CNPJ' : 'CPF';
  };
  $$('input[name=tipo]', f).forEach(r => r.addEventListener('change', () => {
    ajustarTipo();
    if (!cli && f.tipo.value === 'pj' && f.prazo_pagamento_dias.value === '0') f.prazo_pagamento_dias.value = '30';
  }));
  ajustarTipo();

  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      const dados = {
        tipo: d.tipo, nome: d.nome, documento: d.documento, telefone: d.telefone, email: d.email,
        prazo_pagamento_dias: Number(d.prazo_pagamento_dias || 0),
        observacoes: d.observacoes, ativo: f.ativo.checked, ...lerEndereco(d),
      };
      if (cli) ok(await sb.from('clientes').update(dados).eq('id', cli.id));
      else ok(await sb.from('clientes').insert(dados));
      fecharJanela();
      aviso('Cliente salvo.');
      recarregar();
    });
  });
  $('#excluir-cli', c)?.addEventListener('click', e => comBotao(e.currentTarget, async () => {
    if (!confirm('Excluir este cliente? Os agendamentos e lançamentos dele continuam, só perdem o vínculo. Para só esconder, desmarque "Cliente ativo".')) return;
    ok(await sb.from('clientes').delete().eq('id', cli.id));
    fecharJanela();
    aviso('Cliente excluído.');
    recarregar();
  }));
}

/* =========================================================
   LANÇAMENTOS (entradas e saídas)
   ========================================================= */
function etiquetaLancamento(l) {
  if (l.aprovacao === 'pendente') return '<span class="etiqueta laranja">Aguardando aprovação</span>';
  if (l.aprovacao === 'recusado') return '<span class="etiqueta vermelho">Recusada</span>';
  if (l.situacao === 'pago') return `<span class="etiqueta verde">${l.tipo === 'entrada' ? 'Recebido' : 'Pago'} ${fmtData(l.data_pagamento).slice(0, 5)}</span>`;
  if (!dono()) return `<span class="etiqueta laranja">Previsto ${fmtData(l.data_vencimento).slice(0, 5)}</span>`;
  const atrasado = l.data_vencimento < hoje();
  return `<span class="etiqueta ${atrasado ? 'vermelho' : 'laranja'}">${atrasado ? 'Atrasado' : 'Vence'} ${fmtData(l.data_vencimento).slice(0, 5)}</span>`;
}

function cartaoLancamento(l) {
  const quem = l.tipo === 'entrada' ? l.cliente_nome : nomeMembro(l.favorecido_id);
  const sub = [l.categoria, quem, l.forma_pagamento].filter(Boolean).join(' · ');
  return `
    <button type="button" class="cartao" data-lanc="${l.id}">
      <div class="cartao-linha">
        <h3>${esc(l.descricao)}</h3>
        <span class="valor ${l.tipo}">${l.tipo === 'saida' ? '−' : '+'} ${brl(l.valor)}</span>
      </div>
      <div class="cartao-linha"><p>${esc(sub)}</p>${etiquetaLancamento(l)}</div>
    </button>`;
}
function ligarCartoesLancamento(el) {
  $$('[data-lanc]', el).forEach(b => b.addEventListener('click', () => acao(detalheLancamento)(b.dataset.lanc)));
}

async function detalheLancamento(id) {
  abrirJanela('Lançamento', '<p class="carregando">Carregando…</p>');
  const l = ok(await sb.from('lancamentos').select('*').eq('id', id).single());
  const entrada = l.tipo === 'entrada';
  const minha = l.user_id === E.user.id;
  const c = abrirJanela(entrada ? 'Entrada' : 'Saída', `
    <dl class="detalhe">
      <dt>Valor</dt><dd class="valor ${l.tipo}">${brl(l.valor)}</dd>
      <dt>Descrição</dt><dd>${esc(l.descricao)}</dd>
      ${l.categoria ? `<dt>Categoria</dt><dd>${esc(l.categoria)}</dd>` : ''}
      <dt>Situação</dt><dd>${etiquetaLancamento(l)}</dd>
      ${l.data_pagamento ? `<dt>${entrada ? 'Recebido em' : 'Pago em'}</dt><dd>${fmtData(l.data_pagamento)}</dd>` : ''}
      ${l.data_vencimento ? `<dt>Vencimento</dt><dd>${fmtData(l.data_vencimento)}</dd>` : ''}
      ${l.forma_pagamento ? `<dt>Forma</dt><dd>${esc(l.forma_pagamento)}</dd>` : ''}
      ${l.cliente_nome ? `<dt>Cliente</dt><dd>${esc(l.cliente_nome)}</dd>` : ''}
      ${l.favorecido_id ? `<dt>Pago para</dt><dd>${esc(nomeMembro(l.favorecido_id))}</dd>` : ''}
      ${dono() ? `<dt>Lançado por</dt><dd>${esc(nomeMembro(l.user_id))}</dd>` : ''}
    </dl>
    ${dono() ? `
    <div class="botoes">
      ${l.situacao === 'pendente' && l.aprovacao === 'aprovado' ? `<button type="button" class="btn btn-verde" id="quitar">✓ Marcar como ${entrada ? 'recebido' : 'pago'}</button>` : ''}
      ${l.aprovacao === 'pendente' ? '<button type="button" class="btn btn-verde" data-aprov="aprovado">Aprovar</button><button type="button" class="btn btn-perigo" data-aprov="recusado">Recusar</button>' : ''}
      ${l.agendamento_id ? '<button type="button" class="btn" id="ver-ag">Ver agendamento</button>' : ''}
      <button type="button" class="btn" id="editar-l">Editar</button>
      <button type="button" class="btn btn-perigo" id="excluir-l">Excluir</button>
    </div>` : ''}
    <div class="secao"><h3>Comprovantes</h3><div id="fotos-l"></div></div>`);

  blocoFotos($('#fotos-l', c), 'lancamento_id', l.id, { podeEnviar: dono() || minha });
  if (!dono()) return;

  $('#quitar', c)?.addEventListener('click', () => formQuitar(l));
  $$('[data-aprov]', c).forEach(b => b.addEventListener('click', () => comBotao(b, async () => {
    ok(await sb.from('lancamentos').update({ aprovacao: b.dataset.aprov }).eq('id', l.id));
    aviso(b.dataset.aprov === 'aprovado' ? 'Despesa aprovada.' : 'Despesa recusada.');
    recarregar();
    await detalheLancamento(l.id);
  })));
  $('#ver-ag', c)?.addEventListener('click', () => acao(detalheAgendamento)(l.agendamento_id));
  $('#editar-l', c).addEventListener('click', () => formLancamento(l));
  $('#excluir-l', c).addEventListener('click', e => comBotao(e.currentTarget, async () => {
    if (!confirm('Excluir este lançamento e os comprovantes dele? Não dá para desfazer.')) return;
    await apagarArquivosDe('lancamento_id', l.id);
    ok(await sb.from('lancamentos').delete().eq('id', l.id));
    fecharJanela();
    aviso('Lançamento excluído.');
    recarregar();
  }));
}

function formQuitar(l) {
  const entrada = l.tipo === 'entrada';
  const c = abrirJanela(entrada ? 'Confirmar recebimento' : 'Confirmar pagamento', `
    <form class="form">
      <p><strong>${esc(l.descricao)}</strong><br>${brl(l.valor)}</p>
      <label>${entrada ? 'Recebido em' : 'Pago em'} <input type="date" name="data_pagamento" required value="${hoje()}"></label>
      <label>Forma <select name="forma_pagamento"><option value="">-</option>${opcoes(FORMAS, l.forma_pagamento)}</select></label>
      <button type="submit" class="btn btn-verde btn-largo">Confirmar</button>
      <button type="button" class="btn btn-largo" id="voltar">Voltar</button>
    </form>`);
  const f = $('form', c);
  $('#voltar', c).addEventListener('click', () => acao(detalheLancamento)(l.id));
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      ok(await sb.from('lancamentos').update({ situacao: 'pago', data_pagamento: d.data_pagamento, forma_pagamento: d.forma_pagamento }).eq('id', l.id));
      aviso(entrada ? 'Recebimento registrado.' : 'Pagamento registrado.');
      recarregar();
      await detalheLancamento(l.id);
    });
  });
}

// Formulário de entrada/saída do dono. "preset" preenche campos de um lançamento novo.
function formLancamento(l = null, preset = {}) {
  const x = { tipo: 'entrada', situacao: 'pago', data_pagamento: hoje(), ...preset, ...(l || {}) };
  const membrosEquipe = ajudantes();
  const c = abrirJanela(l ? 'Editar lançamento' : 'Novo lançamento', `
    <form class="form">
      <input type="hidden" name="agendamento_id" value="${esc(x.agendamento_id)}">
      <input type="hidden" name="cliente_id" value="${esc(x.cliente_id)}">
      <div class="escolha">
        <label><input type="radio" name="tipo" value="entrada" ${x.tipo === 'entrada' ? 'checked' : ''}> Entrada</label>
        <label><input type="radio" name="tipo" value="saida" ${x.tipo === 'saida' ? 'checked' : ''}> Saída</label>
      </div>
      <label>Descrição <input name="descricao" required value="${esc(x.descricao)}"></label>
      <div class="grade">
        <label>Valor (R$) <input name="valor" inputmode="decimal" required placeholder="0,00" value="${paraCampoValor(x.valor)}"></label>
        <label>Categoria <select name="categoria"></select></label>
      </div>
      <div class="escolha">
        <label><input type="radio" name="situacao" value="pago" ${x.situacao === 'pago' ? 'checked' : ''}> <span data-txt-pago></span></label>
        <label><input type="radio" name="situacao" value="pendente" ${x.situacao === 'pendente' ? 'checked' : ''}> <span data-txt-pendente></span></label>
      </div>
      <div class="grade">
        <label data-so="pago"><span data-txt-data></span> <input type="date" name="data_pagamento" value="${esc(x.data_pagamento)}"></label>
        <label data-so="pendente">Vencimento <input type="date" name="data_vencimento" value="${esc(x.data_vencimento)}"></label>
        <label>Forma <select name="forma_pagamento"><option value="">-</option>${opcoes(FORMAS, x.forma_pagamento)}</select></label>
      </div>
      <div data-so="entrada">
        <div class="campo-cliente">
          <label>Cliente (opcional) <input name="cliente_nome" autocomplete="off" value="${esc(x.cliente_nome)}"></label>
          <button type="button" class="btn btn-icone" data-escolher title="Escolher cliente cadastrado" aria-label="Escolher cliente cadastrado">👤</button>
        </div>
        <p class="dica" data-vinculo></p>
      </div>
      <label data-so="equipe">Pago para
        <select name="favorecido_id"><option value="">-</option>${opcoes(membrosEquipe.map(m => [m.user_id, m.nome]), x.favorecido_id)}</select>
        <span class="dica">Escolha o ajudante para ele ver este pagamento no painel dele.</span>
      </label>
      <button type="submit" class="btn btn-primario btn-largo">Salvar</button>
    </form>`);

  const f = $('form', c);
  const sel = f.categoria;
  let tipoAnterior = null;
  const atualizar = () => {
    const tipo = f.tipo.value;
    const entrada = tipo === 'entrada';
    if (tipo !== tipoAnterior) {
      const lista = entrada ? CAT_ENTRADA : CAT_SAIDA;
      const atual = tipoAnterior === null ? x.categoria : sel.value;
      const extra = atual && !lista.includes(atual) && tipoAnterior === null ? [atual] : [];
      sel.innerHTML = `<option value="">-</option>${opcoes([...lista, ...extra], atual)}`;
      tipoAnterior = tipo;
    }
    $('[data-txt-pago]', f).textContent = entrada ? 'Já recebi' : 'Já paguei';
    $('[data-txt-pendente]', f).textContent = entrada ? 'A receber' : 'A pagar';
    $('[data-txt-data]', f).textContent = entrada ? 'Recebido em' : 'Pago em';
    const pago = f.situacao.value === 'pago';
    $('[data-so=pago]', f).hidden = !pago;
    $('[data-so=pendente]', f).hidden = pago;
    f.data_pagamento.required = pago;
    f.data_vencimento.required = !pago;
    $('[data-so=entrada]', f).hidden = !entrada;
    $('[data-so=equipe]', f).hidden = entrada || !CAT_EQUIPE.includes(sel.value);
  };
  f.addEventListener('change', atualizar);
  atualizar();

  ligarSeletorCliente(f, {
    aoEscolher(cli) {
      if (f.situacao.value === 'pendente' && !l) f.data_vencimento.value = somarDias(hoje(), cli.prazo_pagamento_dias || 0);
    },
  });

  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      const valor = paraNumero(d.valor);
      if (!valor) { aviso('Coloque o valor.', true); return; }
      const entrada = d.tipo === 'entrada';
      const pago = d.situacao === 'pago';
      const dados = {
        tipo: d.tipo, situacao: d.situacao, descricao: d.descricao, valor,
        categoria: d.categoria, forma_pagamento: d.forma_pagamento,
        data_pagamento: pago ? d.data_pagamento : null,
        data_vencimento: d.data_vencimento,
        cliente_id: entrada && d.cliente_id ? Number(d.cliente_id) : null,
        cliente_nome: entrada ? d.cliente_nome : null,
        favorecido_id: !entrada && CAT_EQUIPE.includes(d.categoria) ? d.favorecido_id : null,
        agendamento_id: d.agendamento_id ? Number(d.agendamento_id) : null,
      };
      let id = l?.id;
      if (id) ok(await sb.from('lancamentos').update(dados).eq('id', id));
      else id = ok(await sb.from('lancamentos').insert(dados).select('id').single()).id;
      aviso('Lançamento salvo.');
      recarregar();
      await detalheLancamento(id);
    });
  });
}

/* =========================================================
   FINANCEIRO (só o dono)
   ========================================================= */
async function telaFinanceiro() {
  if (!E.mes) { const d = new Date(); E.mes = [d.getFullYear(), d.getMonth()]; }
  const [y, m] = E.mes;
  const ini = isoLocal(new Date(y, m, 1));
  const fim = isoLocal(new Date(y, m + 1, 0));
  const filtro = E.filtro.financeiro || 'mes';

  const [pagos, pendentes] = await Promise.all([
    sb.from('lancamentos').select('*').eq('situacao', 'pago').eq('aprovacao', 'aprovado')
      .gte('data_pagamento', ini).lte('data_pagamento', fim).order('data_pagamento', { ascending: false }),
    sb.from('lancamentos').select('*').eq('situacao', 'pendente').eq('aprovacao', 'aprovado')
      .order('data_vencimento', { ascending: true }),
  ]).then(r => r.map(ok));

  const soma = lista => lista.reduce((s, l) => s + Number(l.valor), 0);
  const entrou = soma(pagos.filter(l => l.tipo === 'entrada'));
  const saiu = soma(pagos.filter(l => l.tipo === 'saida'));
  const aReceber = pendentes.filter(l => l.tipo === 'entrada');
  const aPagar = pendentes.filter(l => l.tipo === 'saida');

  let lista = pagos;
  if (filtro === 'receber') lista = aReceber;
  if (filtro === 'pagar') lista = aPagar;

  let porCategoria = '';
  if (filtro === 'mes') {
    const cats = {};
    pagos.filter(l => l.tipo === 'saida').forEach(l => { const k = l.categoria || 'Sem categoria'; cats[k] = (cats[k] || 0) + Number(l.valor); });
    const linhas = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    if (linhas.length) porCategoria = `
      <div class="cartao" style="margin-top:16px">
        <h3>Saídas do mês por categoria</h3>
        <dl class="detalhe" style="margin-top:8px">${linhas.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${brl(v)}</dd>`).join('')}</dl>
      </div>`;
  }

  return {
    html: `
      <div class="cabeca">
        <h2>Financeiro</h2>
        <div class="botoes">
          <button type="button" class="btn btn-verde" id="nova-entrada">+ Entrada</button>
          <button type="button" class="btn btn-escuro" id="nova-saida">+ Saída</button>
        </div>
      </div>
      <div class="cabeca">
        <div class="mes">
          <button type="button" class="btn btn-pequeno" data-mes="-1" aria-label="Mês anterior">◀</button>
          <strong>${new Date(y, m, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong>
          <button type="button" class="btn btn-pequeno" data-mes="1" aria-label="Próximo mês">▶</button>
        </div>
      </div>
      <div class="resumo">
        <div class="resumo-item verde"><span>Entrou no mês</span><strong>${brl(entrou)}</strong></div>
        <div class="resumo-item vermelho"><span>Saiu no mês</span><strong>${brl(saiu)}</strong></div>
        <div class="resumo-item"><span>Saldo do mês</span><strong>${brl(entrou - saiu)}</strong></div>
        <div class="resumo-item laranja"><span>A receber (total)</span><strong>${brl(soma(aReceber))}</strong></div>
      </div>
      ${filtrosHtml('financeiro', [['mes', 'Movimento do mês'], ['receber', `A receber (${aReceber.length})`], ['pagar', `A pagar (${aPagar.length})`]])}
      <div class="lista">${lista.map(cartaoLancamento).join('') || '<p class="vazio">Nada por aqui.</p>'}</div>
      ${porCategoria}`,
    ligar(el) {
      ligarFiltros(el, 'financeiro');
      ligarCartoesLancamento(el);
      $('#nova-entrada', el).addEventListener('click', () => formLancamento(null, { tipo: 'entrada' }));
      $('#nova-saida', el).addEventListener('click', () => formLancamento(null, { tipo: 'saida' }));
      $$('[data-mes]', el).forEach(b => b.addEventListener('click', () => {
        const d = new Date(E.mes[0], E.mes[1] + Number(b.dataset.mes), 1);
        E.mes = [d.getFullYear(), d.getMonth()];
        recarregar();
      }));
    },
  };
}

/* =========================================================
   APROVAÇÕES (despesas lançadas pelo ajudante)
   ========================================================= */
async function telaAprovacoes() {
  const lista = ok(await sb.from('lancamentos').select('*').eq('aprovacao', 'pendente').order('criado_em', { ascending: true }));
  let anexos = [];
  let urls = {};
  if (lista.length) {
    anexos = ok(await sb.from('anexos').select('*').in('lancamento_id', lista.map(l => l.id)));
    urls = await urlsAssinadas(anexos.map(a => a.caminho));
  }
  const itens = lista.map(l => {
    const fotos = anexos.filter(a => a.lancamento_id === l.id);
    return `
      <div class="cartao">
        <div class="cartao-linha"><h3>${esc(l.categoria || 'Despesa')}</h3><span class="valor saida">${brl(l.valor)}</span></div>
        <p>${esc(l.descricao)}</p>
        <p>${esc(nomeMembro(l.user_id))} · ${fmtData(l.data_pagamento || l.data_vencimento)}${l.forma_pagamento ? ` · ${esc(l.forma_pagamento)}` : ''}</p>
        ${fotos.length ? `<div class="fotos" style="margin-top:8px">${fotos.map(a => miniatura(a, urls[a.caminho], false)).join('')}</div>` : '<p class="dica">Sem comprovante.</p>'}
        <div class="botoes" style="margin-top:10px">
          <button type="button" class="btn btn-verde" data-aprovar="${l.id}">✓ Aprovar</button>
          <button type="button" class="btn btn-perigo" data-recusar="${l.id}">Recusar</button>
          <button type="button" class="btn btn-fantasma" data-lanc="${l.id}">Detalhes</button>
        </div>
      </div>`;
  }).join('');

  return {
    html: `
      <div class="cabeca"><h2>Aprovações</h2></div>
      <p class="muted pequeno" style="margin-bottom:12px">Despesas lançadas pelo ajudante. Só entram no financeiro depois que você aprova.</p>
      <div class="lista">${itens || '<p class="vazio">Nenhuma despesa esperando aprovação. 👍</p>'}</div>`,
    ligar(el) {
      ligarCartoesLancamento(el);
      const decidir = (b, aprovacao) => comBotao(b, async () => {
        const id = b.dataset.aprovar || b.dataset.recusar;
        if (aprovacao === 'recusado' && !confirm('Recusar esta despesa?')) return;
        ok(await sb.from('lancamentos').update({ aprovacao }).eq('id', id));
        aviso(aprovacao === 'aprovado' ? 'Despesa aprovada.' : 'Despesa recusada.');
        recarregar();
      });
      $$('[data-aprovar]', el).forEach(b => b.addEventListener('click', () => decidir(b, 'aprovado')));
      $$('[data-recusar]', el).forEach(b => b.addEventListener('click', () => decidir(b, 'recusado')));
    },
  };
}

/* =========================================================
   EQUIPE (pagamentos ao ajudante)
   ========================================================= */
async function telaEquipe() {
  const equipe = ajudantes();
  if (!equipe.length) {
    return { html: '<div class="cabeca"><h2>Equipe</h2></div><p class="vazio">Nenhum ajudante cadastrado.</p>' };
  }
  const pags = ok(await sb.from('lancamentos').select('*').in('favorecido_id', equipe.map(m => m.user_id))
    .eq('aprovacao', 'aprovado').order('criado_em', { ascending: false }).limit(300));
  const soma = lista => lista.reduce((s, l) => s + Number(l.valor), 0);

  const blocos = equipe.map(m => {
    const dele = pags.filter(l => l.favorecido_id === m.user_id);
    const recebido = dele.filter(l => l.situacao === 'pago');
    const aReceber = dele.filter(l => l.situacao === 'pendente');
    return `
      <div class="secao" style="border:0;padding-top:0">
        <div class="cabeca">
          <h3 style="font-size:19px">${esc(m.nome)}</h3>
          <button type="button" class="btn btn-primario" data-pagar="${esc(m.user_id)}">+ Lançar pagamento</button>
        </div>
        <div class="resumo" style="grid-template-columns:1fr 1fr">
          <div class="resumo-item verde"><span>Já recebeu</span><strong>${brl(soma(recebido))}</strong></div>
          <div class="resumo-item laranja"><span>A receber</span><strong>${brl(soma(aReceber))}</strong></div>
        </div>
        <div class="lista">${dele.slice(0, 30).map(cartaoLancamento).join('') || '<p class="vazio">Nenhum pagamento lançado ainda.</p>'}</div>
      </div>`;
  }).join('');

  return {
    html: `
      <div class="cabeca"><h2>Equipe</h2></div>
      <p class="muted pequeno" style="margin-bottom:12px">O ajudante vê no painel dele o que já recebeu e o que tem a receber. Para marcar como pago, toque no lançamento.</p>
      ${blocos}`,
    ligar(el) {
      ligarCartoesLancamento(el);
      $$('[data-pagar]', el).forEach(b => b.addEventListener('click', () => {
        const nome = nomeMembro(b.dataset.pagar);
        formLancamento(null, { tipo: 'saida', categoria: 'Ajudante', favorecido_id: b.dataset.pagar, descricao: `Pagamento ${nome}` });
      }));
    },
  };
}

/* =========================================================
   AJUDANTE: MINHAS DESPESAS
   ========================================================= */
async function telaDespesas() {
  const lista = ok(await sb.from('lancamentos').select('*').eq('user_id', E.user.id).order('criado_em', { ascending: false }).limit(100));
  return {
    html: `
      <div class="cabeca"><h2>Minhas despesas</h2><button type="button" class="btn btn-primario" id="nova-desp">+ Nova despesa</button></div>
      <p class="muted pequeno" style="margin-bottom:12px">Pedágio, combustível, refeição, material… Cada despesa fica "aguardando" até o Isac aprovar.</p>
      <div class="lista">${lista.map(cartaoLancamento).join('') || '<p class="vazio">Você ainda não lançou despesas.</p>'}</div>`,
    ligar(el) {
      ligarCartoesLancamento(el);
      $('#nova-desp', el).addEventListener('click', acao(formDespesa));
    },
  };
}

async function formDespesa() {
  // Serviços de 30 dias atrás até 30 dias à frente, para ligar a despesa ao serviço
  const agora = Date.now();
  const servicos = ok(await sb.from('agendamentos').select('id, cliente_nome, servico, data_hora')
    .gte('data_hora', new Date(agora - 30 * 864e5).toISOString())
    .lte('data_hora', new Date(agora + 30 * 864e5).toISOString())
    .neq('status', 'cancelado').order('data_hora', { ascending: false }));

  const c = abrirJanela('Nova despesa', `
    <form class="form">
      <label>Categoria <select name="categoria" required><option value="">Escolha…</option>${opcoes(CAT_DESPESA_AJUDANTE)}</select></label>
      <div class="grade">
        <label>Valor (R$) <input name="valor" inputmode="decimal" required placeholder="0,00"></label>
        <label>Data <input type="date" name="data_pagamento" required value="${hoje()}"></label>
      </div>
      <label>Pago com <select name="forma_pagamento"><option value="">-</option>${opcoes(FORMAS)}</select></label>
      <label>Descrição (opcional) <input name="descricao" placeholder="Ex.: pedágio Imigrantes"></label>
      <label>Serviço relacionado (opcional)
        <select name="agendamento_id"><option value="">Nenhum</option>${opcoes(servicos.map(s => [s.id, `${fmtData(isoLocal(new Date(s.data_hora)))} · ${s.cliente_nome} · ${umaLinha(s.servico, 40)}`]))}</select>
      </label>
      <label>Foto do comprovante (opcional) <input type="file" name="arquivo" accept="image/*,application/pdf"></label>
      <button type="submit" class="btn btn-primario btn-largo">Enviar para aprovação</button>
    </form>`);
  const f = $('form', c);
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    comBotao(f.querySelector('[type=submit]'), async () => {
      const d = lerForm(f);
      const valor = paraNumero(d.valor);
      if (!valor) { aviso('Coloque o valor.', true); return; }
      const nova = ok(await sb.from('lancamentos').insert({
        tipo: 'saida', situacao: 'pago', aprovacao: 'pendente',
        categoria: d.categoria, valor, data_pagamento: d.data_pagamento,
        forma_pagamento: d.forma_pagamento, descricao: d.descricao || d.categoria,
        agendamento_id: d.agendamento_id ? Number(d.agendamento_id) : null,
      }).select('id').single());
      const arquivo = f.arquivo.files[0];
      if (arquivo) {
        try { await enviarAnexo(arquivo, { lancamento_id: nova.id }); }
        catch (e) { aviso(`Despesa salva, mas a foto não foi: ${msgErro(e)}`, true); }
      }
      fecharJanela();
      aviso('Despesa enviada para aprovação.');
      recarregar();
    });
  });
}

/* =========================================================
   AJUDANTE: MEUS PAGAMENTOS
   ========================================================= */
async function telaPagamentos() {
  const lista = ok(await sb.from('lancamentos').select('*').eq('favorecido_id', E.user.id).eq('aprovacao', 'aprovado')
    .order('criado_em', { ascending: false }));
  const soma = l => l.reduce((s, x) => s + Number(x.valor), 0);
  const recebido = lista.filter(l => l.situacao === 'pago');
  const aReceber = lista.filter(l => l.situacao === 'pendente');
  const cartao = l => `
    <button type="button" class="cartao" data-lanc="${l.id}">
      <div class="cartao-linha"><h3>${esc(l.descricao)}</h3><span class="valor entrada">${brl(l.valor)}</span></div>
      <div class="cartao-linha"><p>${esc(l.forma_pagamento || '')}</p>
        ${l.situacao === 'pago'
          ? `<span class="etiqueta verde">Recebido ${fmtData(l.data_pagamento)}</span>`
          : `<span class="etiqueta laranja">Previsto ${fmtData(l.data_vencimento)}</span>`}
      </div>
    </button>`;
  return {
    html: `
      <div class="cabeca"><h2>Meus pagamentos</h2></div>
      <div class="resumo" style="grid-template-columns:1fr 1fr">
        <div class="resumo-item verde"><span>Já recebi</span><strong>${brl(soma(recebido))}</strong></div>
        <div class="resumo-item laranja"><span>A receber</span><strong>${brl(soma(aReceber))}</strong></div>
      </div>
      ${aReceber.length ? `<p class="dia">A receber</p><div class="lista">${aReceber.map(cartao).join('')}</div>` : ''}
      <p class="dia">Recebidos</p>
      <div class="lista">${recebido.map(cartao).join('') || '<p class="vazio">Nenhum pagamento recebido ainda.</p>'}</div>`,
    ligar: ligarCartoesLancamento,
  };
}

/* =========================================================
   NOTIFICAÇÕES (só o dono)
   ========================================================= */
const CHAVE_ADIAR = 'lm-adiar-';
const CHAVE_RESUMO = 'lm-resumo-dia';
const lerLocal = k => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarLocal = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento: só não lembra */ } };
// "Ainda não pagou": pergunta de novo no dia seguinte
const adiado = id => (lerLocal(CHAVE_ADIAR + id) || '') > hoje();
const adiar = id => gravarLocal(CHAVE_ADIAR + id, somarDias(hoje(), 1));

async function cobrancasVencidas() {
  return ok(await sb.from('lancamentos').select('*').eq('tipo', 'entrada').eq('situacao', 'pendente')
    .eq('aprovacao', 'aprovado').lte('data_vencimento', hoje()).order('data_vencimento', { ascending: true }));
}
async function servicosDeHoje() {
  const ini = new Date();
  ini.setHours(0, 0, 0, 0);
  const fim = new Date(ini);
  fim.setDate(fim.getDate() + 1);
  return ok(await sb.from('agendamentos').select('*').eq('status', 'agendado')
    .gte('data_hora', ini.toISOString()).lt('data_hora', fim.toISOString()).order('data_hora', { ascending: true }));
}
function quandoVence(l) {
  if (l.data_vencimento === hoje()) return 'para <b>hoje</b>';
  const dias = Math.round((new Date(hoje()) - new Date(l.data_vencimento)) / 864e5);
  return `para <b>${fmtData(l.data_vencimento)}</b> (${dias} ${dias === 1 ? 'dia' : 'dias'} de atraso)`;
}
async function marcarRecebido(l) {
  ok(await sb.from('lancamentos').update({ situacao: 'pago', data_pagamento: hoje() }).eq('id', l.id));
  aviso(`Pagamento de ${l.cliente_nome || 'cliente'} recebido. Serviço faturado.`);
  recarregar();
}

// Janela que aparece sozinha: "fulano pagou?"
function perguntarPagamento(l) {
  return new Promise(resolve => {
    const quem = esc(l.cliente_nome || l.descricao);
    const dlg = document.createElement('dialog');
    dlg.className = 'janela';
    dlg.innerHTML = `
      <div class="janela-topo"><h2>🔔 Pagamento agendado</h2><button type="button" class="btn-fechar" aria-label="Fechar">×</button></div>
      <div class="janela-corpo">
        <p style="font-size:18px"><b>${quem}</b> agendou o pagamento de <b>${brl(l.valor)}</b> ${quandoVence(l)}.</p>
        <p class="muted pequeno linhas">${esc(l.descricao)}</p>
        <p style="font-size:20px;font-weight:700;color:var(--ink)">${quem} pagou?</p>
        <button type="button" class="btn btn-verde btn-largo" data-r="sim">Sim, pagou</button>
        <button type="button" class="btn btn-largo" data-r="nao">Ainda não (lembrar amanhã)</button>
        <button type="button" class="btn btn-fantasma btn-largo" data-r="data">Combinou outra data</button>
        <div class="grade" data-nova hidden>
          <label>Nova data <input type="date" min="${somarDias(hoje(), 1)}" value="${somarDias(hoje(), 1)}"></label>
          <button type="button" class="btn btn-primario" data-r="salvar" style="align-self:end">Salvar data</button>
        </div>
      </div>`;
    document.body.append(dlg);
    const terminar = r => { dlg.close(); dlg.remove(); resolve(r); };
    $('.btn-fechar', dlg).addEventListener('click', () => terminar('fechar'));
    dlg.addEventListener('cancel', e => { e.preventDefault(); terminar('fechar'); });
    dlg.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      const r = b.dataset.r;
      if (r === 'data') { $('[data-nova]', dlg).hidden = false; return; }
      comBotao(b, async () => {
        if (r === 'sim') await marcarRecebido(l);
        if (r === 'nao') { adiar(l.id); aviso('Combinado: pergunto de novo amanhã.'); }
        if (r === 'salvar') {
          const nova = $('[data-nova] input', dlg).value;
          if (!nova) return;
          ok(await sb.from('lancamentos').update({ data_vencimento: nova }).eq('id', l.id));
          aviso(`Pagamento remarcado para ${fmtData(nova)}.`);
          recarregar();
        }
        terminar(r);
      });
    });
    dlg.showModal();
  });
}

// Resumo dos serviços do dia, uma vez por dia
function avisarServicosDeHoje(lista) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'janela';
    dlg.innerHTML = `
      <div class="janela-topo"><h2>🔔 Serviços de hoje</h2><button type="button" class="btn-fechar" aria-label="Fechar">×</button></div>
      <div class="janela-corpo">
        <p>Você tem <b>${lista.length} ${lista.length === 1 ? 'serviço' : 'serviços'}</b> hoje:</p>
        <div class="lista">${lista.map(a => `<div class="cartao"><h3>${fmtHoraOuNao(a.data_hora)} · ${esc(a.cliente_nome)}</h3><p class="linhas">${esc(umaLinha(a.servico, 90))}</p><p>${esc([a.bairro, a.cidade].filter(Boolean).join(', '))}</p></div>`).join('')}</div>
        <button type="button" class="btn btn-primario btn-largo" data-ok>Ok</button>
      </div>`;
    document.body.append(dlg);
    const terminar = () => { dlg.close(); dlg.remove(); resolve(); };
    $('.btn-fechar', dlg).addEventListener('click', terminar);
    $('[data-ok]', dlg).addEventListener('click', terminar);
    dlg.addEventListener('cancel', e => { e.preventDefault(); terminar(); });
    dlg.showModal();
  });
}

let verificandoAvisos = false;
async function verificarAvisos() {
  // Não interrompe se houver uma janela aberta (ex.: preenchendo um formulário)
  if (!dono() || verificandoAvisos || document.hidden || document.querySelector('dialog[open]')) return;
  verificandoAvisos = true;
  try {
    if (lerLocal(CHAVE_RESUMO) !== hoje()) {
      const deHoje = await servicosDeHoje();
      gravarLocal(CHAVE_RESUMO, hoje());
      if (deHoje.length) await avisarServicosDeHoje(deHoje);
    }
    const lista = (await cobrancasVencidas()).filter(l => !adiado(l.id));
    for (const l of lista) {
      if (await perguntarPagamento(l) === 'fechar') break;
    }
    atualizarContador();
  } catch (e) {
    console.error(e);
  } finally {
    verificandoAvisos = false;
  }
}
let avisosLigados = false;
function ligarAvisos() {
  if (avisosLigados) return;
  avisosLigados = true;
  setTimeout(verificarAvisos, 1000);
  setInterval(verificarAvisos, 30 * 60e3);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) verificarAvisos(); });
}

async function telaAvisos() {
  const em7 = somarDias(hoje(), 7);
  const [vencidas, deHoje, proximas] = await Promise.all([
    cobrancasVencidas(),
    servicosDeHoje(),
    sb.from('lancamentos').select('*').eq('tipo', 'entrada').eq('situacao', 'pendente').eq('aprovacao', 'aprovado')
      .gt('data_vencimento', hoje()).lte('data_vencimento', em7).order('data_vencimento', { ascending: true }).then(ok),
  ]);
  const cartaoCobranca = l => `
    <div class="cartao">
      <div class="cartao-linha"><h3>${esc(l.cliente_nome || l.descricao)}</h3><span class="valor entrada">${brl(l.valor)}</span></div>
      <p>Pagamento agendado ${quandoVence(l)}.${adiado(l.id) ? ' <span class="etiqueta">lembrete amanhã</span>' : ''}</p>
      <p style="font-weight:700;color:var(--ink);margin-top:6px">Pagou?</p>
      <div class="botoes" style="margin-top:8px">
        <button type="button" class="btn btn-verde btn-pequeno" data-sim="${l.id}">Sim, pagou</button>
        <button type="button" class="btn btn-pequeno" data-nao="${l.id}">Ainda não</button>
        <button type="button" class="btn btn-fantasma btn-pequeno" data-lanc="${l.id}">Detalhes</button>
      </div>
    </div>`;
  const cartaoServico = a => `
    <button type="button" class="cartao" data-ag="${a.id}">
      <div class="cartao-linha"><h3>${fmtHoraOuNao(a.data_hora)} · ${esc(a.cliente_nome)}</h3>${etiquetaStatus(a.status)}</div>
      <p class="linhas">${esc(umaLinha(a.servico, 90))}</p>
      <p>${esc([a.bairro, a.cidade].filter(Boolean).join(', '))}</p>
    </button>`;
  const nada = !vencidas.length && !deHoje.length && !proximas.length;
  return {
    html: `
      ${nada ? '<p class="vazio">Nada para hoje. 👍</p>' : ''}
      ${vencidas.length ? `<p class="dia">Pagamentos para confirmar</p><div class="lista">${vencidas.map(cartaoCobranca).join('')}</div>` : ''}
      ${deHoje.length ? `<p class="dia">Serviços de hoje</p><div class="lista">${deHoje.map(cartaoServico).join('')}</div>` : ''}
      ${proximas.length ? `<p class="dia">Pagamentos dos próximos 7 dias</p><div class="lista">${proximas.map(cartaoLancamento).join('')}</div>` : ''}
      <p class="muted pequeno" style="margin-top:16px">As perguntas aparecem sozinhas quando o painel está aberto, no dia do pagamento.</p>`,
    ligar(el) {
      ligarCartoesLancamento(el);
      $$('[data-ag]', el).forEach(b => b.addEventListener('click', () => acao(detalheAgendamento)(b.dataset.ag)));
      $$('[data-sim]', el).forEach(b => b.addEventListener('click', () => comBotao(b, async () => {
        await marcarRecebido(vencidas.find(l => String(l.id) === b.dataset.sim));
        await abrirAvisos();
      })));
      $$('[data-nao]', el).forEach(b => b.addEventListener('click', acao(async () => {
        adiar(b.dataset.nao);
        aviso('Combinado: pergunto de novo amanhã.');
        await abrirAvisos();
      })));
    },
  };
}

// Sino no topo: abre as notificações numa janela
async function abrirAvisos() {
  abrirJanela('🔔 Notificações', '<p class="carregando">Carregando…</p>');
  const tela = await telaAvisos();
  const c = abrirJanela('🔔 Notificações', tela.html);
  tela.ligar(c);
  atualizarContador();
}
$('#btn-avisos').addEventListener('click', acao(abrirAvisos));

const TELAS = {
  agenda: telaAgenda,
  clientes: telaClientes,
  financeiro: telaFinanceiro,
  aprovacoes: telaAprovacoes,
  equipe: telaEquipe,
  despesas: telaDespesas,
  pagamentos: telaPagamentos,
};

/* =========================================================
   INÍCIO
   ========================================================= */
(async function iniciar() {
  sb.auth.onAuthStateChange(evento => {
    if (evento === 'SIGNED_OUT' && E.user) { E.user = null; E.membro = null; mostrarLogin('Sua sessão terminou. Entre de novo.'); }
  });
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) await entrar(data.session.user);
    else mostrarLogin();
  } catch (e) {
    console.error(e);
    mostrarLogin(msgErro(e));
  }
})();
