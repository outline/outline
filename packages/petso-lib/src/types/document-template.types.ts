export interface TDocumentTemplateContent {
	readonly title?: string;
	readonly header?: string;
	readonly body?: string;
	readonly footer?: string;
	readonly showLogo?: boolean;
	readonly showStaff?: boolean;
	readonly showBranch?: boolean;
	readonly p1?: string;
	readonly p2?: string;
	readonly p3?: string;
	readonly p4?: string;
	readonly termsAndConditions?: readonly string[];
}

export interface TDocumentTemplateDto {
	readonly id: string;
	readonly type: string;
	readonly name: string;
	readonly content: TDocumentTemplateContent;
	readonly isActive: boolean;
	readonly createdAt: string;
	readonly updatedAt: string;
}

export interface TSaveDocumentTemplateInput {
	readonly id?: string;
	readonly type: string;
	readonly name: string;
	readonly content: TDocumentTemplateContent;
}
