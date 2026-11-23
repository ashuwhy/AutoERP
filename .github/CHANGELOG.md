# CHANGELOG

## 2.6.0 (2026-11-23)


### Features

* **CDC notice board**: **Forms to fill** counts only the forms that are yours. A form whose list leaves you out, or whose companies all read not eligible, missed or closed on the company board, shows **Not in this list**, **Not eligible**, **Missed** or **Not applied** in grey in place of **Mark filled**, and the label changes as soon as the company board or the notice's attachment says otherwise. A notice with several form links has a **Mark filled** after each, and in a Multiple Companies notice each form belongs to the company on its line

### Fixes

* **CDC company board**: ERP's "department not allowed" reads **Not eligible**, with ERP's sentence in the hover, and AutoERP asks again on each visit while the role is open, in case CDC opens it to more departments. Before, it read Check on ERP

## 2.5.0 (2026-11-16)


### Features

* **CDC notice board**: notice text keeps ERP's line breaks and blank lines, and its links, which open in a new tab. AutoERP reads each notice's own page from ERP for it, once, and keeps the text
* **CDC notice board**: a tag on each notice says what it asks of you, a form to fill with its deadline, or a list you are in
* **CDC notice board**: a notice with a form link has a **Mark filled** checkbox after the link. A **Forms to fill** chip counts the open forms you have not marked **Filled** and filters to them. The marks stay on this device; **Forget CDC data** clears them
* **CDC company board**: the **Closed** tab asks ERP about each closed role you did not apply to, once, the first time you open it: newest first, three at a time, each row reading Checking until its answer lands. A role you could have applied to reads **Missed**; Not eligible and Applied read as before. A closed role's answer can't change, so it is kept for good: reloading the page or pressing Check eligibility again never asks about it again. Before, every closed role read Check on ERP
* **CDC company board**: Open now and Opens soon list **Can apply** roles first, then Check on ERP, Applied and Not eligible. Rows move only when you change the tab, search or a filter, never while answers land. Closed keeps its newest-first order
* **CDC company board**: a **sort** menu beside the search: Closing soonest (Opening soonest on Opens soon, Closed most recently on Closed), Highest CTC and Company A-Z. Highest CTC puts rupee amounts first, high to low, then other currencies by code, since AutoERP guesses no exchange rate, then CTCs ERP gives as free text. AutoERP keeps your pick for the next visit
* **CDC company board**: a search marks what it matched in the company and role, and when another tab holds more matches than the one you are on, a line under the list says so ("3 more in Closed, show") and takes you there
* **CDC notice board**: a search marks what it matched in the subject and text, and a notice whose text matches opens in full, with "less" to fold it. Clearing the search folds it again
* **CDC notice board**: AutoERP reads each notice's attachment for your roll number and tags the notice **You're in this list** or **Not in this list**. A list with no roll numbers in it, like a job description, gets no tag. On open it reads every attachment it has not read yet, newest first, three at a time, and the count reads "Reading PDFs 4 of 30" until it is done; a search or filter moves the notices it shows to the front. A roll in the notice's own text counts too. **Lists with me** filters to the notices you are in. The roll comes from the company page, or from your saved login; with neither, one line asks you to open the company page once, and nothing is fetched. Only the answer is kept, never the file or its text, so a reload reads nothing again. pdf.js 6.4.299 does the reading, inside the extension

### Fixes

* **CDC company board**: with **Hide not eligible** on, a role that turns Not eligible while the board checks it now leaves the list, and "N hidden, show" counts it. Before, it stayed where it was, often near the top, until you changed the tab or the search
* **CDC company board**: a role you applied to no longer reads NEW, whether ERP's list says Applied or its role page does during the check. NEW is what this browser has not seen, so a role you applied to from another browser or your phone read NEW here
* **CDC company board**: a closed role ERP gave no plain answer on reads **Closed** instead of **Check on ERP**, with ERP's own sentence on hover; there is nothing left to check once a role closes
* **CDC company board**: "N hidden, show" stays beside **Hide not eligible**. At some window widths (around 1300-1430 px) Hide fit beside the tabs and the link dropped to a line of its own under them
* **CDC notice board**: on a narrow window or a phone, the first notice no longer sits flush against the category chips; the list keeps the same gap under them as on a wide window
* **CDC notice board**: a notice with an apostrophe in its text ("company's", "won't") now shows in full, and a search finds words past the apostrophe. Before, the text stopped at the first apostrophe; 15 of this year's notices were cut that way

## 2.4.1 (2026-11-13)


### Fixes

* **CDC company board**: a carriage return or other control character in a company, role or CTC from ERP (ERP can send one as a character reference) no longer starts a new line in the calendar file, where a lenient calendar app could read it as an extra field or event. Line breaks become `\n` and other controls are dropped

## 2.4.0 (2026-11-13)


### Features

* **CDC company board**: **Add deadlines to calendar** downloads an .ics with one event at the deadline of every role that reads Can apply on Open now, whichever tab, search or filter you have on. Apple Calendar and Outlook keep its reminders 3 h and 30 min before; Google Calendar takes the file through Settings > Import & export and uses its own reminders. The file comes from what the board already holds, so the click asks ERP for nothing, and the button waits while AutoERP is still checking roles
* **CDC notice board**: **Back to company board** in its header opens CDC's company page, the way ERP's own link goes the other way

### Fixes

* **CDC boards**: going back to a board with the browser's Back button no longer leaves it empty with "ERP sent no rows. Reload this page." When ERP sends no rows, AutoERP reloads the page once, and shows that message only if the reload comes back empty too
* **CDC boards**: in a narrow window the links in the board's header move under the filters, right-aligned, instead of squeezing the tabs into a column

## 2.3.1 (2026-11-13)


### Fixes

* **CDC company board**: status chips are wider and taller, so "Check on ERP" no longer presses against its border


## 2.3.0 (2026-11-13)


### Changes

* **Login**: AutoERP no longer presses Get OTP by itself. It fills the roll number, password and security answer, and a **Send OTP** button on its card asks ERP for the OTP when you press it. Signing out of ERP used to land on a login page that filled itself and mailed an OTP straight away; now nothing is mailed until you ask, wherever the page comes from

### Features

* **CDC company board**: on CDC's company page, a board above ERP's grid sorts roles into Open now, Opens soon and Closed, with a countdown to each deadline, the CTC in lakhs, and ERP's own verdict from each role's page: Applied, Can apply, Not eligible or Check on ERP. Roles ERP says you aren't eligible for are hidden behind a count, roles added since your last visit say NEW, and **Role page** opens ERP's page for the role. Desktop only
* **CDC notice board**: on CDC's notice board, every notice with its full text, search, category and Placement/Internship filters, NEW since your last visit, and My companies for notices about the companies you applied to. Desktop only
* **CDC boards stay current**: close ERP's role dialog after you apply or cancel and that row changes to Applied or Can apply without a reload, whichever button opened it. A role whose deadline passes, or that opens, while the page is up moves to its new tab and is checked once it opens
* **CDC boards hold still**: each board appears once, already drawn, and rows keep their place and height while AutoERP checks them. A role that turns Not eligible stays in view until you change tab, search or filter, and ERP's reason for Check on ERP sits on the role line, full text on hover. **Check eligibility again** keeps the old verdicts on screen and counts the new answers in on its own label
* **CDC boards switch**: a **CDC boards** fold in the popup turns both boards off (Off: AutoERP draws nothing on CDC's pages and fetches nothing) and holds **Forget CDC data**, so the Login fold's **Forget** only forgets the login
* **Firefox for Android**: the popup fills the phone screen with larger buttons and inputs, and the login and feedback cards sit full width across the top of the page, clear of ERP's Log In button, the OTP box and the keyboard

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
