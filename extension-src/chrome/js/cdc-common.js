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
    .card { display: flex; flex-direction: column; gap: 10px; padding: 12px 14px 4px; border: 1px solid var(--line);
            border-radius: 10px; background: var(--paper); color: var(--ink); font: 13px/1.45 var(--font); text-align: left; }
    .top { display: flex; align-items: center; gap: 10px 12px; }
    .top > .bar { flex: 1 1 0; min-width: 0; }
    .head { display: flex; align-items: center; gap: 12px; flex: none; }
    .head small { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
    .head .wordmark { height: 12px; color: #a1a1aa; }
    .head .wordmark .auto { fill: currentColor; }
    .bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .chips { flex-wrap: wrap; }
    .chips button { height: 30px; padding: 0 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--paper); color: var(--ink);
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
    .seg { display: inline-flex; flex-wrap: wrap; gap: 2px; padding: 2px; border-radius: 8px; background: var(--card); }
    .seg button { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: none; border-radius: 6px;
                  background: none; color: var(--muted); font: 500 13px var(--font); white-space: nowrap; cursor: pointer; }
    .seg button:not(.picked):not(:disabled):hover { color: var(--ink); }
    .seg button.picked { background: var(--paper); color: var(--ink); box-shadow: 0 0 0 1px var(--line), 0 1px 2px rgba(24, 24, 27, 0.06); }
    .n, .chips .n { display: inline-flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; padding: 0 5px; border-radius: 5px;
         background: rgba(24, 24, 27, 0.06); color: var(--muted); font: 500 11px var(--font); font-variant-numeric: tabular-nums; }
    .seg .picked .n { background: var(--card); color: var(--ink); }
    .chips button .n { margin-left: 6px; }
    .chips .picked .n { background: rgba(255, 255, 255, 0.2); color: var(--paper); }
    .chips button[aria-pressed="true"] .n { background: rgba(24, 24, 27, 0.06); color: var(--muted); }
    input[type="search"] { flex: 1 1 200px; min-width: 0; height: 32px; padding: 0 10px 0 30px; border: 1px solid var(--line); border-radius: 8px;
            background: var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='none' stroke='%23a1a1aa' stroke-width='1.6' stroke-linecap='round'%3E%3Ccircle cx='6' cy='6' r='4.5'/%3E%3Cpath d='M9.5 9.5 13 13'/%3E%3C/svg%3E") no-repeat 10px 50%;
            color: var(--ink); font: 400 13px var(--font); }
    input[type="search"]::placeholder { color: #a1a1aa; }
    input[type="search"]:hover { border-color: #d4d4d8; }
    input[type="search"]:focus { outline: none; border-color: #a1a1aa; box-shadow: 0 0 0 3px rgba(24, 24, 27, 0.06); }
    .link { border: none; background: none; padding: 0; color: var(--muted); font: 500 12px var(--font); cursor: pointer;
            text-decoration: underline; text-decoration-color: #d4d4d8; text-underline-offset: 2px; }
    .link:hover { color: var(--ink); }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    :host([data-input="pointer"]) :focus-visible { outline: none; }
    .muted { color: var(--muted); font-size: 12px; }
    .note { border-radius: 8px; }
    .cols, ol > li { display: grid; gap: 4px 14px; align-items: center; }
    .cols { padding: 0 8px 8px; border-bottom: 1px solid var(--line); }
    .cols span { color: var(--muted); font: 600 11px var(--font); letter-spacing: 0.05em; text-transform: uppercase; }
    ol { list-style: none; padding: 0; max-height: 70vh; overflow-y: auto; }
    .cols + ol { margin-top: -10px; }
    ol > li { padding: 9px 8px; border-bottom: 1px solid #f0f0f2; }
    ol > li:hover { background: #fafafa; }
    ol > li:last-child { border-bottom: none; }
    .chip { display: inline-flex; align-items: center; justify-content: center; width: 84px; height: 22px; padding: 0 4px; border-radius: 6px;
            color: var(--muted); font: 500 12px var(--font); white-space: nowrap; }
    .chip.can { background: #ecfdf3; color: #067647; box-shadow: inset 0 0 0 1px #abefc6; }
    .chip.applied { background: var(--card); color: #3f3f46; }
    .chip.applied::before { content: "\\2713"; margin-right: 5px; font-weight: 700; }
    .chip.not, .chip.checking { color: #a1a1aa; }
    .chip.check { color: #52525b; box-shadow: inset 0 0 0 1px #d4d4d8; }
    .new { display: inline-flex; align-items: center; height: 16px; padding: 0 5px; border-radius: 4px; flex: none;
           background: var(--red); color: var(--on-red); font: 700 10px var(--font); letter-spacing: 0.04em; }
    button.act { height: 28px; padding: 0 10px; border: 1px solid #d4d4d8; border-radius: 8px; background: var(--paper); color: var(--ink);
                 font: 500 12px var(--font); white-space: nowrap; cursor: pointer; }
    button.act:hover { border-color: #a1a1aa; background: var(--card); }
    button.act:active { transform: scale(0.98); }
    .empty { padding: 14px 8px; color: var(--muted); }
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
    };
    return { shadow, show };
}
