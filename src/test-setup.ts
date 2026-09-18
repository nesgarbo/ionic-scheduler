/**
 * What jsdom is missing for Ionic's components.
 *
 * `ion-segment` scrolls the checked button into view on every render, and jsdom implements neither
 * `Element.scrollTo` nor the layout it would need. Without this the view selector throws on every
 * change of view — dozens of unhandled rejections around tests that are otherwise green, which is
 * how a real failure ends up buried.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.scrollTo !== 'function') {
    Element.prototype.scrollTo = () => {};
}

if (typeof Element !== 'undefined' && typeof Element.prototype.scrollIntoView !== 'function') {
    Element.prototype.scrollIntoView = () => {};
}

/**
 * `ion-popover` observes its content box to keep the panel sized, and jsdom has no ResizeObserver.
 * A no-op is the honest stub: there is no layout to observe in jsdom, so a fake that never fires is
 * exactly as accurate as the environment allows.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
    } as unknown as typeof ResizeObserver;
}
