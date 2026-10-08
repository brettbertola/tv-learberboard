import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

function TVBoard({ state, preview = false }: { state: ScoreboardState; preview?: boolean }) {
  const ranked = useMemo(() => rankTeams(state.teams), [state.teams])
  const leader = ranked[0]
  const isCelebrating = state.celebrationId > 0
  return (
    <section className={`tv-board ${preview ? 'is-preview' : ''} ${isCelebrating ? 'is-celebrating' : ''}`} key={state.celebrationId}>
      <div className="rive-layer">
        <RiveStage title={state.title} leaderName={leader?.name ?? 'READY'} leaderScore={leader?.coins ?? 0} round={state.round} celebrationId={state.celebrationId} energy={state.lastAward} />
      </div>
      <div className="score-grid" aria-label="Team rankings">
        {ranked.map((team) => (
          <article className={`score-row rank-${team.rank} ${team.rank === 1 ? 'is-leader' : ''}`} key={team.id}>
            <span className="rank-badge">{team.rank}<small>{team.rank === 1 ? 'ST' : team.rank === 2 ? 'ND' : team.rank === 3 ? 'RD' : 'TH'}</small></span>
            <span className="score-name">{team.name}</span><span className="coin-mark" aria-hidden="true">★</span><strong>{team.coins.toLocaleString()}</strong>
          </article>
        ))}
      </div>
      {isCelebrating && <div className="impact-flash" aria-hidden="true" />}
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
