# Contributing

Bug reports help most when they come from a feedback week, since that is the only time ERP shows the form. Open an [issue](https://github.com/ashuwhy/AutoERP/issues) with your browser, the AutoERP version from the popup and the panel's text when it stopped. Blur your name and roll number in screenshots.

For code: AutoERP isn't open source (see [LICENSE](../LICENSE)), but you can fork it here to send me a pull request. Opening one means you agree I can use, change and publish your change in AutoERP under any license.

1. Fork the repo and load `extension-src/chrome` with **Load unpacked** in `chrome://extensions`, so an edit shows up after a reload.
2. Change files in `extension-src/chrome/` only. `firefox/` is the same tree with its own manifest, so copy your change over:

   ```sh
   rsync -a --delete --exclude manifest.json extension-src/chrome/ extension-src/firefox/
   ```

3. `npx web-ext lint --source-dir extension-src/firefox` should report 0 errors and 0 warnings.
4. Try it on ERP: a theory form and a lab form if you have both, and the admit card button if you touched it.
5. Open a pull request saying what ERP did, what you changed and how you tested it.

Most breakage comes from ERP changing a page. `js/feedback.js` is the part that talks to ERP, so start there.
