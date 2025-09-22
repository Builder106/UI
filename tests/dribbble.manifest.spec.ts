import { describe, it, expect } from 'vitest';
import { readFileSync, readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function loadJson(p: string) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

describe('Dribbble manifest schema v0', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  const schemaPath = path.join(root, 'schemas', 'dribbble.manifest.v0.json');
  const schema = loadJson(schemaPath);
  const validate = ajv.compile(schema);

  const indexPath = path.join(root, 'datasets', 'sources', 'dribbble', 'pilot', 'index.jsonl');
  const lines = readFileSync(indexPath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const { manifest } = JSON.parse(line);
    const manifestPath = path.join(root, manifest);
    it(`validates ${manifest}`, () => {
      const data = loadJson(manifestPath);
      const ok = validate(data);
      if (!ok) {
        // eslint-disable-next-line no-console
        console.error(validate.errors);
      }
      expect(ok).toBe(true);
    });
  }
});


