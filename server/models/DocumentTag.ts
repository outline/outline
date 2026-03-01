import type {
	Attributes,
	CreationAttributes,
	FindOrCreateOptions,
	InferAttributes,
	InferCreationAttributes,
	InstanceDestroyOptions,
} from "sequelize";
import {
	AfterCreate,
	AfterDestroy,
	BelongsTo,
	Column,
	DataType,
	ForeignKey,
	Table,
} from "sequelize-typescript";
import Document from "./Document";
import Tag from "./Tag";
import User from "./User";
import IdModel from "./base/IdModel";
import Fix from "./decorators/Fix";

@Table({ tableName: "document_tags", modelName: "document_tag", updatedAt: false })
@Fix
class DocumentTag extends IdModel<
	InferAttributes<DocumentTag>,
	Partial<InferCreationAttributes<DocumentTag>>
> {
	// associations

	@BelongsTo(() => Document, "documentId")
	document: Document;

	@ForeignKey(() => Document)
	@Column(DataType.UUID)
	documentId: string;

	@BelongsTo(() => Tag, "tagId")
	tag: Tag;

	@ForeignKey(() => Tag)
	@Column(DataType.UUID)
	tagId: string;

	@BelongsTo(() => User, "createdById")
	createdBy: User | null;

	@ForeignKey(() => User)
	@Column(DataType.UUID)
	createdById: string | null;

	// hooks

	/**
	 * Increments the cached documentCount on the associated Tag after a DocumentTag is created.
	 */
	@AfterCreate
	public static async incrementTagDocumentCount(
		model: DocumentTag,
		ctx: FindOrCreateOptions<Attributes<DocumentTag>, CreationAttributes<DocumentTag>>
	) {
		const { transaction } = ctx;
		await Tag.increment("documentCount", {
			where: { id: model.tagId },
			transaction,
		});
	}

	/**
	 * Decrements the cached documentCount on the associated Tag after a DocumentTag is destroyed.
	 */
	@AfterDestroy
	public static async decrementTagDocumentCount(
		model: DocumentTag,
		ctx: InstanceDestroyOptions
	) {
		const { transaction } = ctx;
		await Tag.decrement("documentCount", {
			where: { id: model.tagId },
			by: 1,
			transaction,
		});
	}
}

export default DocumentTag;
