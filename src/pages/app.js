import React from "react";
import OutlineIndex from 'outline/index';

export default function App() {
	const isSsr = typeof window === 'undefined';

	return (
		<div id="root">
			{isSsr ? (
				<></>
			) : (
				<OutlineIndex/>
			)}
		</div>
	);
}
