from ..agent_base import AgentBase, register

@register
class DeployAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="DeployAgent", description="Deployment orchestration", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"deploy", "target": context.get('target', 'staging')}
