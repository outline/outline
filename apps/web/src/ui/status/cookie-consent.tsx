import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "@/shared/utils";

export function CookieConsent() {
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		const consent = Cookie.get("cookie-consent");
		if (!consent) {
			const timer = setTimeout(() => setIsVisible(true), 1500);
			return () => clearTimeout(timer);
		}
		return undefined;
	}, []);

	const handleAccept = () => {
		Cookie.set("cookie-consent", "true", 365);
		setIsVisible(false);
	};
	if (!isVisible) return null;

	return (
		<div className="fixed bottom-6 left-6 z-[60] w-[calc(100vw-3rem)] max-w-sm animate-in slide-in-from-left-4 duration-500">
			<div className="rounded-lg border border-neutral-200 bg-white p-6 ">
				<div className="flex items-start gap-4">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
						<img
							src="/assets/cookie-icon.webp"
							alt="Cookie"
							className="h-full w-full object-cover"
						/>
					</div>
					<div className="flex-1">
						<p className="text-[14px] font-bold text-neutral-900">
							Cookie & Privasi
						</p>
						<p className="mt-1 text-[12px] leading-relaxed text-neutral-500">
							Kami menggunakan cookie untuk memberikan pengalaman terbaik di
							platform kami.
						</p>
						<div className="mt-4 flex gap-2">
							<Button size="sm" onClick={handleAccept} className="px-6">
								Setuju
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsVisible(false)}
							>
								Nanti
							</Button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
