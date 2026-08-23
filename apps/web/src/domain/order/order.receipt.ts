import { BUSINESS_RULES, EXTERNAL_URLS, RECEIPT_CONFIG } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/shared/utils";

export interface TReceiptData {
	readonly orderId: string;
	readonly businessName: string;
	readonly branchName: string;
	readonly items: readonly {
		readonly name: string;
		readonly quantity: number;
		readonly price: number;
	}[];
	readonly total: number;
	readonly paymentMethod: string;
	readonly createdAt: Date;
	readonly cashierName?: string;
}

export interface TReceiptTemplate {
	readonly header?: string;
	readonly footer?: string;
	readonly showLogo?: boolean;
	readonly showCashier?: boolean;
	readonly showBranch?: boolean;
}

export function generateReceiptText(
	data: TReceiptData,
	template?: TReceiptTemplate,
): string {
	const lines: string[] = [];
	const separator = RECEIPT_CONFIG.SEPARATOR_CHAR.repeat(
		RECEIPT_CONFIG.CHARACTER_WIDTH,
	);
	const dash = RECEIPT_CONFIG.DASH_CHAR.repeat(RECEIPT_CONFIG.CHARACTER_WIDTH);

	lines.push(separator);
	lines.push(
		centerText(data.businessName.toUpperCase(), RECEIPT_CONFIG.CHARACTER_WIDTH),
	);
	if (data.branchName && template?.showBranch !== false) {
		lines.push(centerText(data.branchName, RECEIPT_CONFIG.CHARACTER_WIDTH));
	}
	lines.push(separator);
	lines.push("");

	if (template?.header) {
		lines.push(centerText(template.header, RECEIPT_CONFIG.CHARACTER_WIDTH));
		lines.push("");
	}

	lines.push(
		`No: ${data.orderId.slice(0, RECEIPT_CONFIG.CHARACTER_WIDTH - 20)}`,
	);
	lines.push(
		`Tanggal: ${formatDate(data.createdAt, "id", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
	);

	if (template?.showCashier !== false) {
		lines.push(`Kasir: ${data.cashierName || "-"}`);
	}

	lines.push(
		`Pembayaran: ${RECEIPT_CONFIG.PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}`,
	);
	lines.push(dash);
	lines.push("");

	for (const item of data.items) {
		lines.push(item.name);
		lines.push(
			`  ${item.quantity} x ${formatCurrency(item.price)}    ${formatCurrency(item.quantity * item.price)}`,
		);
	}

	lines.push(dash);
	lines.push(`TOTAL                      ${formatCurrency(data.total)}`);
	lines.push(separator);
	lines.push("");

	if (template?.footer) {
		lines.push(centerText(template.footer, RECEIPT_CONFIG.CHARACTER_WIDTH));
	} else {
		lines.push(
			centerText(
				RECEIPT_CONFIG.MESSAGES.THANK_YOU,
				RECEIPT_CONFIG.CHARACTER_WIDTH,
			),
		);
		lines.push(
			centerText(
				RECEIPT_CONFIG.MESSAGES.PET_HAPPY,
				RECEIPT_CONFIG.CHARACTER_WIDTH,
			),
		);
	}
	lines.push("");

	return lines.join("\n");
}

export function generateReceiptHTML(
	data: TReceiptData,
	template?: TReceiptTemplate,
	logoUrl?: string | null,
): string {
	const headerText = template?.header || "Terima kasih atas kunjungan Anda!";
	const footerText = template?.footer || "Hewan peliharaan Anda senang :)";

	return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Struk - ${data.orderId}</title>
  <style>
    @media print {
      body { width: 80mm; margin: 0; padding: 0; }
      .no-print { display: none; }
    }
    body {
      font-family: 'Courier New', monospace;
      width: 80mm;
      margin: 0 auto;
      padding: 10px;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
    }
    .center { text-align: center; }
    .separator { border-top: 1px dashed #000; margin: 8px 0; }
    .bold { font-weight: bold; }
    .item-row { display: flex; justify-content: space-between; }
    .total-row { 
      display: flex; 
      justify-content: space-between; 
      font-weight: bold;
      font-size: 14px;
      margin-top: 8px;
      border-top: 2px solid #000;
      padding-top: 8px;
    }
    .logo { max-width: 50px; margin-bottom: 5px; }
  </style>
</head>
<body>
  ${template?.showLogo !== false && logoUrl ? `<div class="center"><img src="${logoUrl}" class="logo" /></div>` : ""}
  <div class="center bold">${data.businessName.toUpperCase()}</div>
  ${data.branchName && template?.showBranch !== false ? `<div class="center">${data.branchName}</div>` : ""}
  <div class="separator"></div>
  
  <div class="center" style="margin-bottom: 8px;">${headerText}</div>

  <div>No: ${data.orderId.slice(0, 12)}</div>
  <div>Tanggal: ${formatDate(data.createdAt, "id", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
  ${template?.showCashier !== false ? `<div>Kasir: ${data.cashierName || "-"}</div>` : ""}
  <div>Bayar: ${RECEIPT_CONFIG.PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</div>
  <div class="separator"></div>
  ${data.items
		.map(
			(item) => `
    <div>${item.name}</div>
    <div class="item-row">
      <span>${item.quantity} x ${formatCurrency(item.price)}</span>
      <span>${formatCurrency(item.quantity * item.price)}</span>
    </div>
  `,
		)
		.join("")}
  <div class="separator"></div>
  <div class="total-row">
    <span>TOTAL</span>
    <span>${formatCurrency(data.total)}</span>
  </div>
  <div class="separator"></div>
  <div class="center">${footerText}</div>
</body>
</html>`;
}

export function printReceipt(
	data: TReceiptData,
	template?: TReceiptTemplate,
	logoUrl?: string | null,
): void {
	const html = generateReceiptHTML(data, template, logoUrl);
	const printWindow = window.open("", "_blank", "width=400,height=600");

	if (printWindow) {
		printWindow.document.write(html);
		printWindow.document.close();
		printWindow.onload = () => {
			printWindow.print();
		};
	}
}

export function shareViaWhatsApp(
	data: TReceiptData,
	template?: TReceiptTemplate,
	phoneNumber?: string,
): void {
	const text = generateReceiptText(data, template);
	const encodedText = encodeURIComponent(
		`${RECEIPT_CONFIG.MESSAGES.WHATSAPP_SHARE_PREFIX} ${data.businessName}*\n\n${text}`,
	);

	const whatsappUrl = phoneNumber
		? `${EXTERNAL_URLS.whatsapp.sendUrl}/${phoneNumber}?text=${encodedText}`
		: `${EXTERNAL_URLS.whatsapp.sendUrl}/?text=${encodedText}`;

	window.open(whatsappUrl, "_blank");
}

export function downloadReceiptPDF(data: TReceiptData): void {
	const html = generateReceiptHTML(data);
	const blob = new Blob([html], { type: "text/html" });
	const url = URL.createObjectURL(blob);

	const a = document.createElement("a");
	a.href = url;
	a.download = `receipt-${data.orderId.slice(0, BUSINESS_RULES.ORDER_ID_DISPLAY_LENGTH)}.html`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function centerText(text: string, width: number): string {
	if (text.length >= width) return text;
	const padding = Math.floor((width - text.length) / 2);
	return " ".repeat(padding) + text;
}
