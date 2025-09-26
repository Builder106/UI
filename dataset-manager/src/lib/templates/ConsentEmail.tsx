import * as React from 'react';
import { Html, Head, Preview, Body, Container, Section, Text, Link, Hr, Button, Row, Column } from '@react-email/components';

type Props = {
  creatorName: string;
  shotTitle: string;
  shotUrl: string;
  shotImage?: string;
  senderName: string;
  senderRole: string;
  senderOrg: string;
  senderEmail: string;
  logoSrc?: string; // optional; defaults to CID for real emails
};

export const ConsentEmail: React.FC<Props> = ({ creatorName, shotTitle, shotUrl, shotImage, senderEmail, logoSrc }) => (
  <Html>
    <Head />
    <Preview>Request to include your current Dribbble shots in a research dataset</Preview>
    <Body style={{ backgroundColor: '#f5f7fb', fontFamily: 'Arial, sans-serif', color: '#111', margin: 0 }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '24px auto', padding: 24, borderRadius: 8, maxWidth: 640 }}>
        <Section style={{ marginBottom: 8 }}>
          <table width="100%" cellPadding="0" cellSpacing="0" role="presentation" style={{ marginBottom: 8 }}>
            <tbody>
              <tr>
                <td style={{ width: 56, verticalAlign: 'middle' }}>
                  <img src={logoSrc || 'cid:weaveui-logo'} alt="WeaveUI" width="48" height="48" style={{ display: 'block' }} />
                </td>
                <td style={{ verticalAlign: 'middle' }}>
                  <Text style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>WeaveUI Consent Request</Text>
                </td>
              </tr>
            </tbody>
          </table>
          <Text style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Hi {creatorName},</Text>
          <Text style={{ lineHeight: 1.6, margin: '0 0 8px' }}>
            I’m building a research dataset to <b>train and evaluate an AI that learns accessible, high‑quality web design patterns</b>. I’m requesting permission to include <b>all of your current Dribbble shots</b> in the dataset.
          </Text>
          <Text style={{ lineHeight: 1.6, margin: 0 }}>Example shot:</Text>
          {shotImage ? (
            <a href={shotUrl} style={{ display: 'block', marginTop: 12 }}>
              <img src={shotImage} alt={shotTitle} width={560} style={{ width: '100%', maxWidth: 560, borderRadius: 12, display: 'block' }} />
            </a>
          ) : null}
          {shotImage ? (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Link href={shotUrl}>{shotTitle}</Link>
            </div>
          ) : null}
        </Section>

        <Section style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: 16, marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#1d4ed8', color: '#ffffff', textAlign: 'center', lineHeight: '22px', fontWeight: 700 }}>i</div>
            <Text style={{ fontWeight: 800, margin: 0, color: '#1d4ed8', fontSize: 18 }}>What we store</Text>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#111827' }}>
            <li>Images you published (only thumbnailing for indexing)</li>
            <li>Basic metadata (title, handle/profile link, tags)</li>
            <li>Internal labels and <em>derived features</em> (e.g., layout/components) for model training</li>
          </ul>
        </Section>

        <Row style={{ width: '100%', tableLayout: 'fixed', marginTop: 16 }}>
          <Column valign="top" style={{ width: '50%', paddingRight: 8, verticalAlign: 'top' }}>
            <Section style={{ padding: 16, backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, minHeight: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#16a34a', color: '#ffffff', textAlign: 'center', lineHeight: '22px', fontWeight: 700 }}>✓</div>
                <Text style={{ fontWeight: 800, margin: 0, color: '#166534', fontSize: 18 }}>We will</Text>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#134e4a' }}>
                <li>use your shots to train and evaluate research AI models for better web design</li>
                <li>share datasets or model checkpoints with collaborators under non‑commercial terms</li>
                <li>provide attribution by name with a link to your Dribbble profile</li>
              </ul>
            </Section>
          </Column>
          <Column valign="top" style={{ width: '50%', paddingLeft: 8, verticalAlign: 'top' }}>
            <Section style={{ padding: 16, backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, minHeight: 280 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#dc2626', color: '#ffffff', textAlign: 'center', lineHeight: '22px', fontWeight: 700 }}>✖</div>
                <Text style={{ fontWeight: 800, margin: 0, color: '#991b1b', fontSize: 18 }}>We will NOT</Text>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: '#7f1d1d' }}>
                <li>Resell, redistribute, or commercially license</li>
                <li>Remove authorship; we’ll remove upon request</li>
              </ul>
            </Section>
          </Column>
        </Row>

        <Section style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: 700, margin: '0 0 12px' }}>Quick reply</Text>
          <Row style={{ width: '100%', tableLayout: 'fixed' }}>
            <Column style={{ width: '33.33%' }}>
              <Section style={{ paddingRight: 12 }}>
                <Button
                href={`mailto:${senderEmail}?subject=${encodeURIComponent('Consent: include my Dribbble shots')}&body=${encodeURIComponent('I consent to inclusion of ALL my current Dribbble shots for non‑commercial research with attribution.')}`}
                style={{ backgroundColor: '#1d4ed8', color: '#ffffff', padding: '12px 14px', borderRadius: 6, textDecoration: 'none', display: 'block', width: '90%', margin: '0 auto', textAlign: 'center' }}>
                I consent
                </Button>
              </Section>
            </Column>
            <Column style={{ width: '33.33%' }}>
              <Section style={{ paddingLeft: 12, paddingRight: 12 }}>
                <Button
                href={`mailto:${senderEmail}?subject=${encodeURIComponent('Consent: with conditions')}&body=${encodeURIComponent('I consent with the following conditions:\n• Attribution format: \n• Excluded shots: \n• Internal‑only: yes/no\n• Thumbnails only: yes/no\n• Expiry date: \n• Removal SLA: ')}`}
                style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '12px 14px', borderRadius: 6, textDecoration: 'none', display: 'block', width: '90%', margin: '0 auto', textAlign: 'center' }}>
                Consent with conditions
                </Button>
              </Section>
            </Column>
            <Column style={{ width: '33.33%' }}>
              <Section style={{ paddingLeft: 12 }}>
                <Button
                href={`mailto:${senderEmail}?subject=${encodeURIComponent('Consent: do not include')}&body=${encodeURIComponent('I do not consent.')}`}
                style={{ backgroundColor: '#b91c1c', color: '#ffffff', padding: '12px 14px', borderRadius: 6, textDecoration: 'none', display: 'block', width: '90%', margin: '0 auto', textAlign: 'center' }}>
                I do not consent
                </Button>
              </Section>
            </Column>
          </Row>
        </Section>

        <Hr />
        <Section>
          <Text style={{ color: '#6b7280', fontSize: 12, lineHeight: 1.4, marginTop: 8 }}>
            This request covers your <b>current</b> Dribbble shots at the time of consent. You may revoke consent at any time; we will remove your content promptly upon request.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default ConsentEmail;