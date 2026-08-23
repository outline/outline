import { relations } from "drizzle-orm/relations";
import {
	auditLogs,
	billingEvents,
	boardingCharges,
	boardingDailyPhotos,
	boardingPets,
	boardings,
	branches,
	branchHolidays,
	branchMembers,
	businesses,
	chartOfAccounts,
	commissionRecords,
	commissionRules,
	customerLoyalty,
	customerServiceRewards,
	customerStamps,
	customers,
	deadLetterQueue,
	documentTemplates,
	expenses,
	groomingAddons,
	groomingAppointmentAddons,
	groomingAppointments,
	groomingPhotos,
	groomingServices,
	invoiceItems,
	invoicePayments,
	invoices,
	journalEntries,
	journalEntryLines,
	kasbon,
	kasbonPayments,
	loyaltyConfig,
	loyaltyTiers,
	loyaltyTransactions,
	orderItems,
	orderPayments,
	orders,
	pets,
	pettyCash,
	poItems,
	poReceivingItems,
	poReceivings,
	portalBookings,
	portalConfig,
	portalReviews,
	portalServices,
	productBatches,
	products,
	productVariants,
	profiles,
	promoCodes,
	promoUsage,
	purchaseOrders,
	returnItems,
	returns,
	rooms,
	seasonalPricing,
	serviceRewards,
	staffAttendances,
	staffSchedules,
	stampCards,
	stockMovements,
	subscriptions,
	suppliers,
	userRoles,
	whatsappConfig,
	whatsappMessages,
	whatsappReminders,
	whatsappScheduled,
	whatsappTemplates,
} from "./schema";

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
	business: one(businesses, {
		fields: [auditLogs.businessId],
		references: [businesses.id],
	}),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
	auditLogs: many(auditLogs),
	billingEvents: many(billingEvents),
	pets: many(pets),
	commissionRules: many(commissionRules),
	commissionRecords: many(commissionRecords),
	kasbons: many(kasbon),
	productBatches: many(productBatches),
	stockMovements: many(stockMovements),
	staffSchedules: many(staffSchedules),
	staffAttendances: many(staffAttendances),
	profiles: many(profiles),
	groomingServices: many(groomingServices),
	groomingAddons: many(groomingAddons),
	groomingAppointments: many(groomingAppointments),
	userRoles: many(userRoles),
	boardings: many(boardings),
	branches: many(branches),
	subscriptions: many(subscriptions),
	products: many(products),
	rooms: many(rooms),
	seasonalPricings: many(seasonalPricing),
	boardingCharges: many(boardingCharges),
	loyaltyConfigs: many(loyaltyConfig),
	loyaltyTiers: many(loyaltyTiers),
	loyaltyTransactions: many(loyaltyTransactions),
	stampCards: many(stampCards),
	customerStamps: many(customerStamps),
	promoCodes: many(promoCodes),
	promoUsages: many(promoUsage),
	serviceRewards: many(serviceRewards),
	customerServiceRewards: many(customerServiceRewards),
	customerLoyalties: many(customerLoyalty),
	suppliers: many(suppliers),
	purchaseOrders: many(purchaseOrders),
	orders: many(orders),
	returns: many(returns),
	whatsappConfigs: many(whatsappConfig),
	whatsappTemplates: many(whatsappTemplates),
	whatsappMessages: many(whatsappMessages),
	whatsappScheduleds: many(whatsappScheduled),
	chartOfAccounts: many(chartOfAccounts),
	journalEntries: many(journalEntries),
	expenses: many(expenses),
	pettyCashes: many(pettyCash),
	portalConfigs: many(portalConfig),
	portalServices: many(portalServices),
	portalBookings: many(portalBookings),
	portalReviews: many(portalReviews),
	customers: many(customers),
	invoices: many(invoices),
	deadLetterQueues: many(deadLetterQueue),
	documentTemplates: many(documentTemplates),
	productVariants: many(productVariants),
	whatsappReminders: many(whatsappReminders),
	branchHolidays: many(branchHolidays),
}));

export const billingEventsRelations = relations(billingEvents, ({ one }) => ({
	business: one(businesses, {
		fields: [billingEvents.businessId],
		references: [businesses.id],
	}),
}));

export const petsRelations = relations(pets, ({ one, many }) => ({
	business: one(businesses, {
		fields: [pets.businessId],
		references: [businesses.id],
	}),
	customer: one(customers, {
		fields: [pets.customerId],
		references: [customers.id],
	}),
	groomingAppointments: many(groomingAppointments),
	boardingPets: many(boardingPets),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
	pets: many(pets),
	groomingAppointments: many(groomingAppointments),
	boardings: many(boardings),
	customerLoyalties: many(customerLoyalty),
	orders: many(orders),
	business: one(businesses, {
		fields: [customers.businessId],
		references: [businesses.id],
	}),
	invoices: many(invoices),
}));

export const commissionRulesRelations = relations(
	commissionRules,
	({ one }) => ({
		business: one(businesses, {
			fields: [commissionRules.businessId],
			references: [businesses.id],
		}),
		profile: one(profiles, {
			fields: [commissionRules.staffId],
			references: [profiles.userId],
		}),
	}),
);

export const profilesRelations = relations(profiles, ({ one, many }) => ({
	commissionRules: many(commissionRules),
	commissionRecords: many(commissionRecords),
	kasbons: many(kasbon),
	staffSchedules: many(staffSchedules),
	staffAttendances: many(staffAttendances),
	business: one(businesses, {
		fields: [profiles.businessId],
		references: [businesses.id],
	}),
	groomingAppointments: many(groomingAppointments),
}));

export const commissionRecordsRelations = relations(
	commissionRecords,
	({ one }) => ({
		business: one(businesses, {
			fields: [commissionRecords.businessId],
			references: [businesses.id],
		}),
		profile: one(profiles, {
			fields: [commissionRecords.staffId],
			references: [profiles.userId],
		}),
	}),
);

export const kasbonRelations = relations(kasbon, ({ one, many }) => ({
	business: one(businesses, {
		fields: [kasbon.businessId],
		references: [businesses.id],
	}),
	profile: one(profiles, {
		fields: [kasbon.staffId],
		references: [profiles.userId],
	}),
	kasbonPayments: many(kasbonPayments),
}));

export const kasbonPaymentsRelations = relations(kasbonPayments, ({ one }) => ({
	kasbon: one(kasbon, {
		fields: [kasbonPayments.kasbonId],
		references: [kasbon.id],
	}),
}));

export const productBatchesRelations = relations(
	productBatches,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [productBatches.businessId],
			references: [businesses.id],
		}),
		productVariant: one(productVariants, {
			fields: [productBatches.variantId],
			references: [productVariants.id],
		}),
		stockMovements: many(stockMovements),
	}),
);

export const productVariantsRelations = relations(
	productVariants,
	({ one, many }) => ({
		productBatches: many(productBatches),
		stockMovements: many(stockMovements),
		poItems: many(poItems),
		orderItems: many(orderItems),
		business: one(businesses, {
			fields: [productVariants.businessId],
			references: [businesses.id],
		}),
		product: one(products, {
			fields: [productVariants.productId],
			references: [products.id],
		}),
	}),
);

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
	productBatch: one(productBatches, {
		fields: [stockMovements.batchId],
		references: [productBatches.id],
	}),
	business: one(businesses, {
		fields: [stockMovements.businessId],
		references: [businesses.id],
	}),
	productVariant: one(productVariants, {
		fields: [stockMovements.variantId],
		references: [productVariants.id],
	}),
}));

export const staffSchedulesRelations = relations(staffSchedules, ({ one }) => ({
	business: one(businesses, {
		fields: [staffSchedules.businessId],
		references: [businesses.id],
	}),
	profile: one(profiles, {
		fields: [staffSchedules.staffId],
		references: [profiles.userId],
	}),
}));

export const staffAttendancesRelations = relations(
	staffAttendances,
	({ one }) => ({
		business: one(businesses, {
			fields: [staffAttendances.businessId],
			references: [businesses.id],
		}),
		profile: one(profiles, {
			fields: [staffAttendances.staffId],
			references: [profiles.userId],
		}),
	}),
);

export const groomingServicesRelations = relations(
	groomingServices,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [groomingServices.businessId],
			references: [businesses.id],
		}),
		groomingAppointments: many(groomingAppointments),
	}),
);

export const groomingAddonsRelations = relations(
	groomingAddons,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [groomingAddons.businessId],
			references: [businesses.id],
		}),
		groomingAppointmentAddons: many(groomingAppointmentAddons),
	}),
);

export const groomingAppointmentsRelations = relations(
	groomingAppointments,
	({ one, many }) => ({
		branch: one(branches, {
			fields: [groomingAppointments.branchId],
			references: [branches.id],
		}),
		business: one(businesses, {
			fields: [groomingAppointments.businessId],
			references: [businesses.id],
		}),
		customer: one(customers, {
			fields: [groomingAppointments.customerId],
			references: [customers.id],
		}),
		profile: one(profiles, {
			fields: [groomingAppointments.groomerId],
			references: [profiles.userId],
		}),
		pet: one(pets, {
			fields: [groomingAppointments.petId],
			references: [pets.id],
		}),
		groomingService: one(groomingServices, {
			fields: [groomingAppointments.serviceId],
			references: [groomingServices.id],
		}),
		groomingAppointmentAddons: many(groomingAppointmentAddons),
		groomingPhotos: many(groomingPhotos),
	}),
);

export const branchesRelations = relations(branches, ({ one, many }) => ({
	groomingAppointments: many(groomingAppointments),
	boardings: many(boardings),
	branchMembers: many(branchMembers),
	business: one(businesses, {
		fields: [branches.businessId],
		references: [businesses.id],
	}),
	rooms: many(rooms),
	purchaseOrders: many(purchaseOrders),
	orders: many(orders),
	expenses: many(expenses),
	pettyCashes: many(pettyCash),
	portalBookings: many(portalBookings),
	invoices: many(invoices),
	branchHolidays: many(branchHolidays),
}));

export const groomingAppointmentAddonsRelations = relations(
	groomingAppointmentAddons,
	({ one }) => ({
		groomingAddon: one(groomingAddons, {
			fields: [groomingAppointmentAddons.addonId],
			references: [groomingAddons.id],
		}),
		groomingAppointment: one(groomingAppointments, {
			fields: [groomingAppointmentAddons.appointmentId],
			references: [groomingAppointments.id],
		}),
	}),
);

export const groomingPhotosRelations = relations(groomingPhotos, ({ one }) => ({
	groomingAppointment: one(groomingAppointments, {
		fields: [groomingPhotos.appointmentId],
		references: [groomingAppointments.id],
	}),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
	business: one(businesses, {
		fields: [userRoles.businessId],
		references: [businesses.id],
	}),
}));

export const boardingsRelations = relations(boardings, ({ one, many }) => ({
	branch: one(branches, {
		fields: [boardings.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [boardings.businessId],
		references: [businesses.id],
	}),
	customer: one(customers, {
		fields: [boardings.customerId],
		references: [customers.id],
	}),
	room: one(rooms, {
		fields: [boardings.roomId],
		references: [rooms.id],
	}),
	boardingPets: many(boardingPets),
	boardingCharges: many(boardingCharges),
	boardingDailyPhotos: many(boardingDailyPhotos),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
	boardings: many(boardings),
	branch: one(branches, {
		fields: [rooms.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [rooms.businessId],
		references: [businesses.id],
	}),
}));

export const branchMembersRelations = relations(branchMembers, ({ one }) => ({
	branch: one(branches, {
		fields: [branchMembers.branchId],
		references: [branches.id],
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
	business: one(businesses, {
		fields: [subscriptions.businessId],
		references: [businesses.id],
	}),
}));

export const boardingPetsRelations = relations(boardingPets, ({ one }) => ({
	pet: one(pets, {
		fields: [boardingPets.petId],
		references: [pets.id],
	}),
	boarding: one(boardings, {
		fields: [boardingPets.boardingId],
		references: [boardings.id],
	}),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
	business: one(businesses, {
		fields: [products.businessId],
		references: [businesses.id],
	}),
	orderItems: many(orderItems),
	productVariants: many(productVariants),
}));

export const seasonalPricingRelations = relations(
	seasonalPricing,
	({ one }) => ({
		business: one(businesses, {
			fields: [seasonalPricing.businessId],
			references: [businesses.id],
		}),
	}),
);

export const boardingChargesRelations = relations(
	boardingCharges,
	({ one }) => ({
		boarding: one(boardings, {
			fields: [boardingCharges.boardingId],
			references: [boardings.id],
		}),
		business: one(businesses, {
			fields: [boardingCharges.businessId],
			references: [businesses.id],
		}),
	}),
);

export const boardingDailyPhotosRelations = relations(
	boardingDailyPhotos,
	({ one }) => ({
		boarding: one(boardings, {
			fields: [boardingDailyPhotos.boardingId],
			references: [boardings.id],
		}),
	}),
);

export const loyaltyConfigRelations = relations(loyaltyConfig, ({ one }) => ({
	business: one(businesses, {
		fields: [loyaltyConfig.businessId],
		references: [businesses.id],
	}),
}));

export const loyaltyTiersRelations = relations(
	loyaltyTiers,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [loyaltyTiers.businessId],
			references: [businesses.id],
		}),
		customerLoyalties: many(customerLoyalty),
	}),
);

export const loyaltyTransactionsRelations = relations(
	loyaltyTransactions,
	({ one }) => ({
		business: one(businesses, {
			fields: [loyaltyTransactions.businessId],
			references: [businesses.id],
		}),
		customerLoyalty: one(customerLoyalty, {
			fields: [loyaltyTransactions.customerLoyaltyId],
			references: [customerLoyalty.id],
		}),
		order: one(orders, {
			fields: [loyaltyTransactions.orderId],
			references: [orders.id],
		}),
	}),
);

export const customerLoyaltyRelations = relations(
	customerLoyalty,
	({ one, many }) => ({
		loyaltyTransactions: many(loyaltyTransactions),
		customerStamps: many(customerStamps),
		promoUsages: many(promoUsage),
		customerServiceRewards: many(customerServiceRewards),
		business: one(businesses, {
			fields: [customerLoyalty.businessId],
			references: [businesses.id],
		}),
		loyaltyTier: one(loyaltyTiers, {
			fields: [customerLoyalty.currentTierId],
			references: [loyaltyTiers.id],
		}),
		customer: one(customers, {
			fields: [customerLoyalty.customerId],
			references: [customers.id],
		}),
	}),
);

export const ordersRelations = relations(orders, ({ one, many }) => ({
	loyaltyTransactions: many(loyaltyTransactions),
	promoUsages: many(promoUsage),
	orderItems: many(orderItems),
	branch: one(branches, {
		fields: [orders.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [orders.businessId],
		references: [businesses.id],
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id],
	}),
	orderPayments: many(orderPayments),
	returns: many(returns),
}));

export const stampCardsRelations = relations(stampCards, ({ one, many }) => ({
	business: one(businesses, {
		fields: [stampCards.businessId],
		references: [businesses.id],
	}),
	customerStamps: many(customerStamps),
}));

export const customerStampsRelations = relations(customerStamps, ({ one }) => ({
	business: one(businesses, {
		fields: [customerStamps.businessId],
		references: [businesses.id],
	}),
	customerLoyalty: one(customerLoyalty, {
		fields: [customerStamps.customerLoyaltyId],
		references: [customerLoyalty.id],
	}),
	stampCard: one(stampCards, {
		fields: [customerStamps.stampCardId],
		references: [stampCards.id],
	}),
}));

export const promoCodesRelations = relations(promoCodes, ({ one, many }) => ({
	business: one(businesses, {
		fields: [promoCodes.businessId],
		references: [businesses.id],
	}),
	promoUsages: many(promoUsage),
}));

export const promoUsageRelations = relations(promoUsage, ({ one }) => ({
	business: one(businesses, {
		fields: [promoUsage.businessId],
		references: [businesses.id],
	}),
	customerLoyalty: one(customerLoyalty, {
		fields: [promoUsage.customerLoyaltyId],
		references: [customerLoyalty.id],
	}),
	order: one(orders, {
		fields: [promoUsage.orderId],
		references: [orders.id],
	}),
	promoCode: one(promoCodes, {
		fields: [promoUsage.promoCodeId],
		references: [promoCodes.id],
	}),
}));

export const serviceRewardsRelations = relations(
	serviceRewards,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [serviceRewards.businessId],
			references: [businesses.id],
		}),
		customerServiceRewards: many(customerServiceRewards),
	}),
);

export const customerServiceRewardsRelations = relations(
	customerServiceRewards,
	({ one }) => ({
		business: one(businesses, {
			fields: [customerServiceRewards.businessId],
			references: [businesses.id],
		}),
		customerLoyalty: one(customerLoyalty, {
			fields: [customerServiceRewards.customerLoyaltyId],
			references: [customerLoyalty.id],
		}),
		serviceReward: one(serviceRewards, {
			fields: [customerServiceRewards.serviceRewardId],
			references: [serviceRewards.id],
		}),
	}),
);

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
	business: one(businesses, {
		fields: [suppliers.businessId],
		references: [businesses.id],
	}),
	purchaseOrders: many(purchaseOrders),
}));

export const purchaseOrdersRelations = relations(
	purchaseOrders,
	({ one, many }) => ({
		branch: one(branches, {
			fields: [purchaseOrders.branchId],
			references: [branches.id],
		}),
		business: one(businesses, {
			fields: [purchaseOrders.businessId],
			references: [businesses.id],
		}),
		supplier: one(suppliers, {
			fields: [purchaseOrders.supplierId],
			references: [suppliers.id],
		}),
		poItems: many(poItems),
		poReceivings: many(poReceivings),
	}),
);

export const poItemsRelations = relations(poItems, ({ one, many }) => ({
	purchaseOrder: one(purchaseOrders, {
		fields: [poItems.poId],
		references: [purchaseOrders.id],
	}),
	productVariant: one(productVariants, {
		fields: [poItems.variantId],
		references: [productVariants.id],
	}),
	poReceivingItems: many(poReceivingItems),
}));

export const poReceivingsRelations = relations(
	poReceivings,
	({ one, many }) => ({
		purchaseOrder: one(purchaseOrders, {
			fields: [poReceivings.poId],
			references: [purchaseOrders.id],
		}),
		poReceivingItems: many(poReceivingItems),
	}),
);

export const poReceivingItemsRelations = relations(
	poReceivingItems,
	({ one }) => ({
		poItem: one(poItems, {
			fields: [poReceivingItems.poItemId],
			references: [poItems.id],
		}),
		poReceiving: one(poReceivings, {
			fields: [poReceivingItems.receivingId],
			references: [poReceivings.id],
		}),
	}),
);

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id],
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id],
	}),
	productVariant: one(productVariants, {
		fields: [orderItems.variantId],
		references: [productVariants.id],
	}),
	returnItems: many(returnItems),
}));

export const orderPaymentsRelations = relations(orderPayments, ({ one }) => ({
	order: one(orders, {
		fields: [orderPayments.orderId],
		references: [orders.id],
	}),
}));

export const returnsRelations = relations(returns, ({ one, many }) => ({
	business: one(businesses, {
		fields: [returns.businessId],
		references: [businesses.id],
	}),
	order: one(orders, {
		fields: [returns.orderId],
		references: [orders.id],
	}),
	returnItems: many(returnItems),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
	orderItem: one(orderItems, {
		fields: [returnItems.orderItemId],
		references: [orderItems.id],
	}),
	return: one(returns, {
		fields: [returnItems.returnId],
		references: [returns.id],
	}),
}));

export const whatsappConfigRelations = relations(whatsappConfig, ({ one }) => ({
	business: one(businesses, {
		fields: [whatsappConfig.businessId],
		references: [businesses.id],
	}),
}));

export const whatsappTemplatesRelations = relations(
	whatsappTemplates,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [whatsappTemplates.businessId],
			references: [businesses.id],
		}),
		whatsappMessages: many(whatsappMessages),
		whatsappScheduleds: many(whatsappScheduled),
	}),
);

export const whatsappMessagesRelations = relations(
	whatsappMessages,
	({ one }) => ({
		business: one(businesses, {
			fields: [whatsappMessages.businessId],
			references: [businesses.id],
		}),
		whatsappTemplate: one(whatsappTemplates, {
			fields: [whatsappMessages.templateId],
			references: [whatsappTemplates.id],
		}),
	}),
);

export const whatsappScheduledRelations = relations(
	whatsappScheduled,
	({ one }) => ({
		business: one(businesses, {
			fields: [whatsappScheduled.businessId],
			references: [businesses.id],
		}),
		whatsappTemplate: one(whatsappTemplates, {
			fields: [whatsappScheduled.templateId],
			references: [whatsappTemplates.id],
		}),
	}),
);

export const chartOfAccountsRelations = relations(
	chartOfAccounts,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [chartOfAccounts.businessId],
			references: [businesses.id],
		}),
		chartOfAccount: one(chartOfAccounts, {
			fields: [chartOfAccounts.parentId],
			references: [chartOfAccounts.id],
			relationName: "chartOfAccounts_parentId_chartOfAccounts_id",
		}),
		chartOfAccounts: many(chartOfAccounts, {
			relationName: "chartOfAccounts_parentId_chartOfAccounts_id",
		}),
		journalEntryLines: many(journalEntryLines),
	}),
);

export const journalEntriesRelations = relations(
	journalEntries,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [journalEntries.businessId],
			references: [businesses.id],
		}),
		journalEntryLines: many(journalEntryLines),
	}),
);

export const journalEntryLinesRelations = relations(
	journalEntryLines,
	({ one }) => ({
		chartOfAccount: one(chartOfAccounts, {
			fields: [journalEntryLines.accountId],
			references: [chartOfAccounts.id],
		}),
		journalEntry: one(journalEntries, {
			fields: [journalEntryLines.journalEntryId],
			references: [journalEntries.id],
		}),
	}),
);

export const expensesRelations = relations(expenses, ({ one }) => ({
	branch: one(branches, {
		fields: [expenses.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [expenses.businessId],
		references: [businesses.id],
	}),
}));

export const pettyCashRelations = relations(pettyCash, ({ one }) => ({
	branch: one(branches, {
		fields: [pettyCash.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [pettyCash.businessId],
		references: [businesses.id],
	}),
}));

export const portalConfigRelations = relations(portalConfig, ({ one }) => ({
	business: one(businesses, {
		fields: [portalConfig.businessId],
		references: [businesses.id],
	}),
}));

export const portalServicesRelations = relations(
	portalServices,
	({ one, many }) => ({
		business: one(businesses, {
			fields: [portalServices.businessId],
			references: [businesses.id],
		}),
		portalBookings: many(portalBookings),
	}),
);

export const portalBookingsRelations = relations(
	portalBookings,
	({ one, many }) => ({
		branch: one(branches, {
			fields: [portalBookings.branchId],
			references: [branches.id],
		}),
		business: one(businesses, {
			fields: [portalBookings.businessId],
			references: [businesses.id],
		}),
		portalService: one(portalServices, {
			fields: [portalBookings.serviceId],
			references: [portalServices.id],
		}),
		portalReviews: many(portalReviews),
	}),
);

export const portalReviewsRelations = relations(portalReviews, ({ one }) => ({
	portalBooking: one(portalBookings, {
		fields: [portalReviews.bookingId],
		references: [portalBookings.id],
	}),
	business: one(businesses, {
		fields: [portalReviews.businessId],
		references: [businesses.id],
	}),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
	branch: one(branches, {
		fields: [invoices.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [invoices.businessId],
		references: [businesses.id],
	}),
	customer: one(customers, {
		fields: [invoices.customerId],
		references: [customers.id],
	}),
	invoiceItems: many(invoiceItems),
	invoicePayments: many(invoicePayments),
}));

export const deadLetterQueueRelations = relations(
	deadLetterQueue,
	({ one }) => ({
		business: one(businesses, {
			fields: [deadLetterQueue.businessId],
			references: [businesses.id],
		}),
	}),
);

export const documentTemplatesRelations = relations(
	documentTemplates,
	({ one }) => ({
		business: one(businesses, {
			fields: [documentTemplates.businessId],
			references: [businesses.id],
		}),
	}),
);

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
	invoice: one(invoices, {
		fields: [invoiceItems.invoiceId],
		references: [invoices.id],
	}),
}));

export const invoicePaymentsRelations = relations(
	invoicePayments,
	({ one }) => ({
		invoice: one(invoices, {
			fields: [invoicePayments.invoiceId],
			references: [invoices.id],
		}),
	}),
);

export const whatsappRemindersRelations = relations(
	whatsappReminders,
	({ one }) => ({
		business: one(businesses, {
			fields: [whatsappReminders.businessId],
			references: [businesses.id],
		}),
	}),
);

export const branchHolidaysRelations = relations(branchHolidays, ({ one }) => ({
	branch: one(branches, {
		fields: [branchHolidays.branchId],
		references: [branches.id],
	}),
	business: one(businesses, {
		fields: [branchHolidays.businessId],
		references: [businesses.id],
	}),
}));
