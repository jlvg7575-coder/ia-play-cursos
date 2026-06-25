import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Carrega as variáveis de segurança do arquivo .env
load_dotenv()

app = Flask(__name__)
# O CORS permite que o seu JavaScript (no HTML) consiga enviar dados para esta API
CORS(app)

# Função para conectar ao banco NEON
def get_db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

# ==========================================
# ROTAS DO CRUD COMPLETO (GESTAO DE LEADS)
# ==========================================

# 1. READ: Listar todos os leads (GET)
@app.route('/leads', methods=['GET'])
def get_leads():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM leads ORDER BY data_cadastro DESC;')
        leads = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(leads), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# 2. CREATE: Cadastrar um novo lead vindo da Mia (POST)
@app.route('/leads', methods=['POST'])
def add_lead():
    try:
        dados = request.json
        
        # ==========================================
        # NORMALIZAÇÃO DE DADOS (PADRONIZAÇÃO)
        # ==========================================
        # 1. Strip() remove espaços em branco acidentais no início e fim
        # 2. Title() deixa a primeira letra de cada nome maiúscula (Ex: samuel -> Samuel)
        # 3. Lower() garante que o e-mail fique 100% minúsculo
        
        nome = dados.get('nome', '').strip().title()
        email = dados.get('email', '').strip().lower()
        modulo_interesse = dados.get('modulo_interesse', '').strip()
        descricao_demanda = dados.get('descricao_demanda', '').strip()

        # Validação de segurança: Impede salvar no banco se faltar nome ou email
        if not nome or not email:
            return jsonify({"erro": "Nome e e-mail são obrigatórios."}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO leads (nome, email, modulo_interesse, descricao_demanda)
            VALUES (%s, %s, %s, %s) RETURNING id;
        ''', (nome, email, modulo_interesse, descricao_demanda))
        
        novo_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"mensagem": "Lead salvo e normalizado com sucesso!", "id": novo_id}), 201
        
    except Exception as e:
        print(f"Erro ao inserir no banco: {e}") # Isso vai mostrar o erro no terminal do VS Code
        return jsonify({"erro": str(e)}), 500

# 3. UPDATE: Atualizar dados de um lead no painel admin (PUT)
@app.route('/leads/<int:id>', methods=['PUT'])
def update_lead(id):
    try:
        dados = request.json
        nome = dados.get('nome')
        modulo_interesse = dados.get('modulo_interesse')
        urgencia = dados.get('urgencia')

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            UPDATE leads 
            SET nome = %s, modulo_interesse = %s, urgencia = %s
            WHERE id = %s;
        ''', (nome, modulo_interesse, urgencia, id))
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"mensagem": f"Lead {id} atualizado com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# 4. DELETE: Excluir um lead no painel admin (DELETE)
@app.route('/leads/<int:id>', methods=['DELETE'])
def delete_lead(id):
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM leads WHERE id = %s;', (id,))
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({"mensagem": f"Lead {id} excluído com sucesso!"}), 200
    except Exception as e:
        return jsonify({"erro": str(e)}), 500

# ==========================================
# ROTA DA INTELIGÊNCIA ARTIFICIAL (GEMINI)
# ==========================================
@app.route('/chat', methods=['POST'])
def chat_gemini():
    try:
        dados = request.json
        mensagem_usuario = dados.get('mensagem')
        historico = dados.get('historico', [])
        instrucao = dados.get('instrucao', '')

        # Puxa todas as chaves cadastradas no .env de forma segura
        chaves_disponiveis = [
            os.getenv('GEMINI_API_KEY_1'),
            os.getenv('GEMINI_API_KEY_2')
            # Você pode adicionar GEMINI_API_KEY_3 aqui futuramente se quiser
        ]
        
        # Filtra a lista para remover chaves vazias (caso você coloque apenas uma)
        api_keys = [k for k in chaves_disponiveis if k]

        # Monta o pacote de dados
        conteudo_atual = historico + [{'role': 'user', 'parts': [{'text': mensagem_usuario}]}]
        payload = {
            "systemInstruction": {"parts": [{"text": instrucao}]},
            "contents": conteudo_atual,
            "generationConfig": {"maxOutputTokens": 400, "temperature": 0.4}
        }

        # Tenta usar as chaves em ordem
        for api_key in api_keys:
            # Voltando para a versão correta 2.5 que você já usava!
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            
            resposta = requests.post(url, json=payload, headers={'Content-Type': 'application/json'})
            
            # Se der erro 429 (Limite excedido), o 'continue' faz o código pular para a próxima chave da lista
            if resposta.status_code == 429:
                print(f"Chave excedida (429). Tentando a próxima chave de backup...")
                continue 
                
            # Se for outro erro grave, interrompe
            if not resposta.ok:
                raise Exception(f"Erro do Google: {resposta.status_code}")

            # Deu certo! Extrai a resposta e devolve para o site
            dados_google = resposta.json()
            texto_ia = dados_google['candidates'][0]['content']['parts'][0]['text']
            return jsonify({"resposta": texto_ia}), 200

        # Se o loop terminar e todas as chaves tiverem dado 429
        raise Exception("429: Todas as chaves da API excederam o limite de requisições.")

    except Exception as e:
        print(f"Erro no chat: {e}")
        return jsonify({"erro": str(e)}), 500