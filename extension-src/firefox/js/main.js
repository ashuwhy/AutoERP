const options = document.getElementById("options");
const startButton = document.getElementById("start");
const status = document.getElementById("status");

const TONE_HINT = {
    positive: "Excellent or Very good, pace Just Right.",
    neutral: "Very good or Good, workload a bit Heavy.",
    negative: "Fair or Poor, pace off, workload Heavy.",
};
const SCOPE_HINT = {
    all: "Every pending form in turn, done ones skipped.",
    one: "Only the form open right now.",
};

document.getElementById("version").textContent = chrome.runtime.getManifest().version;

// Inline rather than <img>, so the wordmark takes the theme's ink and red. The page panel
// gets the same file.
const wordmark = fetch("images/wordmark.svg").then((response) => response.text());
wordmark.then((svg) =>
    document.getElementById("name").prepend(new DOMParser().parseFromString(svg, "text/html").body.firstElementChild),
);

function saved() {
    try {
        return JSON.parse(localStorage.getItem("autoerp") || "{}");
    } catch {
        return {};
    }
}

function choice() {
    return { tone: options.tone.value, scope: options.scope.value };
}

function refresh() {
    const { tone, scope } = choice();
    document.getElementById("tone-hint").textContent = TONE_HINT[tone];
    document.getElementById("scope-hint").textContent = SCOPE_HINT[scope];
    try {
        localStorage.setItem("autoerp", JSON.stringify({ tone, scope }));
    } catch {}
}

function show(text, tone = "") {
    status.className = `note ${tone}`;
    status.textContent = text;
    status.hidden = false;
}

const last = saved();
if (TONE_HINT[last.tone]) options.tone.value = last.tone;
if (SCOPE_HINT[last.scope]) options.scope.value = last.scope;
refresh();
options.addEventListener("change", refresh);

// The page panel cannot read extension files from the MAIN world, so the popup
// hands it the same theme.css it uses itself.
async function panelCss() {
    return (await fetch("css/theme.css")).text();
}

const START_ERRORS = {
    "no-form": "Could not open the Feedback Form from here. Open Academic > Feedback > Feedback Form, then press Start filling again.",
    "no-teacher": "Pick a subject and a teacher on the form first, or choose All.",
};

function fail(text) {
    show(text, "err");
    startButton.disabled = false;
}

// Runs in the page. ERP sends addresses typed or set from a script to noAccess.html, so the way
// to the form is the clicks a student makes: Academic on the home page, then Feedback Form in
// its menu. Each call takes one step and says where it got to. The menu arrives after the page
// does, so later steps wait for their link.
function stepToForm(want) {
    const hasForm = () =>
        document.getElementById("myframe")?.contentDocument?.querySelector('input[name="subject"]');
    const link = (name) =>
        [...document.querySelectorAll("a, [onclick]")].find((el) => el.textContent.trim().toLowerCase() === name);
    const patience = want === "start" ? 3000 : 15000;
    const started = Date.now();
    return new Promise((resolve) => {
        (function look() {
            if (hasForm()) return resolve("form");
            const feedback = want !== "form" && link("feedback form");
            const academic = want === "start" && link("academic");
            if (feedback || academic) {
                (feedback || academic).click();
                return resolve(feedback ? "feedback" : "academic");
            }
            if (Date.now() - started > patience) return resolve("lost");
            setTimeout(look, 250);
        })();
    });
}

const STEP_NOTE = { academic: "Opening Academic...", feedback: "Opening the Feedback Form..." };

async function loaded(tabId) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (let waited = 0; waited < 15000; waited += 250) {
        if ((await chrome.tabs.get(tabId)).status === "complete") return;
        await new Promise((resolve) => setTimeout(resolve, 250));
    }
}

async function reachForm(target) {
    let want = "start";
    for (let hop = 0; hop < 4; hop++) {
        let where;
        try {
            [{ result: where }] = await chrome.scripting.executeScript({
                target,
                world: "MAIN",
                func: stepToForm,
                args: [want],
            });
        } catch {
            // The page navigated away while the step was waiting; try the same step on the new one.
        }
        if (where === "form" || where === "lost") return where;
        if (where) {
            show(STEP_NOTE[where]);
            want = where === "academic" ? "feedback" : "form";
        }
        await loaded(target.tabId);
    }
    return "lost";
}

options.addEventListener("submit", async (event) => {
    event.preventDefault();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab?.url ? new URL(tab.url) : null;
    if (url?.hostname !== "erp.iitkgp.ac.in" || url.pathname.startsWith("/SSOAdministration/")) {
        show("Open ERP in this tab and log in first.", "err");
        return;
    }
    startButton.disabled = true;
    show("Starting...");
    try {
        const { tone, scope } = choice();
        const target = { tabId: tab.id };
        if ((await reachForm(target)) !== "form") return fail(START_ERRORS["no-form"]);
        await chrome.scripting.executeScript({ target, world: "MAIN", files: ["js/feedback.js"] });
        const [{ result }] = await chrome.scripting.executeScript({
            target,
            world: "MAIN",
            func: (settings) => window.__autoerp.start(settings),
            args: [
                {
                    type: tone,
                    cascade: scope === "all",
                    css: await panelCss(),
                    font: chrome.runtime.getURL("fonts/archivo.woff2"),
                    wordmark: await wordmark,
                },
            ],
        });
        if (START_ERRORS[result]) return fail(START_ERRORS[result]);
        window.close();
    } catch (error) {
        fail(`Could not start: ${error.message}`);
    }
});
