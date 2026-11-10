// Content script on erp.iitkgp.ac.in/SSOAdministration/login.htm, the one login page for every
// ERP module and for CDC. It runs in the isolated world: ERP binds its jQuery handlers on the
// DOM, so events dispatched from here still reach them.
//
// ERP's own order: blur on #user_id fetches the security question into #question and unlocks
// #answer; typing an answer enables #getotp; Get OTP checks the password and the answer, mails
// the OTP and only then unlocks #email_otp1. AutoERP walks that far and leaves the OTP to you,
// then logs in with fetch rather than ERP's form post.
(async () => {
    const field = (id) => document.getElementById(id);
    const { login, session } = await chrome.storage.local.get(["login", "session"]);
    if (!field("loginForm") || !login?.roll || !login?.password) return;

    // `session` is AutoERP's own record of a login it made, kept until this page fills again.
    // Landing here from an ERP page while it is still there means you signed out, or ERP timed
    // you out, so filling now would mail an OTP nobody asked for. A reload, or ERP opened fresh
    // (typed, bookmarked, erp.iitkgp.ac.in's own redirect, CDC's link), fills as usual.
    const reloaded = performance.getEntriesByType("navigation")[0]?.type === "reload";
    const cameFrom = document.referrer ? new URL(document.referrer) : null;
    const fromInsideErp =
        cameFrom?.host === location.host && cameFrom.pathname !== "/" && !cameFrom.pathname.startsWith("/SSOAdministration/");
    const signedOut = Boolean(session) && fromInsideErp && !reloaded;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const fire = (el, types) =>
        types.forEach((type) => el.dispatchEvent(new Event(type, { bubbles: true })));
    const questionKey = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();

    async function waitFor(check, timeout = 6000) {
        for (let waited = 0; waited < timeout; waited += 250) {
            const found = check();
            if (found) return found;
            await sleep(250);
        }
        return null;
    }

    const CROSS = `<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>`;

    // The same card as the feedback panel (PANEL_CSS in js/feedback.js), minus the form list.
    const CARD_CSS = `
        :host { all: initial; }
        * { box-sizing: border-box; margin: 0; }
        .card { position: fixed; top: 20px; right: 20px; z-index: 2147483647; width: 300px;
                display: flex; flex-direction: column; gap: 14px; padding: 18px 20px 20px;
                border-radius: 24px; background: var(--paper); color: var(--ink); font: 14px/1.4 var(--font);
                box-shadow: 0 0 0 1px var(--line), 0 18px 44px rgba(27, 24, 20, 0.22); text-align: left; }
        .head { display: flex; align-items: center; gap: 10px; }
        .title { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px; }
        .title .wordmark { height: 20px; }
        .title small { color: var(--muted); font-size: 12px; }`;

    const CARD_HTML = `
        <section class="card" aria-label="AutoERP">
            <div class="head">
                <div class="title" id="title"><small>Login</small></div>
                <button class="round" id="close" aria-label="Close AutoERP">${CROSS}</button>
            </div>
            <p class="note" id="msg" role="status" aria-live="polite"></p>
        </section>`;

    const cardHost = document.createElement("div");
    cardHost.id = "autoerp-login";
    const shadow = cardHost.attachShadow({ mode: "open" });
    const $ = (id) => shadow.getElementById(id);
    const parse = (markup) => new DOMParser().parseFromString(markup, "text/html").body.firstElementChild;
    const fileText = (path) => fetch(chrome.runtime.getURL(path)).then((response) => response.text());

    async function mountCard() {
        const [css, wordmark] = await Promise.all([fileText("css/theme.css"), fileText("images/wordmark.svg")]);
        // A shadow root ignores @font-face, so the face goes on the ERP document itself.
        const face = document.createElement("style");
        face.textContent = `@font-face { font-family: "AutoERP Archivo"; src: url("${chrome.runtime.getURL("fonts/archivo.woff2")}") format("woff2");
            font-weight: 100 900; font-stretch: 62% 125%; }`;
        document.head.appendChild(face);
        for (const text of [css, CARD_CSS]) {
            const style = document.createElement("style");
            style.textContent = text;
            shadow.appendChild(style);
        }
        shadow.appendChild(parse(CARD_HTML));
        $("title").prepend(parse(wordmark));
        $("close").addEventListener("click", () => cardHost.remove());
        document.body.appendChild(cardHost);
    }

    // Whatever AutoERP says answers something you pressed, so a closed card comes back to say it.
    function say(text, tone = "") {
        if (!cardHost.isConnected) document.body.appendChild(cardHost);
        $("msg").className = `note ${tone}`;
        $("msg").textContent = text;
    }

    async function keepAnswer(question, answer) {
        const { login: now } = await chrome.storage.local.get("login");
        if (!answer || now?.roll !== field("user_id").value.trim().toUpperCase()) return;
        if (now.answers?.[question] === answer) return;
        now.answers = { ...now.answers, [question]: answer };
        await chrome.storage.local.set({ login: now });
    }

    async function otpRefused(question, answer, message) {
        const { login: now } = await chrome.storage.local.get("login");
        if (/security question/i.test(message)) {
            if (now?.answers?.[question] === answer) {
                delete now.answers[question];
                await chrome.storage.local.set({ login: now });
            }
            answerByHand();
            return say("ERP says that answer is wrong. Type the right one and press Get OTP; AutoERP keeps the one that works.", "err");
        }
        if (/password/i.test(message) && now?.password === field("password").value) {
            delete now.password;
            await chrome.storage.local.set({ login: now });
            return say("ERP says the saved password is wrong. Save the new one in AutoERP, then reload this page.", "err");
        }
        say(`ERP did not send the OTP. ${message}`, "err");
    }

    // Whoever pressed Get OTP, AutoERP or you, the answer that ERP accepts is the one kept.
    async function awaitOtp(question, answer) {
        const title = await waitFor(() => document.querySelector(".swal2-title")?.textContent.trim(), 20000);
        if (!title) return say("ERP did not answer the OTP request. Press Get OTP to try again.", "err");
        const message = document.querySelector(".swal2-html-container")?.textContent.trim() || "";
        // The page's own test for a refusal, in getEmailOTP().
        if (`${title} ${message}`.toLowerCase().includes("unable to send otp")) return otpRefused(question, answer, message);
        await keepAnswer(question, answer);
        document.querySelector(".swal2-confirm")?.click();
        // SweetAlert gives focus back to Get OTP as it closes, so the OTP box takes it after that.
        await waitFor(() => !document.querySelector(".swal2-container"));
        field("email_otp1").focus();
        say("OTP sent to your email. Type it in the OTP box and press Enter.", "ok");
    }

    // Firefox sends a content script's own fetch as the extension; content.fetch is the page's.
    const pageWindow = globalThis.content;
    const pageFetch = typeof pageWindow?.fetch === "function" ? pageWindow.fetch.bind(pageWindow) : fetch;

    async function post(page, body) {
        const response = await pageFetch(new URL(page, location.href).href, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });
        return { url: response.url, text: await response.text() };
    }

    // A good login redirects into the module it came from. Anything that stays under
    // /SSOAdministration/ is ERP saying no.
    const refused = (reply) => new URL(reply.url).pathname.startsWith("/SSOAdministration/");
    const otpWrong = (reply) => /otp mismatch/i.test(reply.text);

    function refusal(reply) {
        const page = new DOMParser().parseFromString(reply.text, "text/html");
        if (page.getElementById("loginForm")) {
            return "ERP sent its login page back without a reason, even after signing out other sessions. Press Get OTP for a new OTP and try again.";
        }
        return `ERP did not log you in. ${page.body.textContent.replace(/\s+/g, " ").trim().slice(0, 200)}`;
    }

    // ERP's Log In posts #loginForm, and with four password fields on it Chrome reads that post as
    // a change of password and offers to overwrite the saved one with the answer or the OTP. The
    // same fields sent with fetch post no form. A refusal with no redirect usually means another
    // ERP session of yours is still open; metakgp's erp.py clears those and sends the same OTP again.
    async function logIn() {
        const otpBox = field("email_otp1");
        const button = field("loginFormSubmitButton");
        if (!otpBox.value.trim()) return otpBox.focus();
        if (button.disabled) return;
        button.disabled = true;
        say("Logging in...");
        const form = new URLSearchParams(new FormData(field("loginForm")));
        form.set("email_otp", otpBox.value);
        try {
            let reply = await post("auth.htm", form.toString());
            if (refused(reply) && !otpWrong(reply)) {
                say("ERP turned the login down, which usually means another ERP session of yours is open. Signing it out and trying once more...");
                await post("clearAllSessions.htm", new URLSearchParams({ user_code: form.get("user_id") }).toString());
                reply = await post("auth.htm", form.toString());
            }
            if (!refused(reply)) {
                await chrome.storage.local.set({ session: { at: Date.now() } });
                return location.assign(reply.url);
            }
            if (otpWrong(reply)) {
                otpBox.value = "";
                otpBox.focus();
                say("ERP says that OTP is wrong. Type it again and press Enter.", "err");
            } else {
                say(refusal(reply), "err");
            }
        } catch {
            say("Could not reach ERP. Check your connection and press Log In again.", "err");
        }
        button.disabled = false;
    }

    // Caught on the way down, the click never reaches ERP's own handler on the button.
    window.addEventListener(
        "click",
        (event) => {
            if (!event.target.closest?.("#loginFormSubmitButton")) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            logIn();
        },
        true,
    );

    // As text, the OTP box is not one more password field for a password manager to save. ERP's
    // eye icon beside it would turn it back into one two seconds after a click. Even as text,
    // typing in it still drew Chrome's "Update password?": a keystroke in any field of #loginForm
    // makes Chrome keep the whole form, script-filled password fields included. A form attribute
    // naming no element leaves the box where it is but owned by no form, so logIn() adds it.
    field("email_otp1").setAttribute("form", "autoerp-otp");
    field("email_otp1").type = "text";
    field("email_otp1").autocomplete = "one-time-code";
    field("email_otp1").inputMode = "numeric";
    field("toggleEmail_otp")?.remove();

    // An answer you type would draw the same prompt. Get OTP posts $("#loginForm").serialize(), so
    // #answer cannot just leave the form like the OTP box: it leaves, and a hidden copy in the form
    // carries what you type. ERP never sets #answer itself, so input keeps the copy current.
    function answerByHand() {
        const box = field("answer");
        if (box.form !== field("loginForm")) return;
        const copy = Object.assign(document.createElement("input"), { type: "hidden", name: "answer", value: box.value });
        field("loginForm").append(copy);
        box.setAttribute("form", "autoerp-answer");
        box.type = "text";
        box.autocomplete = "off";
        box.style.setProperty("-webkit-text-security", "disc");
        box.addEventListener("input", () => (copy.value = box.value));
        field("toggleAnswer")?.remove();
    }

    field("getotp").addEventListener("click", () =>
        awaitOtp(questionKey(field("question").textContent), field("answer").value),
    );
    // Log In is a plain button, so Enter in a field does nothing on ERP's page.
    field("email_otp1").addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        logIn();
    });

    await mountCard();
    if (signedOut) return say("Signed out of ERP. AutoERP logs you in again when you reload this page.");
    await chrome.storage.local.remove("session");
    say(`Logging in as ${login.roll}...`);
    field("user_id").value = login.roll;
    field("password").value = login.password;
    fire(field("password"), ["input", "change"]);
    fire(field("user_id"), ["input", "change", "blur"]);

    if (!(await waitFor(() => !field("answer").readOnly, 10000))) {
        return say("ERP did not show a security question. Check the roll number saved in AutoERP, then reload this page.", "err");
    }
    const answer = login.answers?.[questionKey(field("question").textContent)];
    if (!answer) {
        answerByHand();
        say("New security question. Type its answer and press Get OTP; AutoERP keeps it for next time.");
        field("answer").focus();
        return;
    }
    field("answer").value = answer;
    fire(field("answer"), ["input", "change"]);
    say("Asking ERP for an OTP...");
    field("getotp").click();
})();
