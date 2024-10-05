export default function presentInstallationInfo(data: {
  version: string;
  latestVersion: string;
  versionsBehind: number;
}) {
  return {
    version: data.version,
    latestVersion: data.latestVersion,
    versionsBehind: data.versionsBehind,
  };
}
