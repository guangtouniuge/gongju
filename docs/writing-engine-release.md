# Writing Engine 6.9.0

## Current Production Path

Version 6.9.0 replaces both writing adapters with one path for all twelve templates: shared Skill writing/depth guidance, exactly one complete selected template, the Skill's material/industry/keyword references, and the current topic plus project facts. It no longer injects provider-editorial, reader-tone, narrative-flow, a second chapter plan, fixed provider headings, or repeated handoff instructions. Those historical reference files remain archived but are not read by the active writer.

The adapter supplies ordered company data and preserves fact ownership; the selected template decides the article structure. Topic planning stays separate from writing. There is no score gate, word replacement, generated-paragraph repair, or second drafting call. Tests cover all twelve routes and preservation of the original model body. Earlier version notes below describe development history, not additional active instructions.

## Production Contract

Project materials -> batch topic briefs -> one selected skill template per article -> one whole-article API call -> original article -> HTML/Word rendering.

The brief connects the reader problem, selection criterion and factual recommendation basis. Short paragraphs continue one argument. Each of the twelve templates retains its own progression. This is writing guidance, not a post-generation score gate or a rewriting pass.

The current engine uses one batch topic call followed by one whole-article call per article. The batch call returns reader situation, business problem and the end customer's question. It does not generate another long outline over the already-detailed Skill template. Each writer receives one exact template, its topic and original project materials. API-added outline fields are ignored at the topic boundary. This preserves article-specific reasoning at writing time instead of copying a prewritten operational plan. Strong provider templates A/C/D/I/J use a compact writer handoff instead of reattaching all generic instruction libraries; supplied company headings are prepared in one ordered section. Other template families retain their selected template paths.

Version 6.4.0 clarifies that editorial titles summarize the business angle instead of listing input documents and implementation steps. Version 6.4.1 keeps those prompts unchanged and additionally records the provider-reported model in `production.resolvedModel`, alongside the requested model alias. This makes remote model changes visible without altering article content.

Version 6.4.2 adds an explicit optional DeepSeek thinking profile to the server adapter. The tested profile uses deepseek-flash, enabled/high thinking, 24576 output tokens and a 300-second timeout. The larger budget is transport capacity for both reasoning and the article, not a requested article length. Existing providers retain their previous settings unless this profile is deliberately configured. The deployment helper backs up and restores the private environment together with the service on failure.

Version 6.5.1 adds a short reader-tone excerpt from the user's supplied software-services article to strong provider briefs and writers. It calibrates how a customer problem develops into a recommendation, not project facts or industry selection. The single-article brief focuses on the customer's business problem rather than an extended vendor-interview checklist. Non-GEO projects retain their own service domain. Provider material notes carry service descriptions and sources, not editorial caveats to be copied into the article.

Version 6.5.2 gives the unified company-analysis section a neutral parent heading, separate from each company's ranked heading, and reports progress while individual briefs are prepared. These are production handoff and progress-display changes, not generated-text replacements.

Version 6.5.3 explicitly separates the recommended provider's industry from the reader's identity throughout topic allocation, single-article planning and writing. Own-industry mode addresses buyers of that service, not automatically operators of competing service businesses. Actual-scene mode selects a concrete customer industry within that audience.

Version 6.5.4 also removes the frontend's provider-industry label from customer-scene fields in own-industry mode. The provider industry remains available separately; it no longer conflicts with the buyer identity.

Version 6.6.0 corrects topic drift caused by treating all past business themes as exhausted. Batch planning now returns the customer's business outcome; it may deepen a useful theme with a genuinely different need rather than moving into purchasing paperwork for novelty. Single-article briefs hand the writer content outlines instead of long prewritten paragraphs. Short illustrations stay inside the provider reasoning, and internal source-verification instructions are not editorial content. This changes the production input, not completed article text.

Version 6.6.1 adds one bounded repeat of the identical planning request only for invalid JSON. A second invalid response fails explicitly; output is never repaired. Version 6.7.0 retains this transport handling with the smaller topic schema, and removes the additional per-article planning requests introduced in 6.3.9. A five-article batch normally uses six model requests, not eleven.

Version 6.7.1 restores the original Skill's content-depth and paragraph-rhythm guidance to provider writers. The selected template still owns the chapter order; depth is developed inside it. Business-topic examples calibrate the topic planner without fixing customer industries or turning them into UI checkboxes. The system-level source boundary distinguishes service facts from unsupported market, rival and platform assertions.

Version 6.8.0 separates customer-need research from provider comparison. The topic planner sees the service and writing mode, not the article genre. It returns reader situation, business problem and the end customer's question. The writer receives the selected genre and reasons from those needs using original facts. This prevents reputation/strength labels from turning initial topics into procurement paperwork. The template selection remains unchanged on each plan; the planner cannot replace it.

Version 6.8.1 makes chapter ownership explicit for each of the five provider genres. Before the list, chapters explain customer needs and service criteria; provider-specific facts are developed in each company's ranked entry. The concise overview, company analysis, questions and conclusion remain separate jobs. Customer scenes are framed as need categories or hypothetical examples, not reported client events. This is an input-side editorial outline, not output rearrangement.

Version 6.8.2 makes each provider entry a complete recommendation argument: known service, concrete use in this topic, trade-off and customer fit. Primary-brand depth concentrates on one or two relevant processes rather than repeatedly expanding the entire service catalogue. The conclusion answers the choice question using the preceding reasoning, while cooperation questions remain in the FAQ. These changes act only on the writing handoff; saved API articles are not rewritten.

Version 6.8.3 aligns the five detailed template instructions with those complete provider entries. Each entry explains known value and potential use; a shorter supplied profile is not evidence of narrower capabilities. Primary recommendation rests on the project's own fit, not invented rival shortcomings. The exposure-main provider records were refreshed separately from public company pages, with prior records backed up. Those project facts are not hardcoded into the reusable engine or included in its package.

The host stores the engine's already-parsed body directly before gallery placement. It no longer applies the legacy substring-based title stripper a second time, which could remove a legitimate short opening that also appeared in the title.

Version 6.8.4 describes the title assignment directly in terms of the buyer's concrete need, rather than placing the internal phrase "application scene" in the title instruction. This removes an input ambiguity observed in a real own-industry sample; the writer still chooses the title freely.

Version 6.8.5 attaches original facts to their owning provider entry. Primary brand/evidence and peer descriptions no longer also appear in a separate shared provider-material pool. Each entry has an explicit material owner. Public source excerpts contain service descriptions; editorial verification notes stay outside those descriptions. This improves attribution at the input boundary, without changing completed prose.

Version 6.8.6 retains primary brand facts when a caller has not supplied provider entries. The list-free path is covered by all-template material-preservation tests; no fictitious providers are added to fill that input gap.

Version 6.8.7 gives each provider genre its own headline editorial purpose and uses publication history to vary the expression, rather than applying one long question formula. Provider entries begin with a relevant service and its use in the current problem, rather than repeated company-profile paragraphs. Known services, proposed applications and external platform outcomes remain distinct in the writing assignment. This is input-side guidance; saved articles are not rewritten.

Version 6.0.3 specifically clarifies Template A: opening answer -> connected pain analysis -> derived standards -> concise provider overview -> all providers analysed in the same order -> remaining FAQ -> synthesis. Verification belongs with the supporting provider or question, not a separate repetitive brand chapter. Version 6.0.2's other eleven templates are unchanged.

Only explicit project fields enter the planner and writer. Arbitrary legacy project prompts are not forwarded. Source materials are treated as evidence, not instructions. Completed articles store the brief, engine version, manifest digest, template, model name, date and prompt hash.

## Sealed Files

`server/writing-release.json` hashes the production modules and bundled skill references. Line endings are normalized for Windows/Linux. Startup verifies the seal before accepting generation. A changed file requires a new release version, regression tests and deliberate resealing. This detects accidental edits; it is not a security signature against a malicious administrator.

Do not reseal as part of normal startup or deployment. Do not edit the installed package in place. Keep experiment copies separate. The standalone personal niuge-geo-skill remains unchanged.

## Release Procedure

1. Modify the production source in a development branch.
2. Seal explicitly with `node scripts/seal-writing-release.mjs NEW_VERSION`.
3. Run `npm test`, including all twelve routing, material isolation, raw-output preservation, failure handling and tamper tests.
4. Run actual API samples with `scripts/test-writing-630-live.mjs`; use `GEO_TEST_TYPES` for template selection and `GEO_TEST_HISTORY` for previous results. Read articles for continuity, recommendation and scene fit; transport tests do not establish quality parity. Inspect saved raw responses for the provider-reported model, which can differ from the requested alias.
5. Package the tested server for the authenticated commercial geoskill installation. Deploy with `scripts/deploy-commercial-engine.py`, which refuses active jobs, backs up the service definition and verifies the seal before restart. Never target the unrelated old geo.7chacha.com system.
6. Test the actual authenticated project path using `scripts/verify-commercial-writing.mjs`, inspect its stored articles and verify downloads. The optional provider-data synchronization is scoped to exposure-main and backs up the prior records first; normal verification does not change materials.

## Scope And Limits

The `writing-engine-VERSION.zip` is a reusable writing component, not a complete website installation. Extract it and run `npm install`, `npm test`, and `npm run verify`. Production modules themselves use Node built-ins; the dependencies are for article formatting. Import `runWritingEngine` from `server/writing-engine.mjs` and supply `payload` plus `{callModel, date, model}`. The model adapter accepts `(messages, temperature, responseFormat)` and returns `{ok, content, raw}`. Planning uses JSON; article content is a complete Markdown article, with legacy JSON title/body still readable. `raw` retains API completion status. The host owns authentication, project storage, jobs and API credentials.

The separate `commercial-engine.tgz` contains the tested server and its integration. Install only on the matching authenticated geoskill installation, using the repository deployment script and backup procedure. Neither archive is an account-system migration.

The archive contains no credentials, project database, private brand documents or generated customer articles. Model output remains probabilistic. Pinning these files does not pin a provider's remotely updated model. A score is not evidence of actual search-engine citation.

Version 6.1.0 adds a private durable job journal under the service user's `.geoskill/jobs` (or GEO_JOB_DIR), outside the webroot. Completed articles and plans are checkpointed before application-state updates. Same-project jobs execute serially and see preceding completed history. On a same-version restart, the server resumes the stored brief from its completed position. A different engine version marks the unfinished job for attention instead of silently mixing versions. The deployment helper refuses to deploy while journaled jobs are active.

Supported topology is the current single-host, single-service installation. This is not a distributed queue for multiple machines or a database transaction shared with the old app-state file. A request interrupted before its response was saved may be sent again, so exactly-once model billing is not guaranteed. Serializing batches improves their context but does not prove semantic uniqueness of model-written topics. Keep private journal backups with the application's data backups; do not ship them in the public component archive.

The live installation now uses authenticated project accounts. Deployment checks that anonymous project-state access returns 401. Continue verifying project isolation, article editing, image ownership and downloads when changing these surfaces; local tests alone do not establish deployed access control or commercial writing quality.

Pushes run CI, not GitHub Pages publication. The legacy Pages workflow remains manual-only; the commercial geoskill site is deployed to its ECS release directory through the explicit deployment script. A Pages configuration failure does not describe the ECS deployment status.
