import BaseTask from "@server/queues/tasks/BaseTask";
import { Integration } from "@server/models";
import { FileOperation } from "@server/models";
import fetch from "node-fetch";
import Logger from "@server/logging/Logger";
import {
  FileOperationState,
  FileOperationType,
  FileOperationFormat,
} from "@shared/types";
import { v4 as uuidv4 } from "uuid";

type Props = {
  integrationId: string;
  avatarUrl: string;
};

// Define a type for GitLab settings
interface GitLabSettings {
  gitlab: {
    project?: {
      avatar_url?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export default class UploadGitLabProjectAvatarTask extends BaseTask<Props> {
  public async perform({ integrationId, avatarUrl }: Props) {
    const integration = await Integration.findByPk(integrationId, {
      rejectOnEmpty: true,
    });

    try {
      const res = await fetch(avatarUrl);
      const buffer = await res.buffer();
      const name = avatarUrl.split("/").pop() || "avatar";

      // Create a file operation with the correct parameters
      const operation = await FileOperation.create({
        type: FileOperationType.Import,
        state: FileOperationState.Creating,
        format: FileOperationFormat.JSON, // Use a valid FileOperationFormat
        key: `uploads/${integration.teamId}/${uuidv4()}/${name}`,
        userId: integration.userId,
        teamId: integration.teamId,
        size: buffer.length,
      });

      // Cast the settings to our GitLabSettings interface
      const currentSettings = integration.settings as unknown as GitLabSettings;

      // Update the integration settings with the avatar URL
      await integration.update({
        settings: {
          ...integration.settings,
          gitlab: {
            ...currentSettings.gitlab,
            project: {
              ...currentSettings.gitlab?.project,
              avatar_url: operation.url,
            },
          },
        } as Record<string, unknown>,
      });
    } catch (err: unknown) {
      // If the avatar upload fails, we don't need to fail the entire task
      // as it's not critical to the integration's functionality.
      // Just log the error and continue.
      const error = err instanceof Error ? err : new Error(String(err));
      Logger.error("Failed to upload GitLab project avatar", error);
    }
  }
}
