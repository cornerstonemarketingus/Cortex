"""Agent base classes and utilities for CORTEXEngine AI agents (Python)
Provides AgentBase and a simple registry pattern for lightweight agents.
"""
from typing import Any, Dict

class AgentBase:
    def __init__(self, name: str, description: str, prompt_template: str):
        self.name = name
        self.description = description
        self.prompt_template = prompt_template

    def build_prompt(self, context: Dict[str, Any]) -> str:
        try:
            return self.prompt_template.format(**context)
        except Exception:
            return self.prompt_template + "\nContext:\n" + str(context)

    def run(self, context: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError

# Simple registry
_REGISTRY = {}

def register(agent_cls):
    _REGISTRY[agent_cls.__name__] = agent_cls
    return agent_cls

def list_agents():
    return list(_REGISTRY.keys())

def make_agent(name: str, **kwargs):
    cls = _REGISTRY.get(name)
    if not cls:
        raise KeyError(f"Agent {name} not registered")
    return cls(**kwargs)
