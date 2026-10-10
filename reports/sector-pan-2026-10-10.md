# Sector map dragging, 10 October 2026

## Workload

The sample contains 4,921 systems. The baseline is the renderer in [5ec62cb](https://github.com/JosXa/telegram-wireframes/commit/5ec62cb). Both runs use headless Chromium 156.0.8078.4 and the real Telegram Web A iframe, with normal animations enabled. Each sample sends 180 pointer moves at browser frame cadence after a real mouse-down. The path spans 240 CSS pixels horizontally and 200 vertically. Raw measurements are available [before](sector-pan-before.json) and [after](sector-pan-after.json) the change.

Desktop uses a 1280 × 900 viewport at pixel ratio 1. The phone configuration uses 420 × 900 at pixel ratio 2; it runs on the same desktop host. Results describe this environment, not a physical phone.

## Measurements

Frame p95 is the 95th percentile of intervals between animation frames. Main-thread time is Chromium's accumulated `TaskDuration` over the workload, including the surrounding Telegram page. DOM counts refer to the Mini App document.

| Viewport and zoom | Frame p95, before → after | Main-thread time, before → after | DOM nodes, before → after |
|---|---:|---:|---:|
| Desktop, neighbourhood | 66.6 → 33.4 ms | 940 → 396 ms | 991 → 197 |
| Desktop, regional | 100.0 → 33.3 ms | 5,627 → 347 ms | 4,312 → 229 |
| Desktop, sector | 33.4 → 33.4 ms | 1,017 → 317 ms | 614 → 229 |
| Phone viewport, neighbourhood | 16.7 → 16.7 ms | 585 → 473 ms | 1,044 → 197 |
| Phone viewport, regional | 16.8 → 16.7 ms | 2,061 → 492 ms | 4,987 → 229 |
| Phone viewport, sector | 33.4 → 16.8 ms | 2,078 → 227 ms | 614 → 229 |

The phone viewport had no frames above 25 ms in the optimized run. The desktop regional workload used 94% less main-thread time, but desktop frame p95 still reached 33.4 ms.

With 4× CPU slowdown and drags spanning 720 × 600 CSS pixels, the phone viewport recorded frame p95 of 16.7–16.8 ms across all three zoom levels, with occasional frames up to 66.7 ms. Desktop frame p95 was 33.4 ms. The [stress measurements](sector-pan-stress.json) include p99 and maximum frame intervals.

## Cause and changes

A Chrome trace of 120 regional drag frames recorded 5.61 seconds of raster work across raster threads. Hiding the nebula reduced that to 0.32 seconds. Hiding the detailed star nodes then reduced layer construction from 2.16 seconds to 0.06 seconds. These trace durations can overlap and must not be added into a wall-clock total.

The renderer now caches the nebula as an SVG image and draws static hexes and stars into a canvas. A 192-pixel margin around the viewport allows small pans to translate the cached bitmap through the compositor. Zoom, resize and larger pans rebuild it. An axial-coordinate lookup limits drawing to the visible region and its margin. Cached stellar sprites avoid repeating their drawing work. At overview scale, the whole sector fits within the same pixel budget, so dragging reuses its bitmap regardless of distance.

A follow-up trace still measured desktop frame p95 at 33.4 ms with the entire iframe invisible. Giving the SVG another compositor layer also made no improvement, so that change was discarded.

Visible ownership, selection and fleets use SVG overlays. Pointer moves and wheel events coalesce into one camera update per animation frame. Geometric hit testing selects any hex, and arrow keys navigate the rasterized systems. The renderer does not allocate a bitmap covering the galaxy at full detail.

## Reproduce

Run browser workloads separately to avoid contention:

```sh
bun run perf:mini-app wireframes/performance/pan.json
CPU_RATE=4 PAN_DISTANCE=360 bun run perf:mini-app wireframes/performance/stress.json
```

The second command crosses the cache margin during dragging and applies Chromium's 4× CPU slowdown. Mouse and touch smoke coverage also checks selection alignment after zoom, keyboard navigation and a pan across the cache margin.
