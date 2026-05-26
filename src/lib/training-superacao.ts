/** Superação por carga bruta: peso digitado estritamente maior que a referência. */
export function isBrutaSuperacao(parsedWeight: number, referenceWeight: number): boolean {
  return parsedWeight > referenceWeight;
}
