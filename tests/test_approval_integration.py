import requests
import time

BASE = 'http://localhost:5001'

def test_proposal_approve():
    pid = 'test-self-improve'
    p = {'id': pid, 'title': 'self-improve', 'body': 'bootstrap self improvement loop'}
    r = requests.post(BASE + '/proposals', json=p)
    assert r.status_code == 201
    time.sleep(0.2)
    # approve
    headers = {'X-Human-Token': 'HUMAN-TOKEN-EXAMPLE'}
    r = requests.post(BASE + f'/proposals/{pid}/approve', headers=headers)
    assert r.status_code == 200
    r = requests.get(BASE + '/proposals')
    data = r.json()
    assert pid in data and data[pid]['status'] == 'approved'
