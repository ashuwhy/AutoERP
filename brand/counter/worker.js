// The downloads count under the README's download buttons, drawn as one of the popup's chips.
// GitHub shows README images without web fonts, so the text is Archivo outlines from glyphs.js,
// the same way brand/mark.py draws the buttons.
import { EM, TOP, BOTTOM, DIGITS, LABEL } from "./glyphs.js";

const RELEASES = "https://api.github.com/repos/ashuwhy/AutoERP/releases?per_page=100";
const FRESH = 5 * 60 * 1000;

// theme.css: --card, --ink and --red
const LIGHT = { card: "#e8dfca", ink: "#1b1814", red: "#d9381e" };
const DARK = { card: "#1a1712", ink: "#efe6d2", red: "#f0563a" };

export function chip(count, { card, ink, red }) {
    const figures = new Intl.NumberFormat("en-IN").format(count);
    const k = 14 / EM;
    let pen = 0;
    let digits = "";
    for (const c of figures) {
        digits += `<path d="${DIGITS[c].d}" transform="translate(${pen} 0)"/>`;
        pen += DIGITS[c].advance;
    }
    const left = DIGITS[figures[0]].left;
    const width = ((pen + LABEL.right - left) * k + 24).toFixed(1);
    const dx = (12 - left * k).toFixed(2);
    const dy = (18 - ((TOP + BOTTOM) / 2) * k).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 36" width="${width}" height="36" ` +
        `role="img" aria-label="${figures} downloads"><rect width="${width}" height="36" rx="18" fill="${card}"/>` +
        `<g transform="translate(${dx} ${dy}) scale(${k.toFixed(5)})"><g fill="${red}">${digits}</g>` +
        `<path d="${LABEL.d}" fill="${ink}" transform="translate(${pen} 0)"/></g></svg>`;
}

async function total(env) {
    const saved = await env.COUNTER.get("total", "json");
    if (saved && Date.now() - saved.at < FRESH) return saved.count;
    // Without a token GitHub allows 60 calls an hour per IP, and every Worker on Cloudflare
    // shares those IPs, so an unauthenticated call often gets a 403.
    const headers = { "User-Agent": "autoerp-downloads", Accept: "application/vnd.github+json" };
    if (env.GITHUB_TOKEN) headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
    try {
        const response = await fetch(RELEASES, { headers });
        if (!response.ok) throw new Error(`GitHub answered ${response.status}`);
        const releases = await response.json();
        const count = releases.flatMap((release) => release.assets)
            .reduce((sum, asset) => sum + asset.download_count, 0);
        await env.COUNTER.put("total", JSON.stringify({ count, at: Date.now() }));
        return count;
    } catch (error) {
        // The last count stands in until a call gets through.
        if (saved) return saved.count;
        throw error;
    }
}

export default {
    async fetch(request, env) {
        const theme = new URL(request.url).searchParams.get("theme") === "dark" ? DARK : LIGHT;
        try {
            return new Response(chip(await total(env), theme), {
                headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=300" },
            });
        } catch (error) {
            return new Response(error.message, { status: 503, headers: { "Cache-Control": "no-store" } });
        }
    },
};
