import { NextResponse } from 'next/server';
import { loadAssets, saveAssets } from '../store';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { content?: string };
  const assets = loadAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx >= 0) {
    assets[idx].content = body.content;
    saveAssets(assets);
    return NextResponse.json({ success: true, asset: assets[idx] });
  }
  return NextResponse.json({ success: false, message: 'Asset not found' }, { status: 404 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assets = loadAssets();
  const filtered = assets.filter((a) => a.id !== id);
  if (filtered.length === assets.length) {
    return NextResponse.json({ success: false, message: 'Asset not found' }, { status: 404 });
  }
  saveAssets(filtered);
  return NextResponse.json({ success: true });
}