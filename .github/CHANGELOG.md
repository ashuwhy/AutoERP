# CHANGELOG

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
