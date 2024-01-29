// MIT License

// Copyright (c) 2020 GameChanger Media

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { SpanOptions } from "dd-trace";
import DDTags from "dd-trace/ext/tags";
import env from "@server/env";
import tracer from "./tracer";
import * as Tracing from "./tracer";

type DDTag = (typeof DDTags)[keyof typeof DDTags];

type Tags = {
  [tag in DDTag]?: any;
} & {
  [key: string]: any;
};

interface Constructor {
  new (...args: any[]): any;
}

interface TraceConfig {
  className?: string;
  methodName?: string;
  serviceName?: string;
  spanName?: string;
  resourceName?: string;
  isRoot?: boolean;
  /** Cause the span to show up in trace search and analytics */
  makeSearchable?: boolean;
  tags?: Tags;
}

/**
 * This decorator will cause an individual function to be traced by the APM.
 *
 * @param config Optional configuration for the span that will be created for this trace.
 */
export const traceFunction =
  (config: TraceConfig) =>
  <
    F extends (...args: any[]) => any,
    P extends Parameters<F>,
    R extends ReturnType<F>
  >(
    target: F
  ): F =>
    env.ENVIRONMENT === "test"
      ? target
      : (function wrapperFn(this: any, ...args: P): R {
          const { className, methodName = target.name, tags } = config;
          const childOf = config.isRoot
            ? undefined
            : tracer.scope().active() || undefined;

          const spanName = config.spanName || className || "DEFAULT_SPAN_NAME";

          const resourceName = config.resourceName
            ? config.resourceName
            : methodName;
          const spanOptions: SpanOptions = {
            childOf,
            tags: {
              [DDTags.RESOURCE_NAME]: resourceName,
              ...tags,
            },
          };

          const span = tracer.startSpan(spanName, spanOptions);

          if (!span) {
            return target.call(this, ...args);
          }

          if (config.serviceName) {
            span.setTag(
              DDTags.SERVICE_NAME,
              `${env.DD_SERVICE}-${config.serviceName}`
            );
          }

          if (config.makeSearchable) {
            span.setTag(DDTags.ANALYTICS, true);
          }

          // The callback fn needs to be wrapped in an arrow fn as the activate fn clobbers `this`
          return tracer.scope().activate(span, () => {
            const output = target.call(this, ...args);

            if (output && typeof output.then === "function") {
              output
                .catch((error: Error | undefined) => {
                  if (error instanceof Error) {
                    Tracing.setError(error, span);
                  }
                })
                .finally(() => {
                  span.finish();
                });
            } else {
              span.finish();
            }

            return output;
          });
        } as F);

const traceMethod = (config?: TraceConfig) =>
  function <R, A extends any[], F extends (...args: A) => R>(
    target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): TypedPropertyDescriptor<F> {
    const wrappedFn = descriptor.value;

    if (wrappedFn) {
      const className = target.name || target.constructor.name; // target.name is needed if the target is the constructor itself
      const methodName = wrappedFn.name;
      descriptor.value = traceFunction({ ...config, className, methodName })(
        wrappedFn
      );
    }

    return descriptor;
  };

const traceClass = (config?: TraceConfig) =>
  function <T extends Constructor>(constructor: T): void {
    const protoKeys = Reflect.ownKeys(constructor.prototype);
    protoKeys.forEach((key) => {
      if (key === "constructor") {
        return;
      }

      const descriptor = Object.getOwnPropertyDescriptor(
        constructor.prototype,
        key
      );

      // eslint-disable-next-line no-undef
      if (typeof key === "string" && typeof descriptor?.value === "function") {
        Object.defineProperty(
          constructor.prototype,
          key,
          traceMethod(config)(constructor, key, descriptor)
        );
      }
    });

    const staticKeys = Reflect.ownKeys(constructor);
    staticKeys.forEach((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(constructor, key);

      // eslint-disable-next-line no-undef
      if (typeof key === "string" && typeof descriptor?.value === "function") {
        Object.defineProperty(
          constructor,
          key,
          traceMethod(config)(constructor, key, descriptor)
        );
      }
    });
  };

/**
 * This decorator will cause the methods of a class, or an individual method, to be traced by the APM.
 *
 * @param config Optional configuration for the span that will be created for this trace.
 */
// Going to rely on inferrence do its thing for this function
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function trace(config?: TraceConfig) {
  function traceDecorator(target: Constructor): void;
  function traceDecorator<T>(
    target: Record<string, any>,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<T>
  ): void;
  function traceDecorator(
    a: Constructor | Record<string, any>,
    b?: any,
    c?: any
  ): void {
    if (typeof a === "function") {
      // Need to cast as there is no safe runtime way to check if a function is a constructor
      traceClass(config)(a as Constructor);
    } else {
      traceMethod(config)(a, b, c);
    }
  }

  return traceDecorator;
}
