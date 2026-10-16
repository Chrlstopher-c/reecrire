// Effets visuels purs : couleurs (arc-en-ciel, dégradé de marque), partie lisible du flux, compteurs.

export const FRAME_MS = 50

export function hsl(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const a = s * Math.min(l, 1 - l)
  const f = (n: number): string => {
    const k = (n + hue / 30) % 12
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(c * 255).toString(16).padStart(2, '0')
  }

  return `#${f(0)}${f(8)}${f(4)}`
}

// Arc-en-ciel qui défile, avec un reflet clair qui balaie le texte (esprit « ultracode »).
export function shimmer(i: number, len: number, t: number): string {
  const sweep = ((t / 22) % (len + 16)) - 8
  const glint = Math.max(0, 1 - Math.abs(i - sweep) / 4)

  return hsl(i * 14 - t / 5, 0.85, 0.66 + glint * 0.24)
}

// Dégradé de marque fixe : corail Claude vers violet.
export function brand(i: number, len: number): string {
  const k = len <= 1 ? 0 : i / (len - 1)

  return hsl(15 - k * 105, 0.75, 0.7)
}

// Partie lisible d'une réponse en cours : le contenu de <prompt>, sans balise coupée en fin de flux.
export function visiblePart(raw: string): string {
  const open = raw.indexOf('<prompt>')
  let body = open >= 0 ? raw.slice(open + 8) : raw.trimStart().startsWith('<') ? '' : raw
  const close = body.indexOf('</prompt>')
  if (close >= 0) body = body.slice(0, close)
  for (let n = Math.min(8, body.length); n > 0; n -= 1) {
    if ('</prompt>'.startsWith(body.slice(-n))) {
      body = body.slice(0, -n)
      break
    }
  }

  return body.replace(/^\s*\n/, '')
}

export function prettyCount(n: number): string {
  return n < 1000 ? `${n}` : `${(n / 1000).toFixed(1).replace('.', ',')} k`
}
