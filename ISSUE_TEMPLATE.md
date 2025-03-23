# Cleanup old Notion importer

## Overview

Outline currently has two Notion importers:

1. **Old File-based Importer** (`server/queues/tasks/ImportNotionTask.ts`): This importer processes Notion exports from zip files that users manually download from Notion and upload to Outline.

2. **New API-based Importer** (`plugins/notion/`): This newer importer uses the Notion API to directly import content from Notion, providing a better user experience.

## Proposed Changes

We should clean up the old file-based Notion importer to:

1. Reduce code duplication
2. Simplify maintenance
3. Provide a more consistent user experience

## Implementation Details

- Remove the old `ImportNotionTask.ts` and related code
- Update the file operation processor to use the plugin-based importer for both API and file-based imports
- Ensure backward compatibility for any existing file operations
- Update UI components to direct users to the API-based importer when possible

## Benefits

- Simplified codebase
- Single source of truth for Notion imports
- Better maintainability
- Consistent user experience

## Related Files

- `server/queues/tasks/ImportNotionTask.ts` (to be removed)
- `server/queues/processors/FileOperationCreatedProcessor.ts` (to be updated)
- `app/scenes/Settings/components/ImportNotionDialog.tsx` (to be updated)
- `plugins/notion/` (to be extended to handle file imports)

## Questions

- Should we maintain backward compatibility for the old file format?
- Are there any edge cases in the old importer that aren't handled by the new one?
- Should we add a migration path for users who have been using the old importer?