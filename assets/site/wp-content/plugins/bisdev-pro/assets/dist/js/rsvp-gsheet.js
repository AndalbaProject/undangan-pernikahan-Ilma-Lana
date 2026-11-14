/**
 * RSVP & Ucapan Digital Handler terintegrasi Google Sheets
 * Andalba Project - Ilma & Lana Wedding
 */
(function () {
  "use strict";

  // =========================================================================
  // URL WEB APP GOOGLE APPS SCRIPT:
  // =========================================================================
  const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyHvg_ZNk6CSNRlUE2ldJr1z7GJbGlr8lnIfMzYPD48vmQCZCFq-4DHMHiXiPPrkvI/exec"; 
  const CACHE_KEY = "andalba_rsvp_cache_ilma_lana";

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

    let currentList = [];
    let selectedPresence = "Hadir";

    // 1. Tampilkan data dari LocalStorage terlebih dahulu (Instant Load 0ms)
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentList = parsed;
          renderList(currentList);
        }
      }
    } catch (e) {
      console.warn("RSVP Cache warning:", e);
    }

    // 2. Set listener untuk tombol pill Hadir / Tidak Hadir
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

    // 3. Handle tombol kirim
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

        const urlParams = new URLSearchParams(window.location.search);
        const sesiP = (urlParams.get("sesi") || urlParams.get("session") || "").toLowerCase();
        const tglP = (urlParams.get("tgl") || urlParams.get("tanggal") || "").toLowerCase();
        const hariP = (urlParams.get("hari") || "").toLowerCase();
        const isSesi2 = (sesiP === "2" || tglP === "24" || hariP === "minggu");
        const sesiLabel = isSesi2 ? "Minggu, 24 Jan 2027 (Sesi 1)" : "Sabtu, 23 Jan 2027";

        const payload = new URLSearchParams({
          nama: nama,
          kehadiran: selectedPresence,
          sesi: sesiLabel,
          ucapan: ucapan
        });

        // Simpan langsung secara lokal ke UI agar instan terlihat
        const newEntry = {
          nama: nama,
          kehadiran: selectedPresence,
          ucapan: ucapan,
          timestamp: "Baru saja"
        };
        currentList.unshift(newEntry);
        renderList(currentList);
        saveCache(currentList);

        if (nameInput) nameInput.value = "";
        if (msgInput) msgInput.value = "";

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
            showSuccessPopup("Terima kasih, konfirmasi kehadiran dan ucapan Anda telah tersimpan!");
            // Sinkronisasi ulang dari spreadsheet setelah 2.5 detik
            setTimeout(fetchComments, 2500);
          })
          .catch(function (err) {
            console.error("Gagal mengirim RSVP ke Google Sheets:", err);
            sendBtn.disabled = false;
            sendBtn.textContent = originalText;
            showSuccessPopup("Terima kasih, ucapan kamu sudah dicatat!");
            setTimeout(fetchComments, 2500);
          });
      });
    }

    // 4. Render Seluruh Daftar Komentar
    function renderList(items) {
      if (!rsvpList) return;
      if (!Array.isArray(items) || items.length === 0) return;

      const html = items.map(function (item) {
        const initial = (item.nama ? item.nama.charAt(0) : "T").toUpperCase();
        const isHadir = (item.kehadiran || "").toLowerCase() === "hadir";
        const badgeStyle = isHadir
          ? "background-color: #d1f7e0; color: #14532d; border: 1px solid rgba(20,83,45,.18);"
          : "background-color: #ffe4e4; color: #e11d48; border: 1px solid rgba(220,38,38,.2);";
        const timeStr = item.timestamp || "Baru saja";

        return `
          <li class="rsvp-item" style="animation: nikuFadeIn .3s ease-out;">
            <div class="rsvp-ava" style="display:flex;">
              <span class="rsvp-ava-letter">${escapeHtml(initial)}</span>
            </div>
            <div class="rsvp-body">
              <div class="rsvp-name">
                ${escapeHtml(item.nama)}
                <span style="display:inline-block; font-size:10px; font-weight:600; padding:2px 8px; border-radius:6px; margin-left:6px; ${badgeStyle}">
                  ${escapeHtml(item.kehadiran || "Hadir")}
                </span>
              </div>
              <div class="rsvp-meta">${escapeHtml(timeStr)}</div>
              <div class="rsvp-msg">${escapeHtml(item.ucapan).replace(/\n/g, "<br>")}</div>
            </div>
          </li>
        `;
      }).join("");

      rsvpList.innerHTML = html;
    }

    function saveCache(data) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (e) {}
    }

    // 5. Pop-up Notifikasi Sukses
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

    // 6. Mengambil Data Ucapan dari Google Sheets (Fetch + JSONP Fallback)
    function fetchComments() {
      if (!GOOGLE_SCRIPT_URL || GOOGLE_SCRIPT_URL.indexOf("http") !== 0) return;

      let fetchedSuccessfully = false;
      const fetchTimer = setTimeout(function () {
        if (!fetchedSuccessfully) {
          fetchViaJsonp();
        }
      }, 3500);

      fetch(GOOGLE_SCRIPT_URL + "?_ts=" + Date.now(), {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      })
        .then(function (res) {
          return res.json();
        })
        .then(function (res) {
          fetchedSuccessfully = true;
          clearTimeout(fetchTimer);
          if (res && res.status === "success" && Array.isArray(res.data)) {
            currentList = res.data;
            renderList(currentList);
            saveCache(currentList);
          }
        })
        .catch(function () {
          if (!fetchedSuccessfully) {
            clearTimeout(fetchTimer);
            fetchViaJsonp();
          }
        });
    }

    // Fallback JSONP jika browser memblokir fetch lintas domain
    function fetchViaJsonp() {
      const callbackName = "andalbaRsvpCb_" + Date.now();
      const script = document.createElement("script");

      window[callbackName] = function (res) {
        try {
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        } catch (e) {}

        if (res && res.status === "success" && Array.isArray(res.data)) {
          currentList = res.data;
          renderList(currentList);
          saveCache(currentList);
        }
      };

      script.src = GOOGLE_SCRIPT_URL + (GOOGLE_SCRIPT_URL.indexOf("?") === -1 ? "?" : "&") + "callback=" + callbackName + "&_t=" + Date.now();
      script.onerror = function () {
        try {
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
        } catch (e) {}
      };

      document.head.appendChild(script);
    }

    // Jalankan pengambilan komentar pertama kali
    fetchComments();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRSVP);
  } else {
    initRSVP();
  }
})();
