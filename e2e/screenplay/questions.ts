/**
 * PATRÓN SCREENPLAY — Preguntas (Questions)
 * Las Preguntas permiten al Actor inspeccionar el estado del sistema
 * y retornan un valor que puede ser afirmado en los tests.
 */

export interface Question<T> {
  answeredBy(response: unknown): T;
}

/** Pregunta: ¿cuántas revisiones hay en la respuesta? */
export class NumberOfRevisions implements Question<number> {
  answeredBy(response: unknown): number {
    const res = response as { data?: unknown[] };
    return res.data?.length ?? 0;
  }
}

/** Pregunta: ¿el resultado contiene revisiones del colaborador indicado? */
export class RevisionsFromCollaborator implements Question<boolean> {
  constructor(private readonly userId: string) {}

  answeredBy(response: unknown): boolean {
    const res = response as { data?: Array<{ userId: string; collaboratorIds: string[] }> };
    return (res.data ?? []).every(
      (r) => r.userId === this.userId || r.collaboratorIds.includes(this.userId)
    );
  }
}

/** Pregunta: ¿todas las revisiones están dentro del rango de fechas? */
export class RevisionsAreWithinDateRange implements Question<boolean> {
  constructor(
    private readonly dateFrom?: Date,
    private readonly dateTo?: Date
  ) {}

  answeredBy(response: unknown): boolean {
    const res = response as { data?: Array<{ createdAt: string }> };
    return (res.data ?? []).every((r) => {
      const date = new Date(r.createdAt);
      if (this.dateFrom && date < this.dateFrom) return false;
      if (this.dateTo && date > this.dateTo) return false;
      return true;
    });
  }
}

/** Pregunta: ¿la respuesta es una lista vacía? */
export class HistoryIsEmpty implements Question<boolean> {
  answeredBy(response: unknown): boolean {
    const res = response as { data?: unknown[] };
    return (res.data?.length ?? 0) === 0;
  }
}
