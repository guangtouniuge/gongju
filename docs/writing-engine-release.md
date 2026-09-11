# Writing Engine 6.0.3

## Production Contract

Project materials -> batch topic briefs -> one selected skill template per article -> one whole-article API call -> original article -> HTML/Word rendering.

The brief connects the reader problem, selection criterion and factual recommendation basis. Short paragraphs continue one argument. Each of the twelve templates retains its own progression. This is writing guidance, not a post-generation score gate or a rewriting pass.

Version 6.0.3 specifically clarifies Template A: opening answer -> connected pain analysis -> derived standards -> concise provider overview -> all providers analysed in the same order -> remaining FAQ -> synthesis. Verification belongs with the supporting provider or question, not a separate repetitive brand chapter. Version 6.0.2's other eleven templates are unchanged.

Only explicit project fields enter the planner and writer. Arbitrary legacy project prompts are not forwarded. Source materials are treated as evidence, not instructions. Completed articles store the brief, engine version, manifest digest, template, model name, date and prompt hash.

## Sealed Files

`server/writing-release.json` hashes the production modules and bundled skill references. Line endings are normalized for Windows/Linux. Startup verifies the seal before accepting generation. A changed file requires a new release version, regression tests and deliberate resealing. This detects accidental edits; it is not a security signature against a malicious administrator.

Do not reseal as part of normal startup or deployment. Do not edit the installed package in place. Keep experiment copies separate. The standalone personal niuge-geo-skill remains unchanged.

## Release Procedure

1. Modify the production source in a development branch.
2. Seal explicitly with `node scripts/seal-writing-release.mjs NEW_VERSION`.
3. Run `npm test`, including all twelve routing, material isolation, raw-output preservation, failure handling and tamper tests.
4. Run actual API samples with `GEO_TEST_ALL_TYPES=1` and `scripts/test-batch-editor-live.mjs`. Read articles for continuity, recommendation and scene fit; transport tests do not establish quality parity.
5. Build the legacy-compatible bridge for the current geoskill installation. Never deploy the canonical account-migration server over the older live account/storage routes.
6. Back up the live server before installing. Validate the seal before restart, then test a real batch and article download. Roll back on a failed deployment.

## Scope And Limits

The `writing-engine-VERSION.zip` is a reusable writing component, not a complete website installation. Extract it and run `npm install`, `npm test`, and `npm run verify`. Production modules themselves use Node built-ins; the dependencies are for article formatting. Import `runWritingEngine` from `server/writing-engine.mjs` and supply `payload` plus `{callModel, date, model}`. The model adapter accepts `(messages, temperature, responseFormat)` and returns `{ok, content, raw}`; `content` is the JSON title/body and `raw` retains API completion status. The host owns authentication, project storage, jobs and API credentials.

The separate `geoskill-writing-VERSION.tgz` is the exact compatible live-server update, including its existing server integration. Install only on the matching geoskill installation, using the repository deployment script and backup procedure. Neither archive is an account-system migration.

The archive contains no credentials, project database, private brand documents or generated customer articles. Model output remains probabilistic. Pinning these files does not pin a provider's remotely updated model. A score is not evidence of actual search-engine citation.

Concurrent batches may plan before another batch finishes; completed-article history alone is not a persistent cross-process topic reservation. Do not describe that as solved. Process restarts still require operational coordination with running jobs. This release isolates the writing engine; it does not replace the site's account, publishing or storage system.
