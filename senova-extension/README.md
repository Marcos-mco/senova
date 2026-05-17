# Senova — Extensão Chrome

Captura vagas de qualquer site e envia para o Pipeline Senova com 1 clique.

## Instalação

### Passo 1 — Gerar os ícones (fazer só uma vez)
1. Abra o arquivo `generate-icons.html` no Chrome
2. Clique em "Baixar icon16.png, icon48.png, icon128.png"
3. Mova os 3 arquivos baixados para a pasta `senova-extension/icons/`

### Passo 2 — Carregar a extensão no Chrome
1. Acesse `chrome://extensions`
2. Ative o **Modo desenvolvedor** (canto superior direito)
3. Clique em **"Carregar sem compactação"**
4. Selecione a pasta `senova-extension/`
5. O ícone **S** dourado aparecerá na barra do Chrome

## Uso

1. Navegue até uma página de vaga (LinkedIn, Gupy, Indeed, Vagas.com.br, Catho ou qualquer site)
2. Clique no ícone **S** na barra do Chrome
3. Os campos Cargo, Empresa e URL são preenchidos automaticamente — edite se necessário
4. Clique em **"Salvar no Pipeline"**
5. No Senova, clique em **"Importar vagas"** no Pipeline para ver a vaga capturada

## Sites com extração automática
- LinkedIn Jobs
- Gupy
- Indeed / Indeed.com.br
- Vagas.com.br
- Catho
- Qualquer outro site (fallback genérico via `<h1>` + título da página)
