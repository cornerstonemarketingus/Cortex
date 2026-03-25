import requests
import uuid

API = 'http://localhost:5001'

proposal = {
    'id': 'bootstrap-' + str(uuid.uuid4()),
    'title': 'Self-improvement bootstrap',
    'body': 'Request to begin self-improvement loop: evaluate past tasks, propose small safe improvements, request human approvals.'
}

r = requests.post(API + '/proposals', json=proposal)
print('Submitted proposal:', r.status_code, r.text)
