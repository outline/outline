import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ICustomer } from "../customer.types";
import { CustomerDetailSheet } from "./CustomerDetailSheet";

vi.mock("@/lib/api/pets.functions", () => ({
	getPetsByCustomer: vi.fn(),
	addPet: vi.fn(),
}));

import { getPetsByCustomer } from "@/lib/api/pets.functions";

globalThis.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

const customer: ICustomer = {
	id: "cust-1" as ICustomer["id"],
	businessId: "biz-1",
	userId: null,
	fullName: "Budi Santoso",
	phone: "0812345678",
	email: "budi@example.com",
	address: null,
	notes: null,
	isActive: true,
	createdAt: new Date(),
	updatedAt: new Date(),
};

const createWrapper = () => {
	const queryClient = new QueryClient();
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe("CustomerDetailSheet — Pets section", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the customer's pets fetched via getPetsByCustomer", async () => {
		(
			getPetsByCustomer as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: "pet-1",
				name: "Bobby",
				species: "dog",
				photoUrl: null,
			},
		]);

		render(
			<CustomerDetailSheet
				customer={customer}
				onClose={vi.fn()}
				onEdit={vi.fn()}
			/>,
			{ wrapper: createWrapper() },
		);

		expect(await screen.findByText("Bobby")).toBeInTheDocument();
	});

	it("opens the add-pet dialog when 'Tambah Hewan' is clicked", async () => {
		(
			getPetsByCustomer as unknown as ReturnType<typeof vi.fn>
		).mockResolvedValue([]);

		render(
			<CustomerDetailSheet
				customer={customer}
				onClose={vi.fn()}
				onEdit={vi.fn()}
			/>,
			{ wrapper: createWrapper() },
		);

		const addButton = await screen.findByRole("button", {
			name: /Tambah Hewan/i,
		});
		addButton.click();

		expect(
			await screen.findByRole("heading", { name: /Tambah Hewan Peliharaan/i }),
		).toBeInTheDocument();
	});
});
