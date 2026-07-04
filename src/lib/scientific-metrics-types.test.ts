import {
  emptyScientificSkinfoldDraft,
  emptyScientificSkinfolds,
  mergeScientificEntries,
  parseScientificDraftInput,
  sumScientificSkinfolds,
  type ScientificMetricsDraftInput,
  type ScientificMetricsEntry,
} from "@/lib/scientific-metrics-types";

function makeDraft(overrides: Partial<ScientificMetricsDraftInput> = {}): ScientificMetricsDraftInput {
  return {
    measuredAt: "27/06/2026",
    weightKg: "82,345",
    bodyFatPct: "14,7",
    leanMassKg: "",
    heightCm: "180",
    skinfolds: {
      ...emptyScientificSkinfoldDraft(),
      peito: "12,345",
      abdomen: "18",
    },
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ScientificMetricsEntry>): ScientificMetricsEntry {
  return {
    id: "entry-local",
    clientId: "cliente-1",
    forgerId: "forjador-1",
    measuredAt: "2026-06-27T15:00:00.000Z",
    weightKg: 82,
    bodyFatPct: null,
    leanMassKg: null,
    skinfolds: emptyScientificSkinfolds(),
    heightCm: null,
    savedAt: "2026-06-27T16:00:00.000Z",
    syncedAt: null,
    ...overrides,
  };
}

describe("scientific metrics parsing", () => {
  it("normalizes a valid scientific draft from portal inputs", () => {
    const result = parseScientificDraftInput(makeDraft());

    expect(result).toEqual({
      ok: true,
      entry: expect.objectContaining({
        measuredAt: "2026-06-27T15:00:00.000Z",
        weightKg: 82.35,
        bodyFatPct: 14.7,
        leanMassKg: null,
        heightCm: 180,
        skinfolds: expect.objectContaining({
          peito: 12.35,
          abdomen: 18,
          triceps: null,
        }),
      }),
    });
  });

  it("rejects missing required weight", () => {
    expect(parseScientificDraftInput(makeDraft({ weightKg: "  " }))).toEqual({
      ok: false,
      message: "Peso obrigatório (20–400 kg).",
    });
  });

  it("rejects body fat outside the accepted range", () => {
    expect(parseScientificDraftInput(makeDraft({ bodyFatPct: "88" }))).toEqual({
      ok: false,
      message: "Gordura corporal inválido (1–70).",
    });
  });

  it("rejects invalid skinfold values", () => {
    const result = parseScientificDraftInput(
      makeDraft({
        skinfolds: {
          ...emptyScientificSkinfoldDraft(),
          triceps: "0",
        },
      }),
    );

    expect(result).toEqual({
      ok: false,
      message: "Tríceps inválido (1–80).",
    });
  });

  it("rejects impossible calendar dates", () => {
    expect(parseScientificDraftInput(makeDraft({ measuredAt: "31/02/2026" }))).toEqual({
      ok: false,
      message: "Data inválida. Use o formato DD/MM/AAAA (ex.: 27/06/2026).",
    });
  });
});

describe("scientific metrics aggregation", () => {
  it("returns null when there are no finite skinfolds to sum", () => {
    expect(sumScientificSkinfolds(emptyScientificSkinfolds())).toBeNull();
  });

  it("sums only valid skinfold values with two decimal precision", () => {
    expect(
      sumScientificSkinfolds({
        ...emptyScientificSkinfolds(),
        peito: 12.345,
        abdomen: 18.111,
        triceps: Number.NaN,
      }),
    ).toBe(30.46);
  });

  it("prefers a local entry over a server snapshot on the same measured day", () => {
    const serverEntry = makeEntry({
      id: "server-cliente-1-2026-06-27T15:00:00.000Z",
      savedAt: "2026-06-27T18:00:00.000Z",
      syncedAt: "2026-06-27T18:00:00.000Z",
      weightKg: 80,
    });
    const localEntry = makeEntry({
      id: "local-1",
      savedAt: "2026-06-27T17:00:00.000Z",
      syncedAt: null,
      weightKg: 82,
    });

    expect(mergeScientificEntries([serverEntry, localEntry])).toEqual([localEntry]);
  });
});
