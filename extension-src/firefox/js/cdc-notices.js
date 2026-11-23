// Notice board on CDC's Notice.jsp, above ERP's own grid (#grid54), which stays as it is.
// Rows come from the grid's feed (jqqueryid=54, every notice of the year in one 2 MB answer,
// newest first). Cells 5 (coordinators' rolls), 8 (Upload) and 9 (Deactivate) are never parsed.
// Attachments are read for my roll (cdcRoll from the company board, else the login roll) in pdf-reader.html,
// three at a time, every unread one on open, newest first, the ones the search or filter shows before the rest.
// Only the verdict is kept. Each notice's own page (ShowContent.jsp, what ViewNotice opens) is read the same way, three
// more at a time, and kept as its lines (cdcNotes); a row shows the feed text until its page is in.
cdcSwitch(async (wanted) => {
    const anchor = await cdcAnchor(54);
    if (!wanted() || !anchor || document.getElementById("autoerp-cdc")) return;

    const CSS = `
        .cols, ol > li { grid-template-columns: 100px 120px minmax(0, 1fr) 96px; grid-template-areas: "when cat body act"; align-items: start; }
        .when { grid-area: when; }
        .cat { grid-area: cat; display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 0; }
        .body { grid-area: body; display: flex; flex-direction: column; align-items: flex-start; gap: 3px; min-width: 0; }
        .act { grid-area: act; justify-self: end; }
        li .when { padding-top: 2px; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; }
        .tag { display: inline-block; max-width: 100%; height: 20px; padding: 0 8px; border-radius: 6px; background: #e4e4e7; color: var(--ink);
               font: 600 11px/20px var(--font); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .line { display: flex; align-items: center; gap: 8px; }
        .line .tag { flex: none; }
        .tag.pdf-in { background: #067647; color: #fff; }
        .tag.pdf-out, .notmine.out { background: #71717a; color: #fff; }
        .tag.kind { background: #d4d4d8; color: var(--ink); }
        .due { flex: none; color: var(--muted); font-size: 11px; white-space: nowrap; }
        .due.today { color: var(--red-text); }
        .notmine { display: inline-block; margin-left: 4px; padding: 0 6px; border-radius: 6px; background: #e4e4e7; color: #52525b;
                   font: 600 11px/18px var(--font); white-space: nowrap; vertical-align: 1px; }
        /* Inline-block, not flex: the line then takes the button's baseline from its text, not from the empty circle. */
        button.filled { margin-left: 2px; padding: 0 2px; border: none; background: none; color: var(--muted); font: 500 12px/1 var(--font); cursor: pointer; }
        button.filled::before { content: ""; display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box; width: 15px; height: 15px;
                                margin-right: 5px; vertical-align: middle; border: 1.5px solid #a1a1aa; border-radius: 50%; color: #fff; font: 700 10px/1 var(--font); }
        button.filled:hover::before { border-color: #067647; }
        button.filled[aria-pressed="true"] { color: #067647; }
        button.filled[aria-pressed="true"]::before { content: "\\2713"; border-color: #067647; background: #067647; }
        .subject { font-weight: 600; }
        .text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; overflow: hidden; color: #3f3f46; font-size: 13px;
                white-space: pre-line; overflow-wrap: anywhere; }
        .text.full { display: block; }
        .text .ln { display: block; }
        .text .gap { display: block; height: 6px; }
        .text a { color: #2563eb; text-decoration-color: #93c5fd; text-underline-offset: 2px; }
        .text a:hover { color: #1d4ed8; text-decoration-color: currentColor; }
        #cats button { height: 26px; padding: 0 9px; border-radius: 6px; font-size: 12px; }
        /* Red only for urgency: under-6h deadlines, NEW and Urgent notices. */
        #cats button[data-cat="Urgent"]:not(.picked) { border-color: #fecdca; background: #fef3f2; color: var(--red-text); }
        .tag[data-cat="Urgent"] { background: var(--red); color: var(--on-red); }
        @media (max-width: 760px) {
            .cols { display: none; }
            .cols + ol { margin-top: 0; }
            ol > li { grid-template-columns: auto minmax(0, 1fr) auto; grid-template-areas: "when cat act" "body body act"; }
            .cat { flex-direction: row; align-items: center; }
        }`;

    // #back is how ERP itself moves between the two pages, a relative link in the same frame. A fresh load,
    // not history.back(): ERP answers one grid query per session, and the company page re-registers its own.
    const HTML = `
        <section class="card" aria-label="AutoERP notice board">
            <div class="top">
                <div class="bar">
                    <input type="search" id="search" placeholder="Search notices" aria-label="Search notices">
                    <div class="seg" role="tablist">
                        <button id="type-all" class="picked">All<span class="n">0</span></button>
                        <button id="type-placement">Placement<span class="n">0</span></button>
                        <button id="type-internship">Internship<span class="n">0</span></button>
                    </div>
                    <div class="chips">
                        <button id="mine" aria-pressed="false">My companies</button>
                        <button id="newonly" aria-pressed="false">New<span class="n">0</span></button>
                        <button id="withme" aria-pressed="false" disabled>Lists with me<span class="n">0</span></button>
                        <button id="tofill" aria-pressed="false" disabled>Forms to fill<span class="n">0</span></button>
                    </div>
                    <span class="muted" id="mine-why" hidden>Open the company page first</span>
                    <span class="muted" id="pdf-why" hidden>Open the company page once so AutoERP knows your roll number.</span>
                </div>
                <div class="head">
                    <small id="count"></small>
                    <a class="link" id="back" href="TPStudent.jsp">Back to company board</a>
                </div>
            </div>
            <div class="bar chips" id="cats"><button data-cat="" class="picked">All</button></div>
            <p class="note err" id="msg" role="status" aria-live="polite" hidden></p>
            <div class="cols" aria-hidden="true"><span class="when">Posted</span><span class="cat">Category</span><span class="body">Company and notice</span><span class="act"></span></div>
            <ol id="notices"></ol>
            <p class="empty" id="none" hidden>No notices here.</p>
        </section>`;

    // Forget pressed while the feed loads: the snapshot below predates it, and forget() is not attached yet.
    let forgotEarly = false;
    const early = (changes, area) => {
        if (area === "local" && ["cdcPdf", "cdcLastNotice", "cdcNotes"].some((k) => k in changes && !("newValue" in changes[k]))) forgotEarly = true;
    };
    chrome.storage.onChanged.addListener(early);
    const [{ shadow, show }, feed, stored] = await Promise.all([
        mountPanel("autoerp-cdc", anchor, CSS, HTML),
        cdcFetch("ERPMonitoring.htm?action=fetchData&jqqueryid=54").catch(() => null),
        chrome.storage.local.get(["cdcApplied", "cdcLastNotice", "cdcRoll", "login", "cdcPdf", "cdcNotes", "cdcFilled", "cdcCompanies", "cdcCompaniesAt"]),
    ]);
    chrome.storage.onChanged.removeListener(early);
    if (forgotEarly)
        for (const k of ["cdcSeen", "cdcJnf", "cdcApplied", "cdcLastNotice", "cdcRoll", "cdcPdf", "cdcNotes", "cdcFilled", "cdcCompanies", "cdcCompaniesAt"]) delete stored[k];
    const $ = (id) => shadow.getElementById(id);
    const stop = () => {
        chrome.storage.onChanged.removeListener(forget);
        chrome.storage.onChanged.removeListener(marksChanged);
        shadow.host.remove();
    };
    if (!wanted()) return stop;

    function say(text) {
        show();
        $("msg").hidden = !text;
        $("msg").textContent = text;
    }

    if (!feed) {
        say("Could not reach ERP. Reload this page.");
        return stop;
    }
    if (feed.signedOut) {
        say("Signed out of ERP.");
        return stop;
    }
    const last = stored.cdcLastNotice;
    const notices = cdcRows(cdcFixTitles(feed.text), [0, 1, 2, 3, 4, 6, 7]).map((cells) => {
        const serial = Number(cells[0]?.textContent);
        const subject = cells[3]?.textContent.trim() || "";
        const text = cells[4]?.querySelector("a")?.getAttribute("title") || cells[4]?.textContent.trim() || "";
        const download = cells[7]?.querySelector("a")?.textContent.trim() === "Download";
        const kind = cdcLinkKind(text);
        return {
            serial,
            type: cells[1]?.textContent.trim() || "",
            category: cells[2]?.textContent.trim() || "",
            subject,
            text,
            posted: istTime(cells[6]?.textContent || ""),
            attach: download ? cdcCall(cells[7], "TPNotice") : null,
            view: cdcCall(cells[4], "ViewNotice"),
            feedHash: cdcHash(text),
            lines: null,
            isNew: typeof last === "number" && serial > last,
            kind,
            hay: `${subject} ${text}${kind ? ` ${kind}` : ""}`.toLowerCase(),
        };
    });
    if (cdcNoRows(54, notices.length, say)) return stop;

    const newest = Math.max(...notices.map((n) => n.serial).filter(Number.isFinite));
    if (Number.isFinite(newest)) await chrome.storage.local.set({ cdcLastNotice: newest });
    const applied = stored.cdcApplied || [];
    const mineSet = new Set(notices.filter((n) => applied.some((name) => sameCompany(n.subject, name))));
    const newCount = notices.filter((n) => n.isNew).length;
    $("mine").disabled = !applied.length;
    if (stored.cdcApplied) $("mine-why").textContent = "You have not applied to any company yet";
    $("newonly").disabled = !newCount;
    $("newonly").lastChild.textContent = newCount;

    const roll = [stored.cdcRoll, stored.login?.roll].find((r) => CDC_ROLL.test(r));
    // Never on the company page and no roll: the roll hint says the same thing, and it takes this spot.
    $("mine-why").hidden = applied.length > 0 || (!stored.cdcApplied && !roll);
    const pdfKey = (n) => n.attach?.join(":");
    // Read for one roll: another account's roll starts over. Pruned to the feed's attachments, as cdcJnf is.
    // Every write stores this whole object, so three readers finishing together never drop each other's verdicts.
    const saved = roll && stored.cdcPdf?.roll === roll ? stored.cdcPdf.verdicts : {};
    const verdicts = {};
    if (roll)
        for (const n of notices) {
            const v = saved[pdfKey(n)];
            if (v === "in" || v === "out" || v === "none") verdicts[pdfKey(n)] = v;
        }
    // Each page's lines are kept with the hash of the feed text they came with: a notice CDC edited since no longer
    // matches, so it shows its new feed text and is read again. Pruned to the feed's notices, as cdcPdf is.
    const noteKey = (n) => n.view.join(":");
    const noteTexts = {};
    for (const n of notices) {
        const entry = n.view && stored.cdcNotes?.[noteKey(n)];
        if (!Array.isArray(entry)) continue;
        noteTexts[noteKey(n)] = entry;
        if (entry[0] === n.feedHash) n.lines = entry[1] ? entry[1].split("\n") : [];
    }
    // A form is its link's key (cdcFormKey), so a reposted notice and its follow-up are one form. A notice holds each of
    // its forms once per company, in page order: the subject's, or in a Multiple Companies notice the line's, null when
    // the line names none. The same link on two lines is one form for both companies; keeping the first line's company
    // would call it Not eligible by the other one's. Before the page is read a form-kind notice stands alone under its
    // serial: no ViewNotice means no noteKey, and the key is never stored.
    const formsOf = (n) => {
        if (!n.lines) return n.kind === "form" ? [{ key: `#${n.serial}`, company: null }] : [];
        const multi = /^multiple companies$/i.test(n.subject);
        const pairs = new Map();
        for (const line of n.lines) {
            const parts = cdcSegments(line);
            parts.forEach((part, i) => {
                if (!part.url || cdcLinkKind(part.text) !== "form") return;
                const key = cdcFormKey(part.text);
                const company = multi ? cdcLineCompany(parts[i - 1]?.text ?? "") || null : n.subject;
                pairs.set(JSON.stringify([key, company]), { key, company });
            });
        }
        return [...pairs.values()];
    };
    for (const n of notices) n.forms = formsOf(n);
    let filled = new Set(stored.cdcFilled || []);
    let companyStates = stored.cdcCompanies;
    let companiesAt = stored.cdcCompaniesAt;
    const istDay = (ms) => Math.floor((ms + 198e5) / 864e5);
    const stateMemo = new Map();
    let forms = new Map();
    // The feed is newest first, so a form's first notice is its newest. It is open until its latest date, or two weeks
    // after it was first posted when no notice gives one; the last day counts in full.
    function mapForms() {
        forms = new Map();
        for (const n of notices) {
            if (!n.forms.length) continue;
            n.due ??= cdcDeadline(n.text, n.posted);
            for (const { key, company } of n.forms) {
                const f = forms.get(key) || { notices: [], companies: new Set(), deadline: null, open: false };
                forms.set(key, f);
                if (f.notices.at(-1) !== n) f.notices.push(n);
                f.companies.add(company);
                if (n.due !== null && (f.deadline === null || n.due > f.deadline)) f.deadline = n.due;
            }
        }
        for (const f of forms.values()) f.open = Date.now() <= (f.deadline ?? f.notices[0].posted + 14 * 864e5);
    }
    mapForms();
    const isOpenToFill = (key) => forms.get(key).open && !filled.has(key) && !notMine(key);
    // A notice is on the Forms to fill list when it is the newest notice of a form still to fill.
    const qualifies = (n) => n.forms.some(({ key }) => isOpenToFill(key) && forms.get(key).notices[0] === n);

    let notesTimer = null;
    let notesDirty = false;
    let forgot = forgotEarly;
    // Forget CDC data in the popup with this tab open: a read in flight would write the verdicts back. Before the
    // first verdict there is no cdcPdf to remove, but cdcLastNotice was set above.
    function forget(changes, area) {
        if (area !== "local" || !["cdcPdf", "cdcLastNotice", "cdcNotes"].some((k) => k in changes && !("newValue" in changes[k]))) return;
        forgot = true;
        clearTimeout(notesTimer);
        for (const k in verdicts) delete verdicts[k];
        for (const k in noteTexts) delete noteTexts[k];
    }
    chrome.storage.onChanged.addListener(forget);
    // Another tab's mark, the company board, or Forget in the popup (no newValue: none filled, no board). This tab's own
    // marks echo back as the same set, and the company board writes its map on every visit.
    function marksChanged(changes, area) {
        if (area !== "local") return;
        let changed = false;
        if ("cdcFilled" in changes) {
            const next = changes.cdcFilled.newValue || [];
            if (next.length !== filled.size || !next.every((k) => filled.has(k))) {
                filled = new Set(next);
                changed = true;
            }
        }
        if ("cdcCompanies" in changes && JSON.stringify(changes.cdcCompanies.newValue) !== JSON.stringify(companyStates)) {
            companyStates = changes.cdcCompanies.newValue;
            stateMemo.clear();
            changed = true;
        }
        if ("cdcCompaniesAt" in changes) {
            changed ||= istDay(changes.cdcCompaniesAt.newValue) !== istDay(companiesAt);
            companiesAt = changes.cdcCompaniesAt.newValue;
        }
        if (changed) refreshMarks();
    }
    chrome.storage.onChanged.addListener(marksChanged);
    if (roll && stored.cdcPdf && (stored.cdcPdf.roll !== roll || Object.keys(verdicts).length < Object.keys(saved).length))
        await chrome.storage.local.set({ cdcPdf: { roll, verdicts } });
    if (stored.cdcNotes && !forgot && Object.keys(noteTexts).length < Object.keys(stored.cdcNotes).length)
        await chrome.storage.local.set({ cdcNotes: noteTexts });
    if (!wanted()) return stop;
    $("pdf-why").hidden = Boolean(roll);
    // The text's verdict is worked out on every visit and never stored; cdcPdf holds the PDFs' only.
    const textVerdicts = new Map(roll ? notices.map((n) => [n, cdcRollIn(n.text.toUpperCase(), roll)]) : []);
    const listing = (n) => {
        const both = [verdicts[pdfKey(n)], textVerdicts.get(n)];
        return both.includes("in") ? "in" : both.includes("out") ? "out" : "none";
    };

    // Whose form it is: not mine when every notice carrying it has a list that leaves me out, or when every company it is
    // for reads missed, not eligible or closed on the company board. A list that has me keeps it mine whatever the board
    // says, and so does a form posted on or after the IST day I last opened the company page, which may not know its
    // company yet. A company's state is the best over the board names sameCompany matches; one the board does not know,
    // or no company, keeps the form mine. Each name is matched once until the board changes, since every keystroke asks
    // for every form and the board has about a hundred names.
    const ORDER = ["applied", "can", "check", "missed", "not", "closed"];
    const GONE = { missed: "Missed", not: "Not eligible", closed: "Not applied" };
    function stateOf(name) {
        if (!stateMemo.has(name)) {
            const at = Object.entries(companyStates).filter(([board]) => sameCompany(name, board)).map(([, state]) => state);
            stateMemo.set(name, ORDER.find((s) => at.includes(s)));
        }
        return stateMemo.get(name);
    }
    function notMine(key) {
        const f = forms.get(key);
        const lists = f.notices.map(listing);
        if (lists.includes("in")) return null;
        if (lists.every((l) => l === "out")) return "Not in this list";
        if (!companyStates || istDay(f.notices[0].posted) >= istDay(companiesAt)) return null;
        const states = [...f.companies].map((name) => name && stateOf(name));
        return states.every((s) => GONE[s]) ? GONE[ORDER.find((s) => states.includes(s))] : null;
    }

    for (const t of ["placement", "internship"]) $(`type-${t}`).disabled = !notices.some((n) => n.type === t.toUpperCase());
    const categories = [...new Set(notices.map((n) => n.category).filter(Boolean))].sort();
    for (const name of categories) {
        const chip = document.createElement("button");
        chip.dataset.cat = name;
        chip.textContent = name;
        $("cats").append(chip);
    }

    let type = "all";
    let category = "";
    let mine = false;
    let newOnly = false;
    let withMe = false;
    let toFill = false;
    let query = "";
    let reading = null;
    let notesRun = null;
    let filtered = [];
    let shown = 0;
    const BATCH = 100;
    const KIND_WORD = { form: "Form", meeting: "Meeting", link: "Link" };
    const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const span = (cls, text) => {
        const el = document.createElement("span");
        el.className = cls;
        el.textContent = text;
        return el;
    };

    // The nearest latest date among the notice's forms still to fill, on every notice of them; red on its last day (IST).
    function dueSpan(n) {
        const dates = n.forms.filter(({ key }) => isOpenToFill(key)).map(({ key }) => forms.get(key).deadline).filter((d) => d !== null);
        if (!dates.length) return null;
        const deadline = Math.min(...dates);
        const d = new Date(deadline + CDC_IST);
        const el = span("due", `by ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`);
        if (Math.floor((deadline + CDC_IST) / 864e5) === Math.floor((Date.now() + CDC_IST) / 864e5)) el.classList.add("today");
        return el;
    }

    function item(n) {
        const li = document.createElement("li");
        li.dataset.serial = String(n.serial);
        const when = isNaN(n.posted)
            ? ""
            : new Date(n.posted).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
        const cat = document.createElement("div");
        cat.className = "cat";
        const tag = span("tag", n.category);
        tag.dataset.cat = n.category;
        cat.append(tag, span("muted", n.type === "INTERNSHIP" ? "Internship" : "Placement"));
        const body = document.createElement("div");
        body.className = "body";
        const line = document.createElement("p");
        line.className = "line";
        const subject = span("subject", "");
        subject.append(...cdcMarked(n.subject, query));
        line.append(subject);
        if (n.isNew) line.append(span("new", "NEW"));
        if (n.kind) {
            const kind = span("tag kind", KIND_WORD[n.kind]);
            kind.dataset.kind = n.kind;
            line.append(kind);
        }
        const due = dueSpan(n);
        if (due) line.append(due);
        const listed = pdfTag(listing(n));
        if (listed) line.append(listed);
        const text = document.createElement("p");
        text.className = "text";
        text.append(...(n.lines ? formatText(n) : cdcMarked(n.text, query)));
        const more = document.createElement("button");
        more.className = "link more";
        more.textContent = "more";
        more.hidden = true;
        more.addEventListener("click", () => {
            more.textContent = text.classList.toggle("full") ? "less" : "more";
        });
        body.append(line, text, more);
        let attach = span("act", "");
        if (n.attach) {
            attach = document.createElement("button");
            attach.className = "act attach";
            attach.textContent = "Attachment";
            // Runs ERP's own TPNotice in the page, the same file dialog its grid opens.
            attach.setAttribute("onclick", cdcCallAttr("TPNotice", n.attach));
        }
        li.append(span("when", when), cat, body, attach);
        return li;
    }

    // A page's lines: a block per line, one small gap per blank run, its URLs as links opening in a new tab, a mark after
    // every form link (the same form twice is one state), the search marked inside text and links alike.
    function formatText(n) {
        return n.lines.map((line) => {
            if (!line) return span("gap", "");
            const ln = span("ln", "");
            for (const part of cdcSegments(line)) {
                if (!part.url) {
                    ln.append(...cdcMarked(part.text, query));
                    continue;
                }
                const link = document.createElement("a");
                link.href = part.text;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.append(...cdcMarked(part.text, query));
                ln.append(link);
                if (cdcLinkKind(part.text) === "form") ln.append(mark(cdcFormKey(part.text)));
            }
            return ln;
        });
    }

    // Mark filled, or the reason the form is not mine in its place. A form I marked filled keeps its button whatever the
    // company board says, so the mark can be undone.
    function mark(key) {
        const why = !filled.has(key) && notMine(key);
        if (why) {
            const label = span(why === "Not in this list" ? "notmine out" : "notmine", why);
            label.dataset.form = key;
            return label;
        }
        const button = document.createElement("button");
        button.className = "filled";
        button.dataset.form = key;
        setFilled(button, filled.has(key));
        return button;
    }

    function setFilled(button, on) {
        button.textContent = on ? "Filled" : "Mark filled";
        button.setAttribute("aria-pressed", String(on));
    }

    function showFormState() {
        const count = [...forms.keys()].filter(isOpenToFill).length;
        $("tofill").lastChild.textContent = count;
        $("tofill").disabled = !count && !toFill;
    }

    // A mark, another tab, the company board, or a page or PDF landing: every shown row follows in place. With the chip on, rows that stopped
    // qualifying are taken out where they stand; one that started to, or an emptied list, goes through render().
    function refreshMarks() {
        showFormState();
        if (toFill) {
            const want = new Set(visible());
            const have = new Set(filtered);
            if (!want.size || [...want].some((n) => !have.has(n))) return render();
            for (const li of [...$("notices").children])
                if (!want.has(byRow(li))) {
                    li.remove();
                    shown--;
                }
            filtered = filtered.filter((n) => want.has(n));
            showTypeCounts();
            showCount();
        }
        for (const li of $("notices").children) {
            const n = byRow(li);
            // A button stays the same node, so focus stays on the one just pressed; a label swaps only when its text changes.
            for (const el of li.querySelectorAll("[data-form]")) {
                const next = mark(el.dataset.form);
                if (el.tagName === "BUTTON" && next.tagName === "BUTTON") setFilled(el, filled.has(el.dataset.form));
                else if (el.textContent !== next.textContent) el.replaceWith(next);
            }
            li.querySelector(".due")?.remove();
            const due = dueSpan(n);
            const line = li.querySelector(".line");
            if (due) line.insertBefore(due, line.querySelector(".pdf-in, .pdf-out"));
        }
    }

    function pdfTag(verdict) {
        if (verdict === "in") return span("tag pdf-in", "You're in this list");
        if (verdict === "out") return span("tag pdf-out", "Not in this list");
    }

    function more() {
        const batch = filtered.slice(shown, shown + BATCH).map(item);
        shown += batch.length;
        $("notices").append(...batch);
        // All reads, then all writes, so the batch costs one layout and not a hundred. A notice the search
        // hits in its text opens, measured while still clamped so "less" shows only where there is more.
        const clamped = batch.map((li) => {
            const text = li.querySelector(".text");
            return text.scrollHeight > text.clientHeight + 1;
        });
        batch.forEach((li, i) => {
            const open = li.querySelector(".text").classList.toggle("full", toFill || Boolean(li.querySelector(".text mark")));
            li.querySelector(".more").textContent = open ? "less" : "more";
            li.querySelector(".more").hidden = !clamped[i];
        });
    }

    function showCount() {
        const runs = [
            notesRun && `notices ${Math.min(notesRun.done + 1, notesRun.total)} of ${notesRun.total}`,
            reading && `PDFs ${Math.min(reading.done + 1, reading.total)} of ${reading.total}`,
        ].filter(Boolean);
        $("count").textContent = runs.length
            ? `Reading ${runs.join(", ")}`
            : filtered.length === notices.length
              ? `${notices.length} notices`
              : `${filtered.length} of ${notices.length} notices`;
    }

    function showPdfState() {
        const withMeCount = notices.filter((n) => listing(n) === "in").length;
        $("withme").lastChild.textContent = withMeCount;
        $("withme").disabled = !withMeCount;
    }

    // Signed out stops the run, as the feed does; a network or HTTP error skips that one, so it is tried
    // on the next visit. A reader that never answers stops the run with nothing stored; a PDF it hangs on is
    // skipped, stored as nothing, and the rest are read. Each reader takes the
    // newest unread notice the search and filters show, and only when they show none, the newest of the rest.
    async function readPdfs() {
        const unread = new Set(notices.filter((n) => n.attach && !(pdfKey(n) in verdicts)));
        if (!unread.size) return;
        reading = { done: 0, total: unread.size };
        showCount();
        showPdfState();
        let halt = false;
        async function readOne(n) {
            const [year, id] = n.attach;
            const url = new URL(`AdmFilePDF.htm?type=NOTICE&year=${encodeURIComponent(year)}&id=${encodeURIComponent(id)}`, location.href).href;
            let bytes;
            try {
                const response = await cdcPageFetch(url, { credentials: "include" });
                if (response.url.includes("/SSOAdministration/")) {
                    halt = true;
                    if (wanted()) say("Signed out of ERP.");
                    return;
                }
                if (!response.ok) return;
                bytes = await response.arrayBuffer();
            } catch {
                return;
            }
            let verdict;
            try {
                verdict = await cdcPdfVerdict(bytes, roll);
            } catch {
                halt = true;
                return;
            }
            if (!verdict || forgot || !wanted()) return;
            verdicts[pdfKey(n)] = verdict;
            chrome.storage.local.set({ cdcPdf: { roll, verdicts } });
            const listed = pdfTag(listing(n));
            const line = [...$("notices").children].find((el) => el.dataset.serial === String(n.serial))?.querySelector(".line");
            line?.querySelector(".pdf-in, .pdf-out")?.remove();
            if (listed && line) line.append(listed);
            if (n.forms.length) refreshMarks();
            showPdfState();
        }
        const worker = async () => {
            while (!halt && !forgot && wanted() && unread.size) {
                const n = filtered.find((x) => unread.has(x)) ?? unread.values().next().value;
                unread.delete(n);
                await readOne(n);
                reading.done++;
                showCount();
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        reading = null;
        if (!wanted()) return;
        showCount();
        showPdfState();
    }

    // The whole map in each write, at most one every 2 s while pages arrive and one when the run ends; none after Forget
    // or the switch going off.
    function writeNotes() {
        clearTimeout(notesTimer);
        notesTimer = null;
        if (!notesDirty || forgot || !wanted()) return;
        notesDirty = false;
        chrome.storage.local.set({ cdcNotes: noteTexts });
    }

    // The row keeps its open or closed state; "more" shows only where the new lines overflow the clamp.
    function swapText(n) {
        const li = [...$("notices").children].find((el) => el.dataset.serial === String(n.serial));
        if (!li) return;
        const text = li.querySelector(".text");
        const open = text.classList.contains("full");
        text.classList.remove("full");
        text.replaceChildren(...formatText(n));
        li.querySelector(".more").hidden = text.scrollHeight <= text.clientHeight + 1;
        text.classList.toggle("full", open);
    }

    // In readPdfs' order and with its rules for signed out and errors. A page with no Type or Subject line is skipped
    // and read again next visit; three of those in a row (as they arrive) mean ERP changed its page, and the run stops:
    // stopping at the first would stop at that notice every visit, and nothing after it would ever be read.
    async function readNotes() {
        const unread = new Set(notices.filter((n) => n.view && !n.lines));
        if (!unread.size) return;
        notesRun = { done: 0, total: unread.size };
        showCount();
        let halt = false;
        let odd = 0;
        async function readOne(n) {
            const [year, id] = n.view;
            const url = new URL(`ShowContent.jsp?year=${encodeURIComponent(year)}&id=${encodeURIComponent(id)}`, location.href).href;
            let html;
            try {
                const response = await cdcPageFetch(url, { credentials: "include" });
                if (response.url.includes("/SSOAdministration/")) {
                    if (!halt && wanted()) say("Signed out of ERP.");
                    halt = true;
                    return;
                }
                if (!response.ok) return;
                html = cdcPageText(await response.arrayBuffer());
            } catch {
                return;
            }
            const lines = cdcNoticePage(html);
            if (!lines) {
                if (++odd >= 3) halt = true;
                return;
            }
            odd = 0;
            if (forgot || !wanted()) return;
            const was = n.forms;
            n.lines = lines;
            n.forms = formsOf(n);
            noteTexts[noteKey(n)] = [n.feedHash, lines.join("\n")];
            notesDirty = true;
            notesTimer ??= setTimeout(writeNotes, 2000);
            // The new lines' marks look their forms up, so the map comes first.
            const remap = was.length > 0 || n.forms.length > 0;
            if (remap) mapForms();
            swapText(n);
            if (remap) refreshMarks();
        }
        const worker = async () => {
            while (!halt && !forgot && wanted() && unread.size) {
                // Then the open forms: the chip and "Mark filled" are only as good as the pages behind them.
                const n =
                    filtered.find((x) => unread.has(x)) ??
                    notices.find((x) => unread.has(x) && x.forms.some(({ key }) => forms.get(key).open)) ??
                    unread.values().next().value;
                unread.delete(n);
                await readOne(n);
                notesRun.done++;
                showCount();
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        notesRun = null;
        writeNotes();
        if (wanted()) showCount();
    }

    // Every filter but the type tabs, whose counts follow the rest like the company tabs follow the search.
    const unTyped = () =>
        notices.filter(
            (n) =>
                (!category || n.category === category) &&
                (!mine || mineSet.has(n)) &&
                (!newOnly || n.isNew) &&
                (!withMe || listing(n) === "in") &&
                (!toFill || qualifies(n)) &&
                (!query || n.hay.includes(query))
        );
    const visible = () => unTyped().filter((n) => type === "all" || n.type === type.toUpperCase());
    const rowMap = new Map(notices.map((n) => [String(n.serial), n]));
    const byRow = (li) => rowMap.get(li.dataset.serial);

    function showTypeCounts() {
        const others = unTyped();
        for (const t of ["all", "placement", "internship"])
            $(`type-${t}`).lastChild.textContent = others.filter((n) => t === "all" || n.type === t.toUpperCase()).length;
    }

    function render() {
        // In the page before more() measures which notices are clamped.
        show();
        query = $("search").value.trim().toLowerCase();
        filtered = visible();
        showTypeCounts();
        showCount();
        for (const t of ["all", "placement", "internship"]) $(`type-${t}`).classList.toggle("picked", t === type);
        for (const chip of $("cats").children) chip.classList.toggle("picked", chip.dataset.cat === category);
        for (const [id, on] of [["mine", mine], ["newonly", newOnly], ["withme", withMe], ["tofill", toFill]]) {
            $(id).classList.toggle("picked", on);
            $(id).setAttribute("aria-pressed", String(on));
        }
        $("notices").replaceChildren();
        $("notices").scrollTop = 0;
        shown = 0;
        more();
        $("none").hidden = filtered.length > 0;
        showFormState();
    }

    $("notices").addEventListener("scroll", () => {
        const list = $("notices");
        if (shown < filtered.length && list.scrollTop + list.clientHeight >= list.scrollHeight - 400) more();
    });
    $("search").addEventListener("input", render);
    for (const t of ["all", "placement", "internship"])
        $(`type-${t}`).addEventListener("click", () => {
            type = t;
            render();
        });
    $("cats").addEventListener("click", (event) => {
        const chip = event.target.closest("button");
        if (!chip) return;
        category = chip.dataset.cat;
        render();
    });
    $("mine").addEventListener("click", () => {
        mine = !mine;
        render();
    });
    $("newonly").addEventListener("click", () => {
        newOnly = !newOnly;
        render();
    });
    $("withme").addEventListener("click", () => {
        withMe = !withMe;
        render();
    });

    $("tofill").addEventListener("click", () => {
        toFill = !toFill;
        render();
    });
    // The state is the stored set read fresh, so a mark made in another tab a moment ago is not lost.
    $("notices").addEventListener("click", async (event) => {
        const button = event.target.closest("button.filled");
        if (!button) return;
        const key = button.dataset.form;
        const on = !filled.has(key);
        const next = new Set((await chrome.storage.local.get("cdcFilled")).cdcFilled || []);
        if (on) next.add(key);
        else next.delete(key);
        await chrome.storage.local.set({ cdcFilled: [...next] });
        filled = next;
        refreshMarks();
    });

    render();
    showPdfState();
    if (roll) readPdfs();
    readNotes();
    return stop;
});
