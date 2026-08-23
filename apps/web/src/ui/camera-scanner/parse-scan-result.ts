export type TScanResult = {
	readonly productId?: string;
	readonly barcode?: string;
};

export const parseScanResult = (decodedText: string): TScanResult => {
	const trimmed = decodedText.trim();
	const parts = trimmed.split("/products/");
	if (parts.length > 1) {
		const productId = parts[parts.length - 1]?.split("?")[0]?.trim();
		if (productId) {
			return { productId };
		}
	}
	return { barcode: trimmed };
};
