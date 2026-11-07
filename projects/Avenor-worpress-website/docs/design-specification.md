# AVENOR / Signal design system

The 29 October 2026 redesign replaces the previous photographic editorial direction with a digital systems identity: a bold grotesk wordmark, numbered information, technical annotations and an original three-plane vector signal. The business remains an independent strategy, design and engineering practice.

## Palette and typography

| Token | Value | Role |
| --- | --- | --- |
| Paper | `#101113` | Main ink-black canvas |
| Soft | `#17191C` | Panels and project surfaces |
| Surface | `#1D1F23` | Image backgrounds and controls |
| Deep | `#090A0B` | Footer |
| Ink | `#F2F1EA` | Primary text |
| Muted | `#A3A5A9` | Supporting copy |
| Accent | `#D2F65A` | Electric chartreuse actions and signal |
| Line | `#34363A` | Structural dividers |
| Copper | `#C1B3FA` | Supporting lavender detail; legacy token name retained |

Tokens live in `theme.json`, shared by the editor and frontend. Arial/Helvetica supplies the grotesk display and body type; Courier New supplies technical labels. No remote font service or frontend framework is required. Display text uses tight spacing and short phrases; supporting copy remains at readable sizes with generous line height.

## Page architecture

- Home: split typographic/vector hero, three numbered capabilities, one in-house platform, two field notes, three FAQ disclosures and an accent contact band.
- About: studio introduction with asymmetric image, four operating principles, two partnership commitments, four-step delivery loop and three delivery standards.
- Services: compact capability introduction, category filter and two-column service panels.
- Solutions: architecture-library introduction, industry filter and horizontal image/content rows.
- Insights: one featured article, followed by a two-column article collection.
- Contact: oversized project-brief headline, business information and next steps beside a structured form panel.
- Shared chrome: compact numbered masthead, strong contact band and oversized footer wordmark.

The vector artwork in `assets/images/signal.svg` is an original code-authored composition of three stacked planes, orbital lines, a coordinate grid and discipline annotations. It replaces the architectural stock-photo homepage hero. Studio and article photography remain supporting content; credits are in the media guide.

## Responsive rules

Containers have 56px desktop, 32px tablet and 20px phone margins. Desktop content is capped at 1440px. The masthead becomes native mobile Navigation below 782px. The mobile sheet uses numbered full-width links and an explicit contact action; WordPress retains dialog semantics, focus trapping, Escape, focus return and scroll locking.

The hero stacks on tablet/phone. Capability rows reduce to an index plus content; portfolio and architecture rows stack; article collections and form fields become one column. Short mobile menus scroll without losing the close control. Decorative numbering is excluded from accessible link names through CSS speech alternatives.

## Motion and usability

Native modules provide word entrances, once-per-element scroll reveals, restrained hero parallax and fine-pointer feedback. Motion is event-driven, with no perpetual animation loop. Content is visible before enhancement; reduced-motion preferences cancel active animation. Interactive hit areas remain stationary. The hamburger morphs into a cross, and the menu animates out before invoking the native close action.

Labels, keyboard focus outlines, privacy acknowledgment and status feedback remain explicit. Contact processing uses the existing shared backend validation and private record workflow. Automated checks supplement visual inspection; they are not an accessibility certification.

## Source organization

Nine CSS components replace the former eighteen: foundations, shell, hero, catalog, page compositions, inquiry, responsive layouts, motion and menu. An ordered manifest builds one frontend and one editor stylesheet. Sixteen native patterns replace the earlier compositions. `tools/signal-redesign.php` applies the approved page/navigation replacement once and keeps WordPress revisions; subsequent startup preserves editorial edits.
