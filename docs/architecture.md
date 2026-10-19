# Architecture and reuse

The existing routes, data model, permissions, and CRM workflows are preserved by the Tailwind and transport refactor.

## Persistence and OOP

Only `apps/api` accesses PostgreSQL. `PrismaService` extends the generated Prisma client and implements the NestJS lifecycle. Injectable service classes implement authentication, CRM operations, notes, reporting, and workspace administration. Controllers delegate to those services. The shared CRM service applies organization scoping, validation, ownership rules, relations, and transactional conversion across entity kinds; adding a second repository implementation that bypasses these policies would duplicate responsibilities.

`apps/web/src/lib/api.ts` exports `ApiClient` and its shared `api` instance. Its constructor accepts a base URL and fetch implementation, so the transport can be reused or tested independently. Refresh state is private to the instance. Concurrent JSON requests and CSV downloads share that state. The existing cookies, CSRF headers, request signatures, errors, and session-expired event are preserved.

React components use composition and hooks for rendering and state. Database clients stay on the server. UI templates do not inherit from persistence or transport classes.

## Tailwind and presentation

- `apps/web/src/app/globals.css`: the Tailwind entry point, theme colors and font, and three animation definitions. No custom component selectors or `@apply` rules.
- `apps/web/src/components/ui/styles.ts`: reusable Tailwind compositions for primitives, layouts, authentication, dashboard, and reports. Literal utility strings allow Tailwind to discover every state at build time. Context markers have no standalone styling.
- `apps/web/src/features/crm/modules.styles.ts`: shared list, detail, table, form, board, notification, and settings compositions; replaces the previous CSS Module.
- `components/ui/button.tsx`: `buttonVariants` provides typed visual and size variants through CVA. Callers can extend the component using `className` and `cn`.
- `components/ui/badge.tsx`: shared status variants with a typed `BadgeVariant` contract.
- `components/ui/input.tsx`, `dialog.tsx`, and `dropdown-menu.tsx`: shared controls with the existing interaction and accessibility behavior.
- `components/charts/data-bar.tsx`: a shared numeric bar for dashboard and report data. SVG width attributes support continuous values without constructing dynamic Tailwind classes or inline CSS.

Use `cn(baseClasses, condition && variantClasses, className)` when extending a template. Keep utility candidates literal; do not generate utilities such as `bg-${color}` at runtime. Responsive arbitrary variants retain the existing exact breakpoints. Tailwind important utilities preserve precedence where an old inline value overrode a contextual or responsive style.

## Templates and workflows

`features/crm/record-list.tsx`, `record-detail.tsx`, `common.tsx`, and `components/forms/record-form.tsx` remain reusable templates driven by resource types, field definitions, and permissions. Entity routes delegate to these templates. Query invalidation, filters, pagination bounds, archive confirmation, stage confirmation, and record dialogs remain shared.

Extend the shared template or primitive when adding a common capability. Keep entity-specific validation and authorization in the API, rather than introducing per-page database calls or duplicate business rules.

## Verification

Run `npm run test:web` for transport regressions, `npm run type-check`, `npm run lint`, and `npm run build`. Run `npm run test:e2e` with the local database and applications running for the existing six browser workflows. The browser suite creates and removes its own temporary organization.
