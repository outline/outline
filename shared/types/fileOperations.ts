export enum ExportContentType {
  Markdown = "text/markdown",
  Html = "text/html",
  TextBundle = "application/x-textbundle",
  Pdf = "application/pdf",
}

export enum FileOperationFormat {
  JSON = "json",
  MarkdownZip = "outline-markdown",
  OKFZip = "okf",
  HTMLZip = "html",
  TextBundleZip = "textbundle",
  PDF = "pdf",
  Notion = "notion",
}

export enum FileOperationType {
  Import = "import",
  Export = "export",
}

export enum FileOperationState {
  Creating = "creating",
  Uploading = "uploading",
  Complete = "complete",
  Error = "error",
  Expired = "expired",
}

export enum ImportState {
  Created = "created",
  InProgress = "in_progress",
  Processed = "processed",
  Completed = "completed",
  Errored = "errored",
  Canceled = "canceled",
}

export enum ImportTaskState {
  Created = "created",
  InProgress = "in_progress",
  Completed = "completed",
  Errored = "errored",
  Canceled = "canceled",
}

/**
 * Classifies the work an `ImportTask` row represents. Set when the task is
 * created and used by `APIImportTask` to dispatch to the right handler.
 *
 * - `Bootstrap` runs once per import on a worker that owns the source
 *   artifact (e.g. extracts a zip, discovers structure, schedules child
 *   tasks). Subclasses without a bootstrap step never produce these.
 * - `Page` is the per-document work that the bootstrap (or `ImportsProcessor`
 *   for sources without a bootstrap, like Notion) fans out into.
 */
export enum ImportTaskPhase {
  Bootstrap = "bootstrap",
  Page = "page",
}
