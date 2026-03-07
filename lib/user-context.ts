import type { UserContext } from '@/types/grounding';

export function getUserContext(): UserContext {
  return {
    localTime: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    language: typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US',
  };
}
