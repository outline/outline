/**
 * PATRÓN SCREENPLAY — Actores
 * Un Actor representa a un usuario del sistema con sus habilidades (abilities).
 * Puede ejecutar Tareas (Tasks), realizar Interacciones (Interactions)
 * y hacer Preguntas (Questions) sobre el estado del sistema.
 */

export interface Ability {
  name: string;
}

/** Habilidad: llamar a la API REST de Outline */
export class CallApi implements Ability {
  readonly name = "CallApi";
  constructor(
    public readonly baseUrl: string,
    public readonly token: string
  ) {}

  static as(token: string, baseUrl = "http://localhost:3000"): CallApi {
    return new CallApi(baseUrl, token);
  }
}

/** Habilidad: navegar en el navegador (para pruebas E2E con Katalon/Selenium) */
export class BrowseTheWeb implements Ability {
  readonly name = "BrowseTheWeb";
  constructor(public readonly baseUrl: string) {}

  static at(baseUrl = "http://localhost:3000"): BrowseTheWeb {
    return new BrowseTheWeb(baseUrl);
  }
}

/** Actor: entidad que tiene habilidades y ejecuta tareas */
export class Actor {
  private abilities: Map<string, Ability> = new Map();

  constructor(public readonly name: string) {}

  static named(name: string): Actor {
    return new Actor(name);
  }

  whoCan(...abilities: Ability[]): this {
    abilities.forEach((a) => this.abilities.set(a.name, a));
    return this;
  }

  abilityTo<T extends Ability>(abilityClass: new (...args: any[]) => T): T {
    const ability = this.abilities.get(new abilityClass("", "").name);
    if (!ability) {
      throw new Error(`${this.name} no tiene la habilidad ${abilityClass.name}`);
    }
    return ability as T;
  }
}
