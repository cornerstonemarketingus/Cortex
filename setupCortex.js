// setupCortex.js
import fs from 'fs';
import path from 'path';

const baseDir = process.cwd();

const files = [
  { file: 'app/dashboard/components/AgentCard.tsx', content: `
export default function AgentCard({ name }: { name: string }) {
  return (
    <div className="p-4 bg-white rounded-xl shadow hover:shadow-lg transition">
      <h3 className="text-xl font-semibold">{name}</h3>
      <p className="text-gray-500 text-sm mt-1">Ready to execute tasks and collaborate.</p>
    </div>
  );
}` },
  { file: 'app/dashboard/components/BotPanel.tsx', content: `
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
}` },
  { file: 'app/api/memory/route.ts', content: `
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const memories = await prisma.memory.findMany();
  return NextResponse.json({ memories });
}

export async function POST(req: Request) {
  try {
    const { agent, message } = await req.json();
    if (!agent || !message) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    const record = await prisma.memory.create({ data: { agent, message } });
    return NextResponse.json(record);
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}` },
  { file: 'app/api/bots/route.ts', content: `
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const agents = [
  'Strategist','Programmer','Designer','Researcher',
  'Analyst','Writer','Marketer','Doctor',
  'PhD Thinker','Autistic Coder','Artist','AI Visionary'
];

export async function POST(req: Request) {
  try {
    const { task, agentPipeline } = await req.json();
    if (!task || !agentPipeline?.length) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    let results = [];
    for (const agent of agentPipeline) {
      const result = \`Agent \${agent} completed: \${task}\`;
      results.push({ agent, result });
      await prisma.memory.create({ data: { agent, message: result } });
    }

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
}` },
  { file: 'app/api/assets/route.ts', content: `
import { NextResponse } from 'next/server';

type Asset = { id: string; type: string; prompt: string; content?: string; };

let assets: Asset[] = [
  { id: '1', type: 'text', prompt: 'Example asset', content: 'Hello world' },
  { id: '2', type: 'image', prompt: 'Sample image', content: '' },
];

export async function GET() {
  return NextResponse.json(assets);
}` },
  { file: 'app/api/assets/[id]/route.ts', content: `
import { NextResponse } from 'next/server';

type Asset = { id: string; type: string; prompt: string; content?: string; };

let assets: Asset[] = [
  { id: '1', type: 'text', prompt: 'Example asset', content: 'Hello world' },
  { id: '2', type: 'image', prompt: 'Sample image', content: '' },
];

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await req.json();
  const idx = assets.findIndex(a => a.id === id);
  if (idx >= 0) {
    assets[idx].content = body.content;
    return NextResponse.json({ success: true, asset: assets[idx] });
  }
  return NextResponse.json({ success: false, message: 'Asset not found' }, { status: 404 });
}` }
];

// Helper to ensure folder exists
function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Create all files
for (const f of files) {
  const fullPath = path.join(baseDir, f.file);
  ensureDir(fullPath);
  fs.writeFileSync(fullPath, f.content.trim(), 'utf-8');
  console.log(`Created: ${fullPath}`);
}

console.log("\n✅ All files created. Run:\n  npm install\n  npx prisma generate\n  npx prisma migrate dev --name init\n  npm run dev");