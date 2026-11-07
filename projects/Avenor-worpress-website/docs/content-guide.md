# Editing AVENOR

- **Pages → Home:** edit the headline, supporting copy, images, buttons, process, expertise and partnership sections. Move sections with the List View. The AVENOR pattern category supplies reusable editorial sections.
- **Appearance → Editor:** edit Navigation, header, footer, archive introductions and shared templates. Services and Work are native archives, not duplicate pages.
- **Services / Case studies:** add a title, summary, body, optional featured image, and taxonomy. Write capabilities, challenges, solutions, and outcomes using headings and paragraphs. The AVENOR details panel controls featured status and related post IDs. Page order is available under the native page attributes controls.
- **Team / Testimonials:** edit native title, body, excerpt, image, and order. Use AVENOR details for role, company, and optional social profile. Publish only approved people, quotes, roles and affiliations with permission.
- **Collection blocks:** choose a heading, item count, columns, category/industry term ID, and featured or related mode in the block sidebar. Solutions & projects grids also let you select Solution architectures, Delivered projects or All entries. Set the corresponding Entry type in each solution's AVENOR details panel. Existing entries default to architecture guides. The term ID is shown in the taxonomy edit URL. Counts are limited to 12 regardless of supplied attributes.
- **Posts:** publish Insights with native categories, excerpts, featured images, revisions and scheduled publication.
- **Settings → AVENOR business:** change contact details, business profile, social URLs, notification address, CTA label and retention period. An empty social URL is omitted publicly.
- **Inquiries:** use the native list search and workflow-status filter. Open a record to review details and delivery status; select New, In progress, Resolved or Spam and update. Only administrators receive inquiry capabilities by default.
- **Tools → Export/Erase Personal Data:** use WordPress verification to process inquiries associated with an email address.

The seed script creates missing records and preserves matching slugs. Re-running it does not reset page edits. It initializes site settings only once. Imported media are reused by attachment slug. Publish client work and endorsements only when the supporting evidence and permission are available.

## Signal compositions

Home contains the geometric signal hero, three live capabilities, one delivered in-house project, two field notes, native Details FAQs and the contact band. About contains studio imagery, four discipline cards, two partnership commitments, the delivery loop and delivery standards. Contact contains a native business profile and the inquiry form.

Sixteen reusable patterns are available under AVENOR in the block inserter. Team and Testimonials remain available for approved records; they are not populated with invented identities. Solutions distinguish architecture guides from delivered projects using the Entry type control. The AVENOR platform case study uses an actual current interface capture.

The new main Navigation order is Services → Solutions → About → Insights → Contact. Change it in the native Navigation editor. Header and footer remain template parts. Services and Solutions introductions are editable archive compositions; Insights uses the native Posts page template.

`tools/seed/compositions.php` defines the initial page sections. The Signal migration replaces the approved pages and navigation once and saves prior revisions. The `avenor_signal_design_version` option prevents subsequent startup from resetting editor changes. Initialization does not create inquiry fixtures.

Archive and taxonomy collections inherit WordPress's main-query batch size so page routing and pagination stay aligned. Embedded block item counts remain independent and limited to 12. Configure ordinary archive batch size through Settings → Reading.
