# 🧠 IA Play - Plataforma Educacional & Agente Cognitivo

Este projeto é o Trabalho Final integrado para as disciplinas de **Banco de Dados** (Profª Evelyn Silva) e **Chatbots com IA** (Prof. Helldânio Barros), do 2º Período do curso de Tecnólogo em IA.

O sistema consiste em uma Landing Page educacional integrada a um Chatbot de Inteligência Artificial (Mia) que realiza o atendimento em linguagem natural, qualifica os leads e salva os dados em um banco de dados relacional na nuvem. Conta também com um Painel Administrativo restrito (CRUD) para gestão dos alunos.

## 🛠️ Stack Tecnológica

**Front-end:**
* HTML5, CSS3, JavaScript
* Integração Low-code com widget flutuante (Typebot)

**Back-end (API REST):**
* Python 3
* Flask & Flask-CORS
* Integração com Google Gemini API (LLM)

**Banco de Dados:**
* PostgreSQL hospedado no NEON
* Biblioteca `psycopg2` para comunicação

**Deploy & Hospedagem:**
* Render (Web Service Back-end)
* Vercel / GitHub Pages (Front-end)

---

## ⚙️ Funcionalidades do Sistema

### 1. Agente Cognitivo (MVP Chatbot)
* **Atendimento Humanizado:** Substituição de menus numéricos por conversas fluidas. O usuário relata sua demanda em texto livre, e a API do Google Gemini interpreta o contexto antes de direcionar o fluxo.
* **Qualificação (Lab 2):** O fluxo coleta dados essenciais (Nome, E-mail, Demanda e Módulo de interesse) sem sobrecarregar o usuário.
* **Classificação de Urgência:** Atribuição de nível de urgência (Alta, Média, Baixa) com base em regras de negócio e interpretação da demanda.

### 2. Gestão de Dados (CRUD Completo)
A API desenvolvida em Flask expõe endpoints que consomem o banco NEON, garantindo o fluxo completo de dados:
* **Create (POST `\leads`):** O Typebot envia um Webhook com o JSON do lead para o banco via API.
* **Read (GET `\leads`):** O painel `admin.html` consome e lista todos os pré-cadastros ordenados por data.
* **Update (PUT `\leads\<id>`):** Permite a edição do nome e módulo de interesse diretamente no painel.
* **Delete (DELETE `\leads\<id>`):** Exclusão definitiva de um lead do banco de dados.
* *Segurança:* As rotas de leitura, edição e exclusão são protegidas por um middleware que exige um `X-Admin-Token` configurado no arquivo `.env`.

---

## 🚀 Como executar o projeto localmente

1. **Clone o repositório:**
   ```bash
   git clone [https://github.com/jlvg7575-coder/ia-play-cursos.git](https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git)