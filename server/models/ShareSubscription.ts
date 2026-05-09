import crypto from "node:crypto";
import type { InferAttributes, InferCreationAttributes } from "sequelize";
import { type SaveOptions, Op } from "sequelize";
import {
  BeforeCreate,
  Column,
  DataType,
  BelongsTo,
  ForeignKey,
  Table,
  Scopes,
} from "sequelize-typescript";
import { subHours } from "date-fns";
import { ValidationError } from "@server/errors";
import Document from "./Document";
import Share from "./Share";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

/**
 * A subscription to email notifications for updates to a publicly shared
 * document and its descendants.
 */
@Scopes(() => ({
  active: {
    where: {
      confirmedAt: { [Op.not]: null },
      unsubscribedAt: null,
    },
  },
}))
@Table({ tableName: "share_subscriptions", modelName: "share_subscription" })
@Fix
class ShareSubscription extends IdModel<
  InferAttributes<ShareSubscription>,
  Partial<InferCreationAttributes<ShareSubscription>>
> {
  @BelongsTo(() => Share, "shareId")
  share: Share;

  @ForeignKey(() => Share)
  @Column(DataType.UUID)
  shareId: string;

  /** The document to scope notifications to (the document and its descendants). */
  @BelongsTo(() => Document, "documentId")
  document: Document;

  @ForeignKey(() => Document)
  @Column(DataType.UUID)
  documentId: string;

  /** The subscribed email */
  @Column(DataType.STRING)
  email: string;

  /** Normalized email fingerprint helps to improve spam detection through removal of common bypasses */
  @Column(DataType.STRING)
  emailFingerprint: string;

  /** Signing secret for subscribe/unsubscribe links */
  @Column(DataType.STRING)
  secret: string;

  /** IP address of the user that subscribed */
  @Column(DataType.STRING(45))
  ipAddress: string | null;

  @Column(DataType.DATE)
  confirmedAt: Date | null;

  @Column(DataType.DATE)
  unsubscribedAt: Date | null;

  @Column(DataType.DATE)
  lastNotifiedAt: Date | null;

  /** Maximum number of unique email subscriptions allowed per IP address. */
  static maxSubscriptionsPerIP = 3;

  /**
   * Enforce a per-IP rate limit on subscription creation to prevent abuse.
   *
   * @param model The subscription being created.
   * @param options The save options including the current transaction.
   * @throws when the IP has reached the maximum number of subscriptions.
   */
  @BeforeCreate
  static async checkIPLimit(
    model: ShareSubscription,
    options: SaveOptions<ShareSubscription>
  ) {
    if (!model.ipAddress) {
      return;
    }

    const results = await this.findAll({
      attributes: ["emailFingerprint"],
      where: { ipAddress: model.ipAddress },
      group: ["emailFingerprint"],
      transaction: options.transaction,
    });
    const count = results.length;

    if (count >= this.maxSubscriptionsPerIP) {
      throw ValidationError(`You have reached the limit of subscriptions`);
    }
  }

  /**
   * Whether this subscription has been confirmed via email.
   */
  get isConfirmed(): boolean {
    return !!this.confirmedAt;
  }

  /**
   * Whether this subscription has been unsubscribed.
   */
  get isUnsubscribed(): boolean {
    return !!this.unsubscribedAt;
  }

  /**
   * Whether the confirmation token has expired (24-hour window from last update).
   */
  get isTokenExpired(): boolean {
    return this.updatedAt < subHours(new Date(), 24);
  }

  /**
   * Normalize an email address into a fingerprint for uniqueness comparison.
   * Lowercases, removes dots from local part, and strips +alias suffixes.
   *
   * @param email The email address to normalize.
   * @returns The normalized email fingerprint.
   */
  static normalizeEmailFingerprint(email: string): string {
    // Strip null bytes to prevent injection bypasses
    // eslint-disable-next-line no-control-regex
    const lower = email.replace(/\0/g, "").toLowerCase().trim();
    const [localPart, domain] = lower.split("@");
    if (!localPart || !domain) {
      return crypto.createHash("sha256").update(lower).digest("hex");
    }

    const withoutPlus = localPart.split("+")[0];

    // Normalize googlemail.com to gmail.com as they are the same service
    const normalizedDomain = domain === "googlemail.com" ? "gmail.com" : domain;

    // Gmail ignores dots in the local part; other providers treat them as significant
    const normalizedLocal =
      normalizedDomain === "gmail.com"
        ? withoutPlus.replace(/\./g, "")
        : withoutPlus;

    const normalized = `${normalizedLocal}@${normalizedDomain}`;
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  /**
   * Generate an HMAC token for confirming this subscription.
   *
   * @param subscription The subscription to generate a token for.
   * @returns The confirmation token as a hex string.
   */
  static generateConfirmToken(subscription: ShareSubscription): string {
    return crypto
      .createHmac("sha256", subscription.secret)
      .update(`${subscription.shareId}:${subscription.email}:confirm`)
      .digest("hex");
  }

  /**
   * Generate an HMAC token for unsubscribing from this subscription.
   *
   * @param subscription The subscription to generate a token for.
   * @returns The unsubscribe token as a hex string.
   */
  static generateUnsubscribeToken(subscription: ShareSubscription): string {
    return crypto
      .createHmac("sha256", subscription.secret)
      .update(`${subscription.shareId}:${subscription.email}:unsubscribe`)
      .digest("hex");
  }
}

export default ShareSubscription;
