# Architecture

The custom **block theme** owns `theme.json`, native HTML templates, header/footer template parts, editable PHP block patterns, and nine focused CSS components for the Signal design system. Core blocks supply page content, titles, images, Navigation, Query Loop, search, pagination, and post navigation. There is no frontend framework or external font dependency.

**avenor-core** owns business behavior under `Avenor\Core`. `Content/Models` registers four public types, two taxonomies, protected REST metadata, and a private inquiry type. `Blocks/BlockRegistrar` supplies bounded database collections and one renderer per card variant; three additional focused blocks cover team, testimonials, and business details. The editor uses the same PHP output through ServerSideRender. `blocks/index.js` also adds a document settings panel for featured status, role, company, social URL, and related IDs.

The Services and Work URLs are native CPT archives rather than competing Pages with identical slugs. Their taxonomy views use the same archive patterns. Content survives theme switching because it belongs to the plugin. Archive introductions and layouts are editable in the Site Editor. Home and About contain expanded, ordinary blocks that can be rearranged in the page editor.

The unenhanced form posts to a native anonymous admin-post action, using the same validation and persistence service, then redirects to feedback on Contact.

Contact processing follows `ContactController → Validation → ContactService`. The public REST route intentionally permits anonymous submissions. Size/type/length validation, service validation, privacy acknowledgment, a honeypot, a per-network hourly limit, and a unique database option lock protect writes. Only `REMOTE_ADDR` is used; forwarded headers are ignored. Five submissions per hour share the same network allowance. Duplicates return the original acknowledgment for 24 hours. The network lock expires after 30 seconds if a PHP worker crashes; it is otherwise released in `finally`.

Inquiries are private, have no public REST representation, and require custom capabilities granted only to administrators on activation. They store normalized form fields, the message, acknowledgment time, a workflow status, and mail delivery state. WordPress handles admin nonces and the Settings API. The inquiry status metabox additionally checks its own nonce and the mapped post capability.

Persistence precedes `wp_mail()`. Notifications contain an admin link, not the message body. A failed notification does not roll back the inquiry. An administrator can see the delivery flag in the inquiry detail screen. Configure a reliable mail transport before production use.

Retention defaults to 365 days. WP-Cron permanently deletes up to 100 expired records daily; configure a real system scheduler for predictable production execution. Privacy export/erasure uses WordPress email-verification workflows. Uninstall preserves content and settings deliberately; removing personal data requires explicit admin deletion or privacy erasure. Database backups are outside plugin retention control.

Native core provides titles, singular canonicals and XML sitemaps. Theme metadata yields to Yoast, Rank Math and AIOSEO when detected. No review ratings or fabricated Organization claims are emitted. Inquiry content is excluded from public search and sitemaps by its private post-type registration.

## Architecture review

Patterns own editable compositions; PHP owns genuinely dynamic data. Shared service/project cards serve home, archives, taxonomy views, and related collections. Queries are bounded to 12 entries, with archive pagination. No custom tables, content repositories, DI container, page builder, frontend React app, or Node backend is required. React is used only inside the native Gutenberg editor. Filename checks in PHPCS are excluded because the requested namespaced architecture uses PascalCase files; the rest of WordPress-Core checks remain enabled.

Docker targets MySQL 8.4 and PHP 8.3. Playground is an additional local PHP/WASM preview with SQLite. Native PHPUnit tests use the real installed WordPress API with a separate, disposable SQLite database. This verifies plugin behavior but is not a substitute for MySQL execution; the CI workflow is configured to exercise a disposable MySQL WordPress installation and remains unexecuted here.

## Signal presentation system — 29 October 2026

The rebuilt frontend uses ink-black surfaces, electric chartreuse, bold grotesk typography and a custom code-authored SVG signal. Sixteen native patterns compose the new experience. The CSS manifest compiles seven shared editor sources and two frontend interaction sources into one stylesheet for each target.

`tools/seed/compositions.php` is the single page-composition map used by initial content and the redesign migration. `tools/signal-redesign.php` replaces Home, About, Contact and the main Navigation once, saving revisions first. Its version option prevents later startup from overwriting editorial changes. Business records, inquiries, contact settings and article content retain their existing identities. The earlier incremental presentation migrations have been retired.

The native Navigation dialog owns keyboard controls, focus containment, focus return, Escape and scroll locking. Focused modules decorate its entrance, exit and hamburger icon. The menu sheet uses numbered links; decorative CSS content has an empty speech alternative. Responsive layouts switch below 782px, with additional phone adaptations below 600px.

Motion modules share animation ownership and media preferences. Reveals run once per element; scroll and pointer work use requestAnimationFrame only after input. Reduced-motion changes cancel animation. Linked cards fade without moving hit areas, while their imagery can animate inside its frame.

`npm run check:architecture` validates native module registration, missing/unused dependencies, import-map cycles, CSS registration and source-size boundaries. Generated bundles are committed alongside source changes. Detailed visual rules are in the design specification.
