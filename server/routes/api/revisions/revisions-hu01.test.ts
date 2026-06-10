/**
 * PRUEBAS UNITARIAS MANUALES — HU-01
 * Filtrado del historial de revisiones por colaborador y rango de fechas
 *
 * Funcionalidades cubiertas:
 *   F1 — Endpoint revisions.list con filtros (caminos P1–P6)
 *   F2 — Validación RevisionsListSchema (caminos P1–P6)
 *   F3 — Revision.createFromDocument() (caminos P1–P2)
 */

import { createContext } from "@server/context";
import { Revision } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

// ---------------------------------------------------------------------------
// F1 — Endpoint revisions.list con filtros
// Tabla de caminos: P1(doc no existe), P2(sin permiso), P3(sin filtros),
//                   P4(solo userId), P5(solo dateFrom), P6(solo dateTo)
// ---------------------------------------------------------------------------
describe("F1 — #revisions.list con filtros (HU-01)", () => {
  // P1 — Camino: documento no existe → Error 404/403
  it("PU-F1-P1: documento inexistente retorna 403", async () => {
    const user = await buildUser();
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status).toEqual(403);
  });

  // P2 — Camino: usuario sin permiso sobre el documento → Error 403
  it("PU-F1-P2: usuario sin permiso recibe 403", async () => {
    const owner = await buildUser();
    const outsider = await buildUser();
    const document = await buildDocument({
      userId: owner.id,
      teamId: owner.teamId,
    });
    await Revision.createFromDocument(createContext({ user: owner }), document);

    const res = await server.post("/api/revisions.list", outsider, {
      body: { documentId: document.id },
    });
    expect(res.status).toEqual(403);
  });

  // P3 — Camino: sin filtros → retorna todas las revisiones
  it("PU-F1-P3: sin filtros retorna todas las revisiones del documento", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);
    await Revision.createFromDocument(createContext({ user }), document);

    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(2);
  });

  // P4 — Camino: filtro solo por userId → solo revisiones del colaborador
  it("PU-F1-P4: filtrar por userId retorna solo revisiones de ese colaborador", async () => {
    const userA = await buildUser();
    const userB = await buildUser({ teamId: userA.teamId });
    const document = await buildDocument({
      userId: userA.id,
      teamId: userA.teamId,
    });

    await Revision.createFromDocument(createContext({ user: userA }), document);
    await Revision.createFromDocument(createContext({ user: userA }), document, [
      userB.id,
    ]);

    const res = await server.post("/api/revisions.list", userA, {
      body: { documentId: document.id, userId: userB.id },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].collaboratorIds).toContain(userB.id);
  });

  // P5 — Camino: filtro solo por dateFrom → revisiones desde esa fecha
  it("PU-F1-P5: filtrar por dateFrom retorna revisiones desde esa fecha", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const revisionAntigua = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    await Revision.update(
      { createdAt: new Date("2026-01-01T00:00:00Z") },
      { where: { id: revisionAntigua.id }, silent: true }
    );

    const revisionReciente = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    await Revision.update(
      { createdAt: new Date("2026-05-01T00:00:00Z") },
      { where: { id: revisionReciente.id }, silent: true }
    );

    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        dateFrom: "2026-03-01T00:00:00.000Z",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(new Date(body.data[0].createdAt).getTime()).toBeGreaterThanOrEqual(
      new Date("2026-03-01T00:00:00Z").getTime()
    );
  });

  // P6 — Camino: filtro solo por dateTo → revisiones hasta esa fecha
  it("PU-F1-P6: filtrar por dateTo retorna revisiones hasta esa fecha", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const revisionAntigua = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    await Revision.update(
      { createdAt: new Date("2026-01-01T00:00:00Z") },
      { where: { id: revisionAntigua.id }, silent: true }
    );

    const revisionReciente = await Revision.createFromDocument(
      createContext({ user }),
      document
    );
    await Revision.update(
      { createdAt: new Date("2026-05-01T00:00:00Z") },
      { where: { id: revisionReciente.id }, silent: true }
    );

    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        dateTo: "2026-02-28T23:59:59.000Z",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(new Date(body.data[0].createdAt).getTime()).toBeLessThanOrEqual(
      new Date("2026-02-28T23:59:59Z").getTime()
    );
  });

  // Camino adicional: combinación userId + rango de fechas → intersección
  it("PU-F1-P7: combinación userId + rango de fechas retorna intersección correcta", async () => {
    const userA = await buildUser();
    const userB = await buildUser({ teamId: userA.teamId });
    const document = await buildDocument({
      userId: userA.id,
      teamId: userA.teamId,
    });

    const r1 = await Revision.createFromDocument(
      createContext({ user: userA }),
      document,
      [userB.id]
    );
    await Revision.update(
      { createdAt: new Date("2026-01-15T00:00:00Z") },
      { where: { id: r1.id }, silent: true }
    );

    const r2 = await Revision.createFromDocument(
      createContext({ user: userA }),
      document,
      [userB.id]
    );
    await Revision.update(
      { createdAt: new Date("2026-04-15T00:00:00Z") },
      { where: { id: r2.id }, silent: true }
    );

    const r3 = await Revision.createFromDocument(
      createContext({ user: userA }),
      document
    );
    await Revision.update(
      { createdAt: new Date("2026-04-20T00:00:00Z") },
      { where: { id: r3.id }, silent: true }
    );

    const res = await server.post("/api/revisions.list", userA, {
      body: {
        documentId: document.id,
        userId: userB.id,
        dateFrom: "2026-03-01T00:00:00.000Z",
        dateTo: "2026-06-01T00:00:00.000Z",
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(1);
    expect(body.data[0].collaboratorIds).toContain(userB.id);
  });

  // Camino adicional: sin resultados → lista vacía sin error
  it("PU-F1-P8: filtros sin coincidencias retornan lista vacía sin error", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    await Revision.createFromDocument(createContext({ user }), document);

    const otherUser = await buildUser({ teamId: user.teamId });

    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        userId: otherUser.id,
      },
    });
    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.data.length).toEqual(0);
  });
});

// ---------------------------------------------------------------------------
// F2 — Validación RevisionsListSchema
// Tabla de caminos: P1(docId inválido), P2(userId inválido),
//                   P3(dateFrom inválida), P4(dateTo inválida),
//                   P5(rango invertido), P6(todo válido)
// ---------------------------------------------------------------------------
describe("F2 — Validación RevisionsListSchema (HU-01)", () => {
  // P1 — documentId con formato inválido
  it("PU-F2-P1: documentId inválido retorna 400", async () => {
    const user = await buildUser();
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: "no-es-un-uuid" },
    });
    expect(res.status).toEqual(400);
  });

  // P2 — userId con formato inválido
  it("PU-F2-P2: userId malformado retorna 400", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id, userId: "no-es-uuid" },
    });
    expect(res.status).toEqual(400);
  });

  // P3 — dateFrom con formato inválido
  it("PU-F2-P3: dateFrom con formato incorrecto retorna 400", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id, dateFrom: "32/13/2026" },
    });
    expect(res.status).toEqual(400);
  });

  // P4 — dateTo con formato inválido
  it("PU-F2-P4: dateTo con formato incorrecto retorna 400", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/revisions.list", user, {
      body: { documentId: document.id, dateTo: "fecha-invalida" },
    });
    expect(res.status).toEqual(400);
  });

  // P5 — dateFrom posterior a dateTo (rango invertido)
  it("PU-F2-P5: dateFrom posterior a dateTo retorna 400", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        dateFrom: "2026-06-01T00:00:00.000Z",
        dateTo: "2026-01-01T00:00:00.000Z",
      },
    });
    expect(res.status).toEqual(400);
  });

  // P6 — todos los campos válidos
  it("PU-F2-P6: parámetros válidos son aceptados correctamente", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });
    const res = await server.post("/api/revisions.list", user, {
      body: {
        documentId: document.id,
        userId: user.id,
        dateFrom: "2026-01-01T00:00:00.000Z",
        dateTo: "2026-12-31T23:59:59.000Z",
      },
    });
    expect(res.status).toEqual(200);
  });
});

// ---------------------------------------------------------------------------
// F3 — Revision.createFromDocument()
// Tabla de caminos: P1(con collaboratorIds), P2(sin collaboratorIds)
// ---------------------------------------------------------------------------
describe("F3 — Revision.createFromDocument() (HU-01)", () => {
  // P1 — collaboratorIds provisto → se asigna al modelo
  it("PU-F3-P1: con collaboratorIds los asigna a la revisión", async () => {
    const user = await buildUser();
    const collaborator = await buildUser({ teamId: user.teamId });
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document,
      [collaborator.id]
    );

    expect(revision.collaboratorIds).toContain(collaborator.id);
    expect(revision.collaboratorIds).toHaveLength(1);
  });

  // P2 — collaboratorIds no provisto → collaboratorIds queda vacío
  it("PU-F3-P2: sin collaboratorIds la revisión queda con arreglo vacío", async () => {
    const user = await buildUser();
    const document = await buildDocument({
      userId: user.id,
      teamId: user.teamId,
    });

    const revision = await Revision.createFromDocument(
      createContext({ user }),
      document
    );

    expect(revision.collaboratorIds).toEqual([]);
    expect(revision.documentId).toEqual(document.id);
    expect(revision.userId).toEqual(user.id);
  });
});
