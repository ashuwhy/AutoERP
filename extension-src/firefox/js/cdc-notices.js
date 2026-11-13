// Notice board on CDC's Notice.jsp, above ERP's own grid (#grid54), which stays as it is.
// Rows come from the grid's feed (jqqueryid=54, every notice of the year in one 2 MB answer,
// newest first). Cells 5 (coordinators' rolls), 8 (Upload) and 9 (Deactivate) are never parsed.
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
                    </div>
                    <span class="muted" id="mine-why" hidden>Open the company page first</span>
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
        chrome.storage.local.get(["cdcApplied", "cdcLastNotice"]),
    ]);
    const $ = (id) => shadow.getElementById(id);
    const stop = () => shadow.host.remove();
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
    $("mine-why").hidden = applied.length > 0;
    if (stored.cdcApplied) $("mine-why").textContent = "You have not applied to any company yet";
    $("newonly").disabled = !newCount;
    $("newonly").lastChild.textContent = newCount;

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
        line.append(span("subject", n.subject));
        if (n.isNew) line.append(span("new", "NEW"));
        const text = document.createElement("p");
        text.className = "text";
        text.textContent = n.text;
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

    function more() {
        const batch = filtered.slice(shown, shown + BATCH).map(item);
        shown += batch.length;
        $("notices").append(...batch);
        // All reads, then all writes, so the batch costs one layout and not a hundred.
        const clamped = batch.map((li) => {
            const text = li.querySelector(".text");
            return text.scrollHeight > text.clientHeight + 1;
        });
        batch.forEach((li, i) => {
            li.querySelector(".more").hidden = !clamped[i];
        });
    }

    function render() {
        // In the page before more() measures which notices are clamped.
        show();
        const query = $("search").value.trim().toLowerCase();
        // Type counts follow every other filter, like the company tabs follow the search.
        const others = notices.filter(
            (n) =>
                (!category || n.category === category) &&
                (!mine || mineSet.has(n)) &&
                (!newOnly || n.isNew) &&
                (!query || n.hay.includes(query))
        );
        filtered = others.filter((n) => type === "all" || n.type === type.toUpperCase());
        for (const t of ["all", "placement", "internship"])
            $(`type-${t}`).lastChild.textContent = others.filter((n) => t === "all" || n.type === t.toUpperCase()).length;
        $("count").textContent = filtered.length === notices.length ? `${notices.length} notices` : `${filtered.length} of ${notices.length} notices`;
        for (const t of ["all", "placement", "internship"]) $(`type-${t}`).classList.toggle("picked", t === type);
        for (const chip of $("cats").children) chip.classList.toggle("picked", chip.dataset.cat === category);
        for (const [id, on] of [["mine", mine], ["newonly", newOnly]]) {
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

    render();
    return stop;
});
