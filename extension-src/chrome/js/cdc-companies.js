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
        #sort { flex: none; height: 32px; padding: 0 30px 0 10px; border: 1px solid var(--line); border-radius: 8px; -webkit-appearance: none; appearance: none;
                background: var(--paper) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='none' stroke='%2371717a' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M3 4.5 6 7.5 9 4.5'/%3E%3C/svg%3E") no-repeat right 10px center;
                color: var(--ink); font: 500 13px var(--font); cursor: pointer; }
        #sort:hover { border-color: #d4d4d8; }
        #sort:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
        #refresh { font-variant-numeric: tabular-nums; }
        #ics:disabled { opacity: 0.45; color: var(--muted); cursor: default; }
        /* One wrap item, so "N hidden, show" never drops to a line of its own under Hide not eligible. */
        #hiding { display: inline-flex; align-items: center; gap: 8px; }
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
                    <select id="sort" aria-label="Sort roles">
                        <option value="deadline">Closing soonest</option>
                        <option value="ctc">Highest CTC</option>
                        <option value="az">Company A-Z</option>
                    </select>
                    <div id="hiding">
                        <div class="chips"><button id="hide" class="picked" aria-pressed="true">Hide not eligible</button></div>
                        <button class="link" id="hidden" hidden></button>
                    </div>
                </div>
                <div class="head">
                    <button class="link" id="ics" title="An .ics of every role you can apply to now. Apple Calendar and Outlook keep its reminders 3 h and 30 min before; Google Calendar uses its own.">Add deadlines to calendar</button>
                    <button class="link" id="refresh">Check eligibility again</button>
                </div>
            </div>
            <p class="note err" id="msg" role="status" aria-live="polite" hidden></p>
            <div class="cols" aria-hidden="true"><span class="who">Company and role</span><span class="ctc">CTC</span><span class="left" id="col-left">Closes in</span><span class="stat">Status</span><span class="act"></span></div>
            <ol id="roles"></ol>
            <p class="empty" id="none" hidden>No roles here.</p>
            <p class="empty" hidden><button class="link" id="elsewhere" hidden></button></p>
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
    // After the feed, so an off that lands during it saves nothing. Every visit overwrites: another account replaces it.
    if (CDC_ROLL.test(roll)) chrome.storage.local.set({ cdcRoll: roll });

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
        const currency = (cells[6]?.textContent || "").trim();
        const amount = (cells[5]?.textContent || "").replace(/[₹,\s]/g, "");
        return {
            company: cells[0].querySelector("a")?.getAttribute("title") || cells[0].textContent.trim(),
            role: cells[3].textContent.trim(),
            args,
            key: keyOf(args),
            ctc: ctcText(cells[5]?.textContent || "", currency),
            // Highest CTC: rupees first, then other currencies by code, since no exchange rate is guessed, then free text.
            pay: /^\d+(\.\d+)?$/.test(amount) ? [currency === "INR" ? 0 : 1, currency === "INR" ? "" : currency, Number(amount)] : [2, "", 0],
            applied: cells[8]?.textContent.trim() === "Y",
            start: istTime(cells[9]?.textContent || ""),
            end: istTime(cells[10]?.textContent || ""),
        };
    });
    if (cdcNoRows(37, roles.length, say)) return stop;

    const tabOf = (r) => (r.start > now() ? "soon" : r.end < now() ? "closed" : "open");
    let lastTab = new Map(roles.map((r) => [r, tabOf(r)]));
    const byKey = new Map(roles.filter((r) => r.key).map((r) => [r.key, r]));
    const keys = [...byKey.keys()];
    const stored = await chrome.storage.local.get(["cdcSeen", "cdcJnf", "cdcSort"]);
    if (!wanted()) return stop;
    if (stored.cdcSort) $("sort").value = stored.cdcSort;
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
    let hiddenCount = 0;
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
        // A closed role still says Apply on its page; ERP would not take it now, so it is a chance missed.
        if (v?.verdict === "can") return tabOf(r) === "closed" ? { cls: "missed", text: "Missed" } : { cls: "can", text: "Can apply" };
        if (v?.verdict === "not") return { cls: "not", text: "Not eligible", title: v.sentence };
        const closed = tabOf(r) === "closed";
        if (v?.verdict === "check" && !closed) return { cls: "check", text: "Check on ERP", why: v.sentence };
        if (checking.has(r.key)) return { cls: "checking", text: "Checking" };
        // Nothing left to check on ERP once a role closes; the hover keeps whatever ERP said.
        if (closed) return { cls: "closed", text: "Closed", title: v?.sentence || "ERP gave no verdict before it closed" };
        return { cls: "check", text: "Check on ERP" };
    }

    // The calendar holds every open role that reads Can apply, whatever tab, search or hide shows.
    // An Opens soon role can carry a kept Can apply verdict, but ERP takes no application before the start.
    const due = () => roles.filter((r) => tabOf(r) === "open" && chipOf(r).cls === "can" && !isNaN(r.end));
    function syncIcs() {
        // Closed roles being asked change nothing in the file.
        $("ics").disabled = [...checking].some((k) => tabOf(byKey.get(k)) !== "closed") || !due().length;
    }

    // RFC 5545 by hand. Times go out in UTC, so no VTIMEZONE block and every calendar shows local time.
    // IST is +5:30 all year, so the closing time is shifted by hand: Chrome's ICU writes "Sept" for en-GB.
    const ist = 5.5 * 3600000;
    const stamp = (ms) => new Date(ms).toISOString().replace(/[-:]|\.\d{3}/g, "");
    // A character reference in ERP's feed can carry a CR, a control or U+2028 into a name; lenient parsers
    // break lines on all of them.
    const escaped = (text) => text.replace(/[\\;,]/g, "\\$&").replace(/\r\n?|\n/g, "\\n").replace(/[\x00-\x08\x0b-\x1f\x7f-\x9f\u2028\u2029]/g, "");

    function closes(ms) {
        const d = new Date(ms + ist);
        const h = d.getUTCHours();
        const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.getUTCMonth()];
        return `${d.getUTCDate()} ${month} ${d.getUTCFullYear()}, ${h % 12 || 12}:${String(d.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "AM" : "PM"} IST`;
    }

    // 75 octets on the first line, then a space and 74 more, cut between code points, never inside one.
    function fold(line) {
        let out = "";
        let room = 75;
        for (const ch of line) {
            const cp = ch.codePointAt(0);
            const octets = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
            if (octets > room) {
                out += "\r\n ";
                room = 74;
            }
            out += ch;
            room -= octets;
        }
        return `${out}\r\n`;
    }

    function calendar() {
        const at = now();
        const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AutoERP//CDC deadlines//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"];
        for (const r of due()) {
            const summary = escaped(`Apply: ${r.company} - ${r.role}`);
            const alarm = (before) => ["BEGIN:VALARM", "ACTION:DISPLAY", `TRIGGER:-${before}`, `DESCRIPTION:${summary}`, "END:VALARM"];
            const ctc = r.ctc ? ` CTC ${r.ctc}.` : "";
            lines.push(
                "BEGIN:VEVENT",
                `UID:${r.key}@autoerp`,
                `DTSTAMP:${stamp(at)}`,
                // Same UID in a later file: the higher sequence wins in Outlook, so an extended deadline moves.
                `SEQUENCE:${Math.floor((at - Date.UTC(2026, 0, 1)) / 60000)}`,
                `DTSTART:${stamp(r.end)}`,
                `DTEND:${stamp(r.end)}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${escaped(`Applications close ${closes(r.end)}.${ctc}\nApply on ERP: CDC > Application of Placement/Internship.`)}`,
                `URL:${location.origin}${location.pathname}`,
                "TRANSP:TRANSPARENT",
                ...alarm("PT3H"),
                ...alarm("PT30M"),
                "END:VEVENT"
            );
        }
        lines.push("END:VCALENDAR");
        return lines.map(fold).join("");
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
        const company = span("", "");
        company.append(...cdcMarked(r.company, query()));
        name.append(company);
        const chip = chipOf(r);
        // Seen is per browser: a role applied to elsewhere is unseen here, but it is not news.
        if (isNew.has(r.key) && chip.cls !== "applied") name.append(span("new", "NEW"));
        // ERP's sentence shares the role's line, cut short, so a row keeps its height when its answer lands.
        const role = document.createElement("p");
        role.className = "role";
        role.append(...cdcMarked(r.role, query()));
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

    const sorts = {
        ctc: (a, b) => a.pay[0] - b.pay[0] || a.pay[1].localeCompare(b.pay[1]) || b.pay[2] - a.pay[2],
        az: (a, b) => a.company.localeCompare(b.company, "en"),
    };
    // Open now and Opens soon put what you can act on first. Closed has no groups: nothing there takes an application.
    const groupOf = { can: 0, check: 1, checking: 1, applied: 2, not: 3 };

    function sorted(list) {
        const group = new Map(list.map((r) => [r, tab === "closed" ? 0 : groupOf[chipOf(r).cls]]));
        const by = sorts[$("sort").value];
        return list.sort((a, b) => group.get(a) - group.get(b) || by?.(a, b) || order[tab](a, b));
    }

    const query = () => $("search").value.trim().toLowerCase();
    const tabName = { open: "Open now", soon: "Opens soon", closed: "Closed" };

    function render() {
        show();
        // Tab counts follow the search, so a match in another tab still shows up.
        const q = query();
        const found = roles.filter((r) => !q || `${r.company} ${r.role}`.toLowerCase().includes(q));
        const counts = {};
        for (const t of ["open", "soon", "closed"]) {
            counts[t] = found.filter((r) => tabOf(r) === t).length;
            $(`tab-${t}`).lastChild.textContent = counts[t];
            $(`tab-${t}`).classList.toggle("picked", t === tab);
        }
        $("col-left").textContent = { open: "Closes in", soon: "Opens in", closed: "Closed" }[tab];
        $("sort").options[0].textContent = { open: "Closing soonest", soon: "Opening soonest", closed: "Closed most recently" }[tab];
        // A search that hits more in another tab names the one with the most, once.
        const most = ["open", "soon", "closed"].reduce((a, b) => (counts[b] > counts[a] ? b : a));
        const elsewhere = q && counts[most] > counts[tab] ? most : "";
        $("elsewhere").hidden = $("elsewhere").parentElement.hidden = !elsewhere;
        $("elsewhere").dataset.tab = elsewhere;
        $("elsewhere").textContent = elsewhere ? `${counts[elsewhere]} more in ${tabName[elsewhere]}, show` : "";
        const matching = sorted(found.filter((r) => tabOf(r) === tab));
        hiddenCount = hide ? matching.filter((r) => chipOf(r).cls === "not").length : 0;
        const shown = hide ? matching.filter((r) => chipOf(r).cls !== "not") : matching;
        countHidden();
        $("hide").classList.toggle("picked", hide);
        $("hide").setAttribute("aria-pressed", String(hide));
        $("roles").replaceChildren(...shown.map(row));
        $("none").hidden = shown.length > 0;
        $("none").textContent = { open: "No roles open right now", soon: "No roles opening soon", closed: "No closed roles yet" }[tab];
        syncIcs();
    }

    function countHidden() {
        $("hidden").hidden = !hiddenCount;
        $("hidden").textContent = `${hiddenCount} hidden, show`;
    }

    // An answer from ERP swaps its row in place and never adds one, so the list does not jump under the
    // pointer. With Hide not eligible on, a row that turns Not eligible leaves and the hidden count takes it.
    function redraw(r) {
        const li = [...$("roles").children].find((el) => el.dataset.key === r.key);
        if (li && hide && chipOf(r).cls === "not") {
            li.remove();
            hiddenCount++;
            // The last row gone: render puts up the tab's empty message.
            if (!$("roles").children.length) return render();
            countHidden();
        } else li?.replaceWith(row(r));
        syncIcs();
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
        [...$("roles").children].forEach((li) => li.dataset.key && tick(li, byKey.get(li.dataset.key)));
    }, 30000);

    async function saveVerdicts() {
        // A "check" sentence may only mean the role has not opened yet, so it is asked again next visit.
        // A closed role's answer can't change any more, so every one is kept.
        const pruned = Object.fromEntries(Object.entries(verdicts).filter(([k, v]) => byKey.has(k) && (v.verdict !== "check" || tabOf(byKey.get(k)) === "closed")));
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

    // Closed roles not applied to and never answered, newest first, asked once when the Closed tab
    // first opens; Check eligibility again leaves them alone.
    let closedAsked = false;
    function queueClosed() {
        closedAsked = true;
        if (!roll || signedOut) return [];
        const queue = roles.filter((r) => r.key && !r.applied && tabOf(r) === "closed" && !verdicts[r.key]).sort(order.closed);
        queue.forEach((r) => checking.add(r.key));
        return queue;
    }

    // One batch at a time, so ERP never has more than three role pages from the board in flight.
    let asking = Promise.resolve();
    const askAll = (queue, answered) => (asking = asking.then(() => checkAll(queue, answered)));

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
            const queue = t === "closed" && !closedAsked ? queueClosed() : [];
            render();
            if (queue.length) askAll(queue);
        });
    $("search").addEventListener("input", render);
    $("elsewhere").addEventListener("click", () => $(`tab-${$("elsewhere").dataset.tab}`).click());
    $("sort").addEventListener("change", () => {
        chrome.storage.local.set({ cdcSort: $("sort").value });
        render();
    });
    $("hide").addEventListener("click", () => {
        hide = !hide;
        render();
    });
    $("hidden").addEventListener("click", () => {
        hide = false;
        render();
    });
    // A data: link clicked from the board itself; Firefox has needed the link to sit in a document.
    $("ics").addEventListener("click", () => {
        const link = document.createElement("a");
        link.href = `data:text/calendar;charset=utf-8,${encodeURIComponent(calendar())}`;
        link.download = `autoerp-deadlines-${new Date(now() + ist).toISOString().slice(0, 10)}.ics`;
        shadow.append(link);
        link.click();
        link.remove();
    });
    // Kept verdicts stay on the rows while they are asked again, so the button carries the count,
    // held at its idle width so the search box beside it does not move.
    $("refresh").addEventListener("click", async () => {
        if (checking.size || signedOut) return;
        const queue = queueUp(true);
        syncIcs();
        if (!queue.length) return;
        const button = $("refresh"), total = queue.length;
        let done = 0;
        button.style.width = `${button.getBoundingClientRect().width}px`;
        button.disabled = true;
        button.textContent = `Checking 0 of ${total}`;
        await askAll(queue, () => (button.textContent = `Checking ${++done} of ${total}`));
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
    if (wanted()) askAll(firstQueue);
    return stop;
});
