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
    "no-form": "Open Academic > Feedback > Feedback Form in this tab first.",
    "no-teacher": "Pick a subject and a teacher on the form first, or choose All.",
};

options.addEventListener("submit", async (event) => {
    event.preventDefault();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url || new URL(tab.url).hostname !== "erp.iitkgp.ac.in") {
        show("Open ERP in this tab first, then go to Academic > Feedback > Feedback Form.", "err");
        return;
    }
    startButton.disabled = true;
    show("Starting...");
    try {
        const { tone, scope } = choice();
        const target = { tabId: tab.id };
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
        if (START_ERRORS[result]) {
            show(START_ERRORS[result], "err");
            startButton.disabled = false;
            return;
        }
        window.close();
    } catch (error) {
        show(`Could not start: ${error.message}`, "err");
        startButton.disabled = false;
    }
});
