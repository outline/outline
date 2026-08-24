import { PLAN_LIMITS } from "@/domain/billing/billing.module";

// ============================================================
// APP CONFIGURATION
// ============================================================

export const APP_CONFIG = {
	name: "Petso",
	fullName: "Petso — Platform Manajemen Petshop & Penitipan Hewan",
	description:
		"Tingkatkan efisiensi pet shop Anda dengan Petso. Sistem kasir (POS), manajemen kandang boarding, dan laporan keuangan dalam satu platform.",
	version: "1.0.0",
	copyright: `© ${new Date().getFullYear()} Petso.`,
	saasName: "Petso",
	brandColor: "#0ea5e9", // Sky 500
	supportEmail: "support@petso.id",
	links: {
		twitter: "https://twitter.com/petso",
		github: "https://github.com/treon-studio/petso",
		discord: "https://discord.gg/petso",
	},
	googleAnalyticsId: import.meta.env.VITE_GA_ID || "G-XXXXXXXXXX",
	ogImage:
		import.meta.env.VITE_OG_IMAGE_URL ||
		"https://peso.treonstudio.com/og-image.png",
	seo: {
		keywords:
			"pet store saas, aplikasi petshop, software cat daycare, manajemen penitipan hewan, sistem kasir petshop, point of sale hewan, loyalty program petshop, multi-branch petshop",
		robots: "index, follow",
		author: "Petso",
	},
	geo: {
		region: "ID-JK",
		placename: "Jakarta",
		position: "-6.2088;106.8456",
		icbm: "-6.2088, 106.8456",
	},
	backgroundImages: {
		login:
			import.meta.env.VITE_LOGIN_BG_URL ||
			"https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2000&auto=format&fit=crop",
		signup:
			import.meta.env.VITE_SIGNUP_BG_URL ||
			"https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?q=80&w=2000&auto=format&fit=crop",
	},
};

// ============================================================
// EXTERNAL SERVICES CONFIGURATION
// ============================================================

export const EXTERNAL_URLS = {
	midtrans: {
		snapJs: {
			production: "https://app.midtrans.com/snap/snap.js",
			sandbox: "https://app.sandbox.midtrans.com/snap/snap.js",
		},
		api: {
			production: "https://api.midtrans.com",
			sandbox: "https://api.sandbox.midtrans.com",
		},
		redirect: {
			production: "https://app.midtrans.com/snap/v2/vtweb",
			sandbox: "https://app.sandbox.midtrans.com/snap/v2/vtweb",
		},
	},
	whatsapp: {
		sendUrl: "https://wa.me",
	},
	ipLookup: "https://api.ipify.org?format=json",
	googleAnalytics: "https://www.googletagmanager.com/gtag/js",
};

// ============================================================
// MIDTRANS CONFIGURATION
// ============================================================

export const MIDTRANS_CONFIG = {
	clientKey: import.meta.env.VITE_MIDTRANS_CLIENT_KEY || "",
	serverKey: import.meta.env.MIDTRANS_SERVER_KEY || "",
	isProduction: import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === "true",
	get snapUrl() {
		return this.isProduction
			? EXTERNAL_URLS.midtrans.snapJs.production
			: EXTERNAL_URLS.midtrans.snapJs.sandbox;
	},
	get apiUrl() {
		return this.isProduction
			? EXTERNAL_URLS.midtrans.api.production
			: EXTERNAL_URLS.midtrans.api.sandbox;
	},
	get redirectUrl() {
		return this.isProduction
			? EXTERNAL_URLS.midtrans.redirect.production
			: EXTERNAL_URLS.midtrans.redirect.sandbox;
	},
};

// ============================================================
// SAAS PRICING & LIMITS
// ============================================================

export const PLAN_PRICING = {
	free: {
		monthly: 0,
		yearly: 0,
		label: "Free",
	},
	pro: {
		monthly: 199000,
		yearly: 1990000,
		label: "Pro",
	},
	business: {
		monthly: 449000,
		yearly: 4490000,
		label: "Business",
	},
} as const;

export const SAAS_LIMITS = {
	free: {
		branches: PLAN_LIMITS.free.branches,
		products: 50,
		transactions: 100,
		staff: PLAN_LIMITS.free.staff,
		activeBoardings: PLAN_LIMITS.free.boardingsPerMonth,
		...PLAN_PRICING.free,
	},
	pro: {
		branches: PLAN_LIMITS.pro.branches,
		products: Number.POSITIVE_INFINITY,
		transactions: Number.POSITIVE_INFINITY,
		staff: PLAN_LIMITS.pro.staff,
		activeBoardings: PLAN_LIMITS.pro.boardingsPerMonth,
		...PLAN_PRICING.pro,
	},
	business: {
		branches: PLAN_LIMITS.business.branches,
		products: Number.POSITIVE_INFINITY,
		transactions: Number.POSITIVE_INFINITY,
		staff: PLAN_LIMITS.business.staff,
		activeBoardings: PLAN_LIMITS.business.boardingsPerMonth,
		...PLAN_PRICING.business,
	},
};

// ============================================================
// BUSINESS LOGIC CONSTANTS
// ============================================================

export const BUSINESS_RULES = {
	// Stock thresholds
	LOW_STOCK_THRESHOLD: 5,
	OUT_OF_STOCK_THRESHOLD: 0,

	// Occupancy thresholds
	OCCUPANCY_HIGH_THRESHOLD: 80,
	OCCUPANCY_MEDIUM_THRESHOLD: 50,

	// Boarding
	DEFAULT_DAILY_RATE: 150000,
	BOARDING_STATUSES: ["draft", "active", "completed", "cancelled"] as const,

	// Product limits
	PRODUCT_MAX_PRICE: 1000000000,
	PRODUCT_MAX_STOCK: 100000,

	// Soft delete
	SOFT_DELETE_RETENTION_DAYS: 30,

	// Display limits
	RECENT_BOARDINGS_LIMIT: 5,
	RECENT_BILLING_LIMIT: 5,
	RECENT_ACTIVITY_LIMIT: 10,
	ORDER_ID_DISPLAY_LENGTH: 8,
	RECEIPT_ORDER_ID_LENGTH: 12,
};

// ============================================================
// LOYALTY SYSTEM CONSTANTS
// ============================================================

export const LOYALTY_DEFAULTS = {
	POINTS_PER_RUPIAH: 0.01, // 1 point per Rp 100
	POINTS_EXPIRY_DAYS: 365,
	MIN_REDEEM_POINTS: 100,
	MAX_POINTS_EXPIRY_DAYS: 3650,
	MIN_STAMPS: 2,
	MAX_STAMPS: 50,
	PROMO_CODE_MIN_LENGTH: 3,
	PROMO_CODE_MAX_LENGTH: 20,
	MAX_USES_PER_CUSTOMER: 1,
	DEFAULT_PROMO_VALIDITY_DAYS: 30,
};

// ============================================================
// WHATSAPP AUTOMATION CONSTANTS
// ============================================================

export const WHATSAPP_DEFAULTS = {
	AUTO_REMINDER: true,
	REMINDER_HOURS_BEFORE: 24,
	AUTO_PAYMENT_CONFIRM: true,
	AUTO_LOYALTY_NOTIFY: true,
	AUTO_BOOKING_CONFIRM: true,
};

// ============================================================
// PORTAL CONSTANTS
// ============================================================

export const PORTAL_DEFAULTS = {
	BOOKING_ENABLED: true,
	LOGIN_ENABLED: true,
	GUEST_BOOKING: false,
	DEPOSIT_REQUIRED: true,
	DEPOSIT_AMOUNT: 0,
	SLUG_MIN_LENGTH: 3,
	SLUG_MAX_LENGTH: 30,
	DEFAULT_SERVICE_DURATION: 60,
};

// ============================================================
// PAGINATION CONSTANTS
// ============================================================

export const PAGINATION = {
	DEFAULT_PAGE_SIZE: 20,
	MAX_PAGE_SIZE: 100,
	MIN_PAGE_SIZE: 1,
};

// ============================================================
// RECEIPT CONFIGURATION
// ============================================================

export const RECEIPT_CONFIG = {
	CHARACTER_WIDTH: 32,
	THERMAL_PRINTER_WIDTH: "80mm",
	SEPARATOR_CHAR: "=",
	DASH_CHAR: "-",
	PAYMENT_LABELS: {
		cash: "Tunai",
		transfer: "Transfer",
		qris: "QRIS",
		card: "Kartu",
	} as Record<string, string>,
	MESSAGES: {
		THANK_YOU: "Terima kasih atas kunjungan Anda!",
		PET_HAPPY: "Hewan peliharaan Anda senang :)",
		WHATSAPP_SHARE_PREFIX: "*Struk Pembayaran",
	},
};

// ============================================================
// ERROR MESSAGES
// ============================================================

export const ERROR_MESSAGES = {
	// Auth
	NOT_AUTHENTICATED: "Not authenticated",
	PROFILE_NOT_FOUND: "Profil bisnis tidak ditemukan.",
	PROFILE_NOT_FOUND_ALT: "Profil tidak ditemukan",

	// Orders
	ORDER_NOT_FOUND: "Transaksi tidak ditemukan.",
	ORDER_VOID_FAILED: "Gagal membatalkan transaksi.",

	// Products
	PRODUCT_SAVE_FAILED: "Gagal menyimpan produk",
	PRODUCT_UPDATE_FAILED: "Gagal memperbarui produk",
	PRODUCT_DELETE_FAILED: "Gagal menghapus produk",
	PRODUCT_RESTORE_FAILED: "Gagal memulihkan produk",
	PRODUCT_RESTORE_EXPIRED:
		"Produk sudah melewati batas waktu restore (30 hari).",

	// Payments
	BILLING_EVENT_FAILED: "Gagal membuat event billing.",
	BILLING_EVENT_NOT_FOUND: "Event billing tidak ditemukan.",
	PAYMENT_FAILED: "Gagal membuat pembayaran",
	PAYMENT_REDIRECT_FAILED: "Redirecting to payment...",

	// Loyalty
	INSUFFICIENT_POINTS: "Poin tidak mencukupi untuk penukaran.",
	PROMO_CODE_EXISTS: "Kode promo sudah digunakan. Gunakan kode lain.",
	PROMO_CODE_INVALID: "Kode promo tidak ditemukan atau sudah kedaluwarsa",
	PROMO_CODE_MAX_USED: "Kode promo sudah mencapai batas penggunaan",
	PROMO_CODE_ALREADY_USED: "Anda sudah menggunakan kode promo ini",
	PROMO_CODE_MIN_ORDER: "Minimum pembelian",
	PROMO_CODE_VALID: "Kode promo valid",

	// Accounting
	ACCOUNT_CODE_EXISTS: "Kode akun sudah digunakan.",
	JOURNAL_UNBALANCED: "Total debit harus sama dengan total kredit.",

	// Portal
	PORTAL_SLUG_EXISTS: "Slug sudah digunakan. Gunakan slug lain.",

	// WhatsApp
	WHATSAPP_TEMPLATE_FAILED: "Gagal menambahkan template",
	WHATSAPP_CONFIG_FAILED: "Gagal menyimpan pengaturan",

	// Branch
	BRANCH_NOT_FOUND: "Cabang tidak ditemukan.",

	// Staff
	STAFF_INVITE_FAILED: "Gagal mengundang anggota tim",
	STAFF_REMOVE_FAILED: "Gagal menghapus anggota",

	// Boarding
	BOARDING_UPDATE_FAILED: "Gagal memperbarui boarding",
	BOARDING_DELETE_FAILED: "Gagal menghapus boarding",
	BOARDING_CHECKOUT_FAILED: "Gagal checkout boarding",
	BOARDING_ACTIVATE_FAILED: "Gagal mengaktifkan boarding",

	// Generic
	NETWORK_ERROR: "Terjadi kesalahan jaringan. Silakan coba lagi.",
	UNKNOWN_ERROR: "Terjadi kesalahan yang tidak diketahui.",
};

// ============================================================
// SUCCESS MESSAGES
// ============================================================

export const SUCCESS_MESSAGES = {
	// Auth
	LOGOUT: "Sampai jumpa lagi!",

	// Products
	PRODUCT_ADDED: "Produk berhasil ditambahkan ke inventory",
	PRODUCT_UPDATED: "Produk berhasil diperbarui",
	PRODUCT_DELETED: "Produk berhasil dihapus",
	PRODUCT_RESTORED: "Produk berhasil dipulihkan",

	// Orders
	ORDER_CREATED: "Transaksi berhasil",
	ORDER_VOIDED: "Transaksi berhasil dibatalkan",
	RECEIPT_PRINTING: "Struk sedang dicetak",
	WHATSAPP_OPENING: "Membuka WhatsApp...",

	// Payments
	PAYMENT_SUCCESS: "Pembayaran berhasil!",
	UPGRADE_SUCCESS: "Paket berhasil diupgrade!",

	// Loyalty
	TIER_ADDED: "Tier berhasil ditambahkan",
	TIER_UPDATED: "Tier berhasil diperbarui",
	TIER_DELETED: "Tier berhasil dihapus",
	STAMP_ADDED: "Stamp card berhasil ditambahkan",
	STAMP_DELETED: "Stamp card berhasil dihapus",
	PROMO_ADDED: "Promo berhasil ditambahkan",
	PROMO_DELETED: "Promo berhasil dihapus",

	// Accounting
	EXPENSE_ADDED: "Pengeluaran berhasil ditambahkan",
	EXPENSE_DELETED: "Pengeluaran berhasil dihapus",
	PETTY_CASH_ADDED: "Transaksi berhasil ditambahkan",

	// Portal
	PORTAL_CONFIG_SAVED: "Pengaturan portal berhasil disimpan",
	PORTAL_SERVICE_ADDED: "Layanan berhasil ditambahkan",
	PORTAL_SERVICE_DELETED: "Layanan berhasil dihapus",
	BOOKING_STATUS_UPDATED: "Status booking diperbarui",

	// WhatsApp
	WHATSAPP_TEMPLATE_ADDED: "Template berhasil ditambahkan",
	WHATSAPP_TEMPLATE_DELETED: "Template berhasil dihapus",
	WHATSAPP_CONFIG_SAVED: "Pengaturan berhasil disimpan",
	WHATSAPP_SCHEDULE_CANCELLED: "Pesan terjadwal dibatalkan",

	// Branch
	BRANCH_ADDED: "Cabang berhasil ditambahkan",
	BRANCH_UPDATED: "Informasi cabang diperbarui",
	BRANCH_STATUS_UPDATED: "Status cabang diperbarui",
	BRANCH_DELETED: "Cabang berhasil dihapus",
	BRANCH_ID_COPIED: "ID disalin ke clipboard",

	// Staff
	STAFF_ADDED: "Anggota tim berhasil ditambahkan",
	STAFF_REMOVED: "Anggota berhasil dihapus dari cabang",

	// Boarding
	BOARDING_UPDATED: "Boarding updated",
	BOARDING_DELETED: "Boarding record deleted",
	BOARDING_CHECKED_OUT: "Boarding checked out & Payment recorded",
	BOARDING_ACTIVATED: "Boarding activated successfully",

	// Settings
	PROFILE_SAVED: "Profil berhasil disimpan",
	SETTINGS_SAVED: "Pengaturan berhasil disimpan",
};

// ============================================================
// UI CONSTANTS
// ============================================================

export const UI_COLORS = {
	// Status colors
	STATUS_ACTIVE: "#10b981",
	STATUS_WARNING: "#f59e0b",
	STATUS_DANGER: "#ef4444",
	STATUS_NEUTRAL: "#e5e5e5",

	// Google OAuth colors
	GOOGLE_BLUE: "#4285F4",
	GOOGLE_GREEN: "#34A853",
	GOOGLE_YELLOW: "#FBBC05",
	GOOGLE_RED: "#EA4335",

	// Layout
	LAYOUT_BG: "#FAFAFA",
	INPUT_BORDER: "#e5e5e5",
	INPUT_BORDER_HOVER: "#10b981",
};

// ============================================================
// DATE/TIME CONSTANTS
// ============================================================

export const DATE_FORMATS = {
	DISPLAY: "dd MMM yyyy",
	DISPLAY_WITH_TIME: "dd MMM yyyy, HH:mm",
	INPUT: "yyyy-MM-dd",
	SHORT_MONTH: "dd/MM",
};

export const MONTH_NAMES = {
	ID: [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"Mei",
		"Jun",
		"Jul",
		"Ags",
		"Sep",
		"Okt",
		"Nov",
		"Des",
	],
	EN: [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	],
};

export const DAY_NAMES = {
	ID: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
	EN: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

// ============================================================
// AGREEMENT CLAUSES
// ============================================================

export const AGREEMENT_CLAUSES = [
	{
		title: "Kesehatan Hewan",
		content:
			"Pemilik menjamin bahwa hewan yang dititipkan dalam keadaan sehat, bebas dari penyakit menular, kutu, dan jamur. Pihak penitipan berhak menolak hewan yang menunjukkan gejala sakit atau kondisi yang membahayakan hewan lain.",
	},
	{
		title: "Vaksinasi & Perawatan",
		content:
			"Hewan sebaiknya sudah mendapatkan vaksinasi lengkap. Pemilik wajib menginformasikan riwayat medis, alergi, atau kebutuhan khusus lainnya kepada pihak penitipan.",
	},
	{
		title: "Tindakan Darurat",
		content:
			"Apabila terjadi kondisi darurat medis, pihak penitipan akan segera menghubungi pemilik. Jika pemilik tidak dapat dihubungi, pihak penitipan berwenang membawa hewan ke dokter hewan rekanan dengan seluruh biaya ditanggung oleh pemilik.",
	},
	{
		title: "Barang Bawaan",
		content:
			"Kehilangan atau kerusakan barang-barang pribadi yang dititipkan (seperti kandang, mainan, atau selimut) di luar tanggung jawab pihak penitipan, meskipun kami akan berusaha menjaganya dengan sebaik-baiknya.",
	},
	{
		title: "Pembayaran & Pengambilan",
		content:
			"Pembayaran dilakukan sesuai dengan tarif yang berlaku. Keterlambatan pengambilan akan dikenakan biaya tambahan sesuai ketentuan yang berlaku.",
	},
];

// ============================================================
// VALIDATION CONSTANTS
// ============================================================

export const VALIDATION = {
	// Product
	PRODUCT_NAME_MAX_LENGTH: 100,
	PRODUCT_SKU_MAX_LENGTH: 50,

	// Branch
	BRANCH_NAME_MAX_LENGTH: 100,
	BRANCH_ADDRESS_MAX_LENGTH: 500,

	// Boarding
	OWNER_NAME_MAX_LENGTH: 100,
	OWNER_PHONE_MAX_LENGTH: 20,
	OWNER_ADDRESS_MAX_LENGTH: 500,
	PET_NAME_MAX_LENGTH: 100,
	PET_BREED_MAX_LENGTH: 100,
	NOTES_MAX_LENGTH: 1000,

	// Staff
	STAFF_EMAIL_MAX_LENGTH: 255,

	// Portal
	PORTAL_SLUG_PATTERN: /^[a-z0-9-]+$/,
};
