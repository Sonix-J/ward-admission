// Ward Admission & Census - script.js
console.log("🔥 SCRIPT LOADED - Ward Admission System");
window.debugWard = function () {
  console.log("wardRows:", wardRows);
  console.log("tbody element:", $("tbody"));
  console.log("btnAddRow element:", $("btnAddRow"));
};

function $(id) {
  return document.getElementById(id);
}
function setStatus(text) {
  var el = $("statusBadge");
  if (el) el.textContent = text;
}

// ===== PEDIATRIC MODE HELPER =====
// Returns true if the "Pediatric Patient" checkbox is checked.
// When true, all adult vital sign alert checks are skipped.
function isPediatricMode() {
  var cb = $("isPediatric");
  return cb ? cb.checked : false;
}

function isoNow() {
  var d = new Date(),
    pad = function (n) {
      return String(n).padStart(2, "0");
    };
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

function getTodayDateString() {
  var d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function escapeCsv(v) {
  var s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function computeAgeFromDob(dobStr) {
  if (!dobStr) return "";
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dobStr || "").trim());
  if (!m) return "";
  var dob = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(dob.getTime())) return "";
  var today = new Date();
  var age = today.getFullYear() - dob.getFullYear();
  var md = today.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

var wardRows = [];

function getRiskFlags(r) {
  var flags = [],
    p = (r.precautions || "").toLowerCase();
  if (p.indexOf("airborne") >= 0) flags.push("Airborne");
  if (p.indexOf("droplet") >= 0) flags.push("Droplet");
  if (p.indexOf("contact") >= 0) flags.push("Contact");
  if (p.indexOf("fall") >= 0) flags.push("Fall Risk");
  if (p.indexOf("suicide") >= 0) flags.push("Suicide");
  return flags.length ? flags.join(", ") : "None";
}

function getChecklistSummary(ck) {
  if (!ck) return "0/6";
  var n = 0;
  if (ck.idband) n++;
  if (ck.allergy) n++;
  if (ck.vitals) n++;
  if (ck.iv) n++;
  if (ck.consent) n++;
  if (ck.orders) n++;
  return n + "/6";
}

function getSBAR(r) {
  return (
    (r.patientName || "Unknown") +
    " | " +
    (r.workingDx || "No Dx") +
    " | " +
    (r.vitals || "No VS")
  );
}

function getStatusClass(s) {
  if (s === "Admitted") return "status-Admitted";
  if (s === "For Transfer") return "status-ForTransfer";
  if (s === "For OR") return "status-ForOR";
  if (s === "Discharged") return "status-Discharged";
  if (s === "Deceased") return "status-Deceased";
  return "status-Admitted";
}

function masked(v) {
  return v ? "••••••" : "";
}

function fval(id) {
  var el = document.getElementById(id);
  if (!el) return "";
  var allowed = ["filterShift", "filterStatus", "filterNurse", "filterSearch"];
  for (var i = 0; i < allowed.length; i++) {
    if (allowed[i] === id) return el.value || "";
  }
  return "";
}

function matchesFilters(r) {
  var fs = fval("filterShift");
  var fst = fval("filterStatus");
  var fn = fval("filterNurse").trim().toLowerCase();
  var q = fval("filterSearch").trim().toLowerCase();
  if (fs && fs !== "" && (r.shift || "") !== fs) return false;
  if (fst && fst !== "" && (r.patientStatus || "") !== fst) return false;
  if (fn && fn !== "" && (r.nurseOnDuty || "").toLowerCase().indexOf(fn) < 0)
    return false;
  if (q && q !== "") {
    var hay = [
      r.patientName || "",
      r.mrn || "",
      r.room || "",
      r.bed || "",
      r.workingDx || "",
      r.chiefComplaint || "",
    ]
      .join(" ")
      .toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}

function renderTable() {
  console.log("🎨 renderTable CALLED, rows:", wardRows.length);
  var tbody = $("tbody");
  if (!tbody) {
    console.error("❌ tbody not found!");
    return;
  }
  tbody.innerHTML = "";

  var btnExp = $("btnExportCsv");
  if (btnExp) btnExp.disabled = wardRows.length === 0;

  var rowCount = $("rowCount");
  if (rowCount) {
    rowCount.textContent =
      "(" +
      wardRows.length +
      " patient" +
      (wardRows.length !== 1 ? "s" : "") +
      ")";
  }

  if (wardRows.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="18" style="text-align:center;padding:40px;color:#b07090;">No patients yet. Add one!</td></tr>';
    return;
  }

  var privacy = $("privacyMode") ? $("privacyMode").checked : false;

  for (var i = 0; i < wardRows.length; i++) {
    var r = wardRows[i];
    var tr = document.createElement("tr");

    // SHIFT
    var td1 = document.createElement("td");
    td1.innerHTML =
      '<span class="shift-chip shift-' +
      (r.shift || "") +
      '">' +
      (r.shift || "—") +
      "</span>";
    tr.appendChild(td1);

    // STATUS
    var td2 = document.createElement("td");
    td2.innerHTML =
      '<span class="status-pill ' +
      getStatusClass(r.patientStatus) +
      '">' +
      (r.patientStatus || "—") +
      "</span>";
    tr.appendChild(td2);

    // ROOM/BED
    var td3 = document.createElement("td");
    td3.textContent = (r.room || "—") + (r.bed ? "/" + r.bed : "");
    tr.appendChild(td3);

    // MRN
    var td4 = document.createElement("td");
    td4.textContent = privacy ? masked(r.mrn) : r.mrn || "—";
    tr.appendChild(td4);

    // PATIENT
    var td5 = document.createElement("td");
    td5.textContent = privacy ? "••••••" : r.patientName || "—";
    tr.appendChild(td5);

    // TYPE (Pedia / Adult)
    var td5b = document.createElement("td");
    if (r.isPediatric) {
      td5b.innerHTML = '<span class="type-pill type-pedia">Pedia</span>';
    } else {
      td5b.innerHTML = '<span class="type-pill type-adult">Adult</span>';
    }
    tr.appendChild(td5b);

    // RISK FLAGS
    var td6 = document.createElement("td");
    td6.textContent = getRiskFlags(r);
    tr.appendChild(td6);

    // DIAGNOSIS
    var td7 = document.createElement("td");
    td7.textContent = r.workingDx || "—";
    tr.appendChild(td7);

    // BP
    var td8 = document.createElement("td");
    td8.textContent = r.bpRaw || "—";
    tr.appendChild(td8);

    // HR
    var td9 = document.createElement("td");
    td9.textContent = r.hrRaw || "—";
    tr.appendChild(td9);

    // RR
    var td10 = document.createElement("td");
    td10.textContent = r.rrRaw || "—";
    tr.appendChild(td10);

    // TEMP
    var td11 = document.createElement("td");
    td11.textContent = r.tempRaw || "—";
    tr.appendChild(td11);

    // SpO2
    var td12 = document.createElement("td");
    td12.textContent = r.spo2Raw || "—";
    tr.appendChild(td12);

    // PAIN
    var td13 = document.createElement("td");
    td13.textContent = r.painRaw || "—";
    tr.appendChild(td13);

    // PRECAUTIONS
    var td14 = document.createElement("td");
    td14.textContent = r.precautions || "—";
    tr.appendChild(td14);

    // CHECKLIST
    var td15 = document.createElement("td");
    td15.textContent = getChecklistSummary(r.checklist);
    tr.appendChild(td15);

    // SBAR
    var td16 = document.createElement("td");
    td16.style.whiteSpace = "nowrap";
    td16.style.fontSize = "11px";
    td16.style.fontFamily = "monospace";
    td16.textContent = getSBAR(r);
    tr.appendChild(td16);

    // ACTIONS
    var td17 = document.createElement("td");
    td17.style.whiteSpace = "nowrap";
    var deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-danger";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Remove Patient";
    deleteBtn.style.padding = "2px 6px";
    deleteBtn.onclick = (function (rowIndex) {
      return function () {
        if (confirm("Remove this patient?")) {
          wardRows.splice(rowIndex, 1);
          renderTable();
          setStatus("Patient removed");
        }
      };
    })(i);
    td17.appendChild(deleteBtn);
    tr.appendChild(td17);

    tbody.appendChild(tr);
  }

  console.log("✅ Table rendered with", wardRows.length, "rows");
}

function clearAllFormFields() {
  [
    "lastName",
    "firstName",
    "middleName",
    "room",
    "bed",
    "mrn",
    "workingDx",
    "bp",
    "hr",
    "rr",
    "temp",
    "spo2",
    "pain",
    "nurseOnDuty",
    "facility",
    "ward",
    "admitDateTime",
    "age",
    "contactNo",
    "address",
    "emergencyContact",
    "chiefComplaint",
    "allergies",
    "history",
    "orders",
    "attending",
    "diet",
    "nursingInterventions",
  ].forEach(function (id) {
    if ($(id)) $(id).value = "";
  });

  [
    "shift",
    "patientStatus",
    "precautions",
    "admitType",
    "service",
    "sex",
    "civilStatus",
    "codeStatus",
    "bloodType",
  ].forEach(function (id) {
    if ($(id)) $(id).value = "";
  });

  if ($("patientStatus")) $("patientStatus").value = "Admitted";

  [
    "ck_idband",
    "ck_allergy",
    "ck_vitals",
    "ck_iv",
    "ck_consent",
    "ck_orders",
  ].forEach(function (id) {
    if ($(id)) $(id).checked = false;
  });

  if ($("dob")) $("dob").value = "";

  // Reset pediatric checkbox and clear all vital alerts
  if ($("isPediatric")) $("isPediatric").checked = false;
  updatePediatricUI();

  // Clear vital alert states visually
  ["bp", "hr", "rr", "temp", "spo2", "pain"].forEach(function (id) {
    var el = $(id);
    if (el) removeAlert(el);
  });
}

function clearAllFilters() {
  ["filterShift", "filterStatus", "filterNurse", "filterSearch"].forEach(
    function (id) {
      if ($(id)) $(id).value = "";
    },
  );
}

// ===== PEDIATRIC UI UPDATE =====
// Shows/hides the notice banner and updates the toggle label styling.
function updatePediatricUI() {
  var isPedia = isPediatricMode();
  var notice = $("pediaVitalsNotice");
  var label = $("pediaToggleLabel");

  if (notice) notice.style.display = isPedia ? "flex" : "none";
  if (label) {
    if (isPedia) {
      label.classList.add("pedia-active");
    } else {
      label.classList.remove("pedia-active");
    }
  }

  // Re-run all current vital checks so alerts appear/disappear immediately
  ["bp", "hr", "rr", "temp", "spo2", "pain"].forEach(function (id) {
    var el = $(id);
    if (el && el.value) {
      // Trigger the appropriate check function
      if (id === "bp") checkBP(el);
      else if (id === "hr") checkHR(el);
      else if (id === "rr") checkRR(el);
      else if (id === "temp") checkTemp(el);
      else if (id === "spo2") checkSpO2(el);
      else if (id === "pain") checkPain(el);
    } else if (el) {
      removeAlert(el);
    }
  });
}

function doAddRow() {
  console.log("🔵 doAddRow function STARTED");

  var lastName = $("lastName") ? $("lastName").value : "";
  var firstName = $("firstName") ? $("firstName").value : "";
  var middleName = $("middleName") ? $("middleName").value : "";

  if (!lastName || !firstName) {
    alert("Please fill in Last Name and First Name");
    return;
  }

  var patientName = lastName + ", " + firstName;
  if (middleName) patientName += " " + middleName;

  var row = {
    shift: $("shift") ? $("shift").value : "",
    patientStatus: $("patientStatus") ? $("patientStatus").value : "Admitted",
    room: $("room") ? $("room").value : "",
    bed: $("bed") ? $("bed").value : "",
    mrn: $("mrn") ? $("mrn").value : "",
    patientName: patientName,
    isPediatric: isPediatricMode(), // ← save pediatric flag with the row
    workingDx: $("workingDx") ? $("workingDx").value : "",
    precautions: $("precautions") ? $("precautions").value : "",
    bpRaw: $("bp") ? $("bp").value : "",
    hrRaw: $("hr") ? $("hr").value : "",
    rrRaw: $("rr") ? $("rr").value : "",
    tempRaw: $("temp") ? $("temp").value : "",
    spo2Raw: $("spo2") ? $("spo2").value : "",
    painRaw: $("pain") ? $("pain").value : "",
    nurseOnDuty: $("nurseOnDuty") ? $("nurseOnDuty").value : "",
    checklist: {
      idband: $("ck_idband") ? $("ck_idband").checked : false,
      allergy: $("ck_allergy") ? $("ck_allergy").checked : false,
      vitals: $("ck_vitals") ? $("ck_vitals").checked : false,
      iv: $("ck_iv") ? $("ck_iv").checked : false,
      consent: $("ck_consent") ? $("ck_consent").checked : false,
      orders: $("ck_orders") ? $("ck_orders").checked : false,
    },
  };

  var vitalsParts = [];
  if (row.bpRaw) vitalsParts.push("BP " + row.bpRaw);
  if (row.hrRaw) vitalsParts.push("HR " + row.hrRaw);
  if (row.rrRaw) vitalsParts.push("RR " + row.rrRaw);
  if (row.tempRaw) vitalsParts.push("T " + row.tempRaw);
  if (row.spo2Raw) vitalsParts.push("SpO2 " + row.spo2Raw);
  if (row.painRaw) vitalsParts.push("Pain " + row.painRaw);
  row.vitals = vitalsParts.length ? vitalsParts.join(" | ") : "No VS";

  console.log("✅ Patient data captured:", row);
  wardRows.push(row);
  console.log("Total patients:", wardRows.length);

  renderTable();
  clearAllFormFields();
  if ($("admitDateTime")) $("admitDateTime").value = isoNow();
  setStatus("✓ Added: " + patientName);
}

function exportCsv() {
  if (!wardRows.length) {
    alert("No data to export");
    return;
  }
  var cols = [
    "Shift",
    "Status",
    "Room/Bed",
    "MRN",
    "Patient Name",
    "Type",
    "Risk Flags",
    "Diagnosis",
    "BP (mmHg)",
    "HR (bpm)",
    "RR (/min)",
    "Temp (°C)",
    "SpO₂ (%)",
    "Pain",
    "Precautions",
    "Checklist",
    "SBAR",
  ];
  var lines = [cols.map(escapeCsv).join(",")];
  wardRows.forEach(function (r) {
    lines.push(
      [
        r.shift || "",
        r.patientStatus || "",
        (r.room || "") + (r.bed ? "/" + r.bed : ""),
        r.mrn || "",
        r.patientName || "",
        r.isPediatric ? "Pediatric" : "Adult",
        getRiskFlags(r),
        r.workingDx || "",
        r.bpRaw || "",
        r.hrRaw || "",
        r.rrRaw || "",
        r.tempRaw || "",
        r.spo2Raw || "",
        r.painRaw || "",
        r.precautions || "",
        getChecklistSummary(r.checklist),
        getSBAR(r),
      ]
        .map(function (v) {
          return escapeCsv(v || "");
        })
        .join(","),
    );
  });
  var blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ward_admissions_" + isoNow().replace(/[: ]/g, "-") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setStatus("CSV exported");
}

function exportToExcel() {
  if (!wardRows.length) {
    alert("No data to export");
    return;
  }
  var cols = [
    "Shift",
    "Status",
    "Room/Bed",
    "MRN",
    "Patient Name",
    "Type",
    "Risk Flags",
    "Diagnosis",
    "BP (mmHg)",
    "HR (bpm)",
    "RR (/min)",
    "Temp (°C)",
    "SpO₂ (%)",
    "Pain",
    "Precautions",
    "Checklist",
    "SBAR",
  ];
  var data = [cols];
  wardRows.forEach(function (r) {
    data.push([
      r.shift || "",
      r.patientStatus || "",
      (r.room || "") + (r.bed ? "/" + r.bed : ""),
      r.mrn || "",
      r.patientName || "",
      r.isPediatric ? "Pediatric" : "Adult",
      getRiskFlags(r),
      r.workingDx || "",
      r.bpRaw || "",
      r.hrRaw || "",
      r.rrRaw || "",
      r.tempRaw || "",
      r.spo2Raw || "",
      r.painRaw || "",
      r.precautions || "",
      getChecklistSummary(r.checklist),
      getSBAR(r),
    ]);
  });
  var wb = XLSX.utils.book_new();
  var ws = XLSX.utils.aoa_to_sheet(data);
  var colWidths = [];
  for (var i = 0; i < cols.length; i++) {
    var maxLength = cols[i].length;
    for (var j = 1; j < data.length; j++) {
      var cellValue = data[j][i] ? data[j][i].toString() : "";
      if (cellValue.length > maxLength) maxLength = cellValue.length;
    }
    colWidths.push({ wch: Math.min(50, Math.max(8, maxLength + 2)) });
  }
  ws["!cols"] = colWidths;
  var headerStyle = {
    fill: { patternType: "solid", fgColor: { rgb: "FFDA4F8E" } },
    font: { color: { rgb: "FFFFFFFF" }, bold: true, sz: 12, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      bottom: { style: "thin", color: { rgb: "FFB8366E" } },
      top: { style: "thin", color: { rgb: "FFB8366E" } },
      left: { style: "thin", color: { rgb: "FFB8366E" } },
      right: { style: "thin", color: { rgb: "FFB8366E" } },
    },
  };
  for (var C = 0; C < cols.length; C++) {
    var cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[cellAddress]) ws[cellAddress] = { t: "s", v: cols[C] };
    ws[cellAddress].s = headerStyle;
  }
  XLSX.utils.book_append_sheet(wb, ws, "Ward Admissions");
  XLSX.writeFile(
    wb,
    "ward_admissions_" + isoNow().replace(/[: ]/g, "-") + ".xlsx",
  );
  setStatus("Excel file exported!");
}

function saveJson() {
  if (!wardRows.length) {
    alert("No data to save");
    return;
  }
  var blob = new Blob(
    [
      JSON.stringify(
        { version: 1, exportedAt: isoNow(), wardRows: wardRows },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ward_data_" + isoNow().replace(/[: ]/g, "-") + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setStatus("JSON saved");
}

function loadJson() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.click();
  input.onchange = function () {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data.wardRows && Array.isArray(data.wardRows)) {
          wardRows = data.wardRows;
          clearAllFilters();
          renderTable();
          var btnExp = $("btnExportCsv");
          if (btnExp) btnExp.disabled = false;
          setStatus("Loaded " + wardRows.length + " patients");
        } else {
          alert("Invalid file format");
        }
      } catch (err) {
        alert("Error loading file: " + err.message);
      }
    };
    reader.readAsText(input.files[0]);
  };
}

// ===== VITAL SIGNS ALERT FUNCTIONS =====
// Each function checks isPediatricMode() first.
// If pediatric mode is ON → clear any existing alert and return immediately.

function checkSpO2(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = parseFloat(el.value);
  if (isNaN(v)) {
    removeAlert(el);
    return;
  }
  if (v < 80) setAlert(el, "v-critical", "CRITICAL");
  else if (v < 95) setAlert(el, "v-warning", "LOW");
  else removeAlert(el);
}

function checkBP(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = el.value.trim();
  var m = /^(\d+)\/(\d+)$/.exec(v);
  if (!m) {
    removeAlert(el);
    return;
  }
  var sys = parseInt(m[1]),
    dia = parseInt(m[2]);
  if (sys >= 180 || dia >= 110 || sys < 80)
    setAlert(el, "v-critical", "CRITICAL");
  else if (sys >= 140 || dia >= 90) setAlert(el, "v-warning", "HIGH");
  else removeAlert(el);
}

function checkHR(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = parseFloat(el.value);
  if (isNaN(v)) {
    removeAlert(el);
    return;
  }
  if (v > 130 || v < 40) setAlert(el, "v-critical", "CRITICAL");
  else if (v > 100 || v < 60) setAlert(el, "v-warning", "ABNORMAL");
  else removeAlert(el);
}

function checkRR(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = parseFloat(el.value);
  if (isNaN(v)) {
    removeAlert(el);
    return;
  }
  if (v < 8) setAlert(el, "v-critical", "CRITICAL");
  else if (v < 12) setAlert(el, "v-warning", "HYPOXIA");
  else if (v > 28) setAlert(el, "v-critical", "CRITICAL");
  else if (v > 20) setAlert(el, "v-orange", "HIGH");
  else removeAlert(el);
}

function checkTemp(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = parseFloat(el.value);
  if (isNaN(v)) {
    removeAlert(el);
    return;
  }
  if (v >= 39.0) setAlert(el, "v-critical", "HIGH FEVER");
  else if (v >= 38.0) setAlert(el, "v-orange", "FEVER");
  else if (v < 36.0) setAlert(el, "v-warning", "HYPOTHERMIA");
  else removeAlert(el);
}

function checkPain(el) {
  if (isPediatricMode()) {
    removeAlert(el);
    return;
  }
  var v = parseFloat(el.value);
  if (isNaN(v)) {
    removeAlert(el);
    return;
  }
  if (v >= 8) setAlert(el, "v-critical", "SEVERE");
  else if (v >= 6) setAlert(el, "v-orange", "MODERATE");
  else removeAlert(el);
}

function setAlert(el, className, text) {
  el.classList.remove("v-critical", "v-warning", "v-orange");
  el.classList.add(className);

  // Map input class → tag colour class
  var tagClass = "critical";
  if (className === "v-warning") tagClass = "warning";
  else if (className === "v-orange") tagClass = "orange";

  var wrap = el.parentNode;
  var existingTag = wrap.querySelector(".alert-tag");
  if (existingTag) {
    existingTag.textContent = text;
    existingTag.className = "alert-tag " + tagClass;
  } else {
    var tag = document.createElement("span");
    tag.className = "alert-tag " + tagClass;
    tag.textContent = text;
    // Insert BEFORE the input so it appears above it
    wrap.insertBefore(tag, el);
  }
}

function removeAlert(el) {
  el.classList.remove("v-critical", "v-warning", "v-orange");
  var wrap = el.parentNode;
  var tag = wrap.querySelector(".alert-tag");
  if (tag) tag.remove();
}

document.addEventListener("DOMContentLoaded", function () {
  if ($("age")) $("age").readOnly = true;

  if ($("dob")) {
    $("dob").max = getTodayDateString();
    $("dob").addEventListener("change", function () {
      if ($("age")) $("age").value = computeAgeFromDob(this.value);
    });
  }

  if ($("contactNo")) {
    $("contactNo").addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, "");
    });
  }

  // ===== PEDIATRIC CHECKBOX LISTENER =====
  if ($("isPediatric")) {
    $("isPediatric").addEventListener("change", function () {
      updatePediatricUI();
    });
  }

  if ($("btnAddRow")) $("btnAddRow").addEventListener("click", doAddRow);
  if ($("btnExportCsv")) {
    $("btnExportCsv").addEventListener("click", function () {
      exportToExcel();
    });
  }
  if ($("btnSaveJson")) $("btnSaveJson").addEventListener("click", saveJson);
  if ($("btnLoadJson")) $("btnLoadJson").addEventListener("click", loadJson);

  if ($("btnClearForm")) {
    $("btnClearForm").addEventListener("click", function () {
      clearAllFormFields();
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Form cleared");
    });
  }

  if ($("btnClearAll")) {
    $("btnClearAll").addEventListener("click", function () {
      if (!confirm("Clear everything?")) return;
      wardRows = [];
      clearAllFormFields();
      clearAllFilters();
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      if ($("privacyMode")) $("privacyMode").checked = false;
      renderTable();
      setStatus("All cleared");
    });
  }

  if ($("btnAutofillNow")) {
    $("btnAutofillNow").addEventListener("click", function () {
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Date/time set to now");
    });
  }

  if ($("privacyMode"))
    $("privacyMode").addEventListener("change", renderTable);

  ["filterShift", "filterStatus", "filterNurse", "filterSearch"].forEach(
    function (id) {
      var el = $(id);
      if (el) {
        el.addEventListener("input", renderTable);
        el.addEventListener("change", renderTable);
      }
    },
  );

  if ($("admitDateTime")) $("admitDateTime").value = isoNow();
  renderTable();
});
