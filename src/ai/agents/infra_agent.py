from ..agent_base import AgentBase, register

@register
class InfraAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="InfraAgent", description="Manages infra tasks", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"infra_check", "status": "ok"}
