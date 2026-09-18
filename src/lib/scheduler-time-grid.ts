import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, ViewEncapsulation, computed, inject, input, viewChild } from '@angular/core';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import type { SchedulerEvent, SchedulerResource, SchedulerViewType } from '../types/scheduler.types';
import { addMinutes, dayKey, eachDay, endOfDay, formatTime, isToday, startOfDay, timeSlots } from './scheduler-date';
import { groupByDay, layoutRows, layoutTimeGrid } from './scheduler-layout';
import { SchedulerViewBase } from './scheduler-view-base';
import { scrollPointIntoView, verticalScrollPort } from './scheduler-scroll';

/**
 * The vertical time grid: an all-day strip on top, a time gutter down the left, and a column per
 * unit of grouping.
 *
 * Six views share this renderer because they differ only in what a COLUMN is. `day` and `week` are
 * one column per date. `resourceDay`/`resourceWeek` put the resource first and its dates inside, so
 * each person or room owns a vertical schedule. `dateDay`/`dateWeek` put the date first and the
 * resources inside it. That is one `columns()` computed and a header band, not four renderers —
 * splitting them would duplicate the gutter, the all-day strip, the overlap layout and the drag
 * geometry four times over.
 *
 * @module scheduler-time-grid
 */
@Component({
    selector: 'ionic-scheduler-time-grid-view',
    standalone: true,
    imports: [NgTemplateOutlet],
    template: `
        <div
            class="ionic-scheduler-time-grid"
            [attr.data-view]="view"
            [attr.data-grouping]="grouping()"
            [attr.data-business-hours]="hasBusinessHours() ? '' : null"
            [style.--ionic-scheduler-columns]="columns().length"
            [style.--ionic-scheduler-column-min-width]="dayMinWidth() ?? columnMinWidth()"
        >
            <!-- ── Sticky head: the groups band and the column band live INSIDE one sticky
                 element. Two sticky siblings with the same inset-block-start land in the same
                 place, so the groups band covered the column band while scrolling; sticking the
                 wrapper stacks them by flow and lets the browser measure the height. -->
            <div #head class="ionic-scheduler-time-grid-head">
                <!-- ── Groups band: the resource over its dates, or the date over its resources.
                     Each cell spans the columns it owns, like the timeline's own bands. -->
                @if (groups().length) {
                    <div class="ionic-scheduler-time-grid-groups">
                        <div class="ionic-scheduler-time-gutter-spacer"></div>
                        @for (group of groups(); track group.key) {
                            <div
                                class="ionic-scheduler-resource-column-header"
                                data-slot="scheduler-resource-column-header"
                                [attr.data-resource-id]="group.resource?.id"
                                [attr.data-date]="group.dateKey"
                                [attr.data-event-count]="group.count"
                                [style.--ionic-scheduler-column-span]="group.span"
                            >
                                @if (resourceColumnHeaderDef(); as tpl) {
                                    <ng-container *ngTemplateOutlet="tpl; context: group.context" />
                                } @else {
                                    @if (group.resource) {
                                        <span class="ionic-scheduler-resource-dot" [style.background]="group.resource.color" aria-hidden="true"></span>
                                    }
                                    <span class="ionic-scheduler-resource-label">{{ group.label }}</span>
                                }
                            </div>
                        }
                    </div>
                }

                <!-- ── Header: the gutter spacer + one column per grouping unit ──────────────── -->
                <div class="ionic-scheduler-time-grid-header">
                    <div class="ionic-scheduler-time-gutter-spacer">{{ timeZoneLabel() }}</div>
                    @for (column of columns(); track column.key) {
                        <div
                            class="ionic-scheduler-day-header-cell"
                            data-slot="scheduler-day-header"
                            [attr.data-date]="column.dateKey"
                            [attr.data-resource-id]="column.resource?.id"
                            [attr.data-today]="column.today ? '' : null"
                            [attr.data-weekend]="column.weekend ? '' : null"
                        >
                            @if (dayHeaderDef(); as tpl) {
                                <ng-container *ngTemplateOutlet="tpl; context: column.cell.context; injector: cellInjector(column.cell.key)" />
                            } @else if (showResourceInHeader()) {
                                <!-- The date is already above — in the band or in the title — so the resource leads here. -->
                                @if (column.resource) {
                                    <span class="ionic-scheduler-resource-dot" [style.background]="column.resource.color" aria-hidden="true"></span>
                                }
                                <span class="ionic-scheduler-day-header-resource">{{ column.resourceLabel }}</span>
                            } @else {
                                <span class="ionic-scheduler-day-header-number">{{ column.date.getDate() }}</span>
                                <span class="ionic-scheduler-day-header-weekday">{{ column.weekdayLabel }}</span>
                            }
                        </div>
                    }
                </div>
            </div>

            <!-- ── All-day band ───────────────────────────────────────────────────────────── -->
            @if (allDayRows().length || state.alwaysShowAllDay()) {
                <div class="ionic-scheduler-all-day-row" data-slot="scheduler-all-day-row" [style.--ionic-scheduler-all-day-rows]="allDayRowCount()">
                    <div class="ionic-scheduler-all-day-gutter">{{ labels().allDay }}</div>
                    <div class="ionic-scheduler-all-day-lanes">
                        @for (column of columns(); track column.key) {
                            <div
                                class="ionic-scheduler-all-day-cell"
                                data-slot="scheduler-all-day-cell"
                                [attr.data-date]="column.dateKey"
                                [attr.data-resource-id]="column.resource?.id"
                                [attr.data-start-date]="column.date.getTime()"
                                [attr.data-end-date]="column.end.getTime()"
                                data-nav-cell=""
                                role="button"
                                [attr.aria-label]="labels().allDay + ' · ' + column.cell.context.label"
                                [attr.tabindex]="$first ? 0 : -1"
                                (click)="onSlotClick($event, column.date, column.end)"
                                (keydown)="onCellKeydown($event, column.date, column.end)"
                            >
                                @if (allDayCellDef(); as tpl) {
                                    <ng-container *ngTemplateOutlet="tpl; context: column.allDayCell.context; injector: cellInjector(column.allDayCell.key)" />
                                }
                            </div>
                        }
                        @for (item of allDayRows(); track item.key) {
                            <div
                                class="ionic-scheduler-all-day-event"
                                data-slot="scheduler-all-day-event"
                                [attr.data-event-id]="item.context.event.id"
                                [attr.data-selected]="item.context.selected ? '' : null"
                                [style.inset-inline-start.%]="item.offset * 100"
                                [style.inline-size.%]="item.size * 100"
                                [style.--ionic-scheduler-event-row]="item.row"
                                [style.--ionic-scheduler-event-border-accent]="item.context.accentColor"
                                (click)="onEventClick($event, item.context.event)"
                                (mouseenter)="onEventPeek($event, item.context.event)"
                                (mouseleave)="onEventPeekEnd()"
                                (focusin)="onEventPeek($event, item.context.event)"
                                (focusout)="onEventPeekEnd()"
                                (contextmenu)="onEventContextMenu($event, item.context.event)"
                                (pointerdown)="onEventPointerDown($event, item.context.event)"
                                (keydown)="onEventKeydown($event, item.context.event)"
                                tabindex="0"
                                role="button"
                                [attr.data-dragging]="item.context.dragging ? '' : null"
                                [attr.data-resizing]="item.context.resizing ? '' : null"
                                [attr.data-draggable]="item.context.draggable ? '' : null"
                            >
                                @if (allDayEventDef(); as tpl) {
                                    <ng-container *ngTemplateOutlet="tpl; context: item.context; injector: eventInjector(item.key)" />
                                } @else {
                                    <span class="ionic-scheduler-event-title">{{ item.context.title }}</span>
                                }
                            </div>
                        }
                    </div>
                </div>
            }

            <!-- ── Body: gutter + columns with the events positioned in them ───────────────── -->
            <div #body class="ionic-scheduler-time-grid-body" data-slot="scheduler-content">
                <div class="ionic-scheduler-time-gutter" data-slot="scheduler-time-gutter">
                    @for (slot of slots(); track slot.minutes) {
                        <div class="ionic-scheduler-time-gutter-slot" [attr.data-time]="slot.label" [attr.data-major]="slot.major ? '' : null">
                            @if (timeGutterDef(); as tpl) {
                                <ng-container *ngTemplateOutlet="tpl; context: slot.context" />
                            } @else {
                                <span class="ionic-scheduler-time-gutter-label">{{ slot.label }}</span>
                            }
                        </div>
                    }
                </div>

                @for (column of columns(); track column.key; let columnIndex = $index) {
                    <div
                        class="ionic-scheduler-time-grid-column"
                        data-slot="scheduler-time-grid-column"
                        [attr.data-date]="column.dateKey"
                        [attr.data-resource-id]="column.resource?.id"
                        [attr.data-today]="column.today && dateCount() > 1 ? '' : null"
                    >
                        @for (cell of column.cells; track cell.key) {
                            <div
                                class="ionic-scheduler-time-grid-cell"
                                [attr.data-slot]="cell.business ? 'scheduler-work-cell' : 'scheduler-time-grid-cell'"
                                [attr.data-time]="cell.label"
                                [attr.data-major]="cell.major ? '' : null"
                                [attr.data-business]="cell.business ? '' : null"
                                [attr.data-blocked]="cell.binding.context.blocked ? '' : null"
                                [attr.data-start-date]="cell.start.getTime()"
                                [attr.data-end-date]="cell.end.getTime()"
                                data-nav-cell=""
                                role="button"
                                [attr.aria-label]="cell.ariaLabel"
                                [attr.tabindex]="columnIndex === 0 && $first ? 0 : -1"
                                (click)="onSlotClick($event, cell.start, cell.end)"
                                (keydown)="onCellKeydown($event, cell.start, cell.end)"
                                (contextmenu)="onCellContextMenu($event, cell.start)"
                            >
                                @if (cellDef(cell.business); as tpl) {
                                    <ng-container *ngTemplateOutlet="tpl; context: cell.binding.context; injector: cellInjector(cell.binding.key)" />
                                }
                            </div>
                        }

                        <!-- The available windows go BEHIND the events and not as events: a free
                             slot is a property of the calendar, not an appointment. -->
                        @for (slot of column.slots; track slot.key) {
                            <div
                                class="ionic-scheduler-appointment-slot"
                                data-slot="scheduler-appointment-slot"
                                [attr.data-display]="slotDisplay()"
                                [attr.data-full]="slot.full ? '' : null"
                                [attr.data-resource-id]="column.resource?.id"
                                [style.inset-block-start.%]="slot.offset * 100"
                                [style.block-size.%]="slot.size * 100"
                                role="button"
                                [attr.aria-label]="slot.ariaLabel"
                                [attr.aria-disabled]="slot.full ? 'true' : null"
                                [attr.tabindex]="slot.full ? -1 : 0"
                                (click)="onSlotActivate($event, slot)"
                                (keydown)="onSlotActivateKeydown($event, slot)"
                            >
                                @if (slot.label) {
                                    <span class="ionic-scheduler-appointment-slot-label">{{ slot.label }}</span>
                                }
                            </div>
                        }

                        @for (item of column.events; track item.key) {
                            <div
                                class="ionic-scheduler-time-grid-event"
                                data-slot="scheduler-time-grid-event"
                                [attr.data-event-id]="item.context.event.id"
                                [attr.data-selected]="item.context.selected ? '' : null"
                                [attr.data-continues-before]="item.continuesBefore ? '' : null"
                                [attr.data-continues-after]="item.continuesAfter ? '' : null"
                                [style.inset-block-start.%]="item.top * 100"
                                [style.block-size.%]="item.height * 100"
                                [style.inset-inline-start.%]="item.left * 100"
                                [style.inline-size.%]="item.width * 100"
                                [style.--ionic-scheduler-event-border-accent]="item.context.accentColor"
                                (click)="onEventClick($event, item.context.event)"
                                (mouseenter)="onEventPeek($event, item.context.event)"
                                (mouseleave)="onEventPeekEnd()"
                                (focusin)="onEventPeek($event, item.context.event)"
                                (focusout)="onEventPeekEnd()"
                                (contextmenu)="onEventContextMenu($event, item.context.event)"
                                (pointerdown)="onEventPointerDown($event, item.context.event)"
                                (keydown)="onEventKeydown($event, item.context.event)"
                                tabindex="0"
                                role="button"
                                [attr.data-dragging]="item.context.dragging ? '' : null"
                                [attr.data-resizing]="item.context.resizing ? '' : null"
                                [attr.data-draggable]="item.context.draggable ? '' : null"
                            >
                                @if (timeGridEventDef(); as tpl) {
                                    <ng-container *ngTemplateOutlet="tpl; context: item.context; injector: eventInjector(item.key)" />
                                } @else {
                                    <span class="ionic-scheduler-event-title">{{ item.context.title }}</span>
                                    <span class="ionic-scheduler-event-time">{{ item.context.timeText }}</span>
                                }
                                @if (item.context.resizable) {
                                    <!-- The handles live INSIDE the event's surface, so their
                                         pointerdown has to stop propagation or the same gesture would
                                         start a move as well. The controller does it. -->
                                    <span
                                        class="ionic-scheduler-event-resize-handle"
                                        data-slot="scheduler-event-resize-handle"
                                        data-edge="start"
                                        aria-hidden="true"
                                        (pointerdown)="onResizePointerDown($event, item.context.event, 'start')"
                                    ></span>
                                    <span
                                        class="ionic-scheduler-event-resize-handle"
                                        data-slot="scheduler-event-resize-handle"
                                        data-edge="end"
                                        aria-hidden="true"
                                        (pointerdown)="onResizePointerDown($event, item.context.event, 'end')"
                                    ></span>
                                }
                            </div>
                        }

                        @if (column.today && state.nowIndicator()) {
                            <div class="ionic-scheduler-now-indicator" aria-hidden="true" [style.inset-block-start.%]="nowOffset() * 100"></div>
                        }
                    </div>
                }
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: { class: 'ionic-scheduler-view ionic-scheduler-view-time-grid' }
})
export class SchedulerTimeGridView extends SchedulerViewBase {
    /** Which of the two views is being drawn. Only affects `data-view` and template resolution. */
    readonly viewType = input.required<SchedulerViewType>();

    /** Whether the all-day strip stays visible even with nothing in it. */
    /**
     * Whether the all-day band stays visible when it is empty.
     *
     * @deprecated Set `alwaysShowAllDay` on `ionic-scheduler-root` instead. The renderer is internal, so
     * this input was never reachable from an application; it is the root's value that is used.
     */
    readonly alwaysShowAllDay = input(true);

    /** @internal */
    override get view(): SchedulerViewType {
        return this.viewType();
    }

    /** @internal */
    readonly labels = computed(() => this.state.labels());

    /** @internal */
    readonly hasBusinessHours = computed(() => this.state.hasBusinessHours());

    /** @internal */
    readonly dayHeaderDef = computed(() => this.def('dayHeader'));
    /** @internal */
    readonly allDayCellDef = computed(() => this.def('allDayCell'));
    /** @internal */
    readonly allDayEventDef = computed(() => this.def('allDayEvent'));
    /** @internal */
    readonly timeGutterDef = computed(() => this.def('timeGutter'));
    /** @internal */
    readonly timeGridEventDef = computed(() => this.def('timeGridEvent'));

    /**
     * A working-hours cell prefers the `workCell` definition and falls back to `timeGridCell`, so a
     * page can style just the business hours without redeclaring every cell.
     */
    cellDef(business: boolean) {
        return (business ? this.def('workCell') : undefined) ?? this.def('timeGridCell');
    }

    /** Rows of the time gutter. */
    readonly slots = computed(() => {
        const { start, end } = this.state.dayBounds();
        const minutes = this.state.slotMinutes();
        return timeSlots(start, end, minutes).map((slot) => {
            const date = addMinutes(startOfDay(this.state.date()), slot.minutes);
            const label = formatTime(date, this.locale(), this.state.timeFormat());
            return {
                ...slot,
                label,
                context: { $implicit: date, date, label, hour: date.getHours(), minute: date.getMinutes(), major: slot.major }
            };
        });
    });

    /**
     * Offset of the RENDERED zone, as `GMT+2`. Goes in the gutter corner because a time grid without
     * it is ambiguous the moment the data comes from another zone — and a target timezone is exactly
     * that situation.
     */
    readonly timeZoneLabel = computed(() => this.state.timeZoneLabel());

    /** Where the "now" line sits inside the rendered hours, as a fraction. */
    readonly nowOffset = computed(() => {
        const { start, end } = this.state.dayBounds();
        const now = this.state.toDisplay(new Date());
        const minutes = now.getHours() * 60 + now.getMinutes();
        const from = start * 60;
        const span = (end - start) * 60;
        return span > 0 ? Math.min(Math.max((minutes - from) / span, 0), 1) : 0;
    });

    /**
     * How the columns are grouped.
     *
     * The view name decides it, and the `groupByResource`/`groupByDate` inputs let a plain `day` or
     * `week` view group without changing its name — which is what a page switching between "my
     * week" and "the team's week" wants.
     */
    readonly grouping = computed<'none' | 'resource' | 'date'>(() => {
        const view = this.viewType();
        if (view === 'resourceDay' || view === 'resourceWeek') return 'resource';
        if (view === 'dateDay' || view === 'dateWeek') return 'date';
        if (this.state.groupByDate()) return 'date';
        if (this.state.groupByResource()) return 'resource';
        return 'none';
    });

    /**
     * The resources the columns are built from, with a trailing unassigned bucket when something
     * would otherwise have nowhere to go.
     */
    private readonly columnResources = computed<(SchedulerResource | null)[]>(() => {
        if (this.grouping() === 'none') return [null];

        const resources = this.state.resources();
        const orphans = this.state.visibleEvents().some((event) => this.state.eventBelongsTo(event, null));
        return orphans ? [...resources, null] : [...resources];
    });

    /** How many dates the range covers, which is what decides whether a second band earns its row. */
    /** @internal How many distinct days the range covers. Read from the template. */
    readonly dateCount = computed(() => eachDay(this.state.range().start, this.state.range().end).length);

    /** Minimum width of a column: resource columns are narrower than day columns by nature. */
    readonly columnMinWidth = computed(() => {
        if (this.grouping() === 'none') return null;

        // El modo horizontal decide: ajustar al contenedor mientras las columnas quepan, y pasar al
        // minimo —o sea, desbordar y desplazar— cuando son mas que el umbral.
        return this.state.horizontalResourceColumnWidth(this.columns().length) ?? '5rem';
    });

    /**
     * Minimum width of a DATE column in a resource-first grouped view.
     *
     * A resource with five dates inside it is five columns that have to stay readable on their own,
     * and they are not the same measurement as the resource columns of a date-first view.
     */
    readonly dayMinWidth = computed(() => {
        const value = this.state.horizontalResourceDayMinWidth();

        return this.grouping() === 'resource' && value != null ? `${value}px` : null;
    });

    /** @internal */
    readonly resourceColumnHeaderDef = computed(() => this.def('resourceColumnHeader'));

    /** @internal */
    readonly slotDisplay = computed(() => this.state.appointmentSlotDisplay());

    /**
     * Whether the per-column header names the RESOURCE rather than the date: always in date
     * grouping, where the band above carries the date, and in resource grouping over a single date,
     * where there is no band.
     */
    readonly showResourceInHeader = computed(() => this.grouping() === 'date' || (this.grouping() === 'resource' && this.dateCount() === 1));

    /** The columns, each with its cells and positioned events. */
    readonly columns = computed(() => {
        const { start, end } = this.state.range();
        const bounds = this.state.dayBounds();
        const slotMinutes = this.state.slotMinutes();
        const byDay = groupByDay(this.state.visibleEvents(), this.state.defaultEventDuration());
        const interacting = this.state.interactingEventId();
        const grouping = this.grouping();
        const dates = eachDay(start, end);
        const resources = this.columnResources();

        // The order of the columns IS the grouping: resource-first walks the resources on the
        // outside and the dates on the inside, date-first the other way round. Everything else is
        // identical.
        const pairs: { date: Date; resource: SchedulerResource | null }[] =
            grouping === 'resource'
                ? resources.flatMap((resource) => dates.map((date) => ({ date, resource })))
                : grouping === 'date'
                  ? dates.flatMap((date) => resources.map((resource) => ({ date, resource })))
                  : dates.map((date) => ({ date, resource: null }));

        return pairs.map(({ date, resource }) => {
            const dateKey = dayKey(date);
            const dayEvents = (byDay.get(dateKey) ?? []).filter((event) => grouping === 'none' || this.state.eventBelongsTo(event, resource?.id ?? null));
            const { timed } = this.partitionEvents(dayEvents);

            const from = addMinutes(date, bounds.start * 60);
            const to = addMinutes(date, bounds.end * 60);
            const laid = layoutTimeGrid(timed, {
                range: { start: from, end: to },
                defaultEventDuration: this.state.defaultEventDuration(),
                minEventMinutes: this.state.minEventMinutes()
            });

            const cellExtra = resource ? { resource } : {};
            const cells = timeSlots(bounds.start, bounds.end, slotMinutes).map((slot) => {
                const cellStart = addMinutes(date, slot.minutes);
                const cellEnd = addMinutes(cellStart, slotMinutes);
                // Two different things: "this cell is INSIDE the declared hours" — which is what
                // names the slot, sets data-business and resolves the workCell definition — and
                // "booking is possible here", which is true when no hours were declared at all.
                // Without separating them, a Scheduler with no businessHours marked EVERY cell as a
                // work-cell.
                const inBusiness = this.state.hasBusinessHours() && this.state.isBusinessTime(date, slot.minutes);
                return {
                    key: `${dateKey}|${resource?.id ?? ''}|${slot.minutes}`,
                    start: cellStart,
                    end: cellEnd,
                    label: formatTime(cellStart, this.locale(), this.state.timeFormat()),
                    // The empty cell is focusable, so it needs a name: without one a screen reader
                    // announces "button" forty times per column.
                    ariaLabel: `${cellStart.toLocaleDateString(this.locale(), { weekday: 'long', day: 'numeric', month: 'long' })} ${formatTime(cellStart, this.locale(), this.state.timeFormat())}${resource ? ` · ${resource.name ?? resource.id}` : ''}`,
                    major: slot.major,
                    business: inBusiness,
                    binding: this.bindCell(cellStart, [], { ...cellExtra, label: '' })
                };
            });

            const resourceLabel = resource ? (resource.name ?? String(resource.id)) : this.state.labels().unassigned;
            const slots = this.state.slotsForColumn(date, resource?.id, bounds);

            return {
                key: `${dateKey}|${resource?.id ?? ''}`,
                dateKey,
                date,
                resource,
                resourceLabel,
                end: endOfDay(date),
                today: isToday(date, this.state.now()),
                weekend: date.getDay() === 0 || date.getDay() === 6,
                weekdayLabel: date.toLocaleDateString(this.locale(), { weekday: 'short' }).toUpperCase(),
                cell: this.bindCell(date, dayEvents, { ...cellExtra, label: date.toLocaleDateString(this.locale(), { weekday: 'long', day: 'numeric' }) }, 'dayHeader'),
                allDayCell: this.bindCell(date, this.partitionEvents(dayEvents).allDay, { ...cellExtra, label: this.state.labels().allDay }, 'allDay'),
                cells,
                slots,
                events: laid.map((item) => ({
                    top: item.offset,
                    height: item.size,
                    // The event being dragged takes the WHOLE column: were it part of the overlap
                    // split, it would narrow and slide sideways every time it passed over another
                    // appointment. The others keep their places because the dragged one still counts
                    // towards THEIR split — the only thing that changes is how it is drawn.
                    // Overlap columns leave a sliver of air at the end (95% of the slot) so the edge
                    // of the event behind stays visible and the two do not read as one.
                    left: item.event.id === interacting ? 0 : item.column / item.columns,
                    width: item.event.id === interacting ? 1 : (1 / item.columns) * 0.95,
                    continuesBefore: item.continuesBefore,
                    continuesAfter: item.continuesAfter,
                    // The key suffix: an event with `resourceIds` appears in several columns, and
                    // those are distinct surfaces with their own context and their own injector.
                    ...this.bindEvent(item.event, { continuesBefore: item.continuesBefore, continuesAfter: item.continuesAfter }, `${dateKey}|${resource?.id ?? ''}`)
                }))
            };
        });
    });

    /**
     * The header band above the columns: one cell per resource spanning its dates, or one per date
     * spanning its resources. Empty when the columns are plain dates and there is nothing to group.
     */
    readonly groups = computed(() => {
        const grouping = this.grouping();
        if (grouping === 'none') return [];
        // With a single date the resource fits in its own column header, and the band would be a
        // whole row spent repeating "8 TUE" five times underneath. The date is already in the title.
        if (grouping === 'resource' && this.dateCount() === 1) return [];

        const columns = this.columns();
        const cells: { key: string; label: string; span: number; count: number; resource: SchedulerResource | null; dateKey?: string; context: any }[] = [];

        for (const column of columns) {
            const key = grouping === 'resource' ? `r|${column.resource?.id ?? ''}` : `d|${column.dateKey}`;
            const last = cells[cells.length - 1];
            if (last?.key === key) {
                last.span++;
                last.count += column.cell.context.count;
                continue;
            }
            const label = grouping === 'resource' ? column.resourceLabel : column.date.toLocaleDateString(this.locale(), { weekday: 'short', day: 'numeric', month: 'short' });
            const context = {
                $implicit: grouping === 'resource' ? column.resource : column.date,
                resource: column.resource,
                date: column.date,
                title: label,
                label,
                depth: 0,
                group: grouping === 'resource',
                expanded: true,
                toggle: () => undefined,
                events: column.cell.context.events,
                count: column.cell.context.count
            };
            // Under date grouping a band cell IS a date: carrying the first column's resource in
            // here gave the day that resource's colour dot.
            cells.push({
                key,
                label,
                span: 1,
                count: column.cell.context.count,
                resource: grouping === 'resource' ? column.resource : null,
                dateKey: grouping === 'date' ? column.dateKey : undefined,
                context: { ...context, context }
            });
        }

        return cells;
    });

    /** Events of the all-day strip, packed into rows across the whole range. */
    readonly allDayRows = computed(() => {
        const { allDay } = this.partitionEvents(this.state.visibleEvents());
        const { items } = layoutRows(allDay, { range: this.state.range(), defaultEventDuration: this.state.defaultEventDuration() });
        return items.map((item) => ({
            offset: item.offset,
            size: item.size,
            row: item.row,
            ...this.bindEvent(item.event, { continuesBefore: item.continuesBefore, continuesAfter: item.continuesAfter })
        }));
    });

    ngAfterViewChecked(): void {
        this.state.autoSelectResource();
        // The contexts are published AFTER the render: writing these signals inside the layout
        // computed is exactly what Angular forbids (NG0600).
        const columns = this.columns();
        this.publishContexts(
            [...columns.flatMap((column) => column.events), ...this.allDayRows()],
            columns.flatMap((column) => [column.cell, column.allDayCell, ...column.cells.map((cell) => cell.binding)])
        );

        // Not while dragging: this reads geometry, and a drag runs a detection cycle per frame.
        if (!this.state.drag.active) void this.scrollToMoment();
    }

    private readonly body = viewChild<ElementRef<HTMLElement>>('body');

    private readonly head = viewChild<ElementRef<HTMLElement>>('head');

    /**
     * Whether there is a real layout engine to measure. Prerendering has a tree and no geometry, and
     * an unscrolled grid is the right thing to put in prerendered HTML.
     */
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

    /** Drops a frame that was booked for a scroll that nobody is waiting for any more. */
    private readonly cancelScrollFrame = inject(DestroyRef).onDestroy(() => {
        if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    });

    /** What the last scroll was performed for, so it happens once per range and not per pass. */
    private scrolledKey: string | null = null;

    /**
     * Brings `scrollTime` into view: now, by default, while the range contains it.
     *
     * Once per range, view and explicit request — never on every change-detection pass. A grid that
     * scrolls itself back to now each time an event arrives is a grid that cannot be read, and the
     * automatic scroll exists to save the first gesture, not to own the scrollbar.
     */
    private async scrollToMoment(): Promise<void> {
        const body = this.body()?.nativeElement;
        const target = this.state.scrollTarget();

        if (!body || !this.browser || !target) return;

        const { start, end } = this.state.range();
        const key = `${this.viewType()}|${start.getTime()}|${end.getTime()}|${this.state.scrollRequest()}`;

        if (this.scrolledKey === key) return;

        const bounds = this.state.dayBounds();
        const span = (bounds.end - bounds.start) * 60;
        const height = body.offsetHeight;

        if (span <= 0 || height <= 0) {
            // Nothing measurable yet — an unmounted grid, or a zero-height one. Nothing is recorded,
            // so the next pass with a layout behind it tries again.
            this.retryScroll();
            return;
        }

        const fraction = Math.min(Math.max((target.minutes - bounds.start * 60) / span, 0), 1);
        const port = await verticalScrollPort(body);

        if (!port) return;

        // A lead of one slot above the target: flush against the header it reads as the first thing
        // clipped by the edge rather than as the thing you were brought here to see.
        //
        // And done only once it has LANDED: a port that has not been laid out yet clamps the write
        // to zero without complaining, and a grid that recorded that as done opened at midnight for
        // the rest of its life.
        if (scrollPointIntoView(port, body, fraction * height, this.head()?.nativeElement.offsetHeight ?? 0, (this.state.slotMinutes() / span) * height)) {
            this.scrolledKey = key;
            this.scrollRetries = 0;
            return;
        }

        this.retryScroll();
    }

    /** Frames left to keep trying a scroll that has not landed. @see scrollToMoment */
    private scrollRetries = 0;

    /** The frame already booked, so a burst of detection cycles books one and not twenty. */
    private scrollFrame = 0;

    /**
     * Asks again on the next frame, for as long as it is worth asking.
     *
     * The pass that draws a grid is not always the pass that gives it a height — a page being
     * transitioned in, a tab that was hidden — and nothing schedules another change-detection cycle
     * on its own in a zoneless application. The budget is there so a grid that is mounted and never
     * shown does not spin a frame loop for the rest of the session.
     */
    private retryScroll(): void {
        if (!this.browser || this.scrollFrame || typeof requestAnimationFrame !== 'function') return;

        if (this.scrollRetries <= 0) this.scrollRetries = 60;
        if (--this.scrollRetries <= 0) return;

        this.scrollFrame = requestAnimationFrame(() => {
            this.scrollFrame = 0;
            void this.scrollToMoment();
        });
    }

    /** How many rows the all-day strip needs. */
    readonly allDayRowCount = computed(() => this.allDayRows().reduce((max, item) => Math.max(max, item.row + 1), 1));
}
