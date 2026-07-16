/**
 * Coordena a transmutação da linhagem (level-up) com a ascensão de recorde
 * (superação). Quando as duas acontecem no mesmo instante, a ascensão não é
 * exibida: só a transmutação toca (até a ANYMA terminar a narração) e o
 * direcionamento ao mural é adiado para o fim do ritual.
 *
 * Estado global (fora do React) porque os dois fluxos vivem em componentes
 * diferentes: `LinhagemTransmutationHost` (transmutação) e o workspace de treino
 * (ascensão/mural), sem relação de pai/filho direta.
 */

let active = false;
const startListeners = new Set<() => void>();
const endListeners = new Set<() => void>();

/** Marca o início da transmutação e avisa quem precisa esconder a ascensão. */
export function markLinhagemTransmutationStart(): void {
  active = true;
  for (const listener of [...startListeners]) {
    listener();
  }
}

/** Marca o fim da transmutação e libera os direcionamentos adiados (mural). */
export function markLinhagemTransmutationEnd(): void {
  if (!active) return;
  active = false;
  const pending = [...endListeners];
  endListeners.clear();
  for (const listener of pending) {
    listener();
  }
}

export function isLinhagemTransmutationActive(): boolean {
  return active;
}

/**
 * Executa `fn` imediatamente quando não há transmutação ativa; caso contrário,
 * agenda para rodar assim que o ritual terminar (uma única vez).
 */
export function runAfterLinhagemTransmutation(fn: () => void): void {
  if (!active) {
    fn();
    return;
  }
  endListeners.add(fn);
}

/** Assina o início da transmutação. Retorna a função de cancelamento. */
export function onLinhagemTransmutationStart(fn: () => void): () => void {
  startListeners.add(fn);
  return () => {
    startListeners.delete(fn);
  };
}
