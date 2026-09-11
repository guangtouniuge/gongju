# Frontend Production Cleanup - 2026-09-11

## Deployed changes

- Removed frontend title rewrite formulas and the fixed 100-title/scene seed library. Queue entries now carry writing selections and materials, leaving editorial topics and final titles to the existing API workflow.
- Keyword normalization now only splits, trims and deduplicates entries. Customer questions about price, cost, franchises and definitions are no longer silently dropped.
- Removed frontend expansion fallback that inserted GEO services and Xi'an districts into arbitrary projects. Failed or empty API expansion preserves current input and displays a failure message; manual entry remains available.
- Removed the unused GraphicWorkbench page and unused similarity-gate helpers. Existing article reading, editing, gallery handling and downloads remain unchanged.
- Did not rewrite historical articles, alter the sealed writing engine, or add article scoring gates.

## Verification

- 26 automated tests passed, including new frontend production regressions.
- Production browser login, article rendering and authenticated Word download passed after deployment.
- Production anonymous access and cross-account isolation checks passed.
- UI release: `/www/wwwroot/geoskill.7chacha.com/releases/ui-cleanup-1789093149`.
- Previous nginx configuration is retained in that release directory as `nginx-before.conf`.
- The API service was not restarted. Its release, persistent jobs and project records were not replaced.

## Remaining scope

This is a bounded frontend cleanup, not certification that the entire application is ready for unrestricted commercial traffic. Backend keyword expansion, remaining historical helper code, operational backup restoration, capacity and provider credential rotation still require separate verification. No paid generation test was launched in this cleanup round; article-quality conclusions must not be inferred from browser regression tests.
