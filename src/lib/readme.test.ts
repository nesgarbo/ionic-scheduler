import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { SchedulerEvent, SchedulerViewType } from '../types/scheduler.types';
import { Scheduler } from './scheduler';
import { SchedulerHeader, SchedulerNavigation, SchedulerTitle, SchedulerViewSelector } from './scheduler-parts';
import { SchedulerAgendaScope, SchedulerContent, SchedulerMonthScope, SchedulerWeekScope } from './scheduler-registry';
import { SchedulerQuickInfo } from './scheduler-overlays';

// The README's quick start, mounted verbatim.
//
// Documentation that does not compile is worse than none: it is the first thing anyone runs, and a
// renamed export or a moved selector breaks it silently. This is the copy the tests keep honest —
// if it changes here, it changes in the README.
@Component({
    selector: 'app-charter-schedule',
    changeDetection: ChangeDetectionStrategy.Eager,
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
class CharterSchedulePage {
    readonly view = signal<SchedulerViewType>('month');
    readonly date = signal(new Date(2026, 8, 18));
    readonly events = signal<SchedulerEvent[]>([{ id: 1, title: 'Sea trial', start: '2026-09-18T09:00', end: '2026-09-18T13:00' }]);
}

describe('README quick start', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CharterSchedulePage],
            providers: [provideZonelessChangeDetection()]
        }).compileComponents();
    });

    it('mounts, draws the month and offers the three declared views', async () => {
        const fixture = TestBed.createComponent(CharterSchedulePage);

        await fixture.whenStable();

        const host = fixture.nativeElement as HTMLElement;

        expect(host.querySelectorAll('[data-slot="scheduler-month-cell"]').length).toBe(42);
        expect(host.querySelector('[data-slot="scheduler-title"]')?.textContent).toContain('2026');
        // The selector offers the scopes that were declared, and nothing else.
        expect([...host.querySelectorAll('[data-slot="scheduler-view-button"]')].map((button) => button.getAttribute('data-view'))).toEqual(['month', 'week', 'agenda']);
        // The event landed in its day.
        expect(host.querySelector('[data-slot="scheduler-month-event"]')?.textContent).toContain('Sea trial');
    });

    it('the navigation moves the range', async () => {
        const fixture = TestBed.createComponent(CharterSchedulePage);

        await fixture.whenStable();

        const host = fixture.nativeElement as HTMLElement;
        const before = fixture.componentInstance.date();

        (host.querySelector('[data-slot="scheduler-nav-next"]') as HTMLElement).click();
        await fixture.whenStable();

        expect(fixture.componentInstance.date().getTime()).toBeGreaterThan(before.getTime());
    });
});
