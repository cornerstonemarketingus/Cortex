import AgentCard from "./AgentCard";

export default function BotPanel() {
  const agents = [
    'Strategist','Programmer','Designer','Researcher',
    'Analyst','Writer','Marketer','Doctor',
    'PhD Thinker','Autistic Coder','Artist','AI Visionary'
  ];

  return (
    <div className="space-y-4">
      {agents.map(agent => <AgentCard key={agent} name={agent} />)}
    </div>
  );
}