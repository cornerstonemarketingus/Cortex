from ..agent_base import AgentBase, register

@register
class RLAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="RLAgent", description="Reinforcement learning agent for tuning", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"tune", "params": {}}
