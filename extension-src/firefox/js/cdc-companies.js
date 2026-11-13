// Company board on CDC's TPStudent.jsp, above ERP's own grid (#grid37), which stays as it is.
// Rows come from the grid's feed (jqqueryid=37, all roles in one answer). Each open or upcoming
// role gets ERP's own verdict from its role page, TPJNFView.jsp, the page ERP shows when you click
// the role: AutoERP never decides eligibility itself, and never applies, cancels or picks a CV.
cdcSwitch(async (wanted) => {
    const anchor = await cdcAnchor(37);
    if (!wanted() || !anchor || document.getElementById("autoerp-cdc")) return;

    const CSS = `
        .cols, ol > li { grid-template-columns: minmax(0, 1fr) 90px 104px 104px 88px; grid-template-areas: "who ctc left stat act"; }
        .who { grid-area: who; min-width: 0; }
        .ctc { grid-area: ctc; text-align: right; }
        .left { grid-area: left; text-align: right; }
        .stat { grid-area: stat; }
        .act { grid-area: act; justify-self: end; }
        .name { display: flex; align-items: center; gap: 8px; min-width: 0; font-weight: 600; }
        .name span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .role { color: var(--muted); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .role .why { margin-left: 8px; color: var(--red-text); }
        li .ctc { font-weight: 500; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
        li .ctc.free { color: var(--muted); font: 500 11px/1.3 var(--font); }
        li .left { font-variant-numeric: tabular-nums; white-space: nowrap; }
        li .left.soon { color: var(--red-text); font-weight: 600; }
        #refresh { font-variant-numeric: tabular-nums; }
        @media (max-width: 760px) {
            .cols, ol > li { grid-template-columns: auto minmax(0, 1fr) 104px 88px; grid-template-areas: "who who stat act" "ctc left stat act"; }
            .cols .ctc, .cols .left { display: none; }
            li .ctc, li .left { text-align: left; }
        }`;

    const HTML = `
        <section class="card" aria-label="AutoERP company board">
            <div class="top">
                <div class="bar">
                    <div class="seg" role="tablist">
                        <button id="tab-open" class="picked">Open now<span class="n">0</span></button>
                        <button id="tab-soon">Opens soon<span class="n">0</span></button>
                        <button id="tab-closed">Closed<span class="n">0</span></button>
                    </div>
                    <input type="search" id="search" placeholder="Search company or role" aria-label="Search company or role">
                    <div class="chips"><button id="hide" class="picked" aria-pressed="true">Hide not eligible</button></div>
                    <button class="link" id="hidden" hidden></button>
                </div>
                <div class="head"><button class="link" id="refresh">Check eligibility again</button></div>
            </div>
            <p class="note err" id="msg" role="status" aria-live="polite" hidden></p>
            <div class="cols" aria-hidden="true"><span class="who">Company and role</span><span class="ctc">CTC</span><span class="left" id="col-left">Closes in</span><span class="stat">Status</span><span class="act"></span></div>
            <ol id="roles"></ol>
            <p class="empty" id="none" hidden>No roles here.</p>
        </section>`;

    const now = () => Date.now();
    const keyOf = (args) => args && `${args[2]}:${args[1]}:${args[0]}`;
    const roll = document.documentElement.innerHTML.match(/resume\('(\w+)'/)?.[1];
    const [{ shadow, show }, feed] = await Promise.all([
        mountPanel("autoerp-cdc", anchor, CSS, HTML),
        cdcFetch("ERPMonitoring.htm?action=fetchData&jqqueryid=37").catch(() => null),
    ]);
    const $ = (id) => shadow.getElementById(id);
    let stopped = false;
    let ticker;
    let unwatch;
    const stop = () => {
        stopped = true;
        clearInterval(ticker);
        unwatch?.();
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
    const roles = cdcRows(feed.text).map((cells) => {
        const args = cdcCall(cells[3], "TPJNFView");
        return {
            company: cells[0].querySelector("a")?.getAttribute("title") || cells[0].textContent.trim(),
            role: cells[3].textContent.trim(),
            args,
            key: keyOf(args),
            ctc: ctcText(cells[5]?.textContent || "", (cells[6]?.textContent || "").trim()),
            applied: cells[8]?.textContent.trim() === "Y",
            start: istTime(cells[9]?.textContent || ""),
            end: istTime(cells[10]?.textContent || ""),
        };
    });
    if (!roles.length) {
        say("ERP sent no rows. Reload this page.");
        return stop;
    }

    const tabOf = (r) => (r.start > now() ? "soon" : r.end < now() ? "closed" : "open");
    let lastTab = new Map(roles.map((r) => [r, tabOf(r)]));
    const keys = roles.map((r) => r.key).filter(Boolean);
    const stored = await chrome.storage.local.get(["cdcSeen", "cdcJnf"]);
    if (!wanted()) return stop;
    const seen = stored.cdcSeen ? new Set(stored.cdcSeen) : null;
    const isNew = new Set(seen ? keys.filter((k) => !seen.has(k)) : []);
    await chrome.storage.local.set({ cdcSeen: keys });
    const verdicts = stored.cdcJnf || {};
    // Forget CDC data in the popup with this tab open: the next save would write these back.
    function forget(changes, area) {
        if (area === "local" && "cdcJnf" in changes && !("newValue" in changes.cdcJnf)) for (const k in verdicts) delete verdicts[k];
    }
    chrome.storage.onChanged.addListener(forget);
    const checking = new Set();
    let tab = "open";
    let hide = true;
    if (!roll) say("AutoERP could not find your roll number on this page, so it does not check eligibility. Open each role on ERP.");

    const span = (cls, text) => {
        const el = document.createElement("span");
        el.className = cls;
        el.textContent = text;
        return el;
    };

    function chipOf(r) {
        if (r.applied) return { cls: "applied", text: "Applied" };
        const v = r.key && verdicts[r.key];
        if (v?.verdict === "applied") return { cls: "applied", text: "Applied" };
        // A closed role may still say Apply on its cached page; ERP would not take it now.
        if (v?.verdict === "can" && tabOf(r) !== "closed") return { cls: "can", text: "Can apply" };
        if (v?.verdict === "not") return { cls: "not", text: "Not eligible", title: v.sentence };
        if (v?.verdict === "check") return { cls: "check", text: "Check on ERP", why: v.sentence };
        if (checking.has(r.key)) return { cls: "checking", text: "Checking" };
        return { cls: "check", text: "Check on ERP" };
    }

    function duration(ms) {
        const m = Math.max(0, Math.floor(ms / 60000));
        if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
        if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
        return `${m}m`;
    }

    function tick(li, r) {
        const left = li.querySelector(".left");
        const t = tabOf(r);
        if (t === "soon") left.textContent = duration(r.start - now());
        else if (t === "closed") left.textContent = new Date(r.end).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
        else left.textContent = isNaN(r.end) ? "no deadline" : duration(r.end - now());
        left.classList.toggle("soon", t === "open" && r.end - now() < 6 * 3600000);
    }

    function row(r) {
        const li = document.createElement("li");
        if (r.key) li.dataset.key = r.key;
        li.dataset.end = String(r.end);
        const who = document.createElement("div");
        who.className = "who";
        const name = document.createElement("p");
        name.className = "name";
        name.append(span("", r.company));
        if (isNew.has(r.key)) name.append(span("new", "NEW"));
        const chip = chipOf(r);
        // ERP's sentence shares the role's line, cut short, so a row keeps its height when its answer lands.
        const role = document.createElement("p");
        role.className = "role";
        role.textContent = r.role;
        role.title = chip.why ? `${r.role} - ${chip.why}` : r.role;
        if (chip.why) role.append(span("why", chip.why));
        who.append(name, role);
        const chipEl = span(`stat chip ${chip.cls}`, chip.text);
        if (chip.title) chipEl.title = chip.title;
        let open = span("act", "");
        if (r.args) {
            open = document.createElement("button");
            open.className = "act open";
            open.textContent = "Role page";
            // Runs ERP's own TPJNFView in the page, the same dialog its grid opens.
            open.setAttribute("onclick", cdcCallAttr("TPJNFView", r.args));
        }
        // Free text like "22 LAKHS(20 LPA + 2L ONE-TIMEBONUS)" goes smaller so the 90px column holds it.
        const ctc = span(/^[\d.,]+ (L|Cr|[A-Z]{3})$/.test(r.ctc) ? "ctc" : "ctc free", r.ctc);
        li.append(who, ctc, span("left", ""), chipEl, open);
        tick(li, r);
        return li;
    }

    const order = {
        open: (a, b) => (isNaN(a.end) ? 1 : isNaN(b.end) ? -1 : a.end - b.end),
        soon: (a, b) => a.start - b.start,
        closed: (a, b) => b.end - a.end,
    };

    const matches = (r) => {
        const query = $("search").value.trim().toLowerCase();
        return !query || `${r.company} ${r.role}`.toLowerCase().includes(query);
    };

    function render() {
        show();
        // Tab counts follow the search, so a match in another tab still shows up.
        const found = roles.filter(matches);
        for (const t of ["open", "soon", "closed"]) {
            $(`tab-${t}`).lastChild.textContent = found.filter((r) => tabOf(r) === t).length;
            $(`tab-${t}`).classList.toggle("picked", t === tab);
        }
        $("col-left").textContent = { open: "Closes in", soon: "Opens in", closed: "Closed" }[tab];
        const matching = found.filter((r) => tabOf(r) === tab).sort(order[tab]);
        const hiddenCount = hide ? matching.filter((r) => chipOf(r).cls === "not").length : 0;
        const shown = hide ? matching.filter((r) => chipOf(r).cls !== "not") : matching;
        $("hidden").hidden = !hiddenCount;
        $("hidden").textContent = `${hiddenCount} hidden, show`;
        $("hide").classList.toggle("picked", hide);
        $("hide").setAttribute("aria-pressed", String(hide));
        $("roles").replaceChildren(...shown.map(row));
        $("none").hidden = shown.length > 0;
        $("none").textContent = { open: "No roles open right now", soon: "No roles opening soon", closed: "No closed roles yet" }[tab];
    }

    // An answer from ERP swaps its row in place and never adds or removes one, so the list does not
    // jump under the pointer. A row that turned Not eligible leaves at the next render the student causes.
    function redraw(r) {
        [...$("roles").children].find((el) => el.dataset.key === r.key)?.replaceWith(row(r));
    }

    // A role that crosses its start or end with the page open changes tab; one that just opened is
    // asked again, since its verdict from before the start can only say it has not opened.
    ticker = setInterval(() => {
        if (roles.some((r) => lastTab.get(r) !== tabOf(r))) {
            const opened = roles.filter((r) => lastTab.get(r) === "soon" && tabOf(r) === "open" && !r.applied);
            lastTab = new Map(roles.map((r) => [r, tabOf(r)]));
            render();
            (async () => {
                for (const r of opened) await recheck(r);
            })();
            return;
        }
        const byKey = new Map(roles.map((r) => [r.key, r]));
        [...$("roles").children].forEach((li) => li.dataset.key && tick(li, byKey.get(li.dataset.key)));
    }, 30000);

    async function saveVerdicts() {
        // A "check" sentence may only mean the role has not opened yet, so it is asked again next visit.
        const pruned = Object.fromEntries(Object.entries(verdicts).filter(([k, v]) => keys.includes(k) && v.verdict !== "check"));
        const applied = new Set(roles.filter((r) => r.applied || verdicts[r.key]?.verdict === "applied").map((r) => r.company));
        await chrome.storage.local.set({ cdcJnf: pruned, cdcApplied: [...applied] });
    }

    // ERP's role page says one of: "Apply with CV1 ...", "Cancel apply View applied Resume", or why
    // you cannot apply, all before the "Company :" line.
    function verdictOf(html) {
        const page = new DOMParser().parseFromString(html, "text/html");
        page.querySelectorAll("script, style").forEach((el) => el.remove());
        const text = (page.body?.textContent || "").replace(/\s+/g, " ").trim();
        const at = text.indexOf("Company :");
        if (at < 0) return null;
        const sentence = text.slice(0, at).replace(/^CAREER DEVELOPMENT CENTRE \(IIT-KGP\)/, "").trim();
        if (/Cancel apply/.test(sentence)) return { verdict: "applied", sentence };
        if (/Apply with CV/.test(sentence)) return { verdict: "can", sentence };
        if (/cut off greater than yours/i.test(sentence)) return { verdict: "not", sentence };
        return sentence ? { verdict: "check", sentence } : null;
    }

    let signedOut = false;
    async function ask(r) {
        const [jnf, com, yop] = r.args;
        const reply = await cdcFetch(`TPJNFView.jsp?jnf_id=${jnf}&com_id=${com}&yop=${yop}&user_type=SU&rollno=${roll}`).catch(() => null);
        if (!reply?.signedOut) return reply && verdictOf(reply.text);
        signedOut = true;
        say("Signed out of ERP.");
        return null;
    }

    // After ERP's role dialog closes: the student may have applied or cancelled in it, and the feed's
    // Applied column is only as fresh as the page, so the role page's answer replaces it.
    async function recheck(r) {
        if (!roll || !r.args || signedOut || stopped || checking.has(r.key)) return;
        delete verdicts[r.key];
        checking.add(r.key);
        redraw(r);
        const v = await ask(r);
        if (stopped) return;
        checking.delete(r.key);
        if (v) verdicts[r.key] = v;
        // Only these two answers say whether you applied; any other sentence leaves the feed's word.
        if (v?.verdict === "applied" || v?.verdict === "can") r.applied = v.verdict === "applied";
        redraw(r);
        if (!signedOut) await saveVerdicts();
    }

    // Open and upcoming roles not applied to: on the first pass only those with no answer kept from a
    // visit before, again every one. They are marked before any draw, so no chip goes Check on ERP
    // then Checking, and a kept verdict stays on screen until its new answer lands.
    function queueUp(again) {
        if (!roll) return [];
        const queue = roles.filter((r) => r.key && !r.applied && tabOf(r) !== "closed" && (again || !verdicts[r.key]));
        queue.forEach((r) => checking.add(r.key));
        return queue;
    }

    async function checkAll(queue, answered) {
        const worker = async () => {
            while (queue.length && !signedOut && !stopped) {
                const r = queue.shift();
                const v = await ask(r);
                if (stopped) return;
                checking.delete(r.key);
                if (v) verdicts[r.key] = v;
                redraw(r);
                answered?.();
            }
        };
        await Promise.all([worker(), worker(), worker()]);
        if (stopped) return;
        // Signed out part way: the roles never asked go back to Check on ERP.
        for (const r of queue.splice(0)) {
            checking.delete(r.key);
            redraw(r);
        }
        if (!signedOut) await saveVerdicts();
    }

    for (const t of ["open", "soon", "closed"])
        $(`tab-${t}`).addEventListener("click", () => {
            tab = t;
            render();
        });
    $("search").addEventListener("input", render);
    $("hide").addEventListener("click", () => {
        hide = !hide;
        render();
    });
    $("hidden").addEventListener("click", () => {
        hide = false;
        render();
    });
    // Kept verdicts stay on the rows while they are asked again, so the button carries the count,
    // held at its idle width so the search box beside it does not move.
    $("refresh").addEventListener("click", async () => {
        if (checking.size || signedOut) return;
        const queue = queueUp(true);
        if (!queue.length) return;
        const button = $("refresh"), total = queue.length;
        let done = 0;
        button.style.width = `${button.getBoundingClientRect().width}px`;
        button.disabled = true;
        button.textContent = `Checking 0 of ${total}`;
        await checkAll(queue, () => (button.textContent = `Checking ${++done} of ${total}`));
        button.textContent = "Check eligibility again";
        button.style.width = "";
        button.disabled = false;
    });

    const firstQueue = queueUp(false);
    render();
    unwatch = cdcWatchRoleDialog((args) => {
        const r = roles.find((role) => role.key === keyOf(args));
        if (r) recheck(r);
    });
    if (!wanted()) return stop;
    await saveVerdicts();
    if (wanted()) checkAll(firstQueue);
    return stop;
});
