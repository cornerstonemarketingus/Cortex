import React from "react";

export default function Dashboard({ title = "AI CTO Platform" }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-indigo-400">{title}</h1>
        <p className="text-gray-400 mt-1">Autonomous AI Development Platform</p>
      </header>
      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {["Tasks", "Agents", "Marketplace"].map(label => (
          <div key={label} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold mb-2">{label}</h2>
          </div>
        ))}
      </main>
    </div>
  );
}
