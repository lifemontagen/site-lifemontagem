# Site Life Montagens

Site estático (HTML, CSS e JavaScript, sem dependências). Para publicar, envie a pasta inteira para qualquer hospedagem com HTTPS (Hostinger, Netlify, Vercel, Cloudflare Pages).

## Estrutura

```
index.html          página principal (primeira dobra, atalhos de cômodos, álbum, avaliações, contato)
orcamento.html      orçamento por cômodo (abre já com o cômodo marcado: orcamento.html?comodo=quarto)
trabalhos.html      álbum completo com filtros por ambiente e visualizador em tela cheia
avaliacoes.html     todas as avaliações do Google (lidas de assets/data/avaliacoes.json)
duvidas.html        valores, condições e perguntas frequentes
privacidade.html    política de privacidade
sitemap.xml         mapa do site para o Google
robots.txt          regras para buscadores
assets/css/style.css
assets/data/avaliacoes.json   avaliações do Google (atualizado automaticamente)
assets/data/cidades.json      263 cidades a até 200 km de São Paulo (SP, sul de MG e RJ): [nome, UF, grupo, km]
assets/js/trabalhos.js        filtros e visualizador da página de trabalhos
fotos/                        fotos originais dos trabalhos, uma pasta por ambiente
assets/data/trabalhos.json    lista de fotos gerada automaticamente
scripts/processar_fotos.py    gera as fotos otimizadas e atualiza as páginas
.github/workflows/processar-fotos.yml   roda o script quando uma foto é enviada
assets/js/avaliacoes.js       monta a página de avaliações
scripts/atualizar_avaliacoes.py   busca as avaliações no Google via Apify
.github/workflows/atualizar-avaliacoes.yml   roda o script todo dia
assets/js/main.js   comportamento (pedido por serviço, álbum, avaliações, menu); número do WhatsApp no topo
assets/fonts/       fonte Archivo (licença OFL), hospedada no próprio site
assets/img/         logo, foto do Isaac recortada, ícones e as 15 fotos do álbum (WebP, 4:5)
```

## Publicar no GitHub Pages com o domínio lifemontagem.com.br

1. Crie um repositório no GitHub e envie **todo o conteúdo desta pasta** (inclusive os arquivos `CNAME`, `.nojekyll` e a pasta `.github`).
2. No repositório: Settings → Pages → Source: "Deploy from a branch", branch `main`, pasta `/ (root)`.
3. Em Settings → Pages → Custom domain, confirme `lifemontagem.com.br` (o arquivo `CNAME` já traz esse valor) e marque "Enforce HTTPS" quando a opção liberar.
4. No painel onde o domínio foi registrado (Registro.br ou outro), crie os registros DNS:
   - 4 registros **A** para `lifemontagem.com.br`: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
   - 1 registro **CNAME** para `www` apontando para `SEU-USUARIO.github.io`
   A propagação do DNS pode levar algumas horas.

## Como adicionar ou trocar fotos de trabalhos

Tudo pelo site do GitHub, sem programa nenhum:

1. No repositório, abra a pasta `fotos` e entre na pasta do ambiente:
   - `cozinhas`
   - `paineis-e-racks`
   - `guarda-roupas-e-armarios`
   - `quarto-infantil`
   - `outros` (lavanderia, banheiro, escritório etc.)
2. Clique em **Add file → Upload files** e arraste a foto.
3. **O nome do arquivo vira o título da foto no site.** Antes de enviar, renomeie a foto, por exemplo `Cozinha planejada branca.jpg` (pode ter acento e espaço; evite nomes como `IMG_1234.jpg`).
4. Clique em **Commit changes**.

Em cerca de 2 minutos, o GitHub gera as versões otimizadas, coloca a foto no começo do álbum da página inicial e na página de trabalhos, e atualiza o filtro do ambiente.

- **Remover uma foto:** abra o arquivo dentro de `fotos/...`, clique nos três pontinhos → Delete file → Commit. Ela sai do site sozinha.
- **Trocar o título:** renomeie o arquivo (lápis de editar → mude o nome no topo → Commit).
- Aceita JPG, PNG, WebP e HEIC (foto direta do iPhone). Fotos em pé ou deitadas funcionam; no álbum elas aparecem no mesmo formato.
- Para acompanhar, veja a aba **Actions** → "Atualizar fotos dos trabalhos" (verde = pronto).

## Google (Search Console)

- `sitemap.xml`: lista as 6 páginas do site. Endereço: https://lifemontagem.com.br/sitemap.xml
- `robots.txt`: libera o Google para ler todo o site e indica onde está o sitemap.
- Dados estruturados (tipo `HomeAndConstructionBusiness`), título, descrição, `canonical` e imagem de compartilhamento já estão em cada página.

Para o Google aceitar e monitorar o site:
1. Acesse https://search.google.com/search-console e adicione a propriedade.
2. Verificação (escolha uma):
   - **Domínio (recomendado):** escolha "Domínio", digite `lifemontagem.com.br` e crie no DNS o registro **TXT** que o Google mostrar. Não precisa mexer no código.
   - **Prefixo de URL:** escolha "Tag HTML", copie a linha `<meta name="google-site-verification" ...>` e cole no `<head>` do `index.html`, no lugar indicado pelo comentário "Google Search Console".
3. Depois de verificado: menu Sitemaps → digite `sitemap.xml` → Enviar.
4. Opcional: Inspeção de URL → `https://lifemontagem.com.br/` → Solicitar indexação.

O código de verificação é gerado pelo Google para a sua conta; por isso ele não vem pronto no site.

## Avaliações do Google (atualização automática)

A página `avaliacoes.html` e a nota da página inicial leem `assets/data/avaliacoes.json`. Todo dia às 6h o GitHub Actions roda `scripts/atualizar_avaliacoes.py`, que busca as avaliações públicas do perfil no Google pela Apify. Se houver avaliação nova, o arquivo é atualizado e publicado sozinho.

Para ligar:
1. Colocar o site num repositório do GitHub e publicar pela Netlify, Vercel, Cloudflare Pages ou GitHub Pages, ligados ao repositório (cada atualização publica sozinha). A Hostinger também publica a partir do GitHub.
2. Na Apify (apify.com), copiar o token da API em Settings → API & Integrations.
3. No GitHub: Settings → Secrets and variables → Actions → New repository secret, com o nome `APIFY_TOKEN` e o token como valor.
4. Para testar na hora: aba Actions → "Atualizar avaliações do Google" → Run workflow.

Custo: cerca de US$ 0,04 por execução (US$ 0,0006 por avaliação). Rodando todo dia, cerca de US$ 1,20 por mês, dentro do crédito gratuito mensal da Apify. Para gastar menos, troque o horário no arquivo do workflow para uma vez por semana.

A faixa de avaliações da página inicial mostra 18 trechos escolhidos e fica fixa; a nota e o total se atualizam sozinhos.

## Depois de publicar

- **Google Search Console**: criar a propriedade, colar a meta tag de verificação no `<head>` do `index.html` (há um comentário marcando o local) e enviar o `sitemap.xml`.
- **Google Analytics (opcional)**: colar o código do GA4 no local indicado no `<head>` e atualizar `privacidade.html`, que hoje informa que o site não usa ferramentas de estatística.
- **Perfil da Empresa no Google**: manter nome, telefone e horário iguais aos do site.

## Orçamento por cômodo

O cliente escolhe os cômodos e, em cada item, quantos são para montar e quantos para desmontar (dá para montar um móvel e desmontar outro no mesmo pedido); Guarda-roupa pede o número de portas; guarda-roupa modular e armário de cozinha, o número de módulos; rack e painel de TV, o tamanho (de 0,80 a 2,50 m), um campo para cada unidade (contador para portas e módulos, barra de arrastar para o tamanho). "Pequenos reparos" aparece como um cômodo, com dobradiças, corrediças, trilhos, puxadores, roldanas, pistões, adaptações, recortes e fechamento de móveis. Os cômodos e itens ficam na lista `ROOMS` do gerador das páginas (peça para alterar).

Nome e cidade são obrigatórios. O campo "Cidade" sugere as 263 cidades a até 200 km (em linha reta) de São Paulo:
- ABC e cidade de São Paulo: "Sem pedágio".
- Demais cidades da lista: "Com pedágio" (o pedágio do trajeto é cobrado à parte).
- "Minha cidade não está na lista": a pessoa informa a cidade nos detalhes.

Para mudar o grupo de uma cidade, edite `assets/data/cidades.json` (terceiro valor: abc, capital ou pedagio).

Exemplo da mensagem enviada no WhatsApp:

```
Olá! Meu nome é Maria. Conheci a Life Montagens pelo site e gostaria de um orçamento.

*Montar*
• Guarda-roupa (quarto): 2 (6 portas; 4 portas)
• Rack (sala): 1 (1,80 m)
• Armário de cozinha (cozinha): 1 (8 módulos)

*Desmontar*
• Cama (quarto): 1

*Pequenos reparos*
• Dobradiças: 4

*Cidade:* Santos (com pedágio)

Poderia me orientar?
```

## Dados ainda a confirmar


- Regiões atendidas além de São Bernardo do Campo (a cidade vem do perfil no Google).
- Horário: o site diz 9h às 17h; o perfil no Google diz que abre às 8h. Deixar os dois iguais.
- Categoria do perfil no Google está como "Empresa madeireira"; o ideal é "Montador de móveis".
- Se todas as fotos são de trabalhos feitos pela equipe. O site as apresenta como fotos reais.
