// No cleanup needed for app password-based integration
export async function uninstall(_teamId: string) {
  // App password integration doesn't create database records
  // that need to be cleaned up
}
