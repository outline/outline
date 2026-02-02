import Router from "koa-router";
import FormData from "form-data";
import { Attachment } from "@server/models";
import auth from "@server/middlewares/authentication";
import validate from "@server/middlewares/validate";
import { authorize } from "@server/policies";
import type { APIContext } from "@server/types";
import fetch from "@server/utils/fetch";
import env from "@server/env";
import * as T from "./schema";
import { InvalidRequestError } from "@server/errors";

const router = new Router();

router.post(
    "audio.transcribe",
    auth(),
    validate(T.AudioTranscribeSchema),
    async (ctx: APIContext<T.AudioTranscribeReq>) => {
        const { attachmentId, language } = ctx.input.body;
        const { user } = ctx.state.auth;

        if (!env.OPENAI_API_KEY) {
            throw InvalidRequestError("Transcription service is not configured.");
        }

        const attachment = await Attachment.findByPk(attachmentId);
        if (!attachment) {
            throw InvalidRequestError("Attachment not found.");
        }

        authorize(user, "read", attachment);

        const buffer = await attachment.buffer;
        if (!buffer) {
            throw InvalidRequestError("Could not retrieve audio data from storage.");
        }

        const form = new FormData();
        form.append("file", buffer, {
            filename: attachment.name,
            contentType: attachment.contentType,
        });
        form.append("model", "whisper-1");
        if (language) {
            form.append("language", language);
        }

        try {
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${env.OPENAI_API_KEY}`,
                    ...form.getHeaders(),
                },
                body: form as any,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || "OpenAI API error");
            }

            const data = await response.json();

            ctx.body = {
                data: {
                    text: data.text,
                },
            };
        } catch (error) {
            throw InvalidRequestError(`Transcription failed: ${error.message}`);
        }
    }
);

export default router;
