export type TTemplateId = string & { readonly _brand: "TemplateId" };

export interface IBoardingTemplateContent {
	readonly title: string;
	readonly header: string;
	readonly p1: string;
	readonly p2: string;
	readonly p3: string;
	readonly p4: string;
	readonly footer: string;
	readonly termsAndConditions: readonly string[];
	// Layout Settings
	readonly fontSize?: number;
	readonly lineSpacing?: number;
	readonly paragraphSpacing?: number;
	readonly marginTop?: number;
	readonly showLogo?: boolean;
	readonly showSignature?: boolean;
}

export interface IDocumentTemplate {
	readonly id: TTemplateId;
	readonly businessId: string;
	readonly type: string;
	readonly name: string;
	readonly content: IBoardingTemplateContent;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}

export interface ICreateTemplateCommand {
	readonly type: string;
	readonly name: string;
	readonly content: IBoardingTemplateContent;
}

export interface IUpdateTemplateCommand {
	readonly id: TTemplateId;
	readonly businessId: string;
	readonly content: IBoardingTemplateContent;
}
