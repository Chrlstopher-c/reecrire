// Réécriture en flux : un `claude -p` isolé (sans réglages, hooks, MCP ni outils) dont on lit le texte au fil de l'eau.

import type { HookStream, ProcessSpawnChunk, ProcessSpawnResult } from 'claude-code'

export type StreamEvent =
  | { kind: 'thinking'; tokens: number }
  | { kind: 'text'; delta: string }

export function rewriterArgv(model: string, system: string): string[] {
  return [
    'claude', '-p', '--model', model, '--effort', 'high',
    '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--no-session-persistence',
    '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
    '--system-prompt', system,
  ]
}

type Line = {
  type?: string
  subtype?: string
  estimated_tokens?: number
  is_error?: boolean
  result?: string
  event?: { type?: string; delta?: { type?: string; text?: string } }
}

// Découpe le flux NDJSON en lignes complètes ; renvoie les événements utiles et le reste non terminé.
export function parseChunk(buffer: string, chunk: string): { events: StreamEvent[]; rest: string; error?: string } {
  const lines = (buffer + chunk).split('\n')
  const rest = lines.pop() ?? ''
  const events: StreamEvent[] = []
  let error: string | undefined
  for (const raw of lines) {
    if (raw.trim() === '') continue
    let line: Line
    try {
      line = JSON.parse(raw) as Line
    } catch {
      continue
    }
    if (line.type === 'system' && line.subtype === 'thinking_tokens' && typeof line.estimated_tokens === 'number') {
      events.push({ kind: 'thinking', tokens: line.estimated_tokens })
    } else if (line.type === 'stream_event' && line.event?.delta?.type === 'text_delta' && line.event.delta.text) {
      events.push({ kind: 'text', delta: line.event.delta.text })
    } else if (line.type === 'result' && line.is_error) {
      error = line.result || 'erreur du réécrivain'
    }
  }

  return { events, rest, error }
}

// Lit la sortie d'un `claude -p` lancé par le module (`$` ne traverse pas les imports) et en tire les événements.
export async function* readStream(
  child: HookStream<ProcessSpawnChunk, ProcessSpawnResult>,
): AsyncGenerator<StreamEvent, void> {
  let buffer = ''
  let stderr = ''
  for await (const piece of child) {
    if (piece.stream === 'stderr') {
      stderr += piece.text
      continue
    }
    const out = parseChunk(buffer, piece.text)
    buffer = out.rest
    yield* out.events
    if (out.error) throw new Error(out.error)
  }
  const end = await child.result
  if (end.code !== 0) {
    throw new Error(stderr.trim().split('\n').pop() || `claude -p a quitté (${end.code ?? end.signal})`)
  }
}
