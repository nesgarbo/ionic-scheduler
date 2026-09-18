import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import type { SchedulerCategory, SchedulerEvent, SchedulerResource, SchedulerViewType } from '../types/scheduler.types';
import { SchedulerModule } from './scheduler.module';

// A resource planning board as an application actually wires one: resources are the things being
// booked, categories are the states a booking can be in, and the bookings arrive AFTER the first
// render because the store has to answer first. Every one of these was a real bug.
const RESOURCES: SchedulerResource[] = [
    { id: 21, name: 'Unit A', kind: 'large' },
    { id: 22, name: 'Unit B', kind: 'large' }
];

const CATEGORIES: SchedulerCategory[] = [
    { id: 2, name: 'Opción', color: '#ff0000' },
    { id: 3, name: 'Confirmada', color: '#3e9c1f' }
];

const EVENTS: SchedulerEvent[] = [
    { id: 627, title: 'Direct booking', start: new Date('2026-09-15T08:00:00+02:00'), end: new Date('2026-09-20T20:00:00+02:00'), resourceId: 22, stateId: 3, editable: false },
    { id: 626, title: 'Direct booking', start: new Date('2026-09-16T08:00:00+02:00'), end: new Date('2026-09-19T20:00:00+02:00'), resourceId: 21, stateId: 3, editable: false }
];

@Component({
    imports: [SchedulerModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <ionic-scheduler-root
            [events]="events()"
            [resources]="resources()"
            [categories]="categories()"
            categoryField="stateId"
            [view]="view()"
            [date]="date()"
            [views]="views"
        >
            <ionic-scheduler-header>
                <ionic-scheduler-navigation />
                <ionic-scheduler-title />
            </ionic-scheduler-header>
            <ionic-scheduler-content>
                <ionic-scheduler-month />
                <ionic-scheduler-agenda />
                <ionic-scheduler-resource-timeline />
            </ionic-scheduler-content>
        </ionic-scheduler-root>
    `
})
class PlanningHost {
    readonly views: SchedulerViewType[] = ['resourceTimelineMonth', 'resourceTimelineWeek', 'month', 'agenda'];
    readonly view = signal<SchedulerViewType>('resourceTimelineMonth');
    readonly date = signal(new Date(2026, 8, 18));
    readonly resources = signal(RESOURCES);
    readonly categories = signal(CATEGORIES);
    readonly events = signal<SchedulerEvent[]>([]);
}

describe('a resource planning board', () => {
    function mount() {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(PlanningHost);
        fixture.detectChanges();
        return fixture;
    }

    it('draws a resource row per resource', () => {
        const fixture = mount();
        fixture.componentInstance.events.set(EVENTS);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.ionic-scheduler-resource').length).toBe(2);
    });

    it('draws the bookings that arrive after the first render', () => {
        const fixture = mount();
        // The board renders before the store has answered, which is what a reload looks like.
        expect(fixture.nativeElement.querySelectorAll('.ionic-scheduler-timeline-event').length).toBe(0);

        fixture.componentInstance.events.set(EVENTS);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.ionic-scheduler-timeline-event').length).toBe(2);
    });

    it('draws the two bookings of the month among the whole history', () => {
        // A store holds every booking it has ever loaded, not the visible ones. Here 289 of them,
        // of which two fall in the month on screen — the filtering is the component's job.
        const history: SchedulerEvent[] = [];
        for (let index = 0; index < 289; index++) {
            const year = 2020 + (index % 6);
            const month = index % 12;
            const day = 1 + (index % 27);
            history.push({
                id: 1000 + index,
                title: `Booking ${index}`,
                start: new Date(year, month, day, 8),
                end: new Date(year, month, day + 2, 20),
                resourceId: index % 2 === 0 ? 21 : 22,
                stateId: 3,
                editable: false
            });
        }

        const fixture = mount();
        fixture.componentInstance.events.set([...history, ...EVENTS]);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.ionic-scheduler-timeline-event').length).toBe(2);
    });

    it('draws bookings that were there from the first render', () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(PlanningHost);
        fixture.componentInstance.events.set(EVENTS);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelectorAll('.ionic-scheduler-timeline-event').length).toBe(2);
    });
});
