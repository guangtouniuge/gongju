# Skill editorial parity follow-up

Date: 2026-09-11. Deployment target: geoskill.7chacha.com.

## Findings

The API writer received a selected template section but omitted the shared paragraphs preceding Template Families. These included paragraph tasking and depth guidance. Merely testing that twelve template sections were individually selectable did not cover this omission.

Material examples repeatedly modelled tentative comparison wording. Template A required selection-reference language in several places, while headline instructions lacked a distinction between reader intent and the closing scope notice. This is a likely prompt-level contributor to recurring "选型参考" title suffixes, not evidence that an output filter inserted them.

Soft-list templates B/E/K did not receive provided competitor facts even though the skill allowed them to use those materials when useful.

## Changes

- Load shared template writing guidance alongside exactly one selected template.
- Separate headline intent, reasoned recommendation and closing scope notice.
- Replace the tentative material example with a concrete customer/problem/capability recommendation, explicitly treating the example as illustrative rather than project facts.
- Keep the scope notice brief, immediately before the list and after the conclusion; do not expand it into a separate explanatory chapter.
- Pass optional provider materials to B/E/K without forcing them into ranking format.
- Clarify that planning scenarios are hypothetical, not reported customer events.
- Preserve raw API article output; no title replacements or score gating added.

## Tests

All twelve routing tests now assert shared paragraph guidance is present. Soft-list material routing is covered. Existing body-preservation tests still pass.

Three direct-model articles and two first-round production articles were inspected. None of those five titles contained the recurring reference suffix. The first production round still had an overlong title and one title omitted the month; those observations led to clearer final-drafting instructions, followed by a second two-article production test.

Artifacts: outputs/api-tests/skill-headline-v5, skill-headline-online, skill-headline-final-online.

Final deployed prompt test: outputs/api-tests/skill-recommendation-release/job.json, job JOB-mtw66xwz-mumru. Two articles completed (4148 and 4766 reported Chinese characters). Both titles have full 2026年9月 dates and no reference suffix. The industrial article explicitly recommends the project with service-specific reasons; the franchise article prioritizes the project. Mini-headings now separate pain points and standards. Opening recommendations still occur after introductory paragraphs rather than always within the first paragraph, and some service dimensions remain shared; this is not complete behavioral parity.

Remaining limitation: prompt adherence is probabilistic. No claim is made that all twelve article styles have been re-tested through the real API in this follow-up or that all semantic repetition has been eliminated.
