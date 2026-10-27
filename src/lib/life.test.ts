import { describe, expect, it } from "vitest";
import { ensureCoreHabits, findNofap, migrateLife } from "./life";
import type { Habit, Vice } from "./types";

const h = (id: string, name: string): Habit => ({ id, name, kind: "build", createdAt: "x" });
const v = (id: string, name: string): Vice => ({ id, name, since: "x", relapses: [], best: 3 });

describe("migrateLife", () => {
  it("reemplaza los hábitos viejos por defecto y conserva los propios", () => {
    const r = migrateLife(
      [h("h-no-scroll", "Sin redes ni scroll"), h("h-ejercicio", "Ejercicio"), h("h-lectura", "Leer 20 minutos"), h("mio", "Inglés")],
      [v("v-redes", "Redes sociales")],
      "now",
    );
    expect(r.habits.map((x) => x.name)).toEqual(["Trading", "Gimnasio", "Leer 20 minutos", "Dormir antes de las 00", "Inglés"]);
    expect(r.vices[0].name).toBe("No fap");
    expect(r.vices).toHaveLength(2);
  });
  it("no pisa un nombre editado ni duplica No fap", () => {
    const r = migrateLife([h("h-ejercicio", "Crossfit")], [v("x", "NoFap")], "now");
    expect(r.habits.find((x) => x.id === "h-ejercicio")?.name).toBe("Crossfit");
    expect(r.vices).toHaveLength(1);
    expect(findNofap(r.vices)?.id).toBe("x");
  });
});

describe("ensureCoreHabits", () => {
  it("pone las metas diarias al frente y rellena la racha de No fap", () => {
    const now = new Date(2026, 9, 27, 12);
    const r = ensureCoreHabits(
      [h("x", "Gimnasio"), h("h-trading", "2 h de trading")],
      {},
      [{ id: "v-nofap", name: "No fap", since: new Date(2026, 9, 24).toISOString(), relapses: [], best: 0 }],
      now,
    );
    expect(r.habits.map((x) => x.name)).toEqual(["No fap", "Trading", "Estudio facultad", "Gimnasio"]);
    expect(Object.keys(r.habitLog).sort()).toEqual(["2026-10-24", "2026-10-25", "2026-10-26"]);
  });
});
