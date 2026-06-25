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

// 4.1 INSTRUÇÃO DE SISTEMA (persona acolhedora, regras e qualificação)
const instrucaoSistema = `
Você é a Mia, a assistente virtual super acolhedora, simpática e atenciosa da IA Play Cursos.
Seu objetivo principal é prestar um suporte excelente, tirar dúvidas com carinho e atuar como agente de qualificação, coletando dados do visitante.

COMPORTAMENTO E PERSONALIDADE (IMPORTANTE):
- Seja extremamente acolhedora. Demonstre sempre que está feliz em ajudar.
- Se o usuário falar sobre assuntos fora do escopo da escola (ex: futebol, filmes, clima, curiosidades), seja criativa e brincalhona para trazer o assunto de volta. 
- Exemplo de como agir: Se falarem de futebol, responda algo como "Futebol é muito bom! Mas sabe o que é melhor ainda? Fazer um golaço na sua carreira aprendendo automação com os cursos da IA Play! Posso te apresentar nossos módulos?". Nunca seja rude ao cortar um assunto.

DADOS OBRIGATÓRIOS PARA COLETAR NO MEIO DA CONVERSA (um por vez):
1. Nome
2. Qual a dúvida ou demanda (problema que quer resolver)
3. Módulo de interesse (Básico, Pro, Expert, Automação Python/SQL, Auditoria de Dados ou Criação de Conteúdo)
4. E-mail de contato (Valide se o formato possui '@').

FINALIZAÇÃO DA QUALIFICAÇÃO (MUITO IMPORTANTE):
Assim que coletar os 4 dados obrigatórios, despeça-se de forma muito calorosa informando que nossa equipe entrará em contato.
Na mesma resposta, pule duas linhas e adicione EXATAMENTE o bloco abaixo (sem markdown extra):
[LEAD_QUALIFICADO]
{"nome": "nome", "email": "email", "modulo_interesse": "modulo", "descricao_demanda": "problema"}
`;

// 4.2 PLANO DE CONTINGÊNCIA (Fallback caso a API do Gemini falhe)
function gerarRespostaContingencia(mensagem) {
    // Transforma tudo em letras minúsculas para facilitar a busca pelas palavras
    const texto = mensagem.toLowerCase(); 

    // Saudações e Educação
    if (texto.includes('bom dia') || texto.includes('boa tarde') || texto.includes('boa noite') || texto.includes('olá') || texto.includes('oi')) {
        return "Olá! Sou a Mia. Meus servidores de IA estão com alta demanda agora, mas continuo aqui para ajudar! Qual módulo da IA Play Cursos mais te interessa?";
    }
    else if (texto.includes('obrigado') || texto.includes('valeu') || texto.includes('agradeço')) {
        return "Por nada! Estou sempre à disposição. Mais alguma dúvida sobre os nossos cursos?";
    }
    // Palavras-chave dos Módulos
    else if (texto.includes('básico') || texto.includes('basico')) {
        return "O Módulo Básico custa R$ 97,00 e é o passo inicial perfeito no mundo da IA. Quer deixar seu nome e e-mail para nossa equipe te chamar?";
    }
    else if (texto.includes('pro')) {
        return "O Módulo Pro (R$ 147,00) foca na criação de prompts avançados e automação. Gostaria de se matricular? Deixe seu e-mail de contato!";
    }
    else if (texto.includes('expert')) {
        return "O Módulo Expert (R$ 297,00) é incrível para aprender a criar assistentes virtuais e integrar APIs! Pode me informar seu e-mail para mais detalhes?";
    }
    else if (texto.includes('automação') || texto.includes('automacao') || texto.includes('python') || texto.includes('sql')) {
        return "O Módulo Automação (Python/SQL) sai por R$ 197,00 e vai automatizar todas as suas planilhas. Qual o seu e-mail para um consultor falar com você?";
    }
    else if (texto.includes('dados') || texto.includes('auditoria')) {
        return "O Módulo Auditoria de Dados custa R$ 247,00 e ensina a cruzar relatórios usando IA. Quer deixar o seu e-mail de contato?";
    }
    else if (texto.includes('conteúdo') || texto.includes('conteudo') || texto.includes('marketing')) {
        return "O Módulo Criação de Conteúdo (R$ 127,00) é ideal para planejar campanhas e roteiros ágeis. Posso anotar seu e-mail para dar andamento?";
    }
    // Caso a pergunta fuja das palavras-chave mapeadas (O "Else" final)
    else {
        return "No momento estou operando no modo de segurança e só posso me direcionar a assuntos da IA Play Cursos! Gostaria de saber sobre nossos módulos: Básico, Pro, Expert, Automação, Dados ou Conteúdo?";
    }
}

// 5. FUNÇÃO PRINCIPAL DE COMUNICAÇÃO (Assíncrona)
async function enviarMensagemParaIA(mensagemUsuario) {
    // 1. Mostra a mensagem na tela
    adicionarMensagem(mensagemUsuario, 'usuario');
    chatInput.value = ''; 

    // 2. Cria o balão de "Digitando..."
    adicionarMensagem('Digitando...', 'ia');
    const baloes = chatHistorico.getElementsByClassName('mensagem ia');
    const balaoCarregando = baloes[baloes.length - 1];

    try {
        // AGORA O JAVASCRIPT CHAMA O SEU PRÓPRIO SERVIDOR FLASK!
        const API_BACKEND_CHAT = 'http://127.0.0.1:5000/chat';

        const resposta = await fetch(API_BACKEND_CHAT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mensagem: mensagemUsuario,
                historico: historicoConversa,
                instrucao: instrucaoSistema
            })
        });

        if (!resposta.ok) throw new Error(`Status HTTP: ${resposta.status}`);

        const dados = await resposta.json();
        let textoIA = dados.resposta;

        // INTERCEPTAÇÃO DOS DADOS DO LEAD (Continua igual!)
        if (textoIA.includes('[LEAD_QUALIFICADO]')) {
            const partes = textoIA.split('[LEAD_QUALIFICADO]');
            textoIA = partes[0].trim(); 
            const jsonString = partes[1].trim(); 
            
            try {
                const dadosDoLead = JSON.parse(jsonString);
                console.log("SUCESSO! Lead qualificado pela IA:", dadosDoLead);
                enviarParaBancoDeDados(dadosDoLead); 
            } catch (erroJson) {
                console.error("Erro ao extrair dados do lead:", erroJson);
            }
        }

        // Atualiza a tela e o histórico
        balaoCarregando.textContent = textoIA;
        historicoConversa.push({ role: 'user', parts: [{ text: mensagemUsuario }] });
        historicoConversa.push({ role: 'model', parts: [{ text: textoIA }] });

    } catch (erro) {
        console.error("Erro na API Backend:", erro);
        
        // 🚀 CONTINGÊNCIA CONTINUA FUNCIONANDO SE A API CAIR
        const respostaFallback = gerarRespostaContingencia(mensagemUsuario);
        balaoCarregando.textContent = respostaFallback;

        historicoConversa.push({ role: 'user', parts: [{ text: mensagemUsuario }] });
        historicoConversa.push({ role: 'model', parts: [{ text: respostaFallback }] });
    }
}

// 6. EVENTOS DE CLIQUE E TECLADO (Input normal)
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

// 7. EVENTOS DOS BOTÕES DE FAQ (QUICK REPLIES)
const botoesFaq = document.querySelectorAll('.btn-faq');

botoesFaq.forEach(botao => {
    botao.addEventListener('click', () => {
        const perguntaFaq = botao.textContent;
        enviarMensagemParaIA(perguntaFaq);
    });
});

// 8. FUNÇÃO PARA ENVIAR DADOS AO BACKEND (FLASK / NEON)
async function enviarParaBancoDeDados(dadosDoLead) {
    // URL local temporária para a fase de testes. 
    // Quando fizermos o deploy no Render, trocaremos para a URL de produção (ex: https://iaplay-api.onrender.com/leads)
    const API_BACKEND_URL = 'http://127.0.0.1:5000/leads'; 

    try {
        console.log("Enviando dados do lead para a API Flask...", dadosDoLead);
        
        const resposta = await fetch(API_BACKEND_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            // Converte o objeto JavaScript de volta para uma string JSON antes de enviar
            body: JSON.stringify(dadosDoLead) 
        });

        if (!resposta.ok) {
            throw new Error(`Erro na API do Backend: ${resposta.status}`);
        }

        const resultado = await resposta.json();
        console.log("Sucesso! Lead salvo no banco de dados NEON:", resultado);

    } catch (erro) {
        console.error("Falha ao salvar o lead no banco de dados:", erro);
    }
}

// 9. MENU HAMBÚRGUER (MOBILE)
const menuToggle = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
        // Alterna a classe 'ativo' no botão e no menu
        menuToggle.classList.toggle('ativo');
        navMenu.classList.toggle('ativo');
    });
}

// 10. LÓGICA DO BALÃOZINHO ANIMADO (WIDGET FLUTUANTE)
const balaoFala = document.getElementById('balao-fala');
const mensagensBalao = [
    "Olá! Dúvidas? É só chamar! 👋",
    "Quer automatizar sua rotina? ⚙️",
    "Estou online agora! 🟢",
    "Clique aqui para falar comigo! 🧠"
];
let indexMensagem = 0;

if (balaoFala) {
    setInterval(() => {
        // Passo 1: Fica transparente
        balaoFala.style.opacity = '0';
        
        setTimeout(() => {
            // Passo 2: Troca a mensagem de forma invisível
            indexMensagem = (indexMensagem + 1) % mensagensBalao.length;
            balaoFala.textContent = mensagensBalao[indexMensagem];
            
            // Passo 3: Volta a ficar visível
            balaoFala.style.opacity = '1';
        }, 500); // Espera meio segundo (tempo da transição CSS) para trocar o texto
        
    }, 4500); // Troca de frase a cada 4,5 segundos
}

// Opcional: Esconder o balão quando a janela de chat estiver aberta
btnToggleChat.addEventListener('click', () => {
    if (janelaChat.style.display === 'flex') {
        balaoFala.style.display = 'none'; // Esconde quando abre
    } else {
        balaoFala.style.display = 'block'; // Mostra quando fecha
    }
});