import {
  Activity,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Cpu,
  ExternalLink,
  FolderGit2,
  Home,
  ListChecks,
  MessageSquareText,
  Play,
  PlugZap,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Wrench,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

type HealthState = 'healthy' | 'attention' | 'blocked' | 'unknown'
type SectionId = 'home' | 'chat' | 'doctor' | 'projects' | 'jobs' | 'skills' | 'runs' | 'settings'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  command?: string
  action?: {
    label: string
    section: SectionId
  }
}

type ReviewDraft = {
  title: string
  summary: string
  command: string
  artifactLabel?: string
  kind?: 'command' | 'skill' | 'plugin' | 'skill-install'
  nextStep: string
  commandId?:
    | 'agent.add'
    | 'cron.add'
    | 'gateway.restart'
    | 'security.audit.deep'
    | 'model.main.set'
    | 'plugin.discord.install'
  params?: Record<string, string>
  skillParams?: SkillDraftInput
  pluginParams?: PluginPackInput
  skillInstallName?: string
  status?: 'draft' | 'ready' | 'running' | 'succeeded' | 'failed'
  resultMessage?: string
}

type SavedDraft = ReviewDraft & {
  id: string
  savedAt: string
}

type CommandRunResult = {
  ok: boolean
  dryRun?: boolean
  stdout?: string
  stderr?: string
  error?: string
  preview?: string
  finishedAt?: string
}

type SkillSaveResult = {
  ok: boolean
  savedAt?: string
  skillName?: string
  displayName?: string
  path?: string
  metadataPath?: string
  message?: string
  error?: string
}

type SkillInstallResult = {
  ok: boolean
  skillName?: string
  installedAt?: string
  path?: string
  alreadyInstalled?: boolean
  message?: string
  error?: string
}

type PluginPackInput = {
  pluginName: string
  displayName: string
  skillNames: string[]
}

type PluginPackSaveResult = {
  ok: boolean
  savedAt?: string
  pluginName?: string
  displayName?: string
  skillCount?: number
  path?: string
  files?: string[]
  message?: string
  error?: string
}

type AgentSummary = {
  id: string
  name: string
  workspace: string
  model: string
  heartbeat: string
  status: string
}

type JobSummary = {
  id: string
  title: string
  schedule: string
  status: string
}

type SessionSummary = {
  key: string
  model: string
  runtime: string
  age: string
  tokens: string
}

type DoctorCheck = {
  id: string
  title: string
  detail: string
  state: HealthState
  command?: string
}

type CompatibilityCheck = DoctorCheck & {
  source: string
}

type Overview = {
  adapter?: {
    name: string
    schemaVersion: string
    strategy: string
  }
  generatedAt: string
  gateway: {
    state: HealthState
    label: string
    detail: string
    url: string
  }
  openclaw: {
    version: string
    launchAgent: string
    update: string
  }
  counts: {
    agents: number
    jobs: number
    sessions: number
    warnings: number
    compatibilityWarnings?: number
    securityWarnings?: number
    riskSignals?: number
  }
  checks: DoctorCheck[]
  compatibility: {
    posture: HealthState
    summary: string
    checks: CompatibilityCheck[]
    signals: {
      version: string
      channel: string
      update: string
      statusCommandOk: boolean
      gatewayProbeOk: boolean
      security?: {
        found: boolean
        critical: number
        warn: number
        info: number
      }
      generatedAt: string
    }
  }
  agents: AgentSummary[]
  jobs: JobSummary[]
  sessions: SessionSummary[]
}

type SkillQuality = {
  state: HealthState
  label: string
  summary: string
  warnings: string[]
  signals: string[]
}

type SkillSummary = {
  id: string
  name: string
  title: string
  description: string
  path: string
  root: string
  quality: SkillQuality
  signals: string[]
}

type SkillWorkshop = {
  generatedAt: string
  roots: string[]
  counts: {
    skills: number
    needsAttention: number
    withExamples: number
    withScripts: number
    savedDrafts: number
  }
  skills: SkillSummary[]
  drafts: {
    skillName: string
    displayName: string
    savedAt: string
    path: string
    installState: string
    installedPath: string
  }[]
  draftRoot: string
  pluginReadiness: {
    state: HealthState
    summary: string
    nextStep: string
  }
}

type SkillDraftInput = {
  skillName: string
  displayName: string
  goal: string
  boundaries: string
  example: string
}

type WorkspaceSuggestion = {
  name: string
  path: string
  kind: string
}

const emptyOverview: Overview = {
  adapter: {
    name: 'claw-cockpit-local-adapter',
    schemaVersion: 'unknown',
    strategy: 'cli-and-local-state',
  },
  generatedAt: '',
  gateway: {
    state: 'unknown',
    label: 'Checking OpenClaw',
    detail: 'The local adapter has not returned yet.',
    url: 'ws://127.0.0.1:18789',
  },
  openclaw: {
    version: 'unknown',
    launchAgent: 'unknown',
    update: 'unknown',
  },
  counts: {
    agents: 0,
    jobs: 0,
    sessions: 0,
    warnings: 0,
    compatibilityWarnings: 0,
    securityWarnings: 0,
    riskSignals: 0,
  },
  checks: [],
  compatibility: {
    posture: 'unknown',
    summary: 'Compatibility has not been checked yet.',
    checks: [],
    signals: {
      version: 'unknown',
      channel: 'unknown',
      update: 'unknown',
      statusCommandOk: false,
      gatewayProbeOk: false,
      security: {
        found: false,
        critical: 0,
        warn: 0,
        info: 0,
      },
      generatedAt: '',
    },
  },
  agents: [],
  jobs: [],
  sessions: [],
}

const emptySkillWorkshop: SkillWorkshop = {
  generatedAt: '',
  roots: [],
  counts: {
    skills: 0,
    needsAttention: 0,
    withExamples: 0,
    withScripts: 0,
    savedDrafts: 0,
  },
  skills: [],
  drafts: [],
  draftRoot: '',
  pluginReadiness: {
    state: 'unknown',
    summary: 'Skill inventory has not been checked yet.',
    nextStep: 'Refresh the cockpit to scan local skill folders.',
  },
}

const navItems = [
  { id: 'home', label: 'Check OpenClaw', task: 'Status, warnings, next move', icon: Home },
  { id: 'chat', label: 'Plan a change', task: 'Draft setup before it runs', icon: MessageSquareText },
  { id: 'doctor', label: 'Fix warnings', task: 'Translate setup issues', icon: Wrench },
  { id: 'projects', label: 'Create helper', task: 'OpenClaw agent setup', icon: FolderGit2 },
  { id: 'jobs', label: 'Add reminder', task: 'Scheduled OpenClaw work', icon: Clock3 },
  { id: 'skills', label: 'Build skills', task: 'Skill workshop drafts', icon: Sparkles },
  { id: 'runs', label: 'Review runs', task: 'Sessions and proof', icon: Activity },
  { id: 'settings', label: 'Safety & drift', task: 'Compatibility checks', icon: Settings },
] satisfies { id: SectionId; label: string; task: string; icon: typeof Home }[]

const sectionCopy = {
  home: {
    label: 'Check OpenClaw',
    title: 'Everything OpenClaw sees today.',
    detail: 'A calm read on what is working, what needs attention, and what is safe to do next.',
  },
  chat: {
    label: 'Plan a change',
    title: 'Plan changes before OpenClaw runs them.',
    detail: 'This is not your live OpenClaw chat. It drafts and reviews setup steps; use OpenClaw Chat for normal conversations.',
  },
  doctor: {
    label: 'Fix warnings',
    title: 'Check what needs attention first.',
    detail: 'Warnings are translated into next steps, not dumped on you as raw system noise.',
  },
  projects: {
    label: 'Create helper',
    title: 'Set up a helper without touching config.',
    detail: 'A helper is an OpenClaw agent with a clear job, folder, and safety boundary.',
  },
  jobs: {
    label: 'Add reminder',
    title: 'Turn reminders into safe scheduled work.',
    detail: 'Turn reminders into reviewed OpenClaw jobs before anything is created.',
  },
  skills: {
    label: 'Build skills',
    title: 'Shape OpenClaw with beginner-friendly skills.',
    detail: 'See local skills, draft new SKILL.md files, and package reviewed skill groups.',
  },
  runs: {
    label: 'Review runs',
    title: 'See what happened and what changed.',
    detail: 'Recent sessions give you proof instead of guesswork.',
  },
  settings: {
    label: 'Safety & drift',
    title: 'Keep control without guessing.',
    detail: 'The cockpit stays review-first and runs only allowlisted setup actions.',
  },
} satisfies Record<SectionId, { label: string; title: string; detail: string }>

const projectTemplates = [
  {
    name: 'Repo helper',
    helperName: 'repo-helper',
    detail: 'Keeps one Git repo organized, checks status, and writes handoff notes.',
    command: 'openclaw agents add repo-helper --workspace /path/to/repo --non-interactive',
  },
  {
    name: 'Launch checker',
    helperName: 'launch-checker',
    detail: 'Runs build, env, route, and deployment checks before a release.',
    command: 'openclaw agents add launch-checker --workspace /path/to/repo --non-interactive',
  },
  {
    name: 'Research assistant',
    helperName: 'research-assistant',
    detail: 'Collects docs, compares sources, and summarizes decisions.',
    command: 'openclaw agents add research-assistant --workspace /path/to/workspace --non-interactive',
  },
]

const jobTemplates = [
  {
    name: 'Morning health check',
    schedule: 'Every day at 8:00 AM',
    cron: '0 8 * * *',
    message: 'Run OpenClaw health check and summarize blockers',
    command:
      'openclaw cron add --name "Morning health check" --agent main --message "Run OpenClaw health check and summarize blockers" --cron "0 8 * * *" --tz America/New_York',
  },
  {
    name: 'Repo drift watch',
    schedule: 'Every weekday at 9:30 AM',
    cron: '30 9 * * 1-5',
    message: 'Check active repo status and list uncommitted work',
    command:
      'openclaw cron add --name "Repo drift watch" --agent main --message "Check active repo status and list uncommitted work" --cron "30 9 * * 1-5" --tz America/New_York',
  },
  {
    name: 'Memory sweep',
    schedule: 'Every Friday afternoon',
    cron: '0 15 * * 5',
    message: 'Review helper memories and flag stale notes',
    command:
      'openclaw cron add --name "Memory sweep" --agent main --message "Review helper memories and flag stale notes" --cron "0 15 * * 5" --tz America/New_York',
  },
]

const starterPrompts = [
  {
    title: 'Set up a helper for this repo',
    prompt: 'Set up a helper for this repo',
    reply:
      'Good first move. I would start by checking which folder you want OpenClaw to watch, then draft one helper with a clear name, model, and job description. Nothing needs to run until you review the command.',
    command: 'openclaw agents add repo-helper --workspace /path/to/repo --non-interactive',
    action: { label: 'Open helpers', section: 'projects' as SectionId },
  },
  {
    title: 'Explain my OpenClaw warning',
    prompt: 'Explain what my OpenClaw warning means',
    reply:
      'Your warning is a setup note, not a crash. The cockpit can show the plain-English reason first, then the exact command or setting that needs attention underneath it.',
    action: { label: 'Open setup check', section: 'doctor' as SectionId },
  },
  {
    title: 'Create a morning check',
    prompt: 'Create a morning health check job',
    reply:
      'This would become a small scheduled check that looks at your OpenClaw health, active jobs, and recent sessions, then gives you a short morning summary.',
    command:
      'openclaw cron add --name "Morning health check" --agent main --message "Run OpenClaw health check and summarize blockers" --cron "0 8 * * *" --tz America/New_York',
    action: { label: 'Open scheduled work', section: 'jobs' as SectionId },
  },
  {
    title: 'Helpers vs reminders',
    prompt: 'Help me understand helpers vs reminders',
    reply:
      'Think of a helper as the worker and a reminder as the schedule. The helper knows what kind of work to do. The reminder tells OpenClaw when to ask for that work.',
    action: { label: 'Open overview', section: 'home' as SectionId },
  },
]

const openingMessage: ChatMessage = {
  id: 'opening',
  role: 'assistant',
  text:
    "I'm Claw Cockpit, not the live OpenClaw chat. Tell me what setup you want to plan, and I'll turn it into a safe review step before anything runs.",
}

function stateLabel(state: HealthState) {
  if (state === 'healthy') return 'Healthy'
  if (state === 'attention') return 'Needs attention'
  if (state === 'blocked') return 'Blocked'
  return 'Unknown'
}

function quoteArg(value: string) {
  return /^[A-Za-z0-9_./:-]+$/.test(value) ? value : JSON.stringify(value)
}

function agentPreview(helperName: string, workspace: string) {
  return `openclaw agents add ${quoteArg(helperName)} --workspace ${quoteArg(workspace)} --non-interactive`
}

function cronPreview(reminderName: string, agent: string, message: string, cron: string, timezone: string) {
  return `openclaw cron add --name ${quoteArg(reminderName)} --agent ${quoteArg(agent)} --message ${quoteArg(message)} --cron ${quoteArg(cron)} --tz ${quoteArg(timezone)}`
}

function warningGuide(check: DoctorCheck) {
  if (check.state === 'healthy') {
    return {
      meaning: 'This part is working.',
      ignore: 'Yes. Keep it as proof that the setup is healthy.',
      next: 'No action needed right now.',
    }
  }
  if (check.state === 'blocked') {
    return {
      meaning: 'This can stop OpenClaw or Cockpit from doing useful work.',
      ignore: 'No. Fix or understand this before adding more automation.',
      next: check.command ? 'Review the command below before running anything.' : 'Open the setup area and repair this first.',
    }
  }
  return {
    meaning: 'This is a setup signal, not necessarily a crash.',
    ignore: 'Maybe for a short time, but give it a next step so it does not become mystery noise.',
    next: check.command ? 'Review the suggested command when you are ready.' : 'Use the detail text to decide the smallest safe fix.',
  }
}

function warningRecipe(check: DoctorCheck): Pick<ReviewDraft, 'command' | 'commandId' | 'params' | 'nextStep'> | null {
  if (check.id === 'gateway' || check.id === 'service' || check.command === 'openclaw gateway restart') {
    return {
      command: 'openclaw gateway restart',
      commandId: 'gateway.restart',
      params: {},
      nextStep: 'Restart only after confirming OpenClaw is the local instance you want Cockpit to repair.',
    }
  }
  if (check.id === 'security-posture' || check.command === 'openclaw security audit --deep') {
    return {
      command: 'openclaw security audit --deep',
      commandId: 'security.audit.deep',
      params: {},
      nextStep: 'Run the audit, then use the result as the current source truth before changing settings.',
    }
  }
  if (check.id === 'main-model') {
    return {
      command: 'openclaw config set agents.list[0].model \'{"primary":"openai/gpt-5.4"}\' --strict-json',
      commandId: 'model.main.set',
      params: { model: 'openai/gpt-5.4' },
      nextStep: 'Use this only when you want the main helper model changed to the reviewed default.',
    }
  }
  if (check.id === 'discord') {
    return {
      command: 'openclaw plugins install @openclaw/discord',
      commandId: 'plugin.discord.install',
      params: { pluginPackage: '@openclaw/discord' },
      nextStep: 'Install only if you actually want Discord support enabled for this OpenClaw instance.',
    }
  }
  return null
}

function App() {
  const [activeSection, setActiveSection] = useState<SectionId>('chat')
  const [overview, setOverview] = useState<Overview>(emptyOverview)
  const [skillWorkshop, setSkillWorkshop] = useState<SkillWorkshop>(emptySkillWorkshop)
  const [workspaceSuggestions, setWorkspaceSuggestions] = useState<WorkspaceSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([openingMessage])
  const [draftMessage, setDraftMessage] = useState('')
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null)
  const [savedDrafts, setSavedDrafts] = useState<SavedDraft[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('claw-cockpit-reviewed-drafts') ?? '[]') as SavedDraft[]
    } catch {
      return []
    }
  })
  const [reviewNotice, setReviewNotice] = useState('')
  const [runResult, setRunResult] = useState<CommandRunResult | null>(null)
  const [isRunningDraft, setIsRunningDraft] = useState(false)

  const refresh = async () => {
    setIsLoading(true)
    setError('')
    try {
      const [overviewResponse, skillsResponse, workspacesResponse] = await Promise.all([
        fetch('/api/overview'),
        fetch('/api/skills'),
        fetch('/api/workspaces'),
      ])
      if (!overviewResponse.ok) throw new Error(`Adapter returned HTTP ${overviewResponse.status}`)
      if (!skillsResponse.ok) throw new Error(`Skills scan returned HTTP ${skillsResponse.status}`)
      if (!workspacesResponse.ok) throw new Error(`Workspace scan returned HTTP ${workspacesResponse.status}`)
      setOverview((await overviewResponse.json()) as Overview)
      setSkillWorkshop((await skillsResponse.json()) as SkillWorkshop)
      const workspaces = (await workspacesResponse.json()) as { workspaces: WorkspaceSuggestion[] }
      setWorkspaceSuggestions(workspaces.workspaces ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the local adapter.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    Promise.all([fetch('/api/overview'), fetch('/api/skills'), fetch('/api/workspaces')])
      .then(async ([overviewResponse, skillsResponse, workspacesResponse]) => {
        if (!overviewResponse.ok) throw new Error(`Adapter returned HTTP ${overviewResponse.status}`)
        if (!skillsResponse.ok) throw new Error(`Skills scan returned HTTP ${skillsResponse.status}`)
        if (!workspacesResponse.ok) throw new Error(`Workspace scan returned HTTP ${workspacesResponse.status}`)
        return {
          overview: (await overviewResponse.json()) as Overview,
          skills: (await skillsResponse.json()) as SkillWorkshop,
          workspaces: ((await workspacesResponse.json()) as { workspaces: WorkspaceSuggestion[] }).workspaces ?? [],
        }
      })
      .then((data) => {
        if (!cancelled) {
          setOverview(data.overview)
          setSkillWorkshop(data.skills)
          setWorkspaceSuggestions(data.workspaces)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not reach the local adapter.')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('claw-cockpit-reviewed-drafts', JSON.stringify(savedDrafts.slice(0, 20)))
  }, [savedDrafts])

  const priorityChecks = useMemo(() => {
    const checks = overview.checks.length > 0 ? overview.checks : emptyOverview.checks
    return [...checks].sort((a, b) => {
      const score = { blocked: 0, attention: 1, unknown: 2, healthy: 3 }
      return score[a.state] - score[b.state]
    })
  }, [overview.checks])

  const currentSection = sectionCopy[activeSection]

  const addStarterPrompt = (starter: (typeof starterPrompts)[number]) => {
    setMessages((current) => [
      ...current,
      {
        id: `${starter.prompt}-user-${Date.now()}`,
        role: 'user',
        text: starter.prompt,
      },
      {
        id: `${starter.prompt}-assistant-${Date.now()}`,
        role: 'assistant',
        text: starter.reply,
        command: starter.command,
        action: starter.action,
      },
    ])
  }

  const sendDraftMessage = () => {
    const trimmed = draftMessage.trim()
    if (!trimmed) return

    const lower = trimmed.toLowerCase()
    const command = lower.includes('job') || lower.includes('schedule')
      ? 'openclaw cron add --name "Reviewed reminder" --agent main --message "Describe the reminder in plain English" --cron "0 8 * * *" --tz America/New_York'
      : lower.includes('repo') || lower.includes('agent') || lower.includes('project') || lower.includes('helper')
        ? 'openclaw agents add repo-helper --workspace /path/to/repo --non-interactive'
        : undefined

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: trimmed,
      },
      {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text:
          'I would turn that into a short review step first: what folder OpenClaw should use, what the helper or reminder should be called, and what command will run only after you approve it.',
        command,
        action: { label: 'Open setup check', section: 'doctor' },
      },
    ])
    setDraftMessage('')
  }

  const openReview = (draft: ReviewDraft) => {
    setReviewNotice('')
    setRunResult(null)
    setReviewDraft(draft)
  }

  const markReviewReady = async () => {
    if (!reviewDraft) return
    setIsRunningDraft(true)
    setRunResult(null)
    try {
      if (reviewDraft.kind === 'skill') {
        const response = await fetch('/api/skills/drafts/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            confirm: 'SAVE',
            params: reviewDraft.skillParams ?? {},
          }),
        })
        const result = (await response.json()) as SkillSaveResult
        if (!response.ok || !result.ok) throw new Error(result.error || `Skill save returned HTTP ${response.status}`)
        setSavedDrafts((current) => [
          {
            ...reviewDraft,
            id: `${reviewDraft.title}-${Date.now()}`,
            savedAt: result.savedAt ? new Date(result.savedAt).toLocaleTimeString() : 'just now',
            status: 'ready',
            resultMessage: result.path,
          },
          ...current,
        ])
        setReviewNotice(`Saved skill draft: ${result.path}`)
        setReviewDraft(null)
        await refresh()
        return
      }

      if (reviewDraft.kind === 'plugin') {
        const response = await fetch('/api/skills/plugin-pack/save', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            confirm: 'SAVE',
            ...(reviewDraft.pluginParams ?? {}),
          }),
        })
        const result = (await response.json()) as PluginPackSaveResult
        if (!response.ok || !result.ok) throw new Error(result.error || `Plugin pack save returned HTTP ${response.status}`)
        setSavedDrafts((current) => [
          {
            ...reviewDraft,
            id: `${reviewDraft.title}-${Date.now()}`,
            savedAt: result.savedAt ? new Date(result.savedAt).toLocaleTimeString() : 'just now',
            status: 'ready',
            resultMessage: result.path,
          },
          ...current,
        ])
        setReviewNotice(`Saved plugin pack: ${result.path}`)
        setReviewDraft(null)
        return
      }

      if (reviewDraft.kind === 'skill-install') {
        const response = await fetch('/api/skills/drafts/install', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            confirm: 'INSTALL',
            skillName: reviewDraft.skillInstallName,
          }),
        })
        const result = (await response.json()) as SkillInstallResult
        if (!response.ok || !result.ok) throw new Error(result.error || `Skill install returned HTTP ${response.status}`)
        setSavedDrafts((current) => [
          {
            ...reviewDraft,
            id: `${reviewDraft.title}-${Date.now()}`,
            savedAt: result.installedAt ? new Date(result.installedAt).toLocaleTimeString() : 'just now',
            status: 'ready',
            resultMessage: result.path,
          },
          ...current,
        ])
        setReviewNotice(result.alreadyInstalled ? `Skill already installed: ${result.path}` : `Installed skill: ${result.path}`)
        setReviewDraft(null)
        await refresh()
        return
      }

      setSavedDrafts((current) => [
        {
          ...reviewDraft,
          id: `${reviewDraft.title}-${Date.now()}`,
          savedAt: 'just now',
        },
        ...current,
      ])
      setReviewNotice('Saved as a reviewed draft. Next safest move: choose the real folder, then keep it in review until running is enabled.')
      setReviewDraft(null)
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : 'Could not save the reviewed draft.')
    } finally {
      setIsRunningDraft(false)
    }
  }

  const runReviewedDraft = async () => {
    if (!reviewDraft?.commandId) return
    setIsRunningDraft(true)
    setRunResult(null)
    try {
      const response = await fetch('/api/commands/run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          commandId: reviewDraft.commandId,
          params: reviewDraft.params ?? {},
          confirm: 'RUN',
        }),
      })
      const result = (await response.json()) as CommandRunResult
      setRunResult(result)
      setSavedDrafts((current) => [
        {
          ...reviewDraft,
          id: `${reviewDraft.title}-${Date.now()}`,
          savedAt: result.finishedAt ? new Date(result.finishedAt).toLocaleTimeString() : 'just now',
          status: result.ok ? 'succeeded' : 'failed',
          resultMessage: result.ok ? result.stdout || 'Command completed.' : result.error || 'Command failed.',
        },
        ...current,
      ])
      setReviewNotice(result.ok ? 'Reviewed command completed. Refreshing local OpenClaw state.' : 'Reviewed command failed. See the drawer for details.')
      await refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Command request failed.'
      setRunResult({ ok: false, error: message })
      setReviewNotice(message)
    } finally {
      setIsRunningDraft(false)
    }
  }

  const draftSkill = async (input: SkillDraftInput) => {
    setReviewNotice('')
    setRunResult(null)
    try {
      const response = await fetch('/api/skills/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      const draft = await response.json()
      if (!response.ok) throw new Error(draft.error || `Skills draft returned HTTP ${response.status}`)
      openReview({
        title: draft.displayName,
        summary: `Saves a reviewed copy under Cockpit skill drafts. This does not install the skill yet.`,
        command: draft.preview,
        artifactLabel: 'SKILL.md preview',
        kind: 'skill',
        skillParams: input,
        nextStep: 'Save the reviewed draft first. Install can come later through a separate reviewed step.',
      })
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : 'Could not draft the skill.')
    }
  }

  const installSkill = (skillName: string) => {
    setReviewNotice('')
    const draft = skillWorkshop.drafts.find((item) => item.skillName === skillName)
    openReview({
      title: `Install ${draft?.displayName ?? skillName}`,
      summary: `Copies the saved ${draft?.displayName ?? skillName} draft into the configured skills folder. It refuses to overwrite a different existing SKILL.md file.`,
      command: `copy ${draft?.path ?? `${skillName}/SKILL.md`} -> ~/.codex/skills/${skillName}/SKILL.md`,
      artifactLabel: 'Install preview',
      kind: 'skill-install',
      skillInstallName: skillName,
      nextStep: 'Install only after you recognize the saved draft and the target skill folder.',
    })
  }

  const draftPluginPack = async (skillNames: string[]) => {
    setReviewNotice('')
    setRunResult(null)
    const pluginParams = {
      pluginName: 'claw-cockpit-starter-pack',
      displayName: 'Claw Cockpit Starter Pack',
      skillNames,
    }
    try {
      const response = await fetch('/api/skills/plugin-pack/draft', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pluginParams),
      })
      const draft = await response.json()
      if (!response.ok) throw new Error(draft.error || `Plugin draft returned HTTP ${response.status}`)
      openReview({
        title: draft.displayName,
        summary: `Writes a plugin pack with ${draft.skillCount} saved skill draft${draft.skillCount === 1 ? '' : 's'} after this review step.`,
        command: draft.preview,
        artifactLabel: 'Plugin pack preview',
        kind: 'plugin',
        pluginParams,
        nextStep: 'Save only after the manifest and included skill drafts look right.',
      })
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : 'Could not draft the plugin pack.')
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={19} />
          </div>
          <div>
            <strong>Claw Cockpit</strong>
            <span>Task layer for OpenClaw</span>
          </div>
        </div>

        <a className="openclaw-chat-link" href="http://127.0.0.1:18789/chat?session=main" target="_blank" rel="noreferrer">
          <MessageSquareText size={17} />
          <span>
            <strong>Open OpenClaw Chat</strong>
            <small>Use this for normal agent conversations</small>
          </span>
          <ExternalLink size={15} />
        </a>

        <div className="sidebar-section-title">Cockpit tasks</div>

        <nav aria-label="OpenClaw task navigation">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={activeSection === item.id ? 'nav-item active' : 'nav-item'}
                type="button"
                onClick={() => setActiveSection(item.id)}
              >
                <Icon size={18} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.task}</small>
                </span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <p>Review-first by default. Runnable setup actions use allowlisted local commands.</p>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="section-label">{currentSection.label}</p>
            <h1>{currentSection.title}</h1>
            <p className="page-detail">{currentSection.detail}</p>
          </div>
          <div className="top-actions">
            <div className={`status-pill ${overview.gateway.state}`}>
              <PlugZap size={16} />
              <span>{overview.gateway.label}</span>
            </div>
            <button className="icon-button" type="button" onClick={refresh} aria-label="Refresh">
              <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            </button>
          </div>
        </header>

        {error && (
          <div className="error-banner">
            <strong>Adapter problem</strong>
            <span>{error}</span>
          </div>
        )}

        {activeSection === 'chat' ? (
          <ChatPage
            draftMessage={draftMessage}
            messages={messages}
            overview={overview}
            savedDrafts={savedDrafts}
            onDraftChange={setDraftMessage}
            onNavigate={setActiveSection}
            onReviewCommand={openReview}
            onSend={sendDraftMessage}
            onStarter={addStarterPrompt}
          />
        ) : (
          <DashboardPage
            activeSection={activeSection}
            overview={overview}
            onReviewCommand={openReview}
            priorityChecks={priorityChecks}
            onNavigate={setActiveSection}
            savedDrafts={savedDrafts}
            skillWorkshop={skillWorkshop}
            workspaceSuggestions={workspaceSuggestions}
            onDraftSkill={draftSkill}
            onInstallSkill={installSkill}
            onDraftPluginPack={draftPluginPack}
          />
        )}

        {reviewNotice && (
          <div className="review-toast" role="status">
            <CheckCircle2 size={17} />
            <span>{reviewNotice}</span>
          </div>
        )}

        {reviewDraft && (
          <ReviewDrawer
            draft={reviewDraft}
            result={runResult}
            isRunning={isRunningDraft}
            onClose={() => setReviewDraft(null)}
            onMarkReady={markReviewReady}
            onRun={runReviewedDraft}
          />
        )}
      </main>
    </div>
  )
}

function ChatPage({
  draftMessage,
  messages,
  overview,
  savedDrafts,
  onDraftChange,
  onNavigate,
  onReviewCommand,
  onSend,
  onStarter,
}: {
  draftMessage: string
  messages: ChatMessage[]
  overview: Overview
  savedDrafts: SavedDraft[]
  onDraftChange: (value: string) => void
  onNavigate: (section: SectionId) => void
  onReviewCommand: (draft: ReviewDraft) => void
  onSend: () => void
  onStarter: (starter: (typeof starterPrompts)[number]) => void
}) {
  return (
    <section className="chat-layout" aria-label="Beginner OpenClaw chat">
      <article className="chat-panel">
        <div className="role-banner">
          <div>
            <strong>Claw Cockpit checks and plans. OpenClaw Chat is where you talk to the agent.</strong>
            <p>
              Keep using your normal OpenClaw browser chat for conversations. Use this cockpit when you want
              to check health, understand warnings, or draft setup changes safely.
            </p>
          </div>
          <a href="http://127.0.0.1:18789/chat?session=main" target="_blank" rel="noreferrer">
            <ExternalLink size={16} />
            Open OpenClaw Chat
          </a>
        </div>

        <ProofStrip overview={overview} />

        <div className="handled-strip" aria-label="OpenClaw handled path">
          <div>
            <span>Problem</span>
            <strong>OpenClaw changes fast.</strong>
            <p>The control surface should not make you chase config.</p>
          </div>
          <div>
            <span>Outcome</span>
            <strong>One calm path.</strong>
            <p>Plan in plain English, review the command, then run when ready.</p>
          </div>
          <div>
            <span>Proof</span>
            <strong>Reading your machine.</strong>
            <p>Gateway, helpers, history, reminders, and warnings come from local truth.</p>
          </div>
          <div>
            <span>Next move</span>
            <strong>Pick a starter.</strong>
            <p>Or type the work you want handled.</p>
          </div>
        </div>

        <div className="chat-thread">
          {messages.map((message) => (
            <div className={`message-row ${message.role}`} key={message.id}>
              <div className="message-avatar">
                {message.role === 'assistant' ? <Sparkles size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-bubble">
                <p>{message.text}</p>
                {message.command && (
                  <CommandPreview
                    command={message.command}
                    onReview={() =>
                      onReviewCommand({
                        title: 'Review chat draft',
                        summary: 'This command came from a plain-English chat request.',
                        command: message.command ?? '',
                        nextStep: 'Confirm the folder, name, and schedule before this becomes runnable.',
                      })
                    }
                  />
                )}
                {message.action && (
                  <button
                    className="message-action"
                    type="button"
                    onClick={() => onNavigate(message.action?.section ?? 'home')}
                  >
                    <CheckCircle2 size={15} />
                    {message.action.label}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="chat-composer">
          <textarea
            aria-label="Ask Claw Cockpit"
            placeholder="Plan setup in plain English, like: help me set up a helper for Irie Commerce"
            value={draftMessage}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                onSend()
              }
            }}
          />
          <button type="button" onClick={onSend} aria-label="Send message">
            <Send size={18} />
          </button>
        </div>
      </article>

      <aside className="starter-panel">
        <PanelHeader icon={<MessageSquareText size={19} />} title="Plan setup" action="Not live chat" />
        <div className="starter-list">
          {starterPrompts.map((starter) => (
            <button key={starter.title} type="button" onClick={() => onStarter(starter)}>
              <strong>{starter.title}</strong>
              <span>{starter.prompt}</span>
            </button>
          ))}
        </div>

        <div className="beginner-card">
          <span>Everything is handled when</span>
          <strong>{(overview.counts.riskSignals ?? overview.counts.warnings) > 0 ? 'each risk signal has a next step' : 'OpenClaw has a clear next move'}</strong>
          <p>
            Gateway is {overview.gateway.label.toLowerCase()}. The cockpit sees {overview.counts.agents}{' '}
            helpers, {overview.counts.jobs} reminders, and {overview.counts.riskSignals ?? overview.counts.warnings} item that needs a
            look.
          </p>
        </div>

        {savedDrafts.length > 0 && (
          <div className="saved-drafts" aria-label="Reviewed setup drafts">
            <div className="saved-drafts-header">
              <strong>Reviewed drafts</strong>
              <span>{savedDrafts.length}</span>
            </div>
            {savedDrafts.slice(0, 3).map((draft) => (
              <button key={draft.id} type="button" onClick={() => onReviewCommand(draft)}>
                <span>{draft.title}</span>
                <small>{draft.savedAt}</small>
              </button>
            ))}
          </div>
        )}
      </aside>
    </section>
  )
}

function DashboardPage({
  activeSection,
  overview,
  onReviewCommand,
  priorityChecks,
  onNavigate,
  savedDrafts,
  skillWorkshop,
  workspaceSuggestions,
  onDraftSkill,
  onInstallSkill,
  onDraftPluginPack,
}: {
  activeSection: SectionId
  overview: Overview
  onReviewCommand: (draft: ReviewDraft) => void
  priorityChecks: DoctorCheck[]
  onNavigate: (section: SectionId) => void
  savedDrafts: SavedDraft[]
  skillWorkshop: SkillWorkshop
  workspaceSuggestions: WorkspaceSuggestion[]
  onDraftSkill: (input: SkillDraftInput) => void
  onInstallSkill: (skillName: string) => void
  onDraftPluginPack: (skillNames: string[]) => void
}) {
  const [selectedProject, setSelectedProject] = useState(projectTemplates[0])
  const [selectedJob, setSelectedJob] = useState(jobTemplates[0])
  const [helperName, setHelperName] = useState(projectTemplates[0].helperName)
  const [helperWorkspace, setHelperWorkspace] = useState('/Users/irieagent/Documents/Claw Cockpit/claw-cockpit')
  const [reminderName, setReminderName] = useState(jobTemplates[0].name)
  const [reminderAgent, setReminderAgent] = useState('main')
  const [reminderMessage, setReminderMessage] = useState(jobTemplates[0].message)
  const [reminderCron, setReminderCron] = useState(jobTemplates[0].cron)
  const [reminderTimezone, setReminderTimezone] = useState('America/New_York')
  const [skillName, setSkillName] = useState('repo-status-coach')
  const [skillDisplayName, setSkillDisplayName] = useState('Repo Status Coach')
  const [skillGoal, setSkillGoal] = useState('check a local repo, explain what changed, and suggest the next safest step')
  const [skillBoundaries, setSkillBoundaries] = useState('Ask before editing files, running commands, installing packages, or touching secrets.')
  const [skillExample, setSkillExample] = useState('Help me understand what changed in this repo and what I should do next.')
  const [selectedSkillDraft, setSelectedSkillDraft] = useState('')
  const riskChecks = priorityChecks.filter((check) => check.state === 'blocked' || check.state === 'attention')
  const compatibilityRisks = overview.compatibility.checks.filter(
    (check) => check.state === 'blocked' || check.state === 'attention',
  )
  const helperCommand = agentPreview(helperName, helperWorkspace)
  const reminderCommand = cronPreview(reminderName, reminderAgent, reminderMessage, reminderCron, reminderTimezone)
  const activeSkillDraft =
    skillWorkshop.drafts.find((draft) => draft.skillName === selectedSkillDraft) ?? skillWorkshop.drafts[0]

  if (activeSection === 'doctor') {
    return (
      <>
        <ProofStrip overview={overview} />
        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader icon={<Wrench size={19} />} title="Warnings to fix first" action={`${riskChecks.length} open`} />
            <p className="panel-copy">
              Start here when OpenClaw feels confusing. Each warning is translated into what it means, why it matters,
              and the safest next command to review.
            </p>
            <div className="check-list">
              {priorityChecks.map((check) => (
                <WarningCheckRow check={check} key={check.id} onReviewCommand={onReviewCommand} />
              ))}
            </div>
          </article>
          <article className="panel">
            <PanelHeader icon={<ListChecks size={19} />} title="Fix order" action="Plain English" />
            <div className="plain-steps">
              <div>
                <strong>1. Keep the gateway reachable</strong>
                <p>If OpenClaw cannot answer locally, pause setup work and repair that first.</p>
              </div>
              <div>
                <strong>2. Review auth and exposure</strong>
                <p>Local-only is safest for a beginner cockpit. Anything exposed deserves a fresh check.</p>
              </div>
              <div>
                <strong>3. Treat beta updates as drift</strong>
                <p>When OpenClaw changes, update fixtures and adapter parsing before changing the UI.</p>
              </div>
            </div>
          </article>
        </section>
      </>
    )
  }

  if (activeSection === 'projects') {
    return (
      <>
        <ProofStrip overview={overview} />
        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader icon={<FolderGit2 size={19} />} title="Create a helper" action="Review required" />
            <p className="panel-copy">
              A helper is an OpenClaw agent with a clear folder and job. Pick a starter, then review the exact command
              before setup becomes runnable.
            </p>
            <div className="template-list">
              {projectTemplates.map((template) => (
                <button
                  className={template.name === selectedProject.name ? 'template active' : 'template'}
                  key={template.name}
                  type="button"
                  onClick={() => {
                    setSelectedProject(template)
                    setHelperName(template.helperName)
                  }}
                >
                  <strong>{template.name}</strong>
                  <span>{template.detail}</span>
                </button>
              ))}
            </div>
            <div className="setup-form" aria-label="Helper setup fields">
              <label>
                <span>Helper name</span>
                <input value={helperName} onChange={(event) => setHelperName(event.target.value)} />
              </label>
              <label>
                <span>Workspace folder</span>
                <input value={helperWorkspace} onChange={(event) => setHelperWorkspace(event.target.value)} />
              </label>
            </div>
            <div className="workspace-picker" aria-label="Workspace suggestions">
              {workspaceSuggestions.length > 0 && <p>Use a detected workspace</p>}
              {workspaceSuggestions.slice(0, 6).map((workspace) => (
                <button key={workspace.path} type="button" onClick={() => setHelperWorkspace(workspace.path)}>
                  <strong>{workspace.name}</strong>
                  <span>{workspace.kind}</span>
                </button>
              ))}
            </div>
            <CommandPreview
              command={helperCommand}
              onReview={() =>
                onReviewCommand({
                  title: selectedProject.name,
                  summary: selectedProject.detail,
                  command: helperCommand,
                  commandId: 'agent.add',
                  params: {
                    helperName,
                    workspace: helperWorkspace,
                  },
                  nextStep: 'Choose the real repo folder and confirm the helper name before running setup.',
                })
              }
            />
          </article>
          <article className="panel">
            <PanelHeader icon={<Bot size={19} />} title="Current helpers" action={`${overview.counts.agents} total`} />
            <div className="table-list">
              {overview.agents.slice(0, 8).map((agent) => (
                <div className="agent-row" key={agent.id}>
                  <div>
                    <strong>{agent.name || agent.id}</strong>
                    <span>{agent.workspace}</span>
                  </div>
                  <small>{agent.model}</small>
                </div>
              ))}
            </div>
          </article>
        </section>
      </>
    )
  }

  if (activeSection === 'jobs') {
    return (
      <>
        <ProofStrip overview={overview} />
        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader icon={<Clock3 size={19} />} title="Add a reminder" action="Draft first" />
            <p className="panel-copy">
              A reminder is scheduled OpenClaw work. Keep the wording readable, confirm the timezone, then save it as
              a reviewed draft before anything creates a cron job.
            </p>
            <div className="job-selector">
              {jobTemplates.map((job) => (
                <button
                  className={job.name === selectedJob.name ? 'job-option active' : 'job-option'}
                  key={job.name}
                  type="button"
                  onClick={() => {
                    setSelectedJob(job)
                    setReminderName(job.name)
                    setReminderMessage(job.message)
                    setReminderCron(job.cron)
                  }}
                >
                  <span>{job.name}</span>
                  <small>{job.schedule}</small>
                </button>
              ))}
            </div>
            <div className="setup-form" aria-label="Reminder setup fields">
              <label>
                <span>Reminder name</span>
                <input value={reminderName} onChange={(event) => setReminderName(event.target.value)} />
              </label>
              <label>
                <span>Helper</span>
                <input value={reminderAgent} onChange={(event) => setReminderAgent(event.target.value)} />
              </label>
              <label className="full-field">
                <span>Message</span>
                <input value={reminderMessage} onChange={(event) => setReminderMessage(event.target.value)} />
              </label>
              <label>
                <span>Cron</span>
                <input value={reminderCron} onChange={(event) => setReminderCron(event.target.value)} />
              </label>
              <label>
                <span>Timezone</span>
                <input value={reminderTimezone} onChange={(event) => setReminderTimezone(event.target.value)} />
              </label>
            </div>
            <CommandPreview
              command={reminderCommand}
              onReview={() =>
                onReviewCommand({
                  title: reminderName,
                  summary: `Schedule: ${selectedJob.schedule}.`,
                  command: reminderCommand,
                  commandId: 'cron.add',
                  params: {
                    reminderName,
                    agent: reminderAgent,
                    message: reminderMessage,
                    cron: reminderCron,
                    timezone: reminderTimezone,
                  },
                  nextStep: 'Confirm the time, timezone, and summary wording before creating the job.',
                })
              }
            />
          </article>
          <article className="panel">
            <PanelHeader icon={<Clock3 size={19} />} title="Existing reminders" action={`${overview.counts.jobs} found`} />
            <div className="table-list">
              {overview.jobs.length === 0 ? (
                <div className="empty-state">No scheduled work was found in the local OpenClaw registry.</div>
              ) : (
                overview.jobs.slice(0, 8).map((job) => (
                  <div className="agent-row" key={job.id}>
                    <div>
                      <strong>{job.title}</strong>
                      <span>{job.schedule}</span>
                    </div>
                    <small>{job.status}</small>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </>
    )
  }

  if (activeSection === 'skills') {
    const visibleSkills = skillWorkshop.skills.slice(0, 10)
    const attentionSkills = skillWorkshop.skills.filter((skill) => skill.quality.state !== 'healthy').slice(0, 4)

    return (
      <>
        <section className="proof-strip skill-proof" aria-label="Skill workshop proof">
          <div>
            <span>Skills read</span>
            <strong>{skillWorkshop.counts.skills}</strong>
          </div>
          <div>
            <span>Need attention</span>
            <strong>{skillWorkshop.counts.needsAttention}</strong>
          </div>
          <div>
            <span>With examples</span>
            <strong>{skillWorkshop.counts.withExamples}</strong>
          </div>
          <div>
            <span>With scripts</span>
            <strong>{skillWorkshop.counts.withScripts}</strong>
          </div>
          <div>
            <span>Saved drafts</span>
            <strong>{skillWorkshop.counts.savedDrafts}</strong>
          </div>
        </section>

        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader icon={<Sparkles size={19} />} title="Draft a skill" action="Review only" />
            <p className="panel-copy">
              Turn a plain-English idea into a first `SKILL.md` draft. This does not install anything yet.
            </p>
            <div className="setup-form skill-builder" aria-label="Skill draft fields">
              <label>
                <span>Skill folder name</span>
                <input value={skillName} onChange={(event) => setSkillName(event.target.value)} />
              </label>
              <label>
                <span>Display name</span>
                <input value={skillDisplayName} onChange={(event) => setSkillDisplayName(event.target.value)} />
              </label>
              <label className="full-field">
                <span>What should this skill help with?</span>
                <input value={skillGoal} onChange={(event) => setSkillGoal(event.target.value)} />
              </label>
              <label className="full-field">
                <span>What should it be careful about?</span>
                <input value={skillBoundaries} onChange={(event) => setSkillBoundaries(event.target.value)} />
              </label>
              <label className="full-field">
                <span>Example beginner prompt</span>
                <input value={skillExample} onChange={(event) => setSkillExample(event.target.value)} />
              </label>
            </div>
            <button
              className="section-jump skill-draft-action"
              type="button"
              onClick={() =>
                onDraftSkill({
                  skillName,
                  displayName: skillDisplayName,
                  goal: skillGoal,
                  boundaries: skillBoundaries,
                  example: skillExample,
                })
              }
            >
              <ClipboardList size={16} />
              Review SKILL.md draft
            </button>
          </article>

          <article className="panel">
            <PanelHeader icon={<PlugZap size={19} />} title="Saved skill drafts" action={`${skillWorkshop.counts.savedDrafts} saved`} />
            <p className="panel-copy">{skillWorkshop.pluginReadiness.summary}</p>
            {skillWorkshop.drafts.length === 0 ? (
              <div className="plain-steps">
                <div>
                  <strong>1. Draft useful skills</strong>
                  <p>Keep each skill small, named clearly, and bounded by what it should never do.</p>
                </div>
                <div>
                  <strong>2. Save reviewed drafts</strong>
                  <p>Drafts save under the Cockpit folder before any install step exists.</p>
                </div>
                <div>
                  <strong>3. Package related skills</strong>
                  <p>{skillWorkshop.pluginReadiness.nextStep}</p>
                </div>
              </div>
            ) : (
              <div className="skill-list">
                {skillWorkshop.drafts.slice(0, 5).map((draft) => (
                  <button
                    className={activeSkillDraft?.skillName === draft.skillName ? 'skill-card active' : 'skill-card'}
                    key={`${draft.path}-${draft.savedAt}`}
                    type="button"
                    onClick={() => setSelectedSkillDraft(draft.skillName)}
                  >
                    <div>
                      <strong>{draft.displayName}</strong>
                      <p>{draft.installState === 'draft-only' ? 'Saved as a draft. Not installed yet.' : draft.installState}</p>
                      <small>{draft.path}</small>
                    </div>
                    <span className={`quality-pill ${draft.installState === 'installed' ? 'healthy' : 'attention'}`}>
                      {draft.installState === 'installed' ? 'Installed' : 'Draft'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </article>
        </section>

        {activeSkillDraft && (
          <section className="task-grid two-column">
            <article className="panel wide-panel">
              <PanelHeader icon={<ClipboardList size={19} />} title="Skill draft detail" action={activeSkillDraft.installState} />
              <div className="detail-grid">
                <div>
                  <span>Saved draft</span>
                  <strong>{activeSkillDraft.displayName}</strong>
                  <p>{activeSkillDraft.path}</p>
                </div>
                <div>
                  <span>Install target</span>
                  <strong>{activeSkillDraft.installedPath ? 'Installed' : 'Not installed'}</strong>
                  <p>{activeSkillDraft.installedPath || 'Install only after reviewing this saved draft.'}</p>
                </div>
              </div>
              <div className="plain-steps">
                <div>
                  <strong>Ready checklist</strong>
                  <p>Has a saved `SKILL.md`, clear trigger metadata, and a safety boundary before install.</p>
                </div>
                <div>
                  <strong>Install rule</strong>
                  <p>The install action copies only this saved draft into the configured skills folder.</p>
                </div>
              </div>
              <button
                className="section-jump"
                type="button"
                disabled={activeSkillDraft.installState === 'installed'}
                onClick={() => onInstallSkill(activeSkillDraft.skillName)}
              >
                <Play size={16} />
                {activeSkillDraft.installState === 'installed' ? 'Already installed' : 'Install saved skill'}
              </button>
            </article>

            <article className="panel">
              <PanelHeader icon={<PlugZap size={19} />} title="Plugin pack builder" action="Review" />
              <p className="panel-copy">
                Bundle saved skill drafts into a plugin folder after reviewing the manifest and included files.
              </p>
              <button
                className="section-jump skill-draft-action"
                type="button"
                onClick={() => onDraftPluginPack(skillWorkshop.drafts.slice(0, 4).map((draft) => draft.skillName))}
              >
                <ClipboardList size={16} />
                Review plugin pack draft
              </button>
            </article>
          </section>
        )}

        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader icon={<ListChecks size={19} />} title="Local skills" action={`${visibleSkills.length} shown`} />
            <div className="skill-list">
              {visibleSkills.map((skill) => (
                <div className="skill-card" key={`${skill.root}-${skill.id}`}>
                  <div>
                    <strong>{skill.title}</strong>
                    <p>{skill.description}</p>
                    <small>{skill.path}</small>
                  </div>
                  <span className={`quality-pill ${skill.quality.state}`}>{skill.quality.label}</span>
                </div>
              ))}
              {visibleSkills.length === 0 && <div className="empty-state">No local skills were found in the scanned roots.</div>}
            </div>
          </article>

          <article className="panel">
            <PanelHeader icon={<Wrench size={19} />} title="Skill doctor" action={`${attentionSkills.length} to review`} />
            <div className="quality-list">
              {attentionSkills.length === 0 ? (
                <div className="empty-state">No skill quality issues found in the first scan.</div>
              ) : (
                attentionSkills.map((skill) => (
                  <div className="check-row" key={skill.id}>
                    <span className={`check-dot ${skill.quality.state}`} />
                    <div>
                      <strong>{skill.title}</strong>
                      <p>{skill.quality.summary}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </>
    )
  }

  if (activeSection === 'runs') {
    return (
      <>
        <ProofStrip overview={overview} />
        <section className="task-grid">
          <article className="panel wide-panel">
            <PanelHeader icon={<Activity size={19} />} title="Recent OpenClaw runs" action="Local proof" />
            <p className="panel-copy">
              Use this page when you want proof of what OpenClaw has been doing before you ask it for more work.
            </p>
            <div className="run-table">
              <div className="run-head">
                <span>Session</span>
                <span>Model</span>
                <span>Runtime</span>
                <span>Age</span>
              </div>
              {overview.sessions.slice(0, 10).map((session, index) => (
                <div className="run-row" key={`${session.key}-${session.age}-${index}`}>
                  <span>{session.key}</span>
                  <span>{session.model}</span>
                  <span>{session.runtime}</span>
                  <span>{session.age}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </>
    )
  }

  if (activeSection === 'settings') {
    return (
      <>
        <ProofStrip overview={overview} />
        <section className="task-grid two-column">
          <article className="panel wide-panel">
            <PanelHeader
              icon={<ShieldCheck size={19} />}
              title="Safety and drift signals"
              action={stateLabel(overview.compatibility.posture)}
            />
            <p className="panel-copy">{overview.compatibility.summary}</p>
            <div className="compat-list">
              {overview.compatibility.checks.map((check) => (
                <div className="compat-row" key={check.id}>
                  <span className={`check-dot ${check.state}`} />
                  <div>
                    <strong>{check.title}</strong>
                    <p>{check.detail}</p>
                    <small>{check.source}</small>
                  </div>
                </div>
              ))}
            </div>
          </article>
          <article className="panel">
            <PanelHeader icon={<ClipboardList size={19} />} title="Contributor rule" action="Future-proof" />
            <div className="plain-steps">
              <div>
                <strong>Read from adapters</strong>
                <p>OpenClaw output changes quickly. Keep parsing and compatibility checks outside the UI.</p>
              </div>
              <div>
                <strong>Fixture every drift</strong>
                <p>When a command changes, add a redacted fixture so GitHub Actions protects the fix.</p>
              </div>
              <div>
                <strong>Never run raw browser commands</strong>
                <p>Execution must use server-side command IDs, validated fields, and a review step.</p>
              </div>
            </div>
            {compatibilityRisks.length > 0 && (
              <button className="section-jump" type="button" onClick={() => onNavigate('doctor')}>
                <Wrench size={16} />
                Fix warnings first
              </button>
            )}
          </article>
        </section>
      </>
    )
  }

  return (
    <>
      <section className="handled-brief" aria-label="Everything handled brief">
        <div>
          <span>Right now</span>
          <strong>
            {(overview.counts.riskSignals ?? overview.counts.warnings) > 0
              ? `${overview.counts.riskSignals ?? overview.counts.warnings} risk signals need next steps.`
              : 'OpenClaw has a clear path.'}
          </strong>
          <p>
            The cockpit sees {overview.counts.agents} helpers, {overview.counts.jobs} reminders,{' '}
            {savedDrafts.length} reviewed setup drafts, {skillWorkshop.counts.savedDrafts} saved skill drafts,
            and {overview.counts.sessions} recent sessions.
          </p>
        </div>
        <div className="brief-actions">
          <button type="button" onClick={() => onNavigate('chat')}>
            <MessageSquareText size={16} />
            Ask what to handle
          </button>
          <button type="button" onClick={() => onNavigate('doctor')}>
            <Wrench size={16} />
            Check setup
          </button>
        </div>
      </section>

      <ProofStrip overview={overview} />

      <section className="health-strip" aria-label="OpenClaw summary">
        <Metric
          icon={<PlugZap size={18} />}
          label="Gateway"
          value={stateLabel(overview.gateway.state)}
          detail={overview.gateway.detail}
        />
        <Metric
          icon={<Bot size={18} />}
          label="Helpers"
          value={String(overview.counts.agents)}
          detail="Loaded from openclaw.json"
        />
        <Metric
          icon={<Clock3 size={18} />}
          label="Reminders"
          value={String(overview.counts.jobs)}
          detail="Local cron registry"
        />
        <Metric
          icon={<Cpu size={18} />}
          label="Version"
          value={overview.openclaw.version}
          detail={overview.openclaw.update}
        />
      </section>

      <section className="work-grid">
        <article className="panel doctor-panel">
          <PanelHeader
            icon={<Wrench size={19} />}
            title="Setup check"
            action={`${overview.counts.warnings} open`}
          />
          <div className="check-list">
            {priorityChecks.map((check) => (
              <div className="check-row" key={check.id}>
                <span className={`check-dot ${check.state}`} />
                <div>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                  {check.command && <code>{check.command}</code>}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel project-panel">
          <PanelHeader
            icon={<FolderGit2 size={19} />}
            title="Create helper"
            action="Review required"
          />
          <p className="panel-copy">
            Pick the kind of help you want, then review the OpenClaw command before setup.
          </p>
          <div className="template-list">
            {projectTemplates.map((template) => (
              <button
                className={template.name === selectedProject.name ? 'template active' : 'template'}
                key={template.name}
                type="button"
                onClick={() => {
                  setSelectedProject(template)
                  setHelperName(template.helperName)
                }}
              >
                <strong>{template.name}</strong>
                <span>{template.detail}</span>
              </button>
            ))}
          </div>
          <CommandPreview
            command={helperCommand}
            onReview={() =>
              onReviewCommand({
                title: selectedProject.name,
                summary: selectedProject.detail,
                command: helperCommand,
                commandId: 'agent.add',
                params: {
                  helperName,
                  workspace: helperWorkspace,
                },
                nextStep: 'Choose the real repo folder and confirm the helper name before running setup.',
              })
            }
          />
        </article>

        <article className="panel jobs-panel">
          <PanelHeader icon={<Clock3 size={19} />} title="Scheduled work" action="No raw config required" />
          <p className="panel-copy">
            Scheduled work should read like reminders. The app can translate them into OpenClaw commands
            only after you approve the preview.
          </p>
          <div className="job-selector">
            {jobTemplates.map((job) => (
              <button
                className={job.name === selectedJob.name ? 'job-option active' : 'job-option'}
                key={job.name}
                type="button"
                onClick={() => {
                  setSelectedJob(job)
                  setReminderName(job.name)
                  setReminderMessage(job.message)
                  setReminderCron(job.cron)
                }}
              >
                <span>{job.name}</span>
                <small>{job.schedule}</small>
              </button>
            ))}
          </div>
          <CommandPreview
            command={reminderCommand}
            onReview={() =>
              onReviewCommand({
                title: reminderName,
                summary: `Schedule: ${selectedJob.schedule}.`,
                command: reminderCommand,
                commandId: 'cron.add',
                params: {
                  reminderName,
                  agent: reminderAgent,
                  message: reminderMessage,
                  cron: reminderCron,
                  timezone: reminderTimezone,
                },
                nextStep: 'Confirm the time, timezone, and summary wording before creating the job.',
              })
            }
          />
        </article>

        <article className="panel agents-panel">
          <PanelHeader icon={<Bot size={19} />} title="Helpers" action={`${overview.agents.length} shown`} />
          <div className="table-list">
            {overview.agents.slice(0, 6).map((agent) => (
              <div className="agent-row" key={agent.id}>
                <div>
                  <strong>{agent.name || agent.id}</strong>
                  <span>{agent.workspace}</span>
                </div>
                <small>{agent.model}</small>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel">
          <PanelHeader icon={<ListChecks size={19} />} title="History" action="Session truth" />
          <div className="run-table">
            <div className="run-head">
              <span>Session</span>
              <span>Model</span>
              <span>Runtime</span>
              <span>Age</span>
            </div>
            {overview.sessions.slice(0, 5).map((session, index) => (
              <div className="run-row" key={`${session.key}-${session.age}-${index}`}>
                <span>{session.key}</span>
                <span>{session.model}</span>
                <span>{session.runtime}</span>
                <span>{session.age}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel philosophy-panel">
          <PanelHeader
            icon={<ClipboardList size={19} />}
            title="Compatibility check"
            action={stateLabel(overview.compatibility.posture)}
          />
          <p className="panel-copy">{overview.compatibility.summary}</p>
          <div className="compat-list">
            {overview.compatibility.checks.slice(0, 6).map((check) => (
              <div className="compat-row" key={check.id}>
                <span className={`check-dot ${check.state}`} />
                <div>
                  <strong>{check.title}</strong>
                  <p>{check.detail}</p>
                  <small>{check.source}</small>
                </div>
              </div>
            ))}
          </div>
          {activeSection !== 'home' && (
            <button className="section-jump" type="button" onClick={() => onNavigate('chat')}>
              <MessageSquareText size={16} />
              Ask for help in chat
            </button>
          )}
        </article>
      </section>
    </>
  )
}

function ProofStrip({ overview }: { overview: Overview }) {
  const checkedAt = overview.generatedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(overview.generatedAt))
    : 'not checked yet'
  const security = overview.compatibility.signals.security
  const securityText = security?.found
    ? `${security.critical} critical, ${security.warn} warnings`
    : 'audit summary missing'

  return (
    <section className="proof-strip" aria-label="Local proof">
      <div>
        <span>Checked</span>
        <strong>{checkedAt}</strong>
      </div>
      <div>
        <span>Gateway</span>
        <strong>{overview.gateway.state === 'healthy' ? 'Answered' : 'Needs help'}</strong>
      </div>
      <div>
        <span>Config</span>
        <strong>{overview.counts.agents} helpers read</strong>
      </div>
      <div>
        <span>Reminders</span>
        <strong>{overview.counts.jobs} found</strong>
      </div>
      <div>
        <span>Security</span>
        <strong>{securityText}</strong>
      </div>
    </section>
  )
}

function Metric({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>
    </div>
  )
}

function WarningCheckRow({
  check,
  onReviewCommand,
}: {
  check: DoctorCheck
  onReviewCommand: (draft: ReviewDraft) => void
}) {
  const guide = warningGuide(check)
  const recipe = warningRecipe(check)
  const command = recipe?.command ?? check.command

  return (
    <div className="check-row">
      <span className={`check-dot ${check.state}`} />
      <div>
        <strong>{check.title}</strong>
        <p>{check.detail}</p>
        {check.state !== 'healthy' && (
          <div className="warning-guide">
            <span>
              <strong>What this means</strong>
              {guide.meaning}
            </span>
            <span>
              <strong>Can I ignore it?</strong>
              {guide.ignore}
            </span>
            <span>
              <strong>Safest next move</strong>
              {recipe ? 'Review the fix below. It uses a server-side command ID, not browser shell text.' : guide.next}
            </span>
          </div>
        )}
        {recipe && command ? (
          <CommandPreview
            command={command}
            onReview={() =>
              onReviewCommand({
                title: check.title,
                summary: check.detail,
                command: recipe.command,
                commandId: recipe.commandId,
                params: recipe.params,
                nextStep: recipe.nextStep,
              })
            }
          />
        ) : (
          check.command && <code>{check.command}</code>
        )}
      </div>
    </div>
  )
}

function PanelHeader({
  icon,
  title,
  action,
}: {
  icon: ReactNode
  title: string
  action: string
}) {
  return (
    <div className="panel-header">
      <div>
        <span className="panel-icon">{icon}</span>
        <h2>{title}</h2>
      </div>
      <span>{action}</span>
    </div>
  )
}

function ReviewDrawer({
  draft,
  result,
  isRunning,
  onClose,
  onMarkReady,
  onRun,
}: {
  draft: ReviewDraft
  result: CommandRunResult | null
  isRunning: boolean
  onClose: () => void
  onMarkReady: () => void
  onRun: () => void
}) {
  const canRun = Boolean(draft.commandId)
  const isFileWrite = draft.kind === 'skill' || draft.kind === 'plugin' || draft.kind === 'skill-install'
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="review-backdrop" role="presentation">
      <aside className="review-drawer" aria-label="Review setup draft">
        <div className="review-header">
          <div>
            <span>Review before anything runs</span>
            <h2>{draft.title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close review">
            <X size={18} />
          </button>
        </div>

        <div className="review-section">
          <strong>What this will do</strong>
          <p>{draft.summary}</p>
        </div>

        <div className="review-section">
          <strong>{draft.artifactLabel ?? 'Command preview'}</strong>
          <code>{draft.command}</code>
        </div>

        <div className="review-checks" aria-label="Safety checks">
          <div>
            <CheckCircle2 size={16} />
            <span>
              {canRun
                ? 'This command uses a server-side allowlisted template.'
                : isFileWrite
                  ? 'This file change uses a server-side reviewed write path.'
                  : 'This preview is not runnable yet.'}
            </span>
          </div>
          <div>
            <CheckCircle2 size={16} />
            <span>
              {canRun
                ? 'The browser sends a command ID and validated fields, not raw shell text.'
                : isFileWrite
                  ? 'The browser sends validated names and confirmation, not raw file paths.'
                  : 'This is a draft preview only; install and run steps come later.'}
            </span>
          </div>
          <div>
            <CheckCircle2 size={16} />
            <span>{draft.nextStep}</span>
          </div>
        </div>

        {result && (
          <div className={result.ok ? 'run-result success' : 'run-result failed'} role="status">
            <strong>{result.ok ? 'Command finished' : 'Command did not finish'}</strong>
            <p>{result.ok ? result.stdout || 'OpenClaw accepted the command.' : result.error || result.stderr || 'OpenClaw returned an error.'}</p>
          </div>
        )}

        <div className="review-actions">
          <button type="button" className="secondary-action" onClick={onClose}>
            Keep editing
          </button>
          <button type="button" className="primary-action" onClick={onMarkReady} disabled={isRunning}>
            {isRunning
              ? 'Saving...'
              : draft.kind === 'skill'
                ? 'Save skill draft'
                : draft.kind === 'plugin'
                  ? 'Save plugin pack'
                  : draft.kind === 'skill-install'
                    ? 'Install saved skill'
                    : 'Save reviewed draft'}
          </button>
          <button type="button" className="run-action" onClick={onRun} disabled={!canRun || isRunning}>
            <Play size={15} />
            {isRunning ? 'Running...' : canRun ? 'Run reviewed command' : 'Preview only'}
          </button>
        </div>
      </aside>
    </div>
  )
}

function CommandPreview({
  command,
  onReview,
}: {
  command: string
  onReview: () => void
}) {
  return (
    <div className="command-preview">
      <div>
        <TerminalSquare size={17} />
        <span>Current CLI preview</span>
      </div>
      <code>{command}</code>
      <button type="button" onClick={onReview}>
        <Play size={15} />
        Review before running
      </button>
    </div>
  )
}

export default App
