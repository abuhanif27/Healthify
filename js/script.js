// ---- Tab logic ----
const tabs = document.querySelectorAll(".tab-btn");
const panels = document.querySelectorAll(".tab-panel");
tabs.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabs.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    panels.forEach((p) => (p.style.display = "none"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    const id = btn.dataset.tab;
    document.getElementById(id).style.display = "block";
  });
});

// ---- State ----
let finderItems = [];
let finderPage = 0;
const finderPageSize = 3;

// ---- Helpers ----
const sanitize = (s = "") =>
  s.replace(/[<>]/g, (ch) => ({ "<": "&lt;", ">": "&gt;" }[ch]));

// Analysis builder
function buildAnalysis(symptoms, duration, age) {
  const s = symptoms.toLowerCase();
  const buckets = [
    {
      keys: ["sore throat", "throat pain", "scratchy throat", "tonsil"],
      info: "Symptoms like throat discomfort can sometimes be associated with minor upper‑airway irritation from viral colds, dry air, or allergens.",
    },
    {
      keys: ["cough", "coughing"],
      info: "Cough may accompany common colds or exposure to irritants. Dry environments and post‑nasal drip can make it feel worse at night.",
    },
    {
      keys: ["fever", "temperature", "37."],
      info: "A mild temperature can occur when the body mounts a response to many minor infections.",
    },
    {
      keys: ["headache", "migraine"],
      info: "Headache can appear with lack of sleep, stress, dehydration, or alongside mild respiratory infections.",
    },
    {
      keys: ["fatigue", "tired", "weak"],
      info: "Feeling tired can relate to recovery from an illness, poor rest, or low hydration.",
    },
    {
      keys: ["runny nose", "stuffy", "congestion", "sneezing"],
      info: "Nasal symptoms may reflect common colds or seasonal sensitivities.",
    },
    {
      keys: ["nausea", "vomit", "diarrhea", "stomach"],
      info: "Digestive discomfort can occasionally accompany viral illnesses or dietary upsets.",
    },
  ];
  const general = [];
  for (const b of buckets)
    if (b.keys.some((k) => s.includes(k))) general.push(b.info);
  if (general.length === 0)
    general.push(
      "These symptoms can sometimes be associated with everyday issues like mild viral illnesses, allergies, environmental irritation, stress, or dehydration."
    );

  const parts = [];
  parts.push(
    "<strong>This is not a medical diagnosis. Please consult a healthcare professional for accurate advice.</strong>"
  );
  const meta = [];
  if (duration) meta.push(`for ${sanitize(duration)}`);
  if (age) meta.push(`age ${sanitize(String(age))}`);
  const echo = sanitize(symptoms.trim());
  parts.push(
    `<p><em>Summary you provided${
      meta.length ? " (" + meta.join(", ") + ")" : ""
    }:</em> ${echo || "..."}</p>`
  );
  parts.push("<h3>General information</h3>");
  parts.push("<p>" + general.join(" ") + "</p>");
  parts.push("<h3>Recommendation</h3>");
  parts.push(
    "<p>Please consider seeing a doctor for proper evaluation, especially if symptoms are severe, persistent, or worsening. Seek urgent care for red‑flag issues such as trouble breathing, severe or ongoing high fever, chest pain, stiff neck, confusion, a spreading rash, dehydration, or difficulty swallowing.</p>"
  );
  return parts.join("\n");
}

// Tips builder
function buildTips(symptoms) {
  const s = symptoms.toLowerCase();
  const tips = new Set();
  tips.add(
    "Sip water or warm fluids regularly to stay comfortable and hydrated."
  );
  tips.add("Prioritize extra rest and gentle routines to support recovery.");
  if (/throat|tonsil|voice/.test(s)) {
    tips.add(
      "Gargle gently with warm salt water 2–3× daily for throat comfort."
    );
    tips.add(
      "Use a clean cool‑mist humidifier to keep indoor air comfortable."
    );
  }
  if (/cough|congestion|sneeze|runny|stuffy/.test(s)) {
    tips.add("Elevate your head slightly during rest to ease breathing.");
    tips.add(
      "Take a warm shower and breathe the steam for short‑term comfort."
    );
  }
  if (/headache|tired|fatigue/.test(s)) {
    tips.add("Aim for consistent sleep and dim evening lighting to wind down.");
    tips.add("Have light, balanced meals and avoid skipping meals.");
  }
  if (/nausea|stomach|vomit|diarrhea/.test(s)) {
    tips.add(
      "Try small, bland foods (e.g., crackers, rice, bananas) and sip fluids slowly."
    );
    tips.add("Avoid heavy, very spicy, or greasy meals until you feel better.");
  }
  return Array.from(tips)
    .slice(0, 5)
    .map((t) => `• ${t}`)
    .join("\n");
}

// Finder data builder
function getFinderData(type, location) {
  const dhakaHospitals = [
    {
      name: "Evercare Hospital Dhaka",
      desc: "Large multidisciplinary private hospital with emergency services.",
    },
    {
      name: "Square Hospitals Ltd.",
      desc: "Tertiary care facility offering a wide range of specialties.",
    },
    {
      name: "United Hospital Limited",
      desc: "Private hospital with emergency care and diagnostics.",
    },
    {
      name: "BSMMU (Bangabandhu Sheikh Mujib Medical University)",
      desc: "Public medical university hospital with specialist clinics.",
    },
  ];
  const dhakaPharmacies = [
    {
      name: "Lazz Pharma (selected branches)",
      desc: "Well‑known pharmacy chain; some outlets run late or 24/7.",
    },
    {
      name: "Popular Pharmacy (selected branches)",
      desc: "Network with extended hours at key locations.",
    },
    {
      name: "Medicine Point (selected branches)",
      desc: "Community pharmacies; certain locations open late.",
    },
    {
      name: "Arogga Partner Pharmacies",
      desc: "Aggregated local pharmacies; hours vary by outlet.",
    },
  ];
  const isDhaka = /dhaka/i.test(location);
  let arr;
  if (type.startsWith("Hospital")) arr = isDhaka ? dhakaHospitals : [];
  else arr = isDhaka ? dhakaPharmacies : [];
  if (arr.length === 0) {
    const label = sanitize(type.replace(/\(.+\)/, ""));
    return Array.from({ length: 8 }, (_, i) => ({
      name: `${label} ${i + 1}`,
      desc: "Short one‑sentence description.",
    }));
  }
  return arr;
}

// Finder render
function renderFinder(location) {
  const start = finderPage * finderPageSize;
  const end = Math.min(start + finderPageSize, finderItems.length);
  const slice = finderItems.slice(start, end);

  let html = slice
    .map((x, idx) => {
      const globalIndex = start + idx;
      const query = encodeURIComponent(x.name + " " + location);
      const searchUrl =
        "https://www.google.com/maps/search/?api=1&query=" + query;
      const directionsUrl =
        "https://www.google.com/maps/dir/?api=1&destination=" + query;
      const targetId = "map-" + globalIndex;

      return (
        '<div class="list-item">' +
        '• <strong><a class="result-link" href="' +
        searchUrl +
        '" target="_blank" rel="noopener noreferrer">' +
        sanitize(x.name) +
        "</a></strong> - " +
        sanitize(x.desc) +
        '<div class="actions" style="margin-top:8px;">' +
        '<button class="btn secondary small" type="button" data-map="' +
        query +
        '" data-target="' +
        targetId +
        '">Show map</button>' +
        '<a class="btn secondary small" href="' +
        directionsUrl +
        '" target="_blank" rel="noopener noreferrer">Directions</a>' +
        "</div>" +
        '<div class="map-holder" id="' +
        targetId +
        '" hidden></div>' +
        "</div>"
      );
    })
    .join("\n");

  const totalPages = Math.max(
    1,
    Math.ceil(finderItems.length / finderPageSize)
  );
  if (totalPages > 1) {
    html +=
      '<div class="actions" style="justify-content:space-between;margin-top:8px;">' +
      '<button class="btn secondary small" data-page="prev"' +
      (finderPage <= 0 ? " disabled" : "") +
      ">← Prev</button>" +
      '<span class="pill">Page ' +
      (finderPage + 1) +
      " / " +
      totalPages +
      "</span>" +
      '<button class="btn secondary small" data-page="next"' +
      (finderPage >= totalPages - 1 ? " disabled" : "") +
      ">Next →</button>" +
      "</div>";
  }
  document.getElementById("finderOut").innerHTML = html;
}

// Analysis form
const analysisForm = document.getElementById("analysisForm");
const analysisOut = document.getElementById("analysisOut");
const clearAnalysisBtn = document.getElementById("clearAnalysis");
analysisForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const symptoms = document.getElementById("symptoms").value.trim();
  const duration = document.getElementById("duration").value.trim();
  const age = document.getElementById("age").value;
  analysisOut.innerHTML = buildAnalysis(symptoms, duration, age);
  analysisOut.hidden = false;
});
clearAnalysisBtn.addEventListener("click", () => {
  analysisOut.textContent = "";
  analysisOut.hidden = true;
});

// Tips buttons
const tipsBtn = document.getElementById("tipsBtn");
const tipsOut = document.getElementById("tipsOut");
const tipsClear = document.getElementById("tipsClear");
tipsBtn.addEventListener("click", () => {
  const src =
    document.getElementById("symptoms").value.trim() || "general discomfort";
  tipsOut.textContent = buildTips(src);
  tipsOut.hidden = false;
});
tipsClear.addEventListener("click", () => {
  tipsOut.textContent = "";
  tipsOut.hidden = true;
});

// Finder form
const finderForm = document.getElementById("finderForm");
const finderOutElem = document.getElementById("finderOut");
const clearFinderBtn = document.getElementById("clearFinder");
finderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const type = document.getElementById("type").value;
  const location = document.getElementById("location").value.trim();
  finderItems = getFinderData(type, location || "");
  finderPage = 0;
  renderFinder(location || "");
  finderOutElem.hidden = false;
});
clearFinderBtn.addEventListener("click", () => {
  finderOutElem.textContent = "";
  finderOutElem.hidden = true;
  finderItems = [];
});

// Pagination + map toggle
finderOutElem.addEventListener("click", (e) => {
  const pageBtn = e.target.closest("button[data-page]");
  if (pageBtn) {
    const action = pageBtn.getAttribute("data-page");
    const location = document.getElementById("location").value.trim();
    const totalPages = Math.max(
      1,
      Math.ceil(finderItems.length / finderPageSize)
    );
    if (action === "prev" && finderPage > 0) {
      finderPage--;
      renderFinder(location || "");
    }
    if (action === "next" && finderPage < totalPages - 1) {
      finderPage++;
      renderFinder(location || "");
    }
    return;
  }
  const mapBtn = e.target.closest("button[data-map]");
  if (mapBtn) {
    const targetId = mapBtn.getAttribute("data-target");
    const mapEl = document.getElementById(targetId);
    if (!mapEl) return;
    if (mapEl.hidden) {
      const query = mapBtn.getAttribute("data-map");
      mapEl.innerHTML =
        '<iframe src="https://www.google.com/maps?q=' +
        query +
        '&output=embed" width="100%" height="280" style="border:0;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>';
      mapEl.hidden = false;
      mapBtn.textContent = "Hide map";
    } else {
      mapEl.hidden = true;
      mapEl.innerHTML = "";
      mapBtn.textContent = "Show map";
    }
  }
});
