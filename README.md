<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/kit/wordmark-dark.svg">
    <img src="brand/kit/wordmark.svg" alt="AutoERP" width="240">
  </picture>
</p>

<p align="center">Fills your IIT Kharagpur ERP and CDC login up to the OTP,<br>and your end-semester feedback forms.</p>

<p align="center">
  <a href="https://github.com/ashuwhy/AutoERP/releases/latest/download/autoerp-chrome.zip"><img src="brand/readme/download-chrome.svg" alt="Download for Chrome" height="48"></a>
  &nbsp;
  <a href="https://addons.mozilla.org/en-US/firefox/addon/autoerp/"><picture><source media="(prefers-color-scheme: dark)" srcset="brand/readme/add-firefox-dark.svg"><img src="brand/readme/add-firefox.svg" alt="Add to Firefox" height="48"></picture></a>
</p>

<p align="center">
  <a href="https://github.com/ashuwhy/AutoERP/releases"><picture><source media="(prefers-color-scheme: dark)" srcset="https://autoerp-downloads.ashu-inc.workers.dev/?theme=dark"><img src="https://autoerp-downloads.ashu-inc.workers.dev/" alt="Downloads" height="36"></picture></a>
</p>

![The AutoERP popup](brand/store/screenshot-1.png)

## Install

**Chrome, Edge, Brave, Arc**

1. Download `autoerp-chrome.zip` with the button above.
2. Open `chrome://extensions` and turn on **Developer mode**, top right.
3. Drag the zip onto that page. No need to unzip it.

If your browser won't take the zip, unzip it and pick the `autoerp-chrome` folder with **Load unpacked**. To update, remove the old AutoERP before you drop in the new zip, or you'll have two. Removing it deletes your saved login too, so set that up again after.

**Firefox**

AutoERP is on [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/autoerp/). Open it, click **Add to Firefox**, and Firefox keeps it updated from then on.

## Use

**Login**

1. Click the AutoERP icon and open **Login**. Type your roll number and ERP password, press **Continue**, answer the three security questions ERP sends back and press **Save login**.
2. Open ERP or CDC (or press **Open ERP**). AutoERP fills the roll number, password and security answer, and asks ERP to mail you the OTP.
3. Type the OTP and press `Enter`.

AutoERP asks for the OTP only on a login page in front of you, and at most once in ten minutes. A tab that loaded in the background or came back after a browser restart is filled, and you press Get OTP. If ERP asks you for a new password after the OTP, AutoERP fills the current one and saves the new one once ERP accepts it.

Once you log out, AutoERP leaves the login page alone until you reload it. Your login stays on your computer, unencrypted, and goes only to ERP's login and password-change pages.

**Feedback forms**

1. Log in to ERP.
2. Click the AutoERP icon, open **Admit card download**, pick a tone and press **Start filling**. If **Academic > Feedback > Feedback Form** isn't open, AutoERP clicks its way there first.
3. Type each captcha and press `Enter`. The next form opens by itself, and the ones you already submitted are skipped.

The tone sets the ratings, pace, workload and the written answers, and every written answer stays inside ERP's 10-50 word limit. **Open form only** fills just the form in front of you, if you want a different tone for one teacher.

Once ERP has every form, the fold shows **Download admit card** instead.

AutoERP does not solve the captcha or read your mail for the OTP, only talks to `erp.iitkgp.ac.in`, and sends nothing to me or anyone else. See [PRIVACY.md](./PRIVACY.md).

![Dark mode](brand/store/screenshot-3.png)

## More

- Logo kit and store art are in [brand](./brand). [brand/mark.py](./brand/mark.py) draws every icon, the wordmark and the buttons above, from [Forum](https://fonts.google.com/specimen/Forum) and [Archivo](https://github.com/Omnibus-Type/Archivo) (both OFL).
- Bugs go in [issues](https://github.com/ashuwhy/AutoERP/issues). Me: [ashuwhy.com](https://ashuwhy.com).

MIT licensed, see [LICENSE](./LICENSE). The AutoERP name and logo aren't part of that grant, so a fork should ship under its own.
