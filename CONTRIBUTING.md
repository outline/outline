# Document Breadcrumbs in Email Notifications

## Overview

This contribution adds document breadcrumb information to email notifications in Outline, providing users with better context about where a document is located in the knowledge base hierarchy. This enhancement helps users understand the document's location, especially when multiple documents share the same name in different collections.

## Issue Addressed

- **Issue #8643**: Include document breadcrumb in email notification
- **Problem**: Users receiving email notifications about document updates or publications lacked context about where the document was located in the knowledge base hierarchy.
- **Solution**: Added breadcrumb information to email notifications showing the full path from collection to document.

## Implementation Details

### 1. DocumentHelper Enhancement

Added a new `getBreadcrumbString` method to `DocumentHelper.tsx` that:
- Takes a document as input
- Retrieves its collection
- Recursively builds the breadcrumb path for nested documents
- Returns a formatted string with the document hierarchy

```typescript
static async getBreadcrumbString(document: Document): Promise<string> {
  const collection = await Collection.findByPk(document.collectionId);
  if (!collection) return "";
  
  let breadcrumb = collection.name;
  
  if (document.parentDocumentId) {
    const parentDocument = await Document.findByPk(document.parentDocumentId);
    if (parentDocument) {
      const parentBreadcrumb = await this.getBreadcrumbString(parentDocument);
      breadcrumb = `${parentBreadcrumb} > ${document.title}`;
    }
  } else {
    breadcrumb = `${collection.name} > ${document.title}`;
  }
  
  return breadcrumb;
}
```

### 2. Email Template Modification

Updated `DocumentPublishedOrUpdatedEmail.tsx` to:
- Include breadcrumb information in the email props
- Display the breadcrumb in a visually distinct way
- Update the email layout to accommodate the new information

The breadcrumb appears in the email as:
```
Collection Name > Parent Document > Child Document
```

### 3. Testing

Added comprehensive tests in `DocumentHelper.test.ts` that verify:
- Basic breadcrumb generation for documents without parents
- Nested document path generation
- Graceful handling of missing collections

## Key Features

1. **Hierarchical Context**: Shows the full path from collection to document
2. **Visual Clarity**: Breadcrumbs are styled to be distinct but not overwhelming
3. **Error Handling**: Gracefully handles missing collections and parent documents
4. **Performance**: Breadcrumb generation is done asynchronously and only when needed

## Testing Instructions

To test the implementation:

1. Create a document in a collection
2. Create a nested document under it
3. Make changes to trigger an email notification
4. Verify that the email includes the correct breadcrumb path

## Impact

This enhancement improves the user experience by:
- Providing better context about document location
- Helping users distinguish between documents with similar names
- Making it easier to navigate to the correct document
- Reducing confusion when receiving notifications about document updates

## Future Improvements

Potential future enhancements could include:
1. Caching breadcrumb information to improve performance
2. Adding clickable links in the breadcrumb path
3. Supporting custom breadcrumb separators
4. Adding breadcrumb information to other types of notifications

## Contributing Guidelines

When contributing to this feature:
1. Follow the existing code style
2. Add tests for any new functionality
3. Update documentation as needed
4. Consider edge cases and error handling
5. Ensure changes are backward compatible

## License

This contribution is made under the same license as the Outline project.