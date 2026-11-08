# Verification and delivery report

Current presentation: **Signal**, implemented on 29 October 2026 and reviewed again on 31 October 2026. The current result is **24/24 browser tests passed**, **14 PHP tests / 80 assertions passed**, and zero violations in the configured automated accessibility checks across eight public pages and the mobile menu. See [Signal redesign verification](#signal-redesign-verification) below. Earlier sections retain the implementation history and do not describe the current appearance.

Verified locally on 21 October 2026. No supplied reference images were available. The initial repository contained no files to migrate or preserve; no NORVA content was found.

## Installed versions

WordPress **7.1.3** (downloaded stable release), PHP/WASM **8.3**, native PHP **8.3.36**, project Node **24.18.0**, system npm **11.6.2**, `@wordpress/scripts` **35.0.0**, cssnano **8.0.10**, Playground CLI **3.1.60**, Playwright **1.64.1**, PHPUnit **11.5.57**, WPCS **3.4.1**. PHP and JavaScript dependency versions are locked in Composer/npm lockfiles. Docker is configured for MySQL **8.4** and PHP **8.3**, but Docker was not installed on the implementation host.

## Actual executed results

| Check | Result |
| --- | --- |
| `npm run build` | Passed; production editor bundle generated, about 5.5 KiB JavaScript before transport compression |
| `npm run lint:js` | Passed with no remaining lint errors |
| `npm run test:php` with local `PHP_BINARY` | Passed; 42 PHP files valid |
| `vendor/bin/phpcs` against WordPress-Core | Passed with no errors or warnings; filename rules deliberately excepted for the required namespace-based PascalCase structure |
| `vendor/bin/phpunit` | Passed: **7 tests, 52 assertions**, real WordPress API and isolated SQLite database |
| `npm test` | Passed: **10 Playwright tests**, Chromium, 2.4 minutes for the complete run |
| `npm audit --omit=dev` | No production vulnerabilities; the product has no npm runtime dependencies |
| `composer audit` | No security advisories found for installed PHP development packages |
| Visual captures | 15 full-page captures: Home, Services, Work, Contact and About at 1440, 768 and 390 pixels wide |

The native PHP integration suite verifies public types, taxonomies, administrator/editor/anonymous inquiry capabilities, invalid payloads, consent, service selection, private storage, duplicates, notification failure, network rate limits, concurrent locks, REST size/privacy behavior, settings sanitization, metadata normalization, escaped dynamic rendering, privacy export/erasure and retention.

Browser coverage includes homepage database collections; service and industry filters; service/project/article details; search; 404 status; server-side validation; honeypot and size limits; denial of public inquiry routes/search; client validation and successful submission; duplicate acknowledgment; keyboard mobile-menu opening, Escape and focus return; native submission without JavaScript; administrator login; service publishing; inquiry status changes; valid Gutenberg block parsing; homepage heading edits appearing publicly and being restored; image decoding and overflow at three viewport widths.

The administrator test uses WordPress’s authenticated publishing API and Gutenberg data stores within the actual editor, rather than a separate fake administration layer. Native inquiry administration is exercised through the visible WordPress UI. The temporary service is deleted and the original homepage content is restored after testing. Local browser inquiry fixtures are now removed automatically after tests.

## Visual and architecture review

The homepage and mobile capture were visually inspected. Native lazy-loading required scrolling before full-page captures; the final screenshot test now does this. Inherited Group margins were corrected so grid rows and footer links align. Two image blocks with manually supplied intrinsic dimensions failed Gutenberg validation; their markup was corrected and the publishing/editing test now passes with no invalid blocks. A theme-selection preview is saved as `web/wp-content/themes/avenor/screenshot.png`.

Archive and taxonomy views now share archive patterns. Public pages use common cards, buttons, containers and design tokens. Business logic remains in the plugin; templates use native blocks and patterns. Queries are bounded, records are private where needed, and inquiries are persisted before notifications. The frontend uses local fonts and photography with no animation framework or frontend React application.

There is **no reference-image comparison result**: the reference files were missing. The visual direction is an interpretation of the written brief, not a verified reproduction.

## Remaining validation and operational work

1. Supply the three reference screenshots, compare matching viewports and adjust the design against them.
2. Run the supplied Docker/MySQL environment and GitHub Actions workflow. Neither was executed here. The local browser environment and native PHP integration database both used SQLite.
3. Configure and verify external email delivery. Notification failure is covered; delivery to a real mailbox is not.
4. Measure deployed Core Web Vitals/Lighthouse under representative hosting and content. No performance score is claimed.
5. Configure the final contact mailbox, backup retention and a production WP-Cron scheduler for the deployment environment.
6. Conduct a full accessibility audit if formal WCAG conformance is required. Keyboard interaction, focus, layout and labels were reviewed; this is not a certification.

Docker initialization, WP-CLI activation/seeding, and all test commands are in the root README. Source boundaries and content management instructions are in the adjacent architecture and content guides.

## Follow-up interface refinement

The refined interface adds a sticky branded header, a hero editorial note, distinct service icons and category labels, linked case-study imagery, a softer testimonial surface, structured contact fields and three next-step explanations. The homepage now includes three engagement choices, a live three-article preview and four native keyboard-accessible FAQ disclosures. A one-time upgrade adds these blocks while preserving existing content.

The mobile navigation is now a branded side drawer with numbered links, a contact action, business email, an explicit close control and a dark backdrop. Core focus trapping, Escape and focus return remain intact. Outside-click dismissal and desktop breakpoint cleanup are tested. Decorative CSS numbering does not alter accessible link names.

Latest executed results: **12 browser tests passed** in 2.8 minutes; **9 PHP tests with 56 assertions passed**; **50 PHP files passed syntax validation**; WordPress-Core checks, JavaScript lint (including the new navigation enhancement), and the editor build passed. Added backend checks verify valid administrator nonces are required for inquiry status updates and unpublished services cannot be selected publicly.

A repeated browser run correctly exhausted the local anti-spam network allowance. The test setup now resets only loopback rate-limit transients inside the project’s local Playground database before a full suite; the product retains its five-per-hour limit and exposes no reset endpoint. External test targets are unaffected.

Visual review also caught default Gutenberg margins staggering engagement cards; their grid margins were normalized. Screenshot scrolling now explicitly uses instant movement so smooth scrolling cannot produce an inconsistent sticky-header capture. The original reference-image, Docker/MySQL, external mail and deployed-performance verification limits still apply.

## Night-theme business release — 22 October 2026

The public interface now uses a graphite/petroleum palette with sage actions and light text. The homepage includes four delivery principles, four business contexts and four platform foundations. Six solution architectures describe scope, implementation, operation and acceptance criteria; they do not assert undocumented client engagements. Invented staff profiles and endorsements have been removed from publication and initialization. Older generated content revisions were removed after a local database backup outside the web root.

The owner requested that default contact details remain. Initialization now creates only business pages, services, solution guides, editorial articles and navigation. Inquiry fixtures are created only during tests and removed from the local database afterward. Default WordPress starter content was removed where it was unchanged.

Latest executed validation: **13 browser tests passed** in 1.9 minutes, including night colors, page-copy checks, native and enhanced form submission, navigation, editorial publishing, inquiry workflow and 15 responsive captures. **9 PHP tests with 56 assertions passed**. **52 PHP files passed syntax validation**. WordPress-Core checks, JavaScript lint and the editor production build also passed. The release no longer seeds profiles, quotes or private inquiry fixtures.

Tests ran against the local WordPress installation with SQLite. Docker/MySQL execution and delivery to an external mailbox remain unverified. The supplied reference images are still unavailable; the night design follows the owner’s latest direction. Default contact destinations remain intentionally configured at the owner’s request.

## Expertise, partnerships and implemented platform — 22 October 2026

Home and About now include four editorial discipline cards, two partnership commitments, and native collections for approved people and testimonials. Empty collections show a contact invitation; no invented names, third-party projects or attributed quotes are published. The in-house AVENOR platform has its own case study and actual interface capture, separate from the six solution architecture guides. Both the content type and collection selection have native editor controls. Section initialization is additive and guarded against duplication.

Executed validation: **14 browser tests passed**, including native editor parsing/publishing, inquiry administration, form transports, mobile navigation, portfolio details, collection counts, and 15 responsive page captures. **11 PHP integration tests with 71 assertions passed**, including project/architecture selection, featured filtering, legacy metadata and publication boundaries for people and quotes. **57 PHP files passed syntax checks**. WordPress-Core checks, JavaScript lint, and the editor production build passed. New sections were also inspected visually at 1440 and 390 pixels; the portfolio screenshot preserves its full aspect ratio.

An initial contact request after a cold Playground boot returned `rest_no_route`; subsequent requests succeeded. Preview startup now checks the REST index for the plugin contact route before announcing application readiness. After a fresh restart, the first external contact request with an empty payload returned the expected validation status **422**, and each new homepage section appeared exactly once after repeated initialization. This is a local runtime readiness check, not a change to the production endpoint or form validation. Docker/MySQL and external mailbox delivery remain unverified.

## Compact homepage — 22 October 2026

At the owner's request, the homepage now keeps the hero, compact expertise strip, three selected services, the in-house project, two articles, native FAQs and contact CTA. About retains the full team disciplines and partnership sections; service and architecture archives retain all entries. Long-form homepage patterns remain reusable in the editor. The one-time compact migration runs after earlier upgrades, so repeat initialization preserves the shorter page and subsequent edits.

Measured document height fell from **12,703 to 4,742 pixels at 1440px** (63% reduction) and **17,790 to 6,038 pixels at 390px** (66% reduction). Both widths passed image decoding and horizontal-overflow checks and were visually inspected. Native Gutenberg parsing returned **zero invalid blocks**. All **four targeted browser tests passed**, covering homepage collections, FAQs, release content, portfolio navigation and retained About sections. PHP syntax and WordPress-Core checks passed. The previously executed backend suite was not rerun for this presentation-only revision.

## Motion enhancement — 22 October 2026

Added staggered entrances, scroll reveals, bounded hero-image parallax, fine-pointer card spotlights and magnetic buttons, and a decorative reading-progress line. Four new browser tests passed for reveal/pointer/progress behavior, navigation, initial and runtime reduced-motion changes, touch navigation, horizontal overflow, and no-JavaScript content access. Four existing homepage/FAQ/mobile-navigation regression tests also passed. JavaScript lint, PHP syntax and WordPress-Core checks passed. No backend logic changed.

Desktop and mobile document heights remain **4,742px and 6,038px**, respectively, with no horizontal overflow. Motion adds no extra scrolling. The native script and stylesheet total approximately 7.7KB before transport compression; no new runtime dependency was added. This is an asset-size observation, not a deployed performance score.

### Stronger page and scroll entrances

The owner's follow-up adds staggered word entrances to Home and page-introduction headings, including Solutions; stronger card translation/scale; settling image zoom; a clipped hero reveal; and bounded stronger hero parallax. **Five motion browser tests passed**, including a new Home/Solutions comparison at 1440px and 390px that checks unchanged heading text/height and no horizontal overflow. Reduced-motion changes, touch controls, pointer feedback, navigation and no-JavaScript access remain covered. JavaScript lint passed.

The two motion assets now total **10,024 bytes** before compression, with no added dependency. Home remains **4,742px desktop / 6,038px mobile**. No deployed performance benchmark is claimed; effects run on entrance or user input rather than a permanent animation loop.

### Header navigation refinement

Reversed the native menu to Contact, Insights, Solutions, Services, About; desktop styling adds a rounded dark container, hover/focus surfaces and an active-page pill. Reviewed widths 1440, 1090, 820, 782 and 390: order matched, desktop visual and Tab order agreed, and no horizontal overflow occurred. Both existing mobile-navigation tests passed. WordPress-Core checks passed for the one-time migration. Subsequent menu edits are preserved.

### Mobile navigation capsule and transitions

The mobile dialog now has a rounded floating panel, capsule links, active-page highlight, rounded contact action, and animated entrance/exit. Both existing navigation regression tests passed for keyboard Escape/focus, links, outside dismissal and breakpoint cleanup. Two additional tests passed for a genuinely deferred exit, rapid reopen/close, runtime reduced-motion cancellation, short 320×568 scrolling and focus containment. The 390px layout was visually inspected; desktop/tablet navigation order and overflow checks still passed. JavaScript lint and WordPress-Core checks passed. No backend content or inquiry behavior changed.

The native open/close buttons now share a decorative two-line icon that morphs into a cross on opening and back during the 220ms exit. Accessible button labels remain native; reduced motion disables the transition. The two navigation tests passed again with assertions for both line rotations, the closed-state reset, focus restoration, rapid reuse and short-screen behavior. JavaScript lint and syntax checks passed.

## Technical and clean-code audit — 22 October 2026

See [the full audit](code-quality-audit.md) for component boundaries and actual limitations. Server rendering, editor controls, content initialization, motion lifecycle and native navigation are separated into focused components. CSS source uses 18 ordered components, with 68 overridden declarations removed; a single 38,369-byte frontend bundle replaces seven stylesheets totalling 49,745 bytes. The largest runtime source component is about 4.4KB. The architecture check covers 119 source files, nine native modules and the CSS manifest, and is part of CI.

Fixed character-vs-byte validation/truncation for multilingual input, archive heading order, native archive pagination batch-size drift, and moving click targets during scroll entrance. All 23 AVENOR patterns parsed as valid native editor blocks. Re-running initialization preserved existing editorial content. Automated axe review reported no violations for the configured WCAG A/AA/best-practice tags on eight public pages plus the mobile drawer after heading fixes. Sixteen before/after viewport comparisons reported zero computed visual differences after accounting for intentional card-heading semantics.

Executed validation: **all 22 browser tests passed in 4.4 minutes**, **14 PHP integration tests with 80 assertions passed**, **75 PHP files passed syntax validation**, and WordPress-Core formatting checks passed. JavaScript lint, production editor build, compiled styles and architecture checks passed. The intermittent portfolio-click failure was reproduced, fixed by retaining stationary interactive hit areas, passed three repeated route tests, and passed again in the complete browser suite. Public form fixtures were cleaned afterward.

Tooling was updated to WordPress Scripts 35 and cssnano 8. npm advisories fell from 110 to **60 remaining development-tool advisories (24 high, 36 moderate)**. npm's production-only audit and Composer audit reported **zero** known advisories. These results do not claim full security certification. No forced downgrade or hidden suppression was used. Local tests used SQLite; Docker/MySQL, remote CI, external mail delivery and deployed performance remain unverified.

## Signal redesign verification

The 29 October rebuild replaces the previous presentation with an ink-black and electric chartreuse identity, bold grotesk display type, original vector artwork, numbered navigation, new page compositions, a horizontal architecture catalog, a featured editorial layout and a project-brief contact page. Theme version is 2.0.0. The implementation remains a native WordPress theme and companion plugin.

Nine CSS source components replace the former eighteen. The production frontend stylesheet is **31,374 bytes**, and editor CSS is **26,815 bytes**, before transport compression. Sixteen native patterns replace the previous twenty-three. Earlier incremental presentation scripts were retired in favor of a shared composition map and one versioned migration. Existing page/navigation revisions were saved before replacement; business records and private inquiries were preserved. A source and local database backup was saved outside the public web root before changes.

| Check | Executed result |
| --- | --- |
| Full Playwright suite, 29 October | **24 passed; 0 failed, flaky or skipped**; confirmed from the saved HTML report |
| PHP integration | **14 passed / 80 assertions** on isolated SQLite |
| PHP syntax | **67 source files valid** |
| PHP coding standards | Passed after source formatting; checked again 31 October |
| JavaScript lint | Passed |
| Production build | Editor bundle and both stylesheets built successfully |
| Architecture | **102 source files, 9 modules, 9 CSS components**; size boundaries, imports and registration valid |
| Gutenberg | All **16 patterns** parsed as valid editable blocks; homepage editing/publishing/restoration passed |
| Responsive coverage | Existing 15 page/viewport captures passed; added 320px and 1920px checks for Insights, Privacy, service and solution detail pages |
| Motion and navigation | Entrances, pointer feedback, reduced motion, animated close, rapid reuse, focus restoration and short-screen scrolling passed |
| Native contact workflow | Enhanced and no-JavaScript form submission, validation, duplicates, privacy and administrator management passed |
| Automated accessibility, 31 October | No violations for configured WCAG A/AA/best-practice tags on eight pages and the mobile menu |
| Repeat initialization, 31 October | Existing published editorial content remained identical |
| Delivery images | Six 1440 × 1080 screenshots refreshed in `docs/screenshots/`; current interface captured for the in-house project and theme preview |

During iteration, oversized lazy-image sizing, default Navigation colors and decorative arrows leaking into accessible names were corrected. Tests were updated for the new primary action and to poll the end of the icon transition rather than compare a floating-point transform to exact zero. An initial browser run encountered `ERR_NETWORK_IO_SUSPENDED`; affected checks passed in a targeted run, followed by the complete 24-test pass. The saved current screenshots were inspected visually.

Local validation continues to use SQLite. Docker/MySQL, remote CI, external mailbox delivery and deployed performance are outside these executed results. The automated accessibility scan is not a full conformance audit. Dependency audit figures above are the earlier recorded results, not a fresh dependency scan for this redesign. No GitHub push or production deployment was performed for Signal.
