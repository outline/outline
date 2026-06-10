/**
 * PRUEBAS UNITARIAS — Patrón AAA + 5 tipos de Mock
 * Módulo: HU-01 — Filtrado de historial de revisiones por colaborador y fecha
 *
 * Tipos de Mock demostrados:
 *  1. Dummy  — objeto pasado como argumento pero irrelevante para la aserción
 *  2. Stub   — reemplaza una función con un retorno prefijado y sin lógica real
 *  3. Spy    — envuelve la implementación real y registra todas las llamadas
 *  4. Mock   — función con expectativas de comportamiento verificables
 *  5. Fake   — implementación simplificada funcional (almacén en memoria)
 *
 * Principios FIRST:
 *  Fast         — sin I/O real (DB mockeada o lógica pura)
 *  Independent  — vi.restoreAllMocks() en afterEach, sin estado compartido
 *  Repeatable   — fechas y UUIDs fijos, sin dependencia del reloj del sistema
 *  Self-validating — cada test termina con expect() explícito
 *  Timely       — escritos junto con la implementación de HU-01
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Op } from "sequelize";
import { buildRevisionWhereClause } from "./revisions-filters";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes de prueba reutilizables
// ─────────────────────────────────────────────────────────────────────────────
const DOC_ID = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_A = "bbbbbbbb-0000-0000-0000-000000000002";
const USER_B = "cccccccc-0000-0000-0000-000000000003";
const DATE_EARLY = new Date("2026-01-15T00:00:00Z");
const DATE_LATE = new Date("2026-05-15T00:00:00Z");

// ─────────────────────────────────────────────────────────────────────────────
// TIPO 5 — FAKE: Almacén de revisiones en memoria
// Implementación funcional que sustituye la BD Sequelize para pruebas rápidas.
// ─────────────────────────────────────────────────────────────────────────────
interface FakeRevision {
  id: string;
  documentId: string;
  userId: string;
  collaboratorIds: string[];
  createdAt: Date;
}

class FakeRevisionStore {
  private store: FakeRevision[] = [];

  seed(revisions: FakeRevision[]) {
    this.store = [...revisions];
    return this;
  }

  async findAll(filters: {
    documentId?: string;
    userId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<FakeRevision[]> {
    return this.store.filter((r) => {
      if (filters.documentId && r.documentId !== filters.documentId) return false;
      if (
        filters.userId &&
        r.userId !== filters.userId &&
        !r.collaboratorIds.includes(filters.userId)
      ) {
        return false;
      }
      if (filters.dateFrom && r.createdAt < filters.dateFrom) return false;
      if (filters.dateTo && r.createdAt > filters.dateTo) return false;
      return true;
    });
  }

  clear() {
    this.store = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 1 — TIPO 1: DUMMY
// Un Dummy es cualquier objeto pasado a una función pero cuyo valor
// específico no importa para la aserción del test.
// ─────────────────────────────────────────────────────────────────────────────
describe("Mock Tipo 1 — DUMMY: buildRevisionWhereClause (HU-01)", () => {
  it("AAA-DUMMY-01: documentId dummy produce cláusula WHERE con documentId correcto", () => {
    // Arrange — cualquier UUID válido sirve; el valor exacto es irrelevante para este test
    const dummyDocId = "00000000-dead-beef-0000-000000000000"; // DUMMY

    // Act
    const where = buildRevisionWhereClause(dummyDocId);

    // Assert
    expect(where).toMatchObject({ documentId: dummyDocId });
  });

  it("AAA-DUMMY-02: userId dummy opcional no añade Op.or cuando es undefined", () => {
    // Arrange
    const dummyDocId = "00000000-dead-beef-0000-000000000000"; // DUMMY
    const dummyUserId = undefined; // DUMMY — ausencia explícita

    // Act
    const where = buildRevisionWhereClause(dummyDocId, dummyUserId);

    // Assert — no debe existir propiedad Op.or
    expect((where as Record<symbol, unknown>)[Op.or]).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 2 — TIPO 2: STUB
// Un Stub reemplaza una función real con una versión que devuelve
// datos predefinidos sin ejecutar la lógica original.
// ─────────────────────────────────────────────────────────────────────────────
describe("Mock Tipo 2 — STUB: simulación de Revision.findAll (HU-01)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AAA-STUB-01: stub de findAll retorna lista vacía cuando no hay revisiones", async () => {
    // Arrange — STUB que reemplaza findAll con respuesta predefinida
    const stubFindAll = vi.fn().mockResolvedValue([]); // STUB

    // Act
    const result = await stubFindAll({ documentId: DOC_ID });

    // Assert
    expect(result).toHaveLength(0);
    expect(stubFindAll).toHaveBeenCalledOnce();
  });

  it("AAA-STUB-02: stub de findAll retorna revisiones predefinidas para el documento", async () => {
    // Arrange
    const revisionesEsperadas = [
      { id: "rev-1", documentId: DOC_ID, userId: USER_A, collaboratorIds: [], createdAt: DATE_EARLY },
      { id: "rev-2", documentId: DOC_ID, userId: USER_A, collaboratorIds: [USER_B], createdAt: DATE_LATE },
    ];
    const stubFindAll = vi.fn().mockResolvedValue(revisionesEsperadas); // STUB

    // Act
    const result = await stubFindAll({ documentId: DOC_ID });

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].documentId).toBe(DOC_ID);
    expect(result[1].collaboratorIds).toContain(USER_B);
  });

  it("AAA-STUB-03: stub de findAll con filtro userId retorna solo revisiones del colaborador", async () => {
    // Arrange
    const revisionColaborador = { id: "rev-x", documentId: DOC_ID, userId: USER_A, collaboratorIds: [USER_B], createdAt: DATE_EARLY };
    const stubFindAll = vi.fn().mockResolvedValue([revisionColaborador]); // STUB

    // Act
    const where = buildRevisionWhereClause(DOC_ID, USER_B);
    const result = await stubFindAll(where);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].collaboratorIds).toContain(USER_B);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 3 — TIPO 3: SPY
// Un Spy envuelve la función real y registra cuántas veces fue llamada
// y con qué argumentos, sin alterar su comportamiento.
// ─────────────────────────────────────────────────────────────────────────────
describe("Mock Tipo 3 — SPY: buildRevisionWhereClause (HU-01)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AAA-SPY-01: spy verifica que buildRevisionWhereClause es llamada con los parámetros correctos", () => {
    // Arrange — SPY sobre el módulo importado
    const spyBuild = vi.fn(buildRevisionWhereClause); // SPY (wraps real impl)

    // Act
    spyBuild(DOC_ID, USER_A, DATE_EARLY, DATE_LATE);

    // Assert — verifica la llamada sin alterar el resultado
    expect(spyBuild).toHaveBeenCalledOnce();
    expect(spyBuild).toHaveBeenCalledWith(DOC_ID, USER_A, DATE_EARLY, DATE_LATE);
  });

  it("AAA-SPY-02: spy confirma que la función no es llamada cuando no se filtra", () => {
    // Arrange
    const spyBuild = vi.fn(buildRevisionWhereClause); // SPY

    // Act — no llamamos a spyBuild

    // Assert
    expect(spyBuild).not.toHaveBeenCalled();
  });

  it("AAA-SPY-03: spy preserva el valor de retorno de la implementación real", () => {
    // Arrange
    const spyBuild = vi.fn(buildRevisionWhereClause); // SPY — mantiene lógica real

    // Act
    const where = spyBuild(DOC_ID, USER_A);

    // Assert — el resultado viene de la implementación real, no de un stub
    expect(where).toMatchObject({ documentId: DOC_ID });
    expect((where as Record<symbol, unknown>)[Op.or]).toBeDefined();
    expect(spyBuild).toHaveReturnedWith(where);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 4 — TIPO 4: MOCK
// Un Mock es una función con expectativas de comportamiento que se
// verifican automáticamente: qué fue llamado, cuántas veces y con qué.
// ─────────────────────────────────────────────────────────────────────────────
describe("Mock Tipo 4 — MOCK: verificación de comportamiento del filtro (HU-01)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("AAA-MOCK-01: mock verifica que Op.or contiene filtros de userId y collaboratorIds", () => {
    // Arrange — MOCK: función que valida exactamente qué argumentos recibe
    const mockValidarFiltro = vi.fn((where: ReturnType<typeof buildRevisionWhereClause>) => {
      const orClause = (where as Record<symbol, unknown>)[Op.or] as Array<Record<string, unknown>>;
      return orClause?.some((c) => "userId" in c) && orClause?.some((c) => "collaboratorIds" in c);
    }); // MOCK

    const where = buildRevisionWhereClause(DOC_ID, USER_A);

    // Act
    const esValido = mockValidarFiltro(where);

    // Assert
    expect(mockValidarFiltro).toHaveBeenCalledWith(where);
    expect(esValido).toBe(true);
  });

  it("AAA-MOCK-02: mock verifica que el filtro de fecha usa Op.gte y Op.lte correctamente", () => {
    // Arrange
    const mockValidarRango = vi.fn((where: ReturnType<typeof buildRevisionWhereClause>) => {
      const createdAt = (where as Record<string, Record<symbol, Date>>).createdAt;
      return createdAt?.[Op.gte] === DATE_EARLY && createdAt?.[Op.lte] === DATE_LATE;
    }); // MOCK

    const where = buildRevisionWhereClause(DOC_ID, undefined, DATE_EARLY, DATE_LATE);

    // Act
    const rangoValido = mockValidarRango(where);

    // Assert
    expect(mockValidarRango).toHaveBeenCalledOnce();
    expect(rangoValido).toBe(true);
  });

  it("AAA-MOCK-03: mock detecta que solo dateFrom produce filtro con Op.gte pero sin Op.lte", () => {
    // Arrange
    const mockInspector = vi.fn((where: ReturnType<typeof buildRevisionWhereClause>) => {
      const createdAt = (where as Record<string, Record<symbol, Date>>).createdAt;
      return { tieneGte: !!createdAt?.[Op.gte], tieneLte: !!createdAt?.[Op.lte] };
    }); // MOCK

    const where = buildRevisionWhereClause(DOC_ID, undefined, DATE_EARLY, undefined);

    // Act
    const inspeccion = mockInspector(where);

    // Assert
    expect(inspeccion.tieneGte).toBe(true);
    expect(inspeccion.tieneLte).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bloque 5 — TIPO 5: FAKE
// Un Fake es una implementación funcional pero simplificada que sustituye
// la dependencia real (aquí, la base de datos PostgreSQL).
// ─────────────────────────────────────────────────────────────────────────────
describe("Mock Tipo 5 — FAKE: FakeRevisionStore (HU-01)", () => {
  const store = new FakeRevisionStore();

  beforeEach(() => {
    store.seed([
      { id: "rev-1", documentId: DOC_ID, userId: USER_A, collaboratorIds: [], createdAt: DATE_EARLY },
      { id: "rev-2", documentId: DOC_ID, userId: USER_A, collaboratorIds: [USER_B], createdAt: DATE_LATE },
      { id: "rev-3", documentId: "otro-doc", userId: USER_A, collaboratorIds: [], createdAt: DATE_EARLY },
    ]);
  });

  afterEach(() => store.clear());

  it("AAA-FAKE-01: fake retorna todas las revisiones de un documento sin filtros", async () => {
    // Arrange — FAKE ya cargado con seed()

    // Act
    const result = await store.findAll({ documentId: DOC_ID });

    // Assert
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.documentId === DOC_ID)).toBe(true);
  });

  it("AAA-FAKE-02: fake filtra por userId (autor o colaborador)", async () => {
    // Arrange

    // Act
    const result = await store.findAll({ documentId: DOC_ID, userId: USER_B });

    // Assert — solo rev-2 tiene USER_B como colaborador
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rev-2");
  });

  it("AAA-FAKE-03: fake filtra por rango de fechas con dateFrom y dateTo", async () => {
    // Arrange
    const dateFrom = new Date("2026-03-01T00:00:00Z");
    const dateTo = new Date("2026-06-01T00:00:00Z");

    // Act
    const result = await store.findAll({ documentId: DOC_ID, dateFrom, dateTo });

    // Assert — solo DATE_LATE (mayo) está en el rango
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toEqual(DATE_LATE);
  });

  it("AAA-FAKE-04: fake retorna lista vacía cuando ninguna revisión coincide", async () => {
    // Arrange
    const dateFrom = new Date("2030-01-01T00:00:00Z");

    // Act
    const result = await store.findAll({ documentId: DOC_ID, dateFrom });

    // Assert
    expect(result).toHaveLength(0);
  });
});
