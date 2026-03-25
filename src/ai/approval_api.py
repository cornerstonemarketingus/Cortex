"""Simple Flask approval API for proposals.
Endpoints:
- POST /proposals : submit a proposal (stores JSON)
- GET /proposals : list proposals
- POST /proposals/<id>/approve : approve with human token (header X-Human-Token)
- POST /proposals/<id>/reject : reject

This is a minimal implementation for local use; in production use auth and HTTPS.
"""
from flask import Flask, request, jsonify
import json, os

APP_FILE = os.path.join(os.path.dirname(__file__), '..', 'approvals.json')
if not os.path.exists(APP_FILE):
    with open(APP_FILE, 'w') as f:
        json.dump({}, f)

app = Flask('approval_api')

def load():
    with open(APP_FILE, 'r') as f:
        return json.load(f)

def save(d):
    with open(APP_FILE, 'w') as f:
        json.dump(d, f, indent=2)

@app.route('/proposals', methods=['POST'])
def submit_proposal():
    p = request.get_json()
    if not p or 'id' not in p:
        return jsonify({'ok':False, 'error':'invalid proposal'}), 400
    d = load()
    d[p['id']] = {'proposal':p, 'status':'pending'}
    save(d)
    return jsonify({'ok':True}), 201

@app.route('/proposals', methods=['GET'])
def list_proposals():
    d = load()
    return jsonify(d)

@app.route('/proposals/<pid>/approve', methods=['POST'])
def approve(pid):
    token = request.headers.get('X-Human-Token')
    if not token or token != 'HUMAN-TOKEN-EXAMPLE':
        return jsonify({'ok':False,'error':'invalid token'}), 403
    d = load()
    if pid not in d:
        return jsonify({'ok':False,'error':'not found'}), 404
    d[pid]['status'] = 'approved'
    save(d)
    return jsonify({'ok':True})

@app.route('/proposals/<pid>/reject', methods=['POST'])
def reject(pid):
    d = load()
    if pid not in d:
        return jsonify({'ok':False,'error':'not found'}), 404
    d[pid]['status'] = 'rejected'
    save(d)
    return jsonify({'ok':True})

if __name__ == '__main__':
    app.run(port=5001)
