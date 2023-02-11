type Edition = "community" | "cloud" | "enterprise";

interface PackageConfig {
  id: string;
  editions: Edition[];
}

const config: PackageConfig = {
  id: "slack",
  editions: ["community", "cloud", "enterprise"],
};

export default config;
