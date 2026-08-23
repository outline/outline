import assert from "node:assert/strict";
import test from "node:test";
import { findPetBoundaryViolations } from "./check-pet-boundaries.mjs";

test("reports root app imports from apps/web and duplicated UI packages", () => {
  const files = ["app/scenes/Products.tsx", "app/utils/petsoClient.ts"];
  const contents = new Map([
    [
      "app/scenes/Products.tsx",
      'import { Button } from "apps/web/src/components/ui/button";',
    ],
    [
      "app/utils/petsoClient.ts",
      'import { Button } from "@pet-store-app/ui";',
    ],
  ]);

  assert.deepEqual(findPetBoundaryViolations(files, contents), [
    "app/scenes/Products.tsx:1: apps/web/src/components/ui/button",
    "app/utils/petsoClient.ts:1: @pet-store-app/ui",
  ]);
});

test("allows root app imports from its own Outline foundations", () => {
  const files = ["app/scenes/Products.tsx"];
  const contents = new Map([
    [
      "app/scenes/Products.tsx",
      'import Button from "~/components/Button";\nimport { client } from "~/utils/ApiClient";',
    ],
  ]);

  assert.deepEqual(findPetBoundaryViolations(files, contents), []);
});
