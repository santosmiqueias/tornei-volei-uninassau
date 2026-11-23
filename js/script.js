const TOTAL_SESSOES = 4; // 3 presenças = 75%
let atletaSelecionado = null;

// QUESTÃO 07: localStorage só armazena String -> JSON.parse() converte texto em Array/Objeto
function carregarInscritos() {
    const dados = localStorage.getItem("sgja_inscritos");
    return dados ? JSON.parse(dados) : [];
}

// QUESTÃO 07: JSON.stringify() converte Array/Objeto em String antes de salvar
function salvarInscritos(lista) {
    localStorage.setItem("sgja_inscritos", JSON.stringify(lista));
}

// QUESTÃO 05: Captura de elementos do DOM com document.querySelector()
const btnInscrever = document.querySelector("#btn-inscrever");
const btnCheckin = document.querySelector("#btn-checkin");
const btnPdf = document.querySelector("#btn-pdf");

// Utilitário visual: exibe uma mensagem com cor por tipo ("ok", "erro", "aviso", "info")
function mostrarStatus(elemento, mensagem, tipo) {
    elemento.textContent = mensagem;
    elemento.className = `status status-${tipo}`;
}

// Utilitário visual: atualiza a barra de sessões e o estado do certificado
function atualizarPainelPresencas(aluno) {
    const painel = document.querySelector("#presencas");
    const statusCert = document.querySelector("#status-certificado");
    if (!aluno) {
        painel.hidden = true;
        mostrarStatus(statusCert, "Faça o check-in do atleta para verificar se o certificado está liberado.", "info");
        return;
    }
    const frequencia = (aluno.presencas / TOTAL_SESSOES) * 100;
    painel.hidden = false;
    painel.classList.toggle("aprovado", frequencia >= 75);
    document.querySelector("#presencas-pct").textContent = `${frequencia}%`;
    document.querySelectorAll(".sessoes span").forEach((barra, i) => {
        barra.classList.toggle("ativa", i < aluno.presencas);
    });
    if (frequencia >= 75) {
        mostrarStatus(statusCert, `Certificado liberado para ${aluno.nome} (${frequencia}% de frequência).`, "ok");
    } else {
        const faltam = Math.ceil(TOTAL_SESSOES * 0.75) - aluno.presencas;
        mostrarStatus(statusCert, `${aluno.nome} está com ${frequencia}%. Falta${faltam > 1 ? "m" : ""} ${faltam} presença${faltam > 1 ? "s" : ""} para liberar o certificado.`, "aviso");
    }
}

// ETAPA 1: INSCRIÇÃO + TEMPLATE LITERALS + QR CODE
btnInscrever.addEventListener("click", () => {
    const nomeAluno = document.querySelector("#nome-atleta").value.trim();
    const cpfAluno = document.querySelector("#cpf-atleta").value.trim();
    const statusInscricao = document.querySelector("#status-inscricao");
    if (!nomeAluno || !cpfAluno) {
        mostrarStatus(statusInscricao, "Preencha nome e CPF para realizar a inscrição.", "erro");
        return;
    }
    mostrarStatus(statusInscricao, "", "info");

    const inscritos = carregarInscritos();
    inscritos.push({ nome: nomeAluno, cpf: cpfAluno, presencas: 0 });
    salvarInscritos(inscritos);

    // QUESTÃO 08: Template Literals com crases e ${variavel}
    document.querySelector("#saudacao").textContent = `Olá, ${nomeAluno}! Inscrição confirmada.`;

    // QUESTÃO 09: Injeção dinâmica no atributo src e atualização do alt
    const imgQr = document.querySelector("#img-qr");
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${cpfAluno}`;
    imgQr.alt = `QR Code de inscrição do participante ${nomeAluno}`;
    document.querySelector("#area-qr").style.display = "block";
});

// ETAPA 2 (QUESTÃO 10): FLUXO DE CHECK-IN + REGRA DOS 75%
btnCheckin.addEventListener("click", () => {
    const cpfBuscado = document.querySelector("#cpf-checkin").value.trim();
    const inscritos = carregarInscritos();

    // Busca o aluno pelo CPF lido do QR Code
    const aluno = inscritos.find(item => item.cpf === cpfBuscado);
    const statusCheckin = document.querySelector("#status-checkin");
    if (!aluno) {
        mostrarStatus(statusCheckin, "CPF não encontrado no cadastro.", "erro");
        btnPdf.disabled = true;
        atletaSelecionado = null;
        atualizarPainelPresencas(null);
        return;
    }

    // Regra de negócio: adiciona +1 na presença e persiste novamente
    if (aluno.presencas < TOTAL_SESSOES) aluno.presencas += 1;
    salvarInscritos(inscritos);

    const frequencia = (aluno.presencas / TOTAL_SESSOES) * 100;
    mostrarStatus(statusCheckin,
        `Presença registrada para ${aluno.nome}: ${aluno.presencas}/${TOTAL_SESSOES} (${frequencia}%).`, "ok");

    // Trava de segurança: só libera o botão PDF com frequência >= 75%
    atletaSelecionado = aluno;
    btnPdf.disabled = frequencia < 75;
    atualizarPainelPresencas(aluno);
});

// Utilitário: formata CPF (12345678900 -> 123.456.789-00)
function formatarCPF(cpf) {
    const d = cpf.replace(/\D/g, "");
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}

const NOME_EVENTO = "Torneio de Vôlei 2026";
const SUBTITULO_EVENTO = "6ª Semana Acadêmica UNINASSAU";

// ETAPA 3 (QUESTÃO 06): CERTIFICADO DE ATLETA EM PDF NO CLIENTE COM jsPDF
btnPdf.addEventListener("click", () => {
    if (!atletaSelecionado) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const largura = 297, centro = largura / 2;
    const frequencia = (atletaSelecionado.presencas / TOTAL_SESSOES) * 100;

    // Moldura dupla
    doc.setDrawColor(2, 132, 199);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 269, 182);

    // Título
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.text("CERTIFICADO DE ATLETA", centro, 48, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(2, 132, 199);
    doc.text(`${NOME_EVENTO} - ${SUBTITULO_EVENTO}`, centro, 60, { align: "center" });

    // Corpo do texto
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(15);
    doc.text("Certificamos que", centro, 85, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text(atletaSelecionado.nome.toUpperCase(), centro, 100, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`CPF: ${formatarCPF(atletaSelecionado.cpf)}`, centro, 109, { align: "center" });
    doc.setFontSize(15);
    const corpo = `participou como atleta do ${NOME_EVENTO}, com frequência de ` +
        `${atletaSelecionado.presencas}/${TOTAL_SESSOES} sessões (${frequencia}%), ` +
        `cumprindo a frequência mínima exigida e concluindo o evento com êxito.`;
    doc.text(doc.splitTextToSize(corpo, 220), centro, 124, { align: "center" });

    // Assinaturas
    doc.setLineWidth(0.3);
    doc.setDrawColor(15, 23, 42);
    doc.line(50, 168, 130, 168);
    doc.line(167, 168, 247, 168);
    doc.setFontSize(11);
    doc.text("Coordenação do Evento", 90, 174, { align: "center" });
    doc.text("Comissão Técnica / Arbitragem", 207, 174, { align: "center" });

    // Rodapé com data e código de verificação
    const codigo = `ATL-${atletaSelecionado.cpf.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}  |  Código: ${codigo}`, centro, 190, { align: "center" });

    // Aciona o download diretamente na máquina do usuário, sem sobrecarregar servidor
    doc.save(`certificado-atleta-${atletaSelecionado.cpf}.pdf`);
});

// ETAPA 4: RETIRADA DE KIT + COMPROVANTE EM PDF (2 vias: atleta e organização)
const btnKit = document.querySelector("#btn-kit");

btnKit.addEventListener("click", () => {
    const cpfBuscado = document.querySelector("#cpf-kit").value.trim();
    const tamanho = document.querySelector("#tamanho-camisa").value;
    const statusKit = document.querySelector("#status-kit");
    const inscritos = carregarInscritos();
    const aluno = inscritos.find(item => item.cpf === cpfBuscado);

    if (!aluno) {
        mostrarStatus(statusKit, "CPF não encontrado no cadastro.", "erro");
        return;
    }

    // Regra: o kit só é entregue uma vez; se já foi retirado, emite 2ª via com os dados originais
    let segundaVia = false;
    if (aluno.kit && aluno.kit.retirado) {
        segundaVia = true;
    } else {
        aluno.kit = {
            retirado: true,
            data: new Date().toISOString(),
            tamanho: tamanho,
            protocolo: `KIT-${aluno.cpf.slice(-4)}-${Date.now().toString(36).toUpperCase()}`
        };
        salvarInscritos(inscritos);
    }

    const dataRetirada = new Date(aluno.kit.data).toLocaleString("pt-BR");
    if (segundaVia) {
        mostrarStatus(statusKit, `Kit já retirado por ${aluno.nome} em ${dataRetirada}. Gerando 2ª via do comprovante.`, "aviso");
    } else {
        mostrarStatus(statusKit, `Kit entregue para ${aluno.nome} (camisa ${aluno.kit.tamanho}). Comprovante gerado.`, "ok");
    }

    gerarComprovanteKit(aluno, segundaVia);
});

function gerarComprovanteKit(aluno, segundaVia) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const dataRetirada = new Date(aluno.kit.data).toLocaleString("pt-BR");
    const itens = [
        `Camisa oficial (tamanho ${aluno.kit.tamanho})`,
        "Número de atleta / crachá",
        "Squeeze personalizado",
        "Pulseira de identificação"
    ];

    // Desenha uma via do comprovante a partir da posição vertical y0
    function desenharVia(y0, rotulo) {
        // Cabeçalho
        doc.setFillColor(2, 132, 199);
        doc.rect(10, y0 + 10, 190, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("COMPROVANTE DE RETIRADA DE KIT", 15, y0 + 21.5);
        doc.setFontSize(9);
        doc.text(segundaVia ? `${rotulo} - 2ª VIA` : rotulo, 195, y0 + 21.5, { align: "right" });

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`${NOME_EVENTO} - ${SUBTITULO_EVENTO}`, 15, y0 + 37);

        // Dados do atleta
        const campo = (rotulo, valor, x, y) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(rotulo.toUpperCase(), x, y);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(valor, x, y + 5);
        };
        campo("Atleta", aluno.nome, 15, y0 + 47);
        campo("CPF", formatarCPF(aluno.cpf), 15, y0 + 60);
        campo("Data / hora da retirada", dataRetirada, 75, y0 + 60);
        campo("Protocolo", aluno.kit.protocolo, 140, y0 + 60);

        // Itens entregues com caixas marcadas
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("Itens entregues:", 15, y0 + 77);
        doc.setFont("helvetica", "normal");
        itens.forEach((item, i) => {
            const x = i % 2 === 0 ? 15 : 110;
            const y = y0 + 84 + Math.floor(i / 2) * 7;
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.3);
            doc.rect(x, y - 3.2, 4, 4);
            doc.setLineWidth(0.6);
            doc.line(x + 0.8, y - 1.2, x + 1.7, y);
            doc.line(x + 1.7, y, x + 3.4, y - 2.6);
            doc.text(item, x + 6, y);
        });

        // Declaração
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const declaracao = `Declaro que recebi o kit do atleta acima descrito, em perfeitas condições, ` +
            `e estou ciente de que o número e a pulseira de identificação são pessoais e intransferíveis.`;
        doc.text(doc.splitTextToSize(declaracao, 180), 15, y0 + 104);

        // Assinaturas
        doc.setDrawColor(15, 23, 42);
        doc.setLineWidth(0.3);
        doc.line(15, y0 + 128, 95, y0 + 128);
        doc.line(115, y0 + 128, 195, y0 + 128);
        doc.setTextColor(15, 23, 42);
        doc.text("Assinatura do atleta", 55, y0 + 133, { align: "center" });
        doc.text("Responsável pela entrega", 155, y0 + 133, { align: "center" });
    }

    desenharVia(0, "VIA DO ATLETA");

    // Linha de corte entre as vias
    doc.setDrawColor(148, 163, 184);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, 148.5, 200, 148.5);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("corte aqui", 105, 147, { align: "center" });

    desenharVia(148.5, "VIA DA ORGANIZAÇÃO");

    doc.save(`comprovante-kit-${aluno.cpf}.pdf`);
}
