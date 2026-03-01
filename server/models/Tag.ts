import type { InferAttributes, InferCreationAttributes } from "sequelize";
import {
	BeforeCreate,
	BeforeSave,
	BelongsTo,
	BelongsToMany,
	Column,
	DataType,
	ForeignKey,
	Length,
	Scopes,
	Table,
	Unique,
} from "sequelize-typescript";
import Document from "./Document";
import Team from "./Team";
import User from "./User";
import ParanoidModel from "./base/ParanoidModel";
import Fix from "./decorators/Fix";
import DocumentTag from "./DocumentTag";

@Scopes(() => ({
	withTeam: {
		include: [{ association: "team" }],
	},
}))
@Table({ tableName: "tags", modelName: "tag" })
@Fix
class Tag extends ParanoidModel<
	InferAttributes<Tag>,
	Partial<InferCreationAttributes<Tag>>
> {
	/**
	 * The display name of the tag. Stored and compared as lowercase.
	 */
	@Length({ max: 64, msg: "name must be 64 characters or less" })
	@Unique("tags_team_id_name_unique")
	@Column
	name: string;

	/**
	 * Optional hex color for visual identification (e.g. "#FF5733"). Null = no color.
	 */
	@Column(DataType.STRING(7))
	color: string | null;

	// associations

	@BelongsTo(() => Team, "teamId")
	team: Team;

	@ForeignKey(() => Team)
	@Unique("tags_team_id_name_unique")
	@Column(DataType.UUID)
	teamId: string;

	@BelongsTo(() => User, "createdById")
	createdBy: User | null;

	@ForeignKey(() => User)
	@Column(DataType.UUID)
	createdById: string | null;

	@BelongsToMany(() => Document, () => DocumentTag)
	documents: Document[];

	// hooks

	@BeforeCreate
	@BeforeSave
	static normalizeTag(tag: Tag) {
		tag.name = tag.name.toLowerCase().trim();
	}
}

export default Tag;
