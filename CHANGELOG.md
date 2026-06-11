# Changelog

All notable changes to `@martsallan/goal-opencode` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-06-11

### Changed
- Bumped `@opencode-ai/plugin` and `@opencode-ai/sdk` to `^1.17.3` to track current OpenCode releases.
- Raised the `@opentui/*` peer floor to `>=0.3.4` (matching `@opencode-ai/plugin` 1.17.x) and pinned dev copies to `0.4.0`. No source changes were required — the plugin and TUI hook surface is unchanged across 1.16 → 1.17.

## [0.3.0] - 2026-06-05

### Changed
- Bumped `@opencode-ai/plugin` and `@opencode-ai/sdk` to `^1.16.2` to track current OpenCode releases.
- Moved `@opentui/*` and `solid-js` to `peerDependencies` (`>=0.3.2`), matching how the OpenCode TUI host provides these at runtime. Pinned dev copies (`@opentui/core`, `@opentui/keymap`, `@opentui/solid` `0.3.2`) keep `tsc` and tests reproducible.
- Migrated the command-palette entry from the deprecated `api.command.register` to `api.keymap.registerLayer`. The legacy bridge is kept as a fallback so the plugin still loads on older hosts.

### Added
- `experimental.session.compacting` hook: re-injects the active objective, elapsed time, and completion protocol into the compaction prompt so long-running goals survive context compaction.
- `experimental.text.complete` hook: detects the `::GOAL_DONE::` marker on the streamed reply, letting auto-clear skip the extra message fetch when the marker is already seen.
- `@opentui/keymap` dependency, now required by `@opencode-ai/plugin >= 1.16`.
- Unit test suite for `src/core.ts` (`bun test`, 24 cases) covering command parsing, time accounting, prompt rendering, and XML escaping.
- CI `test` job running `bun test` alongside the existing typecheck.



### Added
- README badges (npm version, downloads, CI status, license).
- "How It Works" section explaining the continuation loop, completion detection, and interrupt handling.
- `CHANGELOG.md` documenting release history.

## [0.2.3] - 2026-05-17

### Added
- Automated npm publish via GitHub Actions workflow on tag push (`v*`).
- npm provenance: published artifacts now include verifiable supply-chain attestation linking the package to this repository.

### Fixed
- Workflow publish job now runs successfully end-to-end with the `NPM_TOKEN` secret.

## [0.2.2] - 2026-05-17

### Added
- `.github/workflows/publish.yml` for tag-driven npm publish with `--provenance --access public`.

## [0.2.1] - 2026-05-17

### Changed
- Package renamed to scoped `@martsallan/goal-opencode`. The unscoped `goal-opencode` package on npm has been deprecated with a redirect notice.
- README install commands updated to reflect the scoped name.

## [0.2.0] - 2026-05-17

### Changed
- Internationalized the entire codebase to English: TUI strings, README, source comments.
- TypeScript typecheck passes cleanly after parser fix in `src/index.ts`.

### Added
- `.github/workflows/ci.yml` running `tsc --noEmit` on push and pull requests.

## [0.1.0] - 2026-05-17

### Added
- Initial release of the unified `goal-opencode` plugin.
- `/goal <objective>` command with subcommands: `append`, `pause`, `resume`, `clear`, and bare `/goal` for status.
- Auto-continuation loop that re-prompts the model until the goal is achieved, paused, or cleared.
- Auto-clear on completion via the `::GOAL_DONE::` marker emitted after `update_goal({ status: "complete" })`.
- Hard cap of 3 consecutive idle continuations to prevent infinite loops.
- Interrupt handling: `Esc` / `Ctrl+C` during a streaming reply pauses the goal as `interrupted` and the next user message auto-resumes.
- Manual pause via `/goal pause` requires explicit `/goal resume` (no auto-resume).
- Startup demotion: goals still marked `active` when the plugin loads are moved to `paused (interrupted)` to recover gracefully from crashes.
- Per-worktree persistent state under `$XDG_STATE_HOME/goal-opencode/scope_<sha256-16>/sessions.json`. Override via `GOAL_OPENCODE_STATE_FILE`.
- TUI sidebar widget showing objective, status, pause reason, and live-ticking elapsed time.
- Command palette `Goal` dialog with the same data in a larger panel.
- `update_goal` tool exposed to the model for explicit completion signaling.

[0.3.1]: https://github.com/martsallan/goal-opencode/releases/tag/v0.3.1
[0.3.0]: https://github.com/martsallan/goal-opencode/releases/tag/v0.3.0
[0.2.4]: https://github.com/martsallan/goal-opencode/releases/tag/v0.2.4
[0.2.3]: https://github.com/martsallan/goal-opencode/releases/tag/v0.2.3
[0.2.2]: https://github.com/martsallan/goal-opencode/releases/tag/v0.2.2
[0.2.1]: https://github.com/martsallan/goal-opencode/releases/tag/v0.2.1
[0.2.0]: https://github.com/martsallan/goal-opencode/releases/tag/v0.2.0
[0.1.0]: https://github.com/martsallan/goal-opencode/releases/tag/v0.1.0
