/**
 * ionic-scheduler — the whole public surface.
 *
 * One entry point rather than the secondary entry points the upstream library splits into: an Ionic
 * application already builds through the CLI, and the parts are standalone, so the bundler drops
 * whatever the page does not import without needing a separate package path to do it.
 *
 * The stylesheet is NOT imported from here. It is a plain CSS file, and a library that injected its
 * own styles would land them after the application's — add `ionic-scheduler/styles/scheduler.css` to
 * `angular.json` (or `@import` it from your global stylesheet) so the cascade stays yours.
 */
export * from './types/scheduler.types';
export * from './lib/scheduler';
export * from './lib/scheduler.module';
export * from './lib/scheduler-root-token';
export * from './lib/scheduler-agenda';
export * from './lib/scheduler-context';
export * from './lib/scheduler-date';
export * from './lib/scheduler-drag';
export * from './lib/scheduler-keyboard';
export * from './lib/scheduler-layout';
export * from './lib/scheduler-month';
export * from './lib/scheduler-outlet';
export * from './lib/scheduler-overlays';
export * from './lib/scheduler-parts';
export * from './lib/scheduler-recurrence';
export * from './lib/scheduler-registry';
export * from './lib/scheduler-resolver';
export * from './lib/scheduler-state';
export * from './lib/scheduler-time-grid';
export * from './lib/scheduler-timeline';
export * from './lib/scheduler-timeline-axis';
export * from './lib/scheduler-timezone';
export * from './lib/scheduler-transfer';
export * from './lib/scheduler-view-base';
export * from './lib/scheduler-year';
