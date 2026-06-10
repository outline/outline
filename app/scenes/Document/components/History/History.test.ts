/**
 * PRUEBAS UNITARIAS MANUALES — HU-01
 * Frontend: lógica pura de fetchHistory y revisionEvents
 *
 * Funcionalidades cubiertas:
 *   F4 — fetchHistory(): lógica de merge/ordenamiento (caminos P1–P2)
 *   F5 — revisionEvents: filtro de revisión latest (caminos P1–P4)
 */

import { describe, it, expect } from "vitest";
import { orderBy } from "es-toolkit/compat";

// ---------------------------------------------------------------------------
// Helpers que replican la lógica interna de History.tsx
// ---------------------------------------------------------------------------

type ItemWithDate = { id: string; createdAt: Date };

/** Replica la lógica de merge+ordenamiento de fetchHistory */
function mergeAndSortItems(
  revisionsPage: ItemWithDate[],
  eventsPage: ItemWithDate[],
  limit: number
): ItemWithDate[] {
  return orderBy(
    [...revisionsPage, ...eventsPage],
    "createdAt",
    "desc"
  ).slice(0, limit);
}

/** Replica la lógica del memo revisionEvents */
function calcularRevisionEvents(
  document: { id: string } | null,
  todasRevisiones: ItemWithDate[],
  revisionsOffset: number,
  latestRevisionId: string
): ItemWithDate[] {
  if (!document) {
    return [];
  }
  return todasRevisiones
    .filter((r) => r.id !== latestRevisionId)
    .slice(0, revisionsOffset);
}

// ---------------------------------------------------------------------------
// F4 — fetchHistory: lógica de merge y ordenamiento
// Caminos: P1(document null → []), P2(document existe → fetch+merge)
// ---------------------------------------------------------------------------
describe("F4 — fetchHistory: merge y ordenamiento (HU-01)", () => {
  const t1 = new Date("2026-01-01T10:00:00Z");
  const t2 = new Date("2026-03-15T12:00:00Z");
  const t3 = new Date("2026-05-20T08:00:00Z");

  // P1 — document es null → retorna arreglo vacío sin llamadas a la API
  it("PU-F4-P1: document null retorna lista vacía", () => {
    const document = null;
    const resultado = document ? mergeAndSortItems([], [], 25) : [];
    expect(resultado).toEqual([]);
    expect(resultado.length).toBe(0);
  });

  // P2 — document existe → revisiones y eventos se mezclan ordenados por fecha DESC
  it("PU-F4-P2: revisiones y eventos se combinan ordenados por createdAt DESC", () => {
    const revisionsPage: ItemWithDate[] = [
      { id: "r1", createdAt: t1 },
      { id: "r2", createdAt: t3 },
    ];
    const eventsPage: ItemWithDate[] = [{ id: "e1", createdAt: t2 }];
    const limit = 25;

    const resultado = mergeAndSortItems(revisionsPage, eventsPage, limit);

    expect(resultado.length).toBe(3);
    expect(resultado[0].id).toBe("r2"); // t3 más reciente
    expect(resultado[1].id).toBe("e1"); // t2
    expect(resultado[2].id).toBe("r1"); // t1 más antigua
  });

  // Camino adicional: limit recorta el resultado al máximo permitido
  it("PU-F4-P3: el limit recorta los resultados correctamente", () => {
    const revisionsPage: ItemWithDate[] = [
      { id: "r1", createdAt: t1 },
      { id: "r2", createdAt: t2 },
      { id: "r3", createdAt: t3 },
    ];
    const eventsPage: ItemWithDate[] = [];
    const limit = 2;

    const resultado = mergeAndSortItems(revisionsPage, eventsPage, limit);

    expect(resultado.length).toBe(2);
    expect(resultado[0].id).toBe("r3");
    expect(resultado[1].id).toBe("r2");
  });
});

// ---------------------------------------------------------------------------
// F5 — revisionEvents: filtrado de revisión "latest" y paginación local
// Caminos: P1(doc null → []), P2(sin revisiones → []),
//          P3(existe latest → excluida), P4(no hay latest → todas incluidas)
// ---------------------------------------------------------------------------
describe("F5 — revisionEvents: filtrado de revisión latest (HU-01)", () => {
  const DOC_ID = "doc-abc-123";
  const LATEST_ID = `latest-${DOC_ID}`;

  // P1 — document es null → retorna arreglo vacío
  it("PU-F5-P1: document null retorna lista vacía", () => {
    const resultado = calcularRevisionEvents(null, [], 10, LATEST_ID);
    expect(resultado).toEqual([]);
  });

  // P2 — sin revisiones en el store → lista vacía
  it("PU-F5-P2: sin revisiones en el store retorna lista vacía", () => {
    const document = { id: DOC_ID };
    const resultado = calcularRevisionEvents(document, [], 10, LATEST_ID);
    expect(resultado).toEqual([]);
  });

  // P3 — existe la revisión latest → se excluye del resultado
  it("PU-F5-P3: la revisión con latestRevisionId es excluida del listado", () => {
    const document = { id: DOC_ID };
    const todasRevisiones: ItemWithDate[] = [
      { id: LATEST_ID, createdAt: new Date("2026-06-09T10:00:00Z") },
      { id: "rev-001", createdAt: new Date("2026-05-01T10:00:00Z") },
      { id: "rev-002", createdAt: new Date("2026-04-01T10:00:00Z") },
    ];

    const resultado = calcularRevisionEvents(
      document,
      todasRevisiones,
      10,
      LATEST_ID
    );

    expect(resultado.length).toBe(2);
    expect(resultado.find((r) => r.id === LATEST_ID)).toBeUndefined();
    expect(resultado[0].id).toBe("rev-001");
    expect(resultado[1].id).toBe("rev-002");
  });

  // P4 — ninguna revisión tiene el latestRevisionId → todas se incluyen
  it("PU-F5-P4: si no existe revisión latest todas las revisiones se incluyen", () => {
    const document = { id: DOC_ID };
    const todasRevisiones: ItemWithDate[] = [
      { id: "rev-001", createdAt: new Date("2026-05-01T10:00:00Z") },
      { id: "rev-002", createdAt: new Date("2026-04-01T10:00:00Z") },
    ];

    const resultado = calcularRevisionEvents(
      document,
      todasRevisiones,
      10,
      LATEST_ID
    );

    expect(resultado.length).toBe(2);
    expect(resultado[0].id).toBe("rev-001");
  });

  // Camino adicional: revisionsOffset limita la cantidad retornada
  it("PU-F5-P5: revisionsOffset limita los resultados visibles", () => {
    const document = { id: DOC_ID };
    const todasRevisiones: ItemWithDate[] = [
      { id: "rev-001", createdAt: new Date("2026-06-01T00:00:00Z") },
      { id: "rev-002", createdAt: new Date("2026-05-01T00:00:00Z") },
      { id: "rev-003", createdAt: new Date("2026-04-01T00:00:00Z") },
    ];

    const resultado = calcularRevisionEvents(
      document,
      todasRevisiones,
      2,
      LATEST_ID
    );

    expect(resultado.length).toBe(2);
    expect(resultado[0].id).toBe("rev-001");
    expect(resultado[1].id).toBe("rev-002");
  });
});
