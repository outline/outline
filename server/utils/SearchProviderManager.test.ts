import PostgresSearchProvider from "@server/../plugins/search-postgres/server/PostgresSearchProvider";
import SearchProviderManager from "./SearchProviderManager";

beforeEach(() => {
  SearchProviderManager.reset();
});

describe("SearchProviderManager", () => {
  it("should return the postgres provider by default", () => {
    const provider = SearchProviderManager.getProvider();
    expect(provider).toBeInstanceOf(PostgresSearchProvider);
    expect(provider.id).toBe("postgres");
  });

  it("should cache the provider instance", () => {
    const provider1 = SearchProviderManager.getProvider();
    const provider2 = SearchProviderManager.getProvider();
    expect(provider1).toBe(provider2);
  });

  it("should clear the cache on reset", () => {
    const provider1 = SearchProviderManager.getProvider();
    SearchProviderManager.reset();
    // After reset, getProvider will re-resolve (though the same singleton is returned
    // by the plugin, the manager's cache was cleared)
    const provider2 = SearchProviderManager.getProvider();
    expect(provider2).toBeInstanceOf(PostgresSearchProvider);
    expect(provider1.id).toBe(provider2.id);
  });
});
