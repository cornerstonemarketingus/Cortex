"""
Simple Task Queue implementation using sqlite for persistence.
Provides enqueue, dequeue, mark_done, list_pending.
"""
import sqlite3
import json
import os
from typing import Optional, Dict

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'ai_tasks.db')

class TaskQueue:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._create_table()

    def _create_table(self):
        c = self.conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, msg TEXT, status TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)''')
        self.conn.commit()

    def enqueue(self, task: Dict):
        c = self.conn.cursor()
        c.execute('INSERT OR REPLACE INTO tasks (id, msg, status) VALUES (?, ?, ?)', (task['id'], json.dumps(task), 'pending'))
        self.conn.commit()

    def dequeue(self) -> Optional[Dict]:
        c = self.conn.cursor()
        row = c.execute("SELECT id, msg FROM tasks WHERE status='pending' ORDER BY created_at LIMIT 1").fetchone()
        if not row:
            return None
        tid, msg = row
        c.execute("UPDATE tasks SET status='in_progress' WHERE id=?", (tid,))
        self.conn.commit()
        return json.loads(msg)

    def mark_done(self, tid: str, result: Dict):
        c = self.conn.cursor()
        c.execute("UPDATE tasks SET status='done', msg=? WHERE id=?", (json.dumps(result), tid))
        self.conn.commit()

    def list_pending(self):
        c = self.conn.cursor()
        rows = c.execute("SELECT id, msg FROM tasks WHERE status!='done'").fetchall()
        return [(r[0], json.loads(r[1])) for r in rows]

# Simple usage example
if __name__ == '__main__':
    q = TaskQueue()
    sample = {"id":"task-000","type":"TASK","role":"Coder","payload":{"goal":"fix build"},"timestamp":"2026-03-14T23:00:00Z"}
    q.enqueue(sample)
    t = q.dequeue()
    print('Dequeued:', t)
    q.mark_done(t['id'], {"id":t['id'],"status":"ok"})
