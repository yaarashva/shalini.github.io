# Shalini Farewell RSVP

GitHub Pages RSVP form for Shalini's WONDERful Farewell Party.

## Important setup

The static GitHub Pages form cannot write directly to Google Sheets by itself. To enable saving:

1. Open Google Apps Script.
2. Paste `apps-script/Code.gs`.
3. Deploy it as a Web App with `Execute as: Me` and access set to the people who should RSVP.
4. Copy the deployed `/exec` URL.
5. Paste that URL into `APPS_SCRIPT_WEB_APP_URL` near the bottom of `index.html`.
6. Commit and push again.

The Apps Script is already connected to spreadsheet ID:
`1v21BddTCdfv3h7v9A7KBkLHeHOPwrZo-`
