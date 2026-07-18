import {
  resolveCycleSelfieCalendarDay,
  resolveCycleSelfieCaptureKindToday,
  resolveCycleSelfieEndDay,
  resolveCycleSelfieStartDay,
} from "@/lib/cycle-selfie-calendar";
import { brasiliaDateInputToIso } from "@/lib/brasilia-time";

function atBrasiliaNoon(ymd: string): Date {
  return new Date(brasiliaDateInputToIso(ymd));
}

describe("resolveCycleSelfieStartDay", () => {
  it("mantém o dia 1 quando cai em dia útil", () => {
    // 2026-06-01 = segunda
    expect(resolveCycleSelfieStartDay(2026, 6)).toBe(1);
  });

  it("adianta para segunda quando o dia 1 é domingo", () => {
    // 2026-02-01 = domingo → dia 2
    expect(resolveCycleSelfieStartDay(2026, 2)).toBe(2);
  });

  it("adianta para segunda quando o dia 1 é sábado", () => {
    // 2026-08-01 = sábado → dia 3
    expect(resolveCycleSelfieStartDay(2026, 8)).toBe(3);
  });
});

describe("resolveCycleSelfieEndDay", () => {
  it("respeita meses com 28, 30 e 31 dias", () => {
    expect(resolveCycleSelfieEndDay(2026, 2)).toBe(28);
    expect(resolveCycleSelfieEndDay(2026, 4)).toBe(30);
    expect(resolveCycleSelfieEndDay(2026, 1)).toBe(31);
  });

  it("respeita fevereiro bissexto", () => {
    expect(resolveCycleSelfieEndDay(2024, 2)).toBe(29);
  });
});

describe("resolveCycleSelfieCalendarDay", () => {
  it("resolve início e fim no calendário de Brasília", () => {
    const feb = atBrasiliaNoon("2026-02-10");
    expect(resolveCycleSelfieCalendarDay(1, feb)).toBe(2);
    expect(resolveCycleSelfieCalendarDay(30, feb)).toBe(28);
  });
});

describe("resolveCycleSelfieCaptureKindToday", () => {
  it("marca início no primeiro dia útil do mês", () => {
    expect(resolveCycleSelfieCaptureKindToday(atBrasiliaNoon("2026-02-02"))).toBe(
      "start",
    );
    expect(resolveCycleSelfieCaptureKindToday(atBrasiliaNoon("2026-02-01"))).toBe(
      null,
    );
  });

  it("marca fim no último dia civil do mês", () => {
    expect(resolveCycleSelfieCaptureKindToday(atBrasiliaNoon("2026-02-28"))).toBe(
      "end",
    );
    expect(resolveCycleSelfieCaptureKindToday(atBrasiliaNoon("2026-02-15"))).toBe(
      null,
    );
  });
});
