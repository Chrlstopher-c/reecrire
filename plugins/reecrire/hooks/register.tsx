import type { EngineInterface, Register } from 'claude-code'

import { detectFamily, prettyModel } from './families'
import { brand, visiblePart } from './fx'
import type { LiveProps } from './live'
import { buildRequest, extractPrompt, selectHistory, type TextBlock } from './request'
import { readStream, rewriterArgv } from './stream'

const REWRITER = 'claude-haiku-5-5'
const TYPE_MS = 50

type Phase = 'idle' | LiveProps['phase']

let phase: Phase = 'idle'
let live: LiveProps = { phase: 'busy', text: '', thinking: 0, target: '', note: '' }
let original: string | null = null
let run = 0
let stopStream: (() => void) | null = null
let goal = ''
let typed = 0
let filling = false
let typist: { cancel: () => void } | null = null

const busy = (): boolean => phase === 'busy'

// Gestionnaire fixe : une nouvelle fonction à chaque dessin fait recréer le bouton natif de Desktop (survol qui
// clignote, clic perdu) quand d'autres mods redessinent la bande. Les clics sont traités par le hook `ui.press`.
const PRESSED = (): void => undefined

// Mises à jour fréquentes (jetons, texte tapé) : le panneau vient les chercher (`ui.message`) sans redessiner la
// bande, car Desktop y recrée les boutons à chaque dessin.
function patchLive(patch: Partial<LiveProps>): void {
  live = { ...live, ...patch }
}

function show($: EngineInterface, next: Phase, patch: Partial<LiveProps> = {}): void {
  phase = next
  live = { ...live, ...patch, phase: next === 'idle' ? live.phase : next }
  $.ui.invalidate('ui.render')
}

// Le champ se remplit à son rythme, en rattrapant progressivement ce que Haiku a déjà écrit.
async function typeStep($: EngineInterface): Promise<void> {
  if (filling || typed >= goal.length || !busy()) return
  const backlog = goal.length - typed
  typed += Math.min(backlog, Math.max(2, Math.min(40, Math.ceil(backlog * 0.15))))
  filling = true
  try {
    await $.prompt.fill({ text: goal.slice(0, typed) })
  } finally {
    filling = false
  }
  patchLive({ text: goal.slice(0, typed) })
}

function stopTypist(): void {
  typist?.cancel()
  typist = null
}

async function typeOut($: EngineInterface, text: string): Promise<void> {
  goal = text
  typed = Math.min(typed, text.length)
  while (busy() && (typed < goal.length || filling)) await $.clock.sleep(TYPE_MS)
  stopTypist()
}

// Flux d'abord ; si `claude -p` ne démarre pas (Desktop sans le binaire dans le PATH), appel simple sans flux.
async function generate($: EngineInterface, system: string, user: string, prompt: TextBlock[]): Promise<string> {
  let raw = ''
  try {
    const child = $.process.spawn({ argv: rewriterArgv(REWRITER, system), input: user, cwd: $.plugin.root })
    stopStream = () => void child.return({ code: null, signal: 'SIGTERM' })
    for await (const ev of readStream(child)) {
      if (!busy()) break
      if (ev.kind === 'thinking') patchLive({ thinking: ev.tokens })
      else goal = visiblePart((raw += ev.delta))
    }

    return raw
  } catch (err) {
    if (raw !== '' || !busy()) throw err
    $.ui.log(`flux indisponible, appel sans flux : ${err instanceof Error ? err.message : String(err)}`)
  } finally {
    stopStream = null
  }
  const r = await $.model.complete({ model: REWRITER, prompt, effort: 'high', maxTokens: 8000, timeoutMs: 180_000 })
  if (!r.isAnswered) throw new Error(`Haiku sans réponse (${r.reason})`)

  return r.text
}

async function rewrite($: EngineInterface, draft?: string): Promise<void> {
  if (phase === 'busy') return
  const source = draft ?? (await $.prompt.read()).text
  if (source.trim() === '') {
    $.ui.toast('Rien à réécrire : le champ est vide.')
    return
  }
  run += 1
  original = source
  goal = ''
  typed = 0
  show($, 'busy', { text: '', thinking: 0, note: '' })
  typist = $.clock.every(TYPE_MS, () => void typeStep($))
  try {
    const [messages, model] = await Promise.all([$.session.messages(), $.session.model()])
    show($, 'busy', { target: prettyModel(model) })
    const req = buildRequest(source, selectHistory(messages), model, detectFamily(model))
    const raw = await generate($, req.system, req.user, req.prompt)
    if (!busy()) return
    const text = extractPrompt(raw)
    if (!text) throw new Error('réponse vide')
    await typeOut($, text)
    if (!busy()) return
    const filled = await $.prompt.fill({ text })
    if (!filled.isFilled) throw new Error(`champ indisponible (${filled.refusal ?? 'refusé'})`)
    show($, 'done', { text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    $.ui.log(`échec de la réécriture : ${msg}`)
    if (busy()) {
      show($, 'error', { note: msg })
      await restore($)
    }
  } finally {
    stopTypist()
  }
}

// Remet le brouillon d'origine dans le champ (Arrêter, échec, Annuler).
async function restore($: EngineInterface): Promise<void> {
  if (original === null) return
  const text = original
  original = null
  await $.prompt.fill({ text })
}

async function stop($: EngineInterface): Promise<void> {
  stopStream?.()
  stopTypist()
  show($, 'idle')
  await restore($)
}

async function undo($: EngineInterface): Promise<void> {
  await restore($)
  show($, 'idle')
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'reecrire', description: 'Réécrit le texte donné pour le modèle actif', argumentHint: '<brouillon>',
      })
    } catch (err) {
      $.ui.log(`commande /reecrire non enregistrée : ${String(err)}`)
    }

    return next(e)
  })

  on('command.run', { command: 'reecrire' }, async ($, e) => {
    void rewrite($, e.args)

    return {}
  })

  on('ui.message', async ($, e, next) => (e.module.endsWith('live.tsx') ? { props: live } : next(e)))

  on('ui.press', async ($, e, next) => {
    if (e.plugin === 'reecrire') {
      if (e.element === 'reecrire') void rewrite($)
      else if (e.element === 'arreter') void stop($)
      else if (e.element === 'annuler') void undo($)
    }

    return next(e)
  })

  on('prompt.submit', async ($, e, next) => {
    if (phase !== 'busy') {
      original = null
      if (phase !== 'idle') show($, 'idle')
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const els = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const label = Array.from('✦ Reprompting')
    const main = (
      <Button key="reecrire" plain onPress={PRESSED}>
        {label.map((ch, i) => <Text key={`${i}`} color={brand(i, label.length)} bold>{ch}</Text>)}
      </Button>
    )
    const side = phase === 'busy' ? <Button key="arreter" plain dimColor onPress={PRESSED}>Arrêter</Button>
      : phase === 'done' && original !== null
        ? (
          <Box flexDirection="row" columnGap={3}>
            <Button key="annuler" plain dimColor onPress={PRESSED}>Annuler</Button>{main}
          </Box>
        )
        : phase !== 'idle' ? main : null
    const panel = phase === 'idle' ? main
      : 'Client' in els ? <els.Client key={`live${run}`} module="./live.tsx" props={live} flexGrow={1} />
        : <Text dimColor>{
          phase === 'busy' ? 'Haiku 5.5 réécrit…' : phase === 'done' ? '✓ Réécrit' : `Échec : ${live.note}`}
        </Text>

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={3}>
          {panel}
          {side ? <Box flexShrink={0}>{side}</Box> : null}
        </Box>
        {below}
      </Box>
    )
  })
}
