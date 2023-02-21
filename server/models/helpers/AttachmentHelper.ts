import { addHours } from "date-fns";
import { AttachmentPreset } from "@shared/types";
import env from "@server/env";

export default class AttachmentHelper {
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
    const bucket = acl === "public-read" ? "public" : "uploads";
    const keyPrefix = `${bucket}/${userId}/${id}`;
    return `${keyPrefix}/${name}`;
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
        return env.MAXIMUM_IMPORT_SIZE;
      case AttachmentPreset.Avatar:
      case AttachmentPreset.DocumentAttachment:
      default:
        return env.AWS_S3_UPLOAD_MAX_SIZE;
    }
  }
}
