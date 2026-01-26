# UI Package (@lumo/ui)

Next.js frontend for the Lumo desktop application.

## Technology Stack

- **Framework**: Next.js 16 App Router (SSG mode)
- **React**: React 19
- **Data Fetching**: TanStack Query + Tauri IPC
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Forms**: React Hook Form + Zod (when needed)
- **Charts**: recharts with shadcn chart wrapper
- **Icons**: lucide-react
- **Fonts**: Geist (sans & mono)
- **Type Generation**: Typeshare (Rust → TypeScript)

## Component Structure

**Complex components (with business logic):**
```
component-name/              # kebab-case
├── index.tsx               # UI rendering ONLY (REQUIRED)
├── use-service.ts          # State + hooks (REQUIRED)
├── types.ts                # TypeScript types (REQUIRED)
├── libs.ts                 # Pure functions + API calls (if needed)
└── constants.ts            # Constants + config (if needed)
```

**Simple presentational components:**
```
component-name/
├── index.tsx               # UI rendering (REQUIRED)
└── types.ts                # Props types (if complex)
```

**Rules:**
- Components MUST be folders, NEVER single `.tsx` files (except global components like `app-sidebar.tsx`, `titlebar.tsx`)
- Complex components with state/logic MUST have: `index.tsx`, `use-service.ts`, `types.ts`
- Simple components MUST have at minimum: `index.tsx`
- Add `libs.ts` only if you have pure functions
- Add `constants.ts` only if you have constants

## File Responsibilities

1. **`index.tsx`** - UI ONLY
   - Component function + JSX
   - Import `useService` from `./use-service`
   - NO `useState`, NO `useEffect`, NO business logic

2. **`use-service.ts`** - State ONLY
   - All React hooks
   - TanStack Query hooks
   - Event handlers
   - Side effects
   - Export single `useService` function

3. **`libs.ts`** - Pure functions + API calls
   - Data transformations
   - Tauri IPC calls (if component-specific)
   - NO React hooks

4. **`types.ts`** - Types ONLY
   - Interfaces, type aliases
   - **NEVER use `enum`** - use const objects with `as const`

5. **`constants.ts`** - Constants ONLY
   - Use `UPPER_SNAKE_CASE` for primitives
   - Use `PascalCase` for objects
   - **ALWAYS use `as const`** for objects/arrays

## Dependency Hierarchy

**CRITICAL: Follow this order when deciding where to put code:**

1. **Component-specific** → `component-name/[file].ts`
2. **Feature-shared** → `components/[feature]/[file].ts`
3. **Global** → `src/types/` or `lib/`

## Module Structure

Modules are page-level business logic containers that correspond to routes. Each route should have a dedicated module in `modules/`.

**Structure:**
```
modules/
└── overview/               # Route: / (home page)
    ├── index.tsx           # UI rendering ONLY (REQUIRED)
    ├── use-service.ts      # State + hooks (REQUIRED)
    ├── types.ts            # TypeScript types (REQUIRED)
    ├── libs.ts             # Pure functions + API calls (if needed)
    ├── constants.ts        # Constants + mock data (if needed)
    └── components/         # Module-specific components (if needed)
        ├── index.ts        # Re-exports
        ├── token-chart/
        │   └── index.tsx   # Components MUST be folders
        └── ...
```

**Rules:**
- Each route (`app/[route]/page.tsx`) should import from corresponding module
- Route files should be minimal - just import and render the module
- Modules follow the same file structure as complex components
- Module names use kebab-case matching the route name
- Module-specific components go in `components/` subdirectory
- Only extract to `@/components/` if truly reusable across multiple modules

**Example route file:**
```tsx
// app/page.tsx
import { Overview } from "@/modules/overview";

export default function Home() {
  return <Overview />;
}
```

**When to use modules vs components:**
- **Modules** (`modules/`): Page-level containers, route-specific logic
- **Module components** (`modules/[name]/components/`): Components only used by that module
- **Shared components** (`components/`): Reusable UI pieces, shared across multiple pages

## TanStack Query Integration

**Usage with Tauri IPC:**
```typescript
// component/use-service.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import type { Session } from '@/generated/typeshare-types';

export function useService() {
  const queryClient = useQueryClient();

  const sessionsQuery = useQuery({
    queryKey: ['sessions'],
    queryFn: () => invoke<Session[]>('get_sessions'),
  });

  const createSessionMutation = useMutation({
    mutationFn: (data: CreateSessionInput) => invoke('create_session', { data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  return {
    sessions: sessionsQuery.data ?? [],
    isLoading: sessionsQuery.isLoading,
    createSession: createSessionMutation.mutate,
  };
}
```

## Tauri IPC Bridge Pattern

```typescript
// src/bridges/session-bridge.ts
import { invoke } from '@tauri-apps/api/core';
import type { Session, CreateSessionInput } from '@/generated/typeshare-types';

export const SessionBridge = {
  getAll: () => invoke<Session[]>('get_sessions'),
  getById: (id: string) => invoke<Session | null>('get_session_by_id', { id }),
  create: (input: CreateSessionInput) => invoke<Session>('create_session', { input }),
  delete: (id: string) => invoke<void>('delete_session', { id }),
};
```

## Styling Rules

**Tailwind CSS Rules:**
- **ONLY Tailwind CSS** - No CSS modules, no styled-components
- Use `cn()` from `@/lib/utils` for conditional classes
- Use `cva` for component variants

**Theme Tokens (CRITICAL):**

**NEVER use hardcoded gray colors** - Always use theme tokens for consistency and dark mode support.

```typescript
// ❌ WRONG - Hardcoded grays
bg-gray-50, bg-gray-100       // Don't use
text-gray-500, text-gray-600  // Don't use
border-gray-200               // Don't use

// ✅ CORRECT - Theme tokens
bg-muted, bg-accent           // Backgrounds
text-muted-foreground         // Secondary text
border-border, border-input   // Borders
```

**shadcn/ui Components (CRITICAL):**
- **NEVER modify files in `components/ui/`** - These are shadcn/ui components and must remain untouched
- Trust their built-in variants - don't override colors/sizes inline
- Use `size="icon"` for icon-only buttons
- Use `variant="ghost"` `variant="outline"` as designed
- To customize shadcn/ui styles globally, use CSS custom properties in `app/globals.css`:
  ```css
  /* Override Card styles globally */
  [data-slot="card"] {
    --card-padding: 1rem;
    padding: var(--card-padding);
  }
  [data-slot="card-header"] {
    padding-inline: var(--card-padding);
  }
  ```
- For component-specific overrides, pass `className` prop to shadcn components

**Icons:**
```tsx
import { Boxes, Zap, DollarSign, Settings } from "lucide-react";

<Boxes className="size-4" />
<Zap className="size-4 text-muted-foreground" />
```

Size convention: Use `size-4` (16px) for most icons, `size-5` (20px) for larger contexts.

## Key Constraints

1. **SSG-Only Mode**: Next.js is configured for static export, so SSR/ISR features are unavailable
2. **Image Optimization**: Next.js Image component requires `unoptimized: true`
3. **Components MUST be folders** - Never single `.tsx` files (except global components)
4. **Separate UI from logic** - `index.tsx` for UI, `use-service.ts` for logic
5. **Tailwind CSS only** - No CSS modules, no styled-components
6. **Follow dependency hierarchy** - Component → Feature → Global
7. **TanStack Query for data** - All async data fetching through `useQuery`/`useMutation`
8. **Tauri IPC via bridges** - Wrap invoke calls in bridge modules
9. **NEVER modify `components/ui`** - shadcn/ui components are read-only
10. **Use theme tokens** - Never hardcode colors like `bg-gray-100`
11. **Icons from lucide-react** - Use `size-4` convention
12. **Modules for routes** - Each route imports from `modules/`, route files are minimal

## Directory Structure

```
packages/ui/
├── app/                    # Next.js App Router (route definitions only)
│   ├── page.tsx            # Home route → imports Overview module
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Theme variables (shadcn)
├── modules/                # Page-level business logic
│   └── overview/           # Overview page module
│       ├── index.tsx       # UI rendering
│       ├── use-service.ts  # State + hooks
│       ├── types.ts        # Types
│       ├── constants.ts    # Mock data / constants
│       └── components/     # Module-specific components
│           ├── index.ts
│           ├── time-range-tabs/
│           │   └── index.tsx
│           ├── token-chart/
│           │   └── index.tsx
│           ├── model-distribution/
│           │   └── index.tsx
│           └── recent-sessions/
│               └── index.tsx
├── components/             # Shared React components
│   ├── ui/                 # shadcn/ui base components (READ-ONLY)
│   ├── page-header/        # Page header with sidebar trigger
│   ├── stat-card/          # Statistics card
│   ├── sidebar-layout/     # Sidebar layout wrapper
│   ├── app-sidebar/        # Global sidebar
│   └── titlebar/           # Window titlebar
├── src/                    # Frontend source
│   ├── bridges/            # Tauri IPC wrappers
│   ├── hooks/              # React custom hooks
│   ├── lib/                # Utilities (query-client, utils)
│   ├── types/              # Global TypeScript types
│   └── generated/          # Auto-generated TypeScript types
├── scripts/                # Build scripts
│   └── generate-types.js   # Typeshare runner
├── lib/                    # Shared utilities
├── hooks/                  # Global React hooks
└── package.json            # Package dependencies
```

## Development Commands

```bash
pnpm dev              # Start Next.js dev server on localhost:3000
pnpm build            # Build Next.js static export to out/
pnpm lint             # Run ESLint
pnpm generate-types   # Generate TypeScript types from Rust structs
```

## Build Configuration

- `next.config.ts`: Sets `output: 'export'` for SSG, configures `assetPrefix` for dev/prod
- Next.js Image component requires `unoptimized: true` due to SSG constraints
- TypeScript path alias: `@/*` maps to project root
