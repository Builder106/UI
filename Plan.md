## AI UI/UX Generator – Planning and TDD Roadmap

### Scope (v1)
- **Inputs**: natural-language prompt (+ optional brand tokens: colors, font, logo) + code.
- **Outputs**: default → framework-neutral JSON IR (versioned) + W3C Design Tokens + Web Components bundle; optional on-demand exports → React/Vue/Svelte/Angular code and Figma JSON.
- **Complexity**: responsive single page with header/nav, hero, grid/list, CTA, footer; AA color contrast; keyboard nav.

### IR schema (v0)
- **Core nodes**: `Page`, `Section`, `Stack` (v/h), `Grid`, `Text`, `Image`, `Button`, `Input`, `Form`, `Nav`, `Card`.
- **Common props**: `id`, `role`, `children`, `layout` (flex/grid with constraints), `style` (design tokens), `actions` (onClick/route), `aria`.
- **Design tokens**: `color.primary/fg/bg`, `spacing.scale`, `radius`, `shadow`, `font.family/scale`.
- **Constraints**: min/max width, breakpoints, alignment, gap.

- **Accessibility additions (plain-English intent)**
  - Landmark roles: mark main areas (navigation, main content) so screen readers can jump there easily.
  - Accessible names/descriptions: give controls clear text labels (`aria-label`, `aria-describedby`) so their purpose is obvious.
  - Focus order: make keyboard tabbing move in a logical order through the page.
  - Keyboard behaviors: define how keys like Enter, Escape, and Arrow keys work on menus, dialogs, and lists.
  - Skip links: add a “skip to main content” link to bypass repeated navigation.

- **Internationalization additions (plain-English intent)**
  - Language attribute: tell the page’s language (e.g., `en`, `es`) so pronunciation and tools work correctly.
  - Text direction: set left-to-right or right-to-left (`dir`) so layouts read properly in languages like Arabic or Hebrew.
  - Locale formats: format dates, numbers, and currencies based on the user’s region.
  - Character encoding: use UTF-8 so all characters (including non‑Latin) display correctly.
  - Translatable strings: keep text separate from code with keys so it’s easy to translate.

#### Example (component IR schema with a11y and i18n)
See `ir-schema.v0.json` at the project root for the full JSON Schema example.

### Datasets and collection
#### Goals & scope
- Target 50k–200k high-quality pages/components with paired assets: screenshot, HTML/CSS/JS, computed styles, accessibility tree, bounding boxes, extracted IR, and prompt text.
- Cover common patterns (landing, dashboard, forms, tables, cards, nav, auth) across device sizes and themes (light/dark/high-contrast).

#### Sources
- Public datasets: RICO (mobile UI structure), WebUI/WaveUI-25k (web UIs), PubLayNet (layout primitives) as auxiliary.
- Own crawl (ethical): seed from open-source sites, design galleries with permissive terms, docs, and template libraries.
- Synthetic: procedurally generated layouts + tokens to balance underrepresented patterns and accessibility edge cases.

#### Compliance & governance
- Robots/ToS-aware crawling; maintain allow/deny lists; respect rate limits and geo/regulatory constraints.
- Store provenance (URL, timestamp, license/ToS summary, capture method) per sample.
- PII/content safety filters; exclude login-gated/private content; honor takedown requests.

#### Capture pipeline
- Headless browser (Puppeteer/Playwright):
  - Assets: full-page screenshot (@1x/@2x), viewport variants (sm/md/lg), network HAR, HTML, CSS, JS entrypoints.
  - Computed data: CSSOM, computed styles per node, DOM tree with roles, accessibility tree, element bounding boxes.
  - Rendering states: default, :hover, :focus-visible, reduced-motion; dark/light prefers-color-scheme.
- Normalization: strip dynamic PII, inline critical CSS where needed, canonicalize colors to tokens when possible.

#### IR extraction & prompt pairing
- Heuristics: map semantic tags/roles/landmarks to IR nodes; infer stacks/grids from computed layout.
- NLP prompts: synthesize concise prompts from detected patterns (e.g., “Minimalist SaaS landing with blue primary, hero + 3-card grid, CTA”).
- Human-in-the-loop: reviewers adjust IR and prompts for 5–10k gold samples; use as calibration set.

#### Annotation strategy
- Auto-label first pass (roles, components, lists/forms, alt text presence); GPT-assisted for ambiguous cases.
- Label specs: component types, variants, interactions, a11y attributes (names, describedBy), data bindings (if visible), responsive visibility.
- Tooling: web annotator with overlay of boxes/roles; hotkeys for common nodes; validation against JSON Schema.

#### Quality assurance
- Automated checks: JSON Schema validation; unique ids; accessible names for interactive controls; color-contrast via sampled colors; tab order sanity.
- Visual/layer checks: overlap/occlusion detection; font scaling; responsive diffs across breakpoints.
- Manual QA: spot-check 5–10% per batch; double-review for new domains; escalation for low-agreement items.

#### Splits & versioning
- Cold splits by domain and component family to avoid leakage: train (70%), val (15%), test (15%).
- Version datasets as Dv0, Dv1… with changelogs; keep immutable manifests of sample IDs and provenance.

#### Storage & access
- Artifacts: store in object storage (S3/MinIO) by content-address (SHA256); metadata in Postgres.
- Formats: WebDataset/Parquet shards for scale; small JSON files for examples; gzip where appropriate.
- Access: read-only signed URLs; iterator APIs for training and evaluation.

#### Metrics & acceptance
- Coverage: % of patterns/components/themes represented; long-tail counts.
- Accessibility: % samples with 0 axe-core violations; color-contrast pass rate; presence of skip links/landmarks.
- IR fidelity: tree-edit distance between extracted IR and human-corrected IR (gold) — target ≤ 0.15 median.
- Prompt alignment: rule-based score match between prompt tokens and IR/tokens — target ≥ 0.9 on gold set.
- Data quality: schema validation pass ≥ 99.5%; manual QA agreement ≥ 0.9 Cohen’s kappa on reviewed subset.

#### Milestones
- Dv0 (pilot, 5k): pipeline proven end-to-end; QA dashboard; metrics baseline.
- Dv1 (50k): balanced coverage across patterns/themes/devices; ≥99.5% schema pass; ≥90% a11y pass.
- Dv2 (200k): add synthetic cases and complex forms/tables; improve IR fidelity and prompt alignment by ≥15% over Dv1.

### Model architecture (phased)
- **Phase A (baseline, deterministic)**: Rule-based text-to-IR with prompt parser + layout heuristics; IR-to-React templater. Fast TDD loop.
- **Phase B (learning step 1)**: LLM fine-tune for text-to-IR (instruction-tuned on prompt↔IR pairs).
- **Phase C (learning step 2)**: IR-to-code generator (encoder-decoder; verify with compile/render and lint checks in-loop).
- **Phase D (refinement)**: Accessibility & responsive critics; self-play to fix violations (contrast, focus order).
- **Optional**: Image rendering head for previews; Figma export mapping.

### TDD test plan and metrics
- **Unit (IR validation)**: schema validation; layout constraints; token resolution.
- **Unit (IR→React)**: generates semantic tags/roles; passes `eslint` and `tsc`; no duplicate IDs; deterministic snapshots.
- **Unit (text→IR)**: prompt fixtures produce constrained IR (node types, token usage, role coverage).
- **Integration (render)**: Playwright axe-core: WCAG 2.1 AA, tab order, focus visible, skip links; responsiveness at sm/md/lg breakpoints.
- **Quality metrics**:
  - Accessibility: axe violations = 0; color contrast ≥ AA.
  - Code: `tsc` 0 errors; `eslint` 0 errors; bundle size thresholds.
  - Prompt alignment: rule-based checks (e.g., “dark theme” → bg token dark).
  - Visual: percy-like snapshot diffs (< 1% changed pixels across deterministic runs).

### Tech stack
- **Training**: Python, PyTorch, Lightning; Datasets with WebDataset; tokenizers; Weights & Biases.
- **Serving**: FastAPI or Triton Inference Server (for learned models); gRPC/HTTP bridge to Node.
- **App**: TypeScript, Next.js, React, Tailwind or vanilla-extract; Vitest, Playwright + axe.
- **Tooling**: Zod for IR schema; ESLint/Prettier; Docker; Makefile or Justfile.

### Deployment (cloud and self-host)
- **Cloud (GPU)**: GCP Vertex AI or AWS Sagemaker for model; Cloud Run/ECS for app; managed Postgres; GCS/S3 for dataset/artifacts.
- **Self-host**: Docker Compose or k8s manifests; vLLM/TGI for LLM serving; local Postgres/MinIO; optional GPU via local CUDA host.
- **Artifacts**: versioned IR schemas, model weights, and codegen templates in OCI registry.

### Milestones with acceptance criteria
- **M0: Planning complete**
  - IR v0 spec approved; test matrix defined.
- **M1: Baseline deterministic system**
  - Text→IR rules; IR→React templates; all unit tests pass; axe violations=0; responsive checks pass.
- **M2: Data pipeline v1**
  - Crawler + extractor; 50k pages processed; 5k high-quality labeled pairs; data QA reports.
- **M3: Text→IR LLM**
  - Fine-tuned model beats baseline on prompt alignment by ≥20%; passes unit/integration tests.
- **M4: IR→Code model**
  - Learned codegen compiles, lints, and matches snapshots ≥95% vs baseline; latency SLA met.
- **M5: Preview & exports**
  - Live preview; Figma JSON export for subset; CI/CD green.
- **M6: Deploy**
  - Cloud and self-host one-liners; observability dashboards; rollback plan.

### Immediate next choices (need your input)
- **Design tokens default**: Tailwind-like vs minimal custom set?
- **CSS strategy**: Tailwind vs vanilla-extract vs CSS Modules?
- **Self-host target**: Docker Compose or k8s first?
- **LLM base**: Llama 3.1 8B/70B vs Mistral; license constraints matter.

### Next steps (TDD sequence)
1) Finalize IR v0 and write schema tests.
2) Implement deterministic text→IR rules to satisfy tests.
3) Implement IR→React templater with accessibility-first unit tests.
4) Add Playwright + axe integration tests for responsiveness and WCAG AA.
5) Stand up data pipeline and begin prompt↔IR pair curation.


