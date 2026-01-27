import { z, ZodError } from 'zod';

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  static fromZodError(error: ZodError): ValidationError {
    const errors = error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return new ValidationError('Validation failed', errors);
  }
}

/**
 * 验证工具类
 */
export class Validator {
  /**
   * 验证数据并返回验证后的结果
   *
   * @param schema Zod schema
   * @param data 要验证的数据
   * @returns 验证后的数据
   * @throws ValidationError 验证失败时抛出
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ValidationError.fromZodError(error);
      }
      throw error;
    }
  }

  /**
   * 安全验证（不抛出异常）
   *
   * @param schema Zod schema
   * @param data 要验证的数据
   * @returns 验证结果
   */
  static safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
    const result = schema.safeParse(data);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    return { success: false, errors };
  }
}
