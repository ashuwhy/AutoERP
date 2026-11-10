// Runs in the page's MAIN world on any erp.iitkgp.ac.in page, so its fetches carry the student's
// ERP session. The popup injects it to see whether every feedback form is in (ERP holds the admit
// card back until they are) and to download the admit card; feedback.js's panel downloads with it too.
window.__autoerpAdmit = {
    // The Feedback Form page lists the subjects; its radios POST for each subject's teachers and
    // each teacher's form, and so does this. A form is submitted when any of its answers has a
    // response_json: the test ERP's page uses to lock it. One request per subject and per teacher,
    // all at once. null when ERP did not answer like a signed-in student's ERP.
    async forms() {
        // A fill running in this tab shares the session these POSTs use; stay out of its way.
        if (window.__autoerp) return null;
        try {
            // Every load of the Feedback Form page gives the session a new security token and
            // retires the old one, so loading it here would leave a form open in this tab failing
            // every submit with "Invalid Security token.". An open form has the same subjects.
            let doc = [document, document.getElementById("myframe")?.contentDocument].find((frame) =>
                frame?.getElementById("studentFeedbackResponseForm"),
            );
            if (!doc) {
                const page = await fetch("/Academic/studentFeedbackResponseView.htm", { credentials: "include" });
                doc = new DOMParser().parseFromString(await page.text(), "text/html");
            }
            const form = doc.getElementById("studentFeedbackResponseForm");
            if (!form) return null;
            const fields = new URLSearchParams(new FormData(form));
            const ask = async (path, change) => {
                const body = new URLSearchParams(fields);
                for (const [key, value] of Object.entries(change)) body.set(key, value);
                const response = await fetch(`/Academic/${path}`, { method: "POST", body, credentials: "include" });
                return response.json();
            };
            const subjects = [...doc.querySelectorAll('input[name="subject"]')].map((radio) => ({
                subno: radio.value,
                sub_type: radio.dataset.subject_type || "",
            }));
            const submitted = await Promise.all(
                subjects.map(async (subject) => {
                    const teachers = await ask("getListsOfTeacherForEachFeedbackSubjects.htm", subject);
                    // A subject whose teachers did not load would otherwise count as nothing pending.
                    if (String(teachers.error) !== "0") throw new Error(teachers.errorsMsg);
                    return Promise.all(
                        (teachers.finalTeacherList || []).map(async ({ assignee_id }) => {
                            const { feedback_answers: answers } = await ask("displayFeedbackQuestions.htm", {
                                ...subject,
                                assignee_id,
                            });
                            return (answers || []).some((answer) => answer.response_json);
                        }),
                    );
                }),
            );
            const each = submitted.flat();
            return { total: each.length, pending: each.filter((done) => !done).length };
        } catch {
            return null;
        }
    },

    // ERP's own admit card page keeps the roll number, session, semester and exam type in hidden
    // inputs and loads the PDF from getAdmitCard.htm with them. Its "I have read" checkbox only
    // unhides the button; the server never sees it. /Acad/StudentAdmitCard.jsp, the old address,
    // now redirects to noAccess.html.
    async download() {
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
            return { ok: true, text: `Admit card downloaded as ${name}.` };
        } catch (error) {
            return {
                ok: false,
                text: `Could not download it (${error.message}). Open Academic > Examination TimeTable > DownLoad Admit Card, tick the box and click the button.`,
            };
        }
    },
};
