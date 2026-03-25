"""Approval API v2 using SQLite backend, env-driven token, health checks, and bootstrap endpoint.
This is a demo: replace with proper auth, TLS, and DB for production.
"""
from flask import Flask, request, jsonify
import os
import sqlite3
import json
import time
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'approvals.db')
HUMAN_TOKEN = os.environ.get('HUMAN_TOKEN', 'HUMAN-TOKEN-EXAMPLE')

app = Flask('approval_api')

def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''
    CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        payload TEXT,
        status TEXT,
        created_at TEXT
    )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok':True, 'time': time.time()})

@app.route('/proposals', methods=['POST'])
def submit_proposal():
    p = request.get_json()
    if not p or 'id' not in p:
        return jsonify({'ok':False, 'error':'invalid proposal'}), 400
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('INSERT OR REPLACE INTO proposals (id,payload,status,created_at) VALUES (?,?,?,?)',
                (p['id'], json.dumps(p), 'pending', datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return jsonify({'ok':True}), 201

@app.route('/proposals', methods=['GET'])
def list_proposals():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id,payload,status,created_at FROM proposals')
    rows = cur.fetchall()
    out = {}
    for r in rows:
        out[r['id']] = {'proposal': json.loads(r['payload']), 'status': r['status'], 'created_at': r['created_at']}
    conn.close()
    return jsonify(out)

@app.route('/proposals/<pid>/approve', methods=['POST'])
def approve(pid):
    token = request.headers.get('X-Human-Token')
    if not token or token != HUMAN_TOKEN:
        return jsonify({'ok':False,'error':'invalid token'}), 403
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id FROM proposals WHERE id=?', (pid,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'ok':False,'error':'not found'}), 404
    cur.execute('UPDATE proposals SET status=? WHERE id=?', ('approved', pid))
    conn.commit()
    conn.close()
    return jsonify({'ok':True})

@app.route('/proposals/<pid>/reject', methods=['POST'])
def reject(pid):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('SELECT id FROM proposals WHERE id=?', (pid,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'ok':False,'error':'not found'}), 404
    cur.execute('UPDATE proposals SET status=? WHERE id=?', ('rejected', pid))
    conn.commit()
    conn.close()
    return jsonify({'ok':True})

@app.route('/bootstrap_proposal', methods=['POST'])
def bootstrap_proposal():
    p = request.get_json() or {}
    pid = p.get('id') or 'bootstrap-1'
    proposal = {
        'id': pid,
        'title': 'Self-improvement bootstrap',
        'body': 'Evaluate recent task performance and propose 1-2 small documentation or test improvements. Requires human approval.'
    }
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('INSERT OR REPLACE INTO proposals (id,payload,status,created_at) VALUES (?,?,?,?)',
                (proposal['id'], json.dumps(proposal), 'pending', datetime.utcnow().isoformat()))
    conn.commit()
    conn.close()
    return jsonify({'ok':True, 'id': proposal['id']})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
