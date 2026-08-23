/**
 * Port: TUploadCommand / TUploadState / TUploadController
 *
 * UI-only upload surface. React components depend on this port and
 * `useUploadController`; the concrete upload adapter (presigned URL,
 * direct PUT, server function, etc.) lives in `useUploadController`'s
 * caller and is hidden behind the `TUploadCommand` closure.
 *
 * Component code must only see `state`, `upload(file)`, `reset()`. The
 * "command" parameter accepts any async function that resolves to
 * `{ url }`, so adapters can change without touching components.
 */

export type TUploadState =
	| { readonly status: "idle" }
	| { readonly status: "validating" }
	| { readonly status: "uploading"; readonly progress: number }
	| { readonly status: "confirming" }
	| { readonly status: "success"; readonly url: string }
	| { readonly status: "error"; readonly message: string };

export type TUploadResult = { readonly url: string };

export type TUploadCommand = (file: File) => Promise<TUploadResult>;

export type TUploadController = {
	readonly state: TUploadState;
	readonly upload: (file: File) => Promise<TUploadState>;
	readonly reset: () => void;
};
