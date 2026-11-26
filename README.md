# 🏐 Torneio de Vôlei 2026 — UNINASSAU

Site do Campeonato de Vôlei da 6ª Semana Acadêmica UNINASSAU. Reúne em uma única página todo o fluxo do atleta: **inscrição, check-in, retirada de kit e certificado**.

🔗 **Acesse:** https://santosmiqueias.github.io/tornei-volei-uninassau/

## Funcionalidades

| Etapa | O que faz |
| --- | --- |
| 1. Inscrição | Cadastra o atleta com validação de nome completo e CPF (dígitos verificadores), bloqueia CPF duplicado e gera o QR Code de credenciamento, com opção de imprimir a credencial |
| 2. Check-in | Registra +1 presença por sessão (Sessão 1 a 4), sem contar duas vezes a mesma sessão; lê o QR Code pela câmera em navegadores compatíveis (Chrome/Android) |
| 3. Retirada de kit | Confirma a entrega e gera um comprovante em PDF com 2 vias (atleta e organização); se o kit já foi retirado, emite 2ª via |
| 4. Certificado | Consulta pelo CPF; liberado com frequência mínima de **75%** (3 de 4 sessões); PDF gerado no navegador com código de verificação fixo |
| ★ Painel | Contadores (inscritos, check-ins, kits e certificados), lista de atletas com busca, exportação para CSV (abre no Excel) e opção de apagar os dados |

Outros cuidados:

- Máscara de CPF nos campos e envio com a tecla Enter
- Funciona bem no celular e respeita quem prefere menos animação
- Acessível por teclado e leitor de tela (link "pular para o conteúdo", mensagens anunciadas, campos com erro marcados)
- Nomes exibidos com `textContent`, sem risco de injeção de HTML
- Compatível com os dados salvos pela versão anterior
- Sincroniza entre abas abertas ao mesmo tempo

## Tecnologias

- **HTML5** semântico (`header`, `nav`, `main`, `section`, `footer`)
- **CSS3** com cena 3D animada (quadra, rede e bola) e layout responsivo
- **JavaScript** puro (sem frameworks)
- [**jsPDF**](https://github.com/parallax/jsPDF) para gerar o certificado e o comprovante no navegador
- [**qrcodejs**](https://github.com/davidshimjs/qrcodejs) para gerar o QR Code de credenciamento no próprio navegador (o CPF não sai do computador do usuário)
- **localStorage** para guardar os inscritos no próprio navegador

## Estrutura do projeto

```
tornei-volei-uninassau/
├── index.html      # Página principal
├── css/
│   └── style.css   # Estilos e animações
├── js/
│   ├── script.js   # Lógica de inscrição, check-in, kit, PDFs e painel
│   └── vendor/
│       └── qrcode.min.js  # Biblioteca de QR Code (qrcodejs)
├── assets/
│   └── favicon.svg # Ícone da aba
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
