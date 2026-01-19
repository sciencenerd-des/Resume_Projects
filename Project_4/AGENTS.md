# Repository Guidelines

## Project Structure & Module Organization
Operate from repo root (`Project_4/`). Strategic context and specs reside in `docs/`—start changes by reviewing `docs/00-project-constitution.md` and the relevant architecture or testing chapter. Runtime code stays in `src/` (`frontend.tsx` boots the React app; `components/`, `hooks/`, `services/`, `lib/` split UI, orchestration, and pure logic). Tests mirror this layout inside `tests/unit`, `tests/integration`, and `tests/e2e`. Keep generated bundles in `dist/` and never edit artifacts inside `docs/source` or `node_modules`.

## Build, Test, and Development Commands
- `bun install` — install dependencies defined in `package.json`.
- `bun run dev` or `bun --hot src/frontend.tsx` — hot-reload development server.
- `bun run build` — compile browser assets to `dist/`.
- `bun run typecheck` / `bun run lint` — enforce `tsconfig` and ESLint/Prettier rules.
- `bun test`, `bun test --coverage`, `bunx playwright test` — run unit/integration suites, gather coverage, or launch browser E2E runs.

## Coding Style & Naming Conventions
Target Bun + TypeScript 5 on Node ≥18. Format code with Black-equivalent discipline: 4-space indent in TS files, 2-space JSX, single quotes, semicolons, and trailing commas. Prefer `camelCase` for functions, `PascalCase` for React components, and domain suffixes for shared helpers (e.g., `ledger_store.ts`). Keep hooks/services as thin orchestration layers so most `lib/` utilities remain pure and testable.

## Testing Guidelines
Refer to `docs/08-testing/testing-strategy.md` for the pyramid: 60% unit, 30% integration, 10% Playwright E2E. `bunfig.toml` enforces ≥80% statements/lines; aim for 85% before review. Place fixtures in `tests/fixtures/` and name specs after the unit under test (`tests/unit/chunking.test.ts`). Use MSW and Testcontainers to simulate Supabase and OpenRouter, and fail fast when evidence-ledger verdicts or schema guards regress.

## Commit & Pull Request Guidelines
Follow Conventional Commits scoped to the touched directory (`feat(src/lib): add ledger verdict parser`). Every PR should: summarize the business question answered, cite the relevant constitution section, attach before/after metrics or screenshots, list manual test commands (e.g., `bun run lint && bun test`), and document privacy or key-handling considerations. Keep commits limited to one surface (frontend, backend glue, docs) to simplify review.

## Security & Configuration Tips
Secrets for Supabase, OpenRouter, and OpenAI belong in `.env`—never commit credentials or raw Evidence Ledger exports containing user uploads. Document any new environment key in the PR body and scrub logs before sharing traces externally. Use Supabase dashboards (not ad-hoc SQL) for destructive operations, and confirm that uploaded documents are deleted per retention rules in `docs/02-business-logic/evidence-ledger.md`.
