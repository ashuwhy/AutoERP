# Privacy

AutoERP sends nothing to me or to anyone else. What it stores stays on your device, and every request it makes goes to ERP.

**Login**, if you set it up in the popup:

- AutoERP keeps your roll number, ERP password and security answers in the extension's local storage (`chrome.storage.local`) on your device. They are not encrypted there, so anyone who can open your browser profile can read them. **Forget** in the popup deletes them, and so does removing AutoERP.
- They go only to ERP's own login pages on `https://erp.iitkgp.ac.in/SSOAdministration/`, in the same requests the login page sends when you type them yourself. The popup also sends your roll number there to fetch your security questions.
- You type the OTP. AutoERP sends it to ERP with the rest of the login and never stores it.
- When ERP turns a login down because another session of yours is still open, AutoERP signs out your other ERP sessions and tries again.
- After a login it makes, AutoERP stores the time of that login, so it can tell when you have signed out. The next fill deletes it.

**Feedback forms and admit card:**

- Filling runs only after you press **Start filling**, only on `erp.iitkgp.ac.in`. It reads the feedback form in that tab to fill it, and your list of subjects and teachers to show progress in its panel. That stays in the tab and is gone when you close the panel or the tab.
- When you open the popup with an ERP tab open, AutoERP asks ERP, from that tab, whether your feedback forms are submitted. The popup remembers the count of forms and pending ones, plus your last tone and form choice, in the extension's local storage.
- **Download admit card** fetches the PDF from ERP's own admit card page.

No analytics, no tracking, no remote code, no third-party services.

Questions or problems: [open an issue](https://github.com/ashuwhy/AutoERP/issues) or reach me at [ashuwhy.com](https://ashuwhy.com).

Last updated 2026-11-10.
