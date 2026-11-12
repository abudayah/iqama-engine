import { Logger } from '@nestjs/common';

/** Settings of the removed legacy / shadow Iqama engine. They no longer do anything. */
export const REMOVED_ENV_VARS = ['IQAMA_RULES', 'IQAMA_RULES_CUTOVER'] as const;

/**
 * Production may still set the old variables. They are ignored; log one info
 * line at startup so nobody expects them to work. Returns the names found.
 */
export function logIgnoredLegacyEnv(
  env: NodeJS.ProcessEnv = process.env,
  logger: Pick<Logger, 'log'> = new Logger('Config'),
): string[] {
  const found = REMOVED_ENV_VARS.filter((name) => env[name] !== undefined);
  if (found.length > 0) {
    logger.log(
      `Ignoring removed setting(s): ${found.join(', ')}. The Iqama rules now always come from the database (IqamaRuleVersion); you can delete these from the environment.`,
    );
  }
  return [...found];
}
