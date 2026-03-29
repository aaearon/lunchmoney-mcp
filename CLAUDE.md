# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test Commands

```bash
npm run build              # TypeScript compile (tsc) to dist/
npm run dev                # Run from source with tsx
npm test                   # Run all tests once (vitest run)
npm run test:watch         # Vitest in watch mode
npm run test:coverage      # Coverage report; thresholds: 90% lines/functions/statements, 75% branches
npx vitest run tests/tools/plaid.test.ts   # Run a single test file
```

CI runs on Node 20 and 22. Linux requires `libsecret-1-dev` for the `keytar` native module.

## Architecture

This is an MCP (Model Context Protocol) server for the Lunch Money personal finance API, built with **FastMCP**. It supports two transport modes: **stdio** (local, single-user) and **HTTP** (remote, multi-user with OAuth 2.1).

### Request Flow

1. **CLI** (`src/cli.ts`) -- parses args, resolves transport mode, wires up auth provider and session store, calls `createServer()`/`startServer()`.
2. **Server** (`src/server.ts`) -- creates a `FastMCP` instance, builds v1 + v2 HTTP clients and the API facade, registers all 37 tools.
3. **API Facade** (`src/api/facade.ts`) -- single object with domain-namespaced methods (`api.transactions.list()`, `api.categories.create()`, etc.). Each method routes to v1 or v2 and applies mappers. This is where all versioning logic lives.
4. **HTTP Client** (`src/api/http-client.ts`) -- shared `HttpClient` class parameterized by `{ baseUrl, accessToken, parseError }`. Two instances: v1 (`dev.lunchmoney.app/v1`) and v2 (`api.lunchmoney.dev/v2`).
5. **Mappers** (`src/api/mappers/`) -- pure functions that translate between v2 wire formats and MCP-facing types. Only for domains where shapes diverge (assets, categories, transactions, recurring).
6. **Credential Store** (`src/credential-store.ts`) -- tries OS keychain via `keytar` first, falls back to `LUNCH_MONEY_API_TOKEN` env var.
7. **Session Store** (`src/session-store.ts`) -- encrypted file-based OAuth session storage (AES-256-GCM), encryption key in keychain.

### API Version Routing

| Domain | v2 | v1 holdouts |
|--------|-----|-------------|
| User, Tags, Plaid, Assets, Categories, Transactions | All operations | None |
| Budgets | PUT | GET, POST, DELETE |
| Recurring Items | GET | Create, Update, Delete |

### Tool Modules

Each file in `src/tools/` registers tools for one Lunch Money API domain. Tools receive the API facade (`api: LunchMoneyApi`) and call domain methods. Tools do not know about API versions. Zod schemas from `src/schemas/` validate input; types from `src/types/` define the MCP-facing contract.

### Auth Providers

`src/auth-provider.ts` is a factory that returns a FastMCP OAuth provider (Google, GitHub, CyberArk, or custom) based on the `AUTH_PROVIDER` env var. Only used in HTTP mode.

## Testing Conventions

- Tests live in `tests/` mirroring `src/` structure.
- Tool tests mock the API facade (`createMockApi()`) not HTTP requests. Mapper tests use pure function assertions.
- Use `formatErrorForMCP()` from `src/utils/errors.ts` for error handling in tools.
- Every new module must have tests. Coverage must stay above 90%.

## Code Conventions

- ES modules throughout (`import`/`export`), TypeScript strict mode.
- Zod for all tool input validation.
- `type: "module"` in package.json; use `.js` extensions in import paths (even for `.ts` source files).

## Context7 Library IDs (for API documentation lookup)

- **Lunch Money API v1**: `/lunch-money/developers` or `/websites/lunchmoney_dev`
- **Lunch Money API v2**: `/openapi/alpha_lunchmoney_dev_v2_openapi`
