import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LockKeyholeMinimalisticLinear as LockIcon } from "solar-icon-set";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { verifyPin as verifyPinFn } from "@/lib/api/user.functions";
import { extractErrorMessage } from "@/shared/utils/error";

export function PinLockScreen({ onUnlock }: { onUnlock: () => void }) {
	const { t } = useTranslation();
	const [pin, setPin] = useState("");
	const [isError, setIsError] = useState(false);

	const verifyMutation = useMutation({
		mutationFn: (currentPin: string) =>
			verifyPinFn({ data: { pin: currentPin } }),
		onSuccess: (isValid) => {
			if (isValid) {
				onUnlock();
			} else {
				setIsError(true);
				setPin("");
				toast.error(t("security.incorrect_pin"), {
					description: t("security.incorrect_pin_desc"),
				});
			}
		},
		onError: (err) => {
			setIsError(true);
			setPin("");
			toast.error(extractErrorMessage(err, t("common.error")));
		},
	});

	const handleNumberInput = useCallback(
		(num: string) => {
			if (verifyMutation.isPending) return;
			setPin((prev) => {
				if (prev.length < 6) {
					const newPin = prev + num;
					setIsError(false);
					if (newPin.length === 6) {
						verifyMutation.mutate(newPin);
					}
					return newPin;
				}
				return prev;
			});
		},
		[verifyMutation],
	);

	const handleDelete = useCallback(() => {
		setPin((prev) => prev.slice(0, -1));
		setIsError(false);
	}, []);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key >= "0" && e.key <= "9") {
				handleNumberInput(e.key);
			} else if (e.key === "Backspace") {
				handleDelete();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNumberInput, handleDelete]);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
			<div className="bg-white p-8 rounded-3xl shadow-2xl w-[320px] flex flex-col items-center animate-in zoom-in-95 duration-300">
				<div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
					<LockIcon className="w-8 h-8 text-rose-500" />
				</div>
				<h2 className="text-xl font-bold text-neutral-900 mb-1">
					{t("security.app_locked_title")}
				</h2>
				<p className="text-sm text-neutral-500 mb-6 text-center leading-relaxed">
					{t("security.app_locked_desc")}
				</p>

				<div className="flex gap-3 mb-8">
					{[...Array(6)].map((_, i) => (
						<div
							key={i}
							className={`w-4 h-4 rounded-full transition-all duration-200 ${
								i < pin.length ? "bg-neutral-900 scale-110" : "bg-neutral-200"
							} ${isError ? "bg-rose-500 animate-bounce" : ""}`}
						/>
					))}
				</div>

				<div className="grid grid-cols-3 gap-4 w-full">
					{[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
						<button
							key={num}
							type="button"
							onClick={() => handleNumberInput(num.toString())}
							className="h-14 bg-neutral-50 hover:bg-neutral-100 active:scale-95 rounded-full text-xl font-medium text-neutral-900 transition-all"
						>
							{num}
						</button>
					))}
					<div />
					<button
						type="button"
						onClick={() => handleNumberInput("0")}
						className="h-14 bg-neutral-50 hover:bg-neutral-100 active:scale-95 rounded-full text-xl font-medium text-neutral-900 transition-all"
					>
						0
					</button>
					<button
						type="button"
						onClick={handleDelete}
						className="h-14 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-full text-sm font-medium transition-all active:scale-95"
					>
						{t("security.delete")}
					</button>
				</div>

				<Button
					variant="link"
					className="mt-6 text-neutral-500 text-xs hover:text-neutral-900"
				>
					{t("security.forgot_pin")}
				</Button>
			</div>
		</div>
	);
}
