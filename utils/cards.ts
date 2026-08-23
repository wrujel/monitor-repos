/**
 * Status-page cards — the two shapes the README's charts are drawn in.
 *
 * Both are the same card: 90 day-bars under a title and a state badge, with
 * the uptime over that window written between "90 days ago" and "Today". The
 * overview card spans the README and splits each day-bar by how the whole
 * fleet settled; the strip cards are one per entry, two to a row, so the
 * markdown table's own cell borders draw the grid.
 *
 * The status vocabulary is the caller's — pass a StatusStyles map. Colours are
 * written as presentation attributes, so a client that drops the <style> block
 * still renders the light card; the block only repaints the neutrals for
 * prefers-color-scheme: dark.
 */

export const SLOTS = 90;

export type Glyph = "check" | "bang" | "cross" | "dash";

/**
 * How one status is drawn: its day-bar fill, its badge, and what it is called.
 * `label` names the state the card is IN ("Degraded"); `legend` names what the
 * colour COUNTS on the overview card ("Warning"), and falls back to `label`.
 */
export type StatusStyle = {
  bar: string;
  badge: string;
  label: string;
  legend?: string;
  glyph: Glyph;
};

export type StatusStyles = Record<string, StatusStyle>;

/** The fill for a day the entry did not run at all. */
export const BAR_EMPTY = "#e6e8eb";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const CSS = `<style>
    @media (prefers-color-scheme: dark) {
      .bg { fill: #0d1117 }
      .title { fill: #e6edf3 }
      .muted { fill: #8b949e }
      .hint { stroke: #30363d }
      .rule { stroke: #30363d }
      .nodata { fill: #21262d }
    }
  </style>`;

/** A card wide enough for the whole fleet, one stacked bar per day. */
export const OVERVIEW = {
  w: 800,
  h: 170,
  padX: 16,
  titleY: 25,
  titleSize: 15,
  iconCy: 20,
  iconR: 11,
  barsTop: 44,
  barsH: 62,
  footerY: 126,
  footerSize: 11,
  stateY: 152,
} as const;

/** A card for a single entry, sized to sit two per README row. */
export const STRIP = {
  w: 380,
  h: 138,
  padX: 13,
  titleY: 20,
  titleSize: 13,
  iconCy: 16,
  iconR: 9,
  barsTop: 34,
  barsH: 42,
  footerY: 94,
  footerSize: 10,
  stateY: 118,
} as const;

const styleFor = (styles: StatusStyles, status: string): StatusStyle =>
  styles[status] ?? {
    bar: "#e5534b",
    badge: "#cf222e",
    label: status || "unknown",
    glyph: "cross",
  };

export const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Rough advance width of a string — enough to park the hint bubble after the
 * title and to butt the footer rules up against their labels without measuring
 * a font we do not ship.
 */
export const textWidth = (text: string, fontSize: number) => {
  let ems = 0;
  for (const ch of text) {
    if (ch === " ") ems += 0.28;
    else if ("iljtfrI.,:;'|!-".includes(ch)) ems += 0.32;
    else if ("mwMW".includes(ch)) ems += 0.86;
    else if (ch >= "A" && ch <= "Z") ems += 0.66;
    else ems += 0.55;
  }
  return ems * fontSize;
};

/** The white mark inside the state badge, scaled to the badge radius. */
const badgeGlyph = (glyph: Glyph, cx: number, cy: number, r: number) => {
  const k = r / 9;
  const pen = `fill="none" stroke="#fff" stroke-width="${(r * 0.21).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"`;

  if (glyph === "check") {
    return `<path d="M${(cx - 4.2 * k).toFixed(2)} ${(cy + 0.3 * k).toFixed(2)}l${(2.9 * k).toFixed(2)} ${(2.9 * k).toFixed(2)} ${(5.4 * k).toFixed(2)} ${(-6.2 * k).toFixed(2)}" ${pen}/>`;
  }
  if (glyph === "bang") {
    return (
      `<path d="M${cx} ${(cy - 4.9 * k).toFixed(2)}v${(5 * k).toFixed(2)}" ${pen}/>` +
      `<circle cx="${cx}" cy="${(cy + 3.9 * k).toFixed(2)}" r="${(1.15 * k).toFixed(2)}" fill="#fff"/>`
    );
  }
  if (glyph === "dash") {
    return `<path d="M${(cx - 4.4 * k).toFixed(2)} ${cy}h${(8.8 * k).toFixed(2)}" ${pen}/>`;
  }
  const d = 3.3 * k;
  return `<path d="M${(cx - d).toFixed(2)} ${(cy - d).toFixed(2)}l${(d * 2).toFixed(2)} ${(d * 2).toFixed(2)}M${(cx + d).toFixed(2)} ${(cy - d).toFixed(2)}l${(-d * 2).toFixed(2)} ${(d * 2).toFixed(2)}" ${pen}/>`;
};

/** Title, its hint bubble, and the state badge on the far right. */
const header = (
  title: string,
  style: StatusStyle,
  geo: typeof STRIP | typeof OVERVIEW,
) => {
  const { w, padX, iconCy: cy, iconR: r } = geo;
  const hintR = r * 0.72;
  const hintCx = padX + textWidth(title, geo.titleSize) + hintR + 3;
  const iconCx = w - padX - r;

  return (
    `<text class="title" x="${padX}" y="${geo.titleY}" font-size="${geo.titleSize}" font-weight="600" fill="#1f2328">${escapeXml(title)}</text>` +
    `<circle class="hint" cx="${hintCx.toFixed(1)}" cy="${cy}" r="${hintR.toFixed(1)}" fill="none" stroke="#d0d7de" stroke-width="1"/>` +
    `<text class="muted" x="${hintCx.toFixed(1)}" y="${(cy + hintR * 0.49).toFixed(1)}" text-anchor="middle" font-size="${(hintR * 1.31).toFixed(1)}" font-weight="700" fill="#57606a">?</text>` +
    `<circle cx="${iconCx}" cy="${cy}" r="${r}" fill="${style.badge}"/>` +
    badgeGlyph(style.glyph, iconCx, cy, r)
  );
};

/** "90 days ago ──── <uptime> % uptime ──── Today", rules trimmed to fit. */
const footer = (
  uptimeText: string,
  geo: typeof STRIP | typeof OVERVIEW,
): string => {
  const { w, padX, footerY: y, footerSize: size } = geo;
  const leftEnd = padX + textWidth("90 days ago", size);
  const rightStart = w - padX - textWidth("Today", size);
  const midHalf = textWidth(uptimeText, size) / 2;
  const ruleY = (y - size * 0.35).toFixed(1);
  const rule = (x1: number, x2: number) =>
    x2 - x1 > 6
      ? `<line class="rule" x1="${x1.toFixed(1)}" y1="${ruleY}" x2="${x2.toFixed(1)}" y2="${ruleY}" stroke="#d8dee4" stroke-width="1"/>`
      : "";

  return (
    `<text class="muted" x="${padX}" y="${y}" font-size="${size}" fill="#57606a">90 days ago</text>` +
    `<text class="muted" x="${w / 2}" y="${y}" text-anchor="middle" font-size="${size}" fill="#57606a">${uptimeText}</text>` +
    `<text class="muted" x="${w - padX}" y="${y}" text-anchor="end" font-size="${size}" fill="#57606a">Today</text>` +
    rule(leftEnd + 9, w / 2 - midHalf - 9) +
    rule(w / 2 + midHalf + 9, rightStart - 9)
  );
};

/** Swatch + label pairs, right-aligned so the row ends at `rightX`. */
const legendRow = (
  items: [string, string][],
  rightX: number,
  baselineY: number,
  size: number,
) => {
  const gap = 16;
  const sw = size * 0.86;
  const widths = items.map(([label]) => sw + 5 + textWidth(label, size));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let x = rightX - total;

  return items
    .map(([label, fill], i) => {
      const out =
        `<rect x="${x.toFixed(1)}" y="${(baselineY - sw + 0.5).toFixed(1)}" width="${sw.toFixed(1)}" height="${sw.toFixed(1)}" rx="2" fill="${fill}"/>` +
        `<text class="muted" x="${(x + sw + 5).toFixed(1)}" y="${baselineY}" font-size="${size}" fill="#57606a">${escapeXml(label)}</text>`;
      x += widths[i] + gap;
      return out;
    })
    .join("");
};

/** `null` uptime means the window holds nothing to measure. */
export const uptimeLabel = (uptime: number | null) =>
  uptime === null
    ? "no data"
    : `${uptime === 100 ? "100.0" : uptime.toFixed(2)} % uptime`;

const open = (w: number, h: number, label: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(label)}" font-family="${FONT}">
  ${CSS}
  <rect class="bg" width="${w}" height="${h}" rx="6" fill="#ffffff"/>`;

const bar = (
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  empty = false,
) =>
  `<rect${empty ? ' class="nodata"' : ""} x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" rx="1" fill="${fill}"/>`;

/**
 * One entry's card: a single status per day. `days` runs oldest → newest and
 * must be SLOTS long; an undefined day is one the entry did not run.
 */
export const buildStripCard = (opts: {
  title: string;
  days: (string | undefined)[];
  status: string;
  uptime: number | null;
  styles: StatusStyles;
}): string => {
  const { w, h, padX } = STRIP;
  const slotW = (w - padX * 2) / SLOTS;
  const barW = Math.max(2, slotW - 1.2);

  const bars = opts.days
    .map((day, i) =>
      bar(
        padX + i * slotW,
        STRIP.barsTop,
        barW,
        STRIP.barsH,
        day ? styleFor(opts.styles, day).bar : BAR_EMPTY,
        !day,
      ),
    )
    .join("");

  const style = styleFor(opts.styles, opts.status);
  const uptimeText = uptimeLabel(opts.uptime);

  return `${open(w, h, `${opts.title}: ${style.label}, ${uptimeText} over the last ${SLOTS} days`)}
  ${header(opts.title, style, STRIP)}
  ${bars}
  ${footer(uptimeText, STRIP)}
  <text class="muted" x="${padX}" y="${STRIP.stateY}" font-size="11.5" fill="#57606a">${escapeXml(style.label)}</text>
</svg>`;
};

/**
 * The fleet on one strip: each day is a full-height bar split between the
 * statuses in `order` (bottom first) in proportion to that day's counts, so a
 * single bad entry still reads at a glance. A null day had no run.
 */
export const buildOverviewCard = (opts: {
  title: string;
  days: (Record<string, number> | null)[];
  order: string[];
  status: string;
  uptime: number | null;
  styles: StatusStyles;
  legend: string[];
}): string => {
  const { w, h, padX } = OVERVIEW;
  const slotW = (w - padX * 2) / SLOTS;
  const barW = Math.max(2, slotW - 2.2);
  const bottom = OVERVIEW.barsTop + OVERVIEW.barsH;

  const bars = opts.days
    .map((counts, i) => {
      const x = padX + i * slotW;
      const total = counts
        ? opts.order.reduce((sum, s) => sum + (counts[s] ?? 0), 0)
        : 0;
      if (total === 0) {
        return bar(x, OVERVIEW.barsTop, barW, OVERVIEW.barsH, BAR_EMPTY, true);
      }

      let y = bottom;
      return opts.order
        .map((status) => {
          const n = counts?.[status] ?? 0;
          if (n === 0) return "";
          const segH = (n / total) * OVERVIEW.barsH;
          y -= segH;
          return bar(x, y, barW, segH, styleFor(opts.styles, status).bar);
        })
        .join("");
    })
    .join("");

  const style = styleFor(opts.styles, opts.status);
  const uptimeText = uptimeLabel(opts.uptime);

  return `${open(w, h, `${opts.title}: ${style.label}, ${uptimeText} over the last ${SLOTS} days`)}
  ${header(opts.title, style, OVERVIEW)}
  ${bars}
  ${footer(uptimeText, OVERVIEW)}
  <text class="muted" x="${padX}" y="${OVERVIEW.stateY}" font-size="12.5" fill="#57606a">${escapeXml(style.label)}</text>
  ${legendRow(
    opts.legend.map((s) => {
      const { label, legend, bar } = styleFor(opts.styles, s);
      return [legend ?? label, bar] as [string, string];
    }),
    w - padX,
    OVERVIEW.stateY,
    10.5,
  )}
</svg>`;
};
