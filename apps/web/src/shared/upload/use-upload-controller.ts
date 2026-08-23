import { useCallback, useState } from "react";
import { extractErrorMessage } from "@/shared/utils/error";
import type {
	TUploadCommand,
	TUploadController,
	TUploadState,
} from "./upload-ui.port";

/**
 * Drive the standard upload state machine for a single file.
 *
 * The hook owns `idle → validating → uploading → confirming → success`
 * (or `error` from any step). The caller passes a `TUploadCommand` that
 * performs the actual upload through whatever storage or presigned-URL
 * flow is appropriate — R2 today, S3-compatible tomorrow. Components
 * never see the storage adapter.
 *
 * `progress` is currently 0 for "uploading" because the standard
 * `fetch` upload doesn't expose progress without a ReadableStream
 * wrapper. When an adapter exposes real progress, the hook will
 * pass the value through unchanged.
 *
 * `upload()` RETURNS the final `TUploadState` it settles into (in
 * addition to updating `state` for render purposes). Callers MUST use
 * the returned value to branch on the outcome immediately after
 * `await`ing `upload()` — re-reading `state` from the closure captured
 * before the call is stale, since `state` only updates on the next
 * render and the calling closure never sees that re-render.
 */
export const useUploadController = (
	command: TUploadCommand,
): TUploadController => {
	const [state, setState] = useState<TUploadState>({ status: "idle" });

	const reset = useCallback(() => {
		setState({ status: "idle" });
	}, []);

	const upload = useCallback(
		async (file: File): Promise<TUploadState> => {
			setState({ status: "validating" });

			if (file.size <= 0) {
				const errorState: TUploadState = {
					status: "error",
					message: "File kosong",
				};
				setState(errorState);
				return errorState;
			}

			setState({ status: "uploading", progress: 0 });

			try {
				const result = await command(file);
				setState({ status: "confirming" });
				const successState: TUploadState = {
					status: "success",
					url: result.url,
				};
				setState(successState);
				return successState;
			} catch (error) {
				const errorState: TUploadState = {
					status: "error",
					message: extractErrorMessage(error, "Upload gagal"),
				};
				setState(errorState);
				return errorState;
			}
		},
		[command],
	);

	return { state, upload, reset };
};
