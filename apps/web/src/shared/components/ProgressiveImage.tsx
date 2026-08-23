import { useState } from "react";

interface ProgressiveImageProps {
	webpSrc: string;
	pngSrc: string;
	alt: string;
	className?: string;
	shouldHaveInitialFade?: boolean;
	priority?: boolean;
}

export function ProgressiveImage({
	webpSrc,
	pngSrc,
	alt,
	className = "object-cover",
	shouldHaveInitialFade = false,
}: ProgressiveImageProps) {
	const [initialLoaded, setInitialLoaded] = useState(false);
	const [loaded, setLoaded] = useState(false);

	return (
		<div className="relative h-full w-full">
			{/* Base WEBP visible immediately */}
			<picture>
				<source srcSet={webpSrc} type="image/webp" />
				<img
					src={pngSrc}
					alt={`${alt} webp`}
					loading={shouldHaveInitialFade ? "lazy" : "eager"}
					onLoad={() => setInitialLoaded(true)}
					className={`absolute inset-0 h-full w-full ${className} transition duration-200 ${initialLoaded || !shouldHaveInitialFade ? "opacity-100" : "opacity-0"}`}
				/>
			</picture>

			{/* PNG fades in later */}
			<img
				src={pngSrc}
				alt={`${alt} png`}
				loading="lazy"
				onLoad={() => setLoaded(true)}
				className={`absolute inset-0 h-full w-full ${className} transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
			/>
		</div>
	);
}
