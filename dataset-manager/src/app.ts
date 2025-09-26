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
import { sendConsentEmail, sendConsentEmailFromData, sendConsentDecisionReceipt } from './lib/mailer';
import { verifyConsentToken } from './lib/consentToken';
import { render } from '@react-email/render';
import { createElement } from 'react';

// Load env from dataset-manager/.env regardless of where the process is started
const dmEnvPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
dotenv.config({ path: dmEnvPath, override: true });

export function createApp() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('/config', async (req, res) => {
    const id = String((req.query.id as string) || '');
    if (id) {
      const token = await (prisma as any).token.findUnique({ where: { entryId: id } });
      return res.json({ hasToken: Boolean(token) });
    }
    res.json({ hasToken: Boolean(process.env.DRIBBBLE_ACCESS_TOKEN) });
  });

  app.get('/health', (_, res) => res.json({ ok: true }));

  // Web consent page (minimal HTML)
  app.get('/consent/:token', async (req, res) => {
    const token = String(req.params.token || '');
    try {
      const data = verifyConsentToken(token);
      const entry = await prisma.entry.findUnique({ where: { id: data.entryId } });
      const name = entry?.creatorName || 'Creator';
      const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Consent</title><style>body{font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial; padding:16px}</style></head><body><h3>WeaveUI Consent</h3><p>Hi ${name}, please confirm if we may include your current Dribbble shots for non‑commercial research with attribution.</p><p><a href="/consent/approve?token=${encodeURIComponent(token)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 12px;border-radius:6px;text-decoration:none">I consent</a> <a href="/consent/decline?token=${encodeURIComponent(token)}" style="display:inline-block;background:#b91c1c;color:#fff;padding:10px 12px;border-radius:6px;text-decoration:none;margin-left:8px">I do not consent</a></p><p><small>Token tied to ${data.to}. Expires ${(new Date(data.exp*1000)).toLocaleString()}.</small></p></body></html>`;
      res.type('html').send(html);
    } catch (e: any) {
      res.status(400).send(`<pre>Invalid or expired link: ${e?.message || 'error'}</pre>`);
    }
  });

  app.post('/consent/approve', async (req, res) => {
    const token = String(req.query.token || req.body?.token || '');
    try {
      const data = verifyConsentToken(token);
      await prisma.entry.upsert({ where: { id: data.entryId }, create: { id: data.entryId, title: '', url: '', creatorName: '' }, update: {} });
      await prisma.consent.upsert({
        where: { entryId: data.entryId },
        create: { entryId: data.entryId, granted: true, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:approve' },
        update: { granted: true, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:approve' }
      });
      try { await sendConsentDecisionReceipt(data.to, data.entryId, 'approve', { detailsUrl: `${req.protocol}://${req.get('host')}/consent/${encodeURIComponent(token)}` }); } catch {}
      res.json({ ok: true, entryId: data.entryId });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: 'bad_token', message: e?.message });
    }
  });

  app.post('/consent/decline', async (req, res) => {
    const token = String(req.query.token || req.body?.token || '');
    try {
      const data = verifyConsentToken(token);
      await prisma.entry.upsert({ where: { id: data.entryId }, create: { id: data.entryId, title: '', url: '', creatorName: '' }, update: {} });
      await prisma.consent.upsert({
        where: { entryId: data.entryId },
        create: { entryId: data.entryId, granted: false, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:decline' },
        update: { granted: false, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:decline' }
      });
      try { await sendConsentDecisionReceipt(data.to, data.entryId, 'decline', { detailsUrl: `${req.protocol}://${req.get('host')}/consent/${encodeURIComponent(token)}` }); } catch {}
      res.json({ ok: true, entryId: data.entryId });
    } catch (e: any) {
      res.status(400).json({ ok: false, error: 'bad_token', message: e?.message });
    }
  });

  // GET variants for email link clicks
  app.get('/consent/approve', async (req, res) => {
    const token = String(req.query.token || '');
    try {
      const data = verifyConsentToken(token);
      await prisma.entry.upsert({ where: { id: data.entryId }, create: { id: data.entryId, title: '', url: '', creatorName: '' }, update: {} });
      await prisma.consent.upsert({
        where: { entryId: data.entryId },
        create: { entryId: data.entryId, granted: true, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:approve' },
        update: { granted: true, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:approve' }
      });
      try { await sendConsentDecisionReceipt(data.to, data.entryId, 'approve', { detailsUrl: `${req.protocol}://${req.get('host')}/consent/${encodeURIComponent(token)}` }); } catch {}
      res.type('html').send('<p>Consent recorded. Thank you!</p>');
    } catch (e: any) {
      res.status(400).type('html').send(`<pre>Invalid or expired link: ${e?.message || 'error'}</pre>`);
    }
  });

  app.get('/consent/decline', async (req, res) => {
    const token = String(req.query.token || '');
    try {
      const data = verifyConsentToken(token);
      await prisma.entry.upsert({ where: { id: data.entryId }, create: { id: data.entryId, title: '', url: '', creatorName: '' }, update: {} });
      await prisma.consent.upsert({
        where: { entryId: data.entryId },
        create: { entryId: data.entryId, granted: false, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:decline' },
        update: { granted: false, grantedAt: new Date(), scope: data.scope || 'all_shots', evidence: 'web:decline' }
      });
      try { await sendConsentDecisionReceipt(data.to, data.entryId, 'decline', { detailsUrl: `${req.protocol}://${req.get('host')}/consent/${encodeURIComponent(token)}` }); } catch {}
      res.type('html').send('<p>Preference recorded. No content will be included.</p>');
    } catch (e: any) {
      res.status(400).type('html').send(`<pre>Invalid or expired link: ${e?.message || 'error'}</pre>`);
    }
  });

  // Permanent preview of the consent email template rendered as HTML
  app.get('/email/preview', async (req, res) => {
    const creatorName = String(req.query.creator || 'Creator');
    const shotTitle = String(req.query.title || '(multiple shots)');
    const shotUrl = String(req.query.url || '');
    const senderName = process.env.SENDER_NAME || 'WeaveUI Team';
    const senderRole = process.env.SENDER_ROLE || '';
    const senderOrg = process.env.SENDER_ORG || '';
    const senderEmail = process.env.SENDER_EMAIL || '';

    if (!creatorName || !shotTitle) {
      return res.status(400).json({ error: 'missing', required: ['creator','title','url'] });
    }
    try {
      // Hot-load the template on every request in dev via cache-busting query param
      const mod: any = await import('./lib/templates/ConsentEmail.tsx?ts=' + (process.env.NODE_ENV === 'production' ? 'prod' : Date.now()));
      const ConsentEmail = mod.default || mod.ConsentEmail;
      const html = await render(createElement(ConsentEmail, {
        creatorName,
        shotTitle,
        shotUrl,
        shotImage: req.query.image ? String(req.query.image) : undefined,
        senderName,
        senderRole,
        senderOrg,
        senderEmail,
        logoSrc: '/weaveui_logo_icon.png'
      }));
      res.type('html').send(html);
    } catch (e: any) {
      res.status(500).json({ error: 'render_failed', message: e?.message });
    }
  });

  app.get('/oauth/start', (req, res) => {
    const clientId = process.env.DRIBBBLE_CLIENT_ID || '';
    const redirectUri = process.env.DRIBBBLE_REDIRECT_URI || '';
    const entryId = String((req.query.id as string) || '');
    const statePayload = { id: entryId, nonce: randomBytes(12).toString('hex') };
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url');
    // Note: persist state server-side/session in real app
    const url = buildAuthorizeUrl({ clientId, redirectUri, state, scope: 'public' });
    res.redirect(url);
  });

  app.get('/oauth/callback', async (req, res) => {
    const { code, state } = req.query as any;
    if (!code) return res.status(400).json({ error: 'missing code' });
    let entryId = '';
    try {
      const parsed = JSON.parse(Buffer.from(String(state || ''), 'base64url').toString('utf8'));
      entryId = String(parsed.id || '');
    } catch {}
    try {
      const tokenRes = await fetch('https://dribbble.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.DRIBBBLE_CLIENT_ID || '',
          client_secret: process.env.DRIBBBLE_CLIENT_SECRET || '',
          code: String(code),
          redirect_uri: process.env.DRIBBBLE_REDIRECT_URI || ''
        })
      });
      if (!tokenRes.ok) {
        const t = await tokenRes.text();
        return res.status(400).json({ error: 'token_exchange_failed', detail: t });
      }
      const data = await tokenRes.json() as any;
      const accessToken = data.access_token as string;
      if (entryId) {
        await prisma.entry.upsert({ where: { id: entryId }, create: { id: entryId, title: '', url: '', creatorName: '' }, update: {} });
        await (prisma as any).token.upsert({ where: { entryId }, create: { entryId, accessToken }, update: { accessToken } });
      }
      res.json({ ok: true, savedForEntry: entryId || null });
    } catch (e: any) {
      res.status(500).json({ error: 'exception', message: e?.message });
    }
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
    const handle = String(req.query.handle || '');
    if (!id) return res.status(400).json({ error: 'missing id' });
    await prisma.entry.upsert({
      where: { id },
      // cast to any to avoid stale Prisma types during development
      create: { id, title, url: urlQ, creatorName: creator, creatorHandle: handle || undefined } as any,
      update: { title, url: urlQ, creatorName: creator, creatorHandle: handle || undefined } as any
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
    const tokenRec = await (prisma as any).token.findUnique({ where: { entryId: id } });
    const accessToken = tokenRec?.accessToken || String(process.env.DRIBBBLE_ACCESS_TOKEN || '');
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
      const tags = (Array.isArray((s as any).tags) ? (s as any).tags.join(',') : null);
      await prisma.download.create({ data: { entryId: id, shotId: String(s.id), imageUrl, filePath, status: 'saved', tags } as any });
      count++;
    }
    res.json({ ok: true, id, saved: count });
  });

  app.post('/email/consent', async (req, res) => {
    try {
      const id = String(req.query.id || '');
      const to = String(req.query.to || '');
      const title = String(req.query.title || '');
      const shotUrl = String(req.query.url || '');
      const creator = String(req.query.creator || '');
      if (!id || !to || !title) return res.status(400).json({ ok: false, error: 'missing' });

      // Validate SMTP configuration early to avoid 500s later
      const required = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
      for (const key of required) {
        if (!process.env[key]) {
          return res.status(400).json({ ok: false, error: 'smtp_config_missing', missing: key });
        }
      }

      // Structured send only (no legacy file fallback); includes web consent links
      if (creator && shotUrl) {
        const r = await sendConsentEmailFromData(to, `Consent request: ${title}`, id, {
          creatorName: creator || 'Creator',
          shotTitle: title || '(multiple shots)',
          shotUrl: shotUrl || '',
          senderName: process.env.SENDER_NAME,
          senderRole: process.env.SENDER_ROLE,
          senderOrg: process.env.SENDER_ORG,
          senderEmail: process.env.SENDER_EMAIL,
          entryId: id
        });
        // Ensure an Entry exists to satisfy FK before writing Consent
        await prisma.entry.upsert({ where: { id }, create: { id, title, url: shotUrl, creatorName: creator }, update: { title, url: shotUrl, creatorName: creator } });
        await prisma.consent.upsert({ where: { entryId: id }, create: { entryId: id, sentAt: new Date() }, update: { sentAt: new Date() } });
        return res.json({ ok: true, messageId: (r as any)?.messageId || null, mode: 'structured' });
      }
      return res.status(400).json({ ok: false, error: 'missing_structured_params', required: ['creator','url'] });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: 'send_failed', message: e?.message || String(e) });
    }
  });

  // Utility: sleep for throttling (ms)
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  function shotIdFromUrl(u: string): string | null {
    try {
      const m = u.match(/\/shots\/(\d+)/);
      return m ? m[1] : null;
    } catch { return null; }
  }

  // POST /discover { shotUrls: string[], send?: boolean }
  app.post('/discover', async (req, res) => {
    const { shotUrls = [], send = false } = (req.body || {}) as { shotUrls?: string[]; send?: boolean };
    if (!Array.isArray(shotUrls) || shotUrls.length === 0) return res.status(400).json({ error: 'no_shot_urls' });
    const appToken = process.env.DRIBBBLE_ACCESS_TOKEN || '';
    if (!appToken) return res.status(400).json({ error: 'missing_app_token' });

    const results: any[] = [];
    for (const url of shotUrls) {
      const id = shotIdFromUrl(String(url));
      if (!id) { results.push({ url, error: 'bad_url' }); continue; }
      // Throttle ~1 req/sec to stay well under 60/min
      await sleep(1100);
      const r = await fetch(`https://api.dribbble.com/v2/shots/${id}`, { headers: { Authorization: `Bearer ${appToken}` } });
      if (!r.ok) { results.push({ url, error: `api_${r.status}` }); continue; }
      const shot: any = await r.json();
      const user = shot?.user || {};
      const entryId = user.id ? String(user.id) : id; // fallback
      await prisma.entry.upsert({
        where: { id: entryId },
        create: {
          id: entryId,
          title: shot?.title || '',
          url: shot?.html_url || url,
          creatorName: user.name || user.username || 'Unknown',
          creatorHandle: user.username ? `@${user.username}` : undefined,
          dribbbleUserId: user.id ? String(user.id) : undefined
        } as any,
        update: {
          title: shot?.title || undefined,
          url: shot?.html_url || undefined,
          creatorName: user.name || user.username || undefined,
          creatorHandle: user.username ? `@${user.username}` : undefined,
          dribbbleUserId: user.id ? String(user.id) : undefined
        } as any
      });

      // Generate consent text file
      const entryDir = path.join(process.cwd(), 'datasets', 'sources', 'dribbble', 'pilot', entryId);
      mkdirSync(entryDir, { recursive: true });
      const templatePath = path.join(process.cwd(), 'Consent_Request_Template.txt');
      const template = readFileSync(templatePath, 'utf8');
      const body = fillConsentTemplate(template, {
        creatorName: user.name || user.username || 'Creator',
        shotTitle: shot?.title || '(various shots)',
        shotUrl: user.html_url || shot?.html_url || url,
        senderName: process.env.SENDER_NAME || 'Olayinka Vaughan',
        senderRole: process.env.SENDER_ROLE || 'Student',
        senderOrg: process.env.SENDER_ORG || 'Wesleyan University',
        senderEmail: process.env.SENDER_EMAIL || 'yvaughan@wesleyan.edu'
      });
      writeFileSync(path.join(entryDir, 'consent-request.txt'), body);

      // Optionally send immediately (needs recipient email)
      if (send && process.env.SMTP_HOST) {
        try {
          const to = process.env.SMTP_BCC || process.env.SENDER_EMAIL || '';
          if (to) await sendConsentEmail(to, `Consent request: ${shot?.title || 'Dribbble shots'}`, body, entryId);
        } catch {}
      }
      results.push({ url, entryId, handle: user.username, name: user.name });
    }
    res.json({ ok: true, count: results.length, results });
  });

  function parseLinkHeader(h: string | null): Record<string, string> {
    const out: Record<string, string> = {};
    if (!h) return out;
    h.split(',').forEach(part => {
      const m = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
      if (m) out[m[2]] = m[1];
    });
    return out;
  }

  // POST /discover/tags { tags:["dashboard"], days?: number, send?: boolean, perPage?: number, maxPages?: number }
  app.post('/discover/tags', async (req, res) => {
    const { tags = [], days = 30, send = false, perPage = 100, maxPages = 10 } = (req.body || {}) as any;
    if (!Array.isArray(tags) || !tags.length) return res.status(400).json({ error: 'no_tags' });
    const appToken = process.env.DRIBBBLE_ACCESS_TOKEN || '';
    if (!appToken) return res.status(400).json({ error: 'missing_app_token' });
    const tagSet = new Set(tags.map((t: string) => String(t).toLowerCase()));
    const cutoff = Date.now() - Number(days) * 24 * 60 * 60 * 1000;

    const results: any[] = [];
    let page = 1; let pages = 0; let nextUrl: string | null = `https://api.dribbble.com/v2/shots?per_page=${Math.min(100, Number(perPage)||100)}&page=1`;
    const seenUsers = new Set<string>();
    while (nextUrl && pages < Number(maxPages)) {
      await sleep(1100);
      const r = await fetch(nextUrl, { headers: { Authorization: `Bearer ${appToken}` } });
      const link = parseLinkHeader(r.headers.get('Link'));
      nextUrl = link.next || null;
      if (!r.ok) break;
      const shots: any[] = await r.json();
      for (const shot of shots) {
        // filter by tags
        const stags: string[] = Array.isArray(shot?.tags) ? shot.tags.map((x: any)=>String(x).toLowerCase()) : [];
        const has = stags.some(t => tagSet.has(t));
        if (!has) continue;
        // filter by time
        const created = shot?.published_at ? Date.parse(shot.published_at) : Date.now();
        if (isFinite(cutoff) && created < cutoff) continue;
        const user = shot?.user || {};
        const uid = user.id ? String(user.id) : '';
        if (!uid || seenUsers.has(uid)) continue;
        seenUsers.add(uid);
        const entryId = uid;
        await prisma.entry.upsert({
          where: { id: entryId },
          create: {
            id: entryId,
            title: shot?.title || '',
            url: shot?.html_url || '',
            creatorName: user.name || user.username || 'Unknown',
            creatorHandle: user.username ? `@${user.username}` : undefined,
            dribbbleUserId: uid
          } as any,
          update: {
            creatorName: user.name || user.username || undefined,
            creatorHandle: user.username ? `@${user.username}` : undefined
          } as any
        });
        // render consent letter
        const entryDir = path.join(process.cwd(), 'datasets', 'sources', 'dribbble', 'pilot', entryId);
        mkdirSync(entryDir, { recursive: true });
        const templatePath = path.join(process.cwd(), 'Consent_Request_Template.txt');
        const template = readFileSync(templatePath, 'utf8');
        const body = fillConsentTemplate(template, {
          creatorName: user.name || user.username || 'Creator',
          shotTitle: '(multiple shots)',
          shotUrl: user.html_url || shot?.html_url || '',
          senderName: process.env.SENDER_NAME || 'Olayinka Vaughan',
          senderRole: process.env.SENDER_ROLE || 'Student',
          senderOrg: process.env.SENDER_ORG || 'Wesleyan University',
          senderEmail: process.env.SENDER_EMAIL || 'yvaughan@wesleyan.edu'
        });
        writeFileSync(path.join(entryDir, 'consent-request.txt'), body);
        if (send && process.env.SMTP_HOST) {
          try { const to = process.env.SMTP_BCC || process.env.SENDER_EMAIL || ''; if (to) await sendConsentEmail(to, 'Consent request: Dribbble shots', body, entryId); } catch {}
        }
        results.push({ entryId, handle: user.username, name: user.name });
      }
      pages++;
    }
    res.json({ ok: true, foundCreators: results.length, results, pages });
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
