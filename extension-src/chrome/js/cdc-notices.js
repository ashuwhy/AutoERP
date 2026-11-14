// Notice board on CDC's Notice.jsp, above ERP's own grid (#grid54), which stays as it is.
// Rows come from the grid's feed (jqqueryid=54, every notice of the year in one 2 MB answer,
// newest first). Cells 5 (coordinators' rolls), 8 (Upload) and 9 (Deactivate) are never parsed.
// Attachments are read for my roll (cdcRoll from the company board, else the login roll) in pdf-reader.html,
// three at a time, every unread one on open, newest first, the ones the search or filter shows before the rest.
// Only the verdict is kept.
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
        .tag { display: inline-block; max-width: 100%; height: 20px; padding: 0 7px; border-radius: 6px; background: var(--card); color: #3f3f46;
               font: 500 11px/20px var(--font); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .line { display: flex; align-items: center; gap: 8px; }
        .line .tag { flex: none; }
        .tag.pdf-in { background: #ecfdf3; color: #067647; box-shadow: inset 0 0 0 1px #abefc6; }
        .tag.pdf-out { color: var(--muted); }
        .subject { font-weight: 600; }
        .text { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 6; overflow: hidden; color: #3f3f46; font-size: 13px;
                white-space: pre-line; overflow-wrap: anywhere; }
        .text.full { display: block; }
        #cats button { height: 26px; padding: 0 9px; border-radius: 7px; font-size: 12px; }
        /* Red only for urgency: under-6h deadlines, NEW and Urgent notices. */
        #cats button[data-cat="Urgent"]:not(.picked), .tag[data-cat="Urgent"] { border-color: #fecdca; background: #fef3f2; color: var(--red-text); }
        @media (max-width: 760px) {
            .cols { display: none; }
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

    const [{ shadow, show }, feed, stored] = await Promise.all([
        mountPanel("autoerp-cdc", anchor, CSS, HTML),
        cdcFetch("ERPMonitoring.htm?action=fetchData&jqqueryid=54").catch(() => null),
        chrome.storage.local.get(["cdcApplied", "cdcLastNotice", "cdcRoll", "login", "cdcPdf"]),
    ]);
    const $ = (id) => shadow.getElementById(id);
    const stop = () => {
        chrome.storage.onChanged.removeListener(forget);
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
    const notices = cdcRows(feed.text, [0, 1, 2, 3, 4, 6, 7]).map((cells) => {
        const serial = Number(cells[0]?.textContent);
        const subject = cells[3]?.textContent.trim() || "";
        const text = cells[4]?.querySelector("a")?.getAttribute("title") || cells[4]?.textContent.trim() || "";
        const download = cells[7]?.querySelector("a")?.textContent.trim() === "Download";
        return {
            serial,
            type: cells[1]?.textContent.trim() || "",
            category: cells[2]?.textContent.trim() || "",
            subject,
            text,
            posted: istTime(cells[6]?.textContent || ""),
            attach: download ? cdcCall(cells[7], "TPNotice") : null,
            isNew: typeof last === "number" && serial > last,
            hay: `${subject} ${text}`.toLowerCase(),
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
    let forgot = false;
    // Forget CDC data in the popup with this tab open: a read in flight would write the verdicts back. Before the
    // first verdict there is no cdcPdf to remove, but cdcLastNotice was set above.
    function forget(changes, area) {
        if (area !== "local" || !["cdcPdf", "cdcLastNotice"].some((k) => k in changes && !("newValue" in changes[k]))) return;
        forgot = true;
        for (const k in verdicts) delete verdicts[k];
    }
    chrome.storage.onChanged.addListener(forget);
    if (roll && stored.cdcPdf && (stored.cdcPdf.roll !== roll || Object.keys(verdicts).length < Object.keys(saved).length))
        await chrome.storage.local.set({ cdcPdf: { roll, verdicts } });
    if (!wanted()) return stop;
    $("pdf-why").hidden = Boolean(roll);
    // The text's verdict is worked out on every visit and never stored; cdcPdf holds the PDFs' only.
    const textVerdicts = new Map(roll ? notices.map((n) => [n, cdcRollIn(n.text.toUpperCase(), roll)]) : []);
    const listing = (n) => {
        const both = [verdicts[pdfKey(n)], textVerdicts.get(n)];
        return both.includes("in") ? "in" : both.includes("out") ? "out" : "none";
    };

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
    let query = "";
    let reading = null;
    let filtered = [];
    let shown = 0;
    const BATCH = 100;

    const span = (cls, text) => {
        const el = document.createElement("span");
        el.className = cls;
        el.textContent = text;
        return el;
    };

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
        const listed = pdfTag(listing(n));
        if (listed) line.append(listed);
        const text = document.createElement("p");
        text.className = "text";
        text.append(...cdcMarked(n.text, query));
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
            const open = li.querySelector(".text").classList.toggle("full", Boolean(li.querySelector(".text mark")));
            li.querySelector(".more").textContent = open ? "less" : "more";
            li.querySelector(".more").hidden = !clamped[i];
        });
    }

    function showCount() {
        $("count").textContent = reading
            ? `Reading PDFs ${Math.min(reading.done + 1, reading.total)} of ${reading.total}`
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

    function render() {
        // In the page before more() measures which notices are clamped.
        show();
        query = $("search").value.trim().toLowerCase();
        // Type counts follow every other filter, like the company tabs follow the search.
        const others = notices.filter(
            (n) =>
                (!category || n.category === category) &&
                (!mine || mineSet.has(n)) &&
                (!newOnly || n.isNew) &&
                (!withMe || listing(n) === "in") &&
                (!query || n.hay.includes(query))
        );
        filtered = others.filter((n) => type === "all" || n.type === type.toUpperCase());
        for (const t of ["all", "placement", "internship"])
            $(`type-${t}`).lastChild.textContent = others.filter((n) => t === "all" || n.type === t.toUpperCase()).length;
        showCount();
        for (const t of ["all", "placement", "internship"]) $(`type-${t}`).classList.toggle("picked", t === type);
        for (const chip of $("cats").children) chip.classList.toggle("picked", chip.dataset.cat === category);
        for (const [id, on] of [["mine", mine], ["newonly", newOnly], ["withme", withMe]]) {
            $(id).classList.toggle("picked", on);
            $(id).setAttribute("aria-pressed", String(on));
        }
        $("notices").replaceChildren();
        $("notices").scrollTop = 0;
        shown = 0;
        more();
        $("none").hidden = filtered.length > 0;
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

    render();
    showPdfState();
    if (roll) readPdfs();
    return stop;
});
