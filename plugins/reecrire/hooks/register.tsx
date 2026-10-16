import type { EngineInterface, Register } from 'claude-code'

import { detectFamily } from './families'
import { bar, seconds, TICK_MS } from './progress'
import { buildRequest, extractPrompt, selectHistory } from './request'

const REWRITER = 'claude-haiku-5-5'

type Phase = 'idle' | 'busy' | 'done' | 'error'

let phase: Phase = 'idle'
let note = ''
let original: string | null = null
let ticks = 0
let ticker: unknown = null

// Les types déclarent une fonction d'arrêt ; le moteur renvoie un objet { cancel() } (doc des mods) : on gère les deux.
function stopTicker(): void {
  if (typeof ticker === 'function') ticker()
  else if (ticker && typeof (ticker as { cancel?: unknown }).cancel === 'function') (ticker as { cancel: () => void }).cancel()
  ticker = null
}

function setPhase($: EngineInterface, next: Phase, text = ''): void {
  phase = next
  note = text
  stopTicker()
  if (next === 'busy') {
    ticks = 0
    ticker = $.clock.every(TICK_MS, () => {
      ticks += 1
      $.ui.invalidate('ui.render')
    })
  }
  $.ui.invalidate('ui.render')
}

const busyText = (): string => `Haiku 5.5 réécrit ton prompt · ${seconds(ticks)} s`

async function rewriteDraft($: EngineInterface, draft: string): Promise<{ text: string; target: string }> {
  const [messages, model] = await Promise.all([$.session.messages(), $.session.model()])
  const family = detectFamily(model)
  const { prompt } = buildRequest(draft, selectHistory(messages), model, family)
  const r = await $.model.complete({
    model: REWRITER, prompt, effort: 'high', maxTokens: 8000, timeoutMs: 180_000,
  })
  if (!r.isAnswered) {
    throw new Error(`Haiku sans réponse (${r.reason})`)
  }
  const text = extractPrompt(r.text)
  if (!text) {
    throw new Error('réponse vide')
  }

  return { text, target: model }
}

async function rewrite($: EngineInterface, draft?: string): Promise<void> {
  if (phase === 'busy') {
    return
  }
  const source = draft ?? (await $.prompt.read()).text
  if (source.trim() === '') {
    $.ui.toast('Rien à réécrire : le champ est vide.')
    return
  }
  setPhase($, 'busy')
  try {
    const out = await rewriteDraft($, source)
    const filled = await $.prompt.fill({ text: out.text })
    if (!filled.isFilled) {
      throw new Error(`champ indisponible (${filled.refusal ?? 'refusé'})`)
    }
    original = source
    setPhase($, 'done', out.target)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    $.ui.log(`échec de la réécriture : ${msg}`)
    setPhase($, 'error', msg)
  }
}

async function undo($: EngineInterface): Promise<void> {
  if (original === null) {
    return
  }
  await $.prompt.fill({ text: original })
  original = null
  setPhase($, 'idle')
}

function label(): string {
  if (phase === 'busy') return `${bar(ticks)} ${busyText()}`
  if (phase === 'done') return `réécrit pour ${note}`
  if (phase === 'error') return `échec : ${note}`

  return ''
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

  on('prompt.submit', async ($, e, next) => {
    if (phase !== 'busy') {
      original = null
      if (phase !== 'idle') setPhase($, 'idle')
    }

    return next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    if (phase !== 'busy') {
      return next(e)
    }

    return next({ ...e, props: { ...e.props, hint: `${busyText()}…` } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) {
      return below
    }
    const { Box, Text, Button } = $.ui.resolve(e)
    const busy = phase === 'busy'

    return (
      <Box flexDirection="column">
        <Box flexDirection="row" columnGap={2}>
          <Button key="reecrire" label={busy ? 'Réécriture…' : 'Réécrire'} hotkey="r" plain
            onPress={() => rewrite($)} />
          {original !== null && !busy
            ? <Button key="annuler" label="Annuler" hotkey="u" plain onPress={() => undo($)} />
            : null}
          {label() ? <Text dimColor>{label()}</Text> : null}
        </Box>
        {below}
      </Box>
    )
  })
}
