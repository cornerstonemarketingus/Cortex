from ..agent_base import AgentBase, register
from ..executor import run_command

@register
class RepairAgent(AgentBase):
    def __init__(self, **kwargs):
        super().__init__(name="RepairAgent", description="Repairs build and env issues", prompt_template="{goal}\n{context}")

    def run(self, context):
        # Simple example: try 'git status' then 'git pull'
        out = {}
        code, stdout, stderr = run_command("git status", dry_run=context.get('dry_run', True))
        out['git_status'] = (code, stdout, stderr)
        if code == 0 and not context.get('dry_run', True):
            code2, s2, e2 = run_command("git pull", dry_run=context.get('dry_run', True))
            out['git_pull'] = (code2, s2, e2)
        return out
