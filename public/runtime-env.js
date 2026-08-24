(function configurePetStoreRuntime(globalObject) {
  const current = globalObject.env || {};
  const isLocalFrontend = globalObject.location.port === "3001";
  globalObject.env = {
    ENVIRONMENT: isLocalFrontend ? "development" : "production",
    DEFAULT_LANGUAGE: "en_US",
    APP_NAME: "Petso",
    analytics: [],
    FILE_STORAGE_IMPORT_MAX_SIZE: 5242880,
    PET_STORE_API_URL: globalObject.location.origin,
    URL: globalObject.location.origin,
    ...current,
  };
})(window);
