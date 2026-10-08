import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import './App.css'
import { RiveStage } from './RiveStage'
import { applyScoreUpdate, CHANNEL_NAME, createDefaultState, loadState, nextTeamName, rankTeams, STORAGE_KEY, type ScoreboardState, type Team } from './scoreboard'

type Commit = (recipe: (state: ScoreboardState) => ScoreboardState) => void

function useLiveScoreboard(): [ScoreboardState, Commit] {
  const [state, setState] = useState(loadState)
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel
    channel.onmessage = (event: MessageEvent<ScoreboardState>) => setState(event.data)
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) setState(JSON.parse(event.newValue) as ScoreboardState)
    }
    window.addEventListener('storage', onStorage)
    return () => { window.removeEventListener('storage', onStorage); channel.close() }
  }, [])

  const commit = useCallback<Commit>((recipe) => {
    setState((current) => {
      const next = recipe(current)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      channelRef.current?.postMessage(next)
      return next
    })
  }, [])

  return [state, commit]
}

const UPDATE_DURATION = 3000
const TEAM_COLORS = ['#ff5f8f', '#58d6ff', '#ffd44d', '#8f70ff', '#55df9a', '#ff8d42', '#e96cff', '#45e2d1', '#ff6f5e', '#78d451', '#54a3ff', '#f4a4ff']

function useAnimatedScore(target: number, celebrationId: number) {
  const [displayed, setDisplayed] = useState(target)
  const currentRef = useRef(target)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || celebrationId === 0) {
      currentRef.current = target
      // This synchronizes the rendered counter with an externally supplied score.
      // oxlint-disable-next-line react/set-state-in-effect
      setDisplayed(target)
      return
    }
    const from = currentRef.current
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / UPDATE_DURATION)
      const eased = progress * progress * (3 - 2 * progress)
      const next = Math.round(from + (target - from) * eased)
      currentRef.current = next
      setDisplayed(next)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, celebrationId])

  return displayed
}

function AnimatedScoreRow({ team, maxScore, celebrationId, color, rowRef }: {
  team: ReturnType<typeof rankTeams>[number]
  maxScore: number
  celebrationId: number
  color: string
  rowRef: (element: HTMLElement | null) => void
}) {
  const displayedScore = useAnimatedScore(team.coins, celebrationId)
  const fill = maxScore > 0 ? Math.max(0, Math.min(100, (displayedScore / maxScore) * 100)) : 0
  return (
    <article ref={rowRef} data-team-id={team.id} style={{ '--team-color': color } as CSSProperties} className={`score-row rank-${team.rank} ${team.rank === 1 ? 'is-leader' : ''}`}>
      <span className="score-fill" style={{ width: `${fill}%` }} />
      <span className="rank-badge">{team.rank}<small>{team.rank === 1 ? 'ST' : team.rank === 2 ? 'ND' : team.rank === 3 ? 'RD' : 'TH'}</small></span>
      <span className="score-name">{team.name}</span>
      <strong>{displayedScore.toLocaleString()}</strong>
    </article>
  )
}

function TVBoard({ state, preview = false }: { state: ScoreboardState; preview?: boolean }) {
  const ranked = useMemo(() => rankTeams(state.teams), [state.teams])
  const leader = ranked[0]
  const maxScore = Math.max(0, ...ranked.map((team) => team.coins))
  const rowElements = useRef(new Map<string, HTMLElement>())
  const previousPositions = useRef(new Map<string, DOMRect>())
  const observedCelebration = useRef(state.celebrationId)
  const [isCelebrating, setIsCelebrating] = useState(false)
  const [showLeader, setShowLeader] = useState(false)

  useEffect(() => {
    if (state.celebrationId === observedCelebration.current) return
    observedCelebration.current = state.celebrationId
    // A new external celebration token starts the three-second visual sequence.
    // oxlint-disable-next-line react/set-state-in-effect
    setIsCelebrating(true)
    // Restart the post-animation leader reveal for each completed score update.
    // oxlint-disable-next-line react/set-state-in-effect
    setShowLeader(false)
    const finish = window.setTimeout(() => setIsCelebrating(false), UPDATE_DURATION + 250)
    const reveal = window.setTimeout(() => setShowLeader(true), UPDATE_DURATION + 100)
    const hide = window.setTimeout(() => setShowLeader(false), UPDATE_DURATION + 4100)
    return () => { window.clearTimeout(finish); window.clearTimeout(reveal); window.clearTimeout(hide) }
  }, [state.celebrationId])

  useLayoutEffect(() => {
    const nextPositions = new Map<string, DOMRect>()
    rowElements.current.forEach((element, id) => {
      const next = element.getBoundingClientRect()
      nextPositions.set(id, next)
      const previous = previousPositions.current.get(id)
      if (!previous || state.celebrationId === 0) return
      const deltaY = previous.top - next.top
      if (Math.abs(deltaY) < 1) return
      element.getAnimations().forEach((animation) => animation.cancel())
      element.animate(
        [{ transform: `translateY(${deltaY}px)`, zIndex: 7 }, { transform: 'translateY(0)', zIndex: 7 }],
        { duration: UPDATE_DURATION, easing: 'cubic-bezier(.65, 0, .35, 1)' },
      )
    })
    previousPositions.current = nextPositions
  }, [ranked, state.celebrationId])

  return (
    <section className={`tv-board ${preview ? 'is-preview' : ''} ${isCelebrating ? 'is-celebrating' : ''}`}>
      <div className="rive-layer">
        <RiveStage title={state.title} leaderName={leader?.name ?? 'READY'} leaderScore={leader?.coins ?? 0} round={state.round} celebrationId={state.celebrationId} energy={state.lastAward} />
      </div>
      <div className="score-grid" aria-label="Team rankings">
        {ranked.map((team) => <AnimatedScoreRow key={team.id} team={team} maxScore={maxScore} celebrationId={state.celebrationId} color={TEAM_COLORS[Math.max(0, state.teams.findIndex((candidate) => candidate.id === team.id)) % TEAM_COLORS.length]} rowRef={(element) => {
          if (element) rowElements.current.set(team.id, element)
          else rowElements.current.delete(team.id)
        }} />)}
      </div>
      {showLeader && leader && <div className="leader-reveal" key={`leader-${state.celebrationId}`} style={{ '--team-color': TEAM_COLORS[Math.max(0, state.teams.findIndex((candidate) => candidate.id === leader.id)) % TEAM_COLORS.length] } as CSSProperties}>
        <span>Leading the party</span><b>{leader.name}</b><strong>{leader.coins.toLocaleString()} coins</strong>
      </div>}
      {isCelebrating && <div className="spectacle-layer" key={state.celebrationId} aria-hidden="true">
        <div className="impact-flash" />
        <div className="energy-wave wave-one" /><div className="energy-wave wave-two" /><div className="energy-wave wave-three" />
        {Array.from({ length: 28 }, (_, index) => <i className="burst-particle" key={index} style={{ '--particle': index } as CSSProperties} />)}
      </div>}
    </section>
  )
}

function TeamEditor({ team, onChange, onRemove, canRemove }: { team: Team; onChange: (patch: Partial<Team>) => void; onRemove: () => void; canRemove: boolean }) {
  return (
    <article className="team-editor">
      <div className="team-editor-heading"><input aria-label="Team name" value={team.name} onChange={(event) => onChange({ name: event.target.value })} /><button className="remove-button" type="button" onClick={onRemove} disabled={!canRemove} aria-label={`Remove ${team.name}`}>×</button></div>
      <label><span>Current coins</span><input type="number" inputMode="numeric" value={team.coins} onChange={(event) => onChange({ coins: Number(event.target.value) || 0 })} /></label>
      <label><span>Add coins</span><input className={team.pending !== 0 ? 'has-pending' : ''} type="number" inputMode="numeric" value={team.pending} onChange={(event) => onChange({ pending: Number(event.target.value) || 0 })} /></label>
    </article>
  )
}

function HostView({ state, commit }: { state: ScoreboardState; commit: Commit }) {
  const hasPending = state.teams.some((team) => team.pending !== 0)
  const updateTeam = (id: string, patch: Partial<Team>) => commit((current) => ({ ...current, teams: current.teams.map((team) => team.id === id ? { ...team, ...patch } : team) }))
  const openTV = () => window.open('/tv', 'superstar-tv', 'popup,width=1280,height=720')

  return (
    <main className="host-shell">
      <section className="preview-column"><TVBoard state={state} preview /><div className="preview-footer"><span><i className="live-dot" /> TV DISPLAY · LIVE 16:9</span><button type="button" onClick={openTV}>Open TV view ↗</button></div></section>
      <aside className="control-panel">
        <div className="eyebrow">Host controls · Rive powered</div><h1>Let the chaos begin.</h1><p className="subtitle">Name the teams. Load the coins. Hit the big button.</p>
        <label className="title-field"><span>Party title</span><input value={state.title} onChange={(event) => commit((current) => ({ ...current, title: event.target.value }))} /></label>
        <div className="section-heading"><div><h2>Your teams</h2><span>{state.teams.length} contenders</span></div><button type="button" onClick={() => commit((current) => ({ ...current, teams: [...current.teams, { id: crypto.randomUUID(), name: nextTeamName(current.teams), coins: 0, pending: 0 }] }))}>+ Add team</button></div>
        <div className="team-list">{state.teams.map((team) => <TeamEditor key={team.id} team={team} canRemove={state.teams.length > 1} onChange={(patch) => updateTeam(team.id, patch)} onRemove={() => commit((current) => ({ ...current, teams: current.teams.filter((candidate) => candidate.id !== team.id) }))} />)}</div>
        <div className="control-actions"><p>{hasPending ? 'Coin cannons are armed.' : `Ready for round ${state.round}.`}</p><button className="update-button" type="button" disabled={!hasPending} onClick={() => commit((current) => applyScoreUpdate(current))}><span>★</span> Update scores <b>BOOM</b></button><button className="reset-button" type="button" onClick={() => commit(() => createDefaultState())}>Reset party</button></div>
      </aside>
    </main>
  )
}

export default function App() {
  const [state, commit] = useLiveScoreboard()
  const tvOnly = window.location.pathname.replace(/\/$/, '').endsWith('/tv')
  return tvOnly ? <main className="tv-page"><TVBoard state={state} /></main> : <HostView state={state} commit={commit} />
}
