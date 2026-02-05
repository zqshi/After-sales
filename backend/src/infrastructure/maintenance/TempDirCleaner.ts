import fs from 'fs/promises';
import path from 'path';

type TargetKind = 'dirPrefix' | 'dirName' | 'fileSuffix';

type TempDirTarget = {
  baseDir: string;
  kind: TargetKind;
  pattern: string;
  recursive?: boolean;
  maxAgeMs?: number;
};

type TempDirCleanerConfig = {
  enabled: boolean;
  intervalMs: number;
  maxAgeMs: number;
  targets: ReadonlyArray<TempDirTarget>;
  excludeDirs?: ReadonlyArray<string>;
};

type LoggerLike = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export class TempDirCleaner {
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private readonly config: TempDirCleanerConfig,
    private readonly logger: LoggerLike = console,
  ) {}

  start(): void {
    if (!this.config.enabled) {
      this.logger.info('[TempDirCleaner] Disabled');
      return;
    }
    if (this.intervalId) {
      this.logger.warn('[TempDirCleaner] Already running');
      return;
    }
    this.logger.info(
      `[TempDirCleaner] Starting (interval ${this.config.intervalMs}ms, maxAge ${this.config.maxAgeMs}ms)`,
    );
    this.intervalId = setInterval(() => {
      this.cleanup().catch((err) =>
        this.logger.error(`[TempDirCleaner] Cleanup error: ${this.formatError(err)}`),
      );
    }, this.config.intervalMs);
    this.cleanup().catch((err) =>
      this.logger.error(`[TempDirCleaner] Initial cleanup error: ${this.formatError(err)}`),
    );
  }

  stop(): void {
    if (!this.intervalId) {
      return;
    }
    clearInterval(this.intervalId);
    this.intervalId = null;
    this.logger.info('[TempDirCleaner] Stopped');
  }

  private async cleanup(): Promise<void> {
    const now = Date.now();
    let deletedCount = 0;

    for (const target of this.config.targets) {
      const maxAgeMs = target.maxAgeMs ?? this.config.maxAgeMs;
      deletedCount += await this.cleanupTarget(target, now, maxAgeMs);
    }

    if (deletedCount > 0) {
      this.logger.info(`[TempDirCleaner] Deleted ${deletedCount} temp items`);
    }
  }

  private async cleanupTarget(
    target: TempDirTarget,
    now: number,
    maxAgeMs: number,
  ): Promise<number> {
    let deletedCount = 0;
    let entries: string[] = [];
    try {
      entries = await fs.readdir(target.baseDir);
    } catch (err) {
      this.logger.warn(
        `[TempDirCleaner] Skip baseDir=${target.baseDir}: ${this.formatError(err)}`,
      );
      return 0;
    }

    for (const entry of entries) {
      if (this.isExcluded(entry)) {
        continue;
      }
      const fullPath = path.join(target.baseDir, entry);
      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          if (this.matchesDir(entry, target.kind, target.pattern)) {
            const ageMs = now - stat.mtimeMs;
            if (ageMs >= maxAgeMs) {
              await fs.rm(fullPath, { recursive: true, force: true });
              deletedCount += 1;
            }
            continue;
          }
          if (target.recursive) {
            deletedCount += await this.cleanupTarget(
              { ...target, baseDir: fullPath, recursive: true },
              now,
              maxAgeMs,
            );
          }
        } else if (stat.isFile()) {
          if (this.matchesFile(entry, target.kind, target.pattern)) {
            const ageMs = now - stat.mtimeMs;
            if (ageMs >= maxAgeMs) {
              await fs.rm(fullPath, { force: true });
              deletedCount += 1;
            }
          }
        }
      } catch (err) {
        this.logger.warn(
          `[TempDirCleaner] Failed to process ${fullPath}: ${this.formatError(err)}`,
        );
      }
    }

    return deletedCount;
  }

  private matchesDir(entry: string, kind: TargetKind, pattern: string): boolean {
    if (kind === 'dirPrefix') {
      return entry.startsWith(pattern);
    }
    if (kind === 'dirName') {
      return entry === pattern;
    }
    return false;
  }

  private matchesFile(entry: string, kind: TargetKind, pattern: string): boolean {
    if (kind === 'fileSuffix') {
      return entry.endsWith(pattern);
    }
    return false;
  }

  private isExcluded(entry: string): boolean {
    return this.config.excludeDirs?.includes(entry) ?? false;
  }

  private formatError(err: unknown): string {
    if (err instanceof Error) {
      return err.message;
    }
    return String(err);
  }
}
