import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, inject } from '@angular/core';
import { IonBadge, IonButton, IonButtons, IonChip, IonIcon, IonLabel, IonNote, IonSegment, IonSegmentButton, IonSpinner, IonToolbar } from '@ionic/angular';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { SCHEDULER_STATE } from './scheduler-state';
import { SCHEDULER_CATEGORY_LEGEND_CONTEXT, SCHEDULER_HEADER_CONTEXT, SCHEDULER_SELECTION_TOOLBAR_CONTEXT, injectSchedulerHeaderContext } from './scheduler-context';
import { SCHEDULER_ROOT } from './scheduler-root-token';
import type { SchedulerViewType } from '../types/scheduler.types';

/**
 * The semantic components and the chrome regions.
 *
 * The semantic components (`<ionic-scheduler-month-event>`, `<ionic-scheduler-time-grid-cell>`, …) are
 * deliberately thin: a host element carrying the `data-slot` attribute plus `<ng-content>`. They are
 * the *context boundary* the docs describe — the renderer stamps them with an injector, so anything
 * inside can call `injectSchedulerEventContext()` without an input. Keeping them free of markup is
 * what lets an application replace the visible card without losing positioning, focus or ARIA.
 *
 * The chrome regions (header, legend, toolbar, footer, loading) DO ship default markup, because a
 * scheduler with no way to change month is useless out of the box. Every one of them is overridable
 * by projecting content into it.
 *
 * @module scheduler-parts
 */

// The decorators are written out by hand rather than produced by a helper: Angular's AOT compiler
// has to READ the metadata statically, and an object that comes out of a call (even spread into
// place) leaves the `template` invisible to it and fails with NG2001.

/** Event surface used when no narrower definition exists. @group Components */
@Component({
    selector: 'ionic-scheduler-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-event' }
})
export class SchedulerEventPart {}

/** Timed event surface of the day and week views. @group Components */
@Component({
    selector: 'ionic-scheduler-time-grid-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-time-grid-event' }
})
export class SchedulerTimeGridEvent {}

/** Event surface of the all-day row. @group Components */
@Component({
    selector: 'ionic-scheduler-all-day-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-all-day-event' }
})
export class SchedulerAllDayEvent {}

/** Event surface of a month cell. @group Components */
@Component({
    selector: 'ionic-scheduler-month-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-event' }
})
export class SchedulerMonthEvent {}

/** Event row of the agenda. @group Components */
@Component({
    selector: 'ionic-scheduler-agenda-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-agenda-event' }
})
export class SchedulerAgendaEvent {}

/** Column header of a day. @group Components */
@Component({
    selector: 'ionic-scheduler-day-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-day-header' }
})
export class SchedulerDayHeader {}

/** Cell of the all-day row. @group Components */
@Component({
    selector: 'ionic-scheduler-all-day-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-all-day-cell' }
})
export class SchedulerAllDayCell {}

/** Label of the time gutter. @group Components */
@Component({
    selector: 'ionic-scheduler-time-gutter',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-time-gutter' }
})
export class SchedulerTimeGutter {}

/** Cell of the time grid. @group Components */
@Component({
    selector: 'ionic-scheduler-time-grid-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-time-grid-cell' }
})
export class SchedulerTimeGridCell {}

/** Cell of the time grid inside working hours. @group Components */
@Component({
    selector: 'ionic-scheduler-work-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-work-cell' }
})
export class SchedulerWorkCell {}

/** Caption naming the month of a grid, drawn when `monthCount` is above one. @group Components */
@Component({
    selector: 'ionic-scheduler-month-title',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-title' }
})
export class SchedulerMonthTitle {}

/** Weekday header row of the month grid. @group Components */
@Component({
    selector: 'ionic-scheduler-month-header-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-header-cell' }
})
export class SchedulerMonthHeaderCell {}

/** Whole cell of the month grid. @group Components */
@Component({
    selector: 'ionic-scheduler-month-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-cell' }
})
export class SchedulerMonthCell {}

/** Day number of a month cell. @group Components */
@Component({
    selector: 'ionic-scheduler-month-cell-number',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-cell-number' }
})
export class SchedulerMonthCellNumber {}

/** Body of a month cell. @group Components */
@Component({
    selector: 'ionic-scheduler-month-day-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-day-cell' }
})
export class SchedulerMonthDayCell {}

/** Overflow link of a month cell. @group Components */
@Component({
    selector: 'ionic-scheduler-month-more-link',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-month-more-link' }
})
export class SchedulerMonthMoreLink {}

/** Header of a mini month in the year view. @group Components */
@Component({
    selector: 'ionic-scheduler-mini-month-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-mini-month-header' }
})
export class SchedulerMiniMonthHeader {}

/** Cell of a mini month in the year view. @group Components */
@Component({
    selector: 'ionic-scheduler-mini-month-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-mini-month-cell' }
})
export class SchedulerMiniMonthCell {}

/** Date group header of the agenda. @group Components */
@Component({
    selector: 'ionic-scheduler-agenda-date-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-agenda-date-header' }
})
export class SchedulerAgendaDateHeader {}

/** Header cell of the timeline. @group Components */
@Component({
    selector: 'ionic-scheduler-timeline-header-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-timeline-header-cell' }
})
export class SchedulerTimelineHeaderCell {}

/** Cell of the timeline. @group Components */
@Component({
    selector: 'ionic-scheduler-timeline-cell',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-timeline-cell' }
})
export class SchedulerTimelineCell {}

/** Event of the timeline. @group Components */
@Component({
    selector: 'ionic-scheduler-timeline-event',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-timeline-event' }
})
export class SchedulerTimelineEvent {}

/** Horizontal resource column header. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-column-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-column-header' }
})
export class SchedulerResourceColumnHeader {}

/** Area above the resource rail. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-area-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-area-header' }
})
export class SchedulerResourceAreaHeader {}

/** Header of the resource rail. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-header',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-header' }
})
export class SchedulerResourceHeader {}

/** General resource surface. @group Components */
@Component({
    selector: 'ionic-scheduler-resource',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource' }
})
export class SchedulerResourcePart {}

/** Resource group row. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-group',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-group' }
})
export class SchedulerResourceGroup {}

/** Resource leaf row. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-row',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-row' }
})
export class SchedulerResourceRow {}

/** Summary badge of a collapsed resource group. @group Components */
@Component({
    selector: 'ionic-scheduler-resource-aggregate-badge',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { 'data-slot': 'scheduler-resource-aggregate-badge' }
})
export class SchedulerResourceAggregateBadge {}

/**
 * The header region.
 *
 * Renders an `ion-toolbar`, so the header is the SAME bar the rest of the application draws: the
 * theme skins (`@rdlabo/ionic-theme-ios26`, `@rdlabo/ionic-theme-md3`) style `ion-toolbar` and a
 * hand-rolled div would be the one strip on the page they do not reach.
 *
 * Provides the header context, which is what lets navigation, title and view selector work without
 * a single input between them.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-header',
    standalone: true,
    imports: [IonToolbar],
    template: `
        <ion-toolbar class="ionic-scheduler-header-toolbar">
            <!-- A wrapper of our own and not the toolbar's slots: ion-toolbar lays its default
                 content out through internals that differ between modes, and the header has to line
                 navigation, title and selector up the same way in both. -->
            <div class="ionic-scheduler-header-bar">
                <ng-content />
            </div>
        </ion-toolbar>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-header',
        'data-slot': 'scheduler-header',
        '[attr.data-view]': 'state.view()'
    },
    providers: [{ provide: SCHEDULER_HEADER_CONTEXT, useFactory: () => inject(SchedulerHeader).context }]
})
export class SchedulerHeader {
    /** @internal */
    readonly state = inject(SCHEDULER_STATE);

    /** The header context, also readable by any child through `injectSchedulerHeaderContext()`. */
    readonly context = computed(() => ({
        view: this.state.view(),
        date: this.state.date(),
        title: this.state.rangeTitle(),
        views: this.state.availableViews(),
        prev: () => this.state.move(-1),
        next: () => this.state.move(1),
        today: () => this.state.goToToday(),
        setView: (view: SchedulerViewType) => this.state.changeView(view)
    }));
}

/**
 * Previous / today / next controls, as Ionic buttons.
 *
 * The chevrons are bound with `[icon]` and not with `name`: a `name` needs the icon registered
 * globally with `addIcons`, which is a setup step a library cannot do for the application it is
 * dropped into. Bound icons carry their own SVG data.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-navigation',
    standalone: true,
    imports: [IonButtons, IonButton, IonIcon],
    template: `
        <ion-buttons>
            <ion-button fill="clear" data-slot="scheduler-nav-prev" [attr.aria-label]="labels().prev" (click)="context().prev()">
                <ion-icon slot="icon-only" [icon]="prevIcon()" aria-hidden="true" />
            </ion-button>
            <ion-button fill="clear" class="ionic-scheduler-today-button" data-slot="scheduler-nav-today" (click)="context().today()">{{ labels().today }}</ion-button>
            <ion-button fill="clear" data-slot="scheduler-nav-next" [attr.aria-label]="labels().next" (click)="context().next()">
                <ion-icon slot="icon-only" [icon]="nextIcon()" aria-hidden="true" />
            </ion-button>
        </ion-buttons>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-navigation', 'data-slot': 'scheduler-navigation' }
})
export class SchedulerNavigation {
    /** Context of the enclosing header. */
    readonly context = injectSchedulerHeaderContext();

    private readonly state = inject(SCHEDULER_STATE);

    /** @internal */
    readonly labels = computed(() => this.state.labels());

    /**
     * The chevrons follow the reading direction.
     *
     * `ion-icon` flips a handful of icons under `dir="rtl"` by itself, but the Scheduler's `rtl`
     * input is its own: the component can be laid out right to left inside a left-to-right page, and
     * then the document direction says nothing about which way "previous" points.
     */
    readonly prevIcon = computed(() => (this.state.rtl() ? chevronForwardOutline : chevronBackOutline));

    /** @internal @see prevIcon */
    readonly nextIcon = computed(() => (this.state.rtl() ? chevronBackOutline : chevronForwardOutline));
}

/**
 * Title of the visible range.
 *
 * Not an `ion-title`: inside an iOS toolbar that one is absolutely positioned and centred over the
 * whole bar, which puts it underneath the view selector. This is a plain live region that shares the
 * toolbar's own colour and type tokens.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-title',
    standalone: true,
    template: `{{ context().title }}`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-title', 'data-slot': 'scheduler-title', 'aria-live': 'polite' }
})
export class SchedulerTitle {
    /** Context of the enclosing header. */
    readonly context = injectSchedulerHeaderContext();
}

/**
 * Switches between the views the root offers, as an `ion-segment`.
 *
 * Scrollable past four views, which is the point where a segment stops dividing the bar and starts
 * squeezing it — and a Scheduler that declares every scope has twenty-one of them.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-view-selector',
    standalone: true,
    imports: [IonSegment, IonSegmentButton, IonLabel, IonNote],
    template: `
        @if (single(); as view) {
            <!-- With a single view available there is nothing to select: a highlighted button that
                 leads nowhere invites a click and confuses. The name is printed instead. -->
            <ion-note class="ionic-scheduler-view-label" data-slot="scheduler-view-label" [attr.data-view]="view">{{ label(view) }}</ion-note>
        } @else {
            <ion-segment [value]="context().view" [scrollable]="scrollable()" (ionChange)="pick($event)">
                @for (view of context().views; track view) {
                    <ion-segment-button [value]="view" data-slot="scheduler-view-button" [attr.data-view]="view" [attr.data-selected]="view === context().view ? '' : null">
                        <ion-label>{{ label(view) }}</ion-label>
                    </ion-segment-button>
                }
            </ion-segment>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-view-selector', 'data-slot': 'scheduler-view-selector' }
})
export class SchedulerViewSelector {
    /** Context of the enclosing header. */
    readonly context = injectSchedulerHeaderContext();

    private readonly state = inject(SCHEDULER_STATE);

    /** The only available view, when there is exactly one. */
    readonly single = computed(() => {
        const views = this.context().views;
        return views.length === 1 ? views[0] : null;
    });

    /** Whether the segment scrolls rather than dividing the bar between its buttons. */
    readonly scrollable = computed(() => this.context().views.length > 4);

    /** Localised name of a view. */
    label(view: SchedulerViewType): string {
        return this.state.viewLabel(view);
    }

    /** @internal */
    pick(originalEvent: CustomEvent<{ value?: string | number | undefined }>): void {
        const value = originalEvent.detail?.value;

        // The segment emits on the way IN too, with the value the view already has. Switching on
        // that would be harmless but it goes through `changeView`, which is what emits
        // `(viewStateChange)` — and a view change nobody made should not be reported as one.
        if (typeof value === 'string' && value !== this.context().view) this.context().setView(value as SchedulerViewType);
    }
}

/**
 * Actions over the selected events: a count and the two things a selection is for.
 *
 * Its own `ion-toolbar`, in the `--ion-color-primary` treatment a contextual action bar has in both
 * skins. Project content into it to replace the default actions.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-selection-toolbar',
    standalone: true,
    imports: [IonToolbar, IonButtons, IonButton, IonBadge],
    template: `
        @if (context().active) {
            <ion-toolbar color="primary">
                <ng-content>
                    <ion-buttons slot="start">
                        <ion-badge class="ionic-scheduler-selection-count" color="light">{{ context().selectedIds.length }}</ion-badge>
                    </ion-buttons>
                    <ion-buttons slot="end">
                        <ion-button fill="clear" class="ionic-scheduler-selection-clear" (click)="context().clear()">{{ labels().clear }}</ion-button>
                        <ion-button fill="clear" class="ionic-scheduler-selection-remove" (click)="context().remove()">{{ labels().delete }}</ion-button>
                    </ion-buttons>
                </ng-content>
            </ion-toolbar>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-selection-toolbar',
        'data-slot': 'scheduler-selection-toolbar',
        '[attr.data-selection-active]': 'context().active ? "" : null'
    },
    providers: [{ provide: SCHEDULER_SELECTION_TOOLBAR_CONTEXT, useFactory: () => inject(SchedulerSelectionToolbar).context }]
})
export class SchedulerSelectionToolbar {
    private readonly state = inject(SCHEDULER_STATE);

    /** The selection toolbar context. */
    readonly context = computed(() => {
        const events = this.state.selectedEvents();
        return {
            events,
            selectedIds: events.map((event) => event.id),
            active: events.length > 0,
            clear: () => this.state.clearSelection(),
            remove: () => this.state.requestBulkDelete()
        };
    });

    /** @internal */
    readonly labels = computed(() => this.state.labels());
}

/**
 * Category swatches with counts, which double as filters. One `ion-chip` per category.
 *
 * A filtered-out category is drawn `outline`, which is the Ionic idiom for an unset chip and reads
 * the same under both skins; the swatch keeps the category's own colour either way, because that
 * colour is the only thing tying the chip to the events on the grid.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-category-legend',
    standalone: true,
    imports: [IonChip, IonLabel, IonBadge],
    template: `
        <ng-content>
            @for (category of context().categories; track category.id) {
                <ion-chip
                    class="ionic-scheduler-category-legend-item"
                    data-slot="scheduler-category-legend-ui-item"
                    [outline]="!category.active"
                    [disabled]="!context().filterable"
                    [attr.data-selected]="category.active ? '' : null"
                    [attr.data-event-count]="category.count"
                    [attr.role]="context().filterable ? 'button' : null"
                    [attr.aria-pressed]="context().filterable ? category.active : null"
                    [attr.tabindex]="context().filterable ? 0 : null"
                    (click)="context().toggle(category.id)"
                    (keydown.enter)="context().toggle(category.id)"
                    (keydown.space)="$event.preventDefault(); context().toggle(category.id)"
                >
                    <span class="ionic-scheduler-category-legend-swatch" [style.background]="category.color" aria-hidden="true"></span>
                    <ion-label class="ionic-scheduler-category-legend-label">{{ category.name }}</ion-label>
                    <ion-badge class="ionic-scheduler-category-legend-count">{{ category.count }}</ion-badge>
                </ion-chip>
            }
        </ng-content>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-category-legend',
        'data-slot': 'scheduler-category-legend',
        '[attr.data-filterable]': 'context().filterable ? "" : null',
        '[attr.data-filtering]': 'context().filtering ? "" : null'
    },
    providers: [{ provide: SCHEDULER_CATEGORY_LEGEND_CONTEXT, useFactory: () => inject(SchedulerCategoryLegend).context }]
})
export class SchedulerCategoryLegend {
    private readonly state = inject(SCHEDULER_STATE);

    /** The legend context. */
    readonly context = computed(() => ({
        categories: this.state.categoryCounts(),
        filterable: this.state.categoryFilterable(),
        filtering: this.state.filtering(),
        toggle: (id: string | number) => this.state.toggleCategory(id),
        clear: () => this.state.clearCategoryFilter()
    }));
}

/**
 * Header of a printed schedule.
 *
 * It exists because a sheet of paper has no chrome: the range the schedule covers is on screen in
 * `ionic-scheduler-title`, and once the controls are gone the print has nothing saying what it is or
 * when it was taken. Invisible on screen, so a page can leave it in the tree permanently.
 *
 * What it carries beyond the title comes from the options passed to `print()`, which is where a page
 * decides whether a handoff needs a timestamp, the timezone or the filters behind it.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-print-header',
    standalone: true,
    template: `
        <ng-content>
            <div class="ionic-scheduler-print-title">{{ state.rangeTitle() }}</div>
            @if (details().length) {
                <div class="ionic-scheduler-print-meta">
                    @for (detail of details(); track detail) {
                        <span class="ionic-scheduler-print-meta-item">{{ detail }}</span>
                    }
                </div>
            }
        </ng-content>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-print-header', 'data-slot': 'scheduler-print-header' }
})
export class SchedulerPrintHeader {
    /** @internal */
    readonly state = inject(SCHEDULER_STATE);

    private readonly root = inject(SCHEDULER_ROOT, { optional: true });

    /** The extras the sheet carries under the title. */
    readonly details = computed(() => {
        const chrome = this.root?.printChrome() ?? null;

        if (!chrome) return [];

        return [...(chrome.generatedAt ? [new Date().toLocaleString(this.state.locale())] : []), ...(chrome.timezone ? [this.state.timeZoneLabel()] : []), ...(chrome.filters ?? [])];
    });
}

/**
 * Footer region. Empty by default; project whatever the page needs into it.
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-footer',
    standalone: true,
    template: `<ng-content />`,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-footer', 'data-slot': 'scheduler-footer' }
})
export class SchedulerFooter {}

/**
 * Loading overlay, shown while the root's `loading` input is true. An `ion-spinner`, so it is the
 * same spinner and the same per-mode animation the rest of the application shows.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-loading',
    standalone: true,
    imports: [IonSpinner],
    template: `
        @if (state.loading()) {
            <ng-content>
                <ion-spinner class="ionic-scheduler-loading-spinner" aria-hidden="true" />
            </ng-content>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-loading',
        'data-slot': 'scheduler-loading',
        '[attr.aria-busy]': 'state.loading()',
        '[hidden]': '!state.loading()'
    }
})
export class SchedulerLoading {
    /** @internal */
    readonly state = inject(SCHEDULER_STATE);
}
