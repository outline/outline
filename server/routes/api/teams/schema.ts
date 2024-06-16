import { z } from "zod";
import { TOCPosition, UserRole } from "@shared/types";
import { BaseSchema } from "@server/routes/api/schema";

export const TeamsUpdateSchema = BaseSchema.extend({
  body: z.object({
    /** Team name */
    name: z.string().optional(),
    /** Avatar URL */
    avatarUrl: z.string().optional(),
    /** The subdomain to access the team */
    subdomain: z.string().nullish(),
    /** Whether public sharing is enabled */
    sharing: z.boolean().optional(),
    /** Whether siginin with email is enabled */
    guestSignin: z.boolean().optional(),
    /** Whether third-party document embeds are enabled */
    documentEmbeds: z.boolean().optional(),
    /** Whether team members are able to create new collections */
    memberCollectionCreate: z.boolean().optional(),
    /** Whether team members are able to create new workspaces */
    memberTeamCreate: z.boolean().optional(),
    /** The default landing collection for the team */
    defaultCollectionId: z.string().uuid().nullish(),
    /** The default user role */
    defaultUserRole: z.nativeEnum(UserRole).optional(),
    /** Whether new users must be invited to join the team */
    inviteRequired: z.boolean().optional(),
    /** Domains allowed to sign-in with SSO */
    allowedDomains: z.array(z.string()).optional(),
    /** Team preferences */
    preferences: z
      .object({
        /** Whether documents have a separate edit mode instead of seamless editing. */
        seamlessEdit: z.boolean().optional(),
        /** Whether to use team logo across the app for branding. */
        publicBranding: z.boolean().optional(),
        /** Whether viewers should see download options. */
        viewersCanExport: z.boolean().optional(),
        /** Whether members can invite new people to the team. */
        membersCanInvite: z.boolean().optional(),
        /** Whether members can create API keys. */
        membersCanCreateApiKey: z.boolean().optional(),
        /** Whether commenting is enabled */
        commenting: z.boolean().optional(),
        /** The custom theme for the team. */
        customTheme: z
          .object({
            accent: z.string().min(4).max(7).regex(/^#/).optional(),
            accentText: z.string().min(4).max(7).regex(/^#/).optional(),
          })
          .optional(),
        /** Side to display the document's table of contents in relation to the main content. */
        tocPosition: z.nativeEnum(TOCPosition).optional(),
      })
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
