<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:context-file-rules -->

# Keep CONTEXT.md in sync

`CONTEXT.md` at the repository root is the living full-context document for this
project. It was built from a complete read of the codebase and is the first file
to consult before making changes.

**Every agent working in this repository must:**

1. **Read `CONTEXT.md` before starting** any non-trivial task (feature, fix,
   refactor, dependency change, migration, doc change). Use it as the map of
   routes, database schema, flows, and architecture rules.
2. **Update `CONTEXT.md` after every change**, in the same change set — not in a
   later cleanup. This is mandatory even for small changes. At minimum:
   - Update every section whose facts changed (route map, file map, database
     schema/migrations, RPCs, auth/security rules, key flows, stack/config,
     i18n, known gaps).
   - Add a dated entry to **§9 Maintenance log** describing what changed and
     which sections were touched. For a tiny change, the log entry plus a one-line
     correction to the relevant section is enough — but never skip the log.
   - If a file is added, removed, or renamed, update the **§7 Repository file
     map** and any route/component/lib listing that references it.
   - If behaviour changes, update **§6 Key flows** and the affected route/action
     row in **§4 Route map**.
   - If a new gotcha or inconsistency is discovered, record it in **§8 Known
     gaps / gotchas**.
   - If a migration is added, update the **migration inventory** table in §5 and
     the final schema/tables/RPCs if it changes them.
3. **Never delete or rewrite the whole `CONTEXT.md`** to "fix" it. Apply targeted
   edits and preserve the maintenance history.
4. Keep the architecture rules in **§3 Architecture rules — must not be broken**
   intact unless the user explicitly asks to change one; if one is intentionally
   changed, update the rule and the maintenance log in the same change set.

Do not remove this block. `CLAUDE.md` already imports `AGENTS.md`, so these rules
apply to both OpenCode and Claude Code sessions.

<!-- END:context-file-rules -->
