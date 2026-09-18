import { ChangeDetectionStrategy, Component, Directive, ElementRef, ViewEncapsulation, computed, inject } from '@angular/core';
import { IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonNote, IonPopover, IonTitle, IonToolbar } from '@ionic/angular';
import { closeOutline, createOutline, trashOutline } from 'ionicons/icons';
import type { SchedulerEvent } from '../types/scheduler.types';
import { SCHEDULER_CONTEXT_MENU_CONTEXT, SCHEDULER_EVENT_POPOVER_CONTEXT, SCHEDULER_MORE_POPOVER_CONTEXT, SCHEDULER_QUICK_INFO_CONTEXT } from './scheduler-context';
import { SCHEDULER_STATE } from './scheduler-state';

/**
 * The four overlays, each one an `ion-popover`.
 *
 * Upstream these were absolutely positioned panels the component placed itself, deliberately, to
 * avoid dragging in the library's overlay stack. Here that stack is already in the application:
 * `ion-popover` is what every other menu in an Ionic app opens as, it is what the iOS 26 and MD3
 * skins style, and it brings the things a hand-placed panel has to reimplement badly — the
 * viewport clamping, the focus trap, Escape and backdrop dismissal, and the per-mode animation.
 *
 * The positioning contract is Ionic's: `[event]` with a `target` is what `reference="trigger"`
 * measures against, so the anchor the state already stores for each overlay is handed over as
 * `{ target: anchor }` and the popover lands on the surface it was opened from.
 *
 * Each overlay still owns its open state and provides its context, so a projected part draws the
 * contents without inputs.
 *
 * @module scheduler-overlays
 */

/** Where an overlay opens relative to what opened it. */
export type SchedulerOverlayPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

/**
 * What every overlay shares: the anchor handed to Ionic, and giving the focus back on dismissal.
 *
 * Escape and the backdrop are Ionic's own; what it cannot do is put the focus back where it came
 * from, because it does not know that the anchor is still on screen — a month cell that scrolled
 * out from under an overflow list is not somewhere focus should jump back to.
 */
@Directive()
abstract class SchedulerOverlayBase {
    /** @internal */
    readonly state = inject(SCHEDULER_STATE);

    protected readonly el = inject<ElementRef<HTMLElement>>(ElementRef);

    /** What the overlay is anchored to, whichever slot of the state it lives in. */
    protected abstract target(): { anchor?: HTMLElement } | null;

    /** Closes it. */
    abstract close(): void;

    /**
     * Where this overlay opens.
     *
     * Only the event popover takes it from the root: an overflow list or a context menu opens where
     * it was asked for, and a page that wanted to move those would be moving them for a reason the
     * component cannot guess.
     */
    protected placement(): SchedulerOverlayPlacement {
        return 'auto';
    }

    /**
     * @internal The anchor, in the shape `ion-popover` positions from.
     *
     * A bare object and not a real event: `reference="trigger"` reads `event.target` and measures
     * its bounding box, which is exactly what is wanted, and synthesising a MouseEvent just to carry
     * an element would be inventing coordinates the popover then has to ignore.
     */
    readonly anchorEvent = computed(() => {
        const anchor = this.target()?.anchor;

        return anchor ? ({ target: anchor } as unknown as Event) : undefined;
    });

    /**
     * @internal The Ionic side this overlay opens on.
     *
     * `auto` becomes `bottom`, which is where a popover belongs when there is room: Ionic clamps it
     * into the viewport by itself, so "below unless it does not fit" is already the behaviour and
     * does not need measuring here.
     */
    readonly side = computed<'top' | 'right' | 'bottom' | 'left'>(() => {
        const placement = this.placement();

        return placement === 'auto' ? 'bottom' : placement;
    });

    /** @internal Chrome labels, so the default actions are not hard-coded English. */
    readonly labels = computed(() => this.state.labels());

    /** @internal */
    protected readonly icons = { close: closeOutline, edit: createOutline, delete: trashOutline };

    /**
     * Ionic dismissed the popover — the backdrop, Escape, or our own `close()`.
     *
     * Clearing the state is idempotent, so the round trip of `close()` → `isOpen = false` →
     * `didDismiss` → `close()` ends here rather than looping.
     */
    protected dismissed(): void {
        const anchor = this.target()?.anchor;

        this.close();
        if (anchor?.isConnected && typeof anchor.focus === 'function') anchor.focus();
    }
}

/**
 * Overflow list of a dense cell, opened by the "+N more" link.
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-more-popover',
    standalone: true,
    imports: [IonPopover, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel],
    template: `
        <ion-popover
            class="ionic-scheduler-overlay ionic-scheduler-more-popover-panel"
            data-slot="scheduler-more-popover-panel"
            [isOpen]="context().visible"
            [event]="anchorEvent()"
            [side]="side()"
            alignment="center"
            [dismissOnSelect]="true"
            (didDismiss)="dismissed()"
        >
            <ng-template>
                <ion-header>
                    <ion-toolbar>
                        <ion-title size="small">{{ title() }}</ion-title>
                        <ion-buttons slot="end">
                            <ion-button fill="clear" [attr.aria-label]="labels().close" (click)="dismissed()">
                                <ion-icon slot="icon-only" [icon]="icons.close" />
                            </ion-button>
                        </ion-buttons>
                    </ion-toolbar>
                </ion-header>
                <ion-content>
                    <ng-content>
                        <ion-list lines="full">
                            @for (event of context().events; track event.id) {
                                <ion-item button detail="false" class="ionic-scheduler-more-popover-item" [attr.data-event-id]="event.id" (click)="pick($event, event)">
                                    <span class="ionic-scheduler-event-swatch" [style.background]="state.accentColor(event)" aria-hidden="true"></span>
                                    <ion-label>
                                        <span class="ionic-scheduler-event-title">{{ state.title(event) }}</span>
                                        <p class="ionic-scheduler-event-time">{{ state.eventTimeText(event) }}</p>
                                    </ion-label>
                                </ion-item>
                            }
                        </ion-list>
                    </ng-content>
                </ion-content>
            </ng-template>
        </ion-popover>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-more-popover',
        'data-slot': 'scheduler-more-popover',
        '[attr.data-view]': 'state.view()'
    },
    providers: [{ provide: SCHEDULER_MORE_POPOVER_CONTEXT, useFactory: () => inject(SchedulerMorePopover).context }]
})
export class SchedulerMorePopover extends SchedulerOverlayBase {
    protected override target() {
        return this.state.morePopover();
    }

    override close(): void {
        this.state.morePopover.set(null);
    }

    /** The overflow context. */
    readonly context = computed(() => {
        const target = this.state.morePopover();
        return {
            date: target?.date,
            resource: target?.resource,
            events: target?.events ?? [],
            visible: target != null,
            close: () => this.state.morePopover.set(null)
        };
    });

    /** @internal */
    readonly title = computed(() => {
        const date = this.state.morePopover()?.date;
        return date ? date.toLocaleDateString(this.state.locale(), { weekday: 'long', day: 'numeric', month: 'long' }) : '';
    });

    /** Selects an event from the list and closes the overlay. */
    pick(originalEvent: MouseEvent, event: SchedulerEvent): void {
        this.state.handleEventClick(originalEvent, event);
        this.state.morePopover.set(null);
    }
}

/**
 * Compact read-only summary of an event, with the two actions it is opened for.
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-quick-info',
    standalone: true,
    imports: [IonPopover, IonContent, IonButton, IonButtons, IonIcon, IonNote],
    template: `
        <ion-popover
            class="ionic-scheduler-overlay ionic-scheduler-quick-info-panel"
            data-slot="scheduler-quick-info-panel"
            [isOpen]="context().visible"
            [event]="anchorEvent()"
            [side]="side()"
            alignment="center"
            (didDismiss)="dismissed()"
        >
            <ng-template>
                <ion-content class="ionic-scheduler-overlay-content">
                    <ng-content>
                        <div class="ionic-scheduler-overlay-title">{{ title() }}</div>
                        <ion-note class="ionic-scheduler-overlay-time">{{ timeText() }}</ion-note>
                        @if (location()) {
                            <ion-note class="ionic-scheduler-overlay-location">{{ location() }}</ion-note>
                        }
                        <ion-buttons class="ionic-scheduler-overlay-actions">
                            <ion-button fill="clear" size="small" (click)="context().edit()">
                                <ion-icon slot="start" [icon]="icons.edit" />
                                {{ labels().edit }}
                            </ion-button>
                            <ion-button fill="clear" size="small" color="danger" (click)="context().remove()">
                                <ion-icon slot="start" [icon]="icons.delete" />
                                {{ labels().delete }}
                            </ion-button>
                        </ion-buttons>
                    </ng-content>
                </ion-content>
            </ng-template>
        </ion-popover>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-quick-info',
        'data-slot': 'scheduler-quick-info'
    },
    providers: [{ provide: SCHEDULER_QUICK_INFO_CONTEXT, useFactory: () => inject(SchedulerQuickInfo).context }]
})
export class SchedulerQuickInfo extends SchedulerOverlayBase {
    protected override target() {
        return this.state.quickInfo();
    }

    override close(): void {
        this.state.quickInfo.set(null);
    }

    /** The quick info context. */
    readonly context = computed(() => {
        const target = this.state.quickInfo();
        return {
            event: target?.event,
            visible: target != null,
            close: () => this.state.quickInfo.set(null),
            edit: () => this.state.requestQuickInfoEdit(target?.event),
            remove: () => this.state.requestQuickInfoDelete(target?.event)
        };
    });

    /** @internal */
    readonly title = computed(() => {
        const event = this.state.quickInfo()?.event;
        return event ? this.state.title(event) : '';
    });

    /** @internal */
    readonly timeText = computed(() => {
        const event = this.state.quickInfo()?.event;
        return event ? this.state.eventTimeText(event) : '';
    });

    /** @internal */
    readonly location = computed(() => this.state.quickInfo()?.event?.['location'] ?? '');
}

/**
 * Fuller detail panel of an event.
 *
 * This is the one the root places, through `eventPopoverPosition`, and the one that opens on hover:
 * it carries `pointer-events: none` on the backdrop so the grid underneath stays usable while it is
 * up — a hover panel that blocks the pointer closes itself the moment you move towards it.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-popover',
    standalone: true,
    imports: [IonPopover, IonContent, IonNote],
    template: `
        <ion-popover
            class="ionic-scheduler-overlay ionic-scheduler-event-popover-panel"
            data-slot="scheduler-event-popover-panel"
            [isOpen]="context().visible"
            [event]="anchorEvent()"
            [side]="side()"
            alignment="center"
            [showBackdrop]="false"
            (didDismiss)="dismissed()"
        >
            <ng-template>
                <ion-content class="ionic-scheduler-overlay-content">
                    <ng-content>
                        <div class="ionic-scheduler-overlay-title">{{ title() }}</div>
                        <ion-note class="ionic-scheduler-overlay-time">{{ timeText() }}</ion-note>
                        @if (description()) {
                            <p class="ionic-scheduler-overlay-description">{{ description() }}</p>
                        }
                    </ng-content>
                </ion-content>
            </ng-template>
        </ion-popover>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-popover',
        'data-slot': 'scheduler-event-popover'
    },
    providers: [{ provide: SCHEDULER_EVENT_POPOVER_CONTEXT, useFactory: () => inject(SchedulerPopover).context }]
})
export class SchedulerPopover extends SchedulerOverlayBase {
    protected override target() {
        return this.state.eventPopover();
    }

    /** The event popover is the one the root places, through `eventPopoverPosition`. */
    protected override placement() {
        return this.state.eventPopoverPosition();
    }

    override close(): void {
        this.state.eventPopover.set(null);
    }

    /** The popover context. */
    readonly context = computed(() => {
        const target = this.state.eventPopover();
        return {
            event: target?.event,
            visible: target != null,
            close: () => this.state.eventPopover.set(null),
            edit: () => this.state.requestEdit(target?.event),
            remove: () => this.state.requestRemove(target?.event)
        };
    });

    /** @internal */
    readonly title = computed(() => {
        const event = this.state.eventPopover()?.event;
        return event ? this.state.title(event) : '';
    });

    /** @internal */
    readonly timeText = computed(() => {
        const event = this.state.eventPopover()?.event;
        return event ? this.state.eventTimeText(event) : '';
    });

    /** @internal */
    readonly description = computed(() => this.state.eventPopover()?.event?.['description'] ?? '');
}

/**
 * Actions for an event or a date, as a list inside a popover.
 *
 * A list and not an action sheet: the menu is opened by a right click or the keyboard menu key,
 * which are pointer-and-keyboard gestures, and an action sheet sliding up from the bottom of the
 * screen is a long way from where the pointer is. An application that prefers the sheet on a phone
 * can project its own contents here.
 *
 * @group Components
 */
@Component({
    selector: 'ionic-scheduler-context-menu',
    standalone: true,
    imports: [IonPopover, IonContent, IonList, IonItem, IonLabel, IonIcon],
    template: `
        <ion-popover
            class="ionic-scheduler-overlay ionic-scheduler-context-menu-panel"
            data-slot="scheduler-context-menu-panel"
            [isOpen]="context().visible"
            [event]="anchorEvent()"
            [side]="side()"
            alignment="start"
            [dismissOnSelect]="true"
            (didDismiss)="dismissed()"
        >
            <ng-template>
                <ion-content>
                    <ng-content>
                        <ion-list lines="none" role="menu">
                            <ion-item button detail="false" role="menuitem" (click)="context().edit()">
                                <ion-icon slot="start" [icon]="icons.edit" />
                                <ion-label>{{ labels().edit }}</ion-label>
                            </ion-item>
                            <ion-item button detail="false" role="menuitem" (click)="context().remove()">
                                <ion-icon slot="start" [icon]="icons.delete" color="danger" />
                                <ion-label color="danger">{{ labels().delete }}</ion-label>
                            </ion-item>
                        </ion-list>
                    </ng-content>
                </ion-content>
            </ng-template>
        </ion-popover>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    encapsulation: ViewEncapsulation.None,
    host: {
        class: 'ionic-scheduler-context-menu',
        'data-slot': 'scheduler-context-menu'
    },
    providers: [{ provide: SCHEDULER_CONTEXT_MENU_CONTEXT, useFactory: () => inject(SchedulerContextMenu).context }]
})
export class SchedulerContextMenu extends SchedulerOverlayBase {
    protected override target() {
        return this.state.contextMenu();
    }

    override close(): void {
        this.state.contextMenu.set(null);
    }

    /** The context menu context. */
    readonly context = computed(() => {
        const target = this.state.contextMenu();
        return {
            event: target?.event,
            visible: target != null,
            close: () => this.state.contextMenu.set(null),
            edit: () => this.state.requestEdit(target?.event),
            remove: () => this.state.requestRemove(target?.event)
        };
    });
}
