// Panneau animé de la réécriture : titre irisé et onde tant que Haiku travaille ; le texte, lui, va dans le champ.

import type { ClientModule, ClientSurface, RenderElement } from 'claude-code'

import { brand, FRAME_MS, hsl, prettyCount, shimmer } from './fx'

export type LiveProps = {
  phase: 'busy' | 'done' | 'error'
  text: string
  thinking: number
  target: string
  note: string
}

type Ref = { props: LiveProps; stop?: () => void }
type S = { t: number; doneAt: number | null; ref: Ref }
type Piece = { text: string; color?: string; bold?: boolean; dim?: boolean }
type El = ClientSurface<S>['elements']

const SPIN = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢']
const WAVE = '⣀⣄⣤⣦⣶⣷⣿'
const POLL_MS = 200

function tick(s: ClientSurface<S>): void {
  const st = s.state
  if (!st) return
  const t = st.t + FRAME_MS
  const doneAt = st.doneAt ?? (st.ref.props.phase !== 'busy' ? t : null)
  if (doneAt !== null) st.ref.stop?.()
  else if (t % POLL_MS === 0) s.post({ poll: true })
  s.setState({ ...st, t, doneAt })
}

// Regroupe les lettres voisines de même style pour limiter le nombre d'éléments.
function push(out: Piece[], next: Piece): void {
  const last = out[out.length - 1]
  if (last && last.color === next.color && last.bold === next.bold && last.dim === next.dim) last.text += next.text
  else out.push({ ...next })
}

function paint(T: El['Text'], pieces: Piece[], key: string): RenderElement {
  return (
    <T key={key} wrap="truncate-end">
      {pieces.map((x, i) => <T key={`${i}`} color={x.color} bold={x.bold} dimColor={x.dim}>{x.text}</T>)}
    </T>
  )
}

function colored(text: string, color: (i: number, len: number) => string, bold = false): Piece[] {
  const out: Piece[] = []
  Array.from(text).forEach((ch, i, all) => push(out, { text: ch, color: color(i, all.length), bold }))

  return out
}

function header(p: LiveProps, st: S): Piece[] {
  const elapsed = Math.floor((st.doneAt ?? st.t) / 1000)
  if (p.phase === 'error') {
    return [{ text: '✕ ', color: 'error', bold: true }, { text: 'Échec de la réécriture', color: 'error' },
      { text: ` · ${p.note}`, dim: true }]
  }
  if (p.phase === 'done') {
    return [{ text: '✓ ', color: 'success', bold: true }, ...colored(`Réécrit pour ${p.target}`, brand, true),
      { text: ` · ${prettyCount(p.text.length)} car. · ${elapsed} s`, dim: true }]
  }
  const writing = p.text.length > 0
  const title = writing ? `Haiku 5.5 écrit pour ${p.target}` : 'Haiku 5.5 réfléchit'
  const thought = p.thinking > 0 ? `${p.thinking} jetons de réflexion` : 'démarrage'
  const meta = writing ? `${prettyCount(p.text.length)} car.` : thought
  const spin = SPIN[Math.floor(st.t / 100) % SPIN.length] ?? '·'

  return [{ text: `${spin} `, color: shimmer(0, 1, st.t), bold: true },
    ...colored(title, (i, n) => shimmer(i, n, st.t), true), { text: ` · ${meta} · ${elapsed} s`, dim: true }]
}

// Onde de points braille qui ondule en arc-en-ciel tant que Haiku travaille.
function wave(t: number, width: number): Piece[] {
  const out: Piece[] = []
  const n = Math.min(48, Math.max(12, width - 4))
  for (let x = 0; x < n; x += 1) {
    const y = (Math.sin(x * 0.42 - t / 140) + Math.sin(x * 0.17 + t / 330)) / 2
    const level = Math.max(0, Math.min(WAVE.length - 1, Math.round(((y + 1) / 2) * (WAVE.length - 1))))
    push(out, { text: WAVE.charAt(level), color: hsl(x * 7 - t / 6, 0.8, 0.45 + level * 0.05) })
  }

  return [{ text: '  ' }, ...out]
}

function init(p: LiveProps, s: ClientSurface<S>): void {
  const ref: Ref = { props: p }
  s.setState({ t: 0, doneAt: null, ref })
  ref.stop = s.every(FRAME_MS, () => tick(s))
}

const Live: ClientModule<LiveProps, S> = (p, s) => {
  const { Box, Text } = s.elements
  if (s.state === undefined) {
    init(p, s)
    return <Box>{paint(Text, [{ text: '· Haiku 5.5 démarre', dim: true }], 'h')}</Box>
  }
  const st = s.state
  st.ref.props = p

  return (
    <Box flexDirection="column">
      {paint(Text, header(p, st), 'h')}
      {p.phase === 'busy' ? paint(Text, wave(st.t, s.columns || 80), 'w') : null}
    </Box>
  )
}

export default Live
