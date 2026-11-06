<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="brand/kit/wordmark-dark.svg">
    <img src="brand/kit/wordmark.svg" alt="AutoERP" width="240">
  </picture>
</p>

<p align="center">Fills your end-semester feedback forms on IIT Kharagpur ERP.<br>you type the captcha, i can handle the rest.</p>

<p align="center">
  <a href="https://github.com/ashuwhy/AutoERP/releases/latest/download/autoerp-chrome.zip"><img src="brand/readme/download-chrome.svg" alt="Download for Chrome" height="48"></a>
  &nbsp;
  <a href="https://github.com/ashuwhy/AutoERP/releases/latest/download/autoerp-firefox.zip"><picture><source media="(prefers-color-scheme: dark)" srcset="brand/readme/download-firefox-dark.svg"><img src="brand/readme/download-firefox.svg" alt="Download for Firefox" height="48"></picture></a>
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

If your browser won't take the zip, unzip it and pick the `autoerp-chrome` folder with **Load unpacked**. To update, remove the old AutoERP before you drop in the new zip, or you'll have two.

**Firefox**

1. Download `autoerp-firefox.zip`.
2. Open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on...** and pick the zip.

Firefox drops temporary add-ons when it restarts, so load it again next semester.

## Use

1. Log in to ERP and open **Academic > Feedback > Feedback Form**.
2. Click the AutoERP icon, pick a tone, press **Start filling**.
3. Type each captcha and press `Enter`. The next form opens by itself, and the ones you already submitted are skipped.

The tone sets the ratings, pace, workload and the written answers, and every written answer stays inside ERP's 10-50 word limit. **Open form only** fills just the form in front of you, if you want a different tone for one teacher.

AutoERP does not solve the captcha, only talks to `erp.iitkgp.ac.in`, and collects nothing. See [PRIVACY.md](./PRIVACY.md).

![Dark mode](brand/store/screenshot-3.png)

## More

- Logo kit and store art are in [brand](./brand). [brand/mark.py](./brand/mark.py) draws every icon, the wordmark and the buttons above, from [Forum](https://fonts.google.com/specimen/Forum) and [Archivo](https://github.com/Omnibus-Type/Archivo) (both OFL).
- Bugs go in [issues](https://github.com/ashuwhy/AutoERP/issues). Me: [ashuwhy.com](https://ashuwhy.com).

Copyright 2026 Ashutosh Sharma, all rights reserved. Install it and use it, but don't copy, modify or republish it; [LICENSE](./LICENSE) has the terms.
