# Shalini Farewell RSVP

GitHub Pages RSVP form for Shalini's WONDERful Farewell Party.

## Important setup

The static GitHub Pages form cannot write directly to Google Sheets by itself. Saving works through Google Apps Script.

1. Open Google Apps Script.
2. Paste `apps-script/Code.gs`.
3. Deploy it as a Web App with `Execute as: Me` and access set to the people who should RSVP.
4. Copy the deployed `/exec` URL.
5. Paste that URL into `APPS_SCRIPT_WEB_APP_URL` near the bottom of `index.html`.
6. Commit and push again.

The Apps Script is connected to spreadsheet ID:
`1XDA-0nUEzNWwNV-7dV0U_zTkIK9asg7h4Pu8sZdrCKQ`

Submissions are appended to the existing tab:
`Guest RSVP`

The script expects or creates these columns in `Guest RSVP`:

- `ID`
- `Submitted At`
- `Name`
- `RSVP`
- `Dietary Restrictions`
- `Bringing Items`
- `Bringing Details`
- `Ideas`
- `Status`

Existing bring signups are also read from `Guest RSVP`, using the `Bringing Items` and `Bringing Details` columns.
