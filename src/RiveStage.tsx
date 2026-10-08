import { useEffect } from 'react'
import { Alignment, Fit, Layout, useRive } from '@rive-app/react-webgl2'

type Props = { title: string; leaderName: string; leaderScore: number; round: number; celebrationId: number; energy: number }

export function RiveStage({ title, leaderName, leaderScore, round, celebrationId, energy }: Props) {
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
    rive.viewModelInstance.number('leaderScore')!.value = leaderScore
    rive.viewModelInstance.number('energy')!.value = Math.max(0, energy)
    rive.viewModelInstance.string('roundLabel')!.value = `ROUND ${round} · MAKE IT LEGENDARY`
  }, [rive, title, leaderName, leaderScore, round, energy])

  useEffect(() => {
    if (!rive?.viewModelInstance || celebrationId === 0) return
    const property = rive.viewModelInstance.number('celebration')
    if (!property) return
    property.value = 1
    const fade = window.setTimeout(() => { property.value = 0.18 }, 1700)
    const end = window.setTimeout(() => { property.value = 0 }, 4300)
    return () => { window.clearTimeout(fade); window.clearTimeout(end) }
  }, [rive, celebrationId])

  return <RiveComponent aria-label="Animated Rive superstar arena" />
}
