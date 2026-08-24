import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const mobxDecoratorNames = new Set([
  "action",
  "computed",
  "observable",
  "override",
]);
const modelBaseNames = new Set([
  "ArchivableModel",
  "Model",
  "NavigableModel",
  "ParanoidModel",
]);

const getSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getSourceFiles(entryPath);
    }

    if (!entry.name.match(/\.tsx?$/) || entry.name.endsWith(".d.ts")) {
      return [];
    }

    return [entryPath];
  });

const getDecoratorName = (decorator: ts.Decorator): string | undefined => {
  let expression: ts.Expression = decorator.expression;

  if (ts.isCallExpression(expression)) {
    expression = expression.expression;
  }

  while (ts.isPropertyAccessExpression(expression)) {
    expression = expression.expression;
  }

  return ts.isIdentifier(expression) ? expression.text : undefined;
};

const hasMobxDecorator = (member: ts.ClassElement): boolean =>
  ts.canHaveDecorators(member) &&
  !!ts
    .getDecorators(member)
    ?.some((decorator) =>
      mobxDecoratorNames.has(getDecoratorName(decorator) ?? "")
    );

const isStatic = (member: ts.ClassElement): boolean =>
  ts.canHaveModifiers(member) &&
  !!ts
    .getModifiers(member)
    ?.some((modifier) => modifier.kind === ts.SyntaxKind.StaticKeyword);

const hasCall = (
  root: ts.Node,
  sourceFile: ts.SourceFile,
  functionName: string,
  target: string
): boolean => {
  let found = false;

  const visit = (node: ts.Node) => {
    if (found) {
      return;
    }

    if (ts.isCallExpression(node)) {
      const { expression } = node;
      const isDirectCall =
        ts.isIdentifier(expression) && expression.text === functionName;
      const hasDirectTarget =
        isDirectCall && node.arguments[0]?.getText(sourceFile) === target;
      const hasMethodTarget =
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text === functionName &&
        expression.expression.getText(sourceFile) === target;

      if (hasDirectTarget || hasMethodTarget) {
        found = true;
        return;
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(root);
  return found;
};

const getBaseClassName = (node: ts.ClassDeclaration): string | undefined => {
  const clause = node.heritageClauses?.find(
    (heritageClause) => heritageClause.token === ts.SyntaxKind.ExtendsKeyword
  );
  const expression = clause?.types[0]?.expression;

  if (!expression) {
    return;
  }

  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  return ts.isPropertyAccessExpression(expression)
    ? expression.name.text
    : undefined;
};

const hasInitializeCall = (
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): boolean => {
  const constructor = node.members.find(ts.isConstructorDeclaration);
  return constructor
    ? hasCall(constructor, sourceFile, "initialize", "this")
    : false;
};

const hasMakeObservableCall = (
  node: ts.ClassDeclaration,
  sourceFile: ts.SourceFile
): boolean => {
  const constructor = node.members.find(ts.isConstructorDeclaration);
  return constructor
    ? hasCall(constructor, sourceFile, "makeObservable", "this")
    : false;
};

const getInitializationErrors = (
  sourceFile: ts.SourceFile,
  relativePath: string
): string[] => {
  const errors: string[] = [];

  const visit = (node: ts.Node) => {
    if (!ts.isClassDeclaration(node) || !node.name) {
      ts.forEachChild(node, visit);
      return;
    }

    const decoratedMembers = node.members.filter(hasMobxDecorator);
    if (!decoratedMembers.length) {
      ts.forEachChild(node, visit);
      return;
    }

    const className = node.name.text;
    const instanceMembers = decoratedMembers.filter(
      (member) => !isStatic(member)
    );
    const staticMembers = decoratedMembers.filter(isStatic);

    if (
      staticMembers.length &&
      !hasCall(sourceFile, sourceFile, "makeObservable", className)
    ) {
      errors.push(
        `${relativePath}:${className} has unapplied static decorators`
      );
    }

    if (!instanceMembers.length || hasMakeObservableCall(node, sourceFile)) {
      ts.forEachChild(node, visit);
      return;
    }

    const baseClassName = getBaseClassName(node);
    if (
      !baseClassName &&
      className === "Model" &&
      hasCall(node, sourceFile, "makeObservable", "this")
    ) {
      ts.forEachChild(node, visit);
      return;
    }

    if (baseClassName && modelBaseNames.has(baseClassName)) {
      const isAbstract = node.modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.AbstractKeyword
      );

      if (!isAbstract && !hasInitializeCall(node, sourceFile)) {
        errors.push(`${relativePath}:${className} does not call initialize`);
      }

      ts.forEachChild(node, visit);
      return;
    }

    if (baseClassName === "Store") {
      const hasDecoratedField = instanceMembers.some(ts.isPropertyDeclaration);
      if (hasDecoratedField) {
        errors.push(
          `${relativePath}:${className} has a decorated field but does not call makeObservable`
        );
      }

      ts.forEachChild(node, visit);
      return;
    }

    errors.push(`${relativePath}:${className} does not call makeObservable`);
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return errors;
};

describe("MobX initialization", () => {
  it("detects a decorated store field without makeObservable", () => {
    const sourceFile = ts.createSourceFile(
      "ExampleStore.ts",
      `class ExampleStore extends Store<Model> {
        @action
        save = () => undefined;
      }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS
    );

    expect(getInitializationErrors(sourceFile, "ExampleStore.ts")).toEqual([
      "ExampleStore.ts:ExampleStore has a decorated field but does not call makeObservable",
    ]);
  });

  it("initializes every decorated class", () => {
    const root = process.cwd();
    const errors = ["app", "shared", "plugins"].flatMap((directory) =>
      getSourceFiles(path.join(root, directory)).flatMap((filePath) => {
        const source = fs.readFileSync(filePath, "utf8");
        const sourceFile = ts.createSourceFile(
          filePath,
          source,
          ts.ScriptTarget.Latest,
          true,
          filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
        );

        return getInitializationErrors(
          sourceFile,
          path.relative(root, filePath)
        );
      })
    );

    expect(errors).toEqual([]);
  });
});
