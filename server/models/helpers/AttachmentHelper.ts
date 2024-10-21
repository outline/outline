import { addHours } from "date-fns";
import { AttachmentPreset } from "@shared/types";
import env from "@server/env";
import { ValidateKey } from "@server/validation";

export enum Buckets {
  public = "public",
  uploads = "uploads",
  avatars = "avatars",
}

export default class AttachmentHelper {
  static maximumFileNameLength = 255;

  /**
   * Get the upload location for the given upload details
   *
   * @param acl The ACL to use
   * @param id The ID of the attachment
   * @param name The name of the attachment
   * @param userId The ID of the user uploading the attachment
   */
  static getKey({
    acl,
    id,
    name,
    userId,
  }: {
    acl: string;
    id: string;
    name: string;
    userId: string;
  }) {
    const bucket = acl === "public-read" ? Buckets.public : Buckets.uploads;
    const keyPrefix = `${bucket}/${userId}/${id}`;
    return ValidateKey.sanitize(
      `${keyPrefix}/${name.slice(0, this.maximumFileNameLength)}`
    );
  }

  /**
   * Parse a key into its constituent parts
   *
   * @param key The key to parse
   * @returns The constituent parts
   */
  static parseKey(key: string): {
    bucket: string;
    userId: string;
    id: string;
    fileName: string | undefined;
    isPublicBucket: boolean;
  } {
    const parts = key.split("/");
    const bucket = parts[0];
    const userId = parts[1];
    const id = parts[2];
    const [fileName] = parts.length > 3 ? parts.slice(-1) : [];

    return {
      bucket,
      userId,
      id,
      fileName,
      isPublicBucket: bucket === Buckets.avatars || bucket === Buckets.public,
    };
  }

  /**
   * Get the ACL to use for a given attachment preset
   *
   * @param preset The preset to use
   * @returns A valid S3 ACL
   */
  static presetToAcl(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Avatar:
        return "public-read";
      default:
        return env.AWS_S3_ACL;
    }
  }

  /**
   * Get the expiration time for a given attachment preset
   *
   * @param preset The preset to use
   * @returns An expiration time
   */
  static presetToExpiry(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Import:
      case AttachmentPreset.WorkspaceImport:
        return addHours(new Date(), 24);
      default:
        return undefined;
    }
  }

  /**
   * Get the maximum upload size for a given attachment preset
   *
   * @param preset The preset to use
   * @returns The maximum upload size in bytes
   */
  static presetToMaxUploadSize(preset: AttachmentPreset) {
    switch (preset) {
      case AttachmentPreset.Import:
        return env.FILE_STORAGE_IMPORT_MAX_SIZE;
      case AttachmentPreset.WorkspaceImport:
        return env.FILE_STORAGE_WORKSPACE_IMPORT_MAX_SIZE;
      case AttachmentPreset.Avatar:
      case AttachmentPreset.DocumentAttachment:
      default:
        return env.FILE_STORAGE_UPLOAD_MAX_SIZE;
    }
  }
}
