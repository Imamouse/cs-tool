// ════════════════════════════════════════════════════════
//  CS Email Tool — Google Apps Script
//  Works with HTML tool via GET requests (no CORS issues)
// ════════════════════════════════════════════════════════

function getConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    apiKey:   props.getProperty('CLAUDE_API_KEY') || '',
    brand:    props.getProperty('BRAND_NAME')     || 'CS Tool',
    emoji:    props.getProperty('BRAND_EMOJI')    || '🐾',
    signoff:  props.getProperty('SIGNOFF_NAME')   || 'CS Team',
    tone:     props.getProperty('EMAIL_TONE')     || 'warm and empathetic',
    password: props.getProperty('TOOL_PASSWORD')  || 'default',
    token:    props.getProperty('SECRET_TOKEN')   || '',
  };
}

function saveConfig(cfg) {
  const props = PropertiesService.getScriptProperties();
  if (cfg.apiKey)   props.setProperty('CLAUDE_API_KEY', cfg.apiKey);
  if (cfg.brand)    props.setProperty('BRAND_NAME',     cfg.brand);
  if (cfg.emoji)    props.setProperty('BRAND_EMOJI',    cfg.emoji);
  if (cfg.signoff)  props.setProperty('SIGNOFF_NAME',   cfg.signoff);
  if (cfg.tone)     props.setProperty('EMAIL_TONE',     cfg.tone);
  if (cfg.password) props.setProperty('TOOL_PASSWORD',  cfg.password);
  if (cfg.token)    props.setProperty('SECRET_TOKEN',   cfg.token);
  return { ok: true };
}

function checkPassword(pwd) { return pwd === getConfig().password; }

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📧 CS Email Tool')
    .addItem('Open Email Drafter', 'openSidebar')
    .addSeparator()
    .addItem('⚙️ Settings', 'openConfig')
    .addToUi();
}

function openSidebar() {
  SpreadsheetApp.getUi().showSidebar(
    HtmlService.createHtmlOutputFromFile('Sidebar').setTitle('CS Email Drafter').setWidth(420)
  );
}

function openConfig() {
  SpreadsheetApp.getUi().showModalDialog(
    HtmlService.createHtmlOutputFromFile('Config').setWidth(480).setHeight(560),
    '⚙️ CS Tool Settings'
  );
}

// ── WEB APP — all requests via GET to avoid CORS preflight ──
function doGet(e) {
  const params  = e.parameter || {};
  const action  = params.action || 'ping';
  const cfg     = getConfig();

  if (cfg.token && params.token !== cfg.token) return out({ error: 'Unauthorized' });

  try {
    if (action === 'ping')   return out({ ok: true, records: getAllRecords().length });
    if (action === 'read')   return out({ records: getAllRecords() });
    if (action === 'write') {
      const data = params.data ? JSON.parse(decodeURIComponent(params.data)) : {};
      return out(saveRecord(data.record || data));
    }
    if (action === 'delete') return out(deleteRecord(parseInt(params.row || 0)));
    return out({ error: 'Unknown action: ' + action });
  } catch(err) {
    return out({ error: err.message });
  }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents || '{}');
    return doGet({ parameter: params });
  } catch(err) { return out({ error: err.message }); }
}

function out(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ── SHEET ────────────────────────────────────────────────
const RECORDS_SHEET = 'CS Records';
const HEADERS = ['ID','Date','Agent','Customer Name','Order #','Store','Language','Issue','Notes','Email Subject','Email Body'];

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(RECORDS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(RECORDS_SHEET);
    sh.appendRow(HEADERS);
    sh.getRange(1,1,1,HEADERS.length).setBackground('#1a1a1a').setFontColor('#e8875a').setFontWeight('bold');
    sh.setFrozenRows(1);
    [160,90,110,130,90,60,80,200,150,220,400].forEach((w,i)=>sh.setColumnWidth(i+1,w));
  }
  return sh;
}

function getAllRecords() {
  const sh = getOrCreateSheet();
  const data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map((row,i)=>{ const o={_row:i+2}; headers.forEach((h,j)=>o[h]=row[j]); return o; });
}

function saveRecord(rec) {
  if (!rec || !rec.id) return { error: 'missing id' };
  const sh = getOrCreateSheet();
  const data = sh.getDataRange().getValues();
  for (let i=1; i<data.length; i++) {
    if (String(data[i][0]) === String(rec.id)) return { ok:true, skipped:true };
  }
  const agent = Session.getActiveUser().getEmail() || 'unknown';
  sh.appendRow([rec.id, rec.date||'', agent, rec.name||'', rec.order||'', rec.store||'',
                rec.lang||'', rec.issue||'', rec.notes||'', rec.subject||'', rec.body||'']);
  const row = sh.getLastRow();
  if (row % 2 === 0) sh.getRange(row,1,1,HEADERS.length).setBackground('#f8f8f8');
  return { ok: true };
}

function deleteRecord(rowNum) {
  if (!rowNum || rowNum < 2) return { error: 'invalid row' };
  getOrCreateSheet().deleteRow(rowNum);
  return { ok: true };
}

function getConfigForSidebar() {
  const cfg = getConfig();
  return { brand:cfg.brand, emoji:cfg.emoji, signoff:cfg.signoff, tone:cfg.tone };
}

function draftEmail(params) {
  try {
    const result = callGemini(params.name, params.order, params.store, params.issue, params.notes, params.signoff, params.tone);
    const saved = saveRecord({
      id:'r'+Date.now()+'_'+Math.floor(Math.random()*9999),
      date:new Date().toISOString().slice(0,10),
      name:params.name, order:params.order, store:result.store, lang:result.lang,
      issue:params.issue, notes:params.notes, subject:result.subject, body:result.body,
    });
    return { ok:true, ...result, id:saved.id };
  } catch(e) { return { ok:false, error:e.message }; }
}

function callGemini(name, order, store, issue, notes, sname, tone) {
  const cfg = getConfig();
  if (!cfg.apiKey) throw new Error('No API key. Go to Settings.');
  const LANG = {com:'English',us:'English',uk:'English',au:'English',ca:'English',de:'German',at:'German',ch:'German',fr:'French',be:'French',es:'Spanish',mx:'Spanish',nl:'Dutch',kr:'Korean',jp:'Japanese',it:'Italian',pt:'Portuguese',br:'Portuguese',pl:'Polish',se:'Swedish',no:'Norwegian',dk:'Danish',fi:'Finnish'};
  const sc = store.toLowerCase().replace(/[^a-z]/g,'') || 'com';
  const lang = LANG[sc] || sc.toUpperCase();
  const sn = sname || cfg.signoff || 'CS Team';
  const emailTone = tone || cfg.tone || 'warm and empathetic';
  const li = LANG[sc] ? `Write the ENTIRE email in ${lang}.` : `Detect correct language for .${sc}.`;
  const prompt = `You are a ${emailTone} CS agent for "${sn}". Draft a shipping issue follow-up email.
Customer: ${name} | Order: ${order||'N/A'} | Issue: ${issue||'shipping problem'} | Notes: ${notes||'none'}
${li} Subject must include order number. Address customer by first name.
Reply ONLY in this format:
SUBJECT: <subject>
---
<body under 130 words, sign off as "${sn} Team", no brackets>`;

  let response, code;
  for (let i=1; i<=3; i++) {
    response = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${cfg.apiKey}`,
      {method:'post',contentType:'application/json',payload:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{maxOutputTokens:1024,temperature:0.7}}),muteHttpExceptions:true}
    );
    code = response.getResponseCode();
    if (code === 200) break;
    if ((code===503||code===429) && i<3) Utilities.sleep(3000*i);
    else break;
  }
  if (code !== 200) { const e=JSON.parse(response.getContentText()); throw new Error('Gemini '+code+': '+(e.error?.message||'')); }
  const d = JSON.parse(response.getContentText());
  const txt = d.candidates[0].content.parts[0].text||'';
  const sm = txt.match(/SUBJECT:\s*(.+)/i);
  const pts = txt.split(/---+/);
  return { subject:sm?sm[1].trim():'(see email)', body:pts.length>1?pts.slice(1).join('---').trim():txt.replace(/SUBJECT:.+/i,'').trim(), lang, store:sc };
}
