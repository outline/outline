import { MIDTRANS_CONFIG } from "@/lib/constants";
import type { MidtransResult } from "@/lib/types";

// Re-export for backward compatibility
export { MIDTRANS_CONFIG };

// Type declaration for Midtrans Snap.js
declare global {
	interface Window {
		snap?: {
			pay: (
				token: string,
				callbacks: {
					onSuccess?: (result: MidtransResult) => void;
					onPending?: (result: MidtransResult) => void;
					onError?: (result: MidtransResult) => void;
					onClose?: () => void;
				},
			) => void;
		};
	}
}

export interface MidtransTransactionParams {
	order_id: string;
	gross_amount: number;
	customer_details: {
		first_name: string;
		last_name?: string;
		email: string;
		phone?: string;
	};
	item_details?: {
		id: string;
		price: number;
		quantity: number;
		name: string;
	}[];
	callbacks?: {
		finish?: string;
		unfinish?: string;
		error?: string;
		pending?: string;
	};
}

export interface MidtransSnapResponse {
	token: string;
	redirect_url: string;
}

// Load Snap.js dynamically
export function loadSnapJs(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (typeof window !== "undefined" && window.snap) {
			resolve();
			return;
		}

		const script = document.createElement("script");
		script.src = MIDTRANS_CONFIG.snapUrl;
		script.setAttribute("data-client-key", MIDTRANS_CONFIG.clientKey);
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Failed to load Midtrans Snap.js"));
		document.head.appendChild(script);
	});
}

// Open Snap payment popup
export async function openSnapPayment(
	token: string,
	callbacks: {
		onSuccess?: (result: MidtransResult) => void;
		onPending?: (result: MidtransResult) => void;
		onError?: (result: MidtransResult) => void;
		onClose?: () => void;
	},
): Promise<void> {
	await loadSnapJs();

	if (!window.snap) {
		throw new Error("Midtrans Snap.js failed to load");
	}

	window.snap.pay(token, {
		onSuccess: (result) => {
			callbacks.onSuccess?.(result);
		},
		onPending: (result) => {
			callbacks.onPending?.(result);
		},
		onError: (result) => {
			callbacks.onError?.(result);
		},
		onClose: () => {
			callbacks.onClose?.();
		},
	});
}
