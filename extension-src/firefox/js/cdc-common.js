// Shared by the CDC boards, injected before js/cdc-companies.js or js/cdc-notices.js. Both CDC
// pages sit in <iframe name="myframe"> on IIT_ERP3/showmenu.htm, and each loads its jqGrid from
// ERPMonitoring.htm?action=fetchData&jqqueryid=NN, a query the page itself registered. The boards
// fetch that feed again rather than reach into the page world for jqGrid's data.
//
// Declarations stay top level so the next script in the same injection can use them.

// Content scripts cannot ask runtime.getPlatformInfo, so Firefox for Android goes by its UA.
function cdcSkip() {
    return /Android/.test(navigator.userAgent);
}

// The popup's CDC switch (cdcOn, missing = on). start() mounts a board and resolves to its stop(),
// or to nothing when there is no board to draw. On and off run one after the other through one
// chain, so an off that lands while start() is still mounting waits for it and then stops it.
function cdcSwitch(start) {
    if (cdcSkip()) return;
    let on = false;
    let chain = Promise.resolve(null);
    const wanted = () => on;
    // An off lands while a board may still be mounting: the host goes now, and start() checks wanted()
    // after each wait, so nothing is fetched or saved past the off.
    const want = (value) => {
        on = value;
        if (!on) document.getElementById("autoerp-cdc")?.remove();
        chain = chain.then((stop) => (value && !stop ? start(wanted) : !value && stop ? stop() : stop)).then((stop) => stop || null, () => null);
    };
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && "cdcOn" in changes) want(changes.cdcOn.newValue !== false);
    });
    chrome.storage.local.get("cdcOn").then(({ cdcOn }) => want(cdcOn !== false));
}

// The board goes above ERP's own grey box, #jqmonitoringNN, so it is never framed twice. jqGrid builds
// the box after the page's own scripts run; give it ten seconds.
async function cdcAnchor(n) {
    for (let waited = 0; waited < 10000; waited += 250) {
        const anchor = ["jqmonitoring", "gbox_grid", "grid"].map((id) => document.getElementById(id + n)).find(Boolean);
        if (anchor) return anchor;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
}

// ERP opens a role page as a jQuery UI dialog around an iframe on TPJNFView.jsp, from its own grid or
// from the board's Role page button. Apply and Cancel apply happen inside it, so when such a dialog
// closes (hidden or taken out of the page), onClose gets that role's [jnf, com, yop] to ask again.
function cdcWatchRoleDialog(onClose) {
    const open = new Map();
    const shown = (dialog) => dialog.isConnected && getComputedStyle(dialog).display !== "none";
    const argsOf = (dialog) => {
        const src = dialog.querySelector("iframe")?.src;
        const url = src && URL.canParse(src) ? new URL(src) : null;
        if (!url || !/\/TPJNFView\.jsp$/.test(url.pathname)) return null;
        const args = ["jnf_id", "com_id", "yop"].map((name) => url.searchParams.get(name) || "");
        return args.every((arg) => /^[\w-]+$/.test(arg)) ? args : null;
    };
    const observer = new MutationObserver(() => {
        for (const dialog of document.querySelectorAll(".ui-dialog")) {
            const args = shown(dialog) && argsOf(dialog);
            if (args) open.set(dialog, args);
        }
        for (const [dialog, args] of open)
            if (!shown(dialog)) {
                open.delete(dialog);
                onClose(args);
            }
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
    return () => observer.disconnect();
}

// Firefox sends a content script's own fetch as the extension; content.fetch is the page's,
// with the ERP session cookie.
const cdcPageFetch = typeof globalThis.content?.fetch === "function" ? globalThis.content.fetch.bind(globalThis.content) : fetch;

// An expired session answers any CDC URL with a redirect to the SSO login page.
async function cdcFetch(path) {
    const response = await cdcPageFetch(new URL(path, location.href).href, { credentials: "include" });
    return { signedOut: response.url.includes("/SSOAdministration/"), text: await response.text() };
}

// Feed rows: <rows><page>null</page><row id='0'><cell><![CDATA[html]]></cell>...</row></rows>.
// Each cell's HTML is parsed into its own DOMParser document, which has no browsing context:
// nothing in it runs or loads. With columns, only those cells are parsed and the rest stay null.
function cdcRows(xml, columns) {
    const parser = new DOMParser();
    const feed = parser.parseFromString(xml, "text/xml");
    if (feed.querySelector("parsererror")) return [];
    return [...feed.querySelectorAll("row")].map((row) =>
        [...row.children].map((cell, i) =>
            !columns || columns.includes(i) ? parser.parseFromString(cell.textContent, "text/html").body : null
        )
    );
}

// ERP leaves ' unescaped in a notice's <a title='...' href=...>, and the HTML parser ends the title at the first
// one. Every title has href right after it, so a title runs to its cell's last "' href='"; the quotes inside it
// become &#39;, which the parser reads back as '. Nothing else in the feed changes.
function cdcFixTitles(xml) {
    return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (cell, html) => {
        const from = html.indexOf("<a title='") + 10;
        const to = html.lastIndexOf("' href='");
        if (from < 10 || to < from) return cell;
        return `<![CDATA[${html.slice(0, from)}${html.slice(from, to).replaceAll("'", "&#39;")}${html.slice(to)}]]>`;
    });
}

// 32-bit FNV-1a over UTF-16 code units. A stored notice page keeps the hash of the feed text it came with, so a
// notice CDC edits later no longer matches and is read again.
function cdcHash(text) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, "0");
}

// A notice's own page (ShowContent.jsp): a <div> whose <br>-separated lines are <b>Type</b>, <b>Subject</b>,
// <b>Company</b>, then the notice as CDC typed it. Read as a string: the HTML parser decodes a raw &reg or &not
// in a URL's query into a symbol. Only numeric references (&#8288; before a company name) are decoded; lines stay
// otherwise raw. Blank runs become one "". null without Type or Subject.
function cdcNoticePage(html) {
    const div = /<div[^>]*>([\s\S]*?)(?:<\/div>|$)/i.exec(html);
    if (!div) return null;
    const lines = div[1].split(/<br\s*\/?>/i).map((line) => line.replace(/\r$/, "").replace(/&#(x[\da-f]+|\d+);/gi, (ref, code) => {
        const point = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
        return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ref;
    }));
    for (const field of ["Type", "Subject", "Company"]) {
        if (new RegExp(`^\\s*<b>${field}</b>`, "i").test(lines[0] ?? "")) lines.shift();
        else if (field !== "Company") return null;
    }
    const text = [];
    for (const line of lines) {
        if (line.trim()) text.push(line);
        else if (text.length && text.at(-1) !== "") text.push("");
    }
    if (text.at(-1) === "") text.pop();
    return text;
}

// ERP sends notice pages in windows-1252 (its dash is byte 0x96), and response.text() always reads UTF-8, which turns
// that byte into U+FFFD. Bytes that are valid UTF-8 are read as UTF-8.
function cdcPageText(bytes) {
    try {
        return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
        return new TextDecoder("windows-1252").decode(bytes);
    }
}

// A page line cut into text and URLs. A URL is http:// or https:// up to whitespace, kept byte for byte; a line has no
// tags or entities left to undo. Any other scheme (ftp:, javascript:) stays text.
function cdcSegments(line) {
    const parts = [];
    let from = 0;
    for (const url of line.matchAll(/https?:\/\/\S+/g)) {
        if (url.index > from) parts.push({ text: line.slice(from, url.index), url: false });
        parts.push({ text: url[0], url: true });
        from = url.index + url[0].length;
    }
    if (from < line.length) parts.push({ text: line.slice(from), url: false });
    return parts;
}

// A notice's tag from the hosts of its URLs: Form if any is a form, else Meeting, else Link; null with no URL. Good on
// the feed text too, where the next line glues onto a URL's tail but not into its host. A host counts with its subdomains.
const CDC_FORM_HOSTS = ["forms.gle", "forms.office.com", "forms.cloud.microsoft", "qualtrics.com", "vovici.com", "vovici.net"];
const CDC_MEETING_HOSTS = ["teams.microsoft.com", "teams.live.com", "meet.google.com", "zoom.us", "webex.com"];

function cdcLinkKind(text) {
    const urls = [...text.matchAll(/https?:\/\/([^\s/?#]+)(\S*)/g)].map(([, host, path]) => [host.toLowerCase(), path]);
    if (!urls.length) return null;
    const under = (host, names) => names.some((name) => host === name || host.endsWith(`.${name}`));
    if (urls.some(([host, path]) => under(host, CDC_FORM_HOSTS) || host.startsWith("survey.zohopublic.") ||
        (host === "docs.google.com" && path.startsWith("/forms")))) return "form";
    if (urls.some(([host]) => under(host, CDC_MEETING_HOSTS))) return "meeting";
    return "link";
}

// A notice's deadline: the end of the latest day (IST) its feed text names on or after the posting day, else null.
// "2nd August 2026", "15th November, 2026", "02-Aug-2026", "July 2nd", "31.07.2026", "31/07/2026". A day with no
// year is the first such day on or after posting. The feed glues the next line on, so a year may run into a word.
const CDC_MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const CDC_DATES = [
    [new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?[\\s-]*(?:of\\s+)?${CDC_MONTH}\\b[\\s,-]*(20\\d{2})?`, "gi"), (m) => [m[3], m[2], m[1]]],
    [new RegExp(`\\b${CDC_MONTH}[\\s-]*(\\d{1,2})(?:st|nd|rd|th)?\\b[\\s,]*(20\\d{2})?`, "gi"), (m) => [m[3], m[1], m[2]]],
    [/(?<!\d)(\d{1,2})[./](\d{1,2})[./](20\d{2})/g, (m) => [m[3], m[2], m[1]]],
];
const CDC_IST = 19800000;

function cdcDeadline(text, posted) {
    const dayEnd = (y, m, d) => Date.UTC(y, m - 1, d, 23, 59, 59, 999) - CDC_IST;
    const postedDay = new Date(posted + CDC_IST);
    const from = dayEnd(postedDay.getUTCFullYear(), postedDay.getUTCMonth() + 1, postedDay.getUTCDate());
    let latest = null;
    for (const [pattern, parts] of CDC_DATES) {
        for (const match of text.matchAll(pattern)) {
            const [year, month, day] = parts(match);
            const m = /^\d+$/.test(month) ? Number(month) : "janfebmaraprmayjunjulaugsepoctnovdec".indexOf(month.slice(0, 3).toLowerCase()) / 3 + 1;
            const d = Number(day);
            if (!(m >= 1 && m <= 12 && d >= 1)) continue;
            let y = Number(year) || postedDay.getUTCFullYear();
            if (!year && dayEnd(y, m, d) < from) y++;
            if (new Date(Date.UTC(y, m - 1, d)).getUTCDate() !== d) continue;
            const end = dayEnd(y, m, d);
            if (end >= from && (latest === null || end > latest)) latest = end;
        }
    }
    return latest;
}

// A form's key: host without www., path without a trailing slash, query without tracking parameters, sorted. Scheme and
// hash dropped. Reminders that only change ?usp= share a key; Microsoft Forms keep the form in ?id=, so that stays.
function cdcFormKey(url) {
    if (!URL.canParse(url)) return url.toLowerCase();
    const u = new URL(url);
    const query = [...u.searchParams].filter(([name]) => name !== "usp" && name !== "fbclid" && !name.startsWith("utm_"))
        .sort(([a, x], [b, y]) => a.localeCompare(b) || x.localeCompare(y));
    const search = new URLSearchParams(query).toString();
    return u.hostname.toLowerCase().replace(/^www\./, "") + u.pathname.replace(/\/+$/, "") + (search ? `?${search}` : "");
}

// The company a Multiple Companies line gives its form: the text before the link, less "1." or "2)" and the hyphen,
// dash or colon before the URL. Live lines carry word joiners (U+2060) round the number, which \s does not match.
// A line that names no company ("Google Form link:") gives none, so the board cannot rule its form out.
const CDC_GENERIC = new Set(["google", "microsoft", "ms", "form", "forms", "link", "here", "click", "registration", "fill", "please", "the"]);

function cdcLineCompany(before) {
    const name = before.replace(/^[\s\u2060]*\d+\s*[.)][\s\u2060]*/, "").replace(/[\s\u2060:\-\u2013\u2014]+$/, "").trim();
    return companyTokens(name).split(" ").some((word) => word && !CDC_GENERIC.has(word)) ? name : "";
}

// ERP seems to answer only the grid of the CDC page it drew last, and the browser's Back can bring a page
// out of the cache without ERP drawing it, so feed n comes back empty and so does ERP's own grid. A reload
// makes ERP draw the page. One per page a minute, per tab: an empty answer right after the reload is real
// and gets the message. Rows clear the stamp, so the next Back inside the minute reloads again.
function cdcNoRows(n, count, say) {
    const key = `autoerp-cdc-reload-${n}`;
    if (count) {
        sessionStorage.removeItem(key);
        return false;
    }
    if (Date.now() - Number(sessionStorage.getItem(key)) < 60000) say("ERP sent no rows. Reload this page.");
    else {
        sessionStorage.setItem(key, String(Date.now()));
        location.reload();
    }
    return true;
}

// ERP cells carry onclick='TPJNFView("3","171","2026-2027");'. The board rebuilds that call for
// its own buttons, so every argument has to be a plain word or the row gets no button at all.
const CDC_ARG = /^(["']?)([\w-]+)\1$/;

function cdcCall(cell, name) {
    const onclick = cell.querySelector("a")?.getAttribute("onclick") || "";
    const call = onclick.match(new RegExp(`^\\s*${name}\\((.*)\\)\\s*;?\\s*$`));
    if (!call) return null;
    const args = call[1].split(",").map((arg) => arg.trim().match(CDC_ARG));
    return args.every(Boolean) ? args.map((arg) => arg[2]) : null;
}

function cdcCallAttr(name, args) {
    return `${name}(${args.map((arg) => `'${arg}'`).join(",")})`;
}

// ERP writes times in IST with no zone: "2026-11-13 16:00" in the company grid,
// "13-11-2026 00:29" on the notice board.
function istTime(text) {
    const s = String(text).trim();
    const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);
    const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2})/);
    const [y, mo, d, h, mi] = ymd ? ymd.slice(1) : dmy ? [dmy[3], dmy[2], dmy[1], dmy[4], dmy[5]] : [];
    return y ? Date.parse(`${y}-${mo}-${d}T${h}:${mi}:00+05:30`) : NaN;
}

// CTC comes as 1815000, 18,00,000, ₹2100000, 41,786 (with USD) or free text like
// "22 LAKHS(20 LPA + 2L ONE-TIMEBONUS)", which is shown as ERP wrote it.
function ctcText(ctc, currency) {
    const text = String(ctc).trim();
    const plain = text.replace(/[₹,\s]/g, "");
    if (!/^\d+(\.\d+)?$/.test(plain)) return text;
    const amount = Number(plain);
    const short = (n) => String(Number(n.toFixed(2)));
    if (currency === "INR" && amount >= 1e7) return `${short(amount / 1e7)} Cr`;
    if (currency === "INR" && amount >= 1e5) return `${short(amount / 1e5)} L`;
    return `${amount.toLocaleString(currency === "INR" ? "en-IN" : "en-US")} ${currency}`;
}

// A search hit inside ERP text, as nodes for append(): plain strings and <mark>s filled through textContent,
// so nothing in ERP's text is ever parsed as markup. query comes lowercased. A character whose lowercase
// is longer ("İ") would shift every index after it, so such text goes unmarked.
function cdcMarked(text, query) {
    const lower = text.toLowerCase();
    if (!query || lower.length !== text.length) return [text];
    const parts = [];
    let from = 0;
    for (let at = lower.indexOf(query); at >= 0; at = lower.indexOf(query, from)) {
        const hit = document.createElement("mark");
        hit.textContent = text.slice(at, at + query.length);
        parts.push(text.slice(from, at), hit);
        from = at + query.length;
    }
    parts.push(text.slice(from));
    return parts.filter((part) => part !== "");
}

// A notice's clock times, ranges and NR/NC rooms, as measured on 1465 notices: AM/PM in any case, with or without
// dots; a range is one span ("6:00 - 7:00 PM"). A meridiem glued to the next word ("4:00 PMKindly", feed text only)
// is missed on purpose: a looser end would bold "2 AMAZON".
const CDC_MERIDIEM = String.raw`[AaPp](?:\.\s?[Mm]\.?|[Mm])(?![\p{L}\d])`;
const CDC_CLOCK = String.raw`\d{1,2}(?:[:.]\d{2})?\s*${CDC_MERIDIEM}`;
const CDC_TIME_ROOM = new RegExp(
    String.raw`(?<![\p{L}\d])(?:\d{1,2}[:.]\d{2}(?:\s*${CDC_MERIDIEM})?\s*[-–]\s*${CDC_CLOCK}|${CDC_CLOCK}|N[RC] ?\d{3}(?!\d))`,
    "gu",
);

// cdcMarked for a notice's own text: each time and room also in one <strong>, the search's <mark>s inside it where
// they overlap. <strong>, never <mark>: the board opens any notice with a mark in its text, and most have a time.
function cdcNoticeMarked(text, query) {
    const spans = [...text.matchAll(CDC_TIME_ROOM)].map((m) => [m.index, m.index + m[0].length]);
    const hits = [];
    const lower = text.toLowerCase();
    if (query && lower.length === text.length)
        for (let at = lower.indexOf(query); at >= 0; at = lower.indexOf(query, at + query.length)) hits.push([at, at + query.length]);
    const cuts = [...new Set([0, text.length, ...spans.flat(), ...hits.flat()])].sort((a, b) => a - b);
    const within = (ranges, at) => ranges.find(([from, to]) => from <= at && at < to);
    const parts = [];
    let bold, boldSpan;
    for (let i = 0; i + 1 < cuts.length; i++) {
        const piece = text.slice(cuts[i], cuts[i + 1]);
        let node = piece;
        if (within(hits, cuts[i])) {
            node = document.createElement("mark");
            node.textContent = piece;
        }
        const span = within(spans, cuts[i]);
        if (!span) {
            parts.push(node);
            continue;
        }
        if (span !== boldSpan) {
            bold = document.createElement("strong");
            boldSpan = span;
            parts.push(bold);
        }
        bold.append(node);
    }
    return parts;
}

// Company names differ between the grid and the notices ("Capgemini Technology Services India
// Limited" vs "CAPGEMINI"), so they match when one's words are a run of the other's. Whole words:
// "HP" must not match "Shopee".
const CDC_FILLER = new Set(["private", "limited", "pvt", "ltd", "inc"]);

function companyTokens(name) {
    return String(name)
        .toLowerCase()
        .replace(/&/g, " and ")
        .split(/[^a-z0-9]+/)
        .filter((word) => word && !CDC_FILLER.has(word))
        .join(" ");
}

function sameCompany(a, b) {
    const [x, y] = [companyTokens(a), companyTokens(b)];
    return Boolean(x && y) && (` ${x} `.includes(` ${y} `) || ` ${y} `.includes(` ${x} `));
}

// Whether a notice's PDF lists roll: "in", "out" (other rolls, not this one) or "none" (no rolls, no text, not
// a PDF, over 15 MB, or pdf.js could not parse it). pdf.js runs in pdf-reader.html, one hidden frame per page
// made on the first PDF; the bytes are moved there, not copied. No answer in 30 s throws while the reader has
// never answered on this page (not loaded, or blocked), so the caller stores nothing and stops: a broken reader
// never marks PDFs unreadable for good. Once it has answered, one PDF it sits on gives null, skipped by the caller.
let cdcPdfFrame;
let cdcPdfAnswered = false;

// A roll: 24AB12345, or an M.Tech one with letters in places 6-7 (24AB60R12, 24AB6RS12).
const CDC_ROLL = /^\d{2}[A-Z]{2}\d[0-9A-Z]{2}\d{2}$/;

// The verdict for a notice's own upper-cased text, with pdf-reader.js's rules: ERP runs each roll in an offer
// straight into the next name, so only a digit may touch one.
function cdcRollIn(text, roll) {
    if (new RegExp(`(?<!\\d)${roll}(?!\\d)`).test(text)) return "in";
    return /(?<!\d)\d{2}[A-Z]{2}\d[0-9A-Z]{2}\d{2}(?!\d)/.test(text) ? "out" : "none";
}

async function cdcPdfVerdict(bytes, roll) {
    if (bytes.byteLength > 15 * 1024 * 1024 || String.fromCharCode(...new Uint8Array(bytes, 0, Math.min(5, bytes.byteLength))) !== "%PDF-") return "none";
    const reader = new URL(chrome.runtime.getURL("pdf-reader.html"), location.href);
    cdcPdfFrame ??= new Promise((ok) => {
        const frame = document.createElement("iframe");
        frame.hidden = true;
        frame.style.display = "none";
        frame.onload = () => ok(frame);
        frame.src = reader.href;
        document.documentElement.append(frame);
    });
    let timer;
    const late = new Promise((ok, fail) => {
        timer = setTimeout(() => (cdcPdfAnswered ? ok(null) : fail(new Error("PDF reader did not answer"))), 30000);
    });
    const answer = cdcPdfFrame.then((frame) => new Promise((ok) => {
        const { port1, port2 } = new MessageChannel();
        port1.onmessage = ({ data }) => {
            port1.close();
            cdcPdfAnswered = true;
            ok(data);
        };
        frame.contentWindow.postMessage({ bytes, roll }, `${reader.protocol}//${reader.host}`, [port2, bytes]);
    }));
    try {
        return await Promise.race([answer, late]);
    } finally {
        clearTimeout(timer);
    }
}

// One flat card in the page's flow above ERP's grid, as wide as the window: a top line with the
// tabs and filters and, at its right end, the board's links and a small grey wordmark; then column
// headers and rows. Each board adds its own grid columns.
// Only the boards are dressed as ERP: white, zinc, the system font, light even in dark mode, since ERP's
// page stays white. These tokens come after theme.css, so the login card and feedback panel keep the
// manila look. Greys past these tokens are zinc too.
const CDC_CSS = `
    :host { all: initial; display: block; margin: 12px 7px 16px;
            --paper: #ffffff; --card: #f4f4f5; --ink: #18181b; --muted: #71717a; --line: #e4e4e7; --red: #d9381e; --on-red: #fff8ee;
            --red-text: #b42318; --red-soft: #fef3f2; --disabled: #e4e4e7; --ring: var(--ink);
            --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color-scheme: light; }
    * { box-sizing: border-box; margin: 0; }
    .card { position: relative; display: flex; flex-direction: column; gap: 10px; padding: 12px 14px 4px; border: 1px solid var(--line);
            border-radius: 6px; background: var(--paper); color: var(--ink); font: 13px/1.45 var(--font); text-align: left; }
    /* The bar's floor is its widest piece, the tab group, so in a narrow frame the head wraps under the filters
       instead of squeezing the tabs into a column. On its own line the head may still be wider than a narrow
       frame, so it wraps there too, right-aligned. */
    .top { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 12px; }
    .top > .bar { flex: 1 1 0; }
    .head { display: flex; flex-wrap: wrap; justify-content: flex-end; align-items: center; gap: 4px 12px; flex: 0 1 auto; margin-left: auto; }
    .head small { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
    .head .wordmark { height: 12px; color: #a1a1aa; }
    .head .wordmark .auto { fill: currentColor; }
    .bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chips { flex-wrap: wrap; }
    .chips button { height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--paper); color: var(--ink);
                    font: 500 13px var(--font); }
    .chips button:not(.picked):not(:disabled):hover { border-color: #d4d4d8; background: #fafafa; }
    .chips .picked { border-color: var(--ink); background: var(--ink); color: var(--paper); }
    /* On/off filters read as a checkbox, not a picked tab. */
    .chips button[aria-pressed]::before { content: ""; width: 14px; height: 14px; margin-right: 7px; border: 1px solid #d4d4d8; border-radius: 4px;
                                          background: var(--paper); }
    .chips button[aria-pressed="true"] { border-color: var(--line); background: var(--paper); color: var(--ink); }
    .chips button[aria-pressed="true"]::before { border-color: var(--ink);
        background: var(--ink) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' fill='none' stroke='white' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M2 5.2 4.2 7.4 8 2.8'/%3E%3C/svg%3E") center no-repeat; }
    .chips button:disabled, .seg button:disabled { opacity: 0.45; cursor: default; }
    .seg { display: inline-flex; gap: 2px; padding: 2px; border-radius: 6px; background: var(--card); }
    .seg button { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: none; border-radius: 6px;
                  background: none; color: var(--muted); font: 500 13px var(--font); white-space: nowrap; cursor: pointer; }
    .seg button:not(.picked):not(:disabled):hover { color: var(--ink); }
    .seg button.picked { background: var(--paper); color: var(--ink); box-shadow: 0 0 0 1px var(--line), 0 1px 2px rgba(24, 24, 27, 0.06); }
    .n, .chips .n { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 6px;
         background: rgba(24, 24, 27, 0.06); color: var(--muted); font: 500 11px var(--font); font-variant-numeric: tabular-nums; }
    .seg .picked .n { background: var(--card); color: var(--ink); }
    .chips button .n { margin-left: 6px; }
    .chips .picked .n { background: rgba(255, 255, 255, 0.2); color: var(--paper); }
    .chips button[aria-pressed="true"] .n { background: rgba(24, 24, 27, 0.06); color: var(--muted); }
    input[type="search"] { flex: 1 1 200px; min-width: 0; height: 32px; padding: 0 10px 0 30px; border: 1px solid var(--line); border-radius: 6px;
            background: var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23a1a1aa' stroke-width='1.6' stroke-linecap='round'%3E%3Ccircle cx='6' cy='6' r='4.5'/%3E%3Cpath d='M9.5 9.5 13 13'/%3E%3C/svg%3E") no-repeat 10px 50%;
            color: var(--ink); font: 400 13px var(--font); }
    input[type="search"]::placeholder { color: #a1a1aa; }
    input[type="search"]:hover { border-color: #d4d4d8; }
    input[type="search"]:focus { outline: none; border-color: #a1a1aa; box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.06); }
    input[type="search"]::-webkit-search-cancel-button { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; margin-left: 6px;
            background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23a1a1aa' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 3.5l7 7M10.5 3.5l-7 7'/%3E%3C/svg%3E") no-repeat center; cursor: pointer; }
    input[type="search"]::-webkit-search-cancel-button:hover { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%2318181b' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 3.5l7 7M10.5 3.5l-7 7'/%3E%3C/svg%3E"); }
    .link { border: none; background: none; padding: 0; color: var(--muted); font: 500 12px var(--font); cursor: pointer;
            text-decoration: underline; text-decoration-color: #d4d4d8; text-underline-offset: 2px; }
    .link:hover { color: var(--ink); }
    button:focus-visible, a:focus-visible, .notmine:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    :host([data-input="pointer"]) :focus-visible { outline: none; }
    .muted { color: var(--muted); font-size: 12px; }
    .note { border-radius: 6px; }
    .cols, ol > li { display: grid; gap: 4px 14px; align-items: center; }
    .cols { padding: 0 8px 8px; border-bottom: 1px solid var(--line); }
    .cols span { color: var(--muted); font: 600 11px var(--font); letter-spacing: 0.05em; text-transform: uppercase; }
    ol { list-style: none; padding: 0; max-height: 70vh; overflow-y: auto; }
    .cols + ol { margin-top: -10px; }
    ol > li { padding: 9px 8px; border-bottom: 1px solid #f0f0f2; }
    ol > li:hover { background: #fafafa; }
    ol > li:last-child { border-bottom: none; }
    .chip { display: inline-flex; align-items: center; justify-content: center; width: 104px; height: 24px; padding: 0 10px; border-radius: 6px;
            color: var(--muted); font: 500 12px var(--font); white-space: nowrap; }
    .chip.can { background: #ecfdf3; color: #067647; box-shadow: inset 0 0 0 1px #abefc6; }
    .chip.applied { background: var(--card); color: #3f3f46; }
    .chip.applied::before { content: "\\2713"; margin-right: 5px; font-weight: 700; }
    .chip.not, .chip.checking { color: #a1a1aa; }
    .chip.missed, .chip.closed { color: #71717a; box-shadow: inset 0 0 0 1px var(--line); }
    .chip.check { color: #52525b; box-shadow: inset 0 0 0 1px #d4d4d8; }
    .new { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 6px; flex: none;
           background: var(--red); color: var(--on-red); font: 700 10px var(--font); letter-spacing: 0.04em; }
    button.act { height: 28px; padding: 0 10px; border: 1px solid #d4d4d8; border-radius: 6px; background: var(--paper); color: var(--ink);
                 font: 500 12px var(--font); white-space: nowrap; cursor: pointer; }
    button.act:hover { border-color: #a1a1aa; background: var(--card); }
    button.act:active { transform: scale(0.98); }
    .empty { padding: 14px 8px; color: var(--muted); }
    mark { border-radius: 2px; background: #fde68a; color: inherit; }
    /* The good-luck note floats over the head, so nothing under it moves. */
    .wish { position: absolute; top: 8px; right: 8px; z-index: 1; display: grid; grid-template-columns: 1fr auto; gap: 2px 8px;
            max-width: min(320px, calc(100% - 16px)); padding: 10px 8px 10px 14px; border: 1px solid var(--line); border-radius: 6px;
            background: var(--paper); box-shadow: 0 4px 12px rgba(24, 24, 27, 0.08); animation: wish-in 160ms ease-out; transition: opacity 500ms ease; }
    .wish small { grid-column: 1; color: var(--muted); font-size: 12px; }
    .wish .x { grid-area: 1 / 2; width: 20px; height: 20px; padding: 0; border: none; border-radius: 4px; cursor: pointer;
               background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23a1a1aa' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 3.5l7 7M10.5 3.5l-7 7'/%3E%3C/svg%3E") no-repeat center; }
    .wish .x:hover { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%2318181b' stroke-width='1.6' stroke-linecap='round'%3E%3Cpath d='M3.5 3.5l7 7M10.5 3.5l-7 7'/%3E%3C/svg%3E"); }
    .wish.going { opacity: 0; }
    @keyframes wish-in { from { opacity: 0; transform: translateY(4px); } }
    @media (prefers-reduced-motion: reduce) { .wish { animation: none; transition: none; } }
    .note[hidden], [hidden] { display: none !important; }`;

// Same steps as login.js mountCard: theme.css and the wordmark come from the extension.
// html is the board's constant markup; ERP text goes in afterwards through textContent.
async function mountPanel(id, anchor, css, html) {
    const fileText = (path) => fetch(chrome.runtime.getURL(path)).then((response) => response.text());
    const parse = (markup) => new DOMParser().parseFromString(markup, "text/html").body.firstElementChild;
    const [theme, wordmark] = await Promise.all([fileText("css/theme.css"), fileText("images/wordmark.svg")]);
    const host = document.createElement("div");
    host.id = id;
    const shadow = host.attachShadow({ mode: "open" });
    for (const text of [theme, CDC_CSS, css]) {
        const style = document.createElement("style");
        style.textContent = text;
        shadow.appendChild(style);
    }
    shadow.appendChild(parse(html));
    shadow.querySelector(".head")?.append(parse(wordmark));
    // A jQuery UI dialog closing hands focus back by script, and script focus matches :focus-visible,
    // so a mouse pick would get the keyboard ring (item 8). The host remembers which input came last.
    host.addEventListener("pointerdown", () => (host.dataset.input = "pointer"), true);
    host.addEventListener("keydown", () => delete host.dataset.input, true);
    // The company page's anchor sits in a table cell only as wide as ERP's 1200px grid, so the board
    // takes the frame's width itself, the same gap on both sides, and the cell grows to hold it.
    // clientWidth leaves out a scrollbar, where 100vw would not.
    const fit = () => {
        if (!host.isConnected) return removeEventListener("resize", fit);
        const left = host.getBoundingClientRect().left + scrollX;
        host.style.width = `${document.documentElement.clientWidth - 2 * left}px`;
    };
    // The host enters ERP's page at the board's first draw, its rows or message already in it, so ERP's
    // grid moves once. Only once: a draw that comes late, after stop(), does not bring the board back.
    let placed = false;
    const show = () => {
        if (placed) return;
        placed = true;
        anchor.before(host);
        fit();
        addEventListener("resize", fit);
        cdcWish(shadow);
    };
    return { shadow, show };
}

// Placement season: the first board to draw, once per browser, wishes its reader luck. Many read it right after
// a rejection, so every line has to land on a bad day too. cdcWished stays out of the popup's CDC_KEYS: Forget keeps it.
const CDC_WISHES = [
    "KGP ka tempo high hai. All the best for your interviews and placements, junta.",
    "Load mat lo, junta. Interview mein macha dena.",
    "Interview first, Tinku at Chhedis after. All the best, junta.",
    "May your shortlists be long and your interviews short. All the best, KGP.",
    "Huhaa tempo for every round, junta. All the best for placements.",
    "Peace rakho. Your company is on its way. All the best.",
];

async function cdcWish(shadow) {
    // Turned off while the flag was read: the board is gone, so no note and no flag.
    if ((await chrome.storage.local.get("cdcWished")).cdcWished || !shadow.host.isConnected) return;
    chrome.storage.local.set({ cdcWished: true });
    const note = new DOMParser().parseFromString('<div class="wish" role="status"><p></p><small>- Ashutosh</small>' +
        '<button type="button" class="x" aria-label="Close"></button></div>', "text/html").body.firstElementChild;
    note.querySelector("p").textContent = CDC_WISHES[Math.floor(Math.random() * CDC_WISHES.length)];
    let fade, gone;
    const wait = () => {
        fade = setTimeout(() => {
            note.classList.add("going");
            gone = setTimeout(() => note.remove(), 500);
        }, 6000);
    };
    // Nobody loses it mid-read: the pointer on it holds it, even mid-fade, and leaving gives it the full 6 s again.
    note.addEventListener("pointerenter", () => {
        clearTimeout(fade);
        clearTimeout(gone);
        note.classList.remove("going");
    });
    note.addEventListener("pointerleave", wait);
    note.querySelector(".x").addEventListener("click", () => note.remove());
    shadow.querySelector(".card").append(note);
    wait();
}
