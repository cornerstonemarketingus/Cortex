from ..agent_base import AgentBase, register

@register
class DocAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="DocAgent", description="Creates and updates docs", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"update_docs", "details": context.get('details', '')}
