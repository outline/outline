/**
 * PATRÓN SCREENPLAY — Tareas (Tasks)
 * Las Tareas representan acciones de alto nivel que un Actor realiza.
 * Están compuestas de Interacciones de bajo nivel.
 */

import type { Actor } from "./actors";
import { CallApi } from "./actors";

export interface Task {
  performAs(actor: Actor): Promise<unknown>;
}

/** Tarea: filtrar el historial de revisiones de un documento */
export class FilterRevisionHistory implements Task {
  constructor(
    private readonly documentId: string,
    private readonly filters: {
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {}
  ) {}

  static ofDocument(documentId: string) {
    return {
      byCollaborator: (userId: string) =>
        new FilterRevisionHistory(documentId, { userId }),

      fromDate: (dateFrom: string) =>
        new FilterRevisionHistory(documentId, { dateFrom }),

      untilDate: (dateTo: string) =>
        new FilterRevisionHistory(documentId, { dateTo }),

      betweenDates: (dateFrom: string, dateTo: string) =>
        new FilterRevisionHistory(documentId, { dateFrom, dateTo }),

      withNoFilters: () =>
        new FilterRevisionHistory(documentId),
    };
  }

  async performAs(actor: Actor): Promise<unknown> {
    const api = actor.abilityTo(CallApi);
    const response = await fetch(`${api.baseUrl}/api/revisions.list`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api.token}`,
      },
      body: JSON.stringify({
        documentId: this.documentId,
        ...this.filters,
      }),
    });
    return response.json();
  }
}

/** Tarea: consultar el historial sin filtros */
export class ViewRevisionHistory implements Task {
  constructor(private readonly documentId: string) {}

  static ofDocument(documentId: string): ViewRevisionHistory {
    return new ViewRevisionHistory(documentId);
  }

  async performAs(actor: Actor): Promise<unknown> {
    return FilterRevisionHistory.ofDocument(this.documentId)
      .withNoFilters()
      .performAs(actor);
  }
}
