// Runs in the page's MAIN world on erp.iitkgp.ac.in/IIT_ERP3/showmenu.htm.
// The feedback form lives in the same-origin iframe #myframe
// (/Academic/studentFeedbackResponseView.htm) and is swapped in over AJAX,
// so everything below polls the iframe instead of waiting for page loads.
(() => {
    if (window.__autoerp) window.__autoerp.stop();

    const TEXT = {
        positive: {
            teacherStrength: [
                "Explains every topic with clarity and good examples, and makes sure the class has understood a concept before moving on to the next one.",
                "Has deep knowledge of the subject and answers doubts patiently, both in class and outside it, which made learning the course much easier.",
                "Lectures are well organised and easy to follow, and the teacher keeps the class engaged by relating the theory to real applications.",
                "Very approachable and encouraging towards students, and the pace of teaching was comfortable for most of the class throughout the semester.",
            ],
            teacherWeakness: [
                "Nothing major to point out. A few more solved examples before the tests would have made the preparation a little easier.",
                "No real weakness. Sharing slides or notes a little earlier would sometimes help in revising the topics before the exams.",
                "Hardly any. At times a few topics near the end of the semester could have been given slightly more time in class.",
            ],
            courseStrength: [
                "The course is well structured and builds the fundamentals step by step, so each topic connects naturally to the one before it.",
                "The content is relevant and useful in practice, and the tests and assignments helped in understanding the concepts thoroughly.",
                "A good balance of theory and application, and the course gave a strong understanding of the core ideas of the subject.",
            ],
            courseWeakness: [
                "Nothing significant. A few more practice problems with solutions would make the course even better for self study.",
                "The syllabus is slightly heavy for one semester, but overall the content and its structure were well planned.",
                "No major weakness. Some advanced topics could be covered in a little more depth if time permits.",
            ],
            labTeacherStrength: [
                "Explains each experiment clearly before we start and is always available to help when we get stuck during the lab hours.",
                "Gives clear instructions for every assignment and answers doubts patiently, which made the lab sessions productive and smooth.",
                "Very approachable during the lab, and the guidance helped us connect the experiments to what was taught in the theory course.",
            ],
            labTeacherWeakness: [
                "Nothing major to point out. A short walkthrough of common mistakes at the start of each lab would save some time.",
                "No real weakness. Sometimes a little more time for the longer experiments or assignments would have been helpful.",
            ],
            suggestion: [
                "No major suggestions. Sharing more practice problems with solutions before the tests would help students prepare even better.",
                "The course is going well. A short recap at the start of each lecture would make it easier to follow the continuity of topics.",
                "Keep up the good work. Releasing the slides and reading material soon after each lecture would be helpful for revision.",
            ],
            labSuggestion: [
                "The lab is going well. Sharing sample inputs and expected outputs with each assignment would help us test our work properly.",
                "No major suggestions. A short demo of the tools at the start of the semester would help students get started faster.",
            ],
        },
        neutral: {
            teacherStrength: [
                "Has good knowledge of the subject and covers the syllabus properly, and doubts asked in class are usually answered well.",
                "The lectures are organised and follow a clear order, and the teacher is approachable when students ask for help.",
                "Explains the main concepts adequately and the board work is clear enough to follow the derivations in class.",
            ],
            teacherWeakness: [
                "The pace was uneven at times, with some topics rushed and others covered slowly, which made it hard to keep up.",
                "More examples and interaction in class would help, since some lectures felt like a one way delivery of the material.",
                "Slides and notes were not always shared in time, which made revision before the tests a little difficult.",
            ],
            courseStrength: [
                "The course covers the important topics of the subject and gives a reasonable foundation for further study.",
                "The topics are relevant, and the assignments help in understanding some of the concepts in a practical way.",
            ],
            courseWeakness: [
                "Some topics are covered only at a surface level, and the course could use more practice problems and examples.",
                "The workload is uneven across the semester, with most of the evaluations coming close to each other.",
            ],
            labTeacherStrength: [
                "Covers the required experiments and is available for doubts during the lab, and the instructions are mostly clear.",
                "The lab assignments are relevant to the theory course and help in understanding some of the concepts better.",
            ],
            labTeacherWeakness: [
                "The instructions for some experiments were not very clear, and more guidance during the lab hours would help.",
                "Feedback on our submissions came late, so it was hard to know what to improve in the next assignment.",
            ],
            suggestion: [
                "More solved examples in class and regular practice problems would help students understand the course better.",
                "A course page with all the deadlines, slides and announcements in one place would make the course easier to follow.",
            ],
            labSuggestion: [
                "Sharing test cases or expected outputs with each assignment would help students check their work before submitting.",
                "Timely feedback on each submission would help students improve over the course of the lab.",
            ],
        },
        negative: {
            teacherStrength: [
                "Has knowledge of the subject, and some of the topics were explained clearly with the help of examples.",
                "The teacher covers the syllabus and is available to answer some doubts when students ask after class.",
            ],
            teacherWeakness: [
                "The pace of teaching was hard to follow, and doubts were not always addressed properly during the lectures.",
                "The lectures were difficult to understand and lacked examples, so most of the learning had to happen through self study.",
                "Material was not shared in time and the class was not very interactive, which made the course hard to follow.",
            ],
            courseStrength: [
                "The course covers topics that are important for the subject and useful for further study in the area.",
                "Some of the topics are interesting and relevant, and the course gives an overview of the subject.",
            ],
            courseWeakness: [
                "The course structure is not clear and the topics do not connect well, so it was difficult to follow the flow.",
                "The workload is high compared to other courses and the evaluation did not reflect what was taught in class.",
            ],
            labTeacherStrength: [
                "The experiments cover topics relevant to the theory course, and help is available for some of the doubts.",
                "The lab assignments are related to the subject and some of them were useful for understanding the concepts.",
            ],
            labTeacherWeakness: [
                "Guidance during the lab was limited, and the instructions for the assignments were often unclear or incomplete.",
                "Evaluation criteria were not clear and feedback on submissions came late or not at all.",
            ],
            suggestion: [
                "Slowing down the pace, adding more examples and sharing material on time would make the course much easier to follow.",
                "Clear evaluation criteria and timely feedback on tests and assignments would help students improve during the semester.",
            ],
            labSuggestion: [
                "Clear instructions, sample test cases and timely feedback on each assignment would improve the lab a lot.",
                "More teaching assistant support during the lab hours would help students who get stuck on the tools.",
            ],
        },
    };

    const RATINGS = {
        positive: { quality: ["Excellent", "Very good"], pace: ["Just Right"], load: ["Average"] },
        neutral: { quality: ["Very good", "Good"], pace: ["Just Right"], load: ["Heavy", "Average"] },
        negative: { quality: ["Fair", "Poor"], pace: ["Too Fast", "Too Slow"], load: ["Heavy", "Very Heavy"] },
    };

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const frameDoc = () => document.getElementById("myframe")?.contentDocument;
    const labelOf = (radio) =>
        (radio.closest("label")?.innerText || radio.nextSibling?.textContent || "").trim();
    const fire = (el, types) =>
        types.forEach((type) => el.dispatchEvent(new Event(type, { bubbles: true })));

    async function waitFor(check, timeout = 6000) {
        for (let waited = 0; waited < timeout; waited += 250) {
            const found = check();
            if (found) return found;
            await sleep(250);
        }
        return null;
    }

    function fillForm(doc, type) {
        const rating = RATINGS[type];
        const unfilled = [];
        const groups = {};
        doc.querySelectorAll('input[type="radio"]').forEach((radio) => {
            if (/^question_\d+$/.test(radio.name)) (groups[radio.name] ||= []).push(radio);
        });
        for (const [name, radios] of Object.entries(groups)) {
            const labels = radios.map(labelOf);
            const wanted = labels.includes("Just Right")
                ? rating.pace
                : labels.includes("Very Heavy")
                  ? rating.load
                  : rating.quality;
            const choice = pick(wanted);
            const radio = radios.find((r) => labelOf(r) === choice);
            if (radio) {
                radio.click();
                fire(radio, ["change"]);
            } else unfilled.push(name);
        }

        // Theory forms ask for teacher and course strength/weakness (two pairs),
        // lab forms only for the teacher (one pair). Anything unpaired is "Suggestions".
        const pairs = {};
        const loose = [];
        doc.querySelectorAll("textarea").forEach((box) => {
            const match = box.name.match(/^question_(\d+)_\d$/);
            if (match) (pairs[match[1]] ||= []).push(box);
            else loose.push(box);
        });
        const isLab = Object.keys(pairs).length < 2;
        const bank = TEXT[type];
        const write = (box, text) => {
            box.value = text;
            fire(box, ["input", "keyup", "change", "blur"]);
        };
        Object.keys(pairs)
            .map(Number)
            .sort((a, b) => a - b)
            .forEach((question, i) =>
                pairs[question].forEach((box) => {
                    const strength = /strength/i.test(box.placeholder);
                    if (i === 0 && isLab)
                        write(box, pick(strength ? bank.labTeacherStrength : bank.labTeacherWeakness));
                    else if (i === 0)
                        write(box, pick(strength ? bank.teacherStrength : bank.teacherWeakness));
                    else write(box, pick(strength ? bank.courseStrength : bank.courseWeakness));
                })
            );
        loose.forEach((box) => write(box, pick(isLab ? bank.labSuggestion : bank.suggestion)));
        return unfilled;
    }

    const STATUS = {
        pending: "",
        active: "your turn",
        done: "submitted",
        skipped: "already done",
        failed: "could not open",
    };
    const CROSS = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>`;

    // :host resets what the ERP page would otherwise pass down (font size, letter spacing).
    // Top right, because the captcha and Submit sit at the very bottom of the form
    // and the page cannot scroll them any higher.
    // The timeline is an answer sheet: an empty bubble waits, the red one is your turn,
    // an inked one is submitted.
    // A list cut off mid-row fades and blurs out at that edge; fadeEdges() sizes both fades.
    const PANEL_CSS = `
        :host { all: initial; }
        * { box-sizing: border-box; margin: 0; }
        .card { position: fixed; top: 20px; right: 20px; z-index: 2147483647; width: 320px;
                max-height: min(600px, 70vh); display: flex; flex-direction: column; gap: 16px; padding: 18px 20px 20px;
                border-radius: 24px; background: var(--paper); color: var(--ink); font: 14px/1.4 var(--font);
                box-shadow: 0 0 0 1px var(--line), 0 18px 44px rgba(27, 24, 20, 0.22); text-align: left; }
        .head { display: flex; align-items: center; gap: 10px; }
        .title { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; }
        .title .wordmark { height: 20px; }
        .title small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted); font-size: 12px; }
        .count { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
        .bar { height: 4px; margin-top: 10px; border-radius: 2px; background: var(--card); overflow: hidden; }
        .bar i { display: block; height: 100%; width: 0; background: var(--red); }
        ol { position: relative; flex: 1 1 auto; min-height: 0; overflow-y: auto; list-style: none; padding: 0;
             --fade-top: 0px; --fade-bottom: 0px;
             mask-image: linear-gradient(transparent, #000 var(--fade-top), #000 calc(100% - var(--fade-bottom)), transparent); }
        ol::before, ol::after { content: ""; position: sticky; z-index: 1; display: block; pointer-events: none;
                                backdrop-filter: blur(3px); }
        ol::before { top: 0; height: var(--fade-top); margin-bottom: calc(-1 * var(--fade-top));
                     mask-image: linear-gradient(#000, transparent); }
        ol::after { bottom: 0; height: var(--fade-bottom); margin-top: calc(-1 * var(--fade-bottom));
                    mask-image: linear-gradient(transparent, #000); }
        li { position: relative; display: grid; grid-template-columns: 16px 1fr; column-gap: 12px; padding: 7px 0; }
        li:not(:last-child)::after { content: ""; position: absolute; left: 7px; top: 29px; bottom: -5px;
                                     width: 2px; border-radius: 1px; background: var(--line); }
        li.done::after { background: var(--ink); }
        .mark { display: grid; place-items: center; height: 18px; color: var(--red-text); }
        .mark i { width: 12px; height: 12px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px var(--muted); }
        li.done .mark i { background: var(--ink); box-shadow: none; }
        li.active .mark i { background: var(--red); box-shadow: 0 0 0 4px var(--red-soft); }
        .meta { font-size: 12px; color: var(--muted); font-variant-numeric: tabular-nums; }
        .who { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        li.active .meta { color: var(--red-text); font-weight: 600; }
        li.active .who { font-weight: 700; }
        li.pending .who { color: var(--muted); }
        li.failed .meta { color: var(--red-text); }
        .progress[hidden], .foot[hidden] { display: none; }`;

    const PANEL_HTML = `
        <section class="card" aria-label="AutoERP">
            <div class="head">
                <div class="title" id="title"><small id="mode"></small></div>
                <button class="round" id="close" aria-label="Close AutoERP">${CROSS}</button>
            </div>
            <div class="progress" id="progress" hidden>
                <p class="count" id="count"></p>
                <div class="bar"><i id="bar"></i></div>
            </div>
            <p class="note" id="msg" role="status" aria-live="polite">Starting...</p>
            <ol id="list"></ol>
            <div class="foot" id="foot" hidden><button class="btn secondary" id="admit">Download admit card</button></div>
        </section>`;

    const ROW_TEXT = `<div><p class="meta"></p><p class="who"></p></div>`;

    const panelHost = document.createElement("div");
    panelHost.id = "autoerp-panel";
    const shadow = panelHost.attachShadow({ mode: "open" });
    const $ = (id) => shadow.getElementById(id);

    // Only ever given the constant markup above and the extension's own wordmark file;
    // names from ERP go in through textContent.
    const parse = (markup) => new DOMParser().parseFromString(markup, "text/html").body.firstElementChild;

    // A shadow root ignores @font-face, so the face goes on the ERP document itself.
    function addFont(url) {
        if (!url || document.getElementById("autoerp-font")) return;
        const face = document.createElement("style");
        face.id = "autoerp-font";
        face.textContent = `@font-face { font-family: "AutoERP Archivo"; src: url("${url}") format("woff2");
            font-weight: 100 900; font-stretch: 62% 125%; }`;
        document.head.appendChild(face);
    }

    function mountPanel(css) {
        for (const text of [css || "", PANEL_CSS]) {
            const style = document.createElement("style");
            style.textContent = text;
            shadow.appendChild(style);
        }
        shadow.appendChild(parse(PANEL_HTML));
        $("close").addEventListener("click", () => window.__autoerp.stop());
        $("admit").addEventListener("click", downloadAdmitCard);
        $("list").addEventListener("scroll", fadeEdges, { passive: true });
        new ResizeObserver(fadeEdges).observe($("list"));
        document.getElementById("autoerp-panel")?.remove();
        document.body.appendChild(panelHost);
    }

    const run = { type: "positive", cascade: true, queue: [], index: 0, stopped: false };

    function say(text, tone = "") {
        $("msg").className = `note ${tone}`;
        $("msg").textContent = text;
    }

    function mark(status) {
        return status === "failed" ? CROSS : "<i></i>";
    }

    function renderList() {
        const finished = run.queue.filter((form) => ["done", "skipped"].includes(form.status)).length;
        $("progress").hidden = !run.queue.length;
        $("bar").style.width = `${run.queue.length ? (100 * finished) / run.queue.length : 0}%`;
        $("count").textContent = `${finished} of ${run.queue.length} submitted`;
        const rows = run.queue.map((form) => {
            const row = document.createElement("li");
            row.className = form.status === "skipped" ? "done" : form.status;
            row.append(parse(`<span class="mark">${mark(form.status)}</span>`), parse(ROW_TEXT));
            row.querySelector(".meta").textContent = STATUS[form.status]
                ? `${form.subject} · ${STATUS[form.status]}`
                : form.subject;
            row.querySelector(".who").textContent = form.teacher;
            return row;
        });
        $("list").replaceChildren(...rows);
        const active = rows.find((row) => row.className === "active");
        if (active) $("list").scrollTop = active.offsetTop - 60;
        fadeEdges();
    }

    // Each fade grows with the rows hidden past its edge, up to 32px, so it never pops in.
    function fadeEdges() {
        const list = $("list");
        const below = list.scrollHeight - list.clientHeight - list.scrollTop;
        list.style.setProperty("--fade-top", `${Math.min(list.scrollTop, 32)}px`);
        list.style.setProperty("--fade-bottom", `${Math.min(Math.max(below, 0), 32)}px`);
    }

    // The hooks outlive this script (a re-run or a closed panel), so they look up
    // window.__autoerp at call time and hand back to ERP's own dialogs once it is gone.
    function hookFrame() {
        const doc = frameDoc();
        const win = doc?.defaultView;
        if (!win || win.__autoerpHooked) return;
        win.__autoerpHooked = true;
        const erp = { confirm: win.confirm, alert: win.alert, alertBox: win.alertBox };
        // ERP asks "Do you want to save the details?" after every submit.
        win.confirm = (text) => (window.__autoerp ? true : erp.confirm.call(win, text));
        // ERP uses alert() only when the save request itself fails (404/500).
        win.alert = (text) =>
            window.__autoerp ? window.__autoerp.onResult("ALERT", String(text)) : erp.alert.call(win, text);
        win.alertBox = (title, text) =>
            window.__autoerp
                ? window.__autoerp.onResult(String(title), String(text))
                : erp.alertBox?.call(win, title, text);
        doc.addEventListener(
            "keydown",
            (event) => {
                if (!window.__autoerp || event.key !== "Enter" || event.target?.id !== "captchaInput") return;
                event.preventDefault();
                window.__autoerp.submit();
            },
            true
        );
    }

    async function listForms() {
        const forms = [];
        for (const subject of frameDoc().querySelectorAll('input[name="subject"]')) {
            frameDoc()
                .querySelectorAll('input[name="teacherSelection"]')
                .forEach((old) => (old.dataset.autoerpSeen = "1"));
            subject.click();
            const teachers = await waitFor(() => {
                const fresh = [...frameDoc().querySelectorAll('input[name="teacherSelection"]')];
                return fresh.length && !fresh[0].dataset.autoerpSeen ? fresh : null;
            });
            (teachers || []).forEach((teacher) =>
                forms.push({
                    subject: subject.value,
                    teacherId: teacher.value,
                    teacher: labelOf(teacher).split("\n")[0].trim() || teacher.value,
                    status: "pending",
                })
            );
        }
        return forms;
    }

    async function openForm(form) {
        frameDoc().querySelector(`input[name="subject"][value="${form.subject}"]`)?.click();
        const teacher = await waitFor(() =>
            frameDoc().querySelector(`input[name="teacherSelection"][value="${form.teacherId}"]`)
        );
        if (!teacher) return "missing";
        frameDoc()
            .querySelectorAll("textarea")
            .forEach((box) => (box.dataset.autoerpSeen = "1"));
        teacher.click();
        const ready = await waitFor(() => {
            const doc = frameDoc();
            const box = doc.querySelector("textarea");
            return box &&
                !box.dataset.autoerpSeen &&
                doc.querySelector('input[name="subno"]')?.value === form.subject &&
                doc.querySelector('input[name="assignee_id"]')?.value === form.teacherId
                ? doc
                : null;
        });
        if (!ready) return "timeout";
        const captcha = ready.getElementById("captcha_block");
        // A submitted form comes back read-only: no Submit button, captcha hidden.
        if (!ready.getElementById("save_btn") || (captcha && captcha.offsetParent === null))
            return "submitted";
        return "open";
    }

    function presentForm(form) {
        hookFrame();
        const doc = frameDoc();
        const unfilled = fillForm(doc, run.type);
        form.status = "active";
        renderList();
        const captcha = doc.getElementById("captchaInput");
        captcha.value = "";
        captcha.scrollIntoView({ block: "center" });
        captcha.focus();
        say(
            unfilled.length
                ? `${form.subject} - ${form.teacher}: could not fill ${unfilled.join(", ")}. Fill those, then type the captcha and press Enter.`
                : `${form.subject} - ${form.teacher}: type the captcha and press Enter.`,
            unfilled.length ? "err" : ""
        );
    }

    async function next() {
        while (!run.stopped && run.index < run.queue.length) {
            const form = run.queue[run.index];
            say(`Opening ${form.subject} - ${form.teacher}...`);
            const state = await openForm(form);
            if (run.stopped) return;
            if (state === "open") return presentForm(form);
            form.status = state === "submitted" ? "skipped" : "failed";
            renderList();
            run.index++;
        }
        if (!run.stopped) finish();
    }

    function finish() {
        const failed = run.queue.filter((form) => form.status === "failed").length;
        if (failed) {
            say(`${failed} form(s) could not be opened. Open them by hand, then run AutoERP again.`, "err");
            return;
        }
        say(`All ${run.queue.length} feedback forms are submitted.`, "ok");
        $("foot").hidden = false;
    }

    // ERP's own admit card page keeps the roll number, session, semester and exam type in hidden
    // inputs and loads the PDF from getAdmitCard.htm with them. Its "I have read" checkbox only
    // unhides the button; the server never sees it. /Acad/StudentAdmitCard.jsp, the old address,
    // now redirects to noAccess.html.
    async function downloadAdmitCard() {
        say("Fetching admit card...");
        try {
            const page = await fetch("/Academic/StudentAdmitCardDownload.htm", { credentials: "include" });
            const form = new DOMParser().parseFromString(await page.text(), "text/html");
            const field = (id) => form.getElementById(id)?.value || "";
            if (!field("rollno")) throw new Error(`ERP's admit card page did not load (${new URL(page.url).pathname})`);
            const query = new URLSearchParams({
                rollno: field("rollno"),
                ses_no: field("ses_no"),
                semester: field("semester"),
                exam_type: field("exam_type"),
                _ts: Date.now(),
            });
            const response = await fetch(`/Academic/getAdmitCard.htm?${query}`, {
                credentials: "include",
                referrer: "/Academic/StudentAdmitCardDownload.htm",
            });
            const type = response.headers.get("content-type") || "";
            if (!response.ok || !type.includes("pdf")) throw new Error(`ERP sent ${response.status} ${type}`);
            const name = `admitcard-${field("ses_no")}-${field("semester")}-${field("exam")}.pdf`.toLowerCase();
            const link = document.createElement("a");
            link.href = URL.createObjectURL(await response.blob());
            link.download = name;
            link.click();
            say(`Admit card downloaded as ${name}.`, "ok");
        } catch (error) {
            say(
                `Could not download it (${error.message}). Open Academic > Examination TimeTable > DownLoad Admit Card, tick the box and click the button.`,
                "err"
            );
        }
    }

    async function cascade() {
        say("Finding your feedback forms...");
        run.queue = await listForms();
        if (run.stopped) return;
        run.index = 0;
        renderList();
        if (!run.queue.length) say("No feedback forms found on this page.", "err");
        else await next();
    }

    // Returns at once so the popup can close; the cascade keeps going in the page.
    // "no-form" and "no-teacher" leave the page untouched and the popup explains.
    window.__autoerp = {
        start({ type = "positive", cascade: all = true, css, font, wordmark } = {}) {
            const doc = frameDoc();
            if (!doc?.querySelector('input[name="subject"]')) return "no-form";
            const subject = doc.querySelector('input[name="subno"]')?.value;
            const teacherId = doc.querySelector('input[name="assignee_id"]')?.value;
            if (!all && (!subject || !doc.getElementById("save_btn"))) return "no-teacher";

            run.type = TEXT[type] ? type : "positive";
            run.cascade = all;
            addFont(font);
            mountPanel(css);
            if (wordmark) $("title").prepend(parse(wordmark));
            $("mode").textContent = `${run.type[0].toUpperCase()}${run.type.slice(1)}, ${all ? "all forms" : "this form"}`;
            hookFrame();
            if (all) {
                cascade();
                return "started";
            }
            const checked = doc.querySelector('input[name="teacherSelection"]:checked');
            run.queue = [
                {
                    subject,
                    teacherId,
                    teacher: checked ? labelOf(checked).split("\n")[0].trim() : teacherId,
                    status: "pending",
                },
            ];
            run.index = 0;
            presentForm(run.queue[0]);
            return "single";
        },
        submit() {
            if (run.stopped) return;
            say("Submitting...");
            frameDoc()?.getElementById("save_btn")?.click();
        },
        onResult(title, text) {
            const form = run.queue[run.index];
            if (!form) return;
            if (title === "SUCCESS") {
                form.status = "done";
                renderList();
                run.index++;
                if (run.cascade) {
                    say(`Submitted ${form.subject} - ${form.teacher}.`, "ok");
                    setTimeout(next, 600);
                } else say(`Submitted ${form.subject} - ${form.teacher}. Pick the next teacher and start AutoERP again.`, "ok");
                return;
            }
            say(`${form.subject} - ${form.teacher}: ${text} A new captcha is loaded, type it and press Enter.`, "err");
            frameDoc()?.getElementById("refreshCaptcha")?.click();
            const captcha = frameDoc()?.getElementById("captchaInput");
            if (captcha) {
                captcha.value = "";
                captcha.focus();
            }
        },
        stop() {
            run.stopped = true;
            panelHost.remove();
            document.getElementById("autoerp-font")?.remove();
            delete window.__autoerp;
        },
        status: () => ({ index: run.index, forms: run.queue.map((f) => `${f.subject} ${f.teacher}: ${f.status}`) }),
    };
})();
