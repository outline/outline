const normalizedSearch = (search?: string) => search?.trim() ?? "";
const normalizedDate = (date?: string) => date?.trim() ?? "";

export const queryKeys = {
	session: {
		all: () => ["session"] as const,
		info: () => [...queryKeys.session.all(), "info"] as const,
		legacyInfo: () => ["session-info"] as const,
		legacySession: () => ["session"] as const,
	},
	dashboard: {
		all: () => ["dashboard"] as const,
		metrics: () => [...queryKeys.dashboard.all(), "metrics"] as const,
		revenue: () => [...queryKeys.dashboard.all(), "revenue"] as const,
		topSellers: () => [...queryKeys.dashboard.all(), "topSellers"] as const,
		inventory: () => [...queryKeys.dashboard.all(), "inventory"] as const,
	},
	products: {
		all: () => ["products"] as const,
		lists: () => [...queryKeys.products.all(), "list"] as const,
		list: () => [...queryKeys.products.lists()] as const,
		details: () => [...queryKeys.products.all(), "detail"] as const,
		detail: (id: string) => [...queryKeys.products.details(), id] as const,
	},
	boardings: {
		all: () => ["boardings"] as const,
		lists: () => [...queryKeys.boardings.all(), "list"] as const,
		list: () => [...queryKeys.boardings.lists()] as const,
		details: () => [...queryKeys.boardings.all(), "detail"] as const,
		detail: (id: string) => [...queryKeys.boardings.details(), id] as const,
		photos: (id: string) =>
			[...queryKeys.boardings.detail(id), "photos"] as const,
		charges: (id: string) =>
			[...queryKeys.boardings.detail(id), "charges"] as const,
	},
	customers: {
		all: () => ["customers"] as const,
		lists: () => [...queryKeys.customers.all(), "list"] as const,
		list: (search?: string) =>
			[
				...queryKeys.customers.lists(),
				{ search: normalizedSearch(search) },
			] as const,
		details: () => [...queryKeys.customers.all(), "detail"] as const,
		detail: (id: string) => [...queryKeys.customers.details(), id] as const,
	},
	pets: {
		all: () => ["pets"] as const,
		byCustomer: (customerId: string) =>
			[...queryKeys.pets.all(), "byCustomer", customerId] as const,
	},
	branches: {
		all: () => ["branches"] as const,
		lists: () => [...queryKeys.branches.all(), "list"] as const,
		list: () => [...queryKeys.branches.lists()] as const,
		details: () => [...queryKeys.branches.all(), "detail"] as const,
		detail: (id: string) => [...queryKeys.branches.details(), id] as const,
		holidays: (branchId: string) =>
			[...queryKeys.branches.detail(branchId), "holidays"] as const,
	},
	rooms: {
		all: () => ["rooms"] as const,
		byBranch: (branchId: string) =>
			[...queryKeys.rooms.all(), { branchId }] as const,
	},
	staff: {
		all: () => ["staff"] as const,
		members: () => [...queryKeys.staff.all(), "members"] as const,
		details: () => [...queryKeys.staff.all(), "detail"] as const,
		detail: (id: string) => [...queryKeys.staff.details(), id] as const,
		schedules: (id: string) =>
			[...queryKeys.staff.detail(id), "schedules"] as const,
	},
	billing: {
		all: () => ["billing"] as const,
		subscription: () => [...queryKeys.billing.all(), "subscription"] as const,
		usageMetrics: () => [...queryKeys.billing.all(), "usageMetrics"] as const,
		billingHistory: () =>
			[...queryKeys.billing.all(), "billingHistory"] as const,
	},
	pos: {
		all: () => ["pos"] as const,
		customers: () => [...queryKeys.pos.all(), "customers"] as const,
		receiptTemplate: () => [...queryKeys.pos.all(), "receiptTemplate"] as const,
	},
	inventory: {
		all: () => ["inventory"] as const,
		products: () => [...queryKeys.inventory.all(), "products"] as const,
		expiringBatches: () =>
			[...queryKeys.inventory.all(), "expiringBatches"] as const,
		batches: () => [...queryKeys.inventory.all(), "batches"] as const,
		movements: () => [...queryKeys.inventory.all(), "movements"] as const,
		productBatches: (productId: string) =>
			[...queryKeys.inventory.all(), "productBatches", productId] as const,
	},
	suppliers: {
		all: () => ["suppliers"] as const,
		list: () => [...queryKeys.suppliers.all(), "list"] as const,
	},
	warehouses: {
		all: () => ["warehouses"] as const,
		list: () => [...queryKeys.warehouses.all(), "list"] as const,
		rackLocations: (warehouseId: string) =>
			[...queryKeys.warehouses.all(), "racks", warehouseId] as const,
	},
	purchaseOrders: {
		all: () => ["purchaseOrders"] as const,
		list: () => [...queryKeys.purchaseOrders.all(), "list"] as const,
		detail: (id: string) =>
			[...queryKeys.purchaseOrders.all(), "detail", id] as const,
	},
	invoices: {
		all: () => ["invoices"] as const,
		list: () => [...queryKeys.invoices.all(), "list"] as const,
		detail: (id: string) =>
			[...queryKeys.invoices.all(), "detail", id] as const,
	},
	accounting: {
		all: () => ["accounting"] as const,
		financialSummary: () =>
			[...queryKeys.accounting.all(), "financialSummary"] as const,
		expenses: () => [...queryKeys.accounting.all(), "expenses"] as const,
		pettyCash: () => [...queryKeys.accounting.all(), "pettyCash"] as const,
		journalEntries: () =>
			[...queryKeys.accounting.all(), "journalEntries"] as const,
		profitLoss: () => [...queryKeys.accounting.all(), "profitLoss"] as const,
		cashFlow: () => [...queryKeys.accounting.all(), "cashFlow"] as const,
	},
	portal: {
		all: () => ["portal"] as const,
		stats: () => [...queryKeys.portal.all(), "stats"] as const,
		config: () => [...queryKeys.portal.all(), "config"] as const,
		bookings: () => [...queryKeys.portal.all(), "bookings"] as const,
		services: () => [...queryKeys.portal.all(), "services"] as const,
		reviews: () => [...queryKeys.portal.all(), "reviews"] as const,
	},
	publicPortal: {
		all: (businessSlug: string) => ["publicPortal", businessSlug] as const,
		config: (businessSlug: string) =>
			[...queryKeys.publicPortal.all(businessSlug), "config"] as const,
		services: (businessSlug: string) =>
			[...queryKeys.publicPortal.all(businessSlug), "services"] as const,
		branches: (businessSlug: string) =>
			[...queryKeys.publicPortal.all(businessSlug), "branches"] as const,
		product: (businessId: string, productId: string) =>
			["public-product", businessId, productId] as const,
	},
	publicBoarding: {
		all: () => ["public-business"] as const,
		detail: (businessSlug: string) =>
			[...queryKeys.publicBoarding.all(), businessSlug] as const,
	},
	whatsapp: {
		all: () => ["whatsapp"] as const,
		stats: () => [...queryKeys.whatsapp.all(), "stats"] as const,
		config: () => [...queryKeys.whatsapp.all(), "config"] as const,
		templates: () => [...queryKeys.whatsapp.all(), "templates"] as const,
	},
	grooming: {
		all: () => ["grooming"] as const,
		services: () => [...queryKeys.grooming.all(), "services"] as const,
		staff: () => [...queryKeys.grooming.all(), "staff"] as const,
		calendar: (filters: {
			readonly groomerId?: string;
			readonly date?: string;
		}) =>
			[
				...queryKeys.grooming.all(),
				"calendar",
				{
					date: normalizedDate(filters.date),
					groomerId: filters.groomerId?.trim() ?? "",
				},
			] as const,
		appointmentDetail: (appointmentId: string) =>
			[...queryKeys.grooming.all(), "detail", appointmentId] as const,
	},
	loyalty: {
		all: () => ["loyalty"] as const,
		config: () => [...queryKeys.loyalty.all(), "config"] as const,
		tiers: () => [...queryKeys.loyalty.all(), "tiers"] as const,
	},
	documentTemplate: {
		all: () => ["document-template"] as const,
		byType: (type: string) =>
			[...queryKeys.documentTemplate.all(), type] as const,
	},
	settings: {
		all: () => ["settings"] as const,
		receipts: () => [...queryKeys.settings.all(), "receipts"] as const,
		documents: () => [...queryKeys.settings.all(), "documents"] as const,
	},
} as const;
