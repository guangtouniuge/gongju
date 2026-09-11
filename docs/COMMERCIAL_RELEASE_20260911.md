# Commercial Entry Release - 2026-09-11

## Scope

Only `geoskill.7chacha.com` was migrated. `geo.7chacha.com` is an unrelated reference system and must not be changed.

## Live layout

- Service: `geoskill-commercial-api.service`, loopback port 8788.
- Release: `/www/wwwroot/geoskill.7chacha.com/releases/commercial-20260911`.
- Private authentication data: `/root/.geoskill/auth`.
- Private environment file: `/root/.geoskill/commercial.env`.
- Persistent jobs: `/root/.geoskill/commercial-jobs`.
- Project data: `/www/wwwroot/geoskill.7chacha.com/outputs/projects/exposure-main`.
- Initial migration backup: `/root/.geoskill/backups/commercial-1789087191`.
- Writing engine remains sealed at 6.1.0. No writing constraints or score gates were added.

## Verified

- Anonymous and forged-header API access is rejected.
- Authenticated project accounts cannot switch into another project using headers.
- Disabling an operator revokes that operator without disabling the whole project.
- Agent, project administrator, and operator boundaries were tested with isolated test accounts.
- Original one brand, 26 articles, five gallery records and one knowledge record were retained before generation testing.
- Browser login, article rendering and authenticated Word download passed.
- Full build, authentication, project isolation and writing test suites passed (24 tests).
- Authenticated live job `JOB-mtw8lcb1-6xh62` completed: technical-explanation template G, 3206 characters reported by the system, two accessible project images, saved under `exposure-main`. The response is preserved locally in `outputs/commercial-acceptance/generation.json`.

## Deployment protection

`deploy-commercial.py` is an initial migration tool, not a repeat deployment command. It now refuses to overwrite an active or existing release. `deploy-writing-release.py` is a legacy deployment tool and refuses to run while the commercial service is active.

Future updates must use a NEW release directory, build the frontend with `VITE_BASE_PATH=/`, verify the sealed writing files, and preserve private environment, account storage, project storage and job journals. Drain active jobs before switching the service and nginx root. Keep the previous release available for rollback. Never restore old project data merely to roll back code.

## Remaining launch concerns

- `gongju.7chacha.com` still targets legacy port 8787. Redirecting that old test entry is pending owner confirmation. Until closed, the legacy data exposure is not fully contained across aliases.
- Credentials exposed in earlier conversation screenshots must be rotated with their respective providers before broad commercial launch.
- This is a single-instance deployment, not a high-availability service. Backup restore and capacity testing remain necessary before promising an uptime SLA.
- Generated content quality and actual search-engine citation are distinct; test success does not guarantee model citations.
- Human reading of the live sample still found points for editorial follow-up: broad assertions about platform ranking mechanisms, a highly specific hypothetical opening, and a closing disclaimer that weakens the recommendation. Do not describe this infrastructure acceptance as a full content-quality acceptance. Address these through source-aware briefs rather than post-generation replacement.

Credentials are handed over via a private local file, never committed to this repository.
