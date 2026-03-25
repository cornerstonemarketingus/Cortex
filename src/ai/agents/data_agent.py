from ..agent_base import AgentBase, register

@register
class DataAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="DataAgent", description="Handles data and assets", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"data_ingest", "items": context.get('items', [])}
