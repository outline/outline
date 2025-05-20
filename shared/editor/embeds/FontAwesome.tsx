import * as React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { fas } from "@fortawesome/free-solid-svg-icons";
import { fab } from "@fortawesome/free-brands-svg-icons";
import { EmbedProps } from ".";
import styled from "styled-components";

// Add all icons to the library
library.add(fas, fab);

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1em;
`;

const IconContainer = styled.div`
    font-size: ${(props) => props.size || "3em"};
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
		const size = url.searchParams.get("size") || "3x";
		const color = url.searchParams.get("color") || undefined;

		// Map style to proper prefix
		const prefix = STYLE_TO_PREFIX[style] || "fas";

		// Use array format for icon to ensure proper parsing
		const iconArray = [prefix, iconName] as const;

		return (
			<Container ref={ref}>
				<IconContainer size={size} color={color}>
					<FontAwesomeIcon icon={iconArray} size={size as any} />
				</IconContainer>
			</Container>
		);
	} catch (error) {
		// Fallback if URL parsing fails
		return (
			<Container ref={ref}>
				<IconContainer>
					<FontAwesomeIcon icon={["fas", "question"]} />
				</IconContainer>
			</Container>
		);
	}
});

// Add a display name for debugging
FontAwesomeEmbed.displayName = "FontAwesomeEmbed";

export default FontAwesomeEmbed;