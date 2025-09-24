import { request } from 'undici';
import { createWriteStream, mkdirSync } from 'fs';
import path from 'path';

type Shot = {
  id: number | string;
  images?: { hidpi?: string; normal?: string; one_x?: string; two_x?: string } & Record<string, string>;
};

export async function fetchUserShots(accessToken: string): Promise<Shot[]> {
  const url = 'https://api.dribbble.com/v2/user/shots';
  const { body, statusCode } = await request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (statusCode >= 400) throw new Error(`Dribbble API error: ${statusCode}`);
  const text = await body.text();
  try {
    return JSON.parse(text) as Shot[];
  } catch (e) {
    throw new Error('Failed to parse Dribbble response');
  }
}

export async function downloadImage(url: string, outDir: string, baseName: string): Promise<string> {
  mkdirSync(outDir, { recursive: true });
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const filePath = path.join(outDir, `${baseName}${ext}`);
  const res = await request(url);
  if (res.statusCode >= 400) throw new Error(`Download failed: ${res.statusCode}`);
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(filePath);
    res.body.pipe(ws);
    res.body.on('error', reject);
    ws.on('finish', () => resolve());
    ws.on('error', reject);
  });
  return filePath;
}


