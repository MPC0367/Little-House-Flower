# Little House Flower

The official website of Little House Flower, a florist in Mueang Nonthaburi (Rattanathibet), Thailand.
It shows the shop's bouquets, baskets, boxes, garlands, money bouquets and wreaths. Customers can place an
order or write a custom brief, and the shop confirms every order with them on LINE.

- Live: <https://mpc0367.github.io/Little-House-Flower/>. GitHub Pages publishes the `main` branch.
- Thai is the default language. Add `?lang=en` before the `#` for English, for example
  `https://mpc0367.github.io/Little-House-Flower/?lang=en`.
- Orders and questions: LINE [@littlehouseflower](https://lin.ee/2RYsFwz) · 062 749 5533.
- Built and maintained by [O2 Design Studio](https://o2-designstudio.com).

## What is in this repository

| Path | What it is |
|---|---|
| `index.html` | The whole site in one file: styles, scripts, Thai and English text, and the product list. Each part starts with a marker comment such as `/* ---- data/catalog.js ---- */`. Search for the marker to jump to that part. |
| `img/` | The shop's photos, in the sizes the page uses. |
| `sheet.json` | Where the order form sends orders: the Apps Script `endpoint` (a `/exec` URL) and its `secret` (the token). The page reads it on every visit, so the site can be repointed without touching `index.html`. |
| `google/Code.gs` | The order back end: a Google Apps Script that writes each order into the shop's Google Sheet. This is the reviewed copy. The running copy lives in the Sheet (Extensions > Apps Script). The deploy steps, in English and Thai, are at the top of the file. |
| `manifest.webmanifest` and the icon files | The name and icon a phone uses when the site is added to the home screen. |
| `404.html` | Sends a mistyped or old address back into the site. |

The shop's Google Sheet is the back office. `#/admin` (a 4-digit code, not linked from the public pages) shows the queue and day view for orders placed on the same device — useful for showing staff how orders look, not a shared inbox.

## How an order reaches the shop

1. The customer builds the order: a bouquet or a custom brief, a date and time window, pickup or delivery,
   contact details and the card message. Then they press Send.
2. The page reads `sheet.json` and posts one JSON row to the Apps Script URL:
   `{v: 1, secret, source: 'web', reservations: [row], hp}`. The body is sent as `text/plain`, so the
   browser posts it without a preflight request, which an Apps Script web app cannot answer.
3. `google/Code.gs` checks the order. It checks the token, a hidden honeypot field, the shape and length of
   every field, the date and time window, and a daily cap. Then it writes one row to the **Bookings** tab of
   the shop's Sheet, emails the shop, and replies `{ok: true, ref}`. If the same order arrives twice, the
   second copy is answered as a duplicate and not written again.
4. The page shows its confirmation only after that reply. The confirmation shows the reservation number and
   asks the customer to send it to the shop on LINE. If the Sheet does not answer, or answers with an error,
   the page says plainly that the order has not reached the shop yet. It keeps everything the customer
   typed and offers Retry, LINE and phone.
5. The shop confirms the order with the customer on LINE (price, payment, delivery fee), then updates the
   Status column in the Sheet. Nothing flows back to the website.

**The token is public by nature.** The browser has to send it, so anyone can read it in `sheet.json`. It
only turns away scripts that post to Apps Script URLs blindly. The real protection is the server-side
checks in `Code.gs`. Changing the token is useful only to stop a flood of spam. Change it in `Code.gs`
(then deploy a new version) and in `sheet.json` together, as described at the top of `Code.gs`.

The row's field names are the contract between the site and the script: `FIELDS` in `core/sink.js`
(inside `index.html`) and `FIELDS` in `google/Code.gs`. Change them in both places at once, or not at all.

## Changing common things

Everything below is in `index.html` unless stated otherwise. Search for the marker, change the value,
check the page in Thai and English, then publish.

| To change | Where |
|---|---|
| A price, a product, its photos, its lead time or its availability | `data/catalog.js` → `products`. `pricing` is `fixed`, `tiers`, `from`, `range` or `quote`. |
| How long prices are valid | `priceValidUntil` in `data/settings.js` (`LHF.data.policies`) and on each product. After that date the site shows "price on request" (สอบถามราคา) by itself. Extend the date only after the shop confirms its prices. |
| Hours, phone, LINE, email, address, service area | `data/settings.js` → `LHF.data.shop`. Some of these also appear in the `<head>` (description and JSON-LD) and in the `<noscript>` line, so search for the old value and change every copy. If the opening hours change, also change `OPEN_FROM` and `OPEN_UNTIL` in `google/Code.gs` and deploy a new version. Otherwise orders for the new hours are refused. |
| Closed dates, time windows, the evening cut-off, lead time | `data/settings.js` → `LHF.data.bookingDefaults`: `blackoutDates` as `'YYYY-MM-DD'`, `windows`, `cutoffHour` and `leadTimeDays`. The site works these out in Bangkok time, whatever the visitor's clock says. |
| Words on the site | `data/strings.js`, one line per key: `'key': { th: '…', en: '…' },`. Write the Thai in Thai. Don't translate it from the English. |
| A photo | Put the files in `img/` and update that photo's entry in `window.__LHF_IMAGES`, a long line near the top of the scripts. The entry holds the path, width, height, and Thai and English alt text. |
| How orders are received | `google/Code.gs`. Edit it in the Sheet's Apps Script editor, then choose Deploy > Manage deployments > Edit > New version. Copy the edited file back here. |

## Publishing

Everything on `main` is live. GitHub Pages publishes it a minute or two after a push. Work on a branch, and
merge to `main` only what the shop has approved.

Before merging, open every page in Thai and English at phone and desktop widths with the browser console
open, and check that there are no errors. Place test orders only against a **test** deployment, never the
shop's live Sheet.

### Testing orders without touching the shop's Sheet

Serve the folder with any static file server. The page fetches `sheet.json`, which doesn't work from a
`file://` URL. The order form posts to whatever `sheet.json` names, so before testing orders, do one of
these:

- Make a Sheet in a test account, deploy `google/Code.gs` there, and point a local, uncommitted copy of
  `sheet.json` at that `/exec` URL.
- Set `"enabled": false` in the local copy, so that nothing is sent.

Never commit a test `sheet.json`. The only test order on the live site is the one agreed check after a
deployment, and that row is deleted from the Sheet straight afterwards.

## Customer data and photos

- **Customer data never goes in this repository.** The repository is public. Don't commit exported rows,
  screenshots of the Sheet, or real names or phone numbers, whether in files, test fixtures or commit
  messages.
- Orders are kept only in the shop's Google Sheet. `Code.gs` deletes each order 11 months after its date,
  from a monthly trigger. This matches the site's privacy notice (`#/privacy`), which promises deletion
  within 12 months after delivery.
- The Sheet is shared with named people only, never with "anyone with the link".
- The photos, the name Little House Flower and its logo belong to the shop. Don't reuse them anywhere else
  without the shop's permission.

## ภาษาไทย สำหรับร้าน

**เว็บไซต์นี้คืออะไร**
เว็บไซต์ทางการของร้าน Little House Flower ลูกค้าเลือกช่อดอกไม้หรือเขียนโจทย์พิเศษ เลือกวันและช่วงเวลา
แล้วกดส่งคำจองได้เอง ส่วนการยืนยันคำจองกับลูกค้า ร้านยังทำทาง LINE เหมือนเดิม

**คำจองไปที่ไหน**
ทุกคำจองจะเข้า Google Sheet ของร้านที่แท็บ Bookings คำจองละ 1 แถว และร้านจะได้อีเมลแจ้งทุกครั้ง
ลูกค้าจะเห็นหน้ายืนยันพร้อมหมายเลขคำจองก็ต่อเมื่อชีตรับคำจองแล้วเท่านั้น หน้ายืนยันจะชวนลูกค้าส่งหมายเลขคำจอง
มาทาง LINE ด้วย ถ้าส่งไม่สำเร็จ หน้าเว็บจะบอกลูกค้าตรงๆ ว่าคำจองยังไม่ถึงร้าน แล้วให้ทัก LINE หรือโทรหาร้านแทน

**งานประจำวัน**
1. เปิดชีต แล้วดูแถวที่สถานะเป็น "รอยืนยัน"
2. ทัก LINE หรือโทรหาลูกค้า เพื่อยืนยันคิว ยอด วิธีชำระเงิน และค่าส่ง
3. เปลี่ยนสถานะในชีตตามงานจริง คือ ยืนยันแล้ว → กำลังจัด → พร้อมรับ หรือ ออกจากบ้านแล้ว → ถึงมือแล้ว
   (หรือ ยกเลิก) แล้วอัปเดตช่องชำระเงินด้วย
4. ถ้าลูกค้ามีรูปตัวอย่าง ลูกค้าจะส่งรูปมาทาง LINE พร้อมหมายเลขคำจอง

**ข้อควรระวัง**
- ห้ามแชร์ลิงก์ชีตแบบ "ทุกคนที่มีลิงก์" เพราะในชีตมีชื่อ เบอร์โทร และที่อยู่ของลูกค้า
- ห้ามแก้ชื่อหัวคอลัมน์ในแถวแรก ถ้าอยากเพิ่มคอลัมน์ของร้านเอง ให้เพิ่มไว้ทางขวาสุด
- ระบบจะลบคำจองที่เลยวันใช้มาแล้ว 11 เดือนให้เองทุกเดือน
- ถ้าอยากเปลี่ยนราคา เวลาเปิดปิด วันหยุด รูป หรือข้อความบนเว็บ แจ้ง O2 Design Studio ได้เลย
- ถ้าเว็บมีปัญหา ลูกค้ายังทัก LINE @littlehouseflower หรือโทร 062 749 5533 ได้ตามปกติ
