export function signin(service = "slack"): string {
  return `/auth/${service}`;
}

export function settingsPath(section?: string): string {
  return "/settings" + (section ? `/${section}` : "");
}

export function integrationSettingsPath(id: string): string {
  return `/settings/integrations/${id}`;
}
