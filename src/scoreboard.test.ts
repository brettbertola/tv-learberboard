import { describe, expect, it } from 'vitest'
import { applyScoreUpdate, rankTeams, type ScoreboardState } from './scoreboard'

const state: ScoreboardState = {
  title: 'Test', round: 2, celebrationId: 0, lastAward: 0,
  teams: [
    { id: 'a', name: 'Alpha', coins: 8, pending: 5 },
    { id: 'b', name: 'Beta', coins: 10, pending: 3 },
    { id: 'c', name: 'Gamma', coins: 12, pending: -4 },
  ],
}

describe('scoreboard state', () => {
  it('applies pending coins atomically and clears the round inputs', () => {
    const next = applyScoreUpdate(state, 42)
    expect(next.teams.map(({ coins, pending }) => ({ coins, pending }))).toEqual([
      { coins: 13, pending: 0 }, { coins: 13, pending: 0 }, { coins: 8, pending: 0 },
    ])
    expect(next.round).toBe(3)
    expect(next.celebrationId).toBe(42)
    expect(next.lastAward).toBe(5)
  })

  it('uses competition ranking for ties', () => {
    expect(rankTeams(applyScoreUpdate(state).teams).map(({ name, rank }) => [name, rank])).toEqual([
      ['Alpha', 1], ['Beta', 1], ['Gamma', 3],
    ])
  })
})
