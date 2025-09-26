import { describe, it, expect, beforeAll } from 'vitest';
import { render } from '@react-email/render';
import React, { createElement } from 'react';
import ConsentEmail from '../src/lib/templates/ConsentEmail';

describe('ConsentEmail render', () => {
  beforeAll(() => {
    process.env.PUBLIC_BASE_URL = 'https://example.com';
  });

  it('includes approve/decline links when provided', async () => {
    const html = await render(createElement(ConsentEmail as any, {
      creatorName: 'Creator',
      shotTitle: 'Shot',
      shotUrl: 'https://dribbble.com/shots/1',
      senderName: 'WeaveUI',
      senderRole: 'Student',
      senderOrg: 'Wesleyan',
      senderEmail: 'sender@example.com',
      approveUrl: 'https://example.com/consent/approve?token=t',
      declineUrl: 'https://example.com/consent/decline?token=t',
      pageUrl: 'https://example.com/consent/t',
      logoSrc: '/weaveui_logo_icon.png'
    }));
    expect(html).toContain('/consent/approve');
    expect(html).toContain('/consent/decline');
  });
});


