from ..agent_base import AgentBase, register

@register
class MonitorAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="MonitorAgent", description="Monitors systems and reports anomalies", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"monitor", "alerts": []}
