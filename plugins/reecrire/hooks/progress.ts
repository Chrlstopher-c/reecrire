// Barre de chargement indéterminée (bloc qui fait l'aller-retour) et compteur, dessinées à chaque tic.

export const TICK_MS = 200
const WIDTH = 14
const BLOCK = 4

export function bar(ticks: number): string {
  const span = WIDTH - BLOCK
  const step = ticks % (span * 2)
  const start = step <= span ? step : span * 2 - step

  return Array.from({ length: WIDTH }, (_, i) => (i >= start && i < start + BLOCK ? '▰' : '▱')).join('')
}

export function seconds(ticks: number): number {
  return Math.floor((ticks * TICK_MS) / 1000)
}
