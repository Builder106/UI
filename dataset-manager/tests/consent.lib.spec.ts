import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fillConsentTemplate } from '../src/lib/consent';

describe('consent template fill', () => {
  it('fills placeholders with provided data', () => {
    const template = readFileSync(path.join(process.cwd(), 'Consent_Request_Template.txt'), 'utf8');
    const email = fillConsentTemplate(template, {
      creatorName: 'Jane Doe',
      shotTitle: 'SaaS Landing',
      shotUrl: 'https://dribbble.com/shots/123',
      senderName: 'Olayinka Vaughan',
      senderRole: 'Student',
      senderOrg: 'Wesleyan University',
      senderEmail: 'yvaughan@wesleyan.edu'
    });
    expect(email).toContain('Hi Jane Doe');
    expect(email).toContain('Title: SaaS Landing');
    expect(email).toContain('URL: https://dribbble.com/shots/123');
    expect(email).toContain('Olayinka Vaughan');
  });
});


