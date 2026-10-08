import { useEffect, useRef } from 'react'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-webgl2'

type Props = { title: string; leaderName: string; leaderScore: number; round: number; celebrationId: number; energy: number }

export function RiveStage({ title, leaderName, leaderScore, round, celebrationId, energy }: Props) {
  const displayedLeaderScore = useRef(leaderScore)
  const observedCelebration = useRef(celebrationId)
  const { rive, RiveComponent } = useRive({
    src: '/rive/party-scoreboard.riv',
    stateMachine: 'Scoreboard State Machine',
    autoplay: true,
    autoBind: true,
    layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
  })

  useEffect(() => {
    if (!rive?.viewModelInstance) return
    rive.viewModelInstance.string('title')!.value = title.toUpperCase()
    rive.viewModelInstance.string('leaderName')!.value = leaderName.toUpperCase()
    rive.viewModelInstance.number('energy')!.value = Math.max(0, energy)
    rive.viewModelInstance.string('roundLabel')!.value = `ROUND ${round} · MAKE IT LEGENDARY`
  }, [rive, title, leaderName, round, energy])

  useEffect(() => {
    if (!rive?.viewModelInstance) return
    const property = rive.viewModelInstance.number('leaderScore')
    if (!property) return
    if (celebrationId === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      displayedLeaderScore.current = leaderScore
      property.value = leaderScore
      return
    }
    const from = displayedLeaderScore.current
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 3000)
      const eased = progress * progress * (3 - 2 * progress)
      const value = Math.round(from + (leaderScore - from) * eased)
      displayedLeaderScore.current = value
      property.value = value
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [rive, leaderScore, celebrationId])

  useEffect(() => {
    if (!rive?.viewModelInstance || celebrationId === observedCelebration.current) return
    observedCelebration.current = celebrationId
    const property = rive.viewModelInstance.number('celebration')
    if (!property) return
    const startedAt = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 3000)
      property.value = Math.pow(Math.sin(Math.PI * progress), 0.58)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else property.value = 0
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); property.value = 0 }
  }, [rive, celebrationId])

  return <RiveComponent aria-label="Animated Rive superstar arena" />
}
