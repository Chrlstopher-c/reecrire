import { expect, mock, test, type TestBody } from 'claude-code/testing'

import type { SessionMessage } from 'claude-code'

import { detectFamily, prettyModel } from './families'
import { prettyCount, visiblePart } from './fx'
import { parseChunk, rewriterArgv } from './stream'
import { buildRequest, extractPrompt, selectHistory } from './request'

const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const BAND = {
  plugin: 'reecrire', component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 12, bodyColumns: 100, scroll: { offset: 0, bodyRows: 12 }, view: {} },
} as const

test('détection de la famille du modèle', () => {
  expect(detectFamily('claude-opus-5-5').id).toBe('anthropic-opus')
  expect(detectFamily('Sonnet 5.5').id).toBe('anthropic-sonnet')
  expect(detectFamily('claude-haiku-5-5').id).toBe('anthropic-haiku')
  expect(detectFamily('gpt-5.2-codex').id).toBe('openai')
  expect(detectFamily('o4-mini').id).toBe('openai')
  expect(detectFamily('gemini-3-pro').id).toBe('google')
  expect(detectFamily('devstral-medium').id).toBe('mistral')
  expect(detectFamily('deepseek-r1').id).toBe('deepseek')
  expect(detectFamily('qwen3-coder-30b').id).toBe('open-weights')
  expect(detectFamily('mystery-1').id).toBe('generic')
})

test('historique : sans résultats d’outils, 50 derniers échanges', () => {
  const rows = Array.from({ length: 60 }, (_, i) => ({ role: 'user' as const, text: `m${i}` }))
  rows.push({ role: 'user', text: 'sortie de cat', toolResults: [{}] } as never)
  rows.push({ role: 'assistant', text: '' } as never)
  const h = selectHistory(rows)
  expect(h.length).toBe(50)
  expect(h[0]?.text).toBe('m10')
  expect(h.map(t => t.text)).not.toContain('sortie de cat')
})

test('requête : guide de la cible et extraction', () => {
  const r = buildRequest('corrige le bug', [], 'claude-opus-5-5', detectFamily('claude-opus-5-5'))
  expect(r.prompt[0]?.cache).toBe(true)
  expect(r.prompt[0]?.text).toContain('<style id="openai">')
  expect(r.prompt[1]?.text).toContain('<target_style>anthropic-opus</target_style>')
  expect(r.prompt[1]?.text).toContain('<draft>\ncorrige le bug\n</draft>')
  expect(r.system).toBe(r.prompt[0]?.text)
  expect(r.user).toBe(r.prompt[1]?.text)
  expect(extractPrompt('bla <prompt>\n  Corrige X.\n</prompt>')).toBe('Corrige X.')
  expect(extractPrompt('<prompt> </prompt>')).toBe(null)
})

const line = (o: unknown): string => `${JSON.stringify(o)}\n`
const delta = (text: string): string => line({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text } } })

test('flux : lignes coupées, réflexion, texte, erreur', () => {
  const all = line({ type: 'system', subtype: 'thinking_tokens', estimated_tokens: 50 }) + delta('Bon') + delta('jour')
  const a = parseChunk('', all.slice(0, 70))
  const b = parseChunk(a.rest, all.slice(70))
  expect([...a.events, ...b.events]).toEqual([
    { kind: 'thinking', tokens: 50 }, { kind: 'text', delta: 'Bon' }, { kind: 'text', delta: 'jour' }])
  expect(b.rest).toBe('')
  expect(parseChunk('', line({ type: 'result', is_error: true, result: 'Not logged in' })).error).toBe('Not logged in')
  const argv = rewriterArgv('claude-haiku-5-5', 'SYS')
  expect(argv.slice(0, 4)).toEqual(['claude', '-p', '--model', 'claude-haiku-5-5'])
  expect(argv[argv.indexOf('--setting-sources') + 1]).toBe('')
  expect(argv).toContain('--no-session-persistence')
  expect(argv[argv.indexOf('--tools') + 1]).toBe('')
})

test('effets : partie visible, noms, compteurs', () => {
  expect(visiblePart('Voici <prompt>\nCorrige X.</pro')).toBe('Corrige X.')
  expect(visiblePart('<prompt>A</prompt> fin')).toBe('A')
  expect(visiblePart('<prom')).toBe('')
  expect(visiblePart('Sans balise')).toBe('Sans balise')
  expect(prettyModel('claude-opus-5-5')).toBe('Opus 5.5')
  expect(prettyModel('claude-sonnet-5-5[1m]')).toBe('Sonnet 5.5')
  expect(prettyModel('gpt-5.2-codex')).toBe('gpt-5.2-codex')
  expect(prettyCount(1204)).toBe('1,2 k')
})

function session(on: Parameters<TestBody>[1]): { fills: string[]; renders: { n: number } } {
  const fills: string[] = []
  const renders = { n: 0 }
  on('ui.render', () => {
    renders.n += 1
    return { type: 'Text', props: {}, children: ['base'] }
  })
  on('prompt.read', () => ({ value: { text: 'fix le truc', cursor: 0 } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  const messages: SessionMessage[] = [
    { role: 'user', text: 'le bouton login plante', toolUses: [] },
    { role: 'user', text: 'SECRET_TOOL_OUTPUT', toolUses: [], toolResults: [{ tool_use_id: 'x', text: 'SECRET_TOOL_OUTPUT', isError: false }] },
  ]
  on('session.messages', () => ({ value: messages }))
  on('prompt.fill', ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  on('ui.log', () => ({ value: undefined }))

  return { fills, renders }
}

type Clock = ReturnType<typeof mock.clock>

// Avance l'horloge simulée par petits pas : le champ se remplit au fil des tics.
async function pump(clock: Clock, ms: number): Promise<void> {
  for (let t = 0; t < ms; t += 50) await clock.advance(50)
}

test('le bouton écrit la réponse en direct dans le champ, Annuler restaure le brouillon', async ($, on) => {
  const { fills } = session(on)
  const clock = mock.clock(on)
  const spawned: Array<{ argv: readonly string[]; input?: string }> = []
  on('process.spawn', async function* ($, e) {
    spawned.push({ argv: e.argv, input: e.input })
    yield { stream: 'stdout' as const, text: delta('<prompt>Corrige le plantage ') }
    yield { stream: 'stdout' as const, text: delta('du bouton login.</prompt>') }
    return { value: { code: 0, signal: null } }
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Button', key: 'reecrire' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  const pending = ui.press({ key: 'reecrire' })
  await pump(clock, 3000)
  await pending
  expect(spawned[0]?.argv).toContain('claude-haiku-5-5')
  expect(spawned[0]?.input).toContain('le bouton login plante')
  expect(spawned[0]?.input).not.toContain('SECRET_TOOL_OUTPUT')
  const final = 'Corrige le plantage du bouton login.'
  expect(fills.length).toBeGreaterThan(3)
  expect(fills.every(f => final.startsWith(f))).toBe(true)
  expect(fills[0]?.length).toBeLessThan(final.length)
  expect(fills[fills.length - 1]).toBe(final)
  expect(await ui.find({ type: 'Client', key: 'live1' })).toBeDefined()
  await ui.press({ key: 'annuler' })
  expect(fills[fills.length - 1]).toBe('fix le truc')
  await ui.unmount()
})

test('sans claude -p : repli sur un appel simple', async ($, on) => {
  const { fills } = session(on)
  const clock = mock.clock(on)
  const sent: Array<{ model: string; effort?: string }> = []
  on('process.spawn', async function* () {
    throw new Error('ENOENT claude')
  })
  on('model.complete', ($, e) => {
    sent.push({ model: e.model, effort: e.effort })
    return { value: { isAnswered: true, text: '<prompt>Version repli.</prompt>', usage } }
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const pending = ui.press({ key: 'reecrire' })
  await pump(clock, 2000)
  await pending
  expect(sent[0]).toEqual({ model: 'claude-haiku-5-5', effort: 'high' })
  expect(fills[fills.length - 1]).toBe('Version repli.')
  await ui.unmount()
})

function gate(): { open: () => void; wait: Promise<void> } {
  let open = (): void => undefined
  const wait = new Promise<void>(r => { open = r })

  return { open, wait }
}

test('le panneau anime la réflexion puis écrit le prompt en direct', async ($, on) => {
  const { fills, renders } = session(on)
  const clock = mock.clock(on)
  const gates = [gate(), gate()]
  let calls = 0
  on('process.spawn', async function* () {
    const g = gates[calls++]
    yield { stream: 'stdout' as const, text: line({ type: 'system', subtype: 'thinking_tokens', estimated_tokens: 120 }) }
    await g?.wait
    yield { stream: 'stdout' as const, text: delta('<prompt>Corrige le plantage du bouton login') }
    yield { stream: 'stdout' as const, text: delta('.</prompt>') }
    return { value: { code: 0, signal: null } }
  })
  for (const [n, surface] of (['terminal', 'desktop'] as const).entries()) {
    const g = gates[n]
    const from = fills.length
    const live = `live${n + 1}`
    const ui = await $.ui.mount({ ...BAND, surface })
    const pending = ui.press({ key: 'reecrire' })
    await ui.advance(300)
    expect(await ui.find({ in: live, text: /Haiku 5\.5 réfléchit · 120 jetons de réflexion/ })).toBeDefined()
    expect(await ui.find({ type: 'Button', key: 'arreter' })).toBeDefined()
    expect(fills.slice(from).filter(f => f.startsWith('Corrige'))).toEqual([])
    g?.open()
    await pump(clock, 50)
    const drawn = renders.n
    await pump(clock, 100)
    expect(renders.n).toBe(drawn)
    expect(fills.slice(from).some(f => f.startsWith('Corrige') && f.length < 36)).toBe(true)
    await ui.advance(400)
    expect(await ui.find({ in: live, text: /Haiku 5\.5 écrit pour Opus 5\.5 · \d+ car\./ })).toBeDefined()
    expect(await ui.find({ in: live, text: /⣿|⣷|⣶|⣦|⣤|⣄|⣀/ })).toBeDefined()
    expect(await ui.find({ in: live, text: /Corrige/ })).toBeUndefined()
    await pump(clock, 3000)
    await pending
    await ui.advance(200)
    expect(await ui.find({ in: live, text: /Réécrit pour Opus 5\.5 · 36 car\./ })).toBeDefined()
    expect(await ui.find({ in: live, text: /⣀|⣿/ })).toBeUndefined()
    expect(fills[fills.length - 1]).toBe('Corrige le plantage du bouton login.')
    await ui.press({ key: 'annuler' })
    expect(fills[fills.length - 1]).toBe('fix le truc')
    await ui.unmount()
  }
})
