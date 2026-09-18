# ionic-scheduler

A compound scheduling surface for Ionic Angular — day, week, month, year, agenda, timeline and
resource-timeline views — built out of Ionic components and themed with Ionic's own design tokens.

The chrome is real Ionic: the header is an `ion-toolbar`, the view switcher an `ion-segment`, the
legend `ion-chip`s, the overlays `ion-popover`s. So a skin like
[`@rdlabo/ionic-theme-ios26`](https://www.npmjs.com/package/@rdlabo/ionic-theme-ios26) or
[`@rdlabo/ionic-theme-md3`](https://www.npmjs.com/package/@rdlabo/ionic-theme-md3) styles the
scheduler's controls without knowing it exists, and the grid — which has no Ionic equivalent — is
drawn from `--ion-background-color`, `--ion-text-color`, `--ion-color-primary` and
`--ion-color-danger`, so it follows the same palette, the same dark mode and the same brand.

## Install

```bash
npm install ionic-scheduler
# or
bun add ionic-scheduler
```

Peer dependencies: `@angular/core` and `@angular/common` ≥ 20, `@ionic/angular` ≥ 8, `ionicons` ≥ 7.
Built and tested against Angular 22 and Ionic 9.

### Styles

The package ships one plain CSS file. It is not injected for you, so that the cascade stays yours:

```jsonc
// angular.json → architect.build.options.styles
"styles": [
    "src/theme/variables.scss",
    "node_modules/ionic-scheduler/styles/scheduler.css",
    "src/global.scss"
]
```

or from a global stylesheet:

```css
@import 'ionic-scheduler/styles/scheduler.css';
```

Load it **after** Ionic's own CSS and any theme skin, and **before** your application's overrides.

## Quick start

Every part is standalone. Import the ones the page uses, or `SchedulerModule` for the whole set.

```ts
import { Component, signal } from '@angular/core';
import {
    Scheduler,
    SchedulerHeader,
    SchedulerNavigation,
    SchedulerTitle,
    SchedulerViewSelector,
    SchedulerContent,
    SchedulerMonthScope,
    SchedulerWeekScope,
    SchedulerAgendaScope,
    SchedulerQuickInfo,
    type SchedulerEvent,
    type SchedulerViewType
} from 'ionic-scheduler';

@Component({
    selector: 'app-charter-schedule',
    imports: [
        Scheduler,
        SchedulerHeader,
        SchedulerNavigation,
        SchedulerTitle,
        SchedulerViewSelector,
        SchedulerContent,
        SchedulerMonthScope,
        SchedulerWeekScope,
        SchedulerAgendaScope,
        SchedulerQuickInfo
    ],
    template: `
        <ionic-scheduler-root [events]="events()" [(view)]="view" [(date)]="date" [quickInfo]="true" ariaLabel="Charter schedule">
            <ionic-scheduler-header>
                <ionic-scheduler-navigation />
                <ionic-scheduler-title />
                <ionic-scheduler-view-selector />
            </ionic-scheduler-header>

            <ionic-scheduler-content>
                <ionic-scheduler-month />
                <ionic-scheduler-week />
                <ionic-scheduler-agenda />
            </ionic-scheduler-content>

            <ionic-scheduler-quick-info />
        </ionic-scheduler-root>
    `
})
export class CharterSchedulePage {
    readonly view = signal<SchedulerViewType>('month');
    readonly date = signal(new Date());
    readonly events = signal<SchedulerEvent[]>([{ id: 1, title: 'Sea trial', start: '2026-09-18T09:00', end: '2026-09-18T13:00' }]);
}
```

On a phone, `agenda` is the view that works: its rows are as tall as their content and empty days are
left out, so there is no geometry to squeeze into 390 pixels.

## Height, scrolling and the frozen header

The Scheduler scrolls **inside itself**: the rows move while the day headers, the timeline bands and
the resource rail stay where they are. That only works if the component has a height to scroll
within, so it takes `100%` of its container by default — inside `ion-content`, or any parent with a
resolved height, there is nothing to configure:

```html
<ion-content>
    <ionic-scheduler-root …> … </ionic-scheduler-root>
</ion-content>
```

Where the parent has no height of its own the percentage resolves to `auto`, the whole schedule grows
to fit its rows and the page scrolls it as one block — nothing breaks, but the header goes with it,
because `position: sticky` pins to the scrollport that is actually moving and in that layout none of
them is. Give it a height when the page cannot:

```css
ionic-scheduler-root {
    --ionic-scheduler-height: calc(100dvh - 8rem);
}
```

### Opening at the right moment

A day grid that opens at midnight, or a month timeline that opens on the 1st, makes the reader find
the present before they can use it. `scrollTime` decides what is brought into view when a view is
drawn — `auto` by default, which is now while the rendered range contains it and the start of
`businessHours` when it does not:

| `scrollTime` | What it brings into view                                                      |
| ------------ | ----------------------------------------------------------------------------- |
| `"auto"`     | now while the range holds it, else the start of `businessHours` (the default) |
| `"now"`      | the current time of day, whatever the range                                   |
| `"business"` | the start of `businessHours`                                                  |
| `"08:30"`    | that time of day                                                              |
| `510`        | minutes from midnight                                                         |
| `"none"`     | nothing — the view opens where the markup puts it                             |

It runs once per range, view and explicit request — not on every update, because a grid that jumps
back to now while someone is reading last Tuesday is a grid fighting its user. For the other half of
that decision, a "now" button, call the method:

```ts
readonly scheduler = viewChild.required(Scheduler);

goToNow(): void {
    this.scheduler().scrollToTime('now');
}
```

The timeline scrolls to the **instant**, not to its column: at 17:40 on an axis of hours, the top of
the 17:00 column is most of a column away from now.

## How it is put together

`ionic-scheduler-root` owns the data, the view state, the selection and the overlays. Every child
reads what it needs from that shared state, so nothing is passed down through inputs: adding a part
to the tree is enough to make it work, and leaving one out is enough to leave it out of the page.

There are four kinds of child:

| Kind         | Parts                                                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Regions**  | `ionic-scheduler-header`, `ionic-scheduler-content`, `ionic-scheduler-footer`                                                                                                                   |
| **Chrome**   | `ionic-scheduler-navigation`, `-title`, `-view-selector`, `-category-legend`, `-selection-toolbar`, `-loading`, `-print-header`                                                                 |
| **Scopes**   | `ionic-scheduler-day`, `-week`, `-month`, `-year`, `-agenda`, `-timeline`, `-resource-day`, `-resource-week`, `-resource-month`, `-resource-timeline`, `-date-day`, `-date-week`, `-date-month` |
| **Overlays** | `ionic-scheduler-more-popover`, `-quick-info`, `-popover`, `-context-menu`                                                                                                                      |

A scope draws nothing itself: it declares that a view is available — which is also what the view
selector offers — and holds the definitions that apply to it. Each overlay is opt-in twice: a flag on
the root decides when it opens, the part in the tree decides what it contains.

### Views

All 21 view types render: `day`, `week`, `month`, `year`, `agenda`, `timeline`, `timelineDay`,
`timelineWeek`, `timelineMonth`, `timelineYear`, `resourceDay`, `resourceWeek`, `resourceMonth`,
`resourceTimeline`, `resourceTimelineDay`, `resourceTimelineWeek`, `resourceTimelineMonth`,
`resourceTimelineYear`, `dateDay`, `dateWeek`, `dateMonth`.

### Custom cards and cells

Any surface can be replaced with a template, resolved from the narrowest scope outwards — a
definition inside `ionic-scheduler-week` applies to the week only, the same one in
`ionic-scheduler-content` is the fallback for every view:

```html
<ionic-scheduler-content>
    <ionic-scheduler-month>
        <ionic-scheduler-month-event *schedulerMonthEventDef="let ctx">
            <ion-chip [style.--background]="ctx.accentColor">{{ ctx.title }}</ion-chip>
        </ionic-scheduler-month-event>
    </ionic-scheduler-month>
</ionic-scheduler-content>
```

The context arrives with the title, the time text and the accent colour already resolved, and each
definition is instantiated per surface with its own injector, so a component placed inside one can
inject the context of the exact cell or event it was drawn for.

Definitions exist for events (`*schedulerEventDef`, `*schedulerTimeGridEventDef`,
`*schedulerMonthEventDef`, `*schedulerAllDayEventDef`, `*schedulerAgendaEventDef`,
`*schedulerTimelineEventDef`), for cells and headers (`*schedulerDayHeaderDef`,
`*schedulerTimeGridCellDef`, `*schedulerWorkCellDef`, `*schedulerMonthCellDef`,
`*schedulerMonthCellNumberDef`, `*schedulerMonthMoreLinkDef`, `*schedulerMiniMonthCellDef`,
`*schedulerTimelineCellDef`, …) and for the resource rail (`*schedulerResourceDef`,
`*schedulerResourceGroupDef`, `*schedulerResourceRowDef`, `*schedulerResourceHeaderDef`, …).

## Theming

Everything the grid draws with reads a public `--ionic-scheduler-*` variable first and falls back to
a value derived from Ionic's tokens. Set an override anywhere up the tree — `:root`, a page, the
component itself:

```css
ionic-scheduler-root {
    --ionic-scheduler-slot-height: 2.25rem;
    --ionic-scheduler-today-background: color-mix(in srgb, var(--ion-color-secondary) 12%, transparent);
    --ionic-scheduler-weekend-background: var(--ion-color-step-50);
}
```

The defaults, and where they come from:

| What                                    | Default source                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--ionic-scheduler-background`          | `--ion-background-color`                                                                                         |
| `--ionic-scheduler-color`               | `--ion-text-color`                                                                                               |
| `--ionic-scheduler-accent-color`        | `--ion-color-primary`                                                                                            |
| `--ionic-scheduler-now-indicator-color` | `--ion-color-danger`                                                                                             |
| `--ionic-scheduler-muted-color`         | `--ion-color-medium`                                                                                             |
| `--ionic-scheduler-border-color`        | `--ion-border-color` → `--ion-item-border-color` → a mix of text over background                                 |
| `--ionic-scheduler-header-background`   | `--ion-toolbar-background`                                                                                       |
| `--ionic-scheduler-title-color`         | `--ion-toolbar-color`                                                                                            |
| `--ionic-scheduler-height`              | `100%` — the height the component scrolls within                                                                 |
| every shade in between                  | `--ion-background-color-step-*`, or a `color-mix` of text over background where the palette does not define them |

Dark mode needs nothing: load Ionic's dark palette and the whole grid follows, because the steps and
the mixes are relative to the surface rather than to a fixed colour.

The full list of tokens — 73 of them, covering the time grid, the month, the mini-months, the
timeline, the resource rail and the agenda — is documented at the top of `styles/scheduler.css`.

## What else is in the box

- **Editing.** `editable`, `eventStartEditable`, `eventDurationEditable`, `snapDuration` and an
  `eventAllow` veto, with `(eventDrop)`, `(eventResize)` and a `revert()` on every payload. The
  Scheduler holds the change so the event stays where it was dropped; persist it or put it back.
- **Keyboard.** The grid is one tab stop and the arrows walk it. With focus on an event the arrows
  move it and shift+arrows resize it, through the same controller a drag uses — so `eventAllow`, the
  blocked intervals and the outputs behave identically.
- **Recurrence.** A subset of RRULE (`FREQ`, `INTERVAL`, `COUNT`, `UNTIL`, `BYDAY`, `BYMONTHDAY`,
  `BYMONTH`) with exceptions, and a `recurrenceEdit` flow that reports occurrence / series /
  following rather than guessing which one an edit meant.
- **Time zones.** `timeZone` moves the rendering only: the events keep their real instants and every
  output converts back, including across a DST change.
- **Availability.** `blockedIntervals` (hatched, refused before `eventAllow` is asked),
  `appointmentSlots` with capacity and `(slotBook)`/`(slotCancel)`, `businessHours`, and
  `dateSelection` for turning clicks on empty cells into a set of days.
- **Resources.** Hierarchical rails with collapsible groups, aggregated events, adaptive mode for
  when there are too many resources to show at once, and virtual scrolling on long timeline axes.
- **Scrolling.** One scrollport per view: in the timeline the resource rail and the axis are two
  columns of the same scroller, so the names, the bands and the lanes stay locked together on both
  axes instead of drifting apart.
- **Print.** `print()` prints _this_ schedule rather than the page it is on, with the scroll
  containers unrolled, an optional page header and a `fit` scale for a week of resource columns.
- **Transfer.** iCalendar import and export (`scheduler-transfer`).
- **Accessibility.** The range title is an `aria-live` region, events and cells are buttons,
  `dir="rtl"` flips through logical properties, and transitions are dropped under
  `prefers-reduced-motion`.

## Development

```bash
bun install
bun run build   # ng-packagr → dist/
bun run test    # 127 tests, vitest + jsdom
```

## Releasing

The package that goes to npm is the **built** one, `dist/`, not the repository root: the root
`package.json` is the source manifest and ng-packagr rewrites it — resolving the entry points,
dropping the scripts and the devDependencies — into `dist/package.json`, alongside the FESM bundle,
the types and `styles/scheduler.css`.

```bash
bun run test
bun run build
npm pack --dry-run ./dist   # what will actually be uploaded
npm login                   # once
bun run release             # build + npm publish ./dist
```

Bump `version` in the root `package.json`, tag it (`git tag -a v1.0.1 -m v1.0.1 && git push --tags`)
and publish from a clean tree, so the tag and the version on npm say the same thing.

## Credits and licence

MIT. This is a port of the [Optimus UI](https://www.openng.org/) Scheduler (MIT, © OpenNG, and
© PrimeTek for the PrimeNG community version it descends from): the engine — dates, layout,
recurrence, time zones, drag, keyboard, the compound composition model — is theirs, and what changed
here is the presentation layer, which was rebuilt on Ionic's components and design tokens.
