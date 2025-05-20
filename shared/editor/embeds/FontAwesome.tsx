import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { EmbedProps } from ".";
import styled from "styled-components";

// Add all icons to the library
library.add(fas, fab);

// Styled component for inline display
const InlineIconWrapper = styled.span`
	display: inline-flex;
	align-items: center;
	vertical-align: middle;
	margin: 0 0.1em;
	color: ${(props) => props.color || "currentColor"};
`;

// Mapping from fontawesome URL style parameters to icon prefixes
const STYLE_TO_PREFIX = {
	solid: "fas",
	regular: "far",
	light: "fal",
	thin: "fat",
	duotone: "fad",
	brands: "fab"
};

// Use forwardRef to properly handle ref passing
const FontAwesomeEmbed = React.forwardRef((props: EmbedProps, ref) => {
	const { embed, attrs } = props;

	try {
		// Extract icon name from the URL path
		const url = new URL(attrs.href);
		const pathParts = url.pathname.split('/');
		const iconName = pathParts[pathParts.indexOf("icons") + 1];

		// Extract style from query parameters (f=classic&s=solid)
		const style = url.searchParams.get("s") || "solid";
		const family = url.searchParams.get("f") || "classic";

		// Get size and color from optional parameters
		const size = url.searchParams.get("size") || "1x"; // Default to smaller size for inline
		const color = url.searchParams.get("color") || undefined;

		// Map style to proper prefix
		const prefix = STYLE_TO_PREFIX[style] || "fas";

		// Use array format for icon to ensure proper parsing
		const iconArray = [prefix, iconName] as const;

		return (
			<InlineIconWrapper ref={ref} color={color}>
				<FontAwesomeIcon icon={iconArray} size={size as any} />
			</InlineIconWrapper>
		);
	} catch (error) {
		// Fallback if URL parsing fails
		return (
			<InlineIconWrapper ref={ref}>
				<FontAwesomeIcon icon={["fas", "question"]} />
			</InlineIconWrapper>
		);
	}
});

// Add a display name for debugging
FontAwesomeEmbed.displayName = "FontAwesomeEmbed";

export default FontAwesomeEmbed;