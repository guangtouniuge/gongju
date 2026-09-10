# Skill API production v3

## Production entry

`server/skill-editor.mjs` reads the bundled `server/skills/niuge-geo-skill` references. Each request selects exactly one A-L template, combines it with current-project source materials, and writes one complete article through the configured API. All types retain a recommendation for the selected project.

The six-part generation path, prose replacement functions, and title rewriting functions are no longer used by this entry. JSON title/body transport preserves Markdown headings and model prose. Image insertion remains a separate deterministic step after writing, within the existing article endpoint.

Selection behavior: one type repeats that type; multiple types rotate; empty selection rotates all twelve. Industry mode derives questions from the project's service. Application mode derives a customer industry from the project's actual scope. Non-GEO projects translate the template's GEO service examples into their own service methods.

## Verification, 2026-09-11

- Twelve individual API drafts generated with DeepSeek.
- A complete twelve-article background job generated and persisted all twelve types, without content repair calls.
- Final batch lengths: A 5149, B 3946, C 3651, D 4939, E 3437, F 3781, G 4816, H 5054, I 4006, J 4001, K 5185, L 3575 Chinese characters.
- Generic consultation fixtures tested own-industry selection and an automatically chosen manufacturing scenario. The first attempt exposed a GEO-business leak in template K; the domain interpretation was fixed and rerun. Final lengths: 4217 and 3154 characters.
- Online generation after deployment: ranking 4586 characters, technical explanation 4206 characters; both returned separate titles and bodies with current month.
- Build, account tests, project isolation, browser article editing/image/download tests, and template-routing/output-preservation tests passed.

Samples and job logs are under `outputs/api-tests/skill-isolated-final`, `skill-generic-check`, and `skill-online-final`. These are engineering tests, not measured AI citation rates or independently verified provider rankings. Generic consultation samples use explicitly simulated project materials.

## Live compatibility release

The live installation predates the account migration in the main checkout. `scripts/build-live-skill-bridge.mjs` copies only the new writing entry, batch plan entry, and model transport into its existing server source. `scripts/build-live-skill-ui.mjs` updates its existing task controls and removes title/material rewriting while preserving its current data/login behavior.

The release includes the bundled references; it does not depend on a developer's personal skill directory. Live model configuration was aligned to `deepseek-chat`. Existing server and UI were backed up before replacement. The old `geo.7chacha.com` application was not modified.
