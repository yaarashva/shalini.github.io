/**
 * Google Apps Script backend for the party RSVP + contribution signup tool.
 *
 * Recommended setup:
 * 1. Open the Google Spreadsheet that should receive RSVPs.
 * 2. Extensions -> Apps Script.
 * 3. Paste this file into Code.gs.
 * 4. Add Index.html from this folder as an Apps Script HTML file.
 * 5. Deploy -> New deployment -> Web app.
 */

const SPREADSHEET_ID = '1XDA-0nUEzNWwNV-7dV0U_zTkIK9asg7h4Pu8sZdrCKQ';
const RSVP_SHEET_NAME = 'Guest RSVP';

const RSVP_HEADERS = [
  'ID',
  'Submitted At',
  'Name',
  'RSVP',
  'Dietary Restrictions',
  'Bringing Items',
  'Bringing Details',
  'Ideas',
  'Status'
];

const BRING_ITEMS = [
  {
    id: 'grill_mains',
    category: 'Food',
    label: 'Grill mains: burgers / hot dogs / skewers',
    note: 'Coordinate quantities with the food lead first.'
  },
  {
    id: 'vegetarian_grill',
    category: 'Food',
    label: 'Vegetarian / vegan grill option',
    note: 'Veggie burgers, grilled vegetables, halloumi, etc.'
  },
  {
    id: 'bread',
    category: 'Food',
    label: 'Buns / pita / rolls',
    note: 'Match to the final BBQ menu.'
  },
  {
    id: 'salad',
    category: 'Food',
    label: 'Salad',
    note: 'Green salad, pasta salad, Israeli salad, fruit salad, etc.'
  },
  {
    id: 'snacks',
    category: 'Food',
    label: 'Snacks, chips, dips, or fruit',
    note: 'Easy arrival food for the table.'
  },
  {
    id: 'dessert',
    category: 'Food',
    label: 'Dessert or cake',
    note: 'Confirm if there will be one main cake.'
  },
  {
    id: 'condiments',
    category: 'Food',
    label: 'Condiments and toppings',
    note: 'Ketchup, mustard, mayo, pickles, sauces, etc.'
  },
  {
    id: 'water',
    category: 'Drinks',
    label: 'Water / sparkling water',
    note: 'Plan generously if it is hot outside.'
  },
  {
    id: 'soft_drinks',
    category: 'Drinks',
    label: 'Soft drinks / juice',
    note: 'Especially useful if kids are invited.'
  },
  {
    id: 'alcohol',
    category: 'Drinks',
    label: 'Alcohol',
    note: 'Only if condo rules allow it.'
  },
  {
    id: 'ice',
    category: 'Drinks',
    label: 'Ice',
    note: 'For drinks and coolers.'
  },
  {
    id: 'cooler',
    category: 'Supplies',
    label: 'Cooler / ice packs',
    note: 'Useful for keeping food and drinks cold.'
  },
  {
    id: 'disposable_supplies',
    category: 'Supplies',
    label: 'Plates, cups, napkins, or cutlery',
    note: 'Add how many you can bring.'
  },
  {
    id: 'serving_supplies',
    category: 'Supplies',
    label: 'Serving bowls, trays, or utensils',
    note: 'Great for salads, snacks, and BBQ serving.'
  },
  {
    id: 'cleanup_supplies',
    category: 'Supplies',
    label: 'Trash bags, wipes, paper towels, or sanitizer',
    note: 'Cleanup goblin supplies. Quietly heroic.'
  },
  {
    id: 'decor',
    category: 'Vibe',
    label: 'Decor: tablecloths, lights, signs, flowers',
    note: 'Keep condo rules in mind.'
  },
  {
    id: 'speaker_playlist',
    category: 'Vibe',
    label: 'Speaker or playlist',
    note: 'Charge and test before the party.'
  },
  {
    id: 'first_aid',
    category: 'Safety',
    label: 'First aid kit',
    note: 'Especially helpful if kids or pool time are involved.'
  },
  {
    id: 'other',
    category: 'Other',
    label: 'Something else',
    note: 'Add details below.'
  }
];

function doGet(e) {
  const params = (e && e.parameter) || {};
  const action = params.action;

  try {
    if (action === 'bringOptions') {
      return jsonpResponse_(params.callback, getBringOptions());
    }

    if (action === 'submit') {
      const payload = params.payload ? JSON.parse(params.payload) : {};
      return jsonpResponse_(params.callback, submitRsvp(payload));
    }

    return HtmlService
      .createHtmlOutputFromFile('Index')
      .setTitle('Shalini Party RSVP')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    return jsonpResponse_(params.callback, {
      ok: false,
      message: error.message || String(error)
    });
  }
}

function doPost(e) {
  try {
    const payload = parsePostPayload_(e);
    return jsonResponse_(submitRsvp(payload));
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error.message || String(error)
    });
  }
}

function getBringOptions() {
  const rsvpSheet = getOrCreateSheet_(RSVP_SHEET_NAME);
  ensureHeaders_(rsvpSheet, RSVP_HEADERS);

  const signupsByItem = getSignupsByItem_(rsvpSheet);

  return BRING_ITEMS.map(item => {
    const signups = signupsByItem[item.label] || [];

    return {
      id: item.id,
      category: item.category,
      label: item.label,
      note: item.note,
      signupCount: signups.length,
      signups: signups
    };
  });
}

function submitRsvp(formData) {
  const data = normalizeRsvp_(formData);

  if (!data.name) {
    throw new Error('Please add your name before submitting.');
  }

  if (!data.rsvp) {
    throw new Error('Please choose whether you are coming.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const submittedAt = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      'yyyy-MM-dd HH:mm:ss'
    );
    const id = createSubmissionId_();
    const rsvpSheet = getOrCreateSheet_(RSVP_SHEET_NAME);

    ensureHeaders_(rsvpSheet, RSVP_HEADERS);

    const bringingItems = data.bringItems.map(item => item.label).join('; ');
    const bringingDetails = data.bringItems
      .map(item => {
        const details = item.details ? ` - ${item.details}` : '';
        return `${item.label}${details}`;
      })
      .join(' | ');

    rsvpSheet.appendRow([
      id,
      submittedAt,
      data.name,
      data.rsvp,
      data.dietaryRestrictions,
      bringingItems,
      bringingDetails,
      data.ideas,
      'New'
    ]);
    return {
      ok: true,
      id: id,
      message: 'Thanks! Your RSVP was saved.'
    };
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  return sheet;
}

function getSpreadsheet_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureHeaders_(sheet, headers) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existingHeaders = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(cleanValue_);

  if (!existingHeaders.some(Boolean)) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const missingHeaders = headers.filter(header => !existingHeaders.includes(header));

    if (missingHeaders.length) {
      sheet
        .getRange(1, existingHeaders.length + 1, 1, missingHeaders.length)
        .setValues([missingHeaders]);
    }
  }

  const styledColumnCount = Math.max(sheet.getLastColumn(), headers.length);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, styledColumnCount)
    .setFontWeight('bold')
    .setBackground('#0f6f78')
    .setFontColor('#ffffff');
  sheet.autoResizeColumns(1, styledColumnCount);
}

function getSignupsByItem_(sheet) {
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return {};
  }

  const headers = getHeaderMap_(sheet, RSVP_HEADERS);
  const rows = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  return rows.reduce((acc, row) => {
    const name = cleanValue_(row[headers.name]);
    const rsvp = cleanValue_(row[headers.rsvp]);
    const bringingItems = cleanValue_(row[headers.bringingItems]);
    const bringingDetails = cleanValue_(row[headers.bringingDetails]);

    if (!bringingItems || rsvp === 'No') {
      return acc;
    }

    bringingItems.split(';').map(item => item.trim()).filter(Boolean).forEach(item => {
      if (!acc[item]) {
        acc[item] = [];
      }

      acc[item].push({
        name: name || 'Someone',
        details: findItemDetails_(item, bringingDetails)
      });
    });

    return acc;
  }, {});
}

function getHeaderMap_(sheet, headers) {
  const values = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
  const map = {};

  values.forEach((header, index) => {
    map[cleanValue_(header)] = index;
  });

  headers.forEach(header => {
    if (map[header] === undefined) {
      throw new Error(`Missing required column in ${RSVP_SHEET_NAME}: ${header}`);
    }
  });

  return {
    name: map['Name'],
    rsvp: map['RSVP'],
    bringingItems: map['Bringing Items'],
    bringingDetails: map['Bringing Details']
  };
}

function findItemDetails_(item, bringingDetails) {
  if (!bringingDetails) {
    return '';
  }

  const match = bringingDetails
    .split('|')
    .map(value => value.trim())
    .find(value => value === item || value.startsWith(`${item} - `));

  if (!match || match === item) {
    return '';
  }

  return match.slice(item.length + 3).trim();
}

function normalizeRsvp_(formData) {
  const data = formData || {};
  const selectedItems = Array.isArray(data.bringItems) ? data.bringItems : [];

  return {
    name: cleanValue_(data.name),
    rsvp: cleanValue_(data.rsvp),
    dietaryRestrictions: cleanValue_(data.dietaryRestrictions),
    ideas: cleanValue_(data.ideas),
    bringItems: selectedItems
      .map(normalizeBringItem_)
      .filter(item => item && item.label)
  };
}

function normalizeBringItem_(item) {
  const id = cleanValue_(item && item.id);
  const knownItem = BRING_ITEMS.find(bringItem => bringItem.id === id);

  if (!knownItem) {
    return null;
  }

  return {
    id: knownItem.id,
    category: knownItem.category,
    label: knownItem.label,
    details: cleanValue_(item.details)
  };
}

function cleanValue_(value) {
  return String(value || '').trim();
}

function createSubmissionId_() {
  return Utilities.getUuid().slice(0, 8).toUpperCase();
}

function parsePostPayload_(e) {
  const parameterPayload = e && e.parameter && e.parameter.payload;

  if (parameterPayload) {
    return JSON.parse(parameterPayload);
  }

  const rawBody = e && e.postData && e.postData.contents;

  if (rawBody) {
    try {
      return JSON.parse(rawBody);
    } catch (error) {
      return e.parameter || {};
    }
  }

  return (e && e.parameter) || {};
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse_(callback, data) {
  const safeCallback = cleanValue_(callback || '').replace(/[^\w.$]/g, '');
  const payload = JSON.stringify(data);

  if (!safeCallback) {
    return jsonResponse_(data);
  }

  return ContentService
    .createTextOutput(`${safeCallback}(${payload});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
