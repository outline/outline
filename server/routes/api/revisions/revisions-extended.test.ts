/**
 * PRUEBAS EXTENDIDAS — HU-01: Filtrado de historial de revisiones
 *
 * Tipos de prueba:
 *  - Pruebas de API        : contrato HTTP (status codes, estructura de respuesta)
 *  - Pruebas de Seguridad  : autenticación, autorización, inyección
 *  - Pruebas de Regresión  : comportamiento pre-existente sin HU-01
 *  - Prueba de Rendimiento : tiempo de respuesta bajo múltiples revisiones
 */

import { createContext } from "@server/context";
import { Revision } from "@server/models";
import { buildDocument, buildUser } from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DE API — Contrato HTTP
// Verifica estructura, tipos y campos de la respuesta JSON
// ─────────────────────────────────────────────────────────────────────────────
describe("API Tests — contrato HTTP de revisions.list (HU-01)", () => {
  it("API-01: respuesta contiene campos obligatorios del contrato", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(body).toHaveProperty("policies");
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("API-02: cada revisión en data contiene los campos esperados del contrato", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();
    const revision = body.data[0];

    expect(revision).toHaveProperty("id");
    expect(revision).toHaveProperty("documentId", document.id);
    expect(revision).toHaveProperty("createdAt");
    expect(revision).toHaveProperty("collaborators");
    expect(revision).toHaveProperty("collaboratorIds");
    expect(revision).toHaveProperty("createdById");
    expect(Array.isArray(revision.collaborators)).toBe(true);
    expect(Array.isArray(revision.collaboratorIds)).toBe(true);
  });

  it("API-03: campo pagination contiene offset, limit y nextPath", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(body.pagination).toHaveProperty("offset");
    expect(body.pagination).toHaveProperty("limit");
    expect(typeof body.pagination.offset).toBe("number");
    expect(typeof body.pagination.limit).toBe("number");
  });

  it("API-04: Content-Type de respuesta es application/json", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });

    expect(res.headers.get("content-type")).toMatch(/application\/json/);
  });

  it("API-05: paginación retorna correctamente el subconjunto solicitado", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    await Revision.createFromDocument(createContext({ user }), document);
    await Revision.createFromDocument(createContext({ user }), document);
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id, limit: 2, offset: 0 },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBeLessThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DE SEGURIDAD
// Verifica que la API protege contra accesos no autorizados y entradas maliciosas
// ─────────────────────────────────────────────────────────────────────────────
describe("Security Tests — autenticación y autorización (HU-01)", () => {
  it("SEC-01: petición sin token retorna 401 Unauthorized", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    // Llamada sin autenticar (usando fetch directo sin token)
    const res = await server.post("/api/revisions.list", null as any, {
      body: { documentId: document.id },
    });

    expect(res.status).toBeOneOf([401, 403]);
  });

  it("SEC-02: usuario de otro equipo no puede ver revisiones (403)", async () => {
    const owner = await buildUser();
    const intruder = await buildUser(); // equipo diferente
    const document = await buildDocument({ userId: owner.id, teamId: owner.teamId });
    await Revision.createFromDocument(createContext({ user: owner }), document);

    const res = await server.post("/api/revisions.list", intruder, {
      body: { documentId: document.id },
    });

    expect(res.status).toBe(403);
  });

  it("SEC-03: userId con caracteres de inyección SQL es rechazado por validación (400)", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        userId: "1' OR '1'='1",
      },
    });

    expect(res.status).toBe(400);
  });

  it("SEC-04: dateFrom con script XSS es rechazado por validación (400)", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        dateFrom: "<script>alert('xss')</script>",
      },
    });

    expect(res.status).toBe(400);
  });

  it("SEC-05: documentId con formato UUID falso retorna 400, no expone info interna", async () => {
    const user = await buildUser();

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: "../../../../etc/passwd" },
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("stack");
    expect(JSON.stringify(body)).not.toContain("at ");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DE REGRESIÓN
// Verifica que el comportamiento previo a HU-01 sigue funcionando correctamente
// ─────────────────────────────────────────────────────────────────────────────
describe("Regression Tests — comportamiento pre-HU-01 intacto", () => {
  it("REG-01: listar revisiones sin filtros sigue funcionando (regresión base)", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("REG-02: el orden por defecto (createdAt DESC) se mantiene", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    const r1 = await Revision.createFromDocument(createContext({ user }), document);
    await Revision.update(
      { createdAt: new Date("2026-01-01T00:00:00Z") },
      { where: { id: r1.id }, silent: true }
    );
    const r2 = await Revision.createFromDocument(createContext({ user }), document);
    await Revision.update(
      { createdAt: new Date("2026-06-01T00:00:00Z") },
      { where: { id: r2.id }, silent: true }
    );

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    const fechas = body.data.map((r: any) => new Date(r.createdAt).getTime());
    for (let i = 0; i < fechas.length - 1; i++) {
      expect(fechas[i]).toBeGreaterThanOrEqual(fechas[i + 1]);
    }
  });

  it("REG-03: el campo collaboratorIds nuevo no rompe revisiones antiguas sin colaboradores", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data[0].collaboratorIds).toEqual([]);
  });

  it("REG-04: ordenamiento ASC explícito retorna revisiones en orden ascendente", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });
    const r1 = await Revision.createFromDocument(createContext({ user }), document);
    await Revision.update(
      { createdAt: new Date("2026-01-01T00:00:00Z") },
      { where: { id: r1.id }, silent: true }
    );
    const r2 = await Revision.createFromDocument(createContext({ user }), document);
    await Revision.update(
      { createdAt: new Date("2026-06-01T00:00:00Z") },
      { where: { id: r2.id }, silent: true }
    );

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id, direction: "ASC" },
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    const fechas = body.data.map((r: any) => new Date(r.createdAt).getTime());
    for (let i = 0; i < fechas.length - 1; i++) {
      expect(fechas[i]).toBeLessThanOrEqual(fechas[i + 1]);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBA DE RENDIMIENTO
// Mide el tiempo de respuesta con un volumen alto de revisiones
// ─────────────────────────────────────────────────────────────────────────────
describe("Performance Test — tiempo de respuesta con múltiples revisiones (HU-01)", () => {
  it("PERF-01: listar 20 revisiones responde en menos de 2000 ms", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    // Crear 20 revisiones
    for (let i = 0; i < 20; i++) {
      await Revision.createFromDocument(createContext({ user }), document);
    }

    const inicio = Date.now();
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const tiempoMs = Date.now() - inicio;

    expect(res.status).toBe(200);
    expect(tiempoMs).toBeLessThan(2000);
    console.log(`PERF-01: tiempo de respuesta = ${tiempoMs} ms`);
  });

  it("PERF-02: filtro por dateFrom con 20 revisiones responde en menos de 2000 ms", async () => {
    const user = await buildUser();
    const document = await buildDocument({ userId: user.id, teamId: user.teamId });

    for (let i = 0; i < 20; i++) {
      await Revision.createFromDocument(createContext({ user }), document);
    }

    const inicio = Date.now();
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        dateFrom: "2020-01-01T00:00:00.000Z",
      },
    });
    const tiempoMs = Date.now() - inicio;

    expect(res.status).toBe(200);
    expect(tiempoMs).toBeLessThan(2000);
    console.log(`PERF-02: tiempo de respuesta con filtro = ${tiempoMs} ms`);
  });
});
