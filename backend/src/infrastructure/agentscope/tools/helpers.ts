export function requireString(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${key} is required`);
  }
  return value.trim();
}

export function optionalString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    return value.trim();
  }
  return undefined;
}

export function optionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function optionalArray<T = unknown>(value: unknown): T[] | undefined {
  if (Array.isArray(value)) {
    return value as T[];
  }
  return undefined;
}

export function toRecord(value: unknown, key: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${key} must be an object`);
  }
  return value as Record<string, unknown>;
}
