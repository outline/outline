import { Environment } from "@server/env";
import "reflect-metadata";

const key = Symbol("env:public");

/**
 * This decorator on an environment variable makes that variable available client-side
 */
export default function Public(target: any, propertyKey: string) {
  const publicVars: string[] = Reflect.getMetadata(key, target);

  if (!publicVars) {
    return Reflect.defineMetadata(key, [propertyKey], target);
  }

  publicVars.push(propertyKey);
}

export function getPublicEnv(env: Environment) {
  const vars: string[] = Reflect.getMetadata(key, env);
  return vars.reduce((acc, curr) => {
    acc[curr] = env[curr];
    return acc;
  }, {});
}
