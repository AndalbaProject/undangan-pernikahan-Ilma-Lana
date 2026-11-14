/**
 * ============================================================================
 * SCRIPT RSVP & UCAPAN DOA RESTU (GOOGLE APPS SCRIPT)
 * Undangan Pernikahan: Ilma & Lana
 * ============================================================================
 * 
 * PANDUAN SINGKAT PEMASANGAN:
 * 1. Buka Google Spreadsheet baru di https://sheets.google.com/
 * 2. Beri nama spreadsheet, misalnya: "RSVP Pernikahan Ilma & Lana"
 * 3. Buka menu: Ekstensi > Apps Script
 * 4. Hapus seluruh kode yang ada di Apps Script, lalu PASTE SELURUH KODE INI
 * 5. Klik ikon Simpan (Disk/Ctrl+S)
 * 6. Klik tombol "Deploy" (Terapkan) di kanan atas > "New deployment" (Penerapan baru)
 * 7. Pilih jenis: "Web app" (Aplikasi web)
 * 8. Konfigurasi Deployment:
 *    - Description : RSVP Web App Ilma & Lana
 *    - Execute as  : Me (Saya - email Anda)
 *    - Who has access: Anyone (Siapa saja)  <-- WAJIB PILIH INI agar tamu bisa kirim tanpa login
 * 9. Klik "Deploy", lalu klik "Authorize access" dan izinkan akses akun Google Anda
 * 10. Salin "Web App URL" (akhiran /exec)
 * 11. Buka file assets/site/wp-content/plugins/bisdev-pro/assets/dist/js/rsvp-gsheet.js
 *     dan paste URL tersebut pada variabel GOOGLE_SCRIPT_URL.
 * ============================================================================
 */

// Nama sheet tempat menyimpan data
const SHEET_NAME = "RSVP";

/**
 * Menangani pengiriman data RSVP dari website (Metode POST)
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  // Kunci sementara selama maksimal 10 detik agar penulisan baris tidak bertabrakan jika ada request bersamaan
  lock.tryLock(10000);

  try {
    const sheet = getOrCreateSheet();
    let data = {};

    // Dukung parsing dari URL-encoded form data maupun JSON body
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e.parameter) {
      data = e.parameter;
    }

    // Ambil data yang dikirimkan
    const nama = (data.nama || data.name || "Tamu Undangan").toString().trim();
    const kehadiran = (data.kehadiran || data.presence || "Hadir").toString().trim();
    const ucapan = (data.ucapan || data.pesan || data.message || "-").toString().trim();
    
    // Format timestamp otomatis waktu Indonesia Barat (WIB)
    const timestamp = Utilities.formatDate(new Date(), "Asia/Jakarta", "dd/MM/yyyy HH:mm:ss");

    // Tulis baris baru ke spreadsheet
    sheet.appendRow([timestamp, nama, kehadiran, ucapan]);

    // Respon JSON sukses
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Data RSVP berhasil disimpan!",
      data: {
        timestamp: timestamp,
        nama: nama,
        kehadiran: kehadiran,
        ucapan: ucapan
      }
    })).setMimeType(ContentService.MimeType.JSON);

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
 * Digunakan website untuk membaca komentar/ucapan yang sudah tersimpan
 */
function doGet(e) {
  try {
    const sheet = getOrCreateSheet();
    const rows = sheet.getDataRange().getValues();
    const rsvps = [];

    // Baris ke-0 adalah Header, data dimulai dari baris ke-1
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] || rows[i][1]) {
        rsvps.push({
          timestamp: rows[i][0],
          nama: rows[i][1],
          kehadiran: rows[i][2],
          ucapan: rows[i][3]
        });
      }
    }

    // Urutkan dari yang terbaru ke terlama
    rsvps.reverse();

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      total: rsvps.length,
      data: rsvps
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
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
    sheet.setName(SHEET_NAME);
  }

  // Jika sheet kosong / belum ada header, buat baris judul otomatis
  if (sheet.getLastRow() === 0) {
    const headers = ["Waktu (WIB)", "Nama Tamu", "Konfirmasi Kehadiran", "Ucapan & Doa Restu"];
    sheet.appendRow(headers);

    // Styling Header agar elegan: Bold, teks putih, latar belakang navy (#103468)
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#103468");
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 35);
    sheet.setFrozenRows(1);
    
    // Sesuaikan lebar kolom agar rapi
    sheet.setColumnWidth(1, 160); // Waktu
    sheet.setColumnWidth(2, 220); // Nama Tamu
    sheet.setColumnWidth(3, 160); // Kehadiran
    sheet.setColumnWidth(4, 400); // Ucapan & Doa
  }

  return sheet;
}

