"use client"

import { useState, useEffect } from 'react'
import { Play, Loader2, Bot, Edit3, CheckCircle2, XCircle, RefreshCw, Clock, LogOut, ShieldCheck, Sparkles } from 'lucide-react'
import {
  aiOptimizationOptions,
  builderBlueprints,
  builderPlaybooks,
  businessBuilderFeatures,
  gameBuilderTracks,
  type AiOptimizationId,
  type BuilderBlueprintId,
  type BuilderPlaybook,
  type GameBuilderTrackId,
} from '../../lib/builder-intelligence'

// Example agent types — adjust based on your engine
const agents = [
  { id: '0', name: 'Code Agent', type: 'code', color: 'text-amber-400', border: 'border-amber-500/20', icon: '🛠️' },
  { id: '1', name: 'Content Agent', type: 'content', color: 'text-purple-400', border: 'border-purple-500/20', icon: '📝' },
  { id: '2', name: 'SEO Agent', type: 'seo', color: 'text-green-400', border: 'border-green-500/20', icon: '🚀' },
  { id: '3', name: 'Analytics Agent', type: 'analytics', color: 'text-blue-400', border: 'border-blue-500/20', icon: '📊' },
]

type AssetItem = {
  id: string
  type?: string
  prompt?: string
  content?: string
}

type CtoTaskItem = {
  id?: string
  type?: string
  description?: string
  status?: string
}

type MarketplaceIntegrationStatus = {
  id: string
  label: string
  configured: boolean
  requiredForPhaseOne: boolean
  envVars: string[]
  nextStep: string
}

type MarketplaceRoutingResult = {
  intent: {
    score: number
    band: 'high-intent' | 'medium-intent' | 'low-intent'
    premiumLeadPriceUsd: number
  }
  assignment: {
    status: 'assigned' | 'claim-window-open'
    assignedContractorName?: string
    claimWindowMinutes?: number
  }
  rankedContractors: Array<{
    id: string
    name: string
    tier: 'starter' | 'pro' | 'premium'
    responseTimeMinutes: number
    winRate: number
    routingScore: number
    verified: boolean
    autoAssignEnabled: boolean
  }>
  speedAdvantage: {
    benchmarkFirstResponseMinutes: number
    expectedBestResponseMinutes: number
  }
}

type MarketplacePhase = {
  phase: string
  focus: string[]
}

type DevboardTab = 'dashboard' | 'builders' | 'marketplace' | 'build-cortex' | 'agents' | 'plugins' | 'database' | 'cto'

type BuildCortexAction = 'preview' | 'approve' | 'modify' | 'deploy'

type AdminBuilderChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
}

const buildCortexQuickPrompts = [
  'Scan for bugs and generate a safe prioritized fix list with implementation patches.',
  'Increase SEO/GEO footprint and propose content updates for higher lead conversion intent.',
  'Start autonomous blog lead-gen loop with monetization and local authority signals.',
  'Improve app and website builder flow with clearer onboarding and stronger conversion UX.',
  'Begin creating AI autonomous methods of obtaining revenue through funnels, CRM, estimates, booking, and subscriptions.',
]

const defaultAiOptimizationIds = aiOptimizationOptions
  .filter((option) => option.defaultEnabled)
  .map((option) => option.id)

const defaultBusinessFeatureIds = businessBuilderFeatures
  .slice(0, 4)
  .map((feature) => feature.id)

export default function DevboardPage() {
  const [activeAgent, setActiveAgent] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [tab, setTab] = useState<DevboardTab>('dashboard')
  const [health, setHealth] = useState<{ status: string; checks: Record<string, unknown> } | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [responseTime, setResponseTime] = useState<number | null>(null)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [agentMode, setAgentMode] = useState<'propose' | 'apply'>('propose')
  const [dryRun, setDryRun] = useState(true)
  const [approvalToken, setApprovalToken] = useState('')
  const [runnerMeta, setRunnerMeta] = useState<{ status?: string; mode?: string; dry_run?: boolean } | null>(null)
  
  // Job Queue State
  const [useQueue, setUseQueue] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<string | null>(null)
  const [jobWorkspace, setJobWorkspace] = useState<string | null>(null)

  // CTO Task State
  const [ctoTasks, setCtoTasks] = useState<CtoTaskItem[]>([])
  const [ctoLoading, setCtoLoading] = useState(false)

  // Self-builder state
  const [builderBlueprintId, setBuilderBlueprintId] = useState<BuilderBlueprintId>(builderBlueprints[0].id)
  const [builderGoal, setBuilderGoal] = useState(builderBlueprints[0].objective)
  const [builderPlaybookId, setBuilderPlaybookId] = useState<BuilderPlaybook['id']>(builderPlaybooks[0].id)
  const [builderUserId, setBuilderUserId] = useState('dev-user')
  const [builderProjectId, setBuilderProjectId] = useState('sandbox-project')
  const [builderTaskType, setBuilderTaskType] = useState<'feature' | 'bugfix' | 'self-improvement'>('self-improvement')
  const [enabledAiOptimizations, setEnabledAiOptimizations] = useState<AiOptimizationId[]>(defaultAiOptimizationIds)
  const [enabledBusinessFeatures, setEnabledBusinessFeatures] = useState<string[]>(defaultBusinessFeatureIds)
  const [gameTrackId, setGameTrackId] = useState<GameBuilderTrackId>(gameBuilderTracks[0].id)
  const [gameMarketplaceReady, setGameMarketplaceReady] = useState(true)
  const [ctoRunLoading, setCtoRunLoading] = useState(false)
  const [ctoRunResult, setCtoRunResult] = useState<string | null>(null)
  const [adminUsername, setAdminUsername] = useState('admin')

  // Marketplace state
  const [marketplaceServiceType, setMarketplaceServiceType] = useState('roofing')
  const [marketplaceProjectType, setMarketplaceProjectType] = useState('roof-replacement')
  const [marketplaceBudgetUsd, setMarketplaceBudgetUsd] = useState(18000)
  const [marketplaceTimelineDays, setMarketplaceTimelineDays] = useState(7)
  const [marketplaceZipCode, setMarketplaceZipCode] = useState('55123')
  const [marketplaceHomeownerName, setMarketplaceHomeownerName] = useState('Alex Martin')
  const [marketplaceNotes, setMarketplaceNotes] = useState('Need full tear-off and upgraded warranty package.')
  const [marketplaceAssignmentMode, setMarketplaceAssignmentMode] = useState<'claim' | 'auto-assign'>('claim')
  const [marketplaceClaimWindowMinutes, setMarketplaceClaimWindowMinutes] = useState(15)
  const [marketplaceLoading, setMarketplaceLoading] = useState(false)
  const [marketplaceIntegrations, setMarketplaceIntegrations] = useState<MarketplaceIntegrationStatus[]>([])
  const [marketplaceRouting, setMarketplaceRouting] = useState<MarketplaceRoutingResult | null>(null)
  const [marketplaceRoadmap, setMarketplaceRoadmap] = useState<MarketplacePhase[]>([])

  // Build Cortex state
  const [buildCortexPrompt, setBuildCortexPrompt] = useState('Create a referral rewards system for cleaning businesses')
  const [buildCortexNotes, setBuildCortexNotes] = useState('')
  const [buildCortexAction, setBuildCortexAction] = useState<BuildCortexAction>('preview')
  const [buildCortexLoading, setBuildCortexLoading] = useState(false)
  const [buildCortexEnqueueToCto, setBuildCortexEnqueueToCto] = useState(true)
  const [buildCortexSpec, setBuildCortexSpec] = useState<Record<string, unknown> | null>(null)
  const [buildCortexQueueInfo, setBuildCortexQueueInfo] = useState<{ added: number; total: number } | null>(null)
  const [showAutonomousBuilderChat, setShowAutonomousBuilderChat] = useState(false)
  const [builderAssistantMode, setBuilderAssistantMode] = useState<'propose' | 'apply'>('propose')
  const [builderAssistantDryRun, setBuilderAssistantDryRun] = useState(true)
  const [builderAssistantToken, setBuilderAssistantToken] = useState('')
  const [builderAssistantInput, setBuilderAssistantInput] = useState(
    'Begin creating AI autonomous methods of obtaining revenue with funnel, CRM, booking, and subscription automation.'
  )
  const [builderAssistantLoading, setBuilderAssistantLoading] = useState(false)
  const [builderAssistantMessages, setBuilderAssistantMessages] = useState<AdminBuilderChatMessage[]>([
    {
      id: 'build-cortex-assistant-seed',
      role: 'assistant',
      text: 'Admin autonomous builder chat ready. Start in propose mode, review output, then use approved apply mode when needed.',
    },
  ])

  const selectedPlaybook = builderPlaybooks.find((p) => p.id === builderPlaybookId) ?? builderPlaybooks[0]
  const selectedBlueprint = builderBlueprints.find((b) => b.id === builderBlueprintId) ?? builderBlueprints[0]
  const selectedGameTrack = gameBuilderTracks.find((track) => track.id === gameTrackId) ?? gameBuilderTracks[0]

  const setBlueprint = (blueprintId: BuilderBlueprintId) => {
    const nextBlueprint = builderBlueprints.find((item) => item.id === blueprintId)
    if (!nextBlueprint) return

    setBuilderBlueprintId(nextBlueprint.id)
    setBuilderGoal(nextBlueprint.objective)
    setBuilderTaskType('feature')

    if (nextBlueprint.id === 'business' && enabledBusinessFeatures.length === 0) {
      setEnabledBusinessFeatures(defaultBusinessFeatureIds)
    }

    if (nextBlueprint.id === 'game' && !gameMarketplaceReady) {
      setGameMarketplaceReady(true)
    }
  }

  const toggleAiOptimization = (optimizationId: AiOptimizationId) => {
    setEnabledAiOptimizations((prev) =>
      prev.includes(optimizationId)
        ? prev.filter((item) => item !== optimizationId)
        : [...prev, optimizationId]
    )
  }

  const toggleBusinessFeature = (featureId: string) => {
    setEnabledBusinessFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((item) => item !== featureId)
        : [...prev, featureId]
    )
  }

  const fetchCtoTasks = async () => {
    setCtoLoading(true)
    try {
      const res = await fetch('/api/cto/tasks')
      const data = await res.json()
      if (Array.isArray(data)) setCtoTasks(data as CtoTaskItem[])
    } catch (e) {
      console.error(e)
    } finally {
      setCtoLoading(false)
    }
  }

  const addCtoTask = async (taskType: string, description: string) => {
    try {
      const res = await fetch('/api/cto/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Date.now().toString(),
          type: taskType,
          description,
          status: 'pending'
        })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      fetchCtoTasks()
      return true
    } catch (e) {
      console.error(e)
      setAgentError(`Failed to add CTO task: ${e instanceof Error ? e.message : 'Unknown error'}`)
      return false
    }
  }

  // Fetch assets from your API
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await fetch('/api/assets')
        const data = await res.json()
        setAssets(data.assets || [])
      } catch (err) {
        console.error('Failed to fetch assets', err)
      }
    }
    fetchAssets()
  }, [])

  const fetchHealth = async () => {
    setHealthLoading(true)
    try {
      const res = await fetch('/api/health')
      const data = await res.json()
      setHealth(data)
    } catch {
      setHealth({ status: 'unreachable', checks: {} })
    } finally {
      setHealthLoading(false)
    }
  }

  const fetchMarketplaceStatus = async () => {
    try {
      const res = await fetch('/api/marketplace')
      const data = await res.json().catch(() => ({})) as {
        integrations?: MarketplaceIntegrationStatus[]
        phaseRoadmap?: MarketplacePhase[]
      }

      if (Array.isArray(data.integrations)) {
        setMarketplaceIntegrations(data.integrations)
      }

      if (Array.isArray(data.phaseRoadmap)) {
        setMarketplaceRoadmap(data.phaseRoadmap)
      }
    } catch {
      setAgentError('Failed to load marketplace integration status')
    }
  }

  const runMarketplaceSimulation = async () => {
    setMarketplaceLoading(true)
    setAgentError(null)

    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score-route',
          assignmentMode: marketplaceAssignmentMode,
          claimWindowMinutes: marketplaceClaimWindowMinutes,
          lead: {
            serviceType: marketplaceServiceType,
            projectType: marketplaceProjectType,
            budgetUsd: marketplaceBudgetUsd,
            timelineDays: marketplaceTimelineDays,
            zipCode: marketplaceZipCode,
            homeownerName: marketplaceHomeownerName,
            notes: marketplaceNotes,
          },
        }),
      })

      const data = await res.json().catch(() => ({})) as {
        error?: string
        integrations?: MarketplaceIntegrationStatus[]
        phaseRoadmap?: MarketplacePhase[]
        routing?: MarketplaceRoutingResult
      }

      if (!res.ok || !data.routing) {
        throw new Error(data.error || `Marketplace simulation failed (HTTP ${res.status})`)
      }

      setMarketplaceRouting(data.routing)
      if (Array.isArray(data.integrations)) {
        setMarketplaceIntegrations(data.integrations)
      }
      if (Array.isArray(data.phaseRoadmap)) {
        setMarketplaceRoadmap(data.phaseRoadmap)
      }
    } catch (error) {
      setAgentError(error instanceof Error ? error.message : 'Marketplace simulation failed')
    } finally {
      setMarketplaceLoading(false)
    }
  }

  useEffect(() => { fetchHealth() }, [])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/admin/session')
        const data = await res.json()
        if (res.ok && data.authenticated && typeof data.username === 'string') {
          setAdminUsername(data.username)
        }
      } catch {
        // Middleware handles auth redirects; no-op here.
      }
    }

    fetchSession()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get('tab')
    const requestedBlueprint = params.get('blueprint')
    const allowedTabs: DevboardTab[] = ['dashboard', 'builders', 'marketplace', 'build-cortex', 'agents', 'plugins', 'database', 'cto']

    if (requestedTab && allowedTabs.includes(requestedTab as DevboardTab)) {
      setTab(requestedTab as DevboardTab)
      if (requestedTab === 'marketplace') {
        void fetchMarketplaceStatus()
      }
    }

    if (requestedBlueprint === 'website' || requestedBlueprint === 'app' || requestedBlueprint === 'business' || requestedBlueprint === 'game') {
      const nextBlueprint = builderBlueprints.find((item) => item.id === requestedBlueprint)
      if (nextBlueprint) {
        setBuilderBlueprintId(nextBlueprint.id)
        setBuilderGoal(nextBlueprint.objective)
        setBuilderTaskType('feature')
      }
    }
  }, [])

  // Poll for job status
  useEffect(() => {
    if (!jobId || !useQueue || !loading) return

    const poll = async () => {
        try {
            const res = await fetch(`/api/jobs/${jobId}`)
            if (res.ok) {
                const jobData = await res.json()
                setJobStatus(jobData.state)
                
                if (jobData.state === 'completed') {
                    const output = typeof jobData.result === 'string' ? jobData.result : JSON.stringify(jobData.result?.result || jobData.result || {}, null, 2);
                    setResult(output)
                    setRunnerMeta(jobData.result)
                    setLoading(false)
                } else if (jobData.state === 'failed') {
                    setAgentError(jobData.failedReason || 'Job Failed')
                    setLoading(false)
                }
            }
        } catch (e) {
            console.error(e)
        }
    }

    const interval = setInterval(poll, 1000)
    return () => clearInterval(interval)
  }, [jobId, useQueue, loading])

  const buildPlaybookPayload = () => {
    const commands = [
      ...selectedBlueprint.suggestedCommands,
      ...selectedPlaybook.commands,
    ].filter(Boolean).slice(0, 5)

    const payload: Record<string, unknown> = {
      blueprint: selectedBlueprint.id,
      commands,
      goal: builderGoal.trim(),
      outcomes: selectedBlueprint.outcomes,
      aiOptimizations: enabledAiOptimizations,
    }

    if (selectedBlueprint.id === 'business') {
      payload.businessBuilder = {
        enabledFeatures: businessBuilderFeatures.filter((feature) => enabledBusinessFeatures.includes(feature.id)),
        operatingModel: 'seo-geo-growth-loop',
      }
    }

    if (selectedBlueprint.id === 'game') {
      payload.gameBuilder = {
        track: selectedGameTrack,
        marketplaceReady: gameMarketplaceReady,
        priorities: selectedGameTrack.defaultGoals,
      }
    }

    return JSON.stringify(payload, null, 2)
  }

  const runAgent = async (
    agentType: string,
    taskOverride?: string,
    workspaceOverride?: { userId?: string; projectId?: string }
  ) => {
    const effectiveTask = (taskOverride ?? task).trim()
    if (!effectiveTask) return
    if (agentMode === 'apply' && !dryRun && !approvalToken.trim()) {
      setAgentError('Approval token is required for apply mode when dry-run is disabled.')
      return
    }

    if (taskOverride !== undefined) {
      setTask(effectiveTask)
    }

    if (agentMode === 'apply') {
      setAgentError('Apply mode is hidden in Build Cortex autonomous chat for controlled admin execution.')
      return
    }

    setLoading(true)
    setActiveAgent(agentType)
    setResult('')
    setAgentError(null)
    setResponseTime(null)
    setRunnerMeta(null)
    setJobId(null)
    setJobStatus(null)

    const start = Date.now()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (approvalToken.trim()) headers['X-Human-Token'] = approvalToken.trim()

    try {
      let res;
      if (useQueue) {
         res = await fetch('/api/jobs', {
            method: 'POST',
            headers,
            body: JSON.stringify({ 
                agent: agentType, 
             task: effectiveTask,
                mode: agentMode, 
                dryRun,
             userId: workspaceOverride?.userId || 'dev-user',
             projectId: workspaceOverride?.projectId || 'sandbox-project'
            }),
         })
      } else {
         res = await fetch('/api/agents', {
            method: 'POST',
            headers,
          body: JSON.stringify({ agentType, task: effectiveTask, mode: agentMode, dryRun }),
         })
      }

      const data = await res.json()
      
      if (!res.ok) {
        setAgentError(data.error || `HTTP ${res.status}`)
        setLoading(false)
      } else {
        if (useQueue) {
            setJobId(data.jobId)
            setJobStatus('queued')
            setJobWorkspace(data.workspace)
            // allow loading to persist, handled by useEffect
        } else {
            setResponseTime(Date.now() - start)
            setResult(data.result || 'No result returned')
            setRunnerMeta({ status: data.status, mode: data.mode, dry_run: data.dry_run })
            setLoading(false)
        }
      }
    } catch {
      setResponseTime(Date.now() - start)
      setAgentError('Network error — check server logs')
      setLoading(false)
    }
  }

  const runBuilderPlaybook = async () => {
    if (!builderGoal.trim()) {
      setAgentError('Builder goal is required before running a playbook.')
      return
    }

    setCtoRunResult(null)
    const payload = buildPlaybookPayload()
    await runAgent('code', payload, {
      userId: builderUserId.trim() || 'dev-user',
      projectId: builderProjectId.trim() || 'sandbox-project',
    })
  }

  const runBusinessDeepDive = async () => {
    if (enabledBusinessFeatures.length === 0) {
      setAgentError('Select at least one business feature before running a deep-dive.')
      return
    }

    const selectedFeatures = businessBuilderFeatures
      .filter((feature) => enabledBusinessFeatures.includes(feature.id))
      .map((feature) => feature.name)

    const deepDivePayload = JSON.stringify(
      {
        blueprint: 'business',
        intent: 'senior-strategy-and-execution',
        focus: selectedFeatures,
        aiOptimizations: enabledAiOptimizations,
        goal: builderGoal.trim(),
      },
      null,
      2
    )

    await runAgent('seo', deepDivePayload, {
      userId: builderUserId.trim() || 'dev-user',
      projectId: builderProjectId.trim() || 'sandbox-project',
    })
  }

  const runGameBuilderDeepDive = async () => {
    const deepDivePayload = JSON.stringify(
      {
        blueprint: 'game',
        track: selectedGameTrack,
        marketplaceReady: gameMarketplaceReady,
        aiOptimizations: enabledAiOptimizations,
        goal: builderGoal.trim(),
      },
      null,
      2
    )

    await runAgent('code', deepDivePayload, {
      userId: builderUserId.trim() || 'dev-user',
      projectId: builderProjectId.trim() || 'sandbox-project',
    })
  }

  const queueMarketplaceGameTask = async () => {
    const description = `Build ${selectedGameTrack.name} assets and publish marketplace package with versioning, docs, and monetization checks.`
    const ok = await addCtoTask('feature', description)
    if (ok) {
      setTab('cto')
      fetchCtoTasks()
    }
  }

  const queueBuilderTask = async () => {
    const description = builderGoal.trim()
    if (!description) {
      setAgentError('Builder goal is required before adding a CTO queue task.')
      return
    }

    const ok = await addCtoTask(builderTaskType, description)
    if (ok) {
      setTab('cto')
      fetchCtoTasks()
    }
  }

  const queueBlueprintTask = async () => {
    const ok = await addCtoTask('feature', selectedBlueprint.ctoTaskDescription)
    if (ok) {
      setTab('cto')
      fetchCtoTasks()
    }
  }

  const queueAndRunBlueprintTask = async () => {
    const ok = await addCtoTask('feature', selectedBlueprint.ctoTaskDescription)
    if (!ok) return

    setTab('cto')
    await runCtoTaskOnce()
  }

  const runCtoTaskOnce = async () => {
    setCtoRunLoading(true)
    setCtoRunResult(null)
    setAgentError(null)

    try {
      const res = await fetch('/api/cto/run', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      setCtoRunResult(JSON.stringify(data, null, 2))

      if (!res.ok) {
        setAgentError(data.error || `CTO runner failed (HTTP ${res.status})`)
      } else {
        fetchCtoTasks()
      }
    } catch {
      setAgentError('Network error while running CTO task')
    } finally {
      setCtoRunLoading(false)
    }
  }

  const runBuildCortex = async (actionOverride?: BuildCortexAction) => {
    const action = actionOverride || buildCortexAction
    const prompt = buildCortexPrompt.trim()

    if (!prompt) {
      setAgentError('Feature request prompt is required.')
      return
    }

    setBuildCortexLoading(true)
    setAgentError(null)

    try {
      const res = await fetch('/api/cortex/spec-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          action,
          modificationNotes: buildCortexNotes.trim() || undefined,
          enqueueToCto: buildCortexEnqueueToCto,
        }),
      })

      const data = await res.json().catch(() => ({})) as {
        error?: string
        spec?: Record<string, unknown>
        queue?: { added: number; total: number }
      }

      if (!res.ok || !data.spec) {
        throw new Error(data.error || `Build Cortex request failed (HTTP ${res.status})`)
      }

      setBuildCortexAction(action)
      setBuildCortexSpec(data.spec)
      setBuildCortexQueueInfo(data.queue || null)

      if (data.queue) {
        fetchCtoTasks()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Build Cortex run failed'
      setAgentError(message)
    } finally {
      setBuildCortexLoading(false)
    }
  }

  const pushBuilderAssistantMessage = (role: AdminBuilderChatMessage['role'], text: string) => {
    setBuilderAssistantMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        text,
      },
    ])
  }

  const runBuilderAssistantChat = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? builderAssistantInput).trim()
    if (!prompt || builderAssistantLoading) return

    setBuilderAssistantLoading(true)
    setAgentError(null)
    pushBuilderAssistantMessage('user', prompt)

    const isApplyMode = builderAssistantMode === 'apply'
    if (isApplyMode && !builderAssistantDryRun && !builderAssistantToken.trim()) {
      setAgentError('Human approval token is required for apply mode when dry run is disabled.')
      pushBuilderAssistantMessage('system', 'Missing human approval token for apply mode execution.')
      setBuilderAssistantLoading(false)
      return
    }

    const payload = {
      agentType: 'code',
      mode: isApplyMode ? 'apply' : 'propose',
      dryRun: isApplyMode ? builderAssistantDryRun : true,
      task: JSON.stringify(
        {
          operation: 'autonomous-self-improvement',
          objective: prompt,
          commands: ['npm run lint', 'npm run build'],
          guardrails: [
            'Avoid destructive git commands',
            'Preserve existing APIs unless explicitly requested',
            'Return concise implementation summary with risks',
          ],
        },
        null,
        2
      ),
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (builderAssistantToken.trim()) {
        headers['X-Human-Token'] = builderAssistantToken.trim()
      }

      const res = await fetch('/api/agents', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json().catch(() => ({})) as {
        error?: string
        detail?: string
        status?: string
        mode?: string
        dry_run?: boolean
        result?: string
      }

      if (!res.ok) {
        throw new Error(data.error || data.detail || `Builder assistant failed (HTTP ${res.status})`)
      }

      pushBuilderAssistantMessage(
        'assistant',
        [
          `Status: ${data.status || 'unknown'}`,
          `Mode: ${data.mode || payload.mode} | Dry-run: ${String(data.dry_run ?? payload.dryRun)}`,
          '',
          data.result || 'No agent output returned.',
        ].join('\n')
      )

      setBuilderAssistantInput('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Autonomous builder chat failed'
      setAgentError(message)
      pushBuilderAssistantMessage('system', `Error: ${message}`)
    } finally {
      setBuilderAssistantLoading(false)
    }
  }

  const logoutAdmin = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      window.location.href = '/admin/login'
    }
  }

  const handleAssetUpdate = async (id: string, content: string) => {
    try {
      await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      setAssets(prev => prev.map(a => (a.id === id ? { ...a, content } : a)))
    } catch (err) {
      console.error('Failed to update asset', err)
    }
  }

  return (
    <div className="flex h-screen bg-black text-white">

      {/* Sidebar */}
      <div className="w-56 bg-gray-900 p-6 flex flex-col">
        <h2 className="text-xl font-bold">CORTEX</h2>
        <p className="flex items-center gap-1 text-xs text-gray-500 mb-4">
          <ShieldCheck className="w-3 h-3" /> Admin developer area
        </p>

        <div className="space-y-2">
          <button onClick={()=>setTab('dashboard')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Dashboard</button>
          <button onClick={()=>setTab('builders')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Builders</button>
          <button onClick={() => { setTab('marketplace'); void fetchMarketplaceStatus(); }} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Marketplace</button>
          <button onClick={()=>setTab('build-cortex')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Build Cortex</button>
          <button onClick={()=>setTab('agents')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Agents</button>
          <button onClick={()=>setTab('plugins')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Plugins</button>
          <button onClick={() => { setTab('cto'); fetchCtoTasks(); }} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">CTO Tasks</button>
          <button onClick={()=>setTab('database')} className="block w-full text-left hover:bg-gray-800 px-3 py-2 rounded">Database</button>
        </div>

        <div className="mt-auto pt-4 border-t border-white/10">
          <p className="text-xs text-gray-500 mb-2">Signed in as {adminUsername}</p>
          <button
            onClick={logoutAdmin}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 text-sm"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>

      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {tab === 'dashboard' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Developer Dashboard</h1>
                <p className="text-gray-400 mt-1">Cortex engine — AI agents, assets &amp; monitoring.</p>
              </div>
              <button
                onClick={fetchHealth}
                disabled={healthLoading}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${healthLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {/* System Health */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-semibold text-white">System Health</h2>
                {health && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    health.status === 'ok'
                      ? 'bg-green-500/20 text-green-400'
                      : health.status === 'degraded'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {health.status.toUpperCase()}
                  </span>
                )}
                {!health && healthLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
              </div>
              {health && Object.keys(health.checks).length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(health.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 bg-black/30 rounded-lg px-3 py-2">
                      {value === true || (typeof value === 'string' && value !== 'unavailable' && value !== 'timeout' && value !== 'unreachable')
                        ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                        : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      }
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 capitalize truncate">{key.replace(/_/g, ' ')}</p>
                        {typeof value === 'string' && value !== 'ok' && (
                          <p className="text-xs text-gray-500 truncate">{value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!health && !healthLoading && (
                <p className="text-gray-500 text-sm">Click Refresh to check system status.</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Agent Types', value: '15', color: 'text-purple-400' },
                { label: 'API Routes', value: '5', color: 'text-blue-400' },
                { label: 'Python', value: typeof health?.checks?.python === 'string' ? health.checks.python.split(' ')[1] ?? 'ok' : (health?.checks?.python ? 'ok' : '—'), color: 'text-green-400' },
                { label: 'Database', value: health?.checks?.database ? 'Online' : 'Pending', color: health?.checks?.database ? 'text-green-400' : 'text-yellow-400' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'builders' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold mb-2">In-App Self-Builder</h1>
              <p className="text-gray-400">Run guided builder playbooks, then optionally queue bigger work for the CTO loop.</p>
            </div>

            <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-xl p-4 text-sm">
              <p className="text-cyan-200 font-medium mb-2">Quick start</p>
              <p className="text-gray-200">1) Choose Website, App, Business, or Game Builder. 2) Keep Preview mode + Dry run on. 3) Click Run and review output before apply mode.</p>
              <p className="text-gray-400 mt-2"><span className="text-white font-medium">Dry run means:</span> simulation only. No files are changed and no commands are executed.</p>
            </div>

            <div className="rounded-xl border border-emerald-400/30 bg-gradient-to-r from-emerald-600/15 via-slate-900/50 to-amber-500/15 p-4">
              <h2 className="text-sm font-semibold text-emerald-200 mb-2">Stage 2 UX Guidance: Communication + Psychology Design</h2>
              <p className="text-xs text-gray-200">Trust colors: teal and cyan for confidence. Action colors: amber for decision moments. Calm neutrals reduce cognitive load for longer strategy sessions.</p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-3 text-[11px]">
                <span className="rounded bg-cyan-500/20 border border-cyan-400/30 px-2 py-1 text-cyan-100">Trust: cyan</span>
                <span className="rounded bg-emerald-500/20 border border-emerald-400/30 px-2 py-1 text-emerald-100">Growth: emerald</span>
                <span className="rounded bg-amber-500/20 border border-amber-400/30 px-2 py-1 text-amber-100">Action: amber</span>
                <span className="rounded bg-slate-500/20 border border-slate-400/30 px-2 py-1 text-slate-100">Clarity: slate</span>
              </div>
            </div>

            <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-6">
              <h2 className="font-semibold text-emerald-300 mb-2">AI Optimization Layer</h2>
              <p className="text-xs text-gray-400 mb-4">Enable advanced AI execution patterns before running a builder playbook.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {aiOptimizationOptions.map((option) => (
                  <label key={option.id} className="flex items-start gap-3 rounded-lg border border-white/10 bg-black/30 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={enabledAiOptimizations.includes(option.id)}
                      onChange={() => toggleAiOptimization(option.id)}
                      className="accent-emerald-500 mt-1"
                    />
                    <span>
                      <span className="font-medium text-white block">{option.label}</span>
                      <span className="text-xs text-gray-400">{option.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-cyan-500/20 rounded-xl p-6">
              <h2 className="font-semibold text-cyan-300 mb-2">Builder Blueprints</h2>
              <p className="text-xs text-gray-500 mb-4">Use these presets to preload goals, recommended planning commands, and CTO queue tasks.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {builderBlueprints.map((blueprint) => {
                  const active = blueprint.id === selectedBlueprint.id
                  return (
                    <button
                      key={blueprint.id}
                      onClick={() => setBlueprint(blueprint.id)}
                      className={`text-left rounded-lg border p-4 transition-colors ${active ? 'border-cyan-400/50 bg-cyan-500/10' : 'border-white/10 bg-black/30 hover:bg-black/40'}`}
                    >
                      <p className="text-sm font-semibold text-white">{blueprint.name}</p>
                      <p className="text-xs text-gray-400 mt-1">{blueprint.description}</p>
                    </button>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400 mt-4">Selected: <span className="text-white">{selectedBlueprint.name}</span></p>
              <div className="mt-3 rounded-lg border border-white/10 bg-black/30 p-3">
                <p className="text-xs text-gray-500 mb-2">Target outcomes</p>
                <ul className="space-y-1">
                  {selectedBlueprint.outcomes.map((outcome) => (
                    <li key={outcome} className="text-xs text-gray-300">- {outcome}</li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 mt-3">
                <button
                  onClick={queueBlueprintTask}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30"
                >
                  Queue Blueprint In CTO
                </button>
                <button
                  onClick={queueAndRunBlueprintTask}
                  disabled={ctoRunLoading}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 disabled:opacity-50"
                >
                  Queue And Run Once
                </button>
              </div>
            </div>

            {selectedBlueprint.id === 'business' && (
              <div className="bg-white/5 border border-emerald-500/20 rounded-xl p-6">
                <h2 className="font-semibold text-emerald-300 mb-2">Business Builder: Additional Growth Features</h2>
                <p className="text-xs text-gray-500 mb-4">Select features to include in your deep-dive strategy pack before running the SEO + GEO agent workflow.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {businessBuilderFeatures.map((feature) => (
                    <label key={feature.id} className="rounded-lg border border-white/10 bg-black/30 p-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={enabledBusinessFeatures.includes(feature.id)}
                          onChange={() => toggleBusinessFeature(feature.id)}
                          className="accent-emerald-500 mt-1"
                        />
                        <span>
                          <span className="text-sm font-medium text-white block">{feature.name}</span>
                          <span className="text-xs text-gray-400 block mt-1">{feature.description}</span>
                          <span className="text-[11px] text-emerald-300 block mt-2">Impact: {feature.valueImpact}</span>
                        </span>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={runBusinessDeepDive}
                    disabled={loading && activeAgent === 'seo'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50"
                  >
                    {loading && activeAgent === 'seo' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Business Deep-Dive
                  </button>

                  <button
                    onClick={queueBuilderTask}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
                  >
                    Queue Business Goal
                  </button>
                </div>
              </div>
            )}

            {selectedBlueprint.id === 'game' && (
              <div className="bg-white/5 border border-fuchsia-500/20 rounded-xl p-6">
                <h2 className="font-semibold text-fuchsia-300 mb-2">Game Builder Engine: Marketplace Production</h2>
                <p className="text-xs text-gray-500 mb-4">Choose a game track, then run deep planning and queue a marketplace-ready delivery task.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {gameBuilderTracks.map((track) => {
                    const active = track.id === selectedGameTrack.id
                    return (
                      <button
                        key={track.id}
                        onClick={() => setGameTrackId(track.id)}
                        className={`rounded-lg border p-3 text-left transition-colors ${active ? 'border-fuchsia-400/50 bg-fuchsia-500/10' : 'border-white/10 bg-black/30 hover:bg-black/40'}`}
                      >
                        <p className="text-sm font-semibold text-white">{track.name}</p>
                        <p className="text-xs text-gray-400 mt-1">{track.description}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="rounded-lg border border-white/10 bg-black/30 p-3 mt-3">
                  <p className="text-xs text-gray-500 mb-2">Current track priorities</p>
                  <ul className="space-y-1">
                    {selectedGameTrack.defaultGoals.map((goal) => (
                      <li key={goal} className="text-xs text-gray-300">- {goal}</li>
                    ))}
                  </ul>
                </div>

                <label className="text-xs text-gray-300 flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    checked={gameMarketplaceReady}
                    onChange={(e) => setGameMarketplaceReady(e.target.checked)}
                    className="accent-fuchsia-500"
                  />
                  Include marketplace packaging and monetization checks
                </label>

                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={runGameBuilderDeepDive}
                    disabled={loading && activeAgent === 'code'}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-500/30 disabled:opacity-50"
                  >
                    {loading && activeAgent === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    Run Game Deep-Dive
                  </button>

                  <button
                    onClick={queueMarketplaceGameTask}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
                  >
                    Queue Marketplace Package Task
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white/5 border border-amber-500/20 rounded-xl p-6">
              <h2 className="font-semibold text-amber-300 mb-3">Self-Builder Playbook Runner</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Playbook
                  <select
                    value={builderPlaybookId}
                    onChange={(e) => setBuilderPlaybookId(e.target.value)}
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  >
                    {builderPlaybooks.map((playbook) => (
                      <option key={playbook.id} value={playbook.id}>
                        {playbook.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-[11px] text-gray-500">{selectedPlaybook.description}</span>
                </label>

                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Run Type
                  <select
                    value={agentMode}
                    onChange={(e) => setAgentMode(e.target.value as 'propose' | 'apply')}
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  >
                    <option value="propose">Preview plan only (apply is hidden in Build Cortex)</option>
                  </select>
                </label>

                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Workspace User
                  <input
                    value={builderUserId}
                    onChange={(e) => setBuilderUserId(e.target.value)}
                    placeholder="dev-user"
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  />
                </label>

                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Workspace Project
                  <input
                    value={builderProjectId}
                    onChange={(e) => setBuilderProjectId(e.target.value)}
                    placeholder="sandbox-project"
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  />
                </label>

                <label className="text-xs text-gray-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Dry run (simulation only)
                </label>

                <label className="text-xs text-gray-300 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={useQueue}
                    onChange={(e) => setUseQueue(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Use Async Queue (runs in worker)
                </label>

                <div className="text-xs text-gray-400 md:col-span-2 rounded border border-white/10 bg-black/30 px-2 py-2">
                  Apply mode execution is intentionally hidden in Build Cortex chat for controlled autonomous changes.
                </div>
              </div>

              <label className="text-xs text-gray-300 block mb-1">Builder Goal</label>
              <textarea
                value={builderGoal}
                onChange={(e) => setBuilderGoal(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-amber-500/50 h-24"
                placeholder="Describe what the self-builder should accomplish in this pass..."
              />

              <p className="text-xs text-gray-500 mt-3 mb-2">Code Agent payload preview</p>
              <pre className="text-xs text-gray-300 bg-black/40 border border-white/10 rounded-lg p-3 whitespace-pre-wrap">{buildPlaybookPayload()}</pre>

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={runBuilderPlaybook}
                  disabled={loading && activeAgent === 'code'}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 disabled:opacity-50"
                >
                  {loading && activeAgent === 'code' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run Code Agent Playbook
                </button>

                <button
                  onClick={() => setTask(buildPlaybookPayload())}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 border border-white/10"
                >
                  Send Payload To Agents Tab
                </button>
              </div>
            </div>

            <div className="bg-white/5 border border-purple-500/20 rounded-xl p-6">
              <h2 className="font-semibold text-purple-300 mb-2">CTO Queue Bridge</h2>
              <p className="text-xs text-gray-500 mb-4">Queue high-level feature or self-improvement goals, then execute one queued task directly from the app.</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Task Type
                  <select
                    value={builderTaskType}
                    onChange={(e) => setBuilderTaskType(e.target.value as 'feature' | 'bugfix' | 'self-improvement')}
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  >
                    <option value="feature">feature</option>
                    <option value="bugfix">bugfix</option>
                    <option value="self-improvement">self-improvement</option>
                  </select>
                </label>

                <button
                  onClick={queueBuilderTask}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30"
                >
                  Add Goal To CTO Queue
                </button>

                <button
                  onClick={runCtoTaskOnce}
                  disabled={ctoRunLoading}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 disabled:opacity-50"
                >
                  {ctoRunLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Run One Queued CTO Task
                </button>
              </div>

              {ctoRunResult && (
                <pre className="text-xs text-gray-300 bg-black/40 border border-white/10 rounded-lg p-3 whitespace-pre-wrap mt-4">{ctoRunResult}</pre>
              )}
            </div>
          </div>
        )}

        {tab === 'marketplace' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold">Marketplace Control Center</h1>
                <p className="text-gray-400 mt-1">High-ROI contractor marketplace with lead scoring, smart routing, and claim versus auto-assign controls.</p>
              </div>
              <button
                onClick={fetchMarketplaceStatus}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
              >
                Refresh Integrations
              </button>
            </div>

            <section className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-5">
              <h2 className="text-lg font-semibold text-cyan-100 mb-3">Integration Readiness</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {marketplaceIntegrations.map((integration) => (
                  <article key={integration.id} className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs">
                    <p className="font-semibold text-white">{integration.label}</p>
                    <p className="text-gray-300 mt-1">{integration.nextStep}</p>
                    <p className="mt-2">
                      Status: <span className={integration.configured ? 'text-emerald-300' : 'text-amber-300'}>{integration.configured ? 'configured' : 'needs setup'}</span>
                    </p>
                    <p className="text-gray-500 mt-1">Env vars: {integration.envVars.join(' | ')}</p>
                  </article>
                ))}
              </div>
              {marketplaceIntegrations.length === 0 ? (
                <p className="text-xs text-gray-400">No marketplace integration status loaded yet.</p>
              ) : null}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
              <article className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-5">
                <h2 className="text-lg font-semibold text-indigo-100 mb-3">Lead Scoring + Routing Simulation</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <label className="text-xs text-gray-300">
                    Service type
                    <input
                      value={marketplaceServiceType}
                      onChange={(e) => setMarketplaceServiceType(e.target.value)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    Project type
                    <input
                      value={marketplaceProjectType}
                      onChange={(e) => setMarketplaceProjectType(e.target.value)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    Budget USD
                    <input
                      type="number"
                      value={marketplaceBudgetUsd}
                      onChange={(e) => setMarketplaceBudgetUsd(Number(e.target.value) || 0)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    Timeline days
                    <input
                      type="number"
                      value={marketplaceTimelineDays}
                      onChange={(e) => setMarketplaceTimelineDays(Number(e.target.value) || 1)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    ZIP code
                    <input
                      value={marketplaceZipCode}
                      onChange={(e) => setMarketplaceZipCode(e.target.value)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-gray-300">
                    Homeowner name
                    <input
                      value={marketplaceHomeownerName}
                      onChange={(e) => setMarketplaceHomeownerName(e.target.value)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                </div>

                <label className="text-xs text-gray-300 block mt-2">
                  Notes
                  <textarea
                    value={marketplaceNotes}
                    onChange={(e) => setMarketplaceNotes(e.target.value)}
                    className="mt-1 w-full min-h-20 rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                  />
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <label className="text-xs text-gray-300">
                    Assignment mode
                    <select
                      value={marketplaceAssignmentMode}
                      onChange={(e) => setMarketplaceAssignmentMode(e.target.value as 'claim' | 'auto-assign')}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    >
                      <option value="claim">claim (pay-per-lead)</option>
                      <option value="auto-assign">auto-assign (premium tier)</option>
                    </select>
                  </label>
                  <label className="text-xs text-gray-300">
                    Claim window minutes
                    <input
                      type="number"
                      value={marketplaceClaimWindowMinutes}
                      onChange={(e) => setMarketplaceClaimWindowMinutes(Number(e.target.value) || 15)}
                      className="mt-1 w-full rounded bg-black/40 border border-white/10 px-2 py-2 text-sm"
                    />
                  </label>
                </div>

                <button
                  onClick={runMarketplaceSimulation}
                  disabled={marketplaceLoading}
                  className="mt-3 rounded-lg bg-blue-500/30 hover:bg-blue-500/40 border border-blue-400/40 px-4 py-2 text-sm font-medium disabled:opacity-60"
                >
                  {marketplaceLoading ? 'Running simulation...' : 'Run Marketplace Simulation'}
                </button>
              </article>

              <article className="rounded-xl border border-white/15 bg-black/30 p-5">
                <h2 className="text-lg font-semibold text-cyan-100 mb-3">Simulation Output</h2>
                {!marketplaceRouting ? (
                  <p className="text-sm text-gray-400">Run simulation to view intent score, premium pricing, and ranked contractor output.</p>
                ) : (
                  <div className="space-y-3 text-sm text-gray-200">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p>Intent score: <span className="font-semibold text-white">{marketplaceRouting.intent.score}</span> ({marketplaceRouting.intent.band})</p>
                      <p className="text-xs mt-1">Premium lead price: ${marketplaceRouting.intent.premiumLeadPriceUsd}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-white">Assignment</p>
                      {marketplaceRouting.assignment.status === 'assigned' ? (
                        <p className="text-emerald-200 mt-1">Auto-assigned to {marketplaceRouting.assignment.assignedContractorName}</p>
                      ) : (
                        <p className="text-amber-200 mt-1">Claim window open for {marketplaceRouting.assignment.claimWindowMinutes} minutes</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                      <p>Speed benchmark: {marketplaceRouting.speedAdvantage.expectedBestResponseMinutes} min best response</p>
                      <p>Target threshold: {marketplaceRouting.speedAdvantage.benchmarkFirstResponseMinutes} min</p>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <p className="font-medium text-white mb-2">Top contractors</p>
                      <ul className="space-y-2 text-xs">
                        {marketplaceRouting.rankedContractors.map((contractor) => (
                          <li key={contractor.id} className="rounded border border-white/10 bg-black/30 px-2 py-2">
                            <p className="font-semibold text-white">{contractor.name}</p>
                            <p className="text-gray-300 mt-1">
                              Tier {contractor.tier.toUpperCase()} | score {contractor.routingScore} | response {contractor.responseTimeMinutes}m | win {Math.round(contractor.winRate * 100)}%
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </article>
            </section>

            <section className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-5">
              <h2 className="text-lg font-semibold text-amber-100 mb-2">Priority Roadmap</h2>
              {marketplaceRoadmap.length === 0 ? (
                <p className="text-sm text-gray-400">Roadmap not loaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  {marketplaceRoadmap.map((item) => (
                    <article key={item.phase} className="rounded-lg border border-white/10 bg-black/25 p-3">
                      <p className="font-semibold text-white">{item.phase}</p>
                      <ul className="mt-2 space-y-1 text-gray-300">
                        {item.focus.map((focus) => (
                          <li key={focus}>- {focus}</li>
                        ))}
                      </ul>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'build-cortex' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-amber-300" /> Build Cortex
                </h1>
                <p className="text-gray-400 mt-1">Feature Request to Spec Generator to Sandbox Plan to Deploy Readiness</p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm">
              <p className="text-amber-100 font-medium">Suggested prompt</p>
              <p className="text-gray-200 mt-1">Create a referral rewards system for cleaning businesses</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Feature Request</label>
                <textarea
                  value={buildCortexPrompt}
                  onChange={(e) => setBuildCortexPrompt(e.target.value)}
                  className="w-full h-28 rounded-lg border border-white/10 bg-black/40 p-3 text-sm"
                  placeholder="Describe the feature to generate a complete spec..."
                />
              </div>

              <div>
                <label className="text-sm text-gray-300 block mb-1">Modification Notes (optional)</label>
                <textarea
                  value={buildCortexNotes}
                  onChange={(e) => setBuildCortexNotes(e.target.value)}
                  className="w-full h-20 rounded-lg border border-white/10 bg-black/40 p-3 text-sm"
                  placeholder="Add constraints or edits before generating..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Action
                  <select
                    value={buildCortexAction}
                    onChange={(e) => setBuildCortexAction(e.target.value as BuildCortexAction)}
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  >
                    <option value="preview">preview</option>
                    <option value="approve">approve</option>
                    <option value="modify">modify</option>
                    <option value="deploy">deploy</option>
                  </select>
                </label>

                <label className="text-xs text-gray-300 flex items-center gap-2 md:mt-5">
                  <input
                    type="checkbox"
                    checked={buildCortexEnqueueToCto}
                    onChange={(e) => setBuildCortexEnqueueToCto(e.target.checked)}
                    className="accent-amber-500"
                  />
                  Enqueue generated tasks to CTO queue
                </label>

                <button
                  onClick={() => runBuildCortex()}
                  disabled={buildCortexLoading}
                  className="h-10 mt-auto rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-sm font-medium disabled:opacity-60"
                >
                  {buildCortexLoading ? 'Generating...' : 'Run Build Cortex'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => runBuildCortex('approve')}
                  disabled={buildCortexLoading}
                  className="px-3 py-2 rounded-lg text-sm bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => runBuildCortex('modify')}
                  disabled={buildCortexLoading}
                  className="px-3 py-2 rounded-lg text-sm bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 disabled:opacity-60"
                >
                  Modify
                </button>
                <button
                  onClick={() => runBuildCortex('deploy')}
                  disabled={buildCortexLoading}
                  className="px-3 py-2 rounded-lg text-sm bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 disabled:opacity-60"
                >
                  Deploy
                </button>
              </div>

              {buildCortexQueueInfo && (
                <p className="text-xs text-emerald-200">Queued {buildCortexQueueInfo.added} task(s). Total queue size: {buildCortexQueueInfo.total}.</p>
              )}
            </div>

            {buildCortexSpec && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h2 className="text-sm font-semibold text-cyan-200 mb-2">Preview UI</h2>
                  <pre className="text-xs text-gray-200 whitespace-pre-wrap">{JSON.stringify((buildCortexSpec as Record<string, unknown>).ui || [], null, 2)}</pre>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                  <h2 className="text-sm font-semibold text-amber-200 mb-2">Schema Changes</h2>
                  <pre className="text-xs text-gray-200 whitespace-pre-wrap">{JSON.stringify((buildCortexSpec as Record<string, unknown>).schema || {}, null, 2)}</pre>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/30 p-4 xl:col-span-2">
                  <h2 className="text-sm font-semibold text-emerald-200 mb-2">Workflows</h2>
                  <pre className="text-xs text-gray-200 whitespace-pre-wrap">{JSON.stringify((buildCortexSpec as Record<string, unknown>).workflows || [], null, 2)}</pre>
                </div>
              </div>
            )}

            <section className="rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-fuchsia-100">Hidden Admin Autonomous Builder Chat</h2>
                  <p className="text-xs text-fuchsia-200/80 mt-1">
                    This is the only surface with direct autonomous self-edit capability.
                  </p>
                </div>
                <button
                  onClick={() => setShowAutonomousBuilderChat((prev) => !prev)}
                  className="rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-xs hover:bg-black/40"
                >
                  {showAutonomousBuilderChat ? 'Hide' : 'Show'}
                </button>
              </div>

              {showAutonomousBuilderChat ? (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="text-xs text-gray-300 flex flex-col gap-1">
                      Mode
                      <select
                        value={builderAssistantMode}
                        onChange={(e) => setBuilderAssistantMode(e.target.value as 'propose' | 'apply')}
                        className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                      >
                        <option value="propose">propose</option>
                        <option value="apply">apply</option>
                      </select>
                    </label>

                    <label className="text-xs text-gray-300 flex items-center gap-2 md:mt-5">
                      <input
                        type="checkbox"
                        checked={builderAssistantDryRun}
                        onChange={(e) => setBuilderAssistantDryRun(e.target.checked)}
                        className="accent-fuchsia-500"
                      />
                      Dry run safeguard
                    </label>

                    <label className="text-xs text-gray-300 flex flex-col gap-1">
                      Human Approval Token
                      <input
                        type="password"
                        value={builderAssistantToken}
                        onChange={(e) => setBuilderAssistantToken(e.target.value)}
                        placeholder="Required for apply + no dry-run"
                        className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <textarea
                    value={builderAssistantInput}
                    onChange={(e) => setBuilderAssistantInput(e.target.value)}
                    className="w-full min-h-24 rounded-lg border border-white/10 bg-black/40 p-3 text-sm"
                    placeholder="Prompt autonomous self-improvement changes..."
                  />

                  <div className="flex flex-wrap gap-2">
                    {buildCortexQuickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => {
                          setBuilderAssistantInput(prompt)
                          void runBuilderAssistantChat(prompt)
                        }}
                        className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 text-xs hover:bg-black/40"
                      >
                        {prompt.slice(0, 58)}...
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => runBuilderAssistantChat()}
                    disabled={builderAssistantLoading}
                    className="rounded-lg bg-fuchsia-500/30 hover:bg-fuchsia-500/40 border border-fuchsia-400/40 px-4 py-2 text-sm font-medium disabled:opacity-60"
                  >
                    {builderAssistantLoading ? 'Running autonomous pass...' : 'Run Autonomous Builder Chat'}
                  </button>

                  <div className="max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-black/30 p-3 space-y-2">
                    {builderAssistantMessages.map((message) => (
                      <article
                        key={message.id}
                        className={`rounded-lg border px-3 py-2 text-xs whitespace-pre-wrap ${
                          message.role === 'assistant'
                            ? 'border-fuchsia-300/30 bg-fuchsia-500/10 text-fuchsia-50'
                            : message.role === 'user'
                            ? 'border-white/20 bg-white/10 text-white'
                            : 'border-amber-300/30 bg-amber-500/10 text-amber-100'
                        }`}
                      >
                        <p className="text-[10px] uppercase tracking-wide opacity-70 mb-1">{message.role}</p>
                        {message.text}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}

        {tab === 'agents' && (
          <div className="space-y-6">
            <h1 className="text-2xl font-semibold mb-4">AI Agents</h1>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <h2 className="font-semibold text-white mb-3">Run AI Agent</h2>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="Give an AI agent a task..."
                className={`w-full bg-black/50 border rounded-lg p-3 text-white placeholder-gray-500 text-sm resize-none focus:outline-none h-24 ${
                  task.length > 8000 ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-purple-500/50'
                }`}
              />
              <div className="flex justify-end mt-1 mb-3">
                <span className={`text-xs ${ task.length > 8000 ? 'text-red-400' : 'text-gray-500' }`}>
                  {task.length.toLocaleString()} / 8,000{task.length > 8000 ? ' — will be truncated' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <label className="text-xs text-gray-300 flex flex-col gap-1">
                  Run Type
                  <select
                    value={agentMode}
                    onChange={(e) => setAgentMode(e.target.value as 'propose' | 'apply')}
                    className="bg-black/60 border border-white/10 rounded px-2 py-2 text-sm"
                  >
                    <option value="propose">Preview plan only (apply is hidden in Build Cortex)</option>
                  </select>
                </label>

                <label className="text-xs text-gray-300 flex items-center gap-2 mt-5 md:mt-0">
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Dry run (simulation only)
                </label>

                <label className="text-xs text-gray-300 flex items-center gap-2 mt-5 md:mt-0">
                  <input
                    type="checkbox"
                    checked={useQueue}
                    onChange={(e) => setUseQueue(e.target.checked)}
                    className="accent-blue-500"
                  />
                  Use Async Queue
                </label>

                <div className="text-xs text-gray-400 rounded border border-white/10 bg-black/30 px-2 py-2 md:col-span-1">
                  Need apply mode? Use the hidden Build Cortex autonomous chat panel.
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">Dry run simulates changes safely. Switch it off only when you want real execution.</p>

              <p className="text-xs text-gray-500 mb-4">
                For Code Agent commands, use JSON like {'{"commands":["npm run lint","python -m pytest tests/test_engine_checks.py"]}'} or lines prefixed with cmd:.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => runAgent(agent.type)}
                    disabled={loading && activeAgent === agent.type}
                    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${loading && activeAgent === agent.type ? 'opacity-50 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}
                  >
                    {loading && activeAgent === agent.type ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                    {agent.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Agent output / error */}
            {(result || agentError || jobId) && (
              <div className={`bg-white/5 border rounded-xl p-6 mt-4 ${
                agentError || (jobStatus === 'failed') ? 'border-red-500/30' : 'border-green-500/20'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {agentError || (jobStatus === 'failed')
                      ? <XCircle className="w-4 h-4 text-red-400" />
                      : <Bot className="w-4 h-4 text-green-400" />
                    }
                    <h3 className={`font-semibold ${ agentError || (jobStatus === 'failed') ? 'text-red-400' : 'text-green-400' }`}>
                      {agentError || (jobStatus === 'failed') ? 'Agent Error' : 'Agent Output'}
                    </h3>
                  </div>
                  {responseTime !== null && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />{responseTime.toLocaleString()}ms
                    </span>
                  )}
                </div>
                <pre className={`text-sm whitespace-pre-wrap ${ agentError || (jobStatus === 'failed') ? 'text-red-300' : 'text-gray-300' }`}>
                  {agentError || result || (jobId ? `Job ${jobId} is ${jobStatus}...` : '')}
                </pre>
                {runnerMeta && (
                  <p className="text-xs text-gray-500 mt-3">
                    status={runnerMeta.status ?? 'unknown'} mode={runnerMeta.mode ?? 'unknown'} dry_run={String(runnerMeta.dry_run)}
                  </p>
                )}
                {jobId && useQueue && (
                  <p className="text-xs text-gray-500 mt-1">
                    Job ID: {jobId} | Status: {jobStatus} {jobWorkspace && `| Workspace: ${jobWorkspace}`}
                  </p>
                )}
              </div>
            )}

            {/* Asset management */}
            <div className="bg-white/5 border border-blue-500/20 rounded-xl p-6 mt-6">
              <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" /> Assets
              </h2>
              {assets.length === 0 && <p className="text-gray-500 text-sm">No assets found.</p>}
              {assets.map(asset => (
                <div key={asset.id} className="mb-3">
                  <p className="text-sm text-gray-400">{asset.type} — {asset.prompt}</p>
                  <textarea
                    value={asset.content || ''}
                    onChange={(e) => handleAssetUpdate(asset.id, e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-white text-sm resize-none focus:outline-none focus:border-blue-400"
                    rows={3}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'cto' && (
           <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                     <h1 className="text-3xl font-bold">Autonomous CTO Agent</h1>
                     <p className="text-gray-400 mt-1">Manage the high-level task queue for the autonomous agent loop.</p>
                </div>
                <button onClick={fetchCtoTasks} className="p-2 hover:bg-white/10 rounded"><RefreshCw className={`w-5 h-5 ${ctoLoading ? 'animate-spin' : ''}`}/></button>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4 text-purple-400">Add New Task</h2>
                <div className="flex gap-2">
                    <button onClick={() => addCtoTask('feature', 'Implement new feature')} className="px-3 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-sm border border-blue-500/30">
                        + Feature
                    </button>
                    <button onClick={() => addCtoTask('bugfix', 'Fix critical bug')} className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm border border-red-500/30">
                        + Bugfix
                    </button>
                     <button onClick={() => addCtoTask('refactor', 'Code refactoring')} className="px-3 py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-400 rounded-lg text-sm border border-amber-500/30">
                        + Refactor
                    </button>
                </div>
                 <p className="text-xs text-gray-500 mt-2">
                    Clicking adds a generic task. The agent loop (engine/ai_agent.py) will pick it up.
                </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                 <h2 className="text-lg font-semibold mb-4">Current Queue</h2>
                 {ctoTasks.length === 0 ? (
                     <p className="text-gray-500 text-sm">No tasks in queue.</p>
                 ) : (
                     <ul className="space-y-3">
                         {ctoTasks.map((t, i) => (
                             <li key={i} className="bg-black/40 rounded-lg p-3 border border-white/5 flex flex-col gap-1">
                                 <div className="flex justify-between items-start">
                                     <span className={`text-xs px-2 py-0.5 rounded uppercase font-bold ${
                                         t.type === 'feature' ? 'text-blue-400 bg-blue-500/10' :
                                         t.type === 'bugfix' ? 'text-red-400 bg-red-500/10' :
                                         'text-gray-400 bg-gray-500/10'
                                     }`}>{t.type}</span>
                                     <span className="text-xs text-gray-500">{t.status || 'pending'}</span>
                                 </div>
                                 <p className="text-sm text-gray-300">{t.description}</p>
                                 <span className="text-xs text-gray-600 font-mono">ID: {t.id}</span>
                             </li>
                         ))}
                     </ul>
                 )}
            </div>
           </div>
        )}

        {tab === 'plugins' && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">Plugin Manager</h1>
            <p className="text-gray-400">Manage installed plugins here.</p>
          </div>
        )}

        {tab === 'database' && (
          <div>
            <h1 className="text-2xl font-semibold mb-4">Database Control</h1>
            <p className="text-gray-400">View and manage your assets, tables, and entries.</p>
          </div>
        )}
      </div>

    </div>
  )
}
