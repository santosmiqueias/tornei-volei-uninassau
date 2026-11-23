"use strict";

/* =====================================================================
   Torneio de Vôlei 2026 · UNINASSAU
   Fluxo: 1) Inscrição + QR Code  2) Check-in por sessão
          3) Retirada de kit       4) Certificado (frequência >= 75%)
          ★) Painel da organização
   ===================================================================== */

// ---------------------------------------------------------------------
// CONFIGURAÇÃO
// ---------------------------------------------------------------------
const TOTAL_SESSOES = 4;            // 3 presenças = 75%
const FREQUENCIA_MINIMA = 75;       // % exigida para o certificado
const CHAVE_INSCRITOS = "sgja_inscritos";
const CHAVE_SESSAO_ATUAL = "sgja_sessao_atual";
const NOME_EVENTO = "Torneio de Vôlei 2026";
const SUBTITULO_EVENTO = "6ª Semana Acadêmica UNINASSAU";

// Cores do tema usadas nos PDFs (RGB)
const COR = {
    azul: [2, 132, 199],
    texto: [15, 23, 42],
    cinza: [100, 116, 139],
    cinzaClaro: [148, 163, 184],
    corpo: [51, 65, 85]
};

let atletaSelecionado = null;

// ---------------------------------------------------------------------
// ARMAZENAMENTO (localStorage)
// ---------------------------------------------------------------------

// QUESTÃO 07: localStorage só armazena String -> JSON.parse() converte texto em Array/Objeto
function carregarInscritos() {
    let lista = [];
    try {
        const dados = localStorage.getItem(CHAVE_INSCRITOS);
        lista = dados ? JSON.parse(dados) : [];
        if (!Array.isArray(lista)) lista = [];
    } catch (erro) {
        console.error("Dados de inscritos corrompidos; iniciando lista vazia.", erro);
        lista = [];
    }
    return lista.map(normalizarAtleta);
}

// QUESTÃO 07: JSON.stringify() converte Array/Objeto em String antes de salvar
function salvarInscritos(lista) {
    try {
        localStorage.setItem(CHAVE_INSCRITOS, JSON.stringify(lista));
        return true;
    } catch (erro) {
        console.error("Não foi possível salvar os dados.", erro);
        return false;
    }
}

// Garante o formato atual do registro (compatível com dados da versão anterior,
// que guardava apenas o número de presenças, sem saber quais sessões)
function normalizarAtleta(atleta) {
    const a = { ...atleta };
    a.cpf = somenteDigitos(String(a.cpf || ""));
    if (!Array.isArray(a.sessoes)) {
        const total = Math.min(Number(a.presencas) || 0, TOTAL_SESSOES);
        a.sessoes = Array.from({ length: total }, (_, i) => i + 1);
    }
    a.sessoes = [...new Set(a.sessoes.map(Number))]
        .filter(s => s >= 1 && s <= TOTAL_SESSOES)
        .sort((x, y) => x - y);
    a.presencas = a.sessoes.length;
    return a;
}

function buscarPorCpf(lista, cpf) {
    const digitos = somenteDigitos(cpf);
    return lista.find(item => item.cpf === digitos);
}

// ---------------------------------------------------------------------
// UTILITÁRIOS
// ---------------------------------------------------------------------
function somenteDigitos(texto) {
    return texto.replace(/\D/g, "");
}

// Formata CPF (12345678900 -> 123.456.789-00)
function formatarCPF(cpf) {
    const d = somenteDigitos(cpf);
    return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : cpf;
}

// Máscara aplicada enquanto o usuário digita
function mascararCPF(valor) {
    const d = somenteDigitos(valor).slice(0, 11);
    return d
        .replace(/^(\d{3})(\d)/, "$1.$2")
        .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
}

// Validação oficial do CPF pelos dois dígitos verificadores
function cpfValido(cpf) {
    const d = somenteDigitos(cpf);
    if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
    const digito = (base) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10]);
}

// Padroniza o nome: espaços extras removidos e iniciais maiúsculas
function formatarNome(nome) {
    const minusculas = ["da", "de", "do", "das", "dos", "e"];
    return nome.trim().replace(/\s+/g, " ").toLowerCase().split(" ")
        .map((p, i) => (i > 0 && minusculas.includes(p)) ? p : p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

function calcularFrequencia(atleta) {
    return Math.round((atleta.presencas / TOTAL_SESSOES) * 100);
}

function certificadoLiberado(atleta) {
    return calcularFrequencia(atleta) >= FREQUENCIA_MINIMA;
}

function gerarCodigo(prefixo, cpf) {
    return `${prefixo}-${cpf.slice(-4)}-${Date.now().toString(36).toUpperCase()}`;
}

function obterJsPDF() {
    return window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : null;
}

// QUESTÃO 05: Captura de elementos do DOM com document.querySelector()
const $ = (seletor) => document.querySelector(seletor);

// Utilitário visual: exibe uma mensagem com cor por tipo ("ok", "erro", "aviso", "info")
function mostrarStatus(elemento, mensagem, tipo) {
    elemento.textContent = mensagem;
    elemento.className = `status status-${tipo}`;
}

// Marca o campo como inválido (borda vermelha + leitor de tela) e coloca o foco nele
function marcarInvalido(input, invalido) {
    input.toggleAttribute("aria-invalid", invalido);
    if (invalido) input.focus();
}

// Valida o CPF de um campo e mostra a mensagem certa; retorna os dígitos ou null
function lerCpfDoCampo(input, elementoStatus) {
    const cpf = somenteDigitos(input.value);
    if (!cpf) {
        mostrarStatus(elementoStatus, "Informe o CPF do atleta.", "erro");
        marcarInvalido(input, true);
        return null;
    }
    if (!cpfValido(cpf)) {
        mostrarStatus(elementoStatus, "CPF inválido. Confira os números digitados.", "erro");
        marcarInvalido(input, true);
        return null;
    }
    marcarInvalido(input, false);
    return cpf;
}

// Aplica a máscara em todos os campos de CPF
document.querySelectorAll(".input-cpf").forEach(input => {
    input.addEventListener("input", () => {
        input.value = mascararCPF(input.value);
        input.removeAttribute("aria-invalid");
    });
});

// ---------------------------------------------------------------------
// ETAPA 1: INSCRIÇÃO + TEMPLATE LITERALS + QR CODE
// ---------------------------------------------------------------------
const formInscricao = $("#form-inscricao");

formInscricao.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const inputNome = $("#nome-atleta");
    const inputCpf = $("#cpf-atleta");
    const statusInscricao = $("#status-inscricao");
    const nomeAluno = formatarNome(inputNome.value);

    if (nomeAluno.split(" ").length < 2 || nomeAluno.length < 5) {
        mostrarStatus(statusInscricao, "Informe o nome completo do atleta (nome e sobrenome).", "erro");
        marcarInvalido(inputNome, true);
        return;
    }
    marcarInvalido(inputNome, false);

    const cpfAluno = lerCpfDoCampo(inputCpf, statusInscricao);
    if (!cpfAluno) return;

    const inscritos = carregarInscritos();
    const existente = buscarPorCpf(inscritos, cpfAluno);

    // Regra: um CPF só pode ter uma inscrição; reexibe o QR Code de quem já está inscrito
    if (existente) {
        mostrarStatus(statusInscricao, `Este CPF já está inscrito em nome de ${existente.nome}. QR Code reexibido abaixo.`, "aviso");
        exibirQrCode(existente);
        return;
    }

    const novoAtleta = normalizarAtleta({
        nome: nomeAluno,
        cpf: cpfAluno,
        presencas: 0,
        sessoes: [],
        inscritoEm: new Date().toISOString()
    });
    inscritos.push(novoAtleta);
    if (!salvarInscritos(inscritos)) {
        mostrarStatus(statusInscricao, "Não foi possível salvar a inscrição neste navegador.", "erro");
        return;
    }

    mostrarStatus(statusInscricao, `Inscrição nº ${inscritos.length} realizada com sucesso.`, "ok");
    exibirQrCode(novoAtleta);
    formInscricao.reset();
    atualizarPainel();
});

function exibirQrCode(atleta) {
    // QUESTÃO 08: Template Literals com crases e ${variavel}
    $("#saudacao").textContent = `Olá, ${atleta.nome}! Inscrição confirmada.`;
    $("#qr-cpf").textContent = `CPF ${formatarCPF(atleta.cpf)}`;

    // QUESTÃO 09: Injeção dinâmica no atributo src e atualização do alt
    const imgQr = $("#img-qr");
    imgQr.onerror = () => {
        imgQr.hidden = true;
        $("#qr-cpf").textContent = `Sem conexão para gerar o QR Code. Use o CPF ${formatarCPF(atleta.cpf)} no check-in.`;
    };
    imgQr.hidden = false;
    imgQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=0&data=${encodeURIComponent(atleta.cpf)}`;
    imgQr.alt = `QR Code de inscrição do participante ${atleta.nome}`;
    $("#area-qr").style.display = "block";
}

$("#btn-imprimir-qr").addEventListener("click", () => {
    document.body.classList.add("imprimindo-credencial");
    window.print();
});
window.addEventListener("afterprint", () => document.body.classList.remove("imprimindo-credencial"));

// ---------------------------------------------------------------------
// ETAPA 2 (QUESTÃO 10): FLUXO DE CHECK-IN + REGRA DOS 75%
// ---------------------------------------------------------------------
const formCheckin = $("#form-checkin");
const selectSessao = $("#sessao-checkin");

// Lembra a sessão em andamento para o operador não precisar escolher a cada leitura
selectSessao.value = localStorage.getItem(CHAVE_SESSAO_ATUAL) || "1";
selectSessao.addEventListener("change", () => localStorage.setItem(CHAVE_SESSAO_ATUAL, selectSessao.value));

formCheckin.addEventListener("submit", (evento) => {
    evento.preventDefault();
    const inputCpf = $("#cpf-checkin");
    const statusCheckin = $("#status-checkin");
    const cpfBuscado = lerCpfDoCampo(inputCpf, statusCheckin);
    if (!cpfBuscado) return;

    const sessao = Number(selectSessao.value);
    const inscritos = carregarInscritos();

    // Busca o aluno pelo CPF lido do QR Code
    const aluno = buscarPorCpf(inscritos, cpfBuscado);
    if (!aluno) {
        mostrarStatus(statusCheckin, "CPF não encontrado no cadastro. Faça a inscrição primeiro.", "erro");
        selecionarAtleta(null);
        return;
    }

    // Regra de negócio: +1 presença por sessão (sem contar duas vezes a mesma sessão)
    if (aluno.sessoes.includes(sessao)) {
        mostrarStatus(statusCheckin, `${aluno.nome} já fez check-in na Sessão ${sessao}.`, "aviso");
    } else {
        aluno.sessoes = [...aluno.sessoes, sessao].sort((x, y) => x - y);
        aluno.presencas = aluno.sessoes.length;
        salvarInscritos(inscritos);
        mostrarStatus(statusCheckin,
            `Presença registrada para ${aluno.nome} na Sessão ${sessao}: ${aluno.presencas}/${TOTAL_SESSOES} (${calcularFrequencia(aluno)}%).`, "ok");
        inputCpf.value = "";
    }

    // Leva o CPF para a etapa do certificado e atualiza o painel
    $("#cpf-certificado").value = formatarCPF(aluno.cpf);
    selecionarAtleta(aluno);
    atualizarPainel();
    inputCpf.focus();
});

// Utilitário visual: atualiza a barra de sessões e o estado do certificado
function atualizarPainelPresencas(aluno) {
    const painel = $("#presencas");
    const statusCert = $("#status-certificado");
    if (!aluno) {
        painel.hidden = true;
        mostrarStatus(statusCert, "Informe o CPF ou faça o check-in do atleta para verificar se o certificado está liberado.", "info");
        return;
    }
    const frequencia = calcularFrequencia(aluno);
    painel.hidden = false;
    painel.classList.toggle("aprovado", certificadoLiberado(aluno));
    $("#presencas-nome").textContent = `Frequência de ${aluno.nome}`;
    $("#presencas-pct").textContent = `${frequencia}%`;
    document.querySelectorAll(".sessoes span").forEach(barra => {
        barra.classList.toggle("ativa", aluno.sessoes.includes(Number(barra.dataset.sessao)));
    });

    if (certificadoLiberado(aluno)) {
        mostrarStatus(statusCert, `Certificado liberado para ${aluno.nome} (${frequencia}% de frequência).`, "ok");
    } else {
        const faltam = Math.ceil(TOTAL_SESSOES * FREQUENCIA_MINIMA / 100) - aluno.presencas;
        mostrarStatus(statusCert, `${aluno.nome} está com ${frequencia}%. Falta${faltam > 1 ? "m" : ""} ${faltam} presença${faltam > 1 ? "s" : ""} para liberar o certificado.`, "aviso");
    }
}

// Trava de segurança: só libera o botão PDF com frequência >= 75%
function selecionarAtleta(aluno) {
    atletaSelecionado = aluno;
    $("#btn-pdf").disabled = !aluno || !certificadoLiberado(aluno);
    atualizarPainelPresencas(aluno);
}

// --- Leitura do QR Code pela câmera (BarcodeDetector, disponível no Chrome/Android) ---
const dialogQr = $("#dialog-qr");
const videoQr = $("#video-qr");
let streamCamera = null;
let leituraAtiva = false;

if ("BarcodeDetector" in window && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    $("#btn-ler-qr").hidden = false;
}

$("#btn-ler-qr").addEventListener("click", async () => {
    const statusCamera = $("#status-camera");
    mostrarStatus(statusCamera, "Abrindo a câmera...", "info");
    dialogQr.showModal();
    try {
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        streamCamera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoQr.srcObject = streamCamera;
        await videoQr.play();
        mostrarStatus(statusCamera, "Procurando QR Code...", "info");
        leituraAtiva = true;

        const procurar = async () => {
            if (!leituraAtiva) return;
            try {
                const codigos = await detector.detect(videoQr);
                const cpf = codigos.length ? somenteDigitos(codigos[0].rawValue) : "";
                if (cpf.length === 11) {
                    fecharLeitor();
                    $("#cpf-checkin").value = mascararCPF(cpf);
                    formCheckin.requestSubmit();
                    return;
                }
            } catch (erro) { /* quadro ainda não disponível; tenta no próximo */ }
            requestAnimationFrame(procurar);
        };
        procurar();
    } catch (erro) {
        mostrarStatus(statusCamera, "Não foi possível acessar a câmera. Verifique a permissão do navegador.", "erro");
    }
});

function fecharLeitor() {
    leituraAtiva = false;
    if (streamCamera) streamCamera.getTracks().forEach(t => t.stop());
    streamCamera = null;
    if (dialogQr.open) dialogQr.close();
}

$("#btn-fechar-qr").addEventListener("click", fecharLeitor);
dialogQr.addEventListener("close", fecharLeitor);

// ---------------------------------------------------------------------
// ETAPA 3: RETIRADA DE KIT + COMPROVANTE EM PDF (2 vias: atleta e organização)
// ---------------------------------------------------------------------
$("#form-kit").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const statusKit = $("#status-kit");
    const cpfBuscado = lerCpfDoCampo($("#cpf-kit"), statusKit);
    if (!cpfBuscado) return;

    const tamanho = $("#tamanho-camisa").value;
    const inscritos = carregarInscritos();
    const aluno = buscarPorCpf(inscritos, cpfBuscado);

    if (!aluno) {
        mostrarStatus(statusKit, "CPF não encontrado no cadastro.", "erro");
        return;
    }
    if (!obterJsPDF()) {
        mostrarStatus(statusKit, "O gerador de PDF não carregou. Verifique a conexão com a internet e recarregue a página.", "erro");
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
            protocolo: gerarCodigo("KIT", aluno.cpf)
        };
        salvarInscritos(inscritos);
    }

    const dataRetirada = new Date(aluno.kit.data).toLocaleString("pt-BR");
    if (segundaVia) {
        mostrarStatus(statusKit, `Kit já retirado por ${aluno.nome} em ${dataRetirada}. Gerando 2ª via do comprovante.`, "aviso");
    } else {
        mostrarStatus(statusKit, `Kit entregue para ${aluno.nome} (camisa ${aluno.kit.tamanho}). Comprovante gerado.`, "ok");
        $("#form-kit").reset();
    }

    gerarComprovanteKit(aluno, segundaVia);
    atualizarPainel();
});

function gerarComprovanteKit(aluno, segundaVia) {
    const JsPDF = obterJsPDF();
    const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const dataRetirada = new Date(aluno.kit.data).toLocaleString("pt-BR");
    const itens = [
        `Camisa oficial (tamanho ${aluno.kit.tamanho})`,
        "Número de atleta / crachá",
        "Squeeze personalizado",
        "Pulseira de identificação"
    ];

    doc.setProperties({ title: `Comprovante de kit - ${aluno.nome}`, author: NOME_EVENTO });

    // Desenha uma via do comprovante a partir da posição vertical y0
    function desenharVia(y0, rotulo) {
        // Cabeçalho
        doc.setFillColor(...COR.azul);
        doc.rect(10, y0 + 10, 190, 18, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.text("COMPROVANTE DE RETIRADA DE KIT", 15, y0 + 21.5);
        doc.setFontSize(9);
        doc.text(segundaVia ? `${rotulo} - 2ª VIA` : rotulo, 195, y0 + 21.5, { align: "right" });

        doc.setTextColor(...COR.texto);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text(`${NOME_EVENTO} - ${SUBTITULO_EVENTO}`, 15, y0 + 37);

        // Dados do atleta
        const campo = (titulo, valor, x, y) => {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(...COR.cinza);
            doc.text(titulo.toUpperCase(), x, y);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(...COR.texto);
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
            doc.setDrawColor(...COR.texto);
            doc.setLineWidth(0.3);
            doc.rect(x, y - 3.2, 4, 4);
            doc.setLineWidth(0.6);
            doc.line(x + 0.8, y - 1.2, x + 1.7, y);
            doc.line(x + 1.7, y, x + 3.4, y - 2.6);
            doc.text(item, x + 6, y);
        });

        // Declaração
        doc.setFontSize(9);
        doc.setTextColor(...COR.corpo);
        const declaracao = `Declaro que recebi o kit do atleta acima descrito, em perfeitas condições, ` +
            `e estou ciente de que o número e a pulseira de identificação são pessoais e intransferíveis.`;
        doc.text(doc.splitTextToSize(declaracao, 180), 15, y0 + 104);

        // Assinaturas
        doc.setDrawColor(...COR.texto);
        doc.setLineWidth(0.3);
        doc.line(15, y0 + 128, 95, y0 + 128);
        doc.line(115, y0 + 128, 195, y0 + 128);
        doc.setTextColor(...COR.texto);
        doc.text("Assinatura do atleta", 55, y0 + 133, { align: "center" });
        doc.text("Responsável pela entrega", 155, y0 + 133, { align: "center" });
    }

    desenharVia(0, "VIA DO ATLETA");

    // Linha de corte entre as vias
    doc.setDrawColor(...COR.cinzaClaro);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(10, 148.5, 200, 148.5);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(7);
    doc.setTextColor(...COR.cinzaClaro);
    doc.text("corte aqui", 105, 147, { align: "center" });

    desenharVia(148.5, "VIA DA ORGANIZAÇÃO");

    doc.save(`comprovante-kit-${aluno.cpf}.pdf`);
}

// ---------------------------------------------------------------------
// ETAPA 4 (QUESTÃO 06): CERTIFICADO DE ATLETA EM PDF NO CLIENTE COM jsPDF
// ---------------------------------------------------------------------

// Consulta direta pelo CPF (sem precisar passar pelo check-in)
$("#form-certificado").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const statusCert = $("#status-certificado");
    const cpf = lerCpfDoCampo($("#cpf-certificado"), statusCert);
    if (!cpf) return;
    const aluno = buscarPorCpf(carregarInscritos(), cpf);
    if (!aluno) {
        selecionarAtleta(null);
        mostrarStatus(statusCert, "CPF não encontrado no cadastro.", "erro");
        return;
    }
    selecionarAtleta(aluno);
});

$("#btn-pdf").addEventListener("click", () => {
    if (!atletaSelecionado) return;
    const statusCert = $("#status-certificado");

    // Relê do armazenamento para garantir dados atualizados
    const inscritos = carregarInscritos();
    const aluno = buscarPorCpf(inscritos, atletaSelecionado.cpf);
    if (!aluno || !certificadoLiberado(aluno)) {
        selecionarAtleta(aluno || null);
        return;
    }
    const JsPDF = obterJsPDF();
    if (!JsPDF) {
        mostrarStatus(statusCert, "O gerador de PDF não carregou. Verifique a conexão com a internet e recarregue a página.", "erro");
        return;
    }

    // O código de verificação é gerado uma única vez; reemissões mantêm o mesmo código
    if (!aluno.certificado) {
        aluno.certificado = { codigo: gerarCodigo("ATL", aluno.cpf), emitidoEm: new Date().toISOString() };
        salvarInscritos(inscritos);
    }

    const doc = new JsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const largura = 297, centro = largura / 2;
    const frequencia = calcularFrequencia(aluno);
    doc.setProperties({ title: `Certificado de Atleta - ${aluno.nome}`, author: NOME_EVENTO });

    // Moldura dupla
    doc.setDrawColor(...COR.azul);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    doc.setLineWidth(0.5);
    doc.rect(14, 14, 269, 182);

    // Título
    doc.setTextColor(...COR.texto);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.text("CERTIFICADO DE ATLETA", centro, 48, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(...COR.azul);
    doc.text(`${NOME_EVENTO} - ${SUBTITULO_EVENTO}`, centro, 60, { align: "center" });

    // Corpo do texto
    doc.setTextColor(...COR.texto);
    doc.setFontSize(15);
    doc.text("Certificamos que", centro, 85, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(aluno.nome.length > 34 ? 20 : 26);
    doc.text(aluno.nome.toUpperCase(), centro, 100, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(`CPF: ${formatarCPF(aluno.cpf)}`, centro, 109, { align: "center" });
    doc.setFontSize(15);
    const corpo = `participou como atleta do ${NOME_EVENTO}, com frequência de ` +
        `${aluno.presencas}/${TOTAL_SESSOES} sessões (${frequencia}%), ` +
        `cumprindo a frequência mínima exigida e concluindo o evento com êxito.`;
    doc.text(doc.splitTextToSize(corpo, 220), centro, 124, { align: "center" });

    // Assinaturas
    doc.setLineWidth(0.3);
    doc.setDrawColor(...COR.texto);
    doc.line(50, 168, 130, 168);
    doc.line(167, 168, 247, 168);
    doc.setFontSize(11);
    doc.text("Coordenação do Evento", 90, 174, { align: "center" });
    doc.text("Comissão Técnica / Arbitragem", 207, 174, { align: "center" });

    // Rodapé com data e código de verificação
    doc.setFontSize(9);
    doc.setTextColor(...COR.cinza);
    const emitidoEm = new Date(aluno.certificado.emitidoEm).toLocaleDateString("pt-BR");
    doc.text(`Emitido em ${emitidoEm}  |  Código: ${aluno.certificado.codigo}`, centro, 190, { align: "center" });

    // Aciona o download diretamente na máquina do usuário, sem sobrecarregar servidor
    doc.save(`certificado-atleta-${aluno.cpf}.pdf`);
    mostrarStatus(statusCert, `Certificado de ${aluno.nome} gerado (código ${aluno.certificado.codigo}).`, "ok");
    atualizarPainel();
});

// ---------------------------------------------------------------------
// ★ PAINEL DA ORGANIZAÇÃO
// ---------------------------------------------------------------------
const corpoTabela = $("#tabela-corpo");
const inputBusca = $("#busca-atleta");

function criarCelula(texto, classe) {
    const td = document.createElement("td");
    td.textContent = texto;          // textContent evita injeção de HTML pelo nome digitado
    if (classe) td.className = classe;
    return td;
}

function criarSelo(texto, tipo) {
    const td = document.createElement("td");
    const selo = document.createElement("span");
    selo.className = `selo selo-${tipo}`;
    selo.textContent = texto;
    td.appendChild(selo);
    return td;
}

function atualizarPainel() {
    const inscritos = carregarInscritos();

    $("#stat-inscritos").textContent = inscritos.length;
    $("#stat-checkins").textContent = inscritos.reduce((total, a) => total + a.presencas, 0);
    $("#stat-kits").textContent = inscritos.filter(a => a.kit && a.kit.retirado).length;
    $("#stat-certificados").textContent = inscritos.filter(certificadoLiberado).length;

    const termo = inputBusca.value.trim().toLowerCase();
    const termoDigitos = somenteDigitos(termo);
    const filtrados = inscritos
        .filter(a => !termo || a.nome.toLowerCase().includes(termo) || (termoDigitos && a.cpf.includes(termoDigitos)))
        .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));

    corpoTabela.replaceChildren(...filtrados.map(a => {
        const tr = document.createElement("tr");
        tr.append(
            criarCelula(a.nome, "col-nome"),
            criarCelula(formatarCPF(a.cpf), "col-cpf"),
            criarCelula(`${a.presencas}/${TOTAL_SESSOES} (${calcularFrequencia(a)}%)`),
            a.kit && a.kit.retirado ? criarSelo(`Retirado · ${a.kit.tamanho}`, "ok") : criarSelo("Pendente", "neutro"),
            certificadoLiberado(a) ? criarSelo("Liberado", "ok") : criarSelo("Bloqueado", "aviso")
        );
        return tr;
    }));

    const vazia = $("#tabela-vazia");
    vazia.hidden = filtrados.length > 0;
    vazia.textContent = inscritos.length ? "Nenhum atleta encontrado para essa busca." : "Nenhum atleta inscrito ainda.";
    $("#btn-exportar").disabled = inscritos.length === 0;
    $("#btn-limpar").disabled = inscritos.length === 0;
}

inputBusca.addEventListener("input", atualizarPainel);

// Exporta a lista em CSV (separador ";" e BOM para abrir certo no Excel em português)
$("#btn-exportar").addEventListener("click", () => {
    const inscritos = carregarInscritos();
    const cabecalho = ["Nome", "CPF", "Presenças", "Sessões", "Frequência (%)", "Kit", "Tamanho", "Retirada do kit", "Protocolo do kit", "Certificado", "Código do certificado"];
    const linhas = inscritos.map(a => [
        a.nome,
        formatarCPF(a.cpf),
        a.presencas,
        a.sessoes.join(", "),
        calcularFrequencia(a),
        a.kit && a.kit.retirado ? "Retirado" : "Pendente",
        a.kit ? a.kit.tamanho : "",
        a.kit ? new Date(a.kit.data).toLocaleString("pt-BR") : "",
        a.kit ? a.kit.protocolo : "",
        certificadoLiberado(a) ? "Liberado" : "Bloqueado",
        a.certificado ? a.certificado.codigo : ""
    ]);
    const escapar = (valor) => `"${String(valor).replace(/"/g, '""')}"`;
    const csv = [cabecalho, ...linhas].map(l => l.map(escapar).join(";")).join("\r\n");

    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inscritos-torneio-volei-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
});

$("#btn-limpar").addEventListener("click", () => {
    const total = carregarInscritos().length;
    if (!window.confirm(`Apagar os ${total} atleta(s) cadastrados neste navegador? Essa ação não pode ser desfeita.\n\nDica: exporte o CSV antes.`)) return;
    localStorage.removeItem(CHAVE_INSCRITOS);
    selecionarAtleta(null);
    $("#area-qr").style.display = "none";
    document.querySelectorAll(".status[role='status']").forEach(s => mostrarStatus(s, "", "info"));
    atualizarPainel();
});

// Mantém tudo sincronizado se o sistema estiver aberto em mais de uma aba
window.addEventListener("storage", (evento) => {
    if (evento.key !== CHAVE_INSCRITOS && evento.key !== null) return;
    atualizarPainel();
    if (atletaSelecionado) {
        selecionarAtleta(buscarPorCpf(carregarInscritos(), atletaSelecionado.cpf) || null);
    }
});

// Estado inicial
atualizarPainel();
