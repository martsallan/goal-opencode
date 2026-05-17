import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"
import { createMemo, createSignal, onCleanup, Show } from "solid-js"
import { readFileSync } from "node:fs"
import { createHash } from "node:crypto"
import { homedir } from "node:os"
import { join } from "node:path"

// ──────────────────────────────────────────────
// Sidebar visual do plugin goal-opencode
// state file: $XDG_STATE_HOME/goal-opencode/scope_<sha256-16>/sessions.json
// shape:      { [sessionID]: GoalState }
// ──────────────────────────────────────────────
type GoalStatus = "active" | "paused" | "complete"
type GoalPauseReason = "interrupt" | "command"

type GoalState = {
  objective: string
  status: GoalStatus
  createdAt: number
  updatedAt: number
  activeStartedAt: number | null
  timeUsedSeconds: number
  pauseReason?: GoalPauseReason
}

const STATE_FILE_ENV = "GOAL_OPENCODE_STATE_FILE"

function stableID(prefix: string, seed: string): string {
  return `${prefix}_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}`
}

function defaultStateFile(scope: string): string {
  const root = process.env.XDG_STATE_HOME || join(homedir(), ".local", "state")
  return join(root, "goal-opencode", stableID("scope", scope), "sessions.json")
}

function resolveStateFile(api: TuiPluginApi): string {
  const env = process.env[STATE_FILE_ENV]
  if (env) return env
  const path = api.state.path
  const scope = String(path.worktree ?? path.directory ?? process.cwd())
  return defaultStateFile(scope)
}

function readStateSync(stateFile: string): Record<string, GoalState> {
  try {
    const raw = readFileSync(stateFile, "utf8")
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, GoalState>
    }
  } catch {
    // arquivo ausente, JSON corrompido, etc -> sidebar fica vazia
  }
  return {}
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  return `${m}:${String(s).padStart(2, "0")}`
}

const STATUS_LABEL: Record<GoalStatus, string> = {
  active: "Ativo",
  paused: "Pausado",
  complete: "Concluído",
}

function statusLine(g: GoalState): string {
  if (g.status === "paused") {
    if (g.pauseReason === "interrupt") return "Pausado (interrompido — próxima msg retoma)"
    if (g.pauseReason === "command") return "Pausado (manual)"
    return "Pausado"
  }
  return STATUS_LABEL[g.status]
}

// ──────────────────────────────────────────────
// Componente da sidebar
// ──────────────────────────────────────────────
function GoalSidebar(props: { api: TuiPluginApi; sessionID: string }) {
  const theme = () => props.api.theme.current
  const stateFile = resolveStateFile(props.api)

  // tick a cada 1s para atualizar elapsed e re-ler o arquivo
  const [tick, setTick] = createSignal(Math.floor(Date.now() / 1000))
  const timer = setInterval(() => setTick(Math.floor(Date.now() / 1000)), 1000)
  onCleanup(() => clearInterval(timer))

  const goals = createMemo(() => {
    void tick()
    return readStateSync(stateFile)
  })
  const myGoal = createMemo<GoalState | undefined>(() => goals()[props.sessionID])

  return (
    <Show when={myGoal()}>
      {(goal) => {
        const nowSec = () => tick()
        const elapsed = () => {
          const g = goal()
          if (g.status === "active" && g.activeStartedAt != null) {
            const startSec = Math.floor(g.activeStartedAt / 1000)
            return g.timeUsedSeconds + Math.max(0, nowSec() - startSec)
          }
          return g.timeUsedSeconds
        }

        return (
          <box flexDirection="column" marginTop={1}>
            <text fg={theme().text}>
              <b>🎯 Goal</b>
            </text>
            <text fg={theme().textMuted}>
              {goal().objective.slice(0, 200)}
              {goal().objective.length > 200 ? "…" : ""}
            </text>
            <text fg={
              goal().status === "complete" ? theme().primary :
              goal().status === "paused"
                ? (goal().pauseReason === "interrupt" ? theme().info : theme().warning)
                : theme().success
            }>
              ● {statusLine(goal())}
            </text>
            <text fg={theme().textMuted}>
              ⏱ {formatDuration(elapsed())}
            </text>
          </box>
        )
      }}
    </Show>
  )
}

// ──────────────────────────────────────────────
// Plugin TUI principal
// ──────────────────────────────────────────────
const tui: TuiPlugin = async (api, _options, _meta) => {
  api.slots.register({
    order: 125,
    slots: {
      sidebar_content(_ctx, props) {
        const sid = props.session_id
        if (!sid) return null
        return <GoalSidebar api={api} sessionID={sid} />
      },
    },
  })

  if (api.command) {
    const dispose = api.command.register(() => [
      {
        title: "Goal",
        value: "goal.show",
        category: "Goal",
        description: "Ver objetivo e status da sessão atual",
        onSelect: () => {
          const route = api.route.current
          let sid: string | undefined
          if (route.name === "session") {
            sid = typeof route.params?.sessionID === "string" ? route.params.sessionID : undefined
          }
          if (!sid) return
          const stateFile = resolveStateFile(api)
          const goals = readStateSync(stateFile)
          const goal = goals[sid]
          if (!goal) {
            api.ui.toast({ title: "Goal", message: "Nenhum goal definido nesta sessão.", variant: "info", duration: 3000 })
            return
          }
          api.ui.dialog.setSize("large")
          api.ui.dialog.replace(() => (
            <box flexDirection="column">
              <text fg={api.theme.current.primary}>
                <b>🎯 {goal.objective}</b>
              </text>
              <text fg={api.theme.current.textMuted}>
                Status: {statusLine(goal)}
              </text>
              <text fg={api.theme.current.textMuted}>
                Tempo: {formatDuration(goal.timeUsedSeconds)}
              </text>
            </box>
          ))
          setTimeout(() => api.ui.dialog.clear(), 8000)
        },
      },
    ])
    api.lifecycle.onDispose(dispose)
  }
}

// Plugin module shape exigida pelo opencode TUI loader
const tuiModule: TuiPluginModule = {
  id: "goal-opencode.tui",
  tui,
}

export default tuiModule
