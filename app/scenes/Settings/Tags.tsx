import { observer } from "mobx-react";
import { CloseIcon, EditIcon, HashtagIcon, PlusIcon, TrashIcon } from "outline-icons";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import styled from "styled-components";
import ColorPicker from "@shared/components/ColorPicker";
import { s } from "@shared/styles";
import Button from "~/components/Button";
import Flex from "~/components/Flex";
import Heading from "~/components/Heading";
import Input from "~/components/Input";
import NudeButton from "~/components/NudeButton";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import TagDeleteDialog from "~/components/TagDeleteDialog";
import Tooltip from "~/components/Tooltip";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import type Tag from "~/models/Tag";
import type { Properties } from "~/types";

const TAG_MAX_LENGTH = 64;

interface TagFormState {
	name: string;
	color: string | null;
}

interface TagEditFormProps {
	initialName: string;
	initialColor: string | null;
	submitLabel: string;
	onSubmit: (values: TagFormState) => Promise<void>;
}

function TagEditForm({ initialName, initialColor, submitLabel, onSubmit }: TagEditFormProps) {
	const { t } = useTranslation();
	const [name, setName] = useState(initialName);
	const [color, setColor] = useState<string | null>(initialColor);
	const [isSaving, setIsSaving] = useState(false);

	const handleSubmit = async (ev: React.FormEvent) => {
		ev.preventDefault();
		const trimmed = name.trim().toLowerCase();
		if (!trimmed) {
			return;
		}
		if (trimmed.length > TAG_MAX_LENGTH) {
			toast.error(t("Tag names cannot exceed {{ count }} characters", { count: TAG_MAX_LENGTH }));
			return;
		}
		setIsSaving(true);
		try {
			await onSubmit({ name: trimmed, color });
		} finally {
			setIsSaving(false);
		}
	};

	const preview = name.trim().toLowerCase() || initialName;

	return (
		<form onSubmit={handleSubmit}>
			<FormGroup>
				<label>{t("Name")}</label>
				<Input
					type="text"
					value={name}
					onChange={(ev) => setName(ev.target.value)}
					autoFocus
					autoComplete="off"
					maxLength={TAG_MAX_LENGTH}
					margin="0"
					required
				/>
			</FormGroup>
			<FormGroup>
				<label>{t("Color")}</label>
				<ColorPickerWrapper>
					<ColorPicker alpha={false} activeColor={color} onSelect={setColor} />
					{color && (
						<Tooltip content={t("Remove color")}>
							<NudeButton type="button" onClick={() => setColor(null)}>
								<CloseIcon size={16} />
								{t("Remove color")}
							</NudeButton>
						</Tooltip>
					)}
				</ColorPickerWrapper>
			</FormGroup>
			<FormFooter align="center" justify="space-between">
				<TagPreview $color={color}>
					<TagDot $color={color} />
					{preview}
				</TagPreview>
				<Button type="submit" disabled={isSaving || !name.trim()}>
					{isSaving ? `${t("Saving")}…` : submitLabel}
				</Button>
			</FormFooter>
		</form>
	);
}

function Tags() {
	const { tags, dialogs } = useStores();
	const team = useCurrentTeam();
	const can = usePolicy(team);
	const { t } = useTranslation();

	useEffect(() => {
		void Promise.all([tags.fetchPage(), tags.fetchUsage()]);
	}, [tags]);

	const handleCreateClick = useCallback(() => {
		dialogs.openModal({
			title: t("Create tag"),
			content: (
				<TagEditForm
					initialName=""
					initialColor={null}
					submitLabel={t("Create tag")}
					onSubmit={async ({ name, color }) => {
						await tags.create({ name, color } as Properties<Tag>);
						dialogs.closeAllModals();
					}}
				/>
			),
		});
	}, [dialogs, t, tags]);

	const handleEditClick = useCallback(
		(tag: Tag) => {
			dialogs.openModal({
				title: t("Update tag"),
				content: (
					<TagEditForm
						initialName={tag.name}
						initialColor={tag.color}
						submitLabel={t("Update tag")}
						onSubmit={async ({ name, color }) => {
							await tags.update({ id: tag.id, name, color } as Properties<Tag>);
							dialogs.closeAllModals();
						}}
					/>
				),
			});
		},
		[dialogs, t, tags]
	);

	const handleDeleteClick = useCallback(
		(tag: Tag) => {
			dialogs.openModal({
				title: t("Delete tag"),
				content: (
					<TagDeleteDialog
						tag={tag}
						onSubmit={() => dialogs.closeAllModals()}
					/>
				),
			});
		},
		[dialogs, t]
	);

	return (
		<Scene title={t("Tags")} icon={<HashtagIcon />} wide>
			<Flex align="flex-start" justify="space-between" gap={16}>
				<div>
					<Heading>{t("Tags")}</Heading>
					<Text as="p" type="secondary">
						{t(
							"Tags can be added to documents to help organise and filter content across your workspace."
						)}
					</Text>
				</div>
				{can.update && (
					<Button icon={<PlusIcon />} onClick={handleCreateClick} neutral>
						{t("Create tag")}
					</Button>
				)}
			</Flex>

			<TagTable>
				<thead>
					<tr>
						<th>{t("Tag")}</th>
						<th>{t("Documents")}</th>
						<th>{t("Created")}</th>
						{can.update && <th>{t("Actions")}</th>}
					</tr>
				</thead>
				<tbody>
					{tags.orderedData.map((tag) => (
						<tr key={tag.id}>
							<td>
								<TagChip $color={tag.color}>
									<TagDot $color={tag.color} />
									<Text weight="bold" as="span">{tag.name}</Text>
								</TagChip>
							</td>
							<td>
								<Text type="secondary">
									{tag.documentCount !== undefined
										? tag.documentCount
										: "–"}
								</Text>
							</td>
							<td>
								<Text type="tertiary">
									{tag.createdAt
										? new Date(tag.createdAt).toLocaleDateString()
										: "–"}
								</Text>
							</td>
							{can.update && (
								<td>
									<ActionCell gap={4}>
										<Tooltip content={t("Edit tag")}>
											<NudeButton
												aria-label={t("Edit tag")}
												onClick={() => handleEditClick(tag)}
											>
												<EditIcon size={18} />
											</NudeButton>
										</Tooltip>
										<Tooltip content={t("Delete tag")}>
											<NudeButton
												aria-label={t("Delete tag")}
												onClick={() => handleDeleteClick(tag)}
											>
												<TrashIcon size={18} />
											</NudeButton>
										</Tooltip>
									</ActionCell>
								</td>
							)}
						</tr>
					))}
					{tags.orderedData.length === 0 && (
						<tr>
							<td colSpan={4}>
								<Text type="tertiary">
									{t("No tags yet. Add one above.")}
								</Text>
							</td>
						</tr>
					)}
				</tbody>
			</TagTable>
		</Scene>
	);
}

const TagTable = styled.table`
	width: 100%;
	border-collapse: collapse;
	margin-top: 16px;

	th,
	td {
		text-align: left;
		padding: 10px 12px;
		border-bottom: 1px solid ${s("divider")};
		font-size: 14px;
		vertical-align: middle;
	}

	th {
		font-weight: 600;
		color: ${s("textTertiary")};
		font-size: 12px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	tr:last-child td {
		border-bottom: none;
	}

	td:last-child {
		text-align: right;
	}
`;

const TagChip = styled.span<{ $color: string | null | undefined }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px 3px 6px;
	border-radius: 12px;
	background: ${({ $color }) => ($color ? `${$color}22` : "transparent")};
	border: 1px solid ${({ $color }) => $color ?? s("divider")};
	font-size: 13px;
`;

const TagDot = styled.span<{ $color: string | null | undefined }>`
	display: inline-block;
	width: 10px;
	height: 10px;
	border-radius: 50%;
	background: ${({ $color }) => $color ?? "transparent"};
	border: 1.5px solid ${({ $color }) => $color ?? s("textTertiary")};
	flex-shrink: 0;
`;

const ActionCell = styled(Flex)`
	justify-content: flex-end;
`;

const ColorPickerWrapper = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
	align-items: flex-start;
`;

const FormGroup = styled.div`
	margin-bottom: 16px;

	label {
		display: block;
		font-size: 13px;
		font-weight: 500;
		color: ${s("textSecondary")};
		margin-bottom: 6px;
	}
`;

const FormFooter = styled(Flex)`
	margin-top: 20px;
	padding-top: 16px;
	border-top: 1px solid ${s("divider")};
`;

const TagPreview = styled.span<{ $color: string | null | undefined }>`
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 3px 10px 3px 6px;
	border-radius: 12px;
	background: ${({ $color }) => ($color ? `${$color}22` : "transparent")};
	border: 1px solid ${({ $color }) => $color ?? s("divider")};
	font-size: 13px;
	font-weight: 500;
`;

export default observer(Tags);
