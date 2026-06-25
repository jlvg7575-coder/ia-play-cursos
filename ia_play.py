import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from functools import wraps

# Carrega as variáveis de segurança do arquivo .env
load_dotenv()

app = Flask(__name__)
# O CORS permite que o seu JavaScript consiga enviar dados para esta API
CORS(app)

# Função para conectar ao banco NEON
def get_db_connection():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    return conn

# ==========================================
# MIDDLEWARE DE SEGURANÇA (O PORTEIRO)
# ==========================================
def require_admin_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token_enviado = request.headers.get('X-Admin-Token')
        senha_correta = os.getenv('ADMIN_SECRET_TOKEN')
        
        # Se não enviou o crachá ou a senha for errada, barra o acesso
        if not senha_correta or token_enviado != senha_correta:
            return jsonify({"erro": "Acesso Negado: Credenciais inválidas."}), 403
            
        return f(*args, **kwargs)
    return decorated_function

# ==========================================
# ROTAS DO CRUD COMPLETO (GESTAO DE LEADS)
# ==========================================

# 1. READ: Listar todos os leads (GET) - ROTA PROTEGIDA
@app.route('/leads', methods=['GET'])
@require_admin_token
def get_leads():
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute('SELECT * FROM leads ORDER BY data_cadastro DESC;')
        leads = cur.fetchall()
        
        return jsonify(leads), 200

    except Exception as e:
        return jsonify({"erro": "Erro ao buscar os leads no banco de dados.", "detalhes": str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 2. CREATE: Cadastrar um novo lead vindo da Mia (POST) - ROTA LIVRE PARA O BOT
@app.route('/leads', methods=['POST'])
def add_lead():
    conn = None
    cur = None
    try:
        dados = request.json
        
        nome = dados.get('nome', '').strip().title()
        email = dados.get('email', '').strip().lower()
        modulo_interesse = dados.get('modulo_interesse', '').strip()
        descricao_demanda = dados.get('descricao_demanda', '').strip()

        if not nome or not email:
            return jsonify({"erro": "Nome e e-mail são obrigatórios para o cadastro."}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO leads (nome, email, modulo_interesse, descricao_demanda)
            VALUES (%s, %s, %s, %s) RETURNING id;
        ''', (nome, email, modulo_interesse, descricao_demanda))
        
        novo_id = cur.fetchone()[0]
        conn.commit()
        
        return jsonify({"mensagem": "Lead salvo e normalizado com sucesso!", "id": novo_id}), 201
        
    except Exception as e:
        if conn:
            conn.rollback() 
        return jsonify({"erro": "Falha interna ao processar o cadastro do lead.", "detalhes": str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 3. UPDATE: Atualizar dados de um lead (PUT) - ROTA PROTEGIDA
@app.route('/leads/<int:id>', methods=['PUT'])
@require_admin_token
def update_lead(id):
    conn = None
    cur = None
    try:
        dados = request.json
        nome = dados.get('nome', '').strip()
        modulo_interesse = dados.get('modulo_interesse', '').strip()
        urgencia = dados.get('urgencia', 'Normal').strip()

        if not nome or not modulo_interesse:
            return jsonify({"erro": "Os campos 'nome' e 'modulo_interesse' não podem ficar vazios."}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            UPDATE leads 
            SET nome = %s, modulo_interesse = %s, urgencia = %s
            WHERE id = %s;
        ''', (nome, modulo_interesse, urgencia, id))
        
        if cur.rowcount == 0:
            return jsonify({"erro": f"Lead com o ID {id} não foi encontrado no sistema."}), 404
            
        conn.commit()
        return jsonify({"mensagem": f"Lead {id} atualizado com sucesso!"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"erro": "Erro ao atualizar os dados.", "detalhes": str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

# 4. DELETE: Excluir um lead (DELETE) - ROTA PROTEGIDA
@app.route('/leads/<int:id>', methods=['DELETE'])
@require_admin_token
def delete_lead(id):
    conn = None
    cur = None
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('DELETE FROM leads WHERE id = %s;', (id,))
        
        if cur.rowcount == 0:
            return jsonify({"erro": f"Operação recusada: Lead {id} não existe."}), 404
            
        conn.commit()
        return jsonify({"mensagem": f"Lead {id} excluído definitivamente!"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"erro": "Erro ao tentar excluir o lead.", "detalhes": str(e)}), 500
        
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()

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

        chaves_disponiveis = [
            os.getenv('GEMINI_API_KEY_1'),
            os.getenv('GEMINI_API_KEY_2')
        ]
        
        api_keys = [k for k in chaves_disponiveis if k]
        
        if not api_keys:
             return jsonify({"erro": "Servidor sem chaves de API configuradas."}), 500

        conteudo_atual = historico + [{'role': 'user', 'parts': [{'text': mensagem_usuario}]}]
        payload = {
            "systemInstruction": {"parts": [{"text": instrucao}]},
            "contents": conteudo_atual,
            "generationConfig": {"maxOutputTokens": 400, "temperature": 0.4}
        }

        for api_key in api_keys:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            
            resposta = requests.post(url, json=payload, headers={'Content-Type': 'application/json'})
            
            if resposta.status_code == 429:
                print("Chave excedida (429). Tentando backup...")
                continue 
                
            if not resposta.ok:
                raise Exception(f"Erro do Google: {resposta.status_code}")

            dados_google = resposta.json()
            texto_ia = dados_google['candidates'][0]['content']['parts'][0]['text']
            
            return jsonify({"resposta": texto_ia}), 200

        raise Exception("429: Todas as chaves da API excederam o limite.")

    except Exception as e:
        print(f"Erro no chat: {e}")
        return jsonify({"erro": "Erro interno de comunicação com a IA", "detalhes": str(e)}), 500