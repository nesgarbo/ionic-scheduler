import { InjectionToken } from '@angular/core';

/**
 * The Scheduler root, for the parts that need something the shared state does not carry.
 *
 * Upstream this was `PARENT_INSTANCE`, a token every Optimus component provided. Here only the
 * Scheduler root provides it, and only the print header reads it: the print chrome is a property of
 * the root's `print()` call and not of the schedule, so it never belonged in the state.
 */
export const SCHEDULER_ROOT = new InjectionToken<SchedulerRootRef>('ionic-scheduler-root');

/** What a part may read off the root. */
export interface SchedulerRootRef {
    /** What the printed header should carry while a print is running, `null` when not printing. */
    printChrome(): { generatedAt?: boolean; timezone?: boolean; filters?: string[] } | null;
}
