import json
import subprocess
import shutil

candidates = [
    './build/Debug/ai_agent_bridge.exe',
    './build/Debug/ai_agent_bridge',
    './ai_agent_bridge.exe',
    './ai_agent_bridge'
]

exe = None
for c in candidates:
    try:
        with open(c, 'rb'):
            exe = c
            break
    except Exception:
        pass

if not exe:
    print('SKIP: bridge executable not found; build first')
    exit(0)

proc = subprocess.run([exe, '--exec', 'git status', '--dry-run'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
try:
    data = json.loads(proc.stdout)
except Exception:
    print('FAIL: bridge did not return JSON')
    print(proc.stdout)
    exit(2)

if data.get('ok') and data.get('dry_run'):
    print('PASS')
    exit(0)
else:
    print('FAIL: unexpected response', data)
    exit(3)
