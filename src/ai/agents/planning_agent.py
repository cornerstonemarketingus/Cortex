from ..agent_base import AgentBase, register

@register
class PlanningAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="PlanningAgent", description="Creates implementation plans", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"plan":"TODO: generate plan based on requirements", "notes": context}
