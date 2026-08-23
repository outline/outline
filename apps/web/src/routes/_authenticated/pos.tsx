import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import {
	ExportLinear as ExportIcon,
	ImportLinear as ImportIcon,
	MenuDotsLinear as MoreIcon,
	NotebookLinear as NotebookIcon,
	QRCodeLinear as QrCodeIcon,
	ChartLinear as ReportIcon,
	MagniferLinear as SearchIcon,
} from "solar-icon-set";
import { toast } from "@/components/ui";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CreateOrderCommand, TOrderDto } from "@/domain/order";
import {
	POSCart,
	POSCheckoutModal,
	POSProductGrid,
	POSSuccessModal,
	type TCartItem,
	usePOSCart,
	VariantPicker,
} from "@/domain/order";
import { DraftsModal } from "@/domain/order/components/POS/DraftsModal/DraftsModal";
import { POSLoading } from "@/domain/order/components/POS/POSLoading";
import {
	printReceipt,
	shareViaWhatsApp,
	type TReceiptData,
} from "@/domain/order/order.receipt";
import type { TProductDto } from "@/domain/product";
import { createCustomer, getCustomers } from "@/lib/api/customer.functions";
import { getTemplateByType } from "@/lib/api/document-template.functions";
import { createOrder } from "@/lib/api/orders.functions";
import { getProducts, importProducts } from "@/lib/api/products.functions";
import { APP_CONFIG } from "@/lib/constants";
import { exportToCSV } from "@/lib/export.functions";
import { generatePDFReport } from "@/lib/report.functions";
import { QUERY_POLICY } from "@/shared/cache/cache-policy";
import { queryKeys } from "@/shared/cache/query-keys";
import { useLimits, useSession } from "@/shared/hooks";
import { i18n } from "@/shared/i18n/i18n.config";
import { formatDate } from "@/shared/utils";
import { extractErrorMessage } from "@/shared/utils/error";
import { Button, CameraScannerModal, ImportModal, useScanner } from "@/ui";

export const Route = createFileRoute("/_authenticated/pos")({
	head: () => ({
		meta: [
			{ title: `${i18n.t("pos.title")} — ${APP_CONFIG.name}` },
			{
				name: "description",
				content: i18n.t("pos.description"),
			},
		],
	}),
	component: POSPage,
});

function POSPage() {
	const { session } = useSession();
	const { t } = useTranslation();
	const _queryClient = useQueryClient();
	const {
		cart,
		customerId,
		subtotalAmount,
		totalAmount,
		globalDiscountType,
		globalDiscountValue,
		globalDiscountAmount,
		addToCart,
		removeFromCart,
		updateQuantity,
		setCustomerId,
		loadCart,
		clearCart,
		setItemDiscount,
	} = usePOSCart();

	const [products, setProducts] = useState<readonly TProductDto[]>([]);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<TProductDto | null>(
		null,
	);
	const [lastOrder, setLastOrder] = useState<{
		total: number;
		items: readonly TCartItem[];
		paymentMethod: string;
	} | null>(null);
	const [isSuccessOpen, setIsSuccessOpen] = useState(false);
	const [isImportOpen, setIsImportOpen] = useState(false);
	const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
	const [isDraftsOpen, setIsDraftsOpen] = useState(false);
	const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
	const { checkLimit, showUpgradeModal } = useLimits();

	const branches = session?.branches ?? [];
	// Default the active branch to the first one this user belongs to, once
	// the session resolves. Kept as its own effect so switching stays a pure
	// user action afterwards.
	useEffect(() => {
		if (!selectedBranchId && branches.length > 0) {
			setSelectedBranchId(branches[0]?.id ?? null);
		}
	}, [branches, selectedBranchId]);

	const activeBranch =
		branches.find((b) => b.id === selectedBranchId) ?? branches[0] ?? null;

	const importMutation = useMutation({
		mutationFn: importProducts,
		onSuccess: () => {
			toast.success(t("toast.product.import_success_title"), {
				description: "Import produk sedang diproses di latar belakang.",
			});
			setTimeout(() => {
				loadProducts();
			}, 2000);
			setIsImportOpen(false);
		},
		onError: (error) => {
			toast.error(t("toast.product.delete_error_title"), {
				description: extractErrorMessage(error, t("common.error")),
			});
		},
	});

	const { data: customers = [] } = useQuery({
		queryKey: queryKeys.pos.customers(),
		queryFn: async () => await getCustomers(),
		staleTime: QUERY_POLICY.realtime.staleTime,
		gcTime: QUERY_POLICY.realtime.gcTime,
	});

	const handleCreateCustomer = useCallback(
		async (fullName: string, phone: string) => {
			try {
				const created = await createCustomer({ data: { fullName, phone } });
				await _queryClient.invalidateQueries({
					queryKey: queryKeys.pos.customers(),
				});
				setCustomerId(created.id);
				toast.success(i18n.t("common.success_title"), {
					description: t(
						"toast.customer.create_success_desc",
						"Pelanggan baru ditambahkan",
					),
				});
			} catch (error) {
				toast.error(i18n.t("common.error_title"), {
					description: extractErrorMessage(error, t("common.error")),
				});
			}
		},
		[_queryClient, setCustomerId, t],
	);

	const loadProducts = useCallback(async () => {
		try {
			setLoading(true);
			const data = await getProducts();
			setProducts(data);
		} catch (error) {
			console.error("[pos.tsx] loadProducts failed:", error);
			toast.error(i18n.t("common.error_title"), {
				description: t("pos.load_error"),
			});
		} finally {
			setLoading(false);
		}
	}, [t]);

	const handleCheckout = useCallback(() => {
		if (cart.length === 0) return;
		if (!checkLimit("transactions")) {
			showUpgradeModal("transactions");
			return;
		}
		if (!activeBranch?.id) {
			toast.error(i18n.t("common.error_title"), {
				description: t("pos.branch_not_found"),
			});
			return;
		}
		setIsCheckoutOpen(true);
	}, [cart, activeBranch, t, checkLimit, showUpgradeModal]);

	const handleConfirmCheckout = useCallback(
		async (payload: {
			status: "completed" | "draft";
			payments: { method: "cash" | "transfer" | "qris"; amount: number }[];
			discountType: "percentage" | "fixed" | null;
			discountValue: number;
			discountAmount: number;
		}) => {
			if (cart.length === 0) return;
			if (!activeBranch?.id) {
				toast.error(i18n.t("common.error_title"), {
					description: t("pos.branch_not_found"),
				});
				return;
			}

			try {
				setProcessing(true);
				const command: CreateOrderCommand = {
					branchId: activeBranch.id,
					customerId,
					status: payload.status,
					discountType: payload.discountType,
					discountValue: payload.discountValue,
					discountAmount: payload.discountAmount,
					payments: payload.payments,
					items: cart.map((item) => ({
						productId: item.productId,
						variantId: item.variantId,
						unit: item.unit,
						quantity: item.cartQuantity,
						priceAtTime: item.price,
					})),
				};

				await createOrder({ data: command });

				setLastOrder({
					total: totalAmount,
					items: [...cart],
					paymentMethod: payload.payments?.[0]?.method || "cash",
				});
				if (payload.status === "completed") {
					setIsSuccessOpen(true);
				} else {
					toast.success(i18n.t("common.success_title"), {
						description: t("pos.draft_saved"),
					});
				}

				clearCart();
				setIsCheckoutOpen(false);
				loadProducts();
			} catch (error: unknown) {
				toast.error(t("toast.pos.checkout_error_title"), {
					description: extractErrorMessage(error, t("common.error")),
				});
			} finally {
				setProcessing(false);
			}
		},
		[cart, customerId, activeBranch, totalAmount, clearCart, loadProducts, t],
	);

	const handleSaveDraft = useCallback(() => {
		handleConfirmCheckout({
			status: "draft",
			payments: [],
			discountType: globalDiscountType,
			discountValue: globalDiscountValue,
			discountAmount: globalDiscountAmount,
		});
	}, [
		handleConfirmCheckout,
		globalDiscountType,
		globalDiscountValue,
		globalDiscountAmount,
	]);

	useEffect(() => {
		loadProducts();

		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
				e.preventDefault();
				if (cart.length > 0 && !processing) {
					handleCheckout();
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [cart, processing, loadProducts, handleCheckout]);

	const productOptions = products.map((p) => {
		const defaultV = p.variants?.[0];
		return {
			value: p.id,
			label: `${p.name}${defaultV?.sku ? ` (${defaultV.sku})` : ""}`,
			product: p,
		};
	});

	const handleProductClick = useCallback(
		(product: TProductDto) => {
			const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
			if (product.hasVariants || activeVariants.length > 1) {
				setSelectedProduct(product);
			} else {
				const variant = activeVariants[0];
				if (!variant) {
					toast.error(t("common.error"), {
						description: t("pos.no_active_variants"),
					});
					return;
				}
				if (variant.isFractional) {
					setSelectedProduct(product);
				} else {
					addToCart(product, variant, 1);
				}
			}
		},
		[addToCart, t],
	);

	const handleScanSuccess = useCallback(
		(result: { productId?: string; barcode?: string }) => {
			if (result.productId) {
				const found = products.find((p) => p.id === result.productId);
				if (found) {
					handleProductClick(found);
				} else {
					toast.error("Produk tidak ditemukan", {
						description: "ID produk tidak cocok dengan database kami.",
					});
				}
			} else if (result.barcode) {
				const found = products.find((p) =>
					p.variants?.some(
						(v) =>
							v.barcode?.toLowerCase() === result.barcode?.toLowerCase() ||
							v.sku?.toLowerCase() === result.barcode?.toLowerCase(),
					),
				);
				if (found) {
					handleProductClick(found);
				} else {
					toast.error("Produk tidak ditemukan", {
						description: `Barcode atau SKU "${result.barcode}" tidak cocok dengan produk mana pun.`,
					});
				}
			}
		},
		[products, handleProductClick],
	);

	const { isOpen: isScannerOpen, openScanner, closeScanner } = useScanner();

	const handleLoadDraft = useCallback(
		(draft: TOrderDto) => {
			clearCart();
			if (draft.customerId) {
				setCustomerId(draft.customerId);
			}

			const draftCart = draft.items.map((item) => ({
				cartKey: `${item.productId}__${item.variantId}`,
				productId: item.productId,
				productName: "Draft Item", // We would ideally look this up, but keeping simple for now
				variantId: item.variantId,
				variantName: "",
				price: item.priceAtTime,
				unit: item.unit,
				isFractional: item.quantity % 1 !== 0,
				stock: 999, // Bypass stock check for now
				cartQuantity: item.quantity,
				discountType: null,
				discountValue: 0,
				discountAmount: 0,
			}));

			// Note: product mapping could be improved, but this sets up the state.
			loadCart(
				draftCart as import("@/domain/order/hooks/usePOSCart").TCartItem[],
			);

			toast.success(i18n.t("common.success_title"), {
				description: t("pos.draft_loaded"),
			});
			setIsDraftsOpen(false);
		},
		[clearCart, setCustomerId, loadCart, t],
	);

	const { data: receiptTemplate } = useQuery({
		queryKey: queryKeys.pos.receiptTemplate(),
		queryFn: () => getTemplateByType({ data: "pos_receipt" }),
		staleTime: QUERY_POLICY.reference.staleTime,
		gcTime: QUERY_POLICY.reference.gcTime,
	});

	const handlePrint = () => {
		if (!lastOrder) return;
		const receiptData: TReceiptData = {
			orderId: `ORD-${Date.now()}`,
			businessName: session?.businessName || "Pet Store",
			branchName: activeBranch?.name || "",
			items: lastOrder.items.map((item) => ({
				name: item.variantName
					? `${item.productName} (${item.variantName})`
					: item.productName,
				quantity: item.cartQuantity,
				price: item.price,
			})),
			total: lastOrder.total,
			paymentMethod: lastOrder.paymentMethod as string,
			createdAt: new Date(),
			...(session?.fullName ? { cashierName: session.fullName } : {}),
		} as TReceiptData;
		printReceipt(
			receiptData,
			receiptTemplate?.content as unknown as Record<string, unknown>,
			session?.businessLogoUrl,
		);
		toast.success(i18n.t("common.success_title"), {
			description: t("pos.print_receipt"),
		});
	};

	const handleWhatsApp = () => {
		if (!lastOrder) return;
		const receiptData = {
			orderId: `ORD-${Date.now()}`,
			businessName: session?.businessName || "Pet Store",
			branchName: activeBranch?.name || "",
			items: lastOrder.items.map((item) => ({
				name: item.variantName
					? `${item.productName} (${item.variantName})`
					: item.productName,
				quantity: item.cartQuantity,
				price: item.price,
			})),
			total: lastOrder.total,
			paymentMethod: lastOrder.paymentMethod as string,
			createdAt: new Date(),
			...(session?.fullName ? { cashierName: session.fullName } : {}),
		} as TReceiptData;
		shareViaWhatsApp(
			receiptData,
			receiptTemplate?.content as unknown as Record<string, unknown>,
		);
		toast.success(i18n.t("common.success_title"), {
			description: t("pos.open_whatsapp"),
		});
	};

	if (loading && products.length === 0) {
		return <POSLoading />;
	}

	return (
		<div className="flex h-full font-inter bg-white animate-in fade-in duration-500">
			<POSSuccessModal
				isOpen={isSuccessOpen}
				onClose={() => setIsSuccessOpen(false)}
				order={lastOrder}
				onPrint={handlePrint}
				onShareWA={handleWhatsApp}
			/>

			{/* Left Side: Product Selection */}
			<div className="flex-1 flex flex-col h-full border-r border-neutral-200/80">
				<div className="p-6 pb-4 border-b border-neutral-200/80 bg-white ">
					<div className="flex items-center justify-between mb-4">
						<div className="flex flex-col gap-1">
							<h1 className="text-2xl font-bold text-neutral-900 tracking-tight flex items-center gap-2">
								{t("pos.title")}
							</h1>
							<p className="text-[13px] text-neutral-500">
								{t("pos.subtitle")}
							</p>
						</div>
						<div className="flex items-center gap-4">
							<Link to="/docs/pos">
								<Button
									variant="outline"
									size="icon"
									className="h-9 w-9 rounded-lg border-neutral-200 bg-white"
								>
									<NotebookIcon className="w-5 h-5 text-neutral-500" />
								</Button>
							</Link>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="icon"
										className="h-9 w-9 rounded-lg border-neutral-200 bg-white"
									>
										<MoreIcon className="w-5 h-5 text-neutral-500" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end" className="w-48">
									<DropdownMenuItem
										className="gap-2"
										onClick={() => setIsImportOpen(true)}
									>
										<ImportIcon className="w-4 h-4 text-neutral-500" />
										<span>{t("common.import")}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="gap-2"
										onClick={() => exportToCSV(products, "pos-products.csv")}
									>
										<ExportIcon className="w-4 h-4 text-neutral-500" />
										<span>{t("common.export")}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="gap-2"
										onClick={() => {
											generatePDFReport({
												title: t("pos.inventory_report"),
												businessName: session?.businessName || APP_CONFIG.name,
												date: formatDate(new Date(), "id"),
												sections: [
													{
														title: t("pos.product_summary"),
														items: [
															{
																label: t("pos.total_products"),
																value: products.length,
															},
														],
													},
												],
											});
										}}
									>
										<ReportIcon className="w-4 h-4 text-neutral-500" />
										<span>{t("common.report")}</span>
									</DropdownMenuItem>
									<DropdownMenuItem
										className="gap-2"
										onClick={() => setIsDraftsOpen(true)}
									>
										<NotebookIcon className="w-4 h-4 text-neutral-500" />
										<span>{t("pos.save_draft_label")}</span>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>

							{branches.length > 1 ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="h-9 gap-1.5 rounded-lg border-neutral-200 bg-white text-[13px] font-medium text-neutral-700"
										>
											{activeBranch?.name || t("nav.branches")}
											<MoreIcon className="w-4 h-4 text-neutral-400" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-56">
										{branches.map((b) => (
											<DropdownMenuItem
												key={b.id}
												onClick={() => setSelectedBranchId(b.id)}
												className={
													b.id === activeBranch?.id
														? "font-semibold text-mint-green"
														: ""
												}
											>
												{b.name}
											</DropdownMenuItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
							) : (
								<div className="text-[13px] font-medium text-neutral-400">
									{activeBranch?.name || t("nav.branches")}
								</div>
							)}
						</div>
					</div>
					<div className="flex gap-2 items-center">
						<div className="relative group flex-1">
							<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 group-focus-within:text-mint-green transition-colors" />
							<Select
								options={productOptions}
								value={null}
								onChange={(option: { product: TProductDto } | null) => {
									if (option?.product) handleProductClick(option.product);
								}}
								placeholder={t("pos.search_placeholder")}
								className="text-sm text-neutral-900"
								isClearable
								autoFocus
								styles={{
									control: (base) => ({
										...base,
										paddingLeft: "32px",
										borderRadius: "12px",
										borderColor: "#e5e5e5",
										boxShadow: "none",
										height: "44px",
										"&:hover": { borderColor: "#10b981" },
									}),
								}}
							/>
						</div>
						<Button
							variant="outline"
							onClick={openScanner}
							className="h-11 px-4 rounded-xl border-neutral-200 hover:border-mint-green hover:bg-mint-green/5 text-neutral-500 hover:text-mint-green transition-colors flex items-center gap-2"
							title="Scan QR/Barcode"
						>
							<QrCodeIcon className="w-5 h-5" />
							<span className="hidden sm:inline text-xs font-semibold">
								Scan
							</span>
						</Button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto">
					<POSProductGrid
						products={products}
						onAddToCart={handleProductClick}
					/>
				</div>
			</div>

			{/* Variant Picker */}
			{selectedProduct && (
				<VariantPicker
					product={selectedProduct}
					onSelect={(product, variant, qty) => {
						addToCart(product, variant, qty);
					}}
					onClose={() => setSelectedProduct(null)}
				/>
			)}

			<POSCheckoutModal
				isOpen={isCheckoutOpen}
				onClose={() => setIsCheckoutOpen(false)}
				cart={cart}
				subtotalAmount={subtotalAmount}
				globalDiscountType={globalDiscountType}
				globalDiscountValue={globalDiscountValue}
				globalDiscountAmount={globalDiscountAmount}
				totalAmount={totalAmount}
				onConfirm={handleConfirmCheckout}
				processing={processing}
			/>

			<CameraScannerModal
				isOpen={isScannerOpen}
				onClose={closeScanner}
				onScanSuccess={handleScanSuccess}
			/>

			{/* Right Side: Cart */}
			<div className="w-[400px] border-l border-neutral-200 bg-white shadow-sm flex flex-col h-full z-10 relative">
				<POSCart
					cart={cart}
					customerId={customerId}
					customers={customers.map((c) => ({
						id: c.id,
						name: c.fullName,
						phone: c.phone,
					}))}
					totalAmount={totalAmount}
					processing={processing}
					onUpdateQuantity={updateQuantity}
					onSetItemDiscount={setItemDiscount}
					onRemove={removeFromCart}
					onClear={clearCart}
					onSetCustomerId={setCustomerId}
					onCreateCustomer={handleCreateCustomer}
					onSaveDraft={handleSaveDraft}
					onCheckout={handleCheckout}
				/>
			</div>

			<ImportModal
				isOpen={isImportOpen}
				onClose={() => setIsImportOpen(false)}
				onImport={async (data) => {
					const products = data.map((row) => ({
						productId: "import",
						name: String(row.name || ""),
						sku: row.sku ? String(row.sku) : null,
						price: Number(row.price || 0),
						stock: Number(row.stock || 0),
					}));
					await importMutation.mutateAsync({
						data: {
							importRequestId: crypto.randomUUID(),
							rows: products,
						},
					});
				}}
				title={t("pos.import_title")}
				description={t("pos.import_description")}
			/>

			<DraftsModal
				isOpen={isDraftsOpen}
				onClose={() => setIsDraftsOpen(false)}
				onSelect={handleLoadDraft}
			/>
		</div>
	);
}
