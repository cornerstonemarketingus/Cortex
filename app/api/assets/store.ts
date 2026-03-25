import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'assets.json');

export type AssetRecord = {
  id: string;
  type: string;
  prompt: string;
  content?: string;
};

function isAssetRecord(value: unknown): value is AssetRecord {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<AssetRecord>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.prompt === 'string'
  );
}

export function loadAssets(): AssetRecord[] {
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isAssetRecord) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function saveAssets(assets: AssetRecord[]) {
  fs.writeFileSync(filePath, JSON.stringify(assets, null, 2), 'utf-8');
}

