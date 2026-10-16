import { expect, mock, test } from 'claude-code/testing'

import { detectFamily } from './families'
import { bar, seconds } from './progress'
import { buildRequest, extractPrompt, selectHistory } from './request'

const usage = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const BAND = { plugin: 'reecrire', component: 'AbovePrompt', props: { hasSurvey: false } } as const

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
  expect(h[0].text).toBe('m10')
  expect(h.map(t => t.text)).not.toContain('sortie de cat')
})

test('requête : guide de la cible et extraction', () => {
  const r = buildRequest('corrige le bug', [], 'claude-opus-5-5', detectFamily('claude-opus-5-5'))
  expect(r.prompt[0].cache).toBe(true)
  expect(r.prompt[0].text).toContain('<style id="openai">')
  expect(r.prompt[1].text).toContain('<target_style>anthropic-opus</target_style>')
  expect(r.prompt[1].text).toContain('<draft>\ncorrige le bug\n</draft>')
  expect(extractPrompt('bla <prompt>\n  Corrige X.\n</prompt>')).toBe('Corrige X.')
  expect(extractPrompt('<prompt> </prompt>')).toBe(null)
})

test('le bouton réécrit le brouillon puis Annuler le restaure', async ($, on) => {
  const sent: Array<{ model: string; effort?: string; prompt: string }> = []
  const fills: string[] = []
  mock.clock(on)
  on('ui.render', () => ({ type: 'Text', props: {}, children: ['base'] }))
  on('prompt.read', () => ({ value: { text: 'fix le truc', cursor: 0 } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.messages', () => ({
    value: [
      { role: 'user', text: 'le bouton login plante', toolUses: [] },
      { role: 'user', text: 'SECRET_TOOL_OUTPUT', toolUses: [], toolResults: [{ tool_use_id: 'x', text: 'SECRET_TOOL_OUTPUT' }] },
    ],
  }))
  on('model.complete', ($, e) => {
    sent.push({ model: e.model, effort: e.effort, prompt: e.prompt })
    return { value: { isAnswered: true, text: '<prompt>Corrige le plantage du bouton login.</prompt>', usage } }
  })
  on('prompt.fill', ($, e) => {
    fills.push(e.text)
    return { isFilled: true }
  })
  on('ui.log', () => ({ value: undefined }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Button', key: 'reecrire' })).toBeDefined()
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  await ui.press({ key: 'reecrire' })
  expect(sent[0].model).toBe('claude-haiku-5-5')
  expect(sent[0].effort).toBe('high')
  expect(sent[0].prompt).toContain('le bouton login plante')
  expect(sent[0].prompt).not.toContain('SECRET_TOOL_OUTPUT')
  expect(fills[0]).toBe('Corrige le plantage du bouton login.')
  await ui.press({ key: 'annuler' })
  expect(fills[1]).toBe('fix le truc')
  await ui.unmount()
})

test('barre de chargement : bloc qui fait l’aller-retour, secondes', () => {
  expect(bar(0)).toBe('▰▰▰▰▱▱▱▱▱▱▱▱▱▱')
  expect(bar(10)).toBe('▱▱▱▱▱▱▱▱▱▱▰▰▰▰')
  expect(bar(20)).toBe(bar(0))
  expect(seconds(5)).toBe(1)
})

test('pendant la réécriture : barre animée dans la bande et indice dans le champ', async ($, on) => {
  const clock = mock.clock(on)
  on('ui.render', ($, e) => ({ type: 'Text', props: {}, children: [String((e.props as { hint?: string }).hint ?? 'base')] }))
  on('prompt.read', () => ({ value: { text: 'brouillon', cursor: 0 } }))
  on('session.model', () => ({ value: 'claude-opus-5-5' }))
  on('session.messages', () => ({ value: [] }))
  on('model.complete', async () => {
    await clock.sleep(3000)
    return { value: { isAnswered: true, text: '<prompt>ok</prompt>', usage } }
  })
  on('prompt.fill', () => ({ isFilled: true }))
  const band = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const pending = band.press({ key: 'reecrire' })
  await clock.advance(1000)
  expect(await band.find({ type: 'Text', text: /▰.*réécrit ton prompt · 1 s/ })).toBeDefined()
  const hint = await $.ui.mount({
    plugin: 'reecrire', surface: 'desktop', component: 'PromptHint',
    props: { isDraft: true, isWorking: false, hint: '? for shortcuts' },
  })
  expect(await hint.find({ type: 'Text', text: /réécrit ton prompt/ })).toBeDefined()
  await clock.advance(3000)
  await pending
  expect(await band.find({ type: 'Text', text: /réécrit pour claude-opus-5-5/ })).toBeDefined()
  await hint.unmount()
  await band.unmount()
})
