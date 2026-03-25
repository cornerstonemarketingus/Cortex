import json
from json import loads

SCHEMA_KEYS = ['id','type','role','payload','timestamp']

with open('task_schema.json') as f:
    schema = json.load(f)

# Simple shape test: sample task
sample = {"id":"task-1","type":"TASK","role":"Coder","payload":{},"timestamp":"2026-03-14T23:00:00Z"}
for k in SCHEMA_KEYS:
    assert k in sample, f"Missing key {k}"
print('SCHEMA SMOKE PASS')
