# Component Documentation

## Component Layers

### `src/components/ui`

Base primitives: buttons, dialogs, drawers, tables, inputs, badges, skeletons, sheets, tooltips, tabs, and related controls.

Rules:

- Keep primitives generic.
- Do not import feature repositories or business logic here.
- Prefer composition over adding product-specific props.

### `src/shared/components`

Reusable app components:

- `AppShell` - safe-area aware app layout.
- `PageTransition` - Framer Motion route/page transitions.
- `ErrorBoundary` - client error boundary.
- `LoadingScreen` and `SplashScreen` - global loading surfaces.
- `EmptyState` and `ErrorState` - consistent non-happy states.
- `ConfirmDialog` - destructive action confirmation.
- `ResponsiveSheet` - drawer/sheet wrapper.
- `InfiniteScrollSentinel` - infinite loading trigger.
- `FormField` - shared form wrapper.

### Feature Components

Feature components live inside `src/features/<feature>/components`.

Examples:

- `events` - event cards, forms, filters, stats, details.
- `gifts` - gift form, filters, rows, list.
- `analytics` - stat tiles, charts, filters, realtime indicator.
- `admin` - admin tables, action buttons, page header.
- `audit` - explorer, log cards, diff viewer, version compare.
- `reports` - export menu.
- `search` - global search and command palette.

## Hooks

Shared hooks:

- `useAnimatedNumber` - smooth numeric transitions.
- `useDebouncedValue` - search/input debounce.
- `useMediaQuery` - responsive client behavior.

Feature hooks:

- Auth session/permissions.
- Events and gifts infinite queries/mutations.
- Analytics filters and dashboard data.
- Audit infinite logs.
- Realtime cache invalidation.
- Telegram SDK signals.

## Providers

- `AppProviders` wires theme, query client, Telegram provider, realtime provider, theme sync, and command palette.
- `QueryProvider` owns TanStack Query defaults.
- `ThemeProvider` handles dark/light/system theme.
- `TelegramThemeSync` maps Telegram theme params into app theme tokens.

## Utilities and Services

- `src/shared/lib/format.ts` - dates, money, weights.
- `src/shared/lib/errors.ts` - action result and app error helpers.
- `src/shared/lib/request-context.ts` - audit metadata from request headers.
- `src/shared/lib/rate-limit.ts` - local per-IP rate limit helper.
- `src/lib/supabase` - browser/server/service clients, JWT minting, generated types.

## Component Standards

- Loading states use skeletons.
- Empty states should be useful and visually calm.
- Destructive actions require confirmation and undo when applicable.
- Buttons should include icons when action meaning benefits from them.
- Text must not overflow controls on mobile.
- Charts must support dark mode.
- Forms must validate client-side and server-side.
