# Batch Topic Briefs and Article Formatting

Verified: 2026-09-11. Target: geoskill.7chacha.com only.

## Production

- Existing twelve template bodies unchanged.
- Job creation first prepares independent topic briefs in groups of up to eight. Each assignment retains its selected type and scene mode.
- Briefs specify a concrete reader situation, central question, pain analysis, comparison focus, recommendation direction, source-material focus and question topics.
- Each article is still one whole-article API call. There is no post-generation rewriting or quality-score gate.
- Briefs are stored as `editorialBrief` with completed articles; subsequent jobs receive up to 100 recent same-project briefs/titles.
- Older articles have titles only; historical body topics are not retrospectively extracted.
- JSON/count checks validate API transport completeness, not writing quality.

## Formatting

- Marked parses headings, emphasis, lists, tables and images.
- DOMPurify sanitizes browser HTML; sanitize-html sanitizes Word HTML.
- Original stored Markdown is retained. Viewing and Word export render it as document formatting, including existing articles.
- Literal content such as C# remains intact. Markdown export/source editing can still contain Markdown notation by design.

## Verification

- Automated build, account/isolation/browser regression tests and nine editor/format tests passed.
- Real model testing: two rounds of three same-type articles. Round one still had generic overlap in the broad enterprise-size topic. Revised topic planning to anchor each brief in a concrete business decision and develop its causes and consequences.
- Round two differentiated multi-city chain businesses, industrial product decision questions, and travel/cultural purchase decisions. No generated text was rewritten.
- Production job JOB-mtw4um6d-w0x0l completed two articles, 5109 and 4379 Chinese characters as reported by the system. Both saved their briefs.
- Browser inspected existing and new articles; headings/emphasis rendered, no raw heading/emphasis markers, no page errors. Single and batch Word downloads checked.
- Added Chinese emphasis parsing for paired bold markers around parenthesized company names, which standard CommonMark punctuation handling left visible. Retested two-article Word download after deployment.
- Files: outputs/api-tests/batch-topics-final and outputs/api-tests/batch-topics-online.

## Deployment

Production predates the local account migration. The compatibility bridge copies only generation and formatting updates, preserving live account/storage routes. Server restart uses the verified geo-content-api.service unit. No old-system site or publishing endpoints were changed.

Backup: /tmp/geoskill-before-batch-topics-v4.tgz. Source and dist deployed; backend dependencies marked 18.0.12 and sanitize-html 2.17.7 installed.

## Remaining Limits

This test is not proof of zero semantic overlap at arbitrary batch sizes. Shared brand facts and ranking structure intentionally repeat. Title phrasing is still similar; this release targets substantive topic/pain diversity, not a new title-formula layer. Concurrent jobs may plan from the same historical snapshot; reservations across running jobs are not implemented.
