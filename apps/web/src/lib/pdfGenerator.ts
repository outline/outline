import { and, eq } from "drizzle-orm";
import { Effect } from "effect";
import { PDFDocument, type PDFImage, rgb, StandardFonts } from "pdf-lib";
import {
	type DrizzleClient,
	DrizzleClientLive,
	IDrizzleClient,
} from "@/infra/db/drizzle/client";
import {
	boardingPets,
	boardings,
	branches,
	businesses,
	documentTemplates,
	orderItems,
	orders,
	products,
} from "@/infra/db/drizzle/schema";
import { StringUtils } from "@/shared/utils";

const PET_KIND_LABELS: Record<string, string> = {
	cat: "Kucing",
	dog: "Anjing",
	rabbit: "Kelinci",
	other: "Lainnya",
};

const getPetKindLabel = (kind: string): string => {
	return PET_KIND_LABELS[kind] || kind;
};

type BoardingPdfData = {
	boarding: {
		id: string;
		business_id: string;
		owner_name: string;
		owner_address: string;
		owner_phone: string;
		owner_signature: string | null;
	};
	pets: Array<{
		name: string;
		kind: string;
		breed: string | null;
		vaccinated: string;
	}>;
	branches: {
		address: string | null;
		phone: string | null;
	} | null;
	businesses: {
		name: string;
		signature_url: string | null;
		logo_url: string | null;
	} | null;
	template: Record<string, unknown>;
};

type OrderPdfData = {
	order: {
		id: string;
		total_amount: number;
		payment_method: string | null;
		created_at: string;
	};
	order_items: Array<{
		quantity: number;
		price_at_time: number;
		products: { name: string } | null;
	}>;
	branches: {
		address: string | null;
		phone: string | null;
	} | null;
	businesses: {
		name: string;
		signature_url: string | null;
	} | null;
};

// The query work must run *inside* the same `Effect.provide(..., DrizzleClientLive)`
// call that builds the client — DrizzleClientLive is now Layer.scoped, so its pool
// closes as soon as the provided effect finishes. The previous `getDb()` helper
// extracted `db` via a bare `Effect.runPromise(Effect.provide(IDrizzleClient, ...))`
// and reused it afterward, which would build-and-immediately-close its own pool
// before any of the subsequent queries ran.
const withDb = <A>(work: (db: DrizzleClient) => Promise<A>): Promise<A> =>
	Effect.runPromise(
		Effect.provide(
			Effect.gen(function* () {
				const db = yield* IDrizzleClient;
				return yield* Effect.promise(() => work(db));
			}),
			DrizzleClientLive,
		),
	);

const fetchBoardingPdfData = (id: string): Promise<BoardingPdfData | null> =>
	withDb(async (db) => {
		const [boardingRow] = await db
			.select()
			.from(boardings)
			.where(eq(boardings.id, id))
			.limit(1);
		if (!boardingRow) return null;

		const [petRows, branchRow, businessRow, templateRow] = await Promise.all([
			db.select().from(boardingPets).where(eq(boardingPets.boardingId, id)),
			db
				.select()
				.from(branches)
				.where(eq(branches.id, boardingRow.branchId))
				.limit(1),
			db
				.select({
					name: businesses.name,
					signatureUrl: businesses.signatureUrl,
					logoUrl: businesses.logoUrl,
				})
				.from(businesses)
				.where(eq(businesses.id, boardingRow.businessId))
				.limit(1),
			db
				.select()
				.from(documentTemplates)
				.where(
					and(
						eq(documentTemplates.businessId, boardingRow.businessId),
						eq(documentTemplates.type, "boarding_agreement"),
					),
				)
				.limit(1),
		]);

		const DEFAULT_TEMPLATE = {
			title: "SURAT PERSETUJUAN PENITIPAN HEWAN",
			header:
				"Saya yang bertanda tangan dibawah ini selaku pemilik/penanggung jawab atas hewan tersebut di atas, dengan ini menyatakan setuju untuk menitipkan hewan saya kepada pihak penitipan dengan ketentuan sebagai berikut :",
			p1: `Dengan ini menyetujui hewan saya dititipkan dan dirawat sesuai dengan prosedur yang berlaku.`,
			p2: `Saya menyetujui bahwa jika hewan saya sakit sewaktu di penitipan, pihak penitipan akan menghubungi saya selaku pemilik hewan dalam kondisi dimanapun saya berada dan menginformasikan secepatnya tentang tindakan yang harus diambil terhadap hewan saya.`,
			p3: `Apabila selama masa penitipan terjadi kerugian, kerusakan, cidera, penyakit, dan kematian karena interaksi dengan hewan lainnya yang tidak bisa kami cegah, maka saya tidak akan melakukan TUNTUTAN dalam bentuk apapun.`,
			p4: `Hewan yang dititpkan harus dengan kondisi sehat. Saya menyetujui semua biaya yang harus dibayarkan selama masa penitipan dan perawatan hewan dilakukan di awal hewan mulai dititipkan.`,
			footer: "",
			fontSize: 11,
			lineSpacing: 1.4,
			paragraphSpacing: 15,
			marginTop: 720,
			showLogo: true,
			showSignature: true,
		};

		const templateContent =
			(templateRow[0]?.content as Record<string, unknown> | null) ?? null;
		const template = templateContent ?? DEFAULT_TEMPLATE;

		return {
			boarding: {
				id: boardingRow.id,
				business_id: boardingRow.businessId,
				owner_name: boardingRow.ownerName,
				owner_address: boardingRow.ownerAddress,
				owner_phone: boardingRow.ownerPhone,
				owner_signature: boardingRow.ownerSignature,
			},
			pets: petRows.map((p) => ({
				name: p.name,
				kind: p.kind,
				breed: p.breed,
				vaccinated: p.vaccinated,
			})),
			branches: branchRow[0]
				? { address: branchRow[0].address, phone: branchRow[0].phone }
				: null,
			businesses: businessRow[0]
				? {
						name: businessRow[0].name,
						signature_url: businessRow[0].signatureUrl,
						logo_url: businessRow[0].logoUrl,
					}
				: null,
			template,
		};
	});

const fetchOrderPdfData = (id: string): Promise<OrderPdfData | null> =>
	withDb(async (db) => {
		const [orderRow] = await db
			.select()
			.from(orders)
			.where(eq(orders.id, id))
			.limit(1);
		if (!orderRow) return null;

		const [itemRows, branchRow, businessRow] = await Promise.all([
			db
				.select({
					quantity: orderItems.quantity,
					priceAtTime: orderItems.priceAtTime,
					productId: orderItems.productId,
				})
				.from(orderItems)
				.where(eq(orderItems.orderId, id)),
			db
				.select()
				.from(branches)
				.where(eq(branches.id, orderRow.branchId))
				.limit(1),
			db
				.select({
					name: businesses.name,
					signatureUrl: businesses.signatureUrl,
				})
				.from(businesses)
				.where(eq(businesses.id, orderRow.businessId))
				.limit(1),
		]);

		const productIds = Array.from(new Set(itemRows.map((i) => i.productId)));
		const productRows =
			productIds.length > 0
				? await db
						.select({ id: products.id, name: products.name })
						.from(products)
						.where(
							productIds.length === 1
								? eq(products.id, productIds[0] ?? "")
								: eq(products.businessId, orderRow.businessId),
						)
				: [];
		const productMap = new Map(productRows.map((p) => [p.id, p.name]));

		return {
			order: {
				id: orderRow.id,
				total_amount: Number(orderRow.totalAmount),
				payment_method: orderRow.paymentMethod,
				created_at: orderRow.createdAt,
			},
			order_items: itemRows.map((i) => ({
				quantity: Number(i.quantity),
				price_at_time: Number(i.priceAtTime),
				products: productMap.has(i.productId)
					? { name: productMap.get(i.productId) ?? "" }
					: null,
			})),
			branches: branchRow[0]
				? { address: branchRow[0].address, phone: branchRow[0].phone }
				: null,
			businesses: businessRow[0]
				? {
						name: businessRow[0].name,
						signature_url: businessRow[0].signatureUrl,
					}
				: null,
		};
	});

export async function generatePdfResponse(request: Request) {
	try {
		const url = new URL(request.url);
		const type = url.searchParams.get("type");
		const id = url.searchParams.get("id");

		if (!type || !id) {
			return new Response("Missing type or id parameters", { status: 400 });
		}

		const pdfDoc = await PDFDocument.create();
		const page = pdfDoc.addPage([595, 842]); // A4 Size

		const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
		const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

		// Helper to draw text
		const drawText = (
			text: string,
			x: number,
			y: number,
			size = 12,
			isBold = false,
			color = rgb(0, 0, 0),
		) => {
			page.drawText(text, {
				x,
				y,
				size,
				font: isBold ? boldFont : font,
				color,
			});
		};

		// Helper to draw multiline paragraphs
		const drawParagraph = (
			text: string,
			x: number,
			y: number,
			size = 11,
			isBold = false,
			maxWidth = 500,
			lineHeightMultiplier = 1.4,
		) => {
			const usedFont = isBold ? boldFont : font;
			const lineHeight = size * lineHeightMultiplier;
			page.drawText(text, {
				x,
				y,
				size,
				font: usedFont,
				maxWidth,
				lineHeight,
			});
			// return approximate height
			const lines =
				Math.ceil(usedFont.widthOfTextAtSize(text, size) / maxWidth) + 0.5;
			return lines * lineHeight;
		};

		// --- HEADER DATA SETUP ---
		let currentY = 800; // start higher for Boarding Surat
		let signatureUrl: string | null | undefined = null;
		let logoUrl: string | null | undefined = null;
		let businessName = "RUMAH MEOONG - PET STORE & CARE";
		let branchAddress = "Jl. Kucing Persia No. 99, Jakarta Selatan";
		let branchPhone = "0812-3456-7890";

		if (type === "boarding") {
			const data = await fetchBoardingPdfData(id);
			if (!data) {
				return new Response(JSON.stringify({ message: "Boarding not found" }), {
					status: 404,
					headers: { "Content-Type": "application/json" },
				});
			}
			const { boarding, pets, template } = data;

			const fontSize = Number(template.fontSize) || 11;
			const lineSpacing = Number(template.lineSpacing) || 1.4;
			const paraSpacing = Number(template.paragraphSpacing) || 15;
			const marginTop = Number(template.marginTop) || 720;

			if (data.businesses) {
				businessName = data.businesses.name || businessName;
				signatureUrl = data.businesses.signature_url;
				logoUrl = data.businesses.logo_url;
			}
			if (data.branches) {
				branchAddress = data.branches.address || branchAddress;
				branchPhone = data.branches.phone || branchPhone;
			}

			// --- HEADER ---
			// Logo
			if (logoUrl && template.showLogo !== false) {
				try {
					const logoRes = await fetch(logoUrl);
					if (logoRes.ok) {
						const contentType = logoRes.headers.get("content-type") || "";
						const logoArrayBuffer = await logoRes.arrayBuffer();
						let logoImage: PDFImage;
						if (contentType.includes("jpeg") || contentType.includes("jpg")) {
							logoImage = await pdfDoc.embedJpg(logoArrayBuffer);
						} else {
							logoImage = await pdfDoc.embedPng(logoArrayBuffer);
						}
						page.drawImage(logoImage, {
							x: 50,
							y: 740,
							width: 80,
							height: 80,
						});
					}
				} catch (e) {
					console.error("Gagal memuat logo:", e);
				}
			} else if (template.showLogo !== false) {
				// Draw fallback box
				page.drawRectangle({
					x: 50,
					y: 740,
					width: 80,
					height: 80,
					borderColor: rgb(0, 0, 0),
					borderWidth: 2,
				});
				drawText("LOGO", 75, 775, 14, true);
			}

			// Store Details on Right
			const bizWidth = boldFont.widthOfTextAtSize(businessName, 14);
			drawText(businessName, 545 - bizWidth, 800, 14, true, rgb(0, 0, 0));

			const addrWidth = font.widthOfTextAtSize(branchAddress, 11);
			drawText(
				branchAddress,
				545 - addrWidth,
				780,
				11,
				false,
				rgb(0.2, 0.2, 0.2),
			);

			const telpText = `Telp/Wa ${branchPhone}`;
			const telpWidth = font.widthOfTextAtSize(telpText, 11);
			drawText(telpText, 545 - telpWidth, 760, 11, false, rgb(0.2, 0.2, 0.2));

			currentY = marginTop;
			page.drawLine({
				start: { x: 50, y: currentY },
				end: { x: 545, y: currentY },
				thickness: 1,
				color: rgb(0, 0, 0),
			});
			currentY -= 30;

			// --- TITLE ---
			const titleText = String(
				template.title || "SURAT PERSETUJUAN PENITIPAN HEWAN",
			);
			const titleWidth = boldFont.widthOfTextAtSize(titleText, 14);
			drawText(titleText, (595 - titleWidth) / 2, currentY, 14, true);

			currentY -= 30;

			// --- OWNER INFO ---
			currentY -= drawParagraph(
				(template.header as string) ||
					"Saya yang bertanda tangan dibawah ini :",
				50,
				currentY,
				fontSize,
				false,
				500,
				1.4,
			);
			currentY -= 15;

			drawText("Nama", 50, currentY, fontSize, false);
			drawText(`: ${boarding.owner_name}`, 150, currentY, fontSize, false);
			currentY -= 20;

			drawText("Alamat", 50, currentY, fontSize, false);
			drawText(
				`: ${StringUtils.stripHtml(boarding.owner_address)}`,
				150,
				currentY,
				fontSize,
				false,
			);
			currentY -= 20;

			drawText("No. Hp", 50, currentY, fontSize, false);
			drawText(
				`: ${boarding.owner_phone || "-"}`,
				150,
				currentY,
				fontSize,
				false,
			);
			currentY -= 20;

			const petNames = pets.map((p) => p.name).join(", ");
			const petKinds = Array.from(
				new Set(
					pets.map((p) => {
						const kindLabel = getPetKindLabel(p.kind);
						return p.breed ? `${kindLabel} / ${p.breed}` : kindLabel;
					}),
				),
			).join(", ");
			const isVaccinated = pets.every((p) => p.vaccinated === "yes")
				? "Sudah"
				: "Belum/Sebagian";

			drawText("Nama hewan", 50, currentY, fontSize, false);
			drawText(`: ${petNames || "-"}`, 150, currentY, fontSize, false);
			currentY -= 20;

			drawText("Jenis / Ras", 50, currentY, fontSize, false);
			drawText(`: ${petKinds || "-"}`, 150, currentY, fontSize, false);
			currentY -= 20;

			drawText("Status Vaksin", 50, currentY, fontSize, false);
			drawText(`: ${isVaccinated}`, 150, currentY, fontSize, false);
			currentY -= 30;

			// --- PARAGRAPHS ---
			if (template.p1) {
				currentY -= drawParagraph(
					String(template.p1),
					50,
					currentY,
					fontSize,
					false,
					500,
					lineSpacing,
				);
				currentY -= paraSpacing;
			}
			if (template.p2) {
				currentY -= drawParagraph(
					String(template.p2),
					50,
					currentY,
					fontSize,
					false,
					500,
					lineSpacing,
				);
				currentY -= paraSpacing;
			}
			if (template.p3) {
				currentY -= drawParagraph(
					String(template.p3),
					50,
					currentY,
					fontSize,
					false,
					500,
					lineSpacing,
				);
				currentY -= paraSpacing;
			}
			if (template.p4) {
				currentY -= drawParagraph(
					String(template.p4),
					50,
					currentY,
					fontSize,
					false,
					500,
					lineSpacing,
				);
				currentY -= paraSpacing;
			}
			if (template.footer) {
				currentY -= drawParagraph(
					String(template.footer),
					50,
					currentY,
					fontSize,
					false,
					500,
					lineSpacing,
				);
			}

			// --- SIGNATURES ---
			currentY -= 40; // Spacing for signatures
			if (currentY < 150) {
				// Safety check to not draw off page
				// Could add a new page here if needed, but for now just keep on one
			}

			// Left Signature (Owner)
			let cityName = "Kota Anda";
			if (
				branchAddress &&
				branchAddress !== "Jl. Kucing Persia No. 99, Jakarta Selatan"
			) {
				if (branchAddress.includes(",")) {
					const parts = branchAddress.split(",");
					cityName = (parts[parts.length - 1] || "").trim();
				} else {
					const words = branchAddress.trim().split(" ");
					if (words.length > 0)
						cityName = words[words.length - 1] || "Jakarta Selatan";
				}
			} else {
				cityName = "Jakarta Selatan";
			}
			drawText(`${cityName},`, 50, currentY, 11, false);

			// Owner Signature
			if (boarding.owner_signature) {
				try {
					const sigDataUrl = boarding.owner_signature;
					// Extract base64 part
					const base64Data = sigDataUrl.split(",")[1];
					const isPng = sigDataUrl.includes("image/png");

					if (base64Data) {
						// Decode base64 to Uint8Array
						const binaryString = atob(base64Data);
						const bytes = new Uint8Array(binaryString.length);
						for (let i = 0; i < binaryString.length; i++) {
							bytes[i] = binaryString.charCodeAt(i);
						}

						let ownerSigImage: PDFImage;
						if (isPng) {
							ownerSigImage = await pdfDoc.embedPng(bytes);
						} else {
							ownerSigImage = await pdfDoc.embedJpg(bytes);
						}

						page.drawImage(ownerSigImage, {
							x: 50,
							y: currentY - 50,
							width: 100,
							height: 40,
						});
					}
				} catch (e) {
					console.error("Gagal memuat signature owner:", e);
				}
			}

			currentY -= 80;

			drawText(boarding.owner_name, 50, currentY, 11, true);
			currentY -= 15;
			drawText("(Nama Owner)", 50, currentY, 11, false);

			// Right Signature (Store)
			const storeSigY = currentY + 95;
			const pNameWidth = boldFont.widthOfTextAtSize(
				`Pihak ${businessName}`,
				11,
			);
			drawText(`Pihak ${businessName}`, 545 - pNameWidth, storeSigY, 11, true);

			if (signatureUrl && template.showSignature !== false) {
				try {
					const sigRes = await fetch(signatureUrl);
					if (sigRes.ok) {
						const contentType = sigRes.headers.get("content-type") || "";
						const sigArrayBuffer = await sigRes.arrayBuffer();

						let sigImage: PDFImage;
						if (contentType.includes("jpeg") || contentType.includes("jpg")) {
							sigImage = await pdfDoc.embedJpg(sigArrayBuffer);
						} else {
							sigImage = await pdfDoc.embedPng(sigArrayBuffer);
						}

						page.drawImage(sigImage, {
							x: 545 - 100, // align right
							y: storeSigY - 60,
							width: 100,
							height: 40,
						});
					}
				} catch (e) {
					console.error("Gagal memuat signature toko:", e);
				}
			}

			// Store Signature Name Line
			const storeLabelWidth = font.widthOfTextAtSize("(Admin/Pet Shop)", 11);
			drawText("(Admin/Pet Shop)", 545 - storeLabelWidth, currentY, 11, false);
		} else if (type === "order") {
			// Keeping original Order Invoice code
			const data = await fetchOrderPdfData(id);
			if (!data) {
				return new Response("Order not found", { status: 404 });
			}
			const { order, order_items } = data;
			currentY = 620;

			if (data.businesses) {
				businessName = data.businesses.name || businessName;
				signatureUrl = data.businesses.signature_url;
			}
			if (data.branches) {
				branchAddress = data.branches.address || branchAddress;
				branchPhone = data.branches.phone
					? `Telp: ${data.branches.phone}`
					: branchPhone;
			}

			// Header
			drawText(businessName, 50, 780, 20, true, rgb(0.1, 0.1, 0.1));
			drawText(branchAddress, 50, 760, 10, false, rgb(0.4, 0.4, 0.4));
			drawText(branchPhone, 50, 745, 10, false, rgb(0.4, 0.4, 0.4));

			page.drawLine({
				start: { x: 50, y: 730 },
				end: { x: 545, y: 730 },
				thickness: 1,
				color: rgb(0.8, 0.8, 0.8),
			});

			drawText("INVOICE PEMBELIAN", 50, 700, 16, true);
			drawText(`ID Dokumen : ${order.id}`, 50, 680, 11);
			drawText(
				`Tanggal    : ${new Date(order.created_at).toLocaleDateString("id-ID")}`,
				50,
				665,
				11,
			);

			drawText("Rincian Pesanan", 50, currentY, 12, true);
			currentY -= 25;

			// Table Header
			drawText("Item", 50, currentY, 11, true);
			drawText("Qty", 350, currentY, 11, true);
			drawText("Harga", 400, currentY, 11, true);
			drawText("Subtotal", 480, currentY, 11, true);
			currentY -= 10;
			page.drawLine({
				start: { x: 50, y: currentY },
				end: { x: 545, y: currentY },
				thickness: 1,
				color: rgb(0.8, 0.8, 0.8),
			});
			currentY -= 15;

			for (const item of order_items) {
				const prodName = item.products?.name ?? "Produk";
				const quantity = item.quantity;
				const priceAtTime = item.price_at_time;
				const subtotal = quantity * priceAtTime;
				drawText(String(prodName), 50, currentY, 11);
				drawText(quantity.toString(), 350, currentY, 11);
				drawText(
					`Rp ${priceAtTime.toLocaleString("id-ID")}`,
					400,
					currentY,
					11,
				);
				drawText(`Rp ${subtotal.toLocaleString("id-ID")}`, 480, currentY, 11);
				currentY -= 20;
			}

			currentY -= 10;
			page.drawLine({
				start: { x: 50, y: currentY },
				end: { x: 545, y: currentY },
				thickness: 1,
				color: rgb(0.8, 0.8, 0.8),
			});
			currentY -= 20;

			drawText("Total Pembayaran :", 300, currentY, 12, true);
			drawText(
				`Rp ${order.total_amount.toLocaleString("id-ID")}`,
				480,
				currentY,
				12,
				true,
			);
			currentY -= 20;
			drawText("Metode Pembayaran :", 300, currentY, 11);
			drawText(order.payment_method?.toUpperCase() || "-", 480, currentY, 11);
			currentY -= 15;
			drawText("Status :", 300, currentY, 11);
			drawText("LUNAS", 480, currentY, 11, true, rgb(0, 0.5, 0));

			// Invoice Footer
			if (signatureUrl) {
				try {
					const sigRes = await fetch(signatureUrl);
					if (sigRes.ok) {
						const contentType = sigRes.headers.get("content-type") || "";
						const sigArrayBuffer = await sigRes.arrayBuffer();

						let sigImage: PDFImage;
						if (contentType.includes("jpeg") || contentType.includes("jpg")) {
							sigImage = await pdfDoc.embedJpg(sigArrayBuffer);
						} else {
							sigImage = await pdfDoc.embedPng(sigArrayBuffer);
						}

						page.drawImage(sigImage, {
							x: 50,
							y: 65,
							width: 100,
							height: 40,
						});
					}
				} catch (e) {
					console.error("Gagal memuat signature:", e);
				}
			}

			drawText(
				"Terima kasih telah mempercayakan anabul Anda kepada kami.",
				50,
				50,
				10,
				false,
				rgb(0.5, 0.5, 0.5),
			);
		} else {
			return new Response("Invalid document type", { status: 400 });
		}

		const pdfBytes = await pdfDoc.save();

		return new Response(pdfBytes as unknown as BodyInit, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `inline; filename="${type}-${id}.pdf"`,
			},
		});
	} catch (error) {
		console.error("Gagal generate PDF:", error);
		return new Response(
			JSON.stringify({ error: "Gagal membuat PDF", details: String(error) }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}
