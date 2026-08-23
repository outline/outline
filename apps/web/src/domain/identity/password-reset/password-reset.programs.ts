import { Effect } from "effect";
import { IAuthRepository } from "@/domain/identity/auth/auth.repository";
import { IAppConfig } from "@/shared/env/app.config";
import { IEmailPort } from "@/shared/ports/email.port";
import { IRateLimit, RateLimitError } from "@/shared/ports/rate-limit.port";
import {
	InvalidResetTokenError,
	WeakPasswordError,
} from "./password-reset.errors";
import { IPasswordResetRepository } from "./password-reset.repository";
import { buildPasswordChangedEmail } from "./emails/password-changed.email";

const TOKEN_BYTES = 32;
const RESET_EXPIRY_MINUTES = 15;

const hexEncode = (bytes: Uint8Array): string =>
	Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

const generateResetToken = async (): Promise<{
	token: string;
	tokenHash: string;
}> => {
	const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
	const token = hexEncode(bytes);
	const hashBytes = await crypto.subtle.digest("SHA-256", bytes);
	const tokenHash = hexEncode(new Uint8Array(hashBytes));
	return { token, tokenHash };
};

const MIN_PASSWORD_LENGTH = 6;

export type TPasswordResetRequestMeta = {
	readonly ip: string;
};

const validatePassword = (password: string) => {
	if (password.length < MIN_PASSWORD_LENGTH) {
		return Effect.fail(
			new WeakPasswordError({
				message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
			}),
		);
	}
	return Effect.void;
};

const requireAllowed = (
	result: { readonly allowed: boolean; readonly retryAfterSeconds: number },
	scope: string,
) =>
	result.allowed
		? Effect.void
		: Effect.fail(
				new RateLimitError(`Rate limit exceeded for ${scope}`, {
					retryAfterSeconds: result.retryAfterSeconds,
				}),
			);

export const requestPasswordResetProgram = (
	email: string,
	meta: TPasswordResetRequestMeta,
) =>
	Effect.gen(function* () {
		const authRepo = yield* IAuthRepository;
		const resetRepo = yield* IPasswordResetRepository;
		const emailPort = yield* IEmailPort;
		const rateLimit = yield* IRateLimit;
		const config = yield* IAppConfig;

		const emailLimit = yield* rateLimit.check({
			scope: "password-reset:email",
			key: email,
			limit: 3,
			windowSeconds: 3600,
		});
		yield* requireAllowed(emailLimit, "password-reset:email");

		const ipLimit = yield* rateLimit.check({
			scope: "password-reset:ip",
			key: meta.ip,
			limit: 10,
			windowSeconds: 3600,
		});
		yield* requireAllowed(ipLimit, "password-reset:ip");

		const user = yield* authRepo.findUserByEmail(email);

		if (!user) {
			return;
		}

		yield* resetRepo.invalidateActiveTokensForUser(user.id);

		const { token, tokenHash } = yield* Effect.promise(() =>
			generateResetToken(),
		);

		const expiresAt = new Date(
			Date.now() + RESET_EXPIRY_MINUTES * 60 * 1000,
		).toISOString();

		yield* resetRepo.create({
			userId: user.id,
			tokenHash,
			expiresAt,
		});

		const resetUrl = `${config.publicBaseUrl.replace(/\/+$/, "")}/reset-password?token=${token}`;

		yield* emailPort.sendEmail({
			to: email,
			subject: "Reset Password - Pet Store",
			text: `Click the following link to reset your password: ${resetUrl}\nThis link expires in ${RESET_EXPIRY_MINUTES} minutes.`,
			html: `<p>Click <a href="${resetUrl}">here</a> to reset your password.</p><p>This link expires in ${RESET_EXPIRY_MINUTES} minutes.</p>`,
		});
	});

export const confirmPasswordResetProgram = (
	token: string,
	newPassword: string,
) =>
	Effect.gen(function* () {
		yield* validatePassword(newPassword);

		const resetRepo = yield* IPasswordResetRepository;

		const tokenBytes = new Uint8Array(
			token.match(/.{1,2}/g)?.map((b) => Number.parseInt(b, 16)) ?? [],
		);
		if (tokenBytes.length !== TOKEN_BYTES) {
			return yield* Effect.fail(
				new InvalidResetTokenError({ message: "Invalid token format" }),
			);
		}

		const hashBytes = yield* Effect.promise(() =>
			crypto.subtle.digest("SHA-256", tokenBytes),
		);
		const tokenHash = hexEncode(new Uint8Array(hashBytes));

		const { email } = yield* resetRepo.consumeAndChangePassword({
			tokenHash,
			newPassword,
			now: new Date().toISOString(),
		});

		const emailPort = yield* IEmailPort;
		const { subject, text, html } = buildPasswordChangedEmail();
		yield* emailPort
			.sendEmail({
				to: email,
				subject,
				text,
				html,
				idempotencyKey: `password-reset:${email}:${tokenHash}`,
			})
			.pipe(Effect.catchAll(() => Effect.void));
	});
