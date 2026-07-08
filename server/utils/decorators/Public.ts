import "reflect-metadata";
import { isUndefined } from "es-toolkit/compat";
import type { Environment } from "@server/env";

const key = Symbol("env:public");

/**
 * This decorator on an environment variable makes that variable available client-side
 */
export function Public(target: object, propertyKey: string) {
  const publicVars: string[] = Reflect.getMetadata(key, target);

  if (!publicVars) {
    return Reflect.defineMetadata(key, [propertyKey], target);
  }

  publicVars.push(propertyKey);
}

/**
 * Registry of environment variables marked with the `Public` decorator that
 * should be made available client-side.
 */
export class PublicEnvironmentRegister {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- consumed at runtime as a flat map of typed Environment values; tightening to unknown breaks call sites.
  private static publicEnv: Record<string, any> = {};

  /**
   * Registers an environment's public variables with the registry.
   *
   * @param env the environment to register.
   */
  static registerEnv(env: Environment) {
    process.nextTick(() => {
      const vars: string[] = Reflect.getMetadata(key, env) ?? [];
      vars.forEach((k: keyof Environment) => {
        if (isUndefined(this.publicEnv[k])) {
          this.publicEnv[k] = env[k];
        }
      });
    });
  }

  /**
   * Returns the map of public environment variables.
   *
   * @returns the public environment variables.
   */
  static getEnv() {
    return this.publicEnv;
  }
}
