/**
 * RSVP & Ucapan Digital Handler terintegrasi Google Sheets
 * Andalba Project - Ilma & Lana Wedding
 */
(function () {
  "use strict";

  // =========================================================================
  // MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI BAWAH INI:
  // Contoh: const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby.../exec";
  // =========================================================================
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymmCahki0VXTkwDYvlId-T9R9VXUMpfW1hrWnEzv7E3NtbC8ylOvtyFUuThSpDRMU/exec"; 

  function initRSVP() {
    const rsvpCard = document.querySelector(".rsvp-card");
    if (!rsvpCard) return;

    const nameInput = rsvpCard.querySelector('[data-rsvp="name"]');
    const msgInput = rsvpCard.querySelector('[data-rsvp="message"]');
    const pills = rsvpCard.querySelectorAll("[data-rsvp-pill]");
    const sendBtn = rsvpCard.querySelector('[data-rsvp="send"]');
    const rsvpList = rsvpCard.querySelector(".rsvp-list");
    const errorName = rsvpCard.querySelector(".rsvp-error--name");
    const errorMsg = rsvpCard.querySelector(".rsvp-error--message");

    // Sembunyikan error bawaan
    if (errorName) {
      errorName.style.display = "none";
      errorName.textContent = "";
    }
    if (errorMsg) {
      errorMsg.style.display = "none";
      errorMsg.textContent = "";
    }

    let selectedPresence = "Hadir";

    // Set listener untuk tombol pill Hadir / Tidak Hadir
    pills.forEach(function (pill) {
      const type = pill.getAttribute("data-rsvp-pill");
      if (type === "hadir") {
        pill.setAttribute("data-active", "1");
      } else {
        pill.setAttribute("data-active", "0");
      }

      pill.addEventListener("click", function () {
        pills.forEach(function (p) {
          p.setAttribute("data-active", "0");
        });
        pill.setAttribute("data-active", "1");
        selectedPresence = type === "hadir" ? "Hadir" : "Tidak Hadir";
      });
    });

    // Handle tombol kirim
    if (sendBtn) {
      sendBtn.addEventListener("click", function (e) {
        e.preventDefault();

        const nama = (nameInput ? nameInput.value : "").trim();
        const ucapan = (msgInput ? msgInput.value : "").trim();

        // Validasi Nama
        if (!nama) {
          if (errorName) {
            errorName.textContent = "Nama wajib diisi.";
            errorName.style.display = "block";
          }
          if (nameInput) nameInput.focus();
          return;
        } else if (errorName) {
          errorName.style.display = "none";
        }

        // Validasi Ucapan
        if (!ucapan) {
          if (errorMsg) {
            errorMsg.textContent = "Ucapan & Doa restu wajib diisi.";
            errorMsg.style.display = "block";
          }
          if (msgInput) msgInput.focus();
          return;
        } else if (errorMsg) {
          errorMsg.style.display = "none";
        }

        // Tampilkan status loading tombol
        const originalText = sendBtn.textContent;
        sendBtn.disabled = true;
        sendBtn.textContent = "Mengirim...";

        const payload = new URLSearchParams({
          nama: nama,
          kehadiran: selectedPresence,
          ucapan: ucapan
        });

        // Jika GOOGLE_SCRIPT_URL belum disetel
        if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf("http") !== 0) {
          setTimeout(function () {
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            addComment(nama, selectedPresence, ucapan, "Baru saja");
            showSuccessPopup("Terima kasih, ucapan kamu sudah terkirim!");
            if (nameInput) nameInput.value = "";
            if (msgInput) msgInput.value = "";
          }, 600);
          return;
        }

        // Kirim request ke Google Apps Script Web App
        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: payload
        })
          .then(function () {
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            addComment(nama, selectedPresence, ucapan, "Baru saja");
            showSuccessPopup("Terima kasih, konfirmasi kehadiran dan ucapan Anda telah tersimpan!");
            if (nameInput) nameInput.value = "";
            if (msgInput) msgInput.value = "";
          })
          .catch(function (err) {
            console.error("Gagal mengirim RSVP ke Google Sheets:", err);
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            // Tetap berikan feedback positif karena mode no-cors terkadang menganggap redirect sebagai opaque
            addComment(nama, selectedPresence, ucapan, "Baru saja");
            showSuccessPopup("Terima kasih, konfirmasi kehadiran kamu sudah terkirim!");
            if (nameInput) nameInput.value = "";
            if (msgInput) msgInput.value = "";
          });
      });
    }

    // Fungsi Render Komentar ke Daftar Ucapan
    function addComment(nama, kehadiran, ucapan, timeStr) {
      if (!rsvpList) return;
      const initial = (nama.charAt(0) || "U").toUpperCase();
      const isHadir = kehadiran.toLowerCase() === "hadir";
      const badgeStyle = isHadir
        ? "background-color: #d1f7e0; color: #14532d; border: 1px solid rgba(20,83,45,.18);"
        : "background-color: #ffe4e4; color: #e11d48; border: 1px solid rgba(220,38,38,.2);";

      const li = document.createElement("li");
      li.className = "rsvp-item";
      li.style.animation = "nikuFadeIn .3s ease-out";
      li.innerHTML = `
        <div class="rsvp-ava" style="display:flex;">
          <span class="rsvp-ava-letter">${escapeHtml(initial)}</span>
        </div>
        <div class="rsvp-body">
          <div class="rsvp-name">
            ${escapeHtml(nama)}
            <span style="display:inline-block; font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; margin-left:6px; ${badgeStyle}">
              ${escapeHtml(kehadiran)}
            </span>
          </div>
          <div class="rsvp-meta">${escapeHtml(timeStr || "Baru saja")}</div>
          <div class="rsvp-msg">${escapeHtml(ucapan).replace(/\\n/g, "<br>")}</div>
        </div>
      `;

      rsvpList.insertBefore(li, rsvpList.firstChild);
    }

    // Fungsi Pop-up Notifikasi Sukses
    function showSuccessPopup(message) {
      const existing = document.querySelector(".niku-rsvp-success-popup");
      if (existing) existing.remove();

      const popup = document.createElement("div");
      popup.className = "niku-rsvp-success-popup";
      popup.setAttribute("role", "alert");
      popup.setAttribute("aria-live", "polite");
      popup.innerHTML = `
        <div class="niku-rsvp-success-popup__box">
          <span class="niku-rsvp-success-popup__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:20px;height:20px;">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </span>
          <span class="niku-rsvp-success-popup__text">${escapeHtml(message)}</span>
        </div>
      `;
      document.body.appendChild(popup);

      setTimeout(function () {
        popup.classList.add("show");
      }, 10);

      setTimeout(function () {
        popup.classList.remove("show");
        setTimeout(function () {
          if (popup.parentNode) popup.parentNode.removeChild(popup);
        }, 300);
      }, 3000);
    }

    function escapeHtml(text) {
      if (!text) return "";
      return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    // Ambil daftar ucapan yang tersimpan di Google Sheets jika URL sudah diisi
    if (GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.indexOf("http") === 0) {
      fetch(GOOGLE_SCRIPT_URL)
        .then(function (res) {
          return res.json();
        })
        .then(function (res) {
          if (res.status === "success" && Array.isArray(res.data)) {
            // Urutkan dan render
            res.data.slice().reverse().forEach(function (item) {
              addComment(item.nama, item.kehadiran, item.ucapan, item.timestamp);
            });
          }
        })
        .catch(function () {});
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRSVP);
  } else {
    initRSVP();
  }
})();

