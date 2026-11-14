/**
 * ============================================================================
 * SCRIPT RSVP & UCAPAN DOA RESTU (GOOGLE APPS SCRIPT)
 * Undangan Pernikahan: Ilma & Lana
 * ============================================================================
 * 
 * PANDUAN PEMASANGAN KE GOOGLE APPS SCRIPT:
 * 1. Buka Google Spreadsheet baru di https://sheets.google.com/
 * 2. Beri nama spreadsheet, misalnya: "RSVP Pernikahan Ilma & Lana"
 * 3. Buka menu: Ekstensi > Apps Script
 * 4. Hapus SEMUA kode yang ada di Apps Script (termasuk fungsi myFunction bawaan)
 * 5. PASTE SELURUH KODE INI (JANGAN PASTE FILE rsvp-gsheet.js!)
 * 6. Klik ikon Simpan (Disk / Ctrl+S)
 * 7. Klik tombol "Deploy" (Terapkan) di kanan atas:
 *    - Jika BARU pertama kali: Pilih "New deployment" (Penerapan baru) > jenis "Web app" (Aplikasi web)
 *    - Jika SUDAH PERNAH: Pilih "Manage deployments" (Kelola penerapan) > Edit (ikon pensil) > Version: "New version" (Versi baru)
 * 8. Konfigurasi Deployment:
 *    - Description   : RSVP Ilma & Lana
 *    - Execute as    : Me (Saya - email pemilik spreadsheet)
 *    - Who has access: Anyone (Siapa saja)  <-- WAJIB PILIH INI agar tamu bisa mengirim & membaca ucapan tanpa login
 * 9. Klik "Deploy", lalu jika diminta klik "Authorize access" dan izinkan dengan akun Google Anda
 * 10. Salin "Web App URL" (akhiran /exec). Pastikan URL tersebut sama dengan yang ada di rsvp-gsheet.js!
 * ============================================================================
 */

const SHEET_NAME = "RSVP";

/**
 * Menangani pengiriman data RSVP dari website (Metode POST)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const sheet = getOrCreateSheet();
    let data = {};

    if (e && e.parameter && Object.keys(e.parameter).length > 0) {
      data = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = {};
      }
    }

    const nama = (data.nama || data.name || "Tamu Undangan").toString().trim();
    const kehadiran = (data.kehadiran || data.presence || "Hadir").toString().trim();
    const ucapan = (data.ucapan || data.pesan || data.message || "-").toString().trim();
    const sesi = (data.sesi || data.session || "Sabtu, 23 Jan 2027").toString().trim();
    
    // Format timestamp otomatis waktu Indonesia Barat (WIB)
    const timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");

    sheet.appendRow([timestamp, nama, kehadiran, ucapan, sesi]);

    const resObj = {
      status: "success",
      message: "Data RSVP berhasil disimpan!",
      data: {
        timestamp: timestamp,
        nama: nama,
        kehadiran: kehadiran,
        ucapan: ucapan
      }
    };

    return ContentService.createTextOutput(JSON.stringify(resObj))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

/**
 * Menangani pengambilan data daftar ucapan (Metode GET)
 * Sekaligus mendukung JSONP (?callback=...) & GET fallback
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    
    // Fallback: simpan jika dikirim via GET
    if (e && e.parameter && e.parameter.action === "add" && (e.parameter.nama || e.parameter.name)) {
      const lock = LockService.getScriptLock();
      lock.tryLock(10000);
      try {
        const nama = (e.parameter.nama || e.parameter.name || "Tamu Undangan").toString().trim();
        const kehadiran = (e.parameter.kehadiran || e.parameter.presence || "Hadir").toString().trim();
        const ucapan = (e.parameter.ucapan || e.parameter.pesan || e.parameter.message || "-").toString().trim();
        const timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm");
        sheet.appendRow([timestamp, nama, kehadiran, ucapan]);
      } finally {
        lock.releaseLock();
      }
    }

    const rows = sheet.getDataRange().getValues();
    const rsvps = [];

    // Baris ke-0 adalah Header, data dimulai dari baris ke-1
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] || row[1] || row[3]) {
        let ts = row[0];
        if (ts instanceof Date) {
          ts = Utilities.formatDate(ts, "Asia/Jakarta", "dd/MM/yyyy HH:mm");
        } else if (ts) {
          ts = ts.toString();
        } else {
          ts = "";
        }

        rsvps.push({
          timestamp: ts,
          nama: row[1] ? row[1].toString() : "Tamu",
          kehadiran: row[2] ? row[2].toString() : "Hadir",
          ucapan: row[3] ? row[3].toString() : ""
        });
      }
    }

    // Urutkan dari yang terbaru ke terlama
    rsvps.reverse();

    const result = JSON.stringify({
      status: "success",
      total: rsvps.length,
      data: rsvps
    });

    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + result + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(result)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errResult = JSON.stringify({
      status: "error",
      message: error.toString()
    });
    const callback = e && e.parameter && e.parameter.callback;
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + errResult + ");")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(errResult)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Helper untuk mendapatkan sheet "RSVP" atau membuat baru beserta Header-nya jika belum ada
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.getActiveSheet();
    if (sheet && sheet.getName() !== SHEET_NAME) {
      try {
        sheet.setName(SHEET_NAME);
      } catch (err) {
        sheet = ss.insertSheet(SHEET_NAME);
      }
    }
  }

  // Jika sheet kosong / belum ada header, buat baris judul otomatis
  if (sheet.getLastRow() === 0) {
    const headers = ["Waktu (WIB)", "Nama Tamu", "Konfirmasi Kehadiran", "Ucapan & Doa Restu"];
    sheet.appendRow(headers);

    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#103468");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
    
    sheet.setColumnWidth(1, 160); // Waktu
    sheet.setColumnWidth(2, 220); // Nama Tamu
    sheet.setColumnWidth(3, 160); // Kehadiran
    sheet.setColumnWidth(4, 420); // Ucapan & Doa
  }

  return sheet;
}
