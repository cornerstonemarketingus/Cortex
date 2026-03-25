from ..agent_base import AgentBase, register

@register
class NLPAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="NLPAgent", description="Handles natural language tasks", prompt_template="{goal}\n{context}")

    def run(self, context):
        return {"action":"nlp", "summary": "not_implemented"}
