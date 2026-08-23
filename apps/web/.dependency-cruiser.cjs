module.exports = {
	forbidden: [
		{
			name: "shared-no-domain",
			severity: "error",
			from: { path: "^src/shared/" },
			to: { path: "^src/domain/" },
		},
		{
			name: "no-deep-cross-domain-import",
			severity: "error",
			comment: "Import antar domain wajib via index.ts",
			from: { path: "^src/domain/([^/]+)/" },
			to: {
				path: "^src/domain/([^/]+)/(?!index\\.ts)",
				pathNot: "^src/domain/$1/",
			},
		},
		{
			name: "domain-no-infra",
			severity: "error",
			comment:
				"Domain layer dilarang import dari infra/ (kecuali *.live.ts, *.drizzle.ts, dan gated integration test *.drizzle.test.ts)",
			from: {
				path: "^src/domain/[^/]+/(?!.*\\.(live|drizzle)(\\.test)?\\.ts)",
			},
			to: { path: "^src/infra/" },
		},
	],
	options: { tsConfig: { fileName: "tsconfig.json" } },
};
