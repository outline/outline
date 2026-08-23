import { uploadFile as uploadFileServerFn } from "@/lib/api/storage.functions";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	let binary = "";
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const chunk = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...chunk);
	}
	return btoa(binary);
}

function extensionFromFile(file: File): string {
	const fromName = file.name.split(".").pop();
	if (fromName && fromName.length <= 8) return fromName.toLowerCase();
	const fromType = file.type.split("/").pop();
	return fromType ?? "bin";
}

export async function uploadFile(
	bucket: string,
	file: File,
	resourceId: string,
): Promise<string> {
	const ext = extensionFromFile(file);
	const fileName = `${crypto.randomUUID()}.${ext}`;
	const buffer = await file.arrayBuffer();
	const data = arrayBufferToBase64(buffer);

	const { url } = await uploadFileServerFn({
		data: {
			bucket,
			resourceId,
			fileName,
			contentType: file.type || "application/octet-stream",
			data,
		},
	});

	return url;
}
