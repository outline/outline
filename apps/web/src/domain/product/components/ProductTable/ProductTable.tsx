import { QrCode as QrCodeIcon } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
	BoxMinimalisticLinear as BoxIcon,
	DownloadSquareLinear as DownloadIcon,
	PenNewSquareLinear as Pencil,
	PrinterLinear as PrintIcon,
	TrashBinMinimalisticLinear as Trash,
} from "solar-icon-set";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { TProductDto } from "@/domain/product";
import { usePagination } from "@/hooks/use-pagination";
import { useSession } from "@/shared/hooks";
import { useLanguage } from "@/shared/i18n";
import { PublicLinkUtils } from "@/shared/utils";
import { formatCurrency, formatNumber } from "@/shared/utils/format";
import { Button, StatusBadge, Table, TableCell, TableRow } from "@/ui";
import { TablePagination } from "@/ui/table/table-pagination";

export type TProductTableProps = {
	readonly products: readonly TProductDto[];
	readonly onEdit: (product: TProductDto) => void;
	readonly onDelete: (product: TProductDto) => void;
	readonly onManageStock?: (product: TProductDto) => void;
};

export const ProductTable = ({
	products,
	onEdit,
	onDelete,
	onManageStock,
}: TProductTableProps) => {
	const { language } = useLanguage();
	const { t } = useTranslation();
	const { session } = useSession();
	const { paginatedData, ...pagination } = usePagination(products);
	const [selectedProduct, setSelectedProduct] =
		React.useState<TProductDto | null>(null);

	const HEADERS = [
		t("product.name_label"),
		t("product.sku_label"),
		t("common.price"),
		t("product.stock_label"),
		"",
	];

	const handlePrintQR = () => {
		const printWindow = window.open("", "_blank");
		if (!printWindow) return;

		const qrElement = document.getElementById("qr-to-print");
		if (!qrElement) return;

		const qrHtml = qrElement.outerHTML;

		printWindow.document.write(`
			<html>
				<head>
					<title>${t("product.print_qr")} - ${selectedProduct?.name}</title>
					<style>
						body { 
							display: flex; 
							flex-direction: column; 
							align-items: center; 
							justify-content: center; 
							height: 100vh; 
							margin: 0; 
							font-family: sans-serif;
						}
						.label { 
							text-align: center; 
							border: 1px solid #eee; 
							padding: 20px; 
							border-radius: 8px;
						}
						h2 { margin: 10px 0 5px 0; font-size: 16px; }
						p { margin: 0; font-size: 12px; color: #666; }
						svg { width: 200px; height: 200px; }
					</style>
				</head>
				<body>
					<div class="label">
						${qrHtml}
						<h2>${selectedProduct?.name}</h2>
						<p>${selectedProduct?.variants[0]?.sku || ""}</p>
					</div>
					<script>
						window.onload = () => {
							window.print();
							window.close();
						};
					</script>
				</body>
			</html>
		`);
		printWindow.document.close();
	};

	const handleDownloadQR = () => {
		const svgElement = document.querySelector(
			"#qr-to-print svg",
		) as SVGElement | null;
		if (!svgElement) return;

		const svgData = new XMLSerializer().serializeToString(svgElement);
		const canvas = document.createElement("canvas");
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const size = 300;
		canvas.width = size;
		canvas.height = size;

		const img = new Image();
		img.onload = () => {
			ctx.fillStyle = "white";
			ctx.fillRect(0, 0, size, size);
			ctx.drawImage(img, 0, 0, size, size);

			const pngFile = canvas.toDataURL("image/png");
			const downloadLink = document.createElement("a");
			downloadLink.download = `QR-${selectedProduct?.variants[0]?.sku || selectedProduct?.name}.png`;
			downloadLink.href = pngFile;
			downloadLink.click();
		};

		img.src =
			"data:image/svg+xml;base64," +
			btoa(unescape(encodeURIComponent(svgData)));
	};

	return (
		<>
			<Table headers={HEADERS}>
				{paginatedData.map((product) => (
					<TableRow key={product.id}>
						<TableCell>
							<div className="font-bold text-neutral-900">{product.name}</div>
						</TableCell>
						<TableCell>
							<span className="text-neutral-500 font-medium">
								{product.variants[0]?.sku || "-"}
							</span>
						</TableCell>
						<TableCell>
							{formatCurrency(product.variants[0]?.price || 0, language)}
						</TableCell>
						<TableCell>
							{product.variants[0]?.isOutOfStock ? (
								<StatusBadge type="error" label={t("product.out_of_stock")} />
							) : product.variants[0]?.isLowStock ? (
								<StatusBadge
									type="warning"
									label={`${t("dashboard.low_stock")} (${formatNumber(product.variants[0]?.stock || 0)})`}
								/>
							) : (
								<StatusBadge
									type="success"
									label={formatNumber(product.variants[0]?.stock || 0)}
								/>
							)}
						</TableCell>
						<TableCell align="right">
							<div className="flex items-center justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setSelectedProduct(product)}
									className="h-8 w-8 p-0 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 border-transparent"
									title={t("product.qr_code")}
								>
									<QrCodeIcon className="w-4 h-4" />
								</Button>
								{onManageStock && (
									<Button
										variant="outline"
										size="sm"
										onClick={() => onManageStock(product)}
										className="h-8 w-8 p-0"
										title="Kelola Stok / Batch"
									>
										<BoxIcon className="w-4 h-4" />
									</Button>
								)}
								<Button
									variant="outline"
									size="sm"
									onClick={() => onEdit(product)}
									className="h-8 w-8 p-0"
								>
									<Pencil className="w-4 h-4" />
								</Button>
								<Button
									variant="outline"
									size="sm"
									onClick={() => onDelete(product)}
									className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 border-transparent"
								>
									<Trash className="w-4 h-4" />
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</Table>
			{products.length > 0 && <TablePagination {...pagination} />}

			<Dialog
				open={!!selectedProduct}
				onOpenChange={(open) => !open && setSelectedProduct(null)}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>{t("product.qr_code")}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col items-center justify-center py-8 space-y-6">
						<div
							className="bg-white p-4 rounded-2xl shadow-sm ring-1 ring-neutral-100"
							id="qr-to-print"
						>
							{selectedProduct && (
								<QRCodeSVG
									value={PublicLinkUtils.getProductLink(
										window.location.origin,
										session?.businessId || "",
										selectedProduct.id,
									)}
									size={200}
									level="H"
									includeMargin
								/>
							)}
						</div>
						<div className="text-center">
							<h3 className="font-bold text-lg text-neutral-900">
								{selectedProduct?.name}
							</h3>
							<p className="text-neutral-500 text-sm">
								{selectedProduct?.variants[0]?.sku ||
									t("product.no_sku", "No SKU")}
							</p>
						</div>
						<div className="flex gap-3 w-full">
							<Button
								onClick={handlePrintQR}
								className="flex-1"
								variant="outline"
							>
								<PrintIcon className="w-4 h-4 mr-2" />
								{t("product.print_qr")}
							</Button>
							<Button onClick={handleDownloadQR} className="flex-1">
								<DownloadIcon className="w-4 h-4 mr-2" />
								{t("common.download", "Unduh")}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};
