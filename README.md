# 🏐 Torneio de Vôlei 2026 — UNINASSAU

Site do Campeonato de Vôlei da 6ª Semana Acadêmica UNINASSAU. Reúne em uma única página todo o fluxo do atleta: **inscrição, check-in, retirada de kit e certificado**.

🔗 **Acesse:** https://santosmiqueias.github.io/tornei-volei-uninassau/

## Funcionalidades

| Etapa | O que faz |
| --- | --- |
| 1. Inscrição | Cadastra o atleta (nome e CPF) e gera um QR Code de credenciamento |
| 2. Check-in | Registra presença pelo CPF (+1 por sessão, de um total de 4) e mostra a frequência |
| 3. Retirada de kit | Confirma a entrega do kit e gera um comprovante em PDF com 2 vias (atleta e organização); se o kit já foi retirado, emite 2ª via |
| 4. Certificado | Liberado com frequência mínima de **75%** (3 de 4 sessões); gerado em PDF direto no navegador |

## Tecnologias

- **HTML5** semântico (`header`, `nav`, `main`, `section`, `footer`)
- **CSS3** com cena 3D animada (quadra, rede e bola) e layout responsivo
- **JavaScript** puro (sem frameworks)
- [**jsPDF**](https://github.com/parallax/jsPDF) para gerar o certificado e o comprovante no navegador
- [**QR Code API**](https://goqr.me/api/) (api.qrserver.com) para o QR Code de credenciamento
- **localStorage** para guardar os inscritos no próprio navegador

## Estrutura do projeto

```
tornei-volei-uninassau/
├── index.html      # Página principal
├── css/
│   └── style.css   # Estilos e animações
├── js/
│   └── script.js   # Lógica de inscrição, check-in, kit e PDFs
├── .editorconfig
├── .gitignore
└── README.md
```

## Como rodar localmente

Não precisa instalar nada. Basta clonar e abrir o `index.html` no navegador:

```bash
git clone https://github.com/santosmiqueias/tornei-volei-uninassau.git
cd tornei-volei-uninassau
```

Depois abra o `index.html` (ou use a extensão *Live Server* do VS Code).

> ⚠️ Os dados ficam salvos apenas no `localStorage` do navegador em que o site foi usado. Limpar os dados do navegador apaga os inscritos.

## Autor

**Miqueias Santos** — Análise e Desenvolvimento de Sistemas, UNINASSAU
[@santosmiqueias](https://github.com/santosmiqueias)
