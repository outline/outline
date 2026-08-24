import { expect, test, type Page } from "playwright/test";

const success = (data: object | readonly object[]) => ({
  success: true,
  data,
  meta: { requestId: "e2e" },
});

async function rejectLegacyRequests(page: Page) {
  const legacyRequests: string[] = [];
  await page.route("**/*", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const isDottedRpc = /^\/api\/[^/]+\.[^/]+$/.test(pathname);
    if (isDottedRpc || pathname.startsWith("/_server")) {
      legacyRequests.push(pathname);
      await route.fulfill({ status: 410, body: "Legacy runtime disabled" });
      return;
    }
    await route.fallback();
  });
  return legacyRequests;
}

async function mockAuthenticatedApi(page: Page) {
  const legacyRequests = await rejectLegacyRequests(page);
  await page.route("**/api/v1/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (pathname === "/api/v1/auth/session") {
      await route.fulfill({
        json: success({
          user: {
            id: "user-1",
            email: "owner@petso.test",
            name: "Petso Owner",
            avatarUrl: null,
            language: "en_US",
            role: "owner",
          },
          business: {
            id: "business-1",
            name: "Petso Test",
            slug: "petso-test",
            logoUrl: null,
          },
          branches: [{ id: "branch-1", name: "Main" }],
          permissions: { isAdmin: true, manageBranches: true },
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/products") {
      await route.fulfill({
        json: success([
          {
            id: "product-1",
            businessId: "business-1",
            name: "Premium Dog Food",
            sku: "DOG-001",
            category: "Food",
            description: null,
            brand: "Petso",
            imageUrl: null,
            isActive: true,
            isFeatured: true,
            hasVariants: false,
            createdAt: "2026-08-24T00:00:00.000Z",
            updatedAt: "2026-08-24T00:00:00.000Z",
            variants: [
              {
                id: "variant-1",
                productId: "product-1",
                name: "Default",
                sku: "DOG-001",
                barcode: null,
                price: 125000,
                unit: "pcs",
                stock: 8,
                lowStockThreshold: 2,
                isActive: true,
                sortOrder: 0,
                createdAt: "2026-08-24T00:00:00.000Z",
                updatedAt: "2026-08-24T00:00:00.000Z",
              },
            ],
          },
        ]),
      });
      return;
    }
    if (pathname === "/api/v1/admin/orders" && request.method() === "POST") {
      await route.fulfill({
        json: success({
          id: "order-1",
          branchId: "branch-1",
          customerId: null,
          totalAmount: 125000,
          paymentMethod: "cash",
          status: "completed",
          discountType: null,
          discountValue: 0,
          discountAmount: 0,
          voucherCode: null,
          voucherDiscount: 0,
          voidedAt: null,
          voidedReason: null,
          voidedBy: null,
          createdBy: "user-1",
          createdAt: "2026-08-24T00:00:00.000Z",
          items: [
            {
              id: "order-item-1",
              orderId: "order-1",
              productId: "product-1",
              variantId: "variant-1",
              productName: "Premium Dog Food",
              quantity: 1,
              priceAtTime: 125000,
              discountType: null,
              discountValue: 0,
              discountAmount: 0,
            },
          ],
          payments: [
            {
              id: "payment-1",
              orderId: "order-1",
              method: "cash",
              amount: 125000,
              createdAt: "2026-08-24T00:00:00.000Z",
            },
          ],
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/accounting/dashboard") {
      await route.fulfill({
        json: success({
          revenue: 0,
          expenses: 0,
          profit: 0,
          activeBoardings: 0,
          occupancyRate: 0,
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/accounting/cash-flow") {
      await route.fulfill({
        json: success({
          inflows: [],
          outflows: [],
          totalInflow: 0,
          totalOutflow: 0,
          netCashFlow: 0,
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/inventory") {
      await route.fulfill({ json: success({ batches: [], movements: [] }) });
      return;
    }
    if (pathname === "/api/v1/admin/billing") {
      await route.fulfill({
        json: success({
          subscription: null,
          invoices: [],
          usage: {
            products: 1,
            branches: 1,
            staff: 1,
            activeBoardings: 0,
            transactionsMonth: 0,
          },
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/portal") {
      await route.fulfill({
        json: success({
          config: { slug: "petso-test", isActive: true, bookingEnabled: true },
          services: [],
          stats: {
            totalReviews: 0,
            averageRating: 0,
            totalServices: 0,
            totalPets: 0,
          },
          reviews: [],
          bookings: [],
        }),
      });
      return;
    }
    if (pathname === "/api/v1/admin/loyalty/config") {
      await route.fulfill({
        json: success({
          pointsPerRupiah: 0,
          pointsExpiryDays: 365,
          minRedeemPoints: 0,
          isActive: false,
          tiers: [],
        }),
      });
      return;
    }
    await route.fulfill({ json: success([]) });
  });
  return legacyRequests;
}

async function mockUnauthenticatedApi(page: Page) {
  const legacyRequests = await rejectLegacyRequests(page);
  await page.route("**/api/v1/auth/session", async (route) => {
    await route.fulfill({
      status: 401,
      json: {
        success: false,
        error: { message: "Unauthorized" },
        meta: { requestId: "e2e" },
      },
    });
  });
  return legacyRequests;
}

test("root follows the Pet Store auth flow", async ({ page }) => {
  const legacyRequests = await mockUnauthenticatedApi(page);

  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  expect(legacyRequests).toEqual([]);
});

test("authenticated root opens the Pet Store dashboard", async ({ page }) => {
  const legacyRequests = await mockAuthenticatedApi(page);

  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: "Dashboard" }).first()
  ).toBeVisible();
  expect(legacyRequests).toEqual([]);
});

test("legacy Outline routes cannot reach the legacy runtime", async ({
  page,
}) => {
  test.setTimeout(90_000);
  const legacyRequests = await mockAuthenticatedApi(page);
  const legacyPaths = [
    "/create",
    "/logout",
    "/desktop-redirect",
    "/oauth/authorize",
    "/setup",
    "/home",
    "/drafts",
    "/archive",
    "/trash",
    "/search",
    "/doc/new",
    "/doc/legacy-note",
    "/d/legacy-note",
    "/notebook/legacy-notebook",
    "/collections/legacy-collection",
    "/share/legacy-share",
    "/s/legacy-share",
    "/settings/security",
  ];

  for (const path of legacyPaths) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Not found" })
    ).toBeVisible();
  }

  expect(legacyRequests).toEqual([]);
});

test("public booking derives the branch and preserves idempotency", async ({
  page,
}) => {
  await mockAuthenticatedApi(page);
  const bookingBodies: string[] = [];
  await page.route("**/api/v1/public/business/petso**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith("/branches")) {
      await route.fulfill({
        json: success([
          {
            id: "branch-1",
            businessId: "business-1",
            name: "North",
            address: null,
            phone: null,
            capacity: 10,
            isActive: true,
          },
          {
            id: "branch-2",
            businessId: "business-1",
            name: "South",
            address: null,
            phone: null,
            capacity: 10,
            isActive: true,
          },
        ]),
      });
      return;
    }
    if (url.pathname.endsWith("/rooms")) {
      await route.fulfill({
        json: success([
          {
            id: "room-1",
            businessId: "business-1",
            branchId: "branch-1",
            name: "North Suite",
            description: null,
            roomType: "North Suite",
            capacity: 1,
            dailyRate: 150000,
            isActive: true,
            occupied: 0,
            available: 1,
          },
          {
            id: "room-2",
            businessId: "business-1",
            branchId: "branch-2",
            name: "South Suite",
            description: null,
            roomType: "South Suite",
            capacity: 1,
            dailyRate: 175000,
            isActive: true,
            occupied: 0,
            available: 1,
          },
        ]),
      });
      return;
    }
    if (url.pathname.endsWith("/bookings") && request.method() === "POST") {
      const body = request.postData() ?? "";
      bookingBodies.push(body);
      expect(body).toContain('"branchId":"branch-2"');
      expect(body).toContain('"roomId":"room-2"');
      expect(body).toContain('"estimatedCheckOutAt"');
      if (bookingBodies.length < 4) {
        await route.fulfill({
          status: 503,
          json: {
            success: false,
            error: { message: "Retry" },
            meta: { requestId: "e2e" },
          },
        });
        return;
      }
      await route.fulfill({
        json: success({
          created: true,
          code: `booking-${bookingBodies.length}`,
          booking: {
            id: `booking-${bookingBodies.length}`,
            code: `booking-${bookingBodies.length}`,
          },
        }),
      });
      return;
    }
    await route.fulfill({
      json: success({
        id: "business-1",
        name: "Petso Test",
        slug: "petso",
        logoUrl: null,
      }),
    });
  });

  await page.goto("/p/petso/booking");
  await page.getByLabel("Phone number").fill("08123456789");
  await page.getByLabel("Your name").fill("Alice");
  await page.getByLabel("Pet’s name").fill("Buddy");
  await page.getByRole("radio", { name: /South Suite/ }).check();
  const submit = page.getByRole("button", { name: "Request booking" });
  await expect(submit).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await submit.click();
  await expect.poll(() => bookingBodies.length).toBe(1);
  await submit.click();
  await expect.poll(() => bookingBodies.length).toBe(2);

  await page.getByLabel("Pet’s name").fill("Milo");
  await submit.click();
  await expect.poll(() => bookingBodies.length).toBe(3);

  await page.getByLabel("Pet’s name").fill("Buddy");
  await submit.click();
  await expect(page.getByTestId("booking-result")).toContainText("booking-4");

  await page.getByLabel("Phone number").fill("08123456789");
  await page.getByLabel("Your name").fill("Alice");
  await page.getByLabel("Pet’s name").fill("Buddy");
  await submit.click();
  await expect(page.getByTestId("booking-result")).toContainText("booking-5");

  const idempotencyKeys = bookingBodies.map(
    (body) => /"idempotencyKey":"([^"]+)"/.exec(body)?.[1] ?? ""
  );
  expect(idempotencyKeys[0]).toBeTruthy();
  expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
  expect(idempotencyKeys[2]).not.toBe(idempotencyKeys[1]);
  expect(idempotencyKeys[3]).not.toBe(idempotencyKeys[2]);
  expect(idempotencyKeys[4]).not.toBe(idempotencyKeys[3]);
});

test("owner can complete POS and open inventory, billing, and staff", async ({
  page,
}) => {
  const legacyRequests = await mockAuthenticatedApi(page);
  await page.goto("/pos");
  await page.getByRole("button", { name: /Premium Dog Food/ }).click();
  await page.getByRole("button", { name: "Charge" }).click();
  await expect(page.getByTestId("pos-receipt")).toContainText("order-1");
  for (const [path, heading] of [
    ["/inventory", "Inventory"],
    ["/settings/billing", "Billing"],
    ["/staff", "Staff"],
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: heading }).first()
    ).toBeVisible();
  }
  expect(legacyRequests).toEqual([]);
});
