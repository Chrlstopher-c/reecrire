// Familles de modèles cibles et guide de prompting propre à chaque éditeur.

export type FamilyId =
  | 'anthropic-opus' | 'anthropic-sonnet' | 'anthropic-haiku' | 'anthropic'
  | 'openai' | 'google' | 'mistral' | 'deepseek' | 'open-weights' | 'generic'

export type Family = { id: FamilyId; vendor: string; guide: string }

const ANTHROPIC_BASE = `Anthropic house style, Claude 5 generation (official guidance + how Anthropic writes its own
system prompts):
- Descriptive snake_case XML tags named by domain or phase (<context>, <task>, <constraints>, <output_format>,
  <examples>), at most three levels deep. A one-line ask stays plain prose without tags.
- Clear, direct, explicit: the goal, the deliverable and how to tell it is done.
- Each constraint carries its reason in the same sentence ("because", "so that"). Each prohibition is followed by
  the positive alternative. Say what to do rather than what not to do.
- Calm normal case. No capitals, CRITICAL, MUST or "if in doubt": these models over-trigger on them.
- Format as a default plus its exception; length as a soft bound ("a few sentences"); if the result matters,
  describe the shape of the final report (what came out, one line of context, a real next step, no recap of steps).
- Judgment zones labelled as judgment; thresholds named by criterion ("expensive to redo", "can't be undone");
  ambiguity handled by a short procedure (state the reading taken, ask one question only if truly blocking).
- Do not ask for written-out reasoning in the answer; ask for a short explanation or summary of actions instead.
- Agentic work: action verbs ("change", "fix", "run"), what is in or out of scope, how to verify per deliverable
  (tests, typecheck, opening the file), what needs confirmation before acting (irreversible actions only).
- Default first and positive, then the bounds; an explicit priority when two instructions could conflict.
- Match the prompt's formatting to the desired output's formatting.`

const GUIDES: Record<FamilyId, string> = {
  'anthropic-opus': `${ANTHROPIC_BASE}
Opus 5.5 (long-running agentic work): give the objective, the quality bar and the scope, then room to decide;
fewer micro-steps, more intent. No "think hard" lines and no generic verification boilerplate (it verifies on its
own; extra checks cause over-verification), keep only checks specific to the deliverable. One scope sentence:
deliver what was asked at the intended scope, neither widened nor silently narrowed. If the task should run
unattended, say not to stop to report and name the real reasons to stop.`,
  'anthropic-sonnet': `${ANTHROPIC_BASE}
Sonnet 5.5: spell out the deliverable and the stop condition. If the user wants ideas, options or a plan, say to
give that and stop. Name what must not be added unasked (extra tests, docs, files). Ask to keep working until
everything requested is done, and to run a real check (tests, typecheck, build) before calling it done.`,
  'anthropic-haiku': `${ANTHROPIC_BASE}
Haiku 5.5: maximal explicitness. Numbered steps when order matters, exact output format, one concrete example when
the format is non-obvious, every relevant file or name spelled out. Ask to keep working until everything requested
is done. Keep the prompt tight: no ambiguity, no implied steps.`,
  anthropic: ANTHROPIC_BASE,
  openai: `OpenAI house style (GPT-5.x / o-series reasoning models):
- Markdown sections with headers, in this order when useful: # Role and Objective, # Instructions
  (bullets, sub-sections per topic), # Context, # Output Format, # Examples. Delimit inputs with backticks or
  XML-like tags.
- Precise and non-contradictory: these models follow instructions literally and burn effort reconciling conflicts.
- Reasoning models: do not ask to "think step by step"; state the goal and the success criteria.
- Agentic use: state the eagerness level (how far to go before checking back), the stop condition, and whether
  to give a short plan/preamble before tool calls.
- Specify verbosity and output format explicitly.`,
  google: `Google Gemini house style:
- Concise and direct. Clear sections (markdown headers or XML-like tags, one style, consistent).
- Put long context/data first and the instruction or question last ("Based on the above, ...").
- Define the role, the constraints and the output format explicitly; give few-shot examples for format.
- Ask for planning or self-critique when the task is complex; avoid vague persuasive filler.`,
  mistral: `Mistral house style:
- Short, well-organized prompt with markdown headers or numbered sections; no deep XML nesting.
- Role and rules first, then the task, then the expected output format (be explicit: JSON schema, list, etc.).
- Plain, unambiguous wording; avoid contradictory or redundant instructions. Few-shot examples for format.`,
  deepseek: `DeepSeek house style (R1/V3 reasoning):
- Everything in the user message, no reliance on a system prompt. Zero-shot: no few-shot examples
  (they degrade reasoning models).
- State the problem, the constraints and the exact output format clearly; ask for the final answer in a
  delimited block. No "think step by step" (reasoning is native).`,
  'open-weights': `Local / open-weights house style (Qwen, Llama, Gemma, Phi, GLM...):
- Short and explicit; small models lose track in long prompts.
- Numbered steps, one instruction per line, explicit output format with a minimal example.
- Simple markdown headers; avoid subtle nuance, irony or implicit expectations. Repeat the key constraint
  once at the end.`,
  generic: `Generic best practice (vendor unknown):
- Role, goal, context, constraints, output format, in clear markdown sections.
- Explicit, unambiguous, non-contradictory; examples when format matters.`,
}

const RULES: ReadonlyArray<[RegExp, FamilyId, string]> = [
  [/opus/, 'anthropic-opus', 'Anthropic'],
  [/sonnet/, 'anthropic-sonnet', 'Anthropic'],
  [/haiku/, 'anthropic-haiku', 'Anthropic'],
  [/claude|fable|mythos|^default|^best/, 'anthropic', 'Anthropic'],
  [/gpt|^o\d|openai|codex|chatgpt/, 'openai', 'OpenAI'],
  [/gemini/, 'google', 'Google'],
  [/mistral|mixtral|codestral|devstral|magistral|ministral|pixtral/, 'mistral', 'Mistral'],
  [/deepseek/, 'deepseek', 'DeepSeek'],
  [/qwen|llama|gemma|phi|glm|kimi|hermes|granite|olmo|nemotron|gguf/, 'open-weights', 'open-weights'],
]

export function styleLibrary(): string {
  return (Object.keys(GUIDES) as FamilyId[]).map(id => `<style id="${id}">\n${GUIDES[id]}\n</style>`).join('\n\n')
}

export function detectFamily(model: string): Family {
  const m = model.toLowerCase()
  const hit = RULES.find(([re]) => re.test(m))
  const id = hit ? hit[1] : 'generic'

  return { id, vendor: hit ? hit[2] : 'unknown', guide: GUIDES[id] }
}

// « claude-opus-5-5 » → « Opus 5.5 » ; un id inconnu est rendu tel quel.
export function prettyModel(model: string): string {
  const m = /(opus|sonnet|haiku|fable)[-\s]?(\d+)(?:[-.](\d+))?/i.exec(model)
  const word = m?.[1]
  if (!m || !word) return model.replace(/\[.*\]$/, '')
  const name = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()

  return m[3] ? `${name} ${m[2]}.${m[3]}` : `${name} ${m[2]}`
}
