import { NextResponse } from 'next/server';
import { loadAssets, saveAssets } from './store';
import type { AssetRecord } from './store';

type Asset = AssetRecord;

export async function GET() {
  const assets = loadAssets();
  return NextResponse.json({ assets });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Partial<Asset>;
    const { type, prompt, content } = body;
    if (!type || !prompt) {
      return NextResponse.json(
        { error: 'Missing required fields: type, prompt' },
        { status: 400 }
      );
    }
    const assets = loadAssets();
    const newAsset: Asset = { id: Date.now().toString(), type, prompt, content };
    assets.push(newAsset);
    saveAssets(assets);
    return NextResponse.json(newAsset, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}