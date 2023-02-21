export function signin(service = "slack"): string {
  return `/auth/${service}`;
}

export function integrationSettingsPath(id: string): string {
  return `/settings/integrations/${id}`;
}
