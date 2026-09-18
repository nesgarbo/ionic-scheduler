import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SchedulerResource, SchedulerScrollTime, SchedulerViewType } from '../types/scheduler.types';
import { Scheduler } from './scheduler';
import { SchedulerModule } from './scheduler.module';
import { scrollInlineTo } from './scheduler-scroll';

/**
 * A scrollport that clamps like a browser's: it can only travel as far as its content overflows,
 * and a port that has not been laid out yet cannot travel at all.
 */
function fakePort(scrollWidth: number, clientWidth: number): HTMLElement {
    let left = 0;

    return {
        get scrollLeft() {
            return left;
        },
        set scrollLeft(value: number) {
            left = Math.min(Math.max(value, 0), Math.max(scrollWidth - clientWidth, 0));
        },
        scrollWidth,
        clientWidth
    } as unknown as HTMLElement;
}

// What the automatic scroll is FOR: a schedule that opens where the work is.
//
// jsdom has no layout engine, so the pixels cannot be asserted here — `offsetHeight` is 0 and the
// scroll correctly declines to guess. What is asserted is everything that decides WHERE it would
// scroll to, which is where the bugs live: the target resolution, and the DOM shape that decides
// whether the header survives a scroll at all.
const RESOURCES: SchedulerResource[] = [
    { id: 'a', name: 'BELISA' },
    { id: 'b', name: 'ARIYAS' }
];

@Component({
    imports: [SchedulerModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ionic-scheduler-root [view]="view()" [date]="date()" [resources]="RESOURCES" [scrollTime]="scrollTime()" [dayStartHour]="8" [dayEndHour]="20" [businessHours]="{ start: 9, end: 18 }">
            <ionic-scheduler-content>
                <ionic-scheduler-week />
                <ionic-scheduler-resource-timeline />
            </ionic-scheduler-content>
        </ionic-scheduler-root>
    `
})
class ScrollHost {
    readonly RESOURCES = RESOURCES;
    readonly view = signal<SchedulerViewType>('week');
    readonly date = signal(new Date());
    readonly scrollTime = signal<SchedulerScrollTime>('auto');
    readonly scheduler = viewChild.required(Scheduler);
}

describe('a scroll reports whether it landed', () => {
    it('lands on a port that has been laid out', () => {
        const port = fakePort(1200, 300);

        expect(scrollInlineTo(port, 500, 40, false)).toBe(true);
        expect(port.scrollLeft).toBe(460);
    });

    it('does NOT land on a port with no layout yet', () => {
        // The case the automatic scroll used to mark as done: writing `scrollLeft` here is clamped
        // to zero without complaining, so a board asked for today stayed on the 1st of the month
        // for as long as it was open. Saying so is what lets the caller ask again.
        const port = fakePort(0, 0);

        expect(scrollInlineTo(port, 500, 40, false)).toBe(false);
        expect(port.scrollLeft).toBe(0);
    });

    it('counts the end of a short axis as landing', () => {
        // Asking for a moment past the end of an axis that cannot travel that far is answered as
        // well as it can be answered; asking again would not move it.
        const port = fakePort(400, 300);

        expect(scrollInlineTo(port, 5000, 40, false)).toBe(true);
        expect(port.scrollLeft).toBe(100);
    });

    it('lands in RTL, where the distance runs negative', () => {
        const port = {
            scrollLeft: 0,
            scrollWidth: 1200,
            clientWidth: 300
        } as unknown as HTMLElement;

        expect(scrollInlineTo(port, 500, 40, true)).toBe(true);
        expect(port.scrollLeft).toBe(-460);
    });
});

describe('scroll to the moment that matters', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<ScrollHost>>;
    let host: ScrollHost;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ScrollHost],
            providers: [provideZonelessChangeDetection()]
        }).compileComponents();

        fixture = TestBed.createComponent(ScrollHost);
        host = fixture.componentInstance;
        await fixture.whenStable();
    });

    const target = () => host.scheduler().schedulerState.scrollTarget();

    it('defaults to now while the range contains it', () => {
        const now = new Date();

        expect(target()?.minutes).toBe(now.getHours() * 60 + now.getMinutes());
    });

    it('takes a written time of day', async () => {
        host.scrollTime.set('08:30');
        await fixture.whenStable();

        expect(target()?.minutes).toBe(510);
        expect(target()?.instant.getHours()).toBe(8);
        expect(target()?.instant.getMinutes()).toBe(30);
    });

    it('takes minutes as a number, and clamps them to the day', async () => {
        host.scrollTime.set(90);
        await fixture.whenStable();
        expect(target()?.minutes).toBe(90);

        host.scrollTime.set(5000);
        await fixture.whenStable();
        expect(target()?.minutes).toBe(24 * 60);
    });

    it('falls back to the start of business hours when the range is elsewhere', async () => {
        host.date.set(new Date(2027, 0, 12));
        await fixture.whenStable();

        // Not now: now is not in January 2027. The working day is the next best answer.
        expect(target()?.minutes).toBe(9 * 60);
        expect(target()?.instant.getFullYear()).toBe(2027);
    });

    it('takes a Date, and keeps ITS day', async () => {
        // The point of an instant: on an axis that spans a month, the day is most of the answer.
        // Every other form names a position inside a day and lets the range pick the day.
        host.date.set(new Date(2027, 0, 1));
        host.scrollTime.set(new Date(2027, 0, 15, 8, 30));
        await fixture.whenStable();

        expect(target()?.minutes).toBe(510);
        expect(target()?.instant.getDate()).toBe(15);
        expect(target()?.instant.getMonth()).toBe(0);
        expect(target()?.instant.getFullYear()).toBe(2027);
    });

    it('an invalid Date asks for nothing, rather than for NaN', async () => {
        host.scrollTime.set(new Date('not a date'));
        await fixture.whenStable();

        expect(target()).toBeNull();
    });

    it('scrollTime="none" asks for nothing', async () => {
        host.scrollTime.set('none');
        await fixture.whenStable();

        expect(target()).toBeNull();
    });

    it('scrollToTime() re-asks even for the same target, and can name a new one', async () => {
        const state = host.scheduler().schedulerState;
        const before = state.scrollRequest();

        host.scheduler().scrollToTime();
        expect(state.scrollRequest()).toBe(before + 1);

        host.scheduler().scrollToTime('06:00');
        await fixture.whenStable();

        expect(state.scrollRequest()).toBe(before + 2);
        expect(state.scrollTarget()?.minutes).toBe(360);
    });

    it('the resource rail lives INSIDE the axis scrollport, so a vertical scroll moves both', async () => {
        host.view.set('resourceTimelineWeek');
        await fixture.whenStable();

        const scroll = fixture.nativeElement.querySelector('.ionic-scheduler-timeline-scroll') as HTMLElement;
        const rail = fixture.nativeElement.querySelector('[data-slot="scheduler-resource-area"]') as HTMLElement;

        expect(scroll).toBeTruthy();
        expect(rail).toBeTruthy();
        // A rail outside the scrollport is a rail that stays behind when the lanes move, and every
        // row then names the wrong resource.
        expect(scroll.contains(rail)).toBe(true);
        // And the axis is its SIBLING on one canvas: the canvas is the box the rail sticks inside,
        // so it has to hold both or the rail comes unstuck a screen into the axis.
        const canvas = scroll.querySelector('.ionic-scheduler-timeline-canvas');

        expect(canvas?.parentElement).toBe(scroll);
        expect(rail.parentElement).toBe(canvas);
        expect(scroll.querySelector('.ionic-scheduler-timeline-axis')?.parentElement).toBe(canvas);
    });
});
