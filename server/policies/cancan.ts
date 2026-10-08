import { AsyncLocalStorage } from "node:async_hooks";
import { isPlainObject } from "es-toolkit/compat";
import type { Model } from "sequelize-typescript";
import { AuthorizationError } from "@server/errors";

// oxlint-disable-next-line @typescript-eslint/no-explicit-any -- variance requires `any` to accept arbitrary constructors
type Constructor = new (...args: any[]) => unknown;

type Policy = Record<string, boolean | string[]>;

/** Default so option-free calls share one object and stay cacheable. */
const noOptions: Readonly<Record<string, never>> = Object.freeze({});

/**
 * The result of an ability condition. Strings are the IDs of the memberships
 * that granted access, and may be nested in arrays by the `and` / `or` helpers.
 */
type ConditionResult = boolean | string | ConditionResult[];

type Condition<T extends Constructor, P extends Constructor> = (
  performer: InstanceType<P>,
  target: InstanceType<T> | null,
  options?: unknown
) => ConditionResult;

type Ability = {
  model: Constructor;
  action: string;
  target: Constructor | Model | string;
  condition?: Condition<Constructor, Constructor>;
};

/** A model class, which may be a throwaway subclass produced by `Model.scope()`. */
interface ModelClass extends Function {
  scoped?: boolean;
}

/** A single evaluation, within which memoized answers may be shared. */
interface Scope {
  cache: Map<Model, Map<Model | null, Map<string, boolean | string[]>>> | null;
}

/**
 * Class that provides a simple way to define and check authorization abilities.
 * This is originally adapted from https://www.npmjs.com/package/cancan
 */
export class CanCan {
  /**
   * Define an authorized ability for a model, action, and target.
   *
   * @param model The model that the ability is for.
   * @param actions The action or actions that are allowed.
   * @param targets The target or targets that the ability applies to.
   * @param condition The condition that must be met for the ability to apply
   */
  public allow = <T extends Constructor, P extends Constructor>(
    model: P,
    actions: string | ReadonlyArray<string>,
    targets: T | ReadonlyArray<T> | string | ReadonlyArray<string>,
    condition?: Condition<T, P> | object
  ) => {
    if (
      typeof condition !== "undefined" &&
      typeof condition !== "function" &&
      !isPlainObject(condition)
    ) {
      throw new TypeError(
        `Expected condition to be object or function, got ${typeof condition}`
      );
    }

    if (condition && isPlainObject(condition)) {
      condition = this.getConditionFn(condition);
    }

    // Registering an ability invalidates the derived action index.
    this.actionsByClass.clear();

    (this.toArray(actions) as string[]).forEach((action) => {
      (this.toArray(targets) as T[]).forEach((target) => {
        const ability = { model, action, target, condition } as Ability;

        // Add to index
        if (!this.abilities.has(model)) {
          this.abilities.set(model, new Map());
        }
        const actionMap = this.abilities.get(model)!;
        if (!actionMap.has(action)) {
          actionMap.set(action, []);
        }
        actionMap.get(action)!.push(ability);
      });
    });
  };

  /**
   * Check if a performer can perform an action on a target.
   *
   * @param performer The performer that is trying to perform the action.
   * @param action The action that the performer is trying to perform.
   * @param target The target that the action is upon.
   * @param options Additional options to pass to the condition function.
   * @returns Whether the performer can perform the action on the target.
   */
  public can = (
    performer: Model,
    action: string,
    target: Model | null | undefined,
    options: object = noOptions
  ): boolean | string[] => {
    // Policy conditions are pure with respect to already-loaded model state, so
    // within a single evaluation the same question always has the same answer.
    // Memoize on object identity for the duration of the outermost call —
    // policies recurse heavily into one another.
    const scope = this.scope.getStore();

    // An outermost check has nothing to reuse yet, so it computes directly and
    // opens a scope only for the nested checks its conditions go on to make.
    if (!scope) {
      return this.scope.run({ cache: null }, () =>
        this.computeCan(performer, action, target, options)
      );
    }

    const byAction = this.cacheFor(scope, performer, target, options);
    const cached = byAction?.get(action);
    if (cached !== undefined) {
      return cached;
    }
    const value = this.computeCan(performer, action, target, options);
    byAction?.set(action, value);
    return value;
  };

  /*
   * Given a user and a model – output an object which describes the actions the
   * user may take against the model. This serialized policy is used for testing
   * and sent in API responses to allow clients to adjust which UI is displayed.
   */
  public serialize = (performer: Model, target: Model | null): Policy => {
    // Opening the scope here lets every action below reuse the others' answers.
    if (!this.scope.getStore()) {
      return this.scope.run({ cache: null }, () =>
        this.serialize(performer, target)
      );
    }

    const output: Record<string, boolean | string[]> = {};

    // The set of actions worth checking depends only on the classes involved,
    // so scanning the whole ability index is done once per class pair.
    const performerClass = this.unscopedClass(performer);
    const targetClass = this.unscopedClass(target);
    let byTargetClass = this.actionsByClass.get(performerClass);
    if (!byTargetClass) {
      byTargetClass = new Map();
      this.actionsByClass.set(performerClass, byTargetClass);
    }
    let actionsToCheck = byTargetClass.get(targetClass);
    if (!actionsToCheck) {
      actionsToCheck = new Set<string>();
      for (const [model, actionMap] of this.abilities.entries()) {
        if (performer instanceof model) {
          for (const [action, abilities] of actionMap.entries()) {
            for (const ability of abilities) {
              if (target instanceof (ability.target as Constructor)) {
                actionsToCheck.add(action);
                break;
              }
            }
          }
        }
      }
      byTargetClass.set(targetClass, actionsToCheck);
    }

    actionsToCheck.forEach((action) => {
      try {
        output[action] = this.can(performer, action, target);
      } catch (_err) {
        output[action] = false;
      }
    });

    return output;
  };

  /**
   * Check if a performer cannot perform an action on a target, which is the opposite of `can`.
   *
   * @param performer The performer that is trying to perform the action.
   * @param action The action that the performer is trying to perform.
   * @param target The target that the action is upon.
   * @param options Additional options to pass to the condition function.
   * @returns Whether the performer cannot perform the action on the target.
   */
  public cannot = (
    performer: Model,
    action: string,
    target: Model | null | undefined,
    options: object = noOptions
  ) => !this.can(performer, action, target, options);

  /**
   * Guard if a performer can perform an action on a target, throwing an error if they cannot.
   *
   * @param performer The performer that is trying to perform the action.
   * @param action The action that the performer is trying to perform.
   * @param target The target that the action is upon.
   * @param options Additional options to pass to the condition function.
   * @throws AuthorizationError If the performer cannot perform the action on the target.
   */
  public authorize = (
    performer: Model,
    action: string,
    target: Model | null | undefined,
    options: object = noOptions
  ): asserts target => {
    if (this.cannot(performer, action, target, options)) {
      throw AuthorizationError("Authorization error");
    }
  };

  // Private methods

  // Binding the memoization scope to the async context rather than to `this`
  // means it cannot outlive the evaluation that opened it, nor be observed by
  // a concurrent one, even if a condition were ever to await.
  private scope = new AsyncLocalStorage<Scope>();

  private actionsByClass: Map<
    Function | null,
    Map<Function | null, Set<string>>
  > = new Map();

  /**
   * Resolves the class a model should be cached under. `Model.scope()` mints a
   * fresh subclass on every call, so the scoped ones are walked past to reach
   * the stable class the abilities were actually registered against.
   */
  private unscopedClass = (model: Model | null): ModelClass | null => {
    let klass: ModelClass | null = model?.constructor ?? null;
    while (klass?.scoped) {
      klass = Object.getPrototypeOf(klass);
    }
    return klass;
  };

  /**
   * Resolves the per-(performer, target) action cache, or null when the call
   * carries options and so cannot be shared.
   */
  private cacheFor = (
    scope: Scope,
    performer: Model,
    target: Model | null | undefined,
    options: object
  ) => {
    if (options !== noOptions) {
      return null;
    }
    scope.cache ??= new Map();
    let byTarget = scope.cache.get(performer);
    if (!byTarget) {
      byTarget = new Map();
      scope.cache.set(performer, byTarget);
    }
    const key = target ?? null;
    let byAction = byTarget.get(key);
    if (!byAction) {
      byAction = new Map();
      byTarget.set(key, byAction);
    }
    return byAction;
  };

  private computeCan = (
    performer: Model,
    action: string,
    target: Model | null | undefined,
    options: object
  ) => {
    const matchingAbilities = this.getMatchingAbilities(
      performer,
      action,
      target
    );

    // Check conditions only for matching abilities
    const membershipIds: string[] = [];
    let hasNonMembershipMatch = false;

    const collect = (result: ConditionResult) => {
      if (!result) {
        return;
      }
      if (typeof result === "string") {
        if (!membershipIds.includes(result)) {
          membershipIds.push(result);
        }
        return;
      }
      // Conditions are composed with the `and` / `or` helpers, which return the
      // operands themselves rather than a boolean, so the membership IDs that
      // granted access can be nested at any depth.
      if (Array.isArray(result)) {
        for (const value of result) {
          collect(value);
        }
        return;
      }
      hasNonMembershipMatch = true;
    };

    for (const ability of matchingAbilities) {
      if (!ability.condition) {
        continue;
      }

      collect(ability.condition(performer, target, options));
    }

    return membershipIds.length > 0 ? membershipIds : hasNonMembershipMatch;
  };

  private getMatchingAbilities = (
    performer: Model,
    action: string,
    target: Model | null | undefined
  ) => {
    const matchingAbilities: Ability[] = [];

    // Use index to find abilities by model and action
    for (const [model, actionMap] of this.abilities.entries()) {
      if (!(performer instanceof model)) {
        continue;
      }

      // Check for specific action
      const specificAbilities = actionMap.get(action);
      if (specificAbilities) {
        for (const ability of specificAbilities) {
          if (
            ability.target === "all" ||
            target === ability.target ||
            target instanceof (ability.target as Constructor)
          ) {
            matchingAbilities.push(ability);
          }
        }
      }

      // Check for "manage" action (applies to all actions)
      const manageAbilities = actionMap.get("manage");
      if (manageAbilities) {
        for (const ability of manageAbilities) {
          if (
            ability.target === "all" ||
            target === ability.target ||
            target instanceof (ability.target as Constructor)
          ) {
            matchingAbilities.push(ability);
          }
        }
      }
    }

    return matchingAbilities;
  };

  // Index for fast lookups: Map<model, Map<action, Ability[]>>
  private abilities: Map<Constructor, Map<string, Ability[]>> = new Map();

  private get = <T extends object>(obj: T, key: keyof T) =>
    "get" in obj && typeof obj.get === "function" ? obj.get(key) : obj[key];

  private isPartiallyEqual = <T extends object>(target: T, obj: T) =>
    Object.keys(obj).every(
      // @ts-expect-error TODO
      (key: keyof T) => this.get(target, key) === obj[key]
    );

  private getConditionFn =
    (condition: object) => (performer: Model, target: Model) =>
      this.isPartiallyEqual(target, condition);

  private toArray = (value: unknown): unknown[] => {
    if (value === null || value === undefined) {
      return [];
    }
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === "string") {
      return [value];
    }
    // @ts-expect-error - TS doesn't know that value is iterable
    if (typeof value[Symbol.iterator] === "function") {
      // @ts-expect-error - TS doesn't know that value is iterable
      return [...value];
    }

    return [value];
  };
}

const cancan = new CanCan();

export const { allow, can, cannot, serialize } = cancan;

// This is exported separately as a workaround for the following issue:
// https://github.com/microsoft/TypeScript/issues/36931
export const authorize: typeof cancan.authorize = cancan.authorize;

// The MIT License (MIT)

// Copyright (c) Vadim Demedes <vdemedes@gmail.com> (github.com/vadimdemedes)

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
