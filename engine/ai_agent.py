"""
ai_agent.py — Autonomous AI CTO Task Loop
This is the core agent controller. Do NOT modify the main_loop()
or execute_task() functions via self-improvement tasks.
Only feature handlers and sub-agent logic may be modified.
"""

import json
import time
import traceback
from pathlib import Path

from .utils import (
  BASE_DIR,
  read_file,
  write_file,
  create_file,
  search_code,
  run_build,
  run_tests,
  deploy_preview,
  commit_changes,
  log_action,
)


# ─────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────
QUEUE_PATH = BASE_DIR / "apps" / "current_app" / "tasks" / "task_queue.json"
AGENTS_DIR = BASE_DIR / "agent" / "ai_agents"
TEMPLATES_DIR = BASE_DIR / "templates"
MAX_RETRIES = 3


# ─────────────────────────────────────────
# TASK QUEUE MANAGEMENT
# ─────────────────────────────────────────

def load_queue() -> list:
  if not QUEUE_PATH.exists():
    log_action("Task queue not found. Creating empty queue.", "WARN")
    QUEUE_PATH.parent.mkdir(parents=True, exist_ok=True)
    QUEUE_PATH.write_text("[]", encoding="utf-8")
    return []
  return json.loads(QUEUE_PATH.read_text(encoding="utf-8"))


def save_queue(tasks: list) -> None:
  QUEUE_PATH.write_text(json.dumps(tasks, indent=2), encoding="utf-8")


def fetch_next_task() -> dict | None:
  tasks = load_queue()
  if not tasks:
    return None
  priority = {"bugfix": 0, "feature": 1, "self-improvement": 2}
  tasks.sort(key=lambda t: priority.get(t.get("type", "feature"), 99))
  task = tasks.pop(0)
  save_queue(tasks)
  return task


def add_task(task_type: str, description: str) -> None:
  tasks = load_queue()
  new_id = max((t.get("id", 0) for t in tasks), default=0) + 1
  tasks.append({"id": new_id, "type": task_type, "description": description})
  save_queue(tasks)
  log_action(f"Task added: [{task_type}] {description}")


# ─────────────────────────────────────────
# TASK HANDLERS
# ─────────────────────────────────────────

def handle_feature(task: dict) -> None:
  desc = task["description"].lower()
  log_action(f"Generating feature: {task['description']}")

  if "contractor quote" in desc:
    create_file(
      "apps/current_app/backend/quote_generator.py",
      '''"""Quote Generator Module"""

def calculate_quote(materials: float, labor_hours: float, rate: float = 75.0) -> dict:
    labor = labor_hours * rate
    subtotal = materials + labor
    tax = subtotal * 0.08
    total = subtotal + tax
    return {
        "materials": round(materials, 2),
        "labor": round(labor, 2),
        "subtotal": round(subtotal, 2),
        "tax": round(tax, 2),
        "total": round(total, 2)
    }
''',
    )

  if "sms" in desc:
    create_file(
      "apps/current_app/modules/sms_notifications.py",
      '''"""SMS Notification Module"""
import os

def send_sms(to: str, message: str) -> dict:
    try:
        from twilio.rest import Client
        client = Client(os.environ["TWILIO_SID"], os.environ["TWILIO_TOKEN"])
        msg = client.messages.create(body=message, from_=os.environ["TWILIO_FROM"], to=to)
        return {"success": True, "sid": msg.sid}
    except ImportError:
        return {"success": False, "error": "Run: pip install twilio"}
    except Exception as e:
        return {"success": False, "error": str(e)}
''',
    )

  if "dashboard" in desc or "ui" in desc:
    create_file(
      "apps/current_app/frontend/Dashboard.tsx",
      '''import React from "react";

export default function Dashboard({ title = "AI CTO Platform" }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-indigo-400">{title}</h1>
        <p className="text-gray-400 mt-1">Autonomous AI Development Platform</p>
      </header>
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["Tasks", "Agents", "Marketplace"].map(label => (
          <div key={label} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">{label}</h2>
          </div>
        ))}
      </main>
    </div>
  );
}
''',
    )

  if "12 ai agents" in desc or "ai agents" in desc:
    AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    agent_names = [
      "frontend",
      "backend",
      "database",
      "roblox",
      "testing",
      "security",
      "performance",
      "ui_ux",
      "api",
      "devops",
      "self_improvement",
      "marketplace",
    ]
    for name in agent_names:
      create_file(
        f"agent/ai_agents/{name}_agent.py",
        f'"""{name.upper()} Agent"""\n\n'
        "def run(task: dict) -> dict:\n"
        f'    print(f"[{name.upper()}] {{task}}")\n'
        f'    return {{"success": True, "agent": "{name}"}}\n',
      )
    log_action(f"Created {len(agent_names)} sub-agent files.")

  if "roblox" in desc:
    create_file(
      "apps/current_app/modules/roblox_game.lua",
      '''-- Roblox Game Script
local Players = game:GetService("Players")

local CONFIG = { maxPlayers = 10, startHealth = 100 }

Players.PlayerAdded:Connect(function(player)
    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player
    local score = Instance.new("IntValue")
    score.Name = "Score"
    score.Value = 0
    score.Parent = leaderstats
end)

print("Game initialized.")
''',
    )


def handle_bugfix(task: dict) -> None:
  desc = task["description"].lower()
  log_action(f"Fixing bug: {task['description']}")

  if "chat" in desc or "scroll" in desc:
    create_file(
      "apps/current_app/frontend/ChatBox.tsx",
      '''import React, { useEffect, useRef, useState } from "react";

interface Message { id: number; sender: string; text: string; timestamp: string; }

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), sender: "User", text: input.trim(), timestamp: new Date().toLocaleTimeString() }]);
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className="flex flex-col">
            <span className="text-xs text-gray-500">{msg.sender} · {msg.timestamp}</span>
            <p className="text-sm text-white bg-gray-800 rounded-lg px-3 py-2 mt-1">{msg.text}</p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-gray-800 p-3 flex gap-2">
        <input className="flex-1 bg-gray-800 text-white rounded-lg px-3 py-2 text-sm outline-none"
          placeholder="Type a message..." value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendMessage(); } }} />
        <button onClick={sendMessage} className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm">Send</button>
      </div>
    </div>
  );
}
''',
    )


def handle_self_improvement(task: dict) -> None:
  log_action(
    f"Self-improvement logged: {task['description']} — manual review recommended.",
    "INFO",
  )


# ─────────────────────────────────────────
# CORE EXECUTION LOOP (DO NOT MODIFY)
# ─────────────────────────────────────────

def execute_task(task: dict, attempt: int = 1) -> None:
  task_id = task.get("id", "?")
  task_type = task.get("type", "unknown")
  desc = task.get("description", "")

  print(
    f"\n{'='*50}\n[AGENT] Task #{task_id} [{task_type}] attempt "
    f"{attempt}/{MAX_RETRIES}\n[AGENT] {desc}\n{'='*50}",
  )

  try:
    if task_type == "feature":
      handle_feature(task)
    elif task_type == "bugfix":
      handle_bugfix(task)
    elif task_type == "self-improvement":
      handle_self_improvement(task)
    else:
      log_action(f"Unknown task type: {task_type}", "WARN")
      return

    build = run_build()
    if not build.success:
      log_action(f"[FAIL] Build failed task #{task_id}", "ERROR")
      if attempt < MAX_RETRIES:
        time.sleep(2)
        execute_task(task, attempt + 1)
      else:
        log_action(f"[SKIP] Task #{task_id} exceeded max retries.", "ERROR")
      return

    tests = run_tests()
    if not tests.passed:
      log_action(f"[FAIL] Tests failed task #{task_id}", "ERROR")
      if attempt < MAX_RETRIES:
        execute_task(task, attempt + 1)
      else:
        log_action(f"[SKIP] Task #{task_id} exceeded max retries.", "ERROR")
      return

    deploy_preview(f"Task #{task_id}: {desc}")
    commit_changes(f"AI-CTO #{task_id}: {desc}")
    log_action(f"[DONE] Task #{task_id}: {desc}")

  except Exception as e:  # noqa: BLE001
    log_action(
      f"[ERROR] Task #{task_id}: {str(e)}\n{traceback.format_exc()}",
      "ERROR",
    )


def main_loop() -> None:
  print("\n" + "=" * 50 + "\n  AI CTO AGENT — STARTING\n" + "=" * 50)
  log_action("AI CTO Agent started.")
  idle_count = 0
  while True:
    task = fetch_next_task()
    if task:
      idle_count = 0
      execute_task(task)
    else:
      idle_count += 1
      if idle_count % 12 == 1:
        print("[AGENT] Queue empty. Waiting for tasks...")
      time.sleep(5)


if __name__ == "__main__":
  main_loop()