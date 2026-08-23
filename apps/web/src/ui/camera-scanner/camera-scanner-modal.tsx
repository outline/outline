import { Html5Qrcode } from "html5-qrcode";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Modal } from "@/ui/modal/modal";
import { parseScanResult } from "./parse-scan-result";

export type TCameraScannerModalProps = {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onScanSuccess: (result: {
		productId?: string;
		barcode?: string;
	}) => void;
	readonly title?: string;
};

export const CameraScannerModal = ({
	isOpen,
	onClose,
	onScanSuccess,
	title = "Scan QR / Barcode Produk",
}: TCameraScannerModalProps) => {
	const [hasPermission, setHasPermission] = useState<boolean | null>(null);
	const [isScanning, setIsScanning] = useState(false);
	const qrCodeRef = useRef<Html5Qrcode | null>(null);
	const containerId = "camera-scanner-reader-view";

	const handleScan = useCallback(
		(decodedText: string) => {
			// Stop scanning immediately upon detection to avoid multiple scans
			if (qrCodeRef.current?.isScanning) {
				qrCodeRef.current
					.stop()
					.then(() => {
						setIsScanning(false);
						onScanSuccess(parseScanResult(decodedText));
						onClose();
					})
					.catch((err) => {
						console.error("Failed to stop scanning:", err);
						onClose();
					});
			}
		},
		[onScanSuccess, onClose],
	);

	useEffect(() => {
		if (!isOpen) return;

		// Delay instantiation slightly to ensure DOM element is mounted
		const timer = setTimeout(() => {
			try {
				const html5Qrcode = new Html5Qrcode(containerId);
				qrCodeRef.current = html5Qrcode;

				html5Qrcode
					.start(
						{ facingMode: "environment" },
						{
							fps: 10,
							qrbox: (width, height) => {
								const size = Math.min(width, height) * 0.7;
								return { width: size, height: size };
							},
						},
						(decodedText) => {
							handleScan(decodedText);
						},
						() => {
							// Silent error for continuous frame scanning failures
						},
					)
					.then(() => {
						setHasPermission(true);
						setIsScanning(true);
					})
					.catch((err) => {
						console.error("Camera scan start error:", err);
						setHasPermission(false);
						toast.error("Gagal membuka kamera", {
							description: "Pastikan Anda memberikan izin akses kamera.",
						});
					});
			} catch (e) {
				console.error("Failed to initialize Html5Qrcode:", e);
			}
		}, 300);

		return () => {
			clearTimeout(timer);
			if (qrCodeRef.current) {
				const q = qrCodeRef.current;
				if (q.isScanning) {
					q.stop()
						.then(() => {
							q.clear();
						})
						.catch((err) =>
							console.error("Error during unmount scan stop:", err),
						);
				}
			}
		};
	}, [isOpen, handleScan]);

	return (
		<Modal isOpen={isOpen} onClose={onClose} title={title}>
			<div className="flex flex-col items-center justify-center space-y-4">
				<div className="relative w-full aspect-square max-w-sm overflow-hidden bg-black rounded-2xl ring-1 ring-neutral-200 shadow-inner flex items-center justify-center">
					{/* Scanner Element target */}
					<div
						id={containerId}
						className="w-full h-full [&_video]:object-cover"
					/>

					{isScanning && (
						<>
							{/* Scanning Target Overlay UI */}
							<div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
								<div className="w-[70%] h-[70%] border-2 border-mint-green/80 rounded-lg relative">
									{/* Corner accents */}
									<div className="absolute -top-1.5 -left-1.5 w-4 h-4 border-t-4 border-l-4 border-mint-green" />
									<div className="absolute -top-1.5 -right-1.5 w-4 h-4 border-t-4 border-r-4 border-mint-green" />
									<div className="absolute -bottom-1.5 -left-1.5 w-4 h-4 border-b-4 border-l-4 border-mint-green" />
									<div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 border-b-4 border-r-4 border-mint-green" />
								</div>
							</div>

							{/* Animated Laser beam */}
							<div className="absolute left-10 right-10 top-1/2 h-0.5 bg-mint-green/80 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse pointer-events-none" />
						</>
					)}

					{hasPermission === false && (
						<div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-neutral-900/90 rounded-2xl">
							<p className="font-semibold text-sm mb-2 text-rose-400">
								Akses Kamera Ditolak
							</p>
							<p className="text-xs text-neutral-400">
								Mohon izinkan akses kamera di pengaturan browser Anda untuk
								memindai kode produk.
							</p>
						</div>
					)}
				</div>

				<div className="text-center">
					<p className="text-xs text-neutral-500 max-w-xs">
						Arahkan kamera ke QR Code atau Barcode produk untuk memindai secara
						otomatis.
					</p>
				</div>

				<Button variant="outline" className="w-full" onClick={onClose}>
					Batal
				</Button>
			</div>
		</Modal>
	);
};

export const useScanner = () => {
	const [isOpen, setIsOpen] = useState(false);

	const openScanner = useCallback(() => {
		setIsOpen(true);
	}, []);

	const closeScanner = useCallback(() => {
		setIsOpen(false);
	}, []);

	return {
		isOpen,
		openScanner,
		closeScanner,
	};
};
