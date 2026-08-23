export interface TNoteCollection {
	readonly id: string;
	readonly businessId: string;
	readonly name: string;
	readonly description: string | null;
	readonly sortOrder: number;
	readonly isArchived: boolean;
	readonly createdBy: string;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TPetNote {
	readonly id: string;
	readonly businessId: string;
	readonly collectionId: string | null;
	readonly parentNoteId: string | null;
	readonly createdBy: string;
	readonly title: string;
	readonly content: Record<string, unknown>;
	readonly icon: string | null;
	readonly color: string | null;
	readonly isPublished: boolean;
	readonly publishedAt: string | null;
	readonly isArchived: boolean;
	readonly archivedAt: string | null;
	readonly deletedAt: string | null;
	readonly revision: number;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TCreateNoteInput {
	readonly title?: string;
	readonly content?: Record<string, unknown>;
	readonly collectionId?: string | null;
	readonly parentNoteId?: string | null;
	readonly icon?: string | null;
	readonly color?: string | null;
	readonly publish?: boolean;
}

export interface TUpdateNoteInput {
	readonly title?: string;
	readonly content?: Record<string, unknown>;
	readonly collectionId?: string | null;
	readonly parentNoteId?: string | null;
	readonly icon?: string | null;
	readonly color?: string | null;
	readonly publish?: boolean;
}

export interface TCreateNoteCollectionInput {
	readonly name: string;
	readonly description?: string | null;
	readonly sortOrder?: number;
}
