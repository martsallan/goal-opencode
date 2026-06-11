# goal-opencode

[![npm version](https://img.shields.io/npm/v/@martsallan/goal-opencode.svg)](https://www.npmjs.com/package/@martsallan/goal-opencode)
[![npm downloads](https://img.shields.io/npm/dm/@martsallan/goal-opencode.svg)](https://www.npmjs.com/package/@martsallan/goal-opencode)
[![CI](https://github.com/martsallan/goal-opencode/actions/workflows/ci.yml/badge.svg)](https://github.com/martsallan/goal-opencode/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Codex-style long-running goal mode for [OpenCode](https://opencode.ai), with a sidebar widget that surfaces the active goal in the TUI.

## Features

- `/goal <objective>` starts a goal-bound session. The plugin keeps prompting the model until the goal is achieved, paused, or cleared.
- Sidebar widget shows the active goal: objective, status, and elapsed time.
- Auto-clear on completion: when the model emits `::GOAL_DONE::` after `update_goal` succeeds, the goal is cleared silently and continuation stops.
- Interrupt-aware: pressing **Esc** while the model is responding pauses the goal and freezes auto-continuation. The next user message resumes it.
- Hard cap: 3 consecutive idle continuations auto-pause the goal so it does not loop forever.
- Compaction-aware: the active objective and completion protocol are re-injected into the compaction prompt, so goals survive context compaction on long sessions.
- Per-worktree state, persisted to disk. Goals survive restarts.

---

## How It Works

When you set a goal with `/goal <objective>`, the plugin enters a continuation loop:

1. **Goal injection**: every model turn receives the objective as system context, so the model stays anchored to it across long sessions.
2. **Auto-continuation**: after each model reply, the plugin checks whether progress was made. If the model stops without finishing, the plugin sends a continuation prompt automatically.
3. **Completion detection**: the model has access to an `update_goal({ status: "complete" })` tool. Once called and followed by the `::GOAL_DONE::` marker, the goal is cleared silently.
4. **Interrupt handling**: pressing Esc pauses the goal as `interrupted`. Your next message resumes it. Use `/goal pause` for a manual pause that requires `/goal resume`.
5. **Stagnation guard**: 3 consecutive idle continuations auto-pause the goal so it never loops forever.

State is persisted per-worktree, so goals survive crashes, restarts, and TUI reloads.

---

## Install

> Requires OpenCode **>= 1.16** (built against `@opencode-ai/plugin` 1.17.x and `@opentui/*` 0.3.4+/0.4.x). For older OpenCode releases, pin `@martsallan/goal-opencode@0.2.4`.

Install locally for the current OpenCode project:

```bash
opencode plugin @martsallan/goal-opencode
```

Install globally:

```bash
opencode plugin -g @martsallan/goal-opencode
```

OpenCode detects both package entrypoints and writes the plugin into the server and TUI config targets.

### Manual Config

If you configure it manually, add the package to both config files.

`opencode.json`:

```jsonc
{
  "plugin": ["@martsallan/goal-opencode"]
}
```

`tui.json`:

```jsonc
{
  "plugin": ["@martsallan/goal-opencode"]
}
```

---

## Commands

| Command | Effect |
| --- | --- |
| `/goal <objective>` | Set or replace the active goal and start auto-continuation. |
| `/goal append <text>` | Append additional context to the current goal. |
| `/goal pause` | Pause the goal manually. Stays paused until `/goal resume`. |
| `/goal resume` | Resume a paused goal. |
| `/goal clear` | Drop the current goal entirely. |
| `/goal` | Print the current goal summary. |

## Tool exposed to the model

- `update_goal({ status: "complete" })` — must be called once the model has audited completion against the objective. After it returns, the model is expected to emit `::GOAL_DONE::` on the final line of its reply, which triggers an automatic `clear`.

## Behaviour cheatsheet

| Situation | Result |
| --- | --- |
| Esc / Ctrl+C while model is replying | Goal → `paused (interrupted)`. Sidebar reflects it. Next user message auto-resumes. |
| Plugin (re)load with a goal still `active` | Treated as a crashed previous session: demoted to `paused (interrupted)`. Same auto-resume rule applies. |
| `/goal pause` (manual) | Goal → `paused (manual)`. Requires `/goal resume`, no auto-resume. |
| 3 consecutive idle continuations | Goal auto-paused as `manual`. Toast: `Goal stalled after 3 idle continuations — paused. Use /goal resume to retry.` |
| Model emits `::GOAL_DONE::` after `update_goal` | Goal cleared silently. |

## State

Goal state is stored as JSON under:

```
$XDG_STATE_HOME/goal-opencode/scope_<sha256-16>/sessions.json
```

Falling back to `~/.local/state/goal-opencode/...` when `XDG_STATE_HOME` is unset. The scope is the git worktree (or current directory). Override with the `GOAL_OPENCODE_STATE_FILE` environment variable.

## Sidebar

The TUI plugin renders a panel for the current session showing:

- Objective (truncated)
- Status (Active / Paused / Complete)
- Elapsed time, ticking every second while active

The status line carries the pause reason when relevant: `Paused (interrupted — next message resumes)` or `Paused (manual)`.

Open the command palette and run `Goal` for a larger dialog with the same fields.

## License

MIT
