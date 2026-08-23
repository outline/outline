export interface TAccountDto {
	readonly id: string;
	readonly code: string;
	readonly name: string;
	readonly type: string;
	readonly subType: string | null;
	readonly description: string | null;
	readonly isActive: boolean;
}

export interface TJournalEntryLineDto {
	readonly id: string;
	readonly accountId: string;
	readonly debit: number;
	readonly credit: number;
	readonly description: string | null;
}

export interface TJournalEntryDto {
	readonly id: string;
	readonly entryNumber: string;
	readonly entryDate: string;
	readonly description: string | null;
	readonly referenceType: string | null;
	readonly referenceId: string | null;
	readonly status: string;
	readonly lines: readonly TJournalEntryLineDto[];
}
