/**
 * Little House Flower — the order back end (Google Apps Script web app).
 *
 * The website has no server. When a customer presses Send, the page posts one
 * order here. This script checks it, writes one row to the "Bookings" tab of the
 * shop's Google Sheet, emails the shop, and answers {ok:true, ref}. The website
 * shows its confirmation only after that answer arrives, so this script must
 * never answer ok:true for an order it did not keep. The honeypot is the one
 * deliberate exception, and only bots ever fill it.
 *
 * The contract with the website (core/sink.js inside index.html):
 *   POST, Content-Type text/plain, body
 *     {v:1, secret:<TOKEN>, source:'web', reservations:[row], hp:''}
 *   row: one object with the 24 named fields in FIELDS below.
 *   Reply: {ok:true, ref, status:200}
 *          {ok:true, duplicate:true, ref, status:200}   the same order again
 *          {ok:false, error:'<code>', status:<n>}        anything refused
 *   The field NAMES are the contract. Never rename one here or in the site alone.
 *
 * ---------------------------------------------------------------------------
 * DEPLOY (English)
 *
 *  1. Use the right Google account: the shop's own, or an O2 Workspace account
 *     that shares the Sheet with the shop as editor. Never a personal or a
 *     university account. The Sheet holds customers' names, phone numbers and
 *     addresses, and a university account cannot hand ownership to anyone
 *     outside its organisation later.
 *  2. Signed in as that account, create a new Google Sheet and name it
 *     "Little House Flower — คำจอง / Reservations".
 *  3. In the Sheet: Extensions > Apps Script. Delete everything in Code.gs and
 *     paste this whole file. In Project Settings (the gear), set the time zone to
 *     (GMT+07:00) Bangkok.
 *  4. Below, change TOKEN to a new random phrase (20 or more letters and digits,
 *     used nowhere else) and check that NOTIFY is an inbox the shop reads. Save.
 *  5. Choose setupSheet in the toolbar and press Run. Google asks for permission
 *     to use this spreadsheet and to send email as you: allow both. If it warns
 *     that Google hasn't verified the app, choose Advanced > Go to … (unsafe).
 *     It is your own script.
 *  6. Choose selfTest and press Run. The log must end with
 *     "selfTest: all checks passed", and one test email must reach NOTIFY.
 *     selfTest deletes its own test row.
 *  7. Deploy > New deployment > gear > Web app.
 *        Execute as:      Me
 *        Who has access:  Anyone
 *     Press Deploy and copy the Web app URL that ends in /exec. "Anyone" is what
 *     lets a website reach it; the checks below limit what it accepts.
 *  8. In the website repository, put that URL in sheet.json -> "endpoint" and the
 *     TOKEN in sheet.json -> "secret". Commit to main (this publishes the site).
 *  9. Place one test order on the live site. Check the new row and the email,
 *     then delete the test row.
 * 10. Choose installMonthlyPurge and press Run once. On the 1st of every month it
 *     deletes each order 11 months after its date, so no order outlives the
 *     12 months the website's privacy notice promises.
 * 11. The OLD back end: open the old Apps Script project, Deploy > Manage
 *     deployments > select the web app > Archive. Its public URL then stops
 *     working, and nothing more can be written to the old Sheet.
 *
 * Changing this file later: saving is not enough, the old code keeps running.
 * Deploy > Manage deployments > select the web app > Edit (pencil) >
 * Version: New version > Deploy. The /exec URL stays the same, so sheet.json does
 * not change. Then copy the edited file back to google/Code.gs in the repository.
 *
 * ---------------------------------------------------------------------------
 * วิธีติดตั้ง (ภาษาไทย)
 *
 *  1. ใช้บัญชี Google ให้ถูก: บัญชีของร้านเอง หรือบัญชี Workspace ของ O2 ที่แชร์ชีต
 *     ให้ร้านเป็นผู้แก้ไข ห้ามใช้บัญชีส่วนตัวหรือบัญชีมหาวิทยาลัย เพราะชีตนี้เก็บชื่อ
 *     เบอร์โทร และที่อยู่ของลูกค้า และบัญชีมหาวิทยาลัยโอนความเป็นเจ้าของให้คนนอก
 *     องค์กรไม่ได้
 *  2. เข้าสู่ระบบด้วยบัญชีนั้น สร้าง Google Sheet ใหม่ ตั้งชื่อว่า
 *     "Little House Flower — คำจอง / Reservations"
 *  3. ในชีต ไปที่ ส่วนขยาย (Extensions) > Apps Script ลบโค้ดเดิมใน Code.gs ทั้งหมด
 *     แล้ววางไฟล์นี้ทั้งไฟล์ จากนั้นที่ การตั้งค่าโปรเจ็กต์ (รูปเฟือง) ตั้งเขตเวลาเป็น
 *     (GMT+07:00) กรุงเทพ
 *  4. แก้ TOKEN ด้านล่างเป็นรหัสสุ่มชุดใหม่ (ตัวอักษรและตัวเลข 20 ตัวขึ้นไป ห้ามใช้ซ้ำ
 *     กับรหัสผ่านใดๆ) และตรวจว่า NOTIFY เป็นอีเมลที่ร้านเปิดอ่านจริง แล้วกดบันทึก
 *  5. เลือก setupSheet ที่แถบด้านบน แล้วกด เรียกใช้ (Run) Google จะขอสิทธิ์ใช้ชีตนี้
 *     และส่งอีเมลในนามบัญชีนี้ ให้กดอนุญาตทั้งสองอย่าง ถ้าขึ้นว่า Google ยังไม่ได้
 *     ยืนยันแอปนี้ ให้กด ขั้นสูง (Advanced) > ไปที่ … (ไม่ปลอดภัย) ได้เลย เพราะเป็น
 *     สคริปต์ของเราเอง
 *  6. เลือก selfTest แล้วกด Run บันทึกการทำงานต้องจบด้วย
 *     "selfTest: all checks passed" และต้องมีอีเมลทดสอบ 1 ฉบับเข้า NOTIFY
 *     (selfTest ลบแถวทดสอบของตัวเองให้แล้ว)
 *  7. ทำให้ใช้งานได้ (Deploy) > การทำให้ใช้งานได้รายการใหม่ (New deployment) >
 *     รูปเฟือง > เว็บแอป (Web app) ตั้งค่า
 *        ดำเนินการในฐานะ (Execute as):         ฉัน (Me)
 *        ผู้ที่มีสิทธิ์เข้าถึง (Who has access):  ทุกคน (Anyone)
 *     กด Deploy แล้วคัดลอก URL ของเว็บแอปที่ลงท้ายด้วย /exec
 *  8. ใส่ URL นั้นใน sheet.json ช่อง "endpoint" และใส่ TOKEN ในช่อง "secret"
 *     แล้ว commit ขึ้น main (เว็บจะอัปเดตทันที)
 *  9. ลองสั่ง 1 รายการบนเว็บจริง ตรวจว่ามีแถวใหม่ในชีตและมีอีเมลแจ้ง แล้วลบแถว
 *     ทดสอบนั้นออก
 * 10. เลือก installMonthlyPurge แล้วกด Run ครั้งเดียว ทุกวันที่ 1 ของเดือน ระบบจะลบ
 *     คำจองที่เลยวันใช้มาแล้ว 11 เดือน ข้อมูลลูกค้าจึงไม่อยู่เกิน 12 เดือนตามที่
 *     ประกาศความเป็นส่วนตัวบนเว็บแจ้งไว้
 * 11. ตัวเก่า: เปิดโปรเจ็กต์ Apps Script เดิม ไปที่ Deploy > จัดการการทำให้ใช้งานได้
 *     (Manage deployments) > เลือกเว็บแอป > เก็บถาวร (Archive) URL เดิมจะใช้ไม่ได้
 *     อีก และจะไม่มีอะไรเขียนลงชีตเก่าได้อีก
 *
 * แก้ไฟล์นี้ภายหลัง: กดบันทึกอย่างเดียวยังไม่พอ โค้ดเดิมจะยังทำงานอยู่ ต้องไปที่
 * Deploy > Manage deployments > เลือกเว็บแอป > แก้ไข (รูปดินสอ) > เวอร์ชัน:
 * เวอร์ชันใหม่ (New version) > Deploy  URL /exec เดิมยังใช้ได้ ไม่ต้องแก้ sheet.json
 * แล้วคัดลอกไฟล์ที่แก้กลับไปไว้ที่ google/Code.gs ใน repository ด้วย
 */

/* TOKEN is the phrase the website sends with every order.
   Change it before deploying: this placeholder is published in this very file,
   and the script refuses every order until it is changed.
   It is NOT a secret, and nothing may rely on it as one. The website has to send
   it from every visitor's browser, so it sits in the public sheet.json for anyone
   to read. All it does is turn away scripts that spray Apps Script URLs blindly.
   Never reuse a password here. The checks in validate_() are what protect the Sheet.
   To stop a flood of spam, change it here AND in sheet.json. Put the previous value
   in OLD_TOKEN for a day meanwhile, so orders already on their way still land. */
const TOKEN = 'CHANGE-ME-BEFORE-DEPLOYING';
const OLD_TOKEN = '';

/* Who hears about each new order. Several addresses may be separated by commas.
   This is the address the website publishes; change it if the shop reads another. */
const NOTIFY = 'littlechildice2@gmail.com';

const SHEET = 'Bookings';
const LOG_SHEET = 'Log';
const TZ = 'Asia/Bangkok';

/* The shop's opening hours, as in data/settings.js (shop.hours). A time window
   outside them is refused, so if the hours change there, change them here too and
   deploy a new version. Otherwise orders for the new hours are refused, and the
   customer is sent to LINE instead. */
const OPEN_FROM = '08:00';
const OPEN_UNTIL = '20:00';
const HORIZON_DAYS = 130;    // a little past the site's calendar, which ends with the third month ahead
const DAY_CAP = 200;         // rows per Bangkok day; far above a real day, low enough to stop a flood
const MAX_BODY = 24000;      // characters; a real order is well under 2,000
const KEEP_MONTHS = 11;      // with a monthly purge, nothing outlives 12 months after its date
const LOG_KEEP_DAYS = 90;
const LOG_MAX_ROWS = 2000;

/* The row the website sends, in the website's order. Copied from core/sink.js
   (FIELDS and HEAD), so the Sheet's header is exactly the one the site knows. */
const FIELDS = ['received', 'ref', 'status', 'dateNeeded', 'window', 'fulfil', 'items', 'brief', 'budget', 'subtotal', 'quoteNeeded', 'customerName', 'customerPhone', 'recipientName', 'recipientPhone', 'address', 'district', 'province', 'card', 'anonymous', 'lang', 'notes', 'id', 'customerLine'];
const HEAD = ['เวลาที่รับคำจอง / Received', 'รหัสจอง / Ref', 'สถานะ / Status', 'วันที่ใช้ / Date needed', 'ช่วงเวลา / Time window', 'รับเอง–ส่ง / Pickup or delivery', 'รายการ / Items', 'โจทย์พิเศษ / Custom brief', 'งบประมาณ / Budget', 'ยอดรวม / Subtotal', 'ต้องยืนยันราคา / Quote needed', 'ชื่อผู้สั่ง / Customer', 'เบอร์ผู้สั่ง / Customer phone', 'ชื่อผู้รับ / Recipient', 'เบอร์ผู้รับ / Recipient phone', 'ที่อยู่จัดส่ง / Delivery address', 'เขต–อำเภอ / District', 'จังหวัด / Province', 'ข้อความการ์ด / Card message', 'ไม่ระบุชื่อผู้ส่ง / Anonymous', 'ภาษา / Language', 'หมายเหตุร้าน / Shop notes', 'รหัสภายใน / Booking id', 'LINE ผู้สั่ง / Customer LINE'];

/* Three columns only the script fills, after the site's 24. Payment is the shop's
   to change; source and the ISO time are the audit trail for a disputed order. */
const EXTRA_FIELDS = ['payment', 'source', 'writtenIso'];
const EXTRA_HEAD = ['ชำระเงิน / Payment', 'ที่มา / Source', 'บันทึกเมื่อ (ISO) / Written at (ISO)'];
const COLUMNS = FIELDS.concat(EXTRA_FIELDS);
const LABELS = HEAD.concat(EXTRA_HEAD);

/* The website's own Thai status words (strings.js status.*), first one for a new order */
const STATUSES = ['รอยืนยัน', 'ยืนยันแล้ว', 'กำลังจัด', 'พร้อมรับ', 'ออกจากบ้านแล้ว', 'ถึงมือแล้ว', 'ยกเลิก'];
const PAYMENTS = ['ยังไม่ชำระ', 'ชำระแล้ว'];
const FULFIL = { pickup: 'มารับเองที่ร้าน', delivery: 'ให้ร้านส่ง' };

/* Length caps, in characters, after trimming. Each sits above the website's own
   limit, so a real customer never meets one; a refusal means a forged request. */
const CAPS = { window: 40, fulfil: 60, items: 1500, brief: 3000, budget: 60, subtotal: 40, quoteNeeded: 60, customerName: 150, recipientName: 150, address: 900, district: 100, province: 60, card: 300, anonymous: 60, lang: 10, notes: 1000, customerLine: 80 };
const MULTILINE = { items: 1, brief: 1, address: 1, card: 1, notes: 1 };
/* Columns the script builds itself or checks against a strict pattern. They can
   never carry a formula, so they skip cell_(): an overseas number keeps its '+'. */
const BUILT = { received: 1, ref: 1, status: 1, dateNeeded: 1, window: 1, fulfil: 1, customerPhone: 1, recipientPhone: 1, id: 1, payment: 1, writtenIso: 1 };

const REF_RE = /^LH\d{6}-[A-Z0-9]{3,8}$/;
const ID_RE = /^[A-Za-z0-9_-]{4,40}$/;
const PLACEHOLDER = 'CHANGE-ME-BEFORE-DEPLOYING';
const PROTECT_NOTE = 'หัวตารางคำจอง ห้ามแก้ชื่อคอลัมน์ / Order header, do not rename';

/* ======================================================================== */

function doPost(e) {
  const raw = e && e.postData && typeof e.postData.contents === 'string' ? e.postData.contents : '';
  let res;
  try {
    res = handle_(raw);
  } catch (err) {
    // Never hand an anonymous caller the exception text: it can carry quota
    // state, file names and the owner's email address.
    console.error('doPost failed: ' + ((err && err.stack) || err));
    res = { reply: fail_('server_error', 500), outcome: 'error' };
  }
  log_(res, raw.length);
  return out_(res.reply);
}

/** A GET says only that the endpoint is alive: no sheet name, tab or row count. */
function doGet() {
  return out_({ ok: true });
}

function handle_(raw) {
  if (!raw) return refused_('empty', 400);
  if (raw.length > MAX_BODY) return refused_('too_large', 413);
  let d;
  try { d = JSON.parse(raw); } catch (err) { return refused_('bad_json', 400); }
  if (!d || typeof d !== 'object' || Array.isArray(d)) return refused_('bad_json', 400);
  if (Number(d.v) !== 1) return refused_('bad_version', 400);
  // an unchanged placeholder is no destination at all: refuse visibly, before anything else
  if (!configured_()) return refused_('not_configured', 503);
  const secret = String(d.secret == null ? '' : d.secret);
  if (secret !== TOKEN && !(OLD_TOKEN && secret === OLD_TOKEN)) return refused_('bad_secret', 403);

  const list = d.reservations;
  if (!Array.isArray(list) || !list.length) return refused_('no_reservations', 400);
  if (list.length > 1) return refused_('too_many', 400);   // the site sends one order per request
  const row = list[0];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return refused_('no_reservations', 400);
  const seen = typeof row.ref === 'string' && REF_RE.test(row.ref.trim()) ? row.ref.trim() : '';

  // The honeypot is a field no person can see. Answer as though it worked, so a
  // bot learns nothing, but write no row and send no email.
  if (String(d.hp == null ? '' : d.hp).trim() !== '') {
    return { reply: { ok: true, ref: seen, status: 200 }, outcome: 'honeypot', ref: seen };
  }

  const v = validate_(row, d.source);
  if (v.error) return refused_(v.error, v.status || 400, v.field, seen);
  const rec = v.rec;

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return refused_('busy', 503, '', rec.ref);   // the site waits 25 s in all
  try {
    const sh = bookings_();
    const cols = columns_(sh);
    // A repeat of an order already written is a success, not a second row. This
    // comes before the date check: a retry that crosses midnight must not be
    // refused for an order the Sheet already holds.
    const dup = findExisting_(sh, cols, rec);
    if (dup) return { reply: { ok: true, duplicate: true, ref: dup, status: 200 }, outcome: 'duplicate', ref: rec.ref };
    const late = dateRange_(rec.dateNeeded);
    if (late) return refused_(late, 400, 'dateNeeded', rec.ref);
    const props = PropertiesService.getScriptProperties();
    const today = today_();
    const count = Number(props.getProperty('day:' + today) || 0);
    if (count >= DAY_CAP) { capAlert_(props, today); return refused_('day_cap', 429, '', rec.ref); }
    writeRow_(sh, cols, rec);
    SpreadsheetApp.flush();   // commit before the lock goes, so the next request's duplicate check sees this row
    countDay_(props, today, count + 1);
  } finally {
    lock.releaseLock();
  }
  // The row is kept. A mail failure must not turn into a failed order for the
  // customer, so notify_() catches its own errors.
  notify_(rec);
  return { reply: { ok: true, ref: rec.ref, status: 200 }, outcome: 'written', ref: rec.ref };
}

/* ---------- checking one order ------------------------------------------ */

function validate_(row, source) {
  for (let i = 0; i < FIELDS.length; i++) {
    const x = row[FIELDS[i]];
    if (x != null && typeof x !== 'string' && typeof x !== 'number' && typeof x !== 'boolean') return bad_('bad_field', FIELDS[i]);
  }
  const s = (k) => (row[k] == null ? '' : String(row[k]));
  const rec = {};

  rec.ref = s('ref').trim();
  if (!REF_RE.test(rec.ref)) return bad_(rec.ref ? 'bad_field' : 'missing_field', 'ref');
  rec.id = s('id').trim();
  if (rec.id && !ID_RE.test(rec.id)) return bad_('bad_field', 'id');

  rec.dateNeeded = s('dateNeeded').trim();
  if (!realDate_(rec.dateNeeded)) return bad_(rec.dateNeeded ? 'bad_date' : 'missing_field', 'dateNeeded');
  if (s('window').length > CAPS.window) return bad_('too_long', 'window', 413);
  rec.window = window_(s('window'));
  if (!rec.window) return bad_(s('window').trim() ? 'bad_window' : 'missing_field', 'window');
  if (s('fulfil').length > CAPS.fulfil) return bad_('too_long', 'fulfil', 413);
  const kind = fulfilKind_(s('fulfil'));
  if (!kind) return bad_(s('fulfil').trim() ? 'bad_field' : 'missing_field', 'fulfil');
  rec.fulfil = FULFIL[kind];

  const text = ['items', 'brief', 'budget', 'quoteNeeded', 'customerName', 'recipientName', 'address', 'district', 'province', 'card', 'anonymous', 'notes', 'customerLine'];
  for (let i = 0; i < text.length; i++) {
    const k = text[i];
    const t = tidy_(s(k), MULTILINE[k]);
    if (t.length > CAPS[k]) return bad_('too_long', k, 413);
    rec[k] = t;
  }
  if (!rec.items && !rec.brief) return bad_('missing_field', 'items');
  if (!rec.customerName) return bad_('missing_field', 'customerName');

  rec.customerPhone = phone_(s('customerPhone'));
  if (!rec.customerPhone) return bad_(s('customerPhone').trim() ? 'bad_phone' : 'missing_field', 'customerPhone');
  rec.recipientPhone = '';
  if (s('recipientPhone').trim()) {
    rec.recipientPhone = phone_(s('recipientPhone'));
    if (!rec.recipientPhone) return bad_('bad_phone', 'recipientPhone');
  }
  if (kind === 'delivery') {
    const need = ['recipientName', 'recipientPhone', 'address', 'district', 'province'];
    for (let i = 0; i < need.length; i++) if (!rec[need[i]]) return bad_('missing_field', need[i]);
  }

  rec.subtotal = subtotal_(row.subtotal);
  if (rec.subtotal === null) return bad_('bad_field', 'subtotal');
  const lang = s('lang').trim().toLowerCase();
  rec.lang = /^[a-z]{2}(-[a-z]{2})?$/.test(lang) ? lang : '';

  // The script owns these, whatever the request says: the time it arrived, the
  // status of a new order, and where it came from.
  const now = new Date();
  rec.received = Utilities.formatDate(now, TZ, 'yyyy-MM-dd HH:mm');
  rec.status = STATUSES[0];
  rec.payment = PAYMENTS[0];
  rec.source = tidy_(source == null ? '' : String(source)).slice(0, 20) || 'web';
  rec.writtenIso = now.toISOString();
  return { rec: rec };
}

/** Trim, drop control and bidi-override characters, and undo the site's own
    apostrophe guard; cell_() adds the guard back for the Sheet. */
function tidy_(v, multiline) {
  let s = String(v == null ? '' : v).replace(/\r\n?/g, '\n');
  s = s.replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ');
  s = s.replace(/[\u202A-\u202E\u2066-\u2069]/g, '');
  s = s.replace(/[ \u00A0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (/^'[=+\-@]/.test(s)) s = s.slice(1);
  return s;
}

/** Thai mobiles and landlines are written spaced ('081 234 5678'), which no
    spreadsheet can mistake for a number, so the leading 0 always survives.
    Numbers from abroad keep their country code. */
function phone_(v) {
  const raw = String(v == null ? '' : v).replace(/^'/, '').trim();
  if (!raw || raw.length > 40 || /[^\d\s+().\-]/.test(raw)) return '';
  let d = raw.replace(/\D/g, '');
  let intl = /^\+/.test(raw) || /^00/.test(d);
  if (/^00/.test(d)) d = d.slice(2);
  if (intl && /^66/.test(d)) { d = '0' + d.slice(2).replace(/^0/, ''); intl = false; }
  if (intl) return d.length >= 8 && d.length <= 15 ? '+' + d : '';
  if (/^0[689]\d{8}$/.test(d)) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
  if (/^02\d{7}$/.test(d)) return d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5);
  if (/^0[3-7]\d{7}$/.test(d)) return d.slice(0, 3) + ' ' + d.slice(3, 6) + ' ' + d.slice(6);
  return '';
}

/** '09:00–12:00' inside opening hours, returned in the site's own shape. */
function window_(v) {
  const m = /^\s*(\d{1,2})[:.](\d{2})\s*[–—-]\s*(\d{1,2})[:.](\d{2})\s*$/.exec(String(v == null ? '' : v));
  if (!m) return '';
  const a = mins_(m[1], m[2]), b = mins_(m[3], m[4]);
  const open = mins_.apply(null, OPEN_FROM.split(':')), close = mins_.apply(null, OPEN_UNTIL.split(':'));
  if (a < 0 || b < 0 || a >= b || a < open || b > close) return '';
  return pad_(m[1]) + ':' + m[2] + '–' + pad_(m[3]) + ':' + m[4];
}
function mins_(h, m) { h = Number(h); m = Number(m); return h <= 24 && m < 60 ? h * 60 + m : -1; }
function pad_(n) { return ('0' + Number(n)).slice(-2); }

/** The site sends its Thai label; 'ส่ง' only ever appears in the delivery one. */
function fulfilKind_(v) {
  const s = tidy_(v).toLowerCase();
  if (!s) return '';
  if (/ส่ง|deliver/.test(s)) return 'delivery';
  if (/รับ|pick/.test(s)) return 'pickup';
  return '';
}

/** A number is kept as a number, so the shop can add a column up; a text total
    such as 'ตั้งแต่ 1,090' is kept as text. null means refuse. */
function subtotal_(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'number') return isFinite(v) && v >= 0 && v <= 1e6 ? v : null;
  const t = tidy_(String(v));
  if (t.length > CAPS.subtotal) return null;
  const plain = t.replace(/[,\s฿]|บาท|THB/g, '');
  if (/^\d+(\.\d+)?$/.test(plain) && Number(plain) <= 1e6) return Number(plain);
  return t;
}

function realDate_(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const y = Number(iso.slice(0, 4)), m = Number(iso.slice(5, 7)), d = Number(iso.slice(8, 10));
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/** '' when the date is today (Bangkok) up to HORIZON_DAYS ahead. Today is allowed
    so that a retry sent just after midnight still lands. */
function dateRange_(iso) {
  const days = (utc_(iso) - utc_(today_())) / 864e5;
  if (days < 0) return 'past_date';
  if (days > HORIZON_DAYS) return 'too_far';
  return '';
}
function utc_(iso) { return Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))); }
function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }

/* ---------- the Sheet --------------------------------------------------- */

function ss_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('This script must live inside the Sheet: open the Sheet, then Extensions > Apps Script.');
  return ss;
}

function bookings_() {
  return ss_().getSheetByName(SHEET) || setupSheet();
}

/**
 * Run once from the editor (and again at any time; it is safe to repeat).
 * Finds or makes the Bookings tab: an existing tab whose first row is the order
 * header (a copied Sheet's 'Untitled' tab), else the empty first tab of a new
 * Sheet, else a new tab. Writes the header once, bolds and freezes it, keeps the
 * phone, ref, date and id columns as plain text, adds the Status and Payment
 * dropdowns, and makes the Log tab.
 */
function setupSheet() {
  const ss = ss_();
  ss.setSpreadsheetTimeZone(TZ);
  let sh = ss.getSheetByName(SHEET);
  if (!sh) {
    const tabs = ss.getSheets().filter(function (x) { return x.getName() !== LOG_SHEET; });
    sh = tabs.filter(headerIsOurs_)[0] || tabs.filter(function (x) { return x.getLastRow() === 0; })[0] || null;
    if (sh) sh.setName(SHEET);
    else sh = ss.insertSheet(SHEET, 0);
  }
  // a new Sheet has 26 columns (A–Z) and the header needs 27
  if (sh.getMaxColumns() < LABELS.length) sh.insertColumnsAfter(sh.getMaxColumns(), LABELS.length - sh.getMaxColumns());
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, LABELS.length).setValues([LABELS]);
  else if (!headerIsOurs_(sh)) throw new Error('Row 1 of "' + SHEET + '" is not the order header. Nothing was changed: check that tab first.');

  const cols = columns_(sh);   // adds any missing column, such as the script's own three on an older tab
  sh.getRange(1, 1, 1, cols.width).setFontWeight('bold');
  sh.setFrozenRows(1);
  if (sh.getMaxRows() < 200) sh.insertRowsAfter(sh.getMaxRows(), 200 - sh.getMaxRows());
  const n = sh.getMaxRows() - 1;
  COLUMNS.forEach(function (k) { sh.getRange(2, cols.map[k], n, 1).setNumberFormat(k === 'subtotal' ? '#,##0' : '@'); });
  sh.getRange(2, cols.map.status, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(false)
      .setHelpText('เลือกสถานะจากรายการ / Pick a status from the list').build());
  sh.getRange(2, cols.map.payment, n, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(PAYMENTS, true).setAllowInvalid(true).build());
  // a warning, not a lock: the shop can still edit, but not rename a column by accident
  const guarded = sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) { return p.getDescription() === PROTECT_NOTE; });
  if (!guarded) sh.getRange(1, 1, 1, cols.width).protect().setDescription(PROTECT_NOTE).setWarningOnly(true);
  logSheet_();
  return sh;
}

function headerIsOurs_(sh) {
  if (sh.getLastRow() === 0 || sh.getLastColumn() < 2) return false;
  const top = sh.getRange(1, 1, 1, 2).getValues()[0];
  return String(top[0]).trim() === HEAD[0] && String(top[1]).trim() === HEAD[1];
}

/** Column number of each field, found by its header label, so a column the shop
    adds or moves never shifts an order into the wrong place. */
function readHeader_(sh) {
  const width = Math.max(sh.getLastColumn(), 1);
  const top = sh.getRange(1, 1, 1, width).getValues()[0].map(function (x) { return String(x).trim(); });
  const map = {};
  COLUMNS.forEach(function (k, i) { const at = top.indexOf(LABELS[i]); if (at >= 0) map[k] = at + 1; });
  return { map: map, width: width };
}

/** As readHeader_(), but a missing label is added at the far right rather than
    losing that field: an order is never dropped for a renamed header cell. */
function columns_(sh) {
  const cols = readHeader_(sh);
  let width = sh.getLastColumn();
  COLUMNS.forEach(function (k, i) {
    if (cols.map[k]) return;
    width += 1;
    if (width > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), 1);
    sh.getRange(1, width).setValue(LABELS[i]).setFontWeight('bold');
    cols.map[k] = width;
  });
  cols.width = Math.max(width, 1);
  return cols;
}

function findRow_(sh, map, key, value) {
  const last = sh.getLastRow();
  if (last < 2 || !map[key] || !value) return 0;
  const hit = sh.getRange(2, map[key], last - 1, 1).createTextFinder(value).matchEntireCell(true).matchCase(true).findNext();
  return hit ? hit.getRow() : 0;
}

/** The ref already in the Sheet for this order's id (or ref, from a client that
    sends no id), or '' when it is new. */
function findExisting_(sh, cols, rec) {
  const at = rec.id ? findRow_(sh, cols.map, 'id', rec.id) : findRow_(sh, cols.map, 'ref', rec.ref);
  if (!at) return '';
  const stored = String(sh.getRange(at, cols.map.ref).getValue() || '').trim();
  return stored || rec.ref;
}

function writeRow_(sh, cols, rec) {
  const r = sh.getLastRow() + 1;
  if (r > sh.getMaxRows()) {
    sh.insertRowsAfter(sh.getMaxRows(), 50);
    // new rows do not always inherit the dropdowns, so carry them down from row 2
    ['status', 'payment'].forEach(function (k) {
      const rule = sh.getRange(2, cols.map[k]).getDataValidation();
      if (rule) sh.getRange(r, cols.map[k], sh.getMaxRows() - r + 1, 1).setDataValidation(rule);
    });
  }
  const range = sh.getRange(r, 1, 1, cols.width);
  const values = range.getValues()[0];          // keeps anything in the shop's own columns
  const formats = range.getNumberFormats()[0];
  COLUMNS.forEach(function (k) {
    const c = cols.map[k] - 1;
    const v = rec[k] == null ? '' : rec[k];
    values[c] = typeof v === 'number' || BUILT[k] ? v : cell_(v);
    formats[c] = typeof v === 'number' ? '#,##0' : '@';
  });
  // formats first: a plain-text cell is never read as a number, a date or a formula
  range.setNumberFormats([formats]);
  range.setValues([values]);
}

/** Formula guard for what the customer typed. Every text column is plain text,
    which already stops Sheets evaluating anything, and a value starting with
    = + - @ also gets a leading apostrophe, so it stays inert if the column is ever
    reformatted or the Sheet is downloaded as CSV and opened in Excel (where
    =IMPORTXML(…) or +HYPERLINK(…) would run). In a plain-text cell the apostrophe
    may show; that is the price of the CSV guard, and it only meets odd input.
    Tabs and line breaks never lead: tidy_() trimmed them. */
function cell_(v) {
  const s = String(v);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

/* ---------- day cap, notification, log ---------------------------------- */

function countDay_(props, day, n) {
  props.setProperty('day:' + day, String(n));
  props.getKeys().forEach(function (k) {
    if ((k.indexOf('day:') === 0 || k.indexOf('capAlert:') === 0) && k.slice(k.indexOf(':') + 1) !== day) props.deleteProperty(k);
  });
}

/** Tell the shop once that the site has stopped taking orders for the day. */
function capAlert_(props, day) {
  if (props.getProperty('capAlert:' + day) || !NOTIFY) return;
  props.setProperty('capAlert:' + day, '1');
  try {
    MailApp.sendEmail({
      to: NOTIFY,
      name: 'เว็บไซต์ Little House Flower',
      subject: 'เว็บไซต์หยุดรับคำจองวันนี้ชั่วคราว (ครบ ' + DAY_CAP + ' รายการ)',
      body: [
        'วันนี้ (' + day + ') มีคำจองเข้ามาครบ ' + DAY_CAP + ' รายการ ซึ่งมากผิดปกติ อาจเป็นสแปม',
        'ระบบจึงหยุดรับคำจองใหม่จากเว็บไซต์จนถึงเที่ยงคืน ลูกค้าที่กดส่งจะเห็นข้อความให้ทัก LINE หรือโทรหาร้านแทนค่ะ',
        '',
        'ลองเปิดชีตดูว่ามีคำจองแปลกๆ หรือไม่ ถ้าเป็นสแปม ให้เปลี่ยน TOKEN ตามวิธีที่หัวไฟล์ Code.gs และแจ้ง O2 Design Studio',
        'เปิดชีต: ' + ss_().getUrl(),
        '',
        'The website stopped taking orders until midnight: ' + DAY_CAP + ' arrived today, which looks like spam.',
      ].join('\n'),
    });
  } catch (err) {
    console.error('cap alert failed: ' + err);
  }
}

/** The shop's email for each new order: enough to act on, with the full row in
    the Sheet. The street address and card message stay out of the inbox, which
    nothing deletes after 12 months. */
function notify_(rec) {
  if (!NOTIFY) return;
  try {
    if (MailApp.getRemainingDailyQuota() < 1) { console.warn('notify skipped: the daily email quota is used up'); return; }
    const when = thaiDate_(rec.dateNeeded);
    const lines = [
      'คำจองใหม่จากเว็บไซต์ ยังไม่ได้ยืนยันกับลูกค้า',
      'ทักลูกค้าทาง LINE หรือโทรเพื่อยืนยันคิว ยอด การชำระเงิน และค่าส่ง แล้วเปลี่ยนสถานะในชีตนะคะ',
      '',
      'รหัสจอง: ' + rec.ref,
      'วันที่ใช้: ' + when + ' (' + rec.dateNeeded + ') · ' + rec.window,
      'รับเอง / ส่ง: ' + rec.fulfil,
    ];
    if (rec.items) lines.push('รายการ: ' + rec.items);
    if (rec.brief) lines.push('โจทย์พิเศษ:\n' + rec.brief);
    if (rec.budget) lines.push('งบประมาณ: ' + rec.budget);
    if (rec.subtotal !== '') lines.push('ยอดรวม: ' + money_(rec.subtotal) + (rec.quoteNeeded ? ' · ' + rec.quoteNeeded : ''));
    else if (rec.quoteNeeded) lines.push('ราคา: ' + rec.quoteNeeded);
    lines.push('ผู้สั่ง: ' + rec.customerName + ' · ' + rec.customerPhone + (rec.customerLine ? ' · LINE ' + rec.customerLine : ''));
    if (rec.fulfil === FULFIL.delivery) {
      lines.push('ผู้รับ: ' + rec.recipientName + ' · ' + rec.recipientPhone);
      lines.push('ส่งที่: ' + [rec.district, rec.province].filter(Boolean).join(', ') + ' (ที่อยู่เต็มอยู่ในชีต)');
    }
    lines.push('', 'เปิดชีต: ' + ss_().getUrl(), '', 'New order from the website, not yet confirmed with the customer. The full order is in the Sheet.');
    MailApp.sendEmail({
      to: NOTIFY,
      name: 'เว็บไซต์ Little House Flower',
      subject: 'คำจองใหม่ ' + rec.ref + ' · ' + when + ' · ' + rec.window,
      body: lines.join('\n'),
    });
  } catch (err) {
    console.error('notify failed: ' + err);
  }
}

function thaiDate_(iso) {
  const days = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const t = new Date(utc_(iso));
  return days[t.getUTCDay()] + ' ' + t.getUTCDate() + ' ' + months[t.getUTCMonth()];
}

function money_(v) {
  if (typeof v !== 'number') return String(v);
  return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' บาท';
}

function logSheet_() {
  const ss = ss_();
  let lg = ss.getSheetByName(LOG_SHEET);
  if (lg) return lg;
  lg = ss.insertSheet(LOG_SHEET);
  lg.getRange(1, 1, 1, 6).setValues([['เวลา / Time', 'ผล / Outcome', 'รหัส / Code', 'ช่อง / Field', 'รหัสจอง / Ref', 'ขนาด / Size']]).setFontWeight('bold');
  lg.setFrozenRows(1);
  return lg;
}

/** One line per request: its shape, never its content (no name, phone or text).
    It is the audit trail when a customer says an order was sent. */
function log_(res, size) {
  try {
    const lg = logSheet_();
    const reply = res.reply || {};
    lg.appendRow([new Date(), res.outcome || '', reply.error || '', res.field || '', res.ref || '', size || 0]);
    const last = lg.getLastRow();
    if (last > LOG_MAX_ROWS + 1) lg.deleteRows(2, last - 1 - Math.floor(LOG_MAX_ROWS * 0.75));
  } catch (err) {
    console.error('log failed: ' + err);
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(error, status, field) {
  return field ? { ok: false, error: error, field: field, status: status } : { ok: false, error: error, status: status };
}
function refused_(error, status, field, ref) {
  return { reply: fail_(error, status, field), outcome: 'refused', field: field || '', ref: ref || '' };
}
function bad_(error, field, status) { return { error: error, field: field, status: status || 400 }; }
function configured_() { return !!TOKEN && TOKEN !== PLACEHOLDER; }

/* ---------- retention, triggers, self-test ------------------------------ */

/**
 * Deletes every order whose date needed is more than KEEP_MONTHS ago, and log
 * lines older than LOG_KEEP_DAYS. Run monthly (installMonthlyPurge), it keeps the
 * privacy notice's promise: deleted within 12 months after the delivery date.
 */
function purgeOld() {
  const ss = ss_();
  const cutoff = monthsBack_(today_(), KEEP_MONTHS);
  let removed = 0;
  const sh = ss.getSheetByName(SHEET);
  if (sh && sh.getLastRow() >= 2) {
    const col = readHeader_(sh).map.dateNeeded;
    if (!col) throw new Error('The "' + HEAD[3] + '" column is missing from ' + SHEET + '; nothing was deleted.');
    const vals = sh.getRange(2, col, sh.getLastRow() - 1, 1).getValues();
    const rows = [];
    vals.forEach(function (r, i) { const iso = isoOf_(r[0]); if (iso && iso < cutoff) rows.push(i + 2); });
    removed = deleteRowSet_(sh, rows);
  }
  const lg = ss.getSheetByName(LOG_SHEET);
  let logged = 0;
  if (lg && lg.getLastRow() >= 2) {
    const since = Date.now() - LOG_KEEP_DAYS * 864e5;
    const vals = lg.getRange(2, 1, lg.getLastRow() - 1, 1).getValues();
    const rows = [];
    vals.forEach(function (r, i) { const t = r[0] instanceof Date ? r[0].getTime() : Date.parse(r[0]); if (t && t < since) rows.push(i + 2); });
    logged = deleteRowSet_(lg, rows);
  }
  console.log('purgeOld: removed ' + removed + ' order row(s) dated before ' + cutoff + ' and ' + logged + ' log line(s)');
  return removed;
}

function isoOf_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const s = String(v == null ? '' : v).trim().replace(/^'/, '');
  return realDate_(s) ? s : '';
}

function monthsBack_(iso, months) {
  const t = new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1 - months, Number(iso.slice(8, 10))));
  return t.getUTCFullYear() + '-' + pad_(t.getUTCMonth() + 1) + '-' + pad_(t.getUTCDate());
}

/** Deletes the given rows (ascending numbers), bottom first so the numbers hold,
    in runs so a long purge is a few calls rather than hundreds. */
function deleteRowSet_(sh, rows) {
  if (!rows.length) return 0;
  // Sheets refuses to delete every row below a frozen header, so keep one blank row
  if (sh.getMaxRows() - rows.length <= sh.getFrozenRows()) sh.insertRowsAfter(sh.getMaxRows(), 1);
  let i = rows.length - 1;
  while (i >= 0) {
    let start = rows[i];
    const end = rows[i];
    while (i > 0 && rows[i - 1] === start - 1) { i -= 1; start -= 1; }
    sh.deleteRows(start, end - start + 1);
    i -= 1;
  }
  return rows.length;
}

/** Run once from the editor: purgeOld on the 1st of every month, early morning. */
function installMonthlyPurge() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'purgeOld') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('purgeOld').timeBased().onMonthDay(1).atHour(4).create();
  console.log('installMonthlyPurge: purgeOld will run on the 1st of every month');
}

/**
 * Run from the editor after setupSheet. It posts a test order through doPost,
 * checks the answers the website relies on, then deletes its own test row. One
 * test email goes to NOTIFY, so you can see that notification works.
 */
function selfTest() {
  if (!configured_()) throw new Error('Set TOKEN first (step 4 at the top of this file).');
  const sh = bookings_();
  const date = Utilities.formatDate(new Date(Date.now() + 2 * 864e5), TZ, 'yyyy-MM-dd');
  const ref = 'LH' + date.replace(/-/g, '').slice(2) + '-TEST';
  const id = 'selftest' + Date.now().toString(36);
  const row = {
    received: '', ref: ref, status: 'new', dateNeeded: date, window: '10:00–12:00', fulfil: FULFIL.pickup,
    items: 'ทดสอบระบบ (selfTest) ไม่ใช่คำจองจริง', brief: '', budget: '', subtotal: 1090, quoteNeeded: '',
    customerName: '=ทดสอบ selfTest', customerPhone: '0812345678', recipientName: '', recipientPhone: '',
    address: '', district: '', province: '', card: '+ทดสอบ', anonymous: '', lang: 'th', notes: '', id: id, customerLine: '@selftest',
  };
  const call = function (patch) {
    const body = Object.assign({ v: 1, secret: TOKEN, source: 'selftest', reservations: [row], hp: '' }, patch || {});
    return JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } }).getContent());
  };
  const results = [];
  const check = function (name, ok) { results.push((ok ? 'PASS ' : 'FAIL ') + name); };

  let r = call();
  check('a valid order is written and its ref comes back', r.ok === true && r.ref === ref && !r.duplicate);
  r = call();
  check('the same order again is a duplicate, not a second row', r.ok === true && r.duplicate === true && r.ref === ref);
  r = call({ secret: TOKEN + 'x' });
  check('a wrong token is refused', r.ok === false && r.error === 'bad_secret');
  r = call({ hp: 'x', reservations: [Object.assign({}, row, { id: id + 'hp' })] });
  const map = readHeader_(sh).map;
  check('the honeypot answers ok and writes nothing', r.ok === true && !findRow_(sh, map, 'id', id + 'hp'));
  r = call({ reservations: [] });
  check('an order with no row is refused', r.ok === false && r.error === 'no_reservations');
  r = call({ reservations: [Object.assign({}, row, { id: id + 'big', customerName: new Array(CAPS.customerName + 2).join('ก') })] });
  check('an oversized field is refused', r.ok === false && r.error === 'too_long');
  const at = findRow_(sh, map, 'id', id);
  check('exactly one test row exists', !!at);
  if (at) {
    const name = sh.getRange(at, map.customerName);
    check('a leading = is kept as text, not a formula', name.getFormula() === '' && String(name.getDisplayValue()).indexOf('=ทดสอบ selfTest') >= 0);
    check('the phone keeps its leading 0', String(sh.getRange(at, map.customerPhone).getDisplayValue()).indexOf('081') === 0);
    check('a new order starts as ' + STATUSES[0], String(sh.getRange(at, map.status).getDisplayValue()) === STATUSES[0]);
    sh.deleteRow(at);
  }
  results.forEach(function (line) { console.log(line); });
  const failed = results.filter(function (x) { return x.indexOf('FAIL') === 0; }).length;
  if (failed) throw new Error('selfTest: ' + failed + ' check(s) failed, see the log above');
  console.log('selfTest: all checks passed. ' + (NOTIFY ? 'A test email should now be in ' + NOTIFY + '.' : 'NOTIFY is empty, so no email was sent.'));
}
