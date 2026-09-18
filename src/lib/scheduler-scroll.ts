/**
 * Bringing the moment that matters into view.
 *
 * A time grid that opens at midnight is a time grid nobody asked for: the hours anyone cares about
 * are the working ones, and the hour they care about MOST is the one happening now. The same is true
 * of a timeline, which is several screens wide the moment its axis spans more than a day.
 *
 * Two things make this less trivial than a `scrollTop`:
 *
 *   • **Whose scrollbar is it.** The Scheduler's own content region scrolls when the component has a
 *     bounded height, and the page — or, in an Ionic application, `ion-content` — scrolls when it
 *     does not. The target has to be found rather than assumed, and `ion-content` keeps its
 *     scrollport in a shadow root that only `getScrollElement()` reaches.
 *
 *   • **The head is sticky.** Landing the target at the top of the scrollport puts it UNDER the day
 *     headers. Their height comes off the offset, and a lead of one slot is left above it so the
 *     target reads as "here" and not as "the first thing clipped by the edge".
 *
 * @module scheduler-scroll
 */

/** An element that can be scrolled, or the promise `ion-content` answers with. */
type ScrollPort = HTMLElement | null;

/**
 * The nearest ancestor that actually scrolls vertically.
 *
 * "Actually" is the point: an element with `overflow: auto` whose content fits is not a scroller,
 * and stopping at it would scroll nothing while the real scrollport — the page, or the `ion-content`
 * around it — stayed where it was. `ion-content` is answered for by its own scroll element, which
 * lives in a shadow root.
 */
export async function verticalScrollPort(from: HTMLElement): Promise<ScrollPort> {
    let node: HTMLElement | null = from;

    while (node) {
        const ionContent = node as HTMLElement & { getScrollElement?: () => Promise<HTMLElement> };

        if (node.tagName === 'ION-CONTENT' && typeof ionContent.getScrollElement === 'function') {
            try {
                return await ionContent.getScrollElement();
            } catch {
                return null;
            }
        }

        if (scrollsOn(node, 'y')) return node;

        node = node.parentElement;
    }

    return from.ownerDocument?.scrollingElement as HTMLElement | null;
}

/** Whether an element both overflows on an axis and is allowed to scroll it. */
function scrollsOn(node: HTMLElement, axis: 'x' | 'y'): boolean {
    if (typeof getComputedStyle !== 'function') return false;

    const style = getComputedStyle(node);
    const overflow = axis === 'y' ? style.overflowY : style.overflowX;
    const overflows = axis === 'y' ? node.scrollHeight > node.clientHeight + 1 : node.scrollWidth > node.clientWidth + 1;

    return overflows && (overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay');
}

/**
 * Scrolls `port` so that `target` — a point measured inside `body` — sits just under `stickyHeight`.
 *
 * Everything is measured through `getBoundingClientRect` against the port rather than through
 * `offsetTop`, because `offsetTop` is relative to the offset parent and the two are the same element
 * only by luck.
 *
 * Answers whether the port ENDED where it was asked to go. @see scrollInlineTo.
 */
export function scrollPointIntoView(port: HTMLElement, body: HTMLElement, offsetInBody: number, stickyHeight: number, lead: number): boolean {
    const portBox = port === port.ownerDocument.scrollingElement ? { top: 0 } : port.getBoundingClientRect();
    const bodyTop = body.getBoundingClientRect().top - portBox.top + port.scrollTop;
    const top = Math.max(bodyTop + offsetInBody - stickyHeight - lead, 0);

    // `scrollTop` and not `scrollTo({ behavior })`: this runs when a view is first drawn, and an
    // animated scroll from a position the user never saw is motion with nothing to communicate.
    port.scrollTop = top;

    return arrived(port.scrollTop, top, port.scrollHeight - port.clientHeight);
}

/**
 * Scrolls a horizontal axis so that `offset` pixels from the START of the line are at the leading
 * edge, minus a lead.
 *
 * The sign is applied last because the two directions disagree about it: in RTL a spec-compliant
 * browser runs `scrollLeft` negative from zero at the start of the line, so the distance is computed
 * unsigned and only then given its direction.
 */
export function scrollInlineTo(port: HTMLElement, offset: number, lead: number, rtl: boolean): boolean {
    const distance = Math.max(offset - lead, 0);

    port.scrollLeft = rtl ? -distance : distance;

    return arrived(Math.abs(port.scrollLeft), distance, port.scrollWidth - port.clientWidth);
}

/**
 * Whether a scroll that was just written LANDED.
 *
 * Writing `scrollLeft` on a port whose content has not been laid out yet is not an error and not a
 * no-op either: the browser silently clamps it to the range the port can currently reach, which
 * while that range is zero means the port stays at the start. A caller that treats the write as
 * done then never tries again, and the view sits at the beginning of its axis for good — which is
 * how a month-wide board ends up showing the 1st when it was asked for today.
 *
 * Reaching the limit of a port that cannot travel any further counts as arriving: a range whose
 * target is past the end of a short axis is as close as anyone can get to it.
 */
function arrived(position: number, wanted: number, limit: number): boolean {
    // A pixel of tolerance: a fractional column width lands on a fractional offset, and browsers
    // round `scrollLeft` to device pixels.
    return Math.abs(position - wanted) <= 1 || (limit > 0 && position >= limit - 1);
}
