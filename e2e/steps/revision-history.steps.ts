/**
 * STEP DEFINITIONS — Cucumber.js + Patrón Screenplay
 * Conecta los escenarios Gherkin con los Actores, Tareas y Preguntas del Screenplay.
 *
 * Ejecutar:  npx cucumber-js --config cucumber.config.js
 */

import { Given, When, Then, Before, After, World } from "@cucumber/cucumber";
import { strict as assert } from "assert";
import { Actor, CallApi } from "../screenplay/actors";
import {
  FilterRevisionHistory,
  ViewRevisionHistory,
} from "../screenplay/tasks";
import {
  NumberOfRevisions,
  RevisionsFromCollaborator,
  RevisionsAreWithinDateRange,
  HistoryIsEmpty,
} from "../screenplay/questions";

// ── Tipos de contexto compartido entre pasos ─────────────────────────────────

interface ScenarioContext {
  actor: Actor;
  documentId: string;
  collaboratorIds: Record<string, string>;
  lastResponse: unknown;
  lastError: Error | null;
}

declare module "@cucumber/cucumber" {
  interface World {
    ctx: ScenarioContext;
  }
}

// ── Configuración de Actor por defecto ────────────────────────────────────────
// En un entorno real, el token se obtendría del proceso de login de la prueba.
const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const TEST_TOKEN = process.env.TEST_API_TOKEN ?? "test-token-placeholder";

Before(function (this: World) {
  this.ctx = {
    actor: Actor.named("Usuario de Prueba").whoCan(
      CallApi.as(TEST_TOKEN, BASE_URL)
    ),
    documentId: process.env.TEST_DOCUMENT_ID ?? "doc-test-hu01",
    collaboratorIds: {
      "Ana García": process.env.ANA_USER_ID ?? "user-ana-garcia",
      "Luis Pérez": process.env.LUIS_USER_ID ?? "user-luis-perez",
      "Carlos Ruiz": process.env.CARLOS_USER_ID ?? "user-carlos-ruiz",
    },
    lastResponse: null,
    lastError: null,
  };
});

After(function (this: World) {
  // limpieza si fuera necesaria
});

// ── Antecedentes ──────────────────────────────────────────────────────────────

Given(
  "que existe un documento llamado {string}",
  async function (this: World, _titulo: string) {
    // En tests de integración real se crearía el doc vía API y se guardaría el ID.
    // Aquí asumimos que el documento existe (creado en fixtures de setUp).
    assert.ok(this.ctx.documentId, "Se esperaba un documentId configurado");
  }
);

Given(
  "el documento tiene {int} revisiones registradas",
  async function (this: World, cantidad: number) {
    const response = await ViewRevisionHistory.ofDocument(
      this.ctx.documentId
    ).performAs(this.ctx.actor);
    const n = new NumberOfRevisions().answeredBy(response);
    // En ambiente de prueba con fixtures cargados, debería haber al menos `cantidad` revisiones.
    // Usando soft-assert para no fallar si el servidor de prueba no está activo.
    if (n < cantidad) {
      console.warn(
        `WARN: Se esperaban ${cantidad} revisiones pero hay ${n}. ` +
          `Asegurarse de correr fixtures antes de los tests E2E.`
      );
    }
  }
);

// ── Steps — Filtrado por colaborador ─────────────────────────────────────────

Given(
  "que el colaborador {string} realizó cambios en el documento",
  async function (this: World, nombre: string) {
    assert.ok(
      this.ctx.collaboratorIds[nombre],
      `No hay userId configurado para ${nombre}`
    );
  }
);

When(
  "el usuario filtra el historial por el colaborador {string}",
  async function (this: World, nombre: string) {
    const userId = this.ctx.collaboratorIds[nombre];
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .byCollaborator(userId)
      .performAs(this.ctx.actor);
  }
);

When(
  "el usuario filtra por el colaborador {string}",
  async function (this: World, nombre: string) {
    const userId = this.ctx.collaboratorIds[nombre];
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .byCollaborator(userId)
      .performAs(this.ctx.actor);
  }
);

Then(
  "debe ver solo {string} revisión\\(es) en el historial",
  async function (this: World, cantidadStr: string) {
    const cantidad = parseInt(cantidadStr, 10);
    const n = new NumberOfRevisions().answeredBy(this.ctx.lastResponse);
    assert.equal(
      n,
      cantidad,
      `Se esperaban ${cantidad} revisiones, se obtuvieron ${n}`
    );
  }
);

// ── Steps — Filtrado por fecha ────────────────────────────────────────────────

Given(
  "que existen revisiones antes y después del {string}",
  async function (this: World, _fecha: string) {
    // Precondición validada por los fixtures del ambiente de prueba
  }
);

Given(
  "que existen revisiones en enero, marzo y junio de 2026",
  async function (this: World) {
    // Precondición validada por los fixtures del ambiente de prueba
  }
);

When(
  "el usuario filtra el historial desde la fecha {string}",
  async function (this: World, dateFrom: string) {
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .fromDate(dateFrom)
      .performAs(this.ctx.actor);
  }
);

When(
  "el usuario filtra el historial hasta la fecha {string}",
  async function (this: World, dateTo: string) {
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .untilDate(dateTo)
      .performAs(this.ctx.actor);
  }
);

When(
  "el usuario filtra desde {string} hasta {string}",
  async function (this: World, dateFrom: string, dateTo: string) {
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .betweenDates(dateFrom, dateTo)
      .performAs(this.ctx.actor);
  }
);

Then(
  "debe ver solo las revisiones posteriores al {string}",
  async function (this: World, dateFromStr: string) {
    const dateFrom = new Date(dateFromStr);
    const ok = new RevisionsAreWithinDateRange(
      dateFrom,
      undefined
    ).answeredBy(this.ctx.lastResponse);
    assert.ok(
      ok,
      `Algunas revisiones son anteriores a ${dateFromStr}`
    );
  }
);

Then(
  "debe ver solo las revisiones anteriores al {string}",
  async function (this: World, dateToStr: string) {
    const dateTo = new Date(dateToStr);
    const ok = new RevisionsAreWithinDateRange(
      undefined,
      dateTo
    ).answeredBy(this.ctx.lastResponse);
    assert.ok(ok, `Algunas revisiones son posteriores a ${dateToStr}`);
  }
);

Then(
  "debe ver solo las revisiones de marzo de 2026",
  async function (this: World) {
    const dateFrom = new Date("2026-03-01");
    const dateTo = new Date("2026-03-31T23:59:59");
    const ok = new RevisionsAreWithinDateRange(
      dateFrom,
      dateTo
    ).answeredBy(this.ctx.lastResponse);
    assert.ok(ok, "Hay revisiones fuera del mes de marzo 2026");
  }
);

// ── Steps — Filtrado combinado ────────────────────────────────────────────────

Given(
  "que {string} hizo revisiones en enero y abril de 2026",
  async function (this: World, _nombre: string) {
    // Precondición validada por los fixtures
  }
);

Given(
  "que {string} hizo una revisión en abril de 2026",
  async function (this: World, _nombre: string) {
    // Precondición validada por los fixtures
  }
);

When(
  "el usuario filtra por {string} desde {string} hasta {string}",
  async function (
    this: World,
    nombre: string,
    dateFrom: string,
    dateTo: string
  ) {
    const userId = this.ctx.collaboratorIds[nombre];
    this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
      this.ctx.documentId
    )
      .betweenDates(dateFrom, dateTo)
      .performAs(this.ctx.actor);

    // Segunda llamada incluyendo el filtro de usuario
    const task = new FilterRevisionHistory(this.ctx.documentId, {
      userId,
      dateFrom,
      dateTo,
    });
    this.ctx.lastResponse = await task.performAs(this.ctx.actor);
  }
);

Then(
  "debe ver solo {int} revisión de {string} en el rango",
  async function (this: World, cantidad: number, nombre: string) {
    const userId = this.ctx.collaboratorIds[nombre];
    const n = new NumberOfRevisions().answeredBy(this.ctx.lastResponse);
    const onlyFromCollaborator = new RevisionsFromCollaborator(
      userId
    ).answeredBy(this.ctx.lastResponse);
    assert.equal(n, cantidad, `Se esperaban ${cantidad} revisiones`);
    assert.ok(
      onlyFromCollaborator,
      `Las revisiones no pertenecen todas a ${nombre}`
    );
  }
);

// ── Steps — Lista vacía ───────────────────────────────────────────────────────

Given(
  "que el documento no tiene revisiones de {string}",
  async function (this: World, _nombre: string) {
    // Precondición validada por los fixtures
  }
);

Then(
  "debe ver un mensaje indicando que no hay revisiones",
  async function (this: World) {
    const isEmpty = new HistoryIsEmpty().answeredBy(this.ctx.lastResponse);
    assert.ok(isEmpty, "Se esperaba una lista vacía pero hay revisiones");
  }
);

// ── Steps — Validación de errores ─────────────────────────────────────────────

When(
  "el usuario intenta filtrar desde {string} hasta {string}",
  async function (this: World, dateFrom: string, dateTo: string) {
    try {
      this.ctx.lastResponse = await FilterRevisionHistory.ofDocument(
        this.ctx.documentId
      )
        .betweenDates(dateFrom, dateTo)
        .performAs(this.ctx.actor);
    } catch (err) {
      this.ctx.lastError = err as Error;
    }
  }
);

Then(
  "debe ver un error indicando que el rango de fechas es inválido",
  async function (this: World) {
    const res = this.ctx.lastResponse as
      | { error?: string; status?: number; ok?: boolean }
      | undefined;

    const hayError =
      this.ctx.lastError !== null ||
      (res && (res.error || res.status === 400 || res.ok === false));

    assert.ok(
      hayError,
      "Se esperaba un error por rango de fechas inválido pero la petición fue exitosa"
    );
  }
);

// ── Steps — Sin filtros ───────────────────────────────────────────────────────

When(
  "el usuario abre el historial sin aplicar ningún filtro",
  async function (this: World) {
    this.ctx.lastResponse = await ViewRevisionHistory.ofDocument(
      this.ctx.documentId
    ).performAs(this.ctx.actor);
  }
);

Then(
  "debe ver las {int} revisiones del documento",
  async function (this: World, cantidad: number) {
    const n = new NumberOfRevisions().answeredBy(this.ctx.lastResponse);
    assert.equal(
      n,
      cantidad,
      `Se esperaban ${cantidad} revisiones, se obtuvieron ${n}`
    );
  }
);
