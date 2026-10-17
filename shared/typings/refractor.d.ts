// Languages bundled with refractor that are missing from @types/refractor.
declare module "refractor/lang/kusto" {
  import type { RefractorSyntax } from "refractor/core";
  const lang: RefractorSyntax;
  export default lang;
}

declare module "refractor/lang/mermaid" {
  import type { RefractorSyntax } from "refractor/core";
  const lang: RefractorSyntax;
  export default lang;
}

declare module "refractor/lang/promql" {
  import type { RefractorSyntax } from "refractor/core";
  const lang: RefractorSyntax;
  export default lang;
}
