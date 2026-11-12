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

function remember(change) {
    try {
        localStorage.setItem("autoerp", JSON.stringify({ ...saved(), ...change }));
    } catch {}
}

function choice() {
    return { tone: options.tone.value, scope: options.scope.value };
}

const admit = document.getElementById("admit");

// ERP's answer the last time a popup asked about the feedback forms, { total, pending }. The fold
// opens on it, so it does not jump when this popup's own check comes back.
let forms = saved().forms;
// Fill forms anyway: Start filling back for this popup, should ERP's answer ever be wrong.
let filling = false;

function refresh() {
    const { tone, scope } = choice();
    document.getElementById("tone-hint").textContent = TONE_HINT[tone];
    document.getElementById("scope-hint").textContent = SCOPE_HINT[scope];
    const allIn = forms?.pending === 0 && !filling;
    options.hidden = allIn;
    admit.hidden = !allIn;
    const state = document.getElementById("feedback-state");
    if (allIn) {
        state.textContent = forms.total ? `all ${forms.total} submitted` : "no forms open";
        document.getElementById("admit-hint").textContent = forms.total
            ? `All ${forms.total} feedback forms are submitted, so ERP lets you download it.`
            : "ERP has no feedback forms open for you.";
    } else if (forms?.pending) state.textContent = `${forms.pending} of ${forms.total} pending`;
    else {
        const toneName = options.querySelector('[name="tone"]:checked + span').textContent;
        state.textContent = `${toneName} · ${scope === "all" ? "all forms" : "open form"}`;
    }
    remember({ tone, scope });
}

function show(text, tone = "", note = status) {
    note.className = `note ${tone}`;
    note.textContent = text;
    note.hidden = false;
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
        await chrome.scripting.executeScript({ target, world: "MAIN", files: ["js/admit.js", "js/feedback.js"] });
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

// Every ERP tab shares one session, so any will do; the one in front goes first. The login page
// has no session to ask with.
async function erpTab() {
    const tabs = await chrome.tabs.query({ url: "*://erp.iitkgp.ac.in/*" });
    return tabs
        .filter((tab) => !new URL(tab.url).pathname.startsWith("/SSOAdministration/"))
        .sort((a, b) => b.active - a.active)[0];
}

async function inErp(tab, call) {
    const target = { tabId: tab.id };
    await chrome.scripting.executeScript({ target, world: "MAIN", files: ["js/admit.js"] });
    const [{ result }] = await chrome.scripting.executeScript({ target, world: "MAIN", func: call });
    return result;
}

// With no ERP tab the fold keeps what it showed. With one, a check that gets no answer drops an
// old "all submitted", so a stale or wrong answer can never leave Start filling hidden.
async function checkForms() {
    const tab = await erpTab();
    if (!tab) return;
    let found = null;
    try {
        found = await inErp(tab, () => window.__autoerpAdmit.forms());
    } catch {
        // A discarded or closing tab takes no script.
    }
    if (!found && forms?.pending !== 0) return;
    forms = found || undefined;
    remember({ forms });
    refresh();
}

checkForms();

document.getElementById("admit-fill").addEventListener("click", () => {
    filling = true;
    refresh();
});

admit.addEventListener("submit", async (event) => {
    event.preventDefault();
    const note = document.getElementById("admit-msg");
    const tab = await erpTab();
    if (!tab) return show("Open ERP and log in first, then press Download again.", "err", note);
    const go = document.getElementById("admit-go");
    go.disabled = true;
    show("Fetching admit card...", "", note);
    try {
        const { ok, text } = await inErp(tab, () => window.__autoerpAdmit.download());
        show(text, ok ? "ok" : "err", note);
    } catch (error) {
        show(`Could not download it: ${error.message}`, "err", note);
    }
    go.disabled = false;
});

// js/login.js reads this on ERP's login page. The popup collects all three security answers up
// front; login.js still learns a new one typed on the page, and drops the password when ERP
// turns it down, which brings the fields back here.
const loginForm = document.getElementById("login");
const loginGo = document.getElementById("login-go");
const loginMsg = document.getElementById("login-msg");
const asks = document.getElementById("login-asks");

// The same key login.js looks answers up by.
const questionKey = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();

async function savedLogin() {
    return (await chrome.storage.local.get("login")).login;
}

function loginSay(text, tone = "") {
    loginMsg.className = `note ${tone}`;
    loginMsg.textContent = text;
    loginMsg.hidden = !text;
}

function showStep(step, hint) {
    document.getElementById("login-account").hidden = step !== "account";
    document.getElementById("login-answers").hidden = step !== "answers";
    document.getElementById("login-saved").hidden = step !== "saved";
    loginGo.hidden = step === "saved";
    loginGo.disabled = false;
    document.getElementById("open-erp").hidden = step !== "saved";
    loginGo.textContent = step === "answers" ? "Save login" : "Continue";
    document.getElementById("login-hint").textContent = hint;
}

async function showLogin() {
    const login = await savedLogin();
    const known = Object.keys(login?.answers || {}).length;
    const state = document.getElementById("login-state");
    state.className = "state";
    loginSay("");
    loginForm.reset();
    loginForm.password.required = true;
    loginForm.password.placeholder = "ERP password";
    if (!login?.roll) {
        state.textContent = "not set up";
        return showStep("account", "Fills ERP's login, which CDC uses too, up to the OTP. Kept on this device and sent only to ERP.");
    }
    if (!login.password) {
        state.textContent = "password needed";
        state.classList.add("err");
        loginForm.roll.value = login.roll;
        return showStep("account", "ERP turned down the saved password. Type the new one.");
    }
    state.textContent = `${login.roll} · ${known >= 3 ? "ready" : `${known} of 3 answers`}`;
    document.getElementById("login-roll").textContent = login.roll;
    showStep(
        "saved",
        known >= 3
            ? "All 3 security answers saved. On ERP's login page you type only the OTP."
            : `${known} of 3 security answers saved. Press Edit to add the rest.`,
    );
}

// Every call answers with one of the roll's three questions at random, and needs no session, so
// a few calls without cookies find all three without touching a login page or sending an OTP.
async function askQuestions(roll) {
    const found = new Map();
    for (let asked = 0; asked < 15 && found.size < 3; asked += 3) {
        const replies = await Promise.all(
            [0, 1, 2].map(() =>
                fetch("https://erp.iitkgp.ac.in/SSOAdministration/getSecurityQues.htm", {
                    method: "POST",
                    credentials: "omit",
                    body: new URLSearchParams({ user_id: roll }),
                }).then((response) => (response.ok ? response.text() : Promise.reject(new Error(response.status)))),
            ),
        );
        for (const reply of replies) {
            if (reply.trim() === "FALSE") return null;
            // ERP's page shows the reply as HTML, so its entities are decoded there too.
            const question = new DOMParser().parseFromString(reply, "text/html").body.textContent.trim();
            if (question) found.set(questionKey(question), question);
        }
    }
    return [...found.values()];
}

async function showQuestions() {
    const roll = loginForm.roll.value.trim().toUpperCase();
    const login = await savedLogin();
    if (!loginForm.password.value && login?.roll !== roll) {
        loginForm.password.required = true;
        return loginForm.reportValidity();
    }
    loginGo.disabled = true;
    loginGo.textContent = "Asking ERP...";
    loginSay("");
    let questions;
    try {
        questions = await askQuestions(roll);
    } catch {
        loginSay("Could not reach ERP. Check your connection and press Continue again.", "err");
        loginGo.disabled = false;
        loginGo.textContent = "Continue";
        return;
    }
    if (!questions?.length) {
        loginSay(`ERP has no account with roll number ${roll}.`, "err");
        loginGo.disabled = false;
        loginGo.textContent = "Continue";
        return;
    }
    const answers = login?.roll === roll ? login.answers || {} : {};
    asks.replaceChildren(
        ...questions.map((question) => {
            const row = document.createElement("label");
            const text = document.createElement("span");
            const input = document.createElement("input");
            text.textContent = question;
            input.dataset.key = questionKey(question);
            input.value = answers[input.dataset.key] || "";
            input.placeholder = "Answer";
            input.autocomplete = "off";
            input.spellcheck = false;
            row.append(text, input);
            return row;
        }),
    );
    document.getElementById("login-for").textContent = roll;
    showStep(
        "answers",
        questions.length < 3
            ? `ERP showed only ${questions.length} of 3 questions. AutoERP asks for the other on ERP's page when it comes up.`
            : "ERP asks one of these at random on each login.",
    );
    (asks.querySelector("input:placeholder-shown") || asks.querySelector("input")).focus();
}

async function keepLogin() {
    const roll = loginForm.roll.value.trim().toUpperCase();
    const login = await savedLogin();
    const same = login?.roll === roll;
    // A blank password while editing keeps the saved one; a new roll starts the answers over.
    const answers = same ? { ...login.answers } : {};
    for (const input of asks.querySelectorAll("input")) {
        const answer = input.value.trim();
        if (answer) answers[input.dataset.key] = answer;
        else delete answers[input.dataset.key];
    }
    const password = loginForm.password.value || (same ? login.password : "");
    await chrome.storage.local.set({ login: { roll, password, answers } });
    showLogin();
}

loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (document.getElementById("login-answers").hidden) showQuestions();
    else keepLogin();
});

document.getElementById("login-back").addEventListener("click", () => {
    loginSay("");
    showStep("account", "");
});

document.getElementById("login-edit").addEventListener("click", async () => {
    const login = await savedLogin();
    loginForm.roll.value = login.roll;
    loginForm.password.required = false;
    loginForm.password.placeholder = "Password (blank keeps the saved one)";
    showStep("account", "Continue fetches your questions again, with the saved answers filled in.");
    loginForm.password.focus();
});

// ERP's home sends a signed-out visit to the login page, where js/login.js takes over.
document.getElementById("open-erp").addEventListener("click", async () => {
    await chrome.tabs.create({ url: "https://erp.iitkgp.ac.in/IIT_ERP3/" });
    window.close();
});

document.getElementById("forget").addEventListener("click", async () => {
    await chrome.storage.local.remove(["login", "session", "otpAt"]);
    showLogin();
});

for (const group of document.querySelectorAll("details")) {
    group.addEventListener("toggle", () => remember({ open: document.querySelector("details[open]")?.id || "" }));
}

// The group you had open last comes back open. Before you pick one, or when ERP has turned the
// password down, Login opens if it needs you.
showLogin().then(async () => {
    const login = await savedLogin();
    const ready = Boolean(login?.roll && login.password);
    const { open } = saved();
    const id = login?.roll && !ready ? "login-group" : (open ?? (ready ? "feedback-group" : "login-group"));
    if (id) document.getElementById(id).open = true;
});
