# Privacy

AutoERP sends nothing to me or to anyone else. What it stores stays on your device, and every request it makes goes to ERP.

**Login**, if you set it up in the popup:

- AutoERP keeps your roll number, ERP password and security answers in the extension's local storage (`chrome.storage.local`) on your device. They are not encrypted there, so anyone who can open your browser profile can read them. **Forget** in the popup deletes them, and so does removing AutoERP.
- They go only to ERP's own login pages on `https://erp.iitkgp.ac.in/SSOAdministration/`, in the same requests the login page sends when you type them yourself. The popup also sends your roll number there to fetch your security questions. When ERP makes you change your password, AutoERP puts the saved one in the Current Password box of ERP's own form at `https://erp.iitkgp.ac.in/IIT_ERP3/forcePasswordChange.htm`, and keeps the new one you type there once ERP accepts it.
- You type the OTP. AutoERP sends it to ERP with the rest of the login and never stores it.
- When ERP turns a login down because another session of yours is still open, AutoERP signs out your other ERP sessions and tries again.
- After a login it makes, AutoERP stores the time of that login, so it can tell when you have signed out. The next fill deletes it.

**Feedback forms and admit card:**

- Filling runs only after you press **Start filling**, only on `erp.iitkgp.ac.in`. It reads the feedback form in that tab to fill it, and your list of subjects and teachers to show progress in its panel. That stays in the tab and is gone when you close the panel or the tab.
- When you open the popup with an ERP tab open, AutoERP asks ERP, from that tab, whether your feedback forms are submitted. The popup remembers the count of forms and pending ones, plus your last tone and form choice, in the extension's local storage.
- **Download admit card** fetches the PDF from ERP's own admit card page.

**CDC boards:**

- On CDC's company page (`TPStudent.jsp`), AutoERP reads the page's own list of companies and roles from ERP, and fetches each open or upcoming role's page from ERP in the background (`TPJNFView.jsp`, with your roll number from the page) to read the line where ERP says whether you can apply. When you close ERP's role dialog, it asks that one role's page again, so a role you just applied to or cancelled shows it. It never presses Apply or Cancel and never picks a CV.
- On CDC's notice board (`Notice.jsp`), it reads the page's own list of notices from ERP. It never reads the coordinators' roll numbers in that list.
- It stores on your device, in the extension's local storage: the roles it has seen (so new ones say NEW), ERP's verdict for each role it checked, the names of the companies you applied to (so the notice board can filter to them) and the number of the newest notice you have seen. **Forget CDC data** in the popup's **CDC boards** fold deletes them.
- **Show boards** in the same fold turns the boards off. Off, AutoERP draws nothing on CDC's pages and fetches nothing from them. It stores that choice, and CDC data already stored stays until **Forget CDC data**.

No analytics, no tracking, no remote code, no third-party services.

Questions or problems: [open an issue](https://github.com/ashuwhy/AutoERP/issues) or reach me at [ashuwhy.com](https://ashuwhy.com).

Last updated 2026-11-13.
