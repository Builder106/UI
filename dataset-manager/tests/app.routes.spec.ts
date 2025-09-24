import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { buildAuthorizeUrl } from '../src/lib/oauth';

function createApp() {
  const app = express();
  app.get('/oauth/start', (req, res) => {
    const clientId = 'test-id';
    const redirectUri = 'https://example.com';
    const state = 'state123';
    const url = buildAuthorizeUrl({ clientId, redirectUri, state, scope: 'public' });
    res.status(302).set('Location', url).end();
  });
  app.get('/consent/prepare', (req, res) => {
    const { id, title, url, creator } = req.query as any;
    if (!id || !title || !url || !creator) return res.status(400).json({ error: 'missing' });
    res.json({ ok: true, id });
  });
  return app;
}

describe('routes', () => {
  const app = createApp();
  it('redirects to dribbble authorize on /oauth/start', async () => {
    const r = await request(app).get('/oauth/start');
    expect(r.status).toBe(302);
    expect(r.headers.location).toContain('https://dribbble.com/oauth/authorize');
  });
  it('validates params on /consent/prepare', async () => {
    const bad = await request(app).get('/consent/prepare');
    expect(bad.status).toBe(400);
    const ok = await request(app)
      .get('/consent/prepare')
      .query({ id: '001', title: 'Shot', url: 'https://dribbble.com/shots/x', creator: 'Jane' });
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
  });
});


