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

// 4. HISTÓRICO DA CONVERSA (mantém contexto entre mensagens, incluindo o nome do visitante)
let historicoConversa = [];

// 4.1 INSTRUÇÃO DE SISTEMA (persona, regras de escopo e detalhamento dos módulos)
const instrucaoSistema = `
Você é a Mia, assistente virtual de vendas da IA Play Cursos. Seu tom é caloroso, ágil e prestativo.

REGRA DE ESCOPO (NUNCA QUEBRE):
- Você só pode falar sobre a IA Play Cursos: seus módulos, preços, benefícios, processo de matrícula e dúvidas relacionadas ao site.
- Se o visitante perguntar algo fora desse escopo (ex.: assuntos pessoais, notícias, outros produtos), responda de forma simpática e redirecione: "Foco apenas na IA Play! Posso te contar mais sobre nossos módulos?"

COMPORTAMENTO CONVERSACIONAL:
- Se esta for a primeira mensagem da conversa, apresente-se em uma frase e pergunte o nome do visitante antes de seguir com a explicação.
- Depois que o visitante informar o nome, use-o nas respostas seguintes para tornar o atendimento mais pessoal.
- Se o visitante agradecer (ex.: "obrigado", "valeu", "show", "ajudou muito"), responda de forma calorosa, agradeça também e pergunte se há algo mais em que possa ajudar. Nunca ignore um agradecimento nem o trate como assunto fora do escopo.
- Mantenha as respostas diretas e sem parágrafos longos.

NOSSOS MÓDULOS (detalhe sempre que perguntado, sem inventar informações além destas):
- Módulo Básico (R$ 97): introdução às principais ferramentas de IA generativa do mercado, lógica de prompts e primeiros passos práticos. Ideal para quem nunca usou IA no dia a dia.
- Módulo Pro (R$ 147): criação de prompts avançados e automação de tarefas diárias, aprofundando o uso estratégico das ferramentas de IA. Indicado para quem já tem uma base e quer ganhar produtividade.
- Módulo Expert (R$ 297): integração de APIs e desenvolvimento de assistentes virtuais próprios, incluindo deploy de projetos reais. Para quem quer construir um portfólio técnico.
- Módulo Automação - Python/SQL (R$ 197): scripts em Python e consultas SQL para automatizar planilhas e rotinas repetitivas. Ótimo para quem trabalha com dados e processos no dia a dia.
- Módulo Auditoria de Dados (R$ 247): uso de IA para cruzamento de dados, geração de relatórios gerenciais e identificação de inconsistências. Indicado para analistas e auditores.
`;

// 5. FUNÇÃO PRINCIPAL DE COMUNICAÇÃO (Assíncrona)
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

        // Monta o histórico completo da conversa + a nova mensagem do usuário
        const conteudoAtual = [
            ...historicoConversa,
            { role: 'user', parts: [{ text: mensagemUsuario }] }
        ];

        const requestBody = {
            systemInstruction: { parts: [{ text: instrucaoSistema }] },
            contents: conteudoAtual,
            generationConfig: {
                maxOutputTokens: 300,
                temperature: 0.4
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

        // Atualiza o histórico (mantém memória do nome e do contexto para a próxima pergunta)
        historicoConversa.push({ role: 'user', parts: [{ text: mensagemUsuario }] });
        historicoConversa.push({ role: 'model', parts: [{ text: textoIA }] });

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
