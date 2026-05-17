# goal-opencode

Codex-style long-running goal mode for [OpenCode](https://opencode.ai), with a sidebar widget that surfaces the active goal in the TUI.

## Features

- `/goal <objective>` starts a goal-bound session. The plugin keeps prompting the model until the goal is achieved, paused, or cleared.
- Sidebar widget shows the active goal: objective, status, and elapsed time.
- Auto-clear on completion: when the model emits `::GOAL_DONE::` after `update_goal` succeeds, the goal is cleared silently and continuation stops.
- Interrupt-aware: pressing **Esc** while the model is responding pauses the goal and freezes auto-continuation. The next user message resumes it.
- Hard cap: 3 consecutive idle continuations auto-pause the goal so it does not loop forever.
- Per-worktree state, persisted to disk. Goals survive restarts.

---

## Install

### From npm (once published)

```jsonc
// ~/.config/opencode/opencode.json
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "goal-opencode"
  ]
}
```

```jsonc
// ~/.config/opencode/tui.json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": [
    "goal-opencode"
  ]
}
```

OpenCode installs npm packages on the next start. Restart the TUI and the plugin is live.

### From source (recommended while iterating)

```bash
git clone https://github.com/martsallan/goal-opencode.git ~/Projetos/goal-opencode
cd ~/Projetos/goal-opencode
npm install
```

Then point both configs to the absolute path:

```jsonc
// opencode.json
{
  "plugin": ["/home/<user>/Projetos/goal-opencode"]
}
```

```jsonc
// tui.json
{
  "plugin": ["/home/<user>/Projetos/goal-opencode"]
}
```

The same package exposes the server plugin (`.`) and the TUI sidebar plugin (`./tui`). OpenCode auto-resolves the right entry per loader.

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
