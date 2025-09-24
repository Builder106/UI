import express from 'express';
import dotenv from 'dotenv';
import { randomBytes } from 'crypto';
import { buildAuthorizeUrl } from './lib/oauth';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fillConsentTemplate } from './lib/consent';
import { prisma } from './lib/db';
import { fetchUserShots, downloadImage } from './lib/dribbble';

dotenv.config();

export function createApp() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/health', (_, res) => res.json({ ok: true }));

  app.get('/oauth/start', (req, res) => {
    const clientId = process.env.DRIBBBLE_CLIENT_ID || '';
    const redirectUri = process.env.DRIBBBLE_REDIRECT_URI || '';
    const state = randomBytes(12).toString('hex');
    // Note: persist state server-side/session in real app
    const url = buildAuthorizeUrl({ clientId, redirectUri, state, scope: 'public' });
    res.redirect(url);
  });

  app.get('/oauth/callback', (req, res) => {
    const { code, state } = req.query as any;
    if (!code) return res.status(400).json({ error: 'missing code' });
    // Token exchange happens server-side; omitted here for brevity
    res.json({ ok: true, code, state });
  });

  app.get('/consent/prepare', (req, res) => {
    const { id, title, url, creator, email } = req.query as any;
    if (!id || !title || !url || !creator) return res.status(400).json({ error: 'missing' });

    const templatePath = path.join(process.cwd(), 'Consent_Request_Template.txt');
    const template = readFileSync(templatePath, 'utf8');
    const body = fillConsentTemplate(template, {
      creatorName: String(creator),
      shotTitle: String(title),
      shotUrl: String(url),
      senderName: process.env.SENDER_NAME || 'Olayinka Vaughan',
      senderRole: process.env.SENDER_ROLE || 'Student',
      senderOrg: process.env.SENDER_ORG || 'Wesleyan University',
      senderEmail: process.env.SENDER_EMAIL || 'yvaughan@wesleyan.edu'
    });

    const entryDir = path.join(process.cwd(), 'datasets', 'sources', 'dribbble', 'pilot', String(id));
    mkdirSync(entryDir, { recursive: true });
    const outPath = path.join(entryDir, 'consent-request.txt');
    writeFileSync(outPath, body);

    res.json({ ok: true, id, saved: outPath });
  });

  app.get('/dashboard/status', async (req, res) => {
    const { id } = req.query as any;
    if (!id) return res.status(400).json({ error: 'missing id' });
    const entry = await prisma.entry.findUnique({
      where: { id: String(id) },
      include: { consent: true, downloads: true }
    });
    if (!entry) return res.json({ id, status: {} });
    const status = {
      sentAt: entry.consent?.sentAt?.toISOString(),
      consent: entry.consent ? {
        granted: entry.consent.granted,
        evidence: entry.consent.evidence || undefined,
        timestamp: entry.consent.grantedAt?.toISOString()
      } : undefined,
      downloaded: entry.downloads.length ? { shots: entry.downloads.length } : undefined
    };
    res.json({ id, status, entry });
  });

  app.post('/dashboard/mark-sent', async (req, res) => {
    const id = String(req.query.id || '');
    const title = String(req.query.title || '');
    const urlQ = String(req.query.url || '');
    const creator = String(req.query.creator || '');
    if (!id) return res.status(400).json({ error: 'missing id' });
    await prisma.entry.upsert({
      where: { id },
      create: { id, title, url: urlQ, creatorName: creator },
      update: { title, url: urlQ, creatorName: creator }
    });
    await prisma.consent.upsert({
      where: { entryId: id },
      create: { entryId: id, sentAt: new Date() },
      update: { sentAt: new Date() }
    });
    res.json({ ok: true, id });
  });

  app.post('/dashboard/mark-consent', async (req, res) => {
    const id = String(req.query.id || '');
    const evidence = String(req.query.evidence || '');
    const timestamp = req.query.timestamp ? new Date(String(req.query.timestamp)) : new Date();
    if (!id) return res.status(400).json({ error: 'missing id' });
    await prisma.entry.upsert({ where: { id }, create: { id, title: '', url: '', creatorName: '' }, update: {} });
    await prisma.consent.upsert({
      where: { entryId: id },
      create: { entryId: id, granted: true, evidence, grantedAt: timestamp },
      update: { granted: true, evidence, grantedAt: timestamp }
    });
    res.json({ ok: true, id });
  });

  app.post('/dashboard/download', async (req, res) => {
    const id = String(req.query.id || '');
    const accessToken = String(process.env.DRIBBBLE_ACCESS_TOKEN || '');
    if (!id) return res.status(400).json({ error: 'missing id' });
    const entry = await prisma.entry.findUnique({ where: { id }, include: { consent: true } });
    if (!entry || !entry.consent?.granted) return res.status(400).json({ error: 'consent_required' });
    if (!accessToken) return res.status(400).json({ error: 'missing_token' });

    const shots = await fetchUserShots(accessToken);
    let count = 0;
    for (const s of shots) {
      const imageUrl = s.images?.hidpi || s.images?.two_x || s.images?.normal || '';
      if (!imageUrl) continue;
      const outDir = path.join(process.cwd(), 'datasets', 'sources', 'dribbble', 'pilot', id);
      const filePath = await downloadImage(imageUrl, outDir, `shot-${s.id}`);
      await prisma.download.create({ data: { entryId: id, shotId: String(s.id), imageUrl, filePath, status: 'saved' } });
      count++;
    }
    res.json({ ok: true, id, saved: count });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = createApp();
  const port = process.env.PORT || 5173;
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`WeaveUI dataset manager listening on :${port}`);
  });
}
