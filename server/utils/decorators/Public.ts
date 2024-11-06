import "reflect-metadata";
import isUndefined from "lodash/isUndefined";
import type { Environment } from "@server/env";

const key = Symbol("env:public");

/**
 * This decorator on an environment variable makes that variable available client-side
 */
export function Public(target: any, propertyKey: string) {
  const publicVars: string[] = Reflect.getMetadata(key, target);

  if (!publicVars) {
    return Reflect.defineMetadata(key, [propertyKey], target);
  }

  publicVars.push(propertyKey);
}

export class PublicEnvironmentRegister {
  private static publicEnv: Record<string, any> = {};

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

  static getEnv() {
    return this.publicEnv;
  }
}
