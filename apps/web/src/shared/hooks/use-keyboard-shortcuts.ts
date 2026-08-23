import { useNavigate } from "@tanstack/react-router";
import * as React from "react";

/**
 * Hook to handle global keyboard shortcuts for the authenticated layout
 */
export const useKeyboardShortcuts = () => {
	const navigate = useNavigate();

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Only trigger if not typing in an input/textarea
			if (
				document.activeElement?.tagName === "INPUT" ||
				document.activeElement?.tagName === "TEXTAREA" ||
				(document.activeElement as HTMLElement)?.isContentEditable
			) {
				return;
			}

			const isModifier = e.metaKey || e.ctrlKey;
			if (!isModifier) return;

			switch (e.key.toLowerCase()) {
				case "d":
					e.preventDefault();
					navigate({ to: "/docs" });
					break;
				case "f":
					e.preventDefault();
					navigate({ to: "/contact" });
					break;
				case "h":
					e.preventDefault();
					navigate({ to: "/docs" });
					break;
				case "p":
					e.preventDefault();
					navigate({ to: "/profile" });
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [navigate]);
};
