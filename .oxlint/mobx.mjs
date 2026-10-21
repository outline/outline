/**
 * Local oxlint plugin with MobX-specific rules.
 */

/** Returns true if the decorator is `@observable` or `@observable.<modifier>`. */
function isObservableDecorator(decorator) {
  const expression = decorator.expression;

  if (expression.type === "Identifier") {
    return expression.name === "observable";
  }

  if (expression.type === "MemberExpression") {
    return (
      expression.object.type === "Identifier" &&
      expression.object.name === "observable"
    );
  }

  return false;
}

/** Returns true if the expression is a `makeObservable(this, …)` call. */
function isMakeObservableCall(expression) {
  return (
    expression.type === "CallExpression" &&
    expression.callee.type === "Identifier" &&
    expression.callee.name === "makeObservable" &&
    expression.arguments.length > 0 &&
    expression.arguments[0].type === "ThisExpression"
  );
}

/** Returns the property name if the expression is `this.<name> = …`, else null. */
function assignedThisProperty(expression) {
  if (
    expression.type !== "AssignmentExpression" ||
    expression.left.type !== "MemberExpression" ||
    expression.left.object.type !== "ThisExpression" ||
    expression.left.property.type !== "Identifier"
  ) {
    return null;
  }
  return expression.left.property.name;
}

/**
 * Walks the constructor body and returns the set of `this.<name>` properties
 * assigned before `makeObservable(this)` is called, or null if the constructor
 * never calls it.
 */
function propertiesAssignedBeforeMakeObservable(classBody) {
  const ctor = classBody.body.find(
    (member) =>
      member.type === "MethodDefinition" && member.kind === "constructor"
  );
  if (!ctor?.value?.body) {
    return null;
  }

  const assigned = new Set();
  for (const statement of ctor.value.body.body) {
    if (statement.type !== "ExpressionStatement") {
      continue;
    }
    if (isMakeObservableCall(statement.expression)) {
      return assigned;
    }
    const name = assignedThisProperty(statement.expression);
    if (name) {
      assigned.add(name);
    }
  }

  return null;
}

const plugin = {
  meta: {
    name: "mobx",
  },
  rules: {
    "observable-needs-initializer": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Require an initializer on @observable class fields in classes that call makeObservable(this). A field that does not exist as an own property when makeObservable runs is silently skipped by MobX.",
        },
        messages: {
          missing:
            "@observable field '{{name}}' has no initializer, so makeObservable() will silently skip it. Add `= undefined` or another initial value.",
        },
      },
      create(context) {
        return {
          ClassBody(node) {
            const assigned = propertiesAssignedBeforeMakeObservable(node);
            if (assigned === null) {
              return;
            }

            for (const member of node.body) {
              if (
                member.type !== "PropertyDefinition" ||
                member.value !== null ||
                member.static ||
                member.declare ||
                member.key.type !== "Identifier" ||
                assigned.has(member.key.name)
              ) {
                continue;
              }

              const decorators = member.decorators ?? [];
              if (!decorators.some(isObservableDecorator)) {
                continue;
              }

              context.report({
                node: member,
                messageId: "missing",
                data: { name: member.key.name },
              });
            }
          },
        };
      },
    },
  },
};

export default plugin;
