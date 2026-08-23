export type TQueueIdempotencyKeyInput = {
	readonly tenantId: string;
	readonly operation: string;
	readonly importRequestId: string;
};

export const makeQueueIdempotencyKey = ({
	tenantId,
	operation,
	importRequestId,
}: TQueueIdempotencyKeyInput): string =>
	`${tenantId}:${operation}:${importRequestId.trim()}`;
