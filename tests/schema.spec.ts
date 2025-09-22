import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(projectRoot, 'ir-schema.v0.json');

function loadJson(p: string) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

describe('IR schema v0 examples', () => {
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  const schema = loadJson(schemaPath);
  const validate = ajv.compile(schema);

  const exampleFiles = [
    path.join(projectRoot, 'examples', 'page.v0.json'),
    path.join(projectRoot, 'examples', 'form.v0.json'),
    path.join(projectRoot, 'examples', 'card.v0.json')
  ];

  for (const file of exampleFiles) {
    it(`validates ${path.basename(file)} against ir-schema.v0.json`, () => {
      const data = loadJson(file);
      const ok = validate(data);
      if (!ok) {
        const errors = (validate.errors || []).map(e => `${e.instancePath} ${e.message}`).join('\n');
        console.error(errors);
      }
      expect(ok).toBe(true);
    });
  }
});


