import { CloseIcon } from "outline-icons";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { s } from "@shared/styles";

interface Props {
	/** The tag name to display. */
	name: string;
	/** Optional hex color for the tag dot. */
	color?: string | null;
	/** If provided, renders a remove button and calls this handler on click. */
	onRemove?: () => void;
}

/**
 * A small pill badge that displays a tag name with an optional remove button.
 */
function TagBadge({ name, color, onRemove }: Props) {
	const { t } = useTranslation();

	const handleRemove = React.useCallback(
		(ev: React.MouseEvent) => {
			ev.preventDefault();
			ev.stopPropagation();
			onRemove?.();
		},
		[onRemove]
	);

	return (
		<Pill $color={color ?? null}>
			<Dot $color={color ?? null} />
			<Label>{name}</Label>
			{onRemove && (
				<RemoveButton
					type="button"
					aria-label={t("Remove tag {{ name }}", { name })}
					onClick={handleRemove}
				>
					<CloseIcon size={10} />
				</RemoveButton>
			)}
		</Pill>
	);
}

const Dot = styled.span<{ $color: string | null }>`
	width: 8px;
	height: 8px;
	border-radius: 50%;
	flex-shrink: 0;
	background: ${({ $color }) => $color ?? "currentColor"};
	opacity: ${({ $color }) => ($color ? 1 : 0.4)};
`;

const Pill = styled.span<{ $color: string | null }>`
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 7px 2px 6px;
	border-radius: 10px;
	font-size: 12px;
	font-weight: 500;
	line-height: 1.5;
	user-select: none;
	white-space: nowrap;
	color: ${s("textSecondary")};
	background: ${({ $color, theme }) =>
		$color ? `${$color}22` : theme.listItemHoverBackground};
	border: 1px solid
		${({ $color, theme }) => $color ?? theme.inputBorder};
`;

const Label = styled.span`
	max-width: 120px;
	overflow: hidden;
	text-overflow: ellipsis;
`;

const RemoveButton = styled.button`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	background: none;
	border: none;
	padding: 0;
	cursor: pointer;
	color: ${s("textTertiary")};
	flex-shrink: 0;

	&:hover {
		color: ${s("text")};
	}
`;

export default TagBadge;
