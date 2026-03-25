export default function AgentCard({ name }: { name: string }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow hover:shadow-lg transition">
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-gray-500 text-sm mt-1">Ready to execute tasks and collaborate.</p>
    </div>
  );
}