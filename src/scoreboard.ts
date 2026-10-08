export type Team = { id: string; name: string; coins: number; pending: number }
export type ScoreboardState = { title: string; round: number; teams: Team[]; celebrationId: number; lastAward: number }

export const STORAGE_KEY = 'superstar-coin-clash:v1'
export const CHANNEL_NAME = 'superstar-coin-clash-live'

export const createDefaultState = (): ScoreboardState => ({
  title: "Jet and McCall's Super Frozen Mario Party",
  round: 1,
  teams: Array.from({ length: 10 }, (_, index) => ({
    id: crypto.randomUUID(), name: `Team ${String(index + 1).padStart(2, '0')}`, coins: 0, pending: 0,
  })),
  celebrationId: 0,
  lastAward: 0,
})

export const loadState = (): ScoreboardState => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return createDefaultState()
    const parsed = JSON.parse(saved) as ScoreboardState
    return Array.isArray(parsed.teams) && parsed.teams.length > 0 ? parsed : createDefaultState()
  } catch { return createDefaultState() }
}

export const rankTeams = (teams: Team[]) => {
  const sorted = [...teams].sort((a, b) => b.coins - a.coins || a.name.localeCompare(b.name))
  return sorted.map((team, index) => ({
    ...team,
    rank: index > 0 && sorted[index - 1].coins === team.coins
      ? sorted.findIndex((candidate) => candidate.coins === team.coins) + 1 : index + 1,
  }))
}

export const applyScoreUpdate = (state: ScoreboardState, now = Date.now()): ScoreboardState => ({
  ...state,
  round: state.round + 1,
  celebrationId: now,
  lastAward: Math.max(0, ...state.teams.map((team) => Math.abs(team.pending))),
  teams: state.teams.map((team) => ({ ...team, coins: team.coins + team.pending, pending: 0 })),
})

export const nextTeamName = (teams: Team[]) => {
  let number = teams.length + 1
  while (teams.some((team) => team.name === `Team ${String(number).padStart(2, '0')}`)) number += 1
  return `Team ${String(number).padStart(2, '0')}`
}
