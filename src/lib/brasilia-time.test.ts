import {
  getBrasiliaDateParts,
  resolveBrasiliaTrainingWeekdayIndex,
} from "@/lib/brasilia-time";

/**
 * Espelho da regra do gate SQL `registrar_treino_com_status` (p_dia_planilha):
 *   domingo(0) → 1 · sábado(6) → 6 · restante = DOW.
 * O cliente PRECISA produzir exatamente este valor, senão o VTC nunca libera
 * (o servidor rejeita com "dia da planilha inválido"). Este teste tranca o contrato.
 */
function sqlGatePlanilhaDia(weekday: number): 1 | 2 | 3 | 4 | 5 | 6 {
  if (weekday === 0) return 1;
  if (weekday === 6) return 6;
  return weekday as 1 | 2 | 3 | 4 | 5 | 6;
}

// Meio-dia UTC ⇒ 09:00 em São Paulo (UTC-3), mesma data civil — dia da semana estável.
const DAYS: ReadonlyArray<{ iso: string; weekday: number; expected: 1 | 2 | 3 | 4 | 5 | 6 }> = [
  { iso: "2026-07-12T12:00:00Z", weekday: 0, expected: 1 }, // domingo → segunda
  { iso: "2026-07-13T12:00:00Z", weekday: 1, expected: 1 }, // segunda
  { iso: "2026-07-14T12:00:00Z", weekday: 2, expected: 2 }, // terça
  { iso: "2026-07-15T12:00:00Z", weekday: 3, expected: 3 }, // quarta
  { iso: "2026-07-16T12:00:00Z", weekday: 4, expected: 4 }, // quinta
  { iso: "2026-07-17T12:00:00Z", weekday: 5, expected: 5 }, // sexta
  { iso: "2026-07-18T12:00:00Z", weekday: 6, expected: 6 }, // sábado → sábado
];

describe("resolveBrasiliaTrainingWeekdayIndex", () => {
  it.each(DAYS)(
    "mapeia $iso (DOW $weekday) para dia de planilha $expected",
    ({ iso, weekday, expected }) => {
      const date = new Date(iso);
      expect(getBrasiliaDateParts(date).weekday).toBe(weekday);
      expect(resolveBrasiliaTrainingWeekdayIndex(date)).toBe(expected);
    },
  );

  it("permanece idêntico ao gate SQL para toda a semana (contrato do VTC)", () => {
    for (const { iso, weekday, expected } of DAYS) {
      expect(resolveBrasiliaTrainingWeekdayIndex(new Date(iso))).toBe(sqlGatePlanilhaDia(weekday));
      expect(sqlGatePlanilhaDia(weekday)).toBe(expected);
    }
  });

  it("nunca produz 0 nem 7 (faixa válida 1–6 do gate)", () => {
    for (const { iso } of DAYS) {
      const value = resolveBrasiliaTrainingWeekdayIndex(new Date(iso));
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    }
  });
});
