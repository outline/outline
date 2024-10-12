import flattenDeep from "lodash/flattenDeep";
import isObject from "lodash/isPlainObject";
import uniq from "lodash/uniq";
import { Model } from "sequelize-typescript";
import { AuthorizationError } from "@server/errors";

type Constructor = new (...args: any) => any;

type Policy = Record<string, boolean | string[]>;

type Condition<T extends Constructor, P extends Constructor> = (
  performer: InstanceType<P>,
  target: InstanceType<T> | null,
  options?: any
) => boolean | string;

type Ability = {
  model: Constructor;
  action: string;
  target: Constructor | Model | string;
  condition?: Condition<Constructor, Constructor>;
};

/**
 * Class that provides a simple way to define and check authorization abilities.
 * This is originally adapted from https://www.npmjs.com/package/cancan
 */
export class CanCan {
  public abilities: Ability[] = [];

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
      !isObject(condition)
    ) {
      throw new TypeError(
        `Expected condition to be object or function, got ${typeof condition}`
      );
    }

    if (condition && isObject(condition)) {
      condition = this.getConditionFn(condition);
    }

    (this.toArray(actions) as string[]).forEach((action) => {
      (this.toArray(targets) as T[]).forEach((target) => {
        this.abilities.push({ model, action, target, condition } as Ability);
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
    options = {}
  ) => {
    const matchingAbilities = this.getMatchingAbilities(
      performer,
      action,
      target
    );

    // Check conditions only for matching abilities
    const conditions = uniq(
      flattenDeep(
        matchingAbilities.map((ability) => {
          if (!ability.condition) {
            return false;
          }
          return ability.condition(performer, target, options || {});
        })
      )
    );

    const matchingConditions = conditions.filter(Boolean);
    const matchingMembershipIds = matchingConditions.filter(
      (m) => typeof m === "string"
    ) as string[];

    return matchingMembershipIds.length > 0
      ? matchingMembershipIds
      : matchingConditions.length > 0;
  };

  /*
   * Given a user and a model – output an object which describes the actions the
   * user may take against the model. This serialized policy is used for testing
   * and sent in API responses to allow clients to adjust which UI is displayed.
   */
  public serialize = (performer: Model, target: Model | null): Policy => {
    const output: Record<string, boolean | string[]> = {};
    abilities.forEach((ability) => {
      if (
        performer instanceof ability.model &&
        target instanceof (ability.target as any)
      ) {
        let response: boolean | string[] = true;

        try {
          response = this.can(performer, ability.action, target);
        } catch (err) {
          response = false;
        }

        output[ability.action] = response;
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
    options = {}
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
    options = {}
  ): asserts target => {
    if (this.cannot(performer, action, target, options)) {
      throw AuthorizationError("Authorization error");
    }
  };

  // Private methods

  private getMatchingAbilities = (
    performer: Model,
    action: string,
    target: Model | null | undefined
  ) =>
    this.abilities.filter(
      (ability) =>
        performer instanceof ability.model &&
        (ability.target === "all" ||
          target === ability.target ||
          target instanceof (ability.target as any)) &&
        (ability.action === "manage" || action === ability.action)
    );

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

export const { allow, can, cannot, abilities, serialize } = cancan;

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
