# CHANGELOG

## 2.2.0 (2026-11-13)


### Bug Fixes

* **Login**: AutoERP no longer mails you an OTP from an ERP tab you aren't looking at ([#1](https://github.com/ashuwhy/AutoERP/issues/1)). It still fills the login page anywhere, but presses Get OTP only when the page is in front of you, and at most once in ten minutes. A tab loading in the background, a window behind another app, a tab Chrome or Firefox restored at startup, and a page Chrome loaded ahead while you typed the address now wait for you to press Get OTP

### Features

* **Password change**: when ERP's new security policy sends you to **Mandatory ERP Password Update** after the OTP, AutoERP fills in your current password, and once ERP accepts the new one it saves that in place of the old, so the next login fills the new password

## 2.1.1 (2026-11-10)


### Bug Fixes

* **Feedback**: submitting a feedback form no longer fails with "Invalid Security token." after you open the popup. In 2.1.0 the popup loaded ERP's Feedback Form page to count your pending forms, and every load of that page gives you a new security token and retires the one in the form you already had open. The popup now reads the open form instead
* when ERP does answer "Invalid Security token.", AutoERP puts a fresh token into the form and loads a new captcha, so you type the captcha once more instead of looping on it
* still open: with ERP in two tabs, opening the popup on one retires the token of a form open in the other. AutoERP recovers it on submit; a form you fill by hand there needs a reload

## 2.1.0 (2026-11-10)


### Features

* **Login**: save your roll number, ERP password and security answers in the popup once, and AutoERP fills ERP's login page up to the OTP. You type the OTP and press `Enter`. CDC logs in through the same page, so it is covered too
* the popup asks ERP for your three security questions after you type your roll number and password, so you answer all three up front. If the login page shows one AutoERP doesn't know, you type it there once and it is saved
* AutoERP sends the login itself after the OTP. When ERP turns it down because another session of yours is still open, it signs that session out and tries again
* after you log out, AutoERP leaves the login page alone until you reload it, instead of logging you straight back in
* ERP's OTP box no longer counts as a password field, so Chrome stops offering to save the OTP as your new password
* **Open ERP** in the popup, once your login is saved
* **Admit card download**: each time you open the popup with ERP open, it asks ERP whether all your feedback forms are submitted. If they are, the fold shows only **Download admit card**. If not, it says how many are pending and shows Tone, Forms and Start filling. **Fill forms anyway** brings those back regardless
* the popup is two folds, Login and Admit card download, and the one you had open last opens next time

### License

* from 2.1.0 AutoERP is MIT licensed, see [LICENSE](../LICENSE). The AutoERP name and logo aren't part of that grant. 2.0.4 stays all rights reserved

## 2.0.4 (2026-11-07)


### Features

* **Start filling** opens **Academic > Feedback > Feedback Form** by itself when it isn't open, from ERP's home page or the Academic menu, with the same clicks a student makes
* the popup asks you to log in when the ERP tab is on the login page

### License

* from 2.0.4 AutoERP is all rights reserved, see [LICENSE](../LICENSE), and both zips include it. 2.0.3 and earlier stay under AGPL-3.0

## 2.0.3 (2026-11-07)


### Bug Fixes

* Firefox: the add-on ID is now `autoerp@ashuwhy.com`. Firefox Add-ons rejected `autoerp@ashuwhy` as a duplicate, so the listing there uses the new ID

## 2.0.2 (2026-11-07)


### Bug Fixes

* **Download admit card** works again. ERP moved the admit card to `/Academic/getAdmitCard.htm`, and the old `/Acad/StudentAdmitCard.jsp` now redirects to its no-access page, so the button saved an HTML error page instead of the PDF
* the PDF is named after the session, semester and exam, e.g. `admitcard-2026-2027-autumn-end.pdf`

## 2.0.1 (2026-11-07)


### Features

* the form list in the panel fades and blurs out where it is cut off
* the popup intro fits on one line

## 2.0.0 (2026-11-06)


### Features

* AutoERP's popup, panel and icon
* works with the new ERP feedback page, which loads forms in an iframe over AJAX
* fills theory and lab forms by option label instead of fixed question numbers
* cascades through every subject and teacher and skips forms already submitted
* in-page progress panel, and dark mode in true black
* `Enter` in the captcha box submits the form
