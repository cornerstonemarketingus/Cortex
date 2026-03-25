from ..agent_base import AgentBase, register

@register
class TestAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="TestAgent", description="Generates and runs tests", prompt_template="{goal}\n{context}")

    def run(self, context):
        # Placeholder: run test suite or generate unit tests
        return {"action":"run_tests", "result": "not_implemented"}
