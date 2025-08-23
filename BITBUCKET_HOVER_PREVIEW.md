# Bitbucket Pull Request Hover Preview

This feature adds a custom hover preview component for Bitbucket pull requests that matches the design shown in the reference image.

## Components Created

### 1. HoverPreviewBitbucketPR
**Location**: `app/components/HoverPreview/HoverPreviewBitbucketPR.tsx`

A React component that renders a Bitbucket-style pull request hover preview with:
- Author avatar and full name
- Pull request title with ID
- Repository name
- Source → target branch information
- Creation time
- Status badge (green "Open" for open PRs)
- "View PR" button

### 2. Integration with Main HoverPreview
**Location**: `app/components/HoverPreview/HoverPreview.tsx`

The main hover preview component now detects Bitbucket URLs and automatically uses the Bitbucket-specific component instead of the generic pull request component.

### 3. Demo Components
- `app/components/HoverPreview/BitbucketPRDemo.tsx` - Interactive demo component
- `app/scenes/BitbucketDemo.tsx` - Demo scene for testing

## Features

### Visual Design
- Clean, card-like interface with subtle shadows
- Proper spacing and typography
- Status badge with appropriate colors
- Hover effects on interactive elements

### Data Display
- **Author Section**: Avatar + author's full name
- **Title Section**: Pull request title with ID (e.g., "Update README documentation #42")
- **Repository Info**: Repository name with status badge
- **Branch Info**: Source → target branch display
- **Time Info**: Creation time with relative formatting
- **Action Button**: "View PR" button for navigation

### Responsive Behavior
- Proper positioning relative to hover target
- Handles edge cases (screen boundaries)
- Smooth animations and transitions

## Usage

### Automatic Detection
The component automatically detects Bitbucket URLs and uses the appropriate preview:

```typescript
// Bitbucket URLs will automatically use HoverPreviewBitbucketPR
const bitbucketUrl = "https://bitbucket.org/owner/repo/pull-requests/123";

// Other PR URLs will use the standard HoverPreviewPullRequest
const githubUrl = "https://github.com/owner/repo/pull/123";
```

### Manual Usage
You can also use the component directly:

```typescript
import HoverPreviewBitbucketPR from "~/components/HoverPreview/HoverPreviewBitbucketPR";

const prData = {
  url: "https://bitbucket.org/example-repo/pull-requests/42",
  id: "42",
  title: "Update README documentation",
  author: {
    name: "John Smith",
    avatarUrl: "https://bitbucket.org/account/johnsmith/avatar/32/",
  },
  state: "open",
  createdAt: "2024-01-15T10:30:00Z",
  sourceBranch: "src/main",
  targetBranch: "target/dev",
  repository: "example-repo",
};

<HoverPreviewBitbucketPR {...prData} />
```

## Backend Integration

### Bitbucket Plugin Updates
The Bitbucket plugin has been updated to include repository information in the unfurl response:

**Location**: `plugins/bitbucket/server/bitbucket.ts`

```typescript
// Added repository field to PR unfurl response
repository: `${resource.owner}/${resource.repo}`,
```

### Type Definitions
Updated the shared types to include the repository field:

**Location**: `shared/types.ts`

```typescript
[UnfurlResourceType.PR]: {
  // ... existing fields
  /** Repository name (owner/repo) */
  repository?: string;
};
```

## Styling

### Status Badge
- Green (#238636) for open pull requests
- Gray (#848d97) for other states
- Rounded pill design with white text

### View PR Button
- White background with light border
- Hover effects for better UX
- Proper spacing and typography

### Card Design
- Consistent with existing hover preview components
- Proper shadows and borders
- Responsive layout

## Testing

### Demo Page
Visit the demo page to see the component in action:
- Navigate to the BitbucketDemo scene
- Hover over the sample link to see the preview

### Sample Data
The demo uses realistic sample data that matches the reference image:
- Title: "Update README documentation"
- ID: "#42"
- Repository: "example-repo"
- Branches: "src/main → target/dev"
- Status: "Open"

## Future Enhancements

1. **Additional States**: Support for merged, declined, and draft PR states
2. **Rich Content**: Display PR description with markdown support
3. **Labels**: Show PR labels if available
4. **Review Status**: Display review status and approval information
5. **Comments**: Show comment count and recent activity

## Dependencies

- React with TypeScript
- Styled Components for styling
- Framer Motion for animations (inherited from parent components)
- React i18next for internationalization
- Existing Outline components (Avatar, Text, Flex, etc.)
