/**
 * PRUEBAS CON FLUENT ASSERTIONS — HU-01
 *
 * Fluent Assertions: estilo de aserción encadenado que mejora la
 * legibilidad del test al leerlo casi como lenguaje natural.
 *
 * Implementación: wrapper FluentExpect sobre el expect de Vitest,
 * que permite encadenar aserciones en una sola expresión.
 */

import { describe, expect, it } from "vitest";
import { Op } from "sequelize";
import { buildRevisionWhereClause } from "./revisions-filters";

// ─────────────────────────────────────────────────────────────────────────────
// FluentExpect — Wrapper de Fluent Assertions sobre Vitest
// ─────────────────────────────────────────────────────────────────────────────
class FluentExpect<T> {
  constructor(private readonly value: T) {}

  /** La aserción .should() marca el inicio de la cadena — mejora la legibilidad */
  get should(): this {
    return this;
  }

  be(expected: T): this {
    expect(this.value).toBe(expected);
    return this;
  }

  equal(expected: unknown): this {
    expect(this.value).toEqual(expected);
    return this;
  }

  exist(): this {
    expect(this.value).toBeDefined();
    expect(this.value).not.toBeNull();
    return this;
  }

  beUndefined(): this {
    expect(this.value).toBeUndefined();
    return this;
  }

  haveProperty(key: string, val?: unknown): this {
    if (val !== undefined) {
      expect(this.value).toHaveProperty(key, val);
    } else {
      expect(this.value).toHaveProperty(key);
    }
    return this;
  }

  contain(item: unknown): this {
    expect(this.value).toContain(item);
    return this;
  }

  haveLength(n: number): this {
    expect(this.value).toHaveLength(n);
    return this;
  }

  beGreaterThan(n: number): this {
    expect(this.value as number).toBeGreaterThan(n);
    return this;
  }

  beLessThan(n: number): this {
    expect(this.value as number).toBeLessThan(n);
    return this;
  }

  beTrue(): this {
    expect(this.value).toBe(true);
    return this;
  }

  beFalse(): this {
    expect(this.value).toBe(false);
    return this;
  }

  /** .and restablece el sujeto de la aserción para encadenar sobre otro valor */
  and<U>(newValue: U): FluentExpect<U> {
    return new FluentExpect(newValue);
  }
}

/** Punto de entrada: assertThat(value).should.be(...) */
function assertThat<T>(value: T): FluentExpect<T> {
  return new FluentExpect(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests con Fluent Assertions
// ─────────────────────────────────────────────────────────────────────────────
const DOC_ID   = "aaaaaaaa-0000-0000-0000-000000000001";
const USER_ID  = "bbbbbbbb-0000-0000-0000-000000000002";
const DATE_FROM = new Date("2026-01-01T00:00:00Z");
const DATE_TO   = new Date("2026-12-31T23:59:59Z");

describe("Fluent Assertions — buildRevisionWhereClause (HU-01)", () => {

  it("FL-01: cláusula WHERE sin filtros contiene solo documentId", () => {
    const where = buildRevisionWhereClause(DOC_ID);

    assertThat(where)
      .should.exist()
      .haveProperty("documentId", DOC_ID);

    assertThat((where as any)[Op.or])
      .should.beUndefined();
  });

  it("FL-02: filtro userId genera cláusula OR con userId y collaboratorIds", () => {
    const where = buildRevisionWhereClause(DOC_ID, USER_ID);
    const orClause = (where as any)[Op.or] as Array<Record<string, unknown>>;

    assertThat(orClause)
      .should.exist()
      .haveLength(2);

    assertThat(orClause[0])
      .should.haveProperty("userId", USER_ID);

    assertThat(orClause[1])
      .should.haveProperty("collaboratorIds");
  });

  it("FL-03: filtro dateFrom genera Op.gte con la fecha correcta", () => {
    const where = buildRevisionWhereClause(DOC_ID, undefined, DATE_FROM);
    const createdAt = (where as any).createdAt as Record<symbol, Date>;

    assertThat(createdAt)
      .should.exist();

    assertThat(createdAt[Op.gte])
      .should.be(DATE_FROM);

    assertThat(createdAt[Op.lte])
      .should.beUndefined();
  });

  it("FL-04: filtro dateTo genera Op.lte con la fecha correcta", () => {
    const where = buildRevisionWhereClause(DOC_ID, undefined, undefined, DATE_TO);
    const createdAt = (where as any).createdAt as Record<symbol, Date>;

    assertThat(createdAt)
      .should.exist();

    assertThat(createdAt[Op.lte])
      .should.be(DATE_TO);

    assertThat(createdAt[Op.gte])
      .should.beUndefined();
  });

  it("FL-05: filtro con dateFrom y dateTo genera ambos operadores", () => {
    const where = buildRevisionWhereClause(DOC_ID, undefined, DATE_FROM, DATE_TO);
    const createdAt = (where as any).createdAt as Record<symbol, Date>;

    assertThat(createdAt[Op.gte])
      .should.be(DATE_FROM)
      .and(createdAt[Op.lte])
      .should.be(DATE_TO);
  });

  it("FL-06: filtro combinado userId + rango genera WHERE completo", () => {
    const where = buildRevisionWhereClause(DOC_ID, USER_ID, DATE_FROM, DATE_TO);

    assertThat(where)
      .should.haveProperty("documentId", DOC_ID)
      .haveProperty("createdAt");

    const orClause = (where as any)[Op.or];
    assertThat(orClause).should.exist().haveLength(2);

    const createdAt = (where as any).createdAt;
    assertThat(createdAt[Op.gte]).should.be(DATE_FROM);
    assertThat(createdAt[Op.lte]).should.be(DATE_TO);
  });

  it("FL-07: documentId se preserva en todos los escenarios de filtrado", () => {
    const casos = [
      buildRevisionWhereClause(DOC_ID),
      buildRevisionWhereClause(DOC_ID, USER_ID),
      buildRevisionWhereClause(DOC_ID, undefined, DATE_FROM),
      buildRevisionWhereClause(DOC_ID, undefined, undefined, DATE_TO),
      buildRevisionWhereClause(DOC_ID, USER_ID, DATE_FROM, DATE_TO),
    ];

    casos.forEach((where) => {
      assertThat(where)
        .should.haveProperty("documentId", DOC_ID);
    });
  });
});
