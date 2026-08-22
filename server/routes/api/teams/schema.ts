import { z } from "zod";
import {
  CommentingAccess,
  EmailDisplay,
  TeamPreference,
  TOCPosition,
  UserRole,
} from "@shared/types";
import { TeamValidation } from "@shared/validations";
import { BaseSchema } from "@server/routes/api/schema";

export const TeamsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Team name */
    name: z.string().optional(),
    /** Team description */
    description: z.string().nullish(),
    /** Avatar URL */
    avatarUrl: z.string().nullish(),
    /** The subdomain to access the team */
    subdomain: z.string().nullish(),
    /** Whether public sharing is enabled */
    sharing: z.boolean().optional(),
    /** Whether signin with email is enabled */
    guestSignin: z.boolean().optional(),
    /** Whether signin with passkeys is enabled */
    passkeysEnabled: z.boolean().optional(),
    /** Whether third-party document embeds are enabled */
    documentEmbeds: z.boolean().optional(),
    /** Whether team members are able to create new collections */
    memberCollectionCreate: z.boolean().optional(),
    /** Whether team members are able to create new workspaces */
    memberTeamCreate: z.boolean().optional(),
    /** The default landing collection for the team */
    defaultCollectionId: z.uuid().nullish(),
    /** The default user role */
    defaultUserRole: z.enum(UserRole).optional(),
    /** Whether new users must be invited to join the team */
    inviteRequired: z.boolean().optional(),
    /** Domains allowed to sign-in with SSO */
    allowedDomains: z.array(z.string()).optional(),
    /** Workspace guidance provided to MCP clients on connection */
    guidanceMCP: z.string().max(TeamValidation.maxGuidanceMCPLength).nullish(),
    /** Team preferences */
    preferences: z
      .strictObject({
        /** Whether documents have a separate edit mode instead of seamless editing. */
        [TeamPreference.SeamlessEdit]: z.boolean(),
        /** Whether to use team logo across the app for branding. */
        [TeamPreference.PublicBranding]: z.boolean(),
        /** Whether viewers should see download options. */
        [TeamPreference.ViewersCanExport]: z.boolean(),
        /** Whether members can invite new people to the team. */
        [TeamPreference.MembersCanInvite]: z.boolean(),
        /** Whether members can create API keys. */
        [TeamPreference.MembersCanCreateApiKey]: z.boolean(),
        /** Whether members can delete their user account. */
        [TeamPreference.MembersCanDeleteAccount]: z.boolean(),
        /** Whether notification emails include document and comment content. */
        [TeamPreference.PreviewsInEmails]: z.boolean(),
        /** Who can comment on documents. */
        [TeamPreference.Commenting]: z.enum(CommentingAccess),
        /** The custom theme for the team. */
        [TeamPreference.CustomTheme]: z
          .strictObject({
            accent: z.string().min(4).max(7).regex(/^#/),
            accentText: z.string().min(4).max(7).regex(/^#/),
          })
          .partial(),
        /** Side to display the document's table of contents in relation to the main content. */
        [TeamPreference.TocPosition]: z.enum(TOCPosition),
        /** Who can see user email addresses. */
        [TeamPreference.EmailDisplay]: z.enum(EmailDisplay),
        /** Whether to prevent shared documents from being embedded in iframes on external websites. */
        [TeamPreference.PreventDocumentEmbedding]: z.boolean(),
        /** Whether external MCP clients can connect to the workspace. */
        [TeamPreference.MCP]: z.boolean(),
        /** List of disabled embed provider titles. */
        [TeamPreference.DisabledEmbeds]: z.array(z.string()),
      })
      .partial()
      .optional(),
  }),
});

export type TeamsUpdateSchemaReq = z.infer<typeof TeamsUpdateSchema>;

export const TeamsDeleteSchema = BaseSchema.extend({
  body: z.object({
    code: z.string(),
  }),
});

export type TeamsDeleteSchemaReq = z.infer<typeof TeamsDeleteSchema>;
