/**
 * Utilities for generating public URLs
 */

export const PublicLinkUtils = {
	/**
	 * Generates a public boarding form link
	 */
	getBoardingLink: (
		origin: string,
		businessSlug?: string | null,
		businessId?: string,
	) => {
		const identifier = businessSlug || businessId;
		if (!identifier) return "";
		return `${origin}/p/${identifier}/boarding`;
	},

	/**
	 * Generates a public product information link
	 */
	getProductLink: (origin: string, businessId: string, productId: string) => {
		if (!businessId || !productId) return "";
		return `${origin}/p/${businessId}/products/${productId}`;
	},
};
