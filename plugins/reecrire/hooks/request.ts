// Construit la requête de réécriture : historique filtré, consignes, extraction de la réponse.

import { type Family, styleLibrary } from './families'

export type Turn = { role: 'user' | 'assistant'; text: string; toolResults?: readonly unknown[] }

export const HISTORY_TURNS = 50
const MAX_TURN_CHARS = 3000

export function selectHistory(messages: readonly Turn[]): Turn[] {
  return messages
    .filter(m => m.text.trim() !== '' && !(m.role === 'user' && m.toolResults?.length))
    .slice(-HISTORY_TURNS)
    .map(m => ({ role: m.role, text: clip(m.text) }))
}

function clip(text: string): string {
  return text.length > MAX_TURN_CHARS ? `${text.slice(0, MAX_TURN_CHARS)} […]` : text
}

const SYSTEM = `You rewrite a user's draft prompt so the target model understands it as well as possible.
The draft will be sent in an ongoing coding-agent session (Claude Code) where the target model already sees
the whole conversation. Use the conversation only to resolve what the draft refers to (vague pronouns,
"the bug", "like before") and to keep the user's real intent; do not paste conversation content the model
already has, and do not invent requirements the user did not express or clearly imply.

Rules:
- Keep the draft's language (French stays French). Technical identifiers stay as-is.
- Preserve every concrete instruction, constraint, name and value from the draft.
- Format the prompt in the house style named in <target_style>, taken from <style_library>.
- Scale to the request: a one-line ask stays short; a multi-part task gets structure.
- Write as the user, addressing the model directly. No meta-commentary.

Return only the rewritten prompt, inside <prompt></prompt> tags.`

export type TextBlock = { text: string; cache?: true }

// Bloc statique (consignes + bibliothèque de styles) mis en cache ; seule la fin change d'un clic à l'autre.
export function buildRequest(draft: string, history: readonly Turn[], model: string, family: Family) {
  const convo = history.map(t => `<${t.role}>${t.text}</${t.role}>`).join('\n')
  const library = `${SYSTEM}\n\n<style_library>\n${styleLibrary()}\n</style_library>`
  const task = `<conversation>\n${convo || '(empty)'}\n</conversation>

<target_model>${model} (vendor: ${family.vendor})</target_model>
<target_style>${family.id}</target_style>

<draft>
${draft}
</draft>

Rewrite the draft for the target model, following the <style id="${family.id}"> entry of the style library.`
  const prompt: TextBlock[] = [{ text: library, cache: true }, { text: task }]

  return { prompt, system: library, user: task }
}

export function extractPrompt(reply: string): string | null {
  const m = /<prompt>([\s\S]*?)<\/prompt>/.exec(reply)
  const text = (m?.[1] ?? reply).trim()

  return text === '' ? null : text
}
