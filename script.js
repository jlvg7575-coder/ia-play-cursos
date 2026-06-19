// 1. MAPEAMENTO DOS ELEMENTOS DO HTML
const chatHistorico = document.getElementById('chat-historico');
const chatInput = document.getElementById('chat-input');
const btnEnviar = document.getElementById('btn-enviar');
const apiKeyInput = document.getElementById('api-key-input');
const modeloSelect = document.getElementById('modelo-select');

// Elementos de abrir e fechar a janela
const btnToggleChat = document.getElementById('btn-toggle-chat');
const btnFecharChat = document.getElementById('btn-fechar-chat');
const janelaChat = document.getElementById('janela-chat');

// 2. FUNÇÕES DE ABRIR E FECHAR O CHAT
btnToggleChat.addEventListener('click', () => {
    janelaChat.style.display = janelaChat.style.display === 'none' ? 'flex' : 'none';
});

btnFecharChat.addEventListener('click', () => {
    janelaChat.style.display = 'none';
});

// 3. FUNÇÃO PARA ADICIONAR MENSAGENS NA TELA
function adicionarMensagem(texto, remetente) {
    const divMensagem = document.createElement('div');
    divMensagem.classList.add('mensagem');
    divMensagem.classList.add(remetente); 
    divMensagem.textContent = texto;
    
    chatHistorico.appendChild(divMensagem);
    chatHistorico.scrollTop = chatHistorico.scrollHeight; 
}

// 4. FUNÇÃO PRINCIPAL DE COMUNICAÇÃO (Assíncrona)
async function enviarMensagemParaIA(mensagemUsuario) {
    const apiKeyManual = apiKeyInput.value.trim();
    const modeloEscolhido = modeloSelect.value; 

    if (!apiKeyManual) {
        adicionarMensagem("Por favor, cole a sua API Key do Google (AIza...) no campo superior amarelo antes de conversar comigo!", "ia");
        return;
    }

    adicionarMensagem(mensagemUsuario, 'usuario');
    chatInput.value = ''; 

    adicionarMensagem('Digitando...', 'ia');
    const baloes = chatHistorico.getElementsByClassName('mensagem ia');
    const balaoCarregando = baloes[baloes.length - 1];

    try {
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modeloEscolhido}:generateContent?key=${apiKeyManual}`;

        // ENGENHARIA DE PROMPT OTIMIZADA
        const promptSistema = `
            Aja como um assistente de vendas rápido e eficiente do site "IA Play".
            Nossos planos: Módulo Básico (R$ 97), Módulo Pro (R$ 147), Módulo Expert (R$ 297), Automação (R$ 197) e Auditoria (R$ 247).
            
            REGRA: Responda apenas sobre os cursos, a empresa e preços. Se o assunto for aleatório, diga: "Foco apenas no IA Play! Como posso ajudar com os cursos?"
            
            Mensagem do usuário: "${mensagemUsuario}"
            
            Sua resposta direta e educada:`;

        const requestBody = { 
            contents: [{ parts: [{ text: promptSistema }] }],
            // CONFIGURAÇÃO AJUSTADA (Mais tokens para ela conseguir listar tudo)
            generationConfig: {
                maxOutputTokens: 250, 
                temperature: 0.2      
            }
        };

        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!resposta.ok) {
            throw new Error(`Status HTTP do Google: ${resposta.status}`);
        }

        const dados = await resposta.json();
        const textoIA = dados.candidates[0].content.parts[0].text;
        
        balaoCarregando.textContent = textoIA;

    } catch (erro) {
        console.error("Erro detalhado:", erro);
        
        // PLANO B PARA O SEMINÁRIO (Graceful Degradation)
        // Se a API do Google cair, o bot dá uma resposta programada, salvando a apresentação.
        balaoCarregando.textContent = "Nossos servidores de IA estão com alta demanda no momento! Mas não se preocupe: todos os detalhes dos nossos planos estão na seção 'Módulos' logo acima. Recomendo o Módulo Automação (Python/SQL). Posso ajudar com mais alguma coisa?";
    }
}

// 5. EVENTOS DE CLIQUE E TECLADO (Input normal)
btnEnviar.addEventListener('click', () => {
    const texto = chatInput.value.trim();
    if (texto !== '') {
        enviarMensagemParaIA(texto);
    }
});

chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        btnEnviar.click();
    }
});

// 6. EVENTOS DOS BOTÕES DE FAQ (QUICK REPLIES)
const botoesFaq = document.querySelectorAll('.btn-faq');

botoesFaq.forEach(botao => {
    botao.addEventListener('click', () => {
        const perguntaFaq = botao.textContent;
        enviarMensagemParaIA(perguntaFaq);
    });
});