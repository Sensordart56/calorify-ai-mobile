export class ApplicationVersionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'ApplicationVersionError';
  }
}

export function requireApplicationVersion(value: unknown): string {
  if (typeof value !== 'string' || value.trim() !== value || value.length < 1 || value.length > 128) {
    throw new ApplicationVersionError('A non-empty configured application version is required.');
  }
  return value;
}
