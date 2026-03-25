from ..agent_base import AgentBase, register

@register
class OpsAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="OpsAgent", description="Operations and runbook automation", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"runbook", "step": context.get('step', None)}
