import { describe, expect, it } from "vitest";
import { csvToTrades, normalizeDateTime, parseCsv, toCsv } from "./csv";
import { freshTradingState } from "./defaults";

describe("CSV", () => {
  it("parsea comillas, comas y punto y coma", () => {
    expect(parseCsv('a,b\n1,"x, ""y"""\n')).toEqual([{ a: "1", b: 'x, "y"' }]);
    expect(parseCsv("a;b\r\n1;2")).toEqual([{ a: "1", b: "2" }]);
  });
  it("ida y vuelta", () => {
    const csv = toCsv([{ a: "hola, mundo", b: 2 }]);
    expect(parseCsv(csv)).toEqual([{ a: "hola, mundo", b: "2" }]);
  });
  it("normaliza fechas", () => {
    expect(normalizeDateTime("05/10/2026 9:30")).toBe("2026-10-05T09:30");
    expect(normalizeDateTime("2026-10-05 09:30:00")).toBe("2026-10-05T09:30");
    expect(normalizeDateTime("nope")).toBeNull();
  });
  it("convierte filas en trades y reporta errores", () => {
    const s = freshTradingState();
    const rows = parseCsv(
      "fecha_entrada,direccion,entrada,stop,salida,contratos,instrumento,siguio_plan\n" +
        "2026-10-05 10:00,long,100,90,120,2,MNQ,no\n" +
        "mal,long,1,,2,1,,\n",
    );
    const r = csvToTrades(rows, s, { accountId: "a", instrumentId: "mnq" });
    expect(r.trades).toHaveLength(1);
    expect(r.trades[0]).toMatchObject({ direction: "long", contracts: 2, stop: 90, followedPlan: false, instrumentId: "mnq" });
    expect(r.errors).toHaveLength(1);
  });
});
