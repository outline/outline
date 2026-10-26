import type {
  MarkdownImportInput,
  MarkdownImportScratch,
  MarkdownImportTaskInput,
} from "@shared/schema";
import type { IntegrationService } from "@shared/types";

// Slab exports are imported through the Markdown importer.
declare module "@shared/schema" {
  interface ImportInputMap {
    [IntegrationService.Slab]: MarkdownImportInput;
  }

  interface ImportScratchMap {
    [IntegrationService.Slab]: MarkdownImportScratch;
  }

  interface ImportTaskInputMap {
    [IntegrationService.Slab]: MarkdownImportTaskInput;
  }
}
