// Ward Admission & Census - script.js
// SUPER DEBUG - ADD THIS AT THE TOP OF YOUR FILE
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

// Read a filter element value safely - only from the filter bar, never from form
function fval(id) {
  var el = document.getElementById(id);
  if (!el) return "";
  // Safety: only read from elements that are ACTUALLY filter elements
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

  // Only filter if the filter actually has a value
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
  console.log("🎨 renderTable CALLED");
  console.log("wardRows length:", wardRows.length);

  var tbody = $("tbody");
  if (!tbody) {
    console.error("❌ tbody not found!");
    return;
  }

  console.log("Rendering", wardRows.length, "patients");
  tbody.innerHTML = "";

  // Enable/disable export button based on patients
  var btnExp = $("btnExportCsv");
  if (btnExp) {
    btnExp.disabled = wardRows.length === 0;
    console.log("Export button disabled?", btnExp.disabled);
  }

  // Update row count display
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
    console.log("No patients, showing empty message");
    tbody.innerHTML =
      '<tr><td colspan="17" style="text-align:center;padding:40px;color:#b07090;">No patients yet. Add one!</td></tr>';
    return;
  }

  // Get privacy mode state
  var privacy = $("privacyMode") ? $("privacyMode").checked : false;

  // Render each patient row
  for (var i = 0; i < wardRows.length; i++) {
    var r = wardRows[i];
    var tr = document.createElement("tr");

    // Column 1: SHIFT
    var td1 = document.createElement("td");
    td1.innerHTML =
      '<span class="shift-chip shift-' +
      (r.shift || "") +
      '">' +
      (r.shift || "—") +
      "</span>";
    tr.appendChild(td1);

    // Column 2: STATUS
    var td2 = document.createElement("td");
    td2.innerHTML =
      '<span class="status-pill ' +
      getStatusClass(r.patientStatus) +
      '">' +
      (r.patientStatus || "—") +
      "</span>";
    tr.appendChild(td2);

    // Column 3: ROOM/BED
    var td3 = document.createElement("td");
    td3.textContent = (r.room || "—") + (r.bed ? "/" + r.bed : "");
    tr.appendChild(td3);

    // Column 4: MRN
    var td4 = document.createElement("td");
    td4.textContent = privacy ? masked(r.mrn) : r.mrn || "—";
    tr.appendChild(td4);

    // Column 5: PATIENT
    var td5 = document.createElement("td");
    td5.textContent = privacy ? "••••••" : r.patientName || "—";
    tr.appendChild(td5);

    // Column 6: RISK FLAGS
    var td6 = document.createElement("td");
    td6.textContent = getRiskFlags(r);
    tr.appendChild(td6);

    // Column 7: DIAGNOSIS
    var td7 = document.createElement("td");
    td7.textContent = r.workingDx || "—";
    tr.appendChild(td7);

    // Column 8: BP
    var td8 = document.createElement("td");
    td8.textContent = r.bpRaw || "—";
    tr.appendChild(td8);

    // Column 9: HR
    var td9 = document.createElement("td");
    td9.textContent = r.hrRaw || "—";
    tr.appendChild(td9);

    // Column 10: RR
    var td10 = document.createElement("td");
    td10.textContent = r.rrRaw || "—";
    tr.appendChild(td10);

    // Column 11: TEMP
    var td11 = document.createElement("td");
    td11.textContent = r.tempRaw || "—";
    tr.appendChild(td11);

    // Column 12: SpO₂
    var td12 = document.createElement("td");
    td12.textContent = r.spo2Raw || "—";
    tr.appendChild(td12);

    // Column 13: PAIN
    var td13 = document.createElement("td");
    td13.textContent = r.painRaw || "—";
    tr.appendChild(td13);

    // Column 14: PRECAUTIONS
    var td14 = document.createElement("td");
    td14.textContent = r.precautions || "—";
    tr.appendChild(td14);

    // Column 15: CHECKLIST
    var td15 = document.createElement("td");
    td15.textContent = getChecklistSummary(r.checklist);
    tr.appendChild(td15);

    // Column 16: SBAR
    var td16 = document.createElement("td");
    td16.style.whiteSpace = "nowrap";
    td16.style.fontSize = "11px";
    td16.style.fontFamily = "monospace";
    td16.textContent = getSBAR(r);
    tr.appendChild(td16);

    // Column 17: ACTIONS (with delete button)
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
  console.log("Clearing form fields...");

  // Clear all input fields - expanded list
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
  ].forEach(function (id) {
    if ($(id)) {
      $(id).value = "";
      console.log("Cleared:", id);
    }
  });

  // Reset all select dropdowns
  [
    "shift",
    "patientStatus",
    "precautions",
    "admitType",
    "service",
    "sex",
    "civilStatus",
    "codeStatus",
  ].forEach(function (id) {
    if ($(id)) {
      $(id).value = "";
      console.log("Reset select:", id);
    }
  });

  // Reset patient status to default if needed
  if ($("patientStatus")) {
    $("patientStatus").value = "Admitted";
  }

  // Uncheck all checkboxes
  [
    "ck_idband",
    "ck_allergy",
    "ck_vitals",
    "ck_iv",
    "ck_consent",
    "ck_orders",
  ].forEach(function (id) {
    if ($(id)) {
      $(id).checked = false;
      console.log("Unchecked:", id);
    }
  });

  // Clear DOB
  if ($("dob")) {
    $("dob").value = "";
  }

  console.log("Form cleared");
}

function clearAllFilters() {
  ["filterShift", "filterStatus", "filterNurse", "filterSearch"].forEach(
    function (id) {
      if ($(id)) $(id).value = "";
    },
  );
}

function doAddRow() {
  console.log("🔵 doAddRow function STARTED");

  // Step 1: Read ONLY the form values we actually need
  var lastName = $("lastName") ? $("lastName").value : "";
  var firstName = $("firstName") ? $("firstName").value : "";
  var middleName = $("middleName") ? $("middleName").value : "";

  // Validate
  if (!lastName || !firstName) {
    alert("Please fill in Last Name and First Name");
    return;
  }

  // Build patient name
  var patientName = lastName + ", " + firstName;
  if (middleName) {
    patientName += " " + middleName;
  }

  // Get all form values
  var row = {
    // Basic info
    shift: $("shift") ? $("shift").value : "",
    patientStatus: $("patientStatus") ? $("patientStatus").value : "Admitted",
    room: $("room") ? $("room").value : "",
    bed: $("bed") ? $("bed").value : "",
    mrn: $("mrn") ? $("mrn").value : "",
    patientName: patientName,

    // Clinical
    workingDx: $("workingDx") ? $("workingDx").value : "",
    precautions: $("precautions") ? $("precautions").value : "",

    // Vitals
    bpRaw: $("bp") ? $("bp").value : "",
    hrRaw: $("hr") ? $("hr").value : "",
    rrRaw: $("rr") ? $("rr").value : "",
    tempRaw: $("temp") ? $("temp").value : "",
    spo2Raw: $("spo2") ? $("spo2").value : "",
    painRaw: $("pain") ? $("pain").value : "",

    // Nurse
    nurseOnDuty: $("nurseOnDuty") ? $("nurseOnDuty").value : "",

    // Checklist
    checklist: {
      idband: $("ck_idband") ? $("ck_idband").checked : false,
      allergy: $("ck_allergy") ? $("ck_allergy").checked : false,
      vitals: $("ck_vitals") ? $("ck_vitals").checked : false,
      iv: $("ck_iv") ? $("ck_iv").checked : false,
      consent: $("ck_consent") ? $("ck_consent").checked : false,
      orders: $("ck_orders") ? $("ck_orders").checked : false,
    },
  };

  // Build vitals string for SBAR
  var vitalsParts = [];
  if (row.bpRaw) vitalsParts.push("BP " + row.bpRaw);
  if (row.hrRaw) vitalsParts.push("HR " + row.hrRaw);
  if (row.rrRaw) vitalsParts.push("RR " + row.rrRaw);
  if (row.tempRaw) vitalsParts.push("T " + row.tempRaw);
  if (row.spo2Raw) vitalsParts.push("SpO2 " + row.spo2Raw);
  if (row.painRaw) vitalsParts.push("Pain " + row.painRaw);
  row.vitals = vitalsParts.length ? vitalsParts.join(" | ") : "No VS";

  console.log("✅ Patient data captured:", row);

  // Add to array
  wardRows.push(row);
  console.log("Total patients:", wardRows.length);

  // Render table
  renderTable();

  // Clear form
  clearAllFormFields();
  if ($("admitDateTime")) $("admitDateTime").value = isoNow();

  setStatus("✓ Added: " + patientName);
}

function exportCsv() {
  if (!wardRows.length) {
    alert("No data to export");
    return;
  }

  console.log("Exporting CSV with", wardRows.length, "patients");

  // Columns that match your table WITHOUT the Actions column
  var cols = [
    "Shift",
    "Status",
    "Room/Bed",
    "MRN",
    "Patient Name",
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

  var csvContent = lines.join("\r\n");
  console.log("CSV Content first 100 chars:", csvContent.substring(0, 100));

  var blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ward_admissions_" + isoNow().replace(/[: ]/g, "-") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setStatus("CSV exported");
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

          // Manually enable the export button
          var btnExp = $("btnExportCsv");
          if (btnExp) {
            btnExp.disabled = false;
            console.log("Export button enabled, patients:", wardRows.length);
          }

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

  if ($("btnAddRow")) $("btnAddRow").addEventListener("click", doAddRow);
  if ($("btnExportCsv")) $("btnExportCsv").addEventListener("click", exportCsv);
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

  // ONLY filter bar elements trigger renderTable
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
