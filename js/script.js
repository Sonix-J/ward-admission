// Ward Admission & Census - script.js
// COMPLETE WORKING VERSION

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, kind) {
  var el = $("statusBadge");
  if (el) {
    el.textContent = text;
  }
}

function isoNow() {
  var d = new Date();
  function pad(n) {
    return String(n).padStart(2, "0");
  }
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
  var year = d.getFullYear();
  var month = String(d.getMonth() + 1).padStart(2, "0");
  var day = String(d.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

// CSV escape function
function escapeCsv(v) {
  var s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// Auto age calculation from DOB
function computeAgeFromDob(dobStr) {
  if (!dobStr) return "";

  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dobStr || "").trim());
  if (!m) return "";

  var dob = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(dob.getTime())) return "";

  var today = new Date();
  var age = today.getFullYear() - dob.getFullYear();
  var monthDiff = today.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  return age >= 0 ? String(age) : "";
}

// Complete form clearing function
function clearAllFormFields() {
  var textFields = [
    "facility",
    "ward",
    "room",
    "bed",
    "mrn",
    "admitDateTime",
    "lastName",
    "firstName",
    "middleName",
    "age",
    "contactNo",
    "address",
    "emergencyContact",
    "chiefComplaint",
    "workingDx",
    "allergies",
    "bp",
    "hr",
    "rr",
    "temp",
    "spo2",
    "pain",
    "history",
    "orders",
    "attending",
    "nurseOnDuty",
    "diet",
  ];

  textFields.forEach(function (id) {
    if ($(id)) $(id).value = "";
  });

  if ($("shift")) $("shift").value = "";
  if ($("patientStatus")) $("patientStatus").selectedIndex = 0;
  if ($("admitType")) $("admitType").value = "";
  if ($("service")) $("service").value = "";
  if ($("sex")) $("sex").value = "";
  if ($("civilStatus")) $("civilStatus").value = "";
  if ($("precautions")) $("precautions").value = "";
  if ($("codeStatus")) $("codeStatus").value = "";

  var checkboxes = [
    "ck_idband",
    "ck_allergy",
    "ck_vitals",
    "ck_iv",
    "ck_consent",
    "ck_orders",
  ];

  checkboxes.forEach(function (id) {
    if ($(id)) $(id).checked = false;
  });
}

function clearAllFilters() {
  if ($("filterShift")) $("filterShift").value = "";
  if ($("filterStatus")) $("filterStatus").value = "";
  if ($("filterNurse")) $("filterNurse").value = "";
  if ($("filterSearch")) $("filterSearch").value = "";
}

// Function to get form data
function getFormData() {
  var data = {
    shift: $("shift") ? $("shift").value : "",
    patientStatus: $("patientStatus") ? $("patientStatus").value : "Admitted",
    room: $("room") ? $("room").value : "",
    bed: $("bed") ? $("bed").value : "",
    mrn: $("mrn") ? $("mrn").value : "",
    lastName: $("lastName") ? $("lastName").value : "",
    firstName: $("firstName") ? $("firstName").value : "",
    middleName: $("middleName") ? $("middleName").value : "",
    dob: $("dob") ? $("dob").value : "",
    age: $("age") ? $("age").value : "",
    workingDx: $("workingDx") ? $("workingDx").value : "",
    precautions: $("precautions") ? $("precautions").value : "",
    allergies: $("allergies") ? $("allergies").value : "",
    facility: $("facility") ? $("facility").value : "",
    ward: $("ward") ? $("ward").value : "",
    admitDateTime: $("admitDateTime") ? $("admitDateTime").value : "",
    admitType: $("admitType") ? $("admitType").value : "",
    service: $("service") ? $("service").value : "",
    attending: $("attending") ? $("attending").value : "",
    nurseOnDuty: $("nurseOnDuty") ? $("nurseOnDuty").value : "",
    diet: $("diet") ? $("diet").value : "",
    sex: $("sex") ? $("sex").value : "",
    civilStatus: $("civilStatus") ? $("civilStatus").value : "",
    contactNo: $("contactNo") ? $("contactNo").value : "",
    address: $("address") ? $("address").value : "",
    emergencyContact: $("emergencyContact") ? $("emergencyContact").value : "",
    chiefComplaint: $("chiefComplaint") ? $("chiefComplaint").value : "",
    codeStatus: $("codeStatus") ? $("codeStatus").value : "",
    bpRaw: $("bp") ? $("bp").value : "",
    hrRaw: $("hr") ? $("hr").value : "",
    rrRaw: $("rr") ? $("rr").value : "",
    tempRaw: $("temp") ? $("temp").value : "",
    spo2Raw: $("spo2") ? $("spo2").value : "",
    painRaw: $("pain") ? $("pain").value : "",
    history: $("history") ? $("history").value : "",
    orders: $("orders") ? $("orders").value : "",
    checklist: {
      idband: $("ck_idband") ? $("ck_idband").checked : false,
      allergy: $("ck_allergy") ? $("ck_allergy").checked : false,
      vitals: $("ck_vitals") ? $("ck_vitals").checked : false,
      iv: $("ck_iv") ? $("ck_iv").checked : false,
      consent: $("ck_consent") ? $("ck_consent").checked : false,
      orders: $("ck_orders") ? $("ck_orders").checked : false,
    },
  };

  // Build patient name
  var nameParts = [];
  if (data.lastName) nameParts.push(data.lastName);
  if (data.firstName) nameParts.push(data.firstName);
  if (data.middleName) nameParts.push(data.middleName);
  data.patientName = nameParts.length > 0 ? nameParts.join(", ") : "Unknown";

  // Build vitals text
  var vitalsParts = [];
  if (data.bpRaw) vitalsParts.push("BP " + data.bpRaw);
  if (data.hrRaw) vitalsParts.push("HR " + data.hrRaw);
  if (data.rrRaw) vitalsParts.push("RR " + data.rrRaw);
  if (data.tempRaw) vitalsParts.push("T " + data.tempRaw);
  if (data.spo2Raw) vitalsParts.push("SpO2 " + data.spo2Raw);
  if (data.painRaw) vitalsParts.push("Pain " + data.painRaw);
  data.vitals = vitalsParts.length > 0 ? vitalsParts.join(" | ") : "—";

  return data;
}

// Risk flags function
function getRiskFlags(r) {
  var flags = [];
  if (r.precautions && r.precautions.toLowerCase().includes("airborne"))
    flags.push("Airborne");
  if (r.precautions && r.precautions.toLowerCase().includes("droplet"))
    flags.push("Droplet");
  if (r.precautions && r.precautions.toLowerCase().includes("contact"))
    flags.push("Contact");
  if (r.precautions && r.precautions.toLowerCase().includes("fall"))
    flags.push("Fall Risk");
  if (r.precautions && r.precautions.toLowerCase().includes("suicide"))
    flags.push("Suicide");
  return flags.length > 0 ? flags.join(", ") : "None";
}

// Checklist summary
function getChecklistSummary(ck) {
  if (!ck) return "0/6";
  var count = 0;
  if (ck.idband) count++;
  if (ck.allergy) count++;
  if (ck.vitals) count++;
  if (ck.iv) count++;
  if (ck.consent) count++;
  if (ck.orders) count++;
  return count + "/6";
}

// SBAR function
function getSBAR(r) {
  return (
    (r.patientName || "Unknown") +
    " | " +
    (r.workingDx || "No Dx") +
    " | " +
    (r.vitals || "No VS")
  );
}

// Status class
function getStatusClass(s) {
  if (s === "Admitted") return "status-Admitted";
  if (s === "For Transfer") return "status-ForTransfer";
  if (s === "For OR") return "status-ForOR";
  if (s === "Discharged") return "status-Discharged";
  if (s === "Deceased") return "status-Deceased";
  return "status-Admitted";
}

// Store rows
var wardRows = [];

function masked(v) {
  return v ? "••••••" : "";
}

// Filter function
function matchesFilters(r) {
  var fs = $("filterShift") ? $("filterShift").value : "";
  var fst = $("filterStatus") ? $("filterStatus").value : "";
  var fn = $("filterNurse") ? $("filterNurse").value.trim().toLowerCase() : "";
  var q = $("filterSearch") ? $("filterSearch").value.trim().toLowerCase() : "";

  if (!fs && !fst && !fn && !q) {
    return true;
  }

  if (fs && r.shift !== fs) return false;
  if (fst && r.patientStatus !== fst) return false;
  if (fn && r.nurseOnDuty && r.nurseOnDuty.toLowerCase().indexOf(fn) < 0)
    return false;

  if (q) {
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

// Render table function
function renderTable() {
  console.log("Rendering table with", wardRows.length, "rows");

  var tbody = $("tbody");
  if (!tbody) return;

  var privacy = $("privacyMode") ? $("privacyMode").checked : false;

  tbody.innerHTML = "";

  var visible = wardRows.filter(matchesFilters);
  console.log("Visible rows:", visible.length);

  var rowCount = $("rowCount");
  if (rowCount) {
    rowCount.textContent =
      "(" +
      visible.length +
      " of " +
      wardRows.length +
      " patient" +
      (wardRows.length !== 1 ? "s" : "") +
      ")";
  }

  var btnExportCsv = $("btnExportCsv");
  if (btnExportCsv) btnExportCsv.disabled = wardRows.length === 0;

  if (visible.length === 0) {
    var emptyRow = document.createElement("tr");
    emptyRow.innerHTML =
      '<td colspan="12" style="text-align: center; padding: 40px;">No patients yet. Add one!</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  for (var i = 0; i < visible.length; i++) {
    var r = visible[i];
    var tr = document.createElement("tr");

    // Shift
    var td1 = document.createElement("td");
    td1.innerHTML =
      '<span class="shift-chip shift-' +
      (r.shift || "") +
      '">' +
      (r.shift || "—") +
      "</span>";
    td1.style.whiteSpace = "nowrap";
    tr.appendChild(td1);

    // Status
    var td2 = document.createElement("td");
    td2.innerHTML =
      '<span class="status-pill ' +
      getStatusClass(r.patientStatus) +
      '">' +
      (r.patientStatus || "—") +
      "</span>";
    td2.style.whiteSpace = "nowrap";
    tr.appendChild(td2);

    // Room/Bed
    var td3 = document.createElement("td");
    td3.textContent = (r.room || "—") + (r.bed ? "/" + r.bed : "");
    td3.style.whiteSpace = "nowrap";
    tr.appendChild(td3);

    // MRN
    var td4 = document.createElement("td");
    td4.textContent = privacy ? masked(r.mrn) : r.mrn || "—";
    td4.style.whiteSpace = "nowrap";
    tr.appendChild(td4);

    // Patient Name
    var td5 = document.createElement("td");
    td5.textContent = privacy ? "••••••" : r.patientName || "—";
    td5.style.whiteSpace = "nowrap";
    tr.appendChild(td5);

    // Risk Flags
    var td6 = document.createElement("td");
    td6.textContent = getRiskFlags(r);
    td6.style.whiteSpace = "nowrap";
    tr.appendChild(td6);

    // Diagnosis
    var td7 = document.createElement("td");
    td7.textContent = r.workingDx || "—";
    td7.style.whiteSpace = "nowrap";
    tr.appendChild(td7);

    // Vitals
    var td8 = document.createElement("td");
    td8.textContent = r.vitals || "—";
    td8.style.whiteSpace = "nowrap";
    td8.style.fontSize = "11px";
    tr.appendChild(td8);

    // Precautions
    var td9 = document.createElement("td");
    td9.textContent = r.precautions || "—";
    td9.style.whiteSpace = "nowrap";
    tr.appendChild(td9);

    // Checklist
    var td10 = document.createElement("td");
    td10.textContent = getChecklistSummary(r.checklist);
    td10.style.whiteSpace = "nowrap";
    tr.appendChild(td10);

    // SBAR
    var td11 = document.createElement("td");
    td11.textContent = getSBAR(r);
    td11.style.whiteSpace = "nowrap";
    td11.style.fontSize = "11px";
    td11.style.fontFamily = "monospace";
    tr.appendChild(td11);

    // Actions
    var td12 = document.createElement("td");
    td12.style.whiteSpace = "nowrap";

    var copyBtn = document.createElement("button");
    copyBtn.className = "btn btn-sm btn-ghost";
    copyBtn.textContent = "📋";
    copyBtn.title = "Copy SBAR";
    copyBtn.style.padding = "2px 6px";
    copyBtn.style.marginRight = "4px";
    copyBtn.onclick = (function (s) {
      return function () {
        navigator.clipboard.writeText(s).then(function () {
          setStatus("SBAR copied!", "ok");
        });
      };
    })(getSBAR(r));

    var delBtn = document.createElement("button");
    delBtn.className = "btn btn-sm btn-danger";
    delBtn.textContent = "🗑";
    delBtn.title = "Remove";
    delBtn.style.padding = "2px 6px";
    delBtn.onclick = (function (row) {
      return function () {
        var idx = wardRows.indexOf(row);
        if (idx >= 0) wardRows.splice(idx, 1);
        renderTable();
        setStatus("Patient removed", "warn");
      };
    })(r);

    td12.appendChild(copyBtn);
    td12.appendChild(delBtn);
    tr.appendChild(td12);

    tbody.appendChild(tr);
  }
}

// Global remove function
window.removeRow = function (index) {
  if (index >= 0 && index < wardRows.length) {
    wardRows.splice(index, 1);
    renderTable();
    setStatus("Patient removed", "warn");
  }
};

// Add row function
function doAddRow() {
  console.log("Add row clicked");

  // Set admitDateTime if empty
  if ($("admitDateTime") && !$("admitDateTime").value.trim()) {
    $("admitDateTime").value = isoNow();
  }

  var row = getFormData();
  console.log("Form data:", row);

  // Basic validation
  if (!row.lastName || !row.firstName) {
    alert("Please fill in Last Name and First Name");
    return;
  }

  wardRows.push(row);
  console.log("Total rows:", wardRows.length);

  renderTable();
  clearAllFormFields();

  if ($("admitDateTime")) $("admitDateTime").value = isoNow();
  setStatus("✓ Added: " + row.patientName, "ok");
}

// Export CSV function
function exportCsv() {
  if (!wardRows.length) {
    alert("No data to export");
    return;
  }

  var cols = [
    "Facility",
    "Ward",
    "Room",
    "Bed",
    "MRN",
    "AdmissionDateTime",
    "Shift",
    "PatientStatus",
    "AdmissionType",
    "Service",
    "Attending",
    "NurseOnDuty",
    "LastName",
    "FirstName",
    "MiddleName",
    "Sex",
    "DOB",
    "Age",
    "CivilStatus",
    "ContactNo",
    "Address",
    "EmergencyContact",
    "ChiefComplaint",
    "Diagnosis",
    "Allergies",
    "Precautions",
    "CodeStatus",
    "Diet",
    "Vitals",
    "RiskFlags",
    "Checklist",
    "History",
    "Orders",
    "SBAR",
  ];

  var lines = [cols.map(escapeCsv).join(",")];

  wardRows.forEach(function (r) {
    lines.push(
      [
        r.facility || "",
        r.ward || "",
        r.room || "",
        r.bed || "",
        r.mrn || "",
        r.admitDateTime || "",
        r.shift || "",
        r.patientStatus || "",
        r.admitType || "",
        r.service || "",
        r.attending || "",
        r.nurseOnDuty || "",
        r.lastName || "",
        r.firstName || "",
        r.middleName || "",
        r.sex || "",
        r.dob || "",
        r.age || "",
        r.civilStatus || "",
        r.contactNo || "",
        r.address || "",
        r.emergencyContact || "",
        r.chiefComplaint || "",
        r.workingDx || "",
        r.allergies || "",
        r.precautions || "",
        r.codeStatus || "",
        r.diet || "",
        r.vitals || "",
        getRiskFlags(r),
        getChecklistSummary(r.checklist),
        r.history || "",
        r.orders || "",
        getSBAR(r),
      ]
        .map(escapeCsv)
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
  setStatus("CSV exported", "ok");
}

// Save JSON function
function saveJson() {
  if (!wardRows.length) {
    alert("No data to save");
    return;
  }

  var data = {
    version: 1,
    exportedAt: isoNow(),
    wardRows: wardRows,
  };

  var blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ward_data_" + isoNow().replace(/[: ]/g, "-") + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setStatus("JSON saved", "ok");
}

// Load JSON function
function loadJson() {
  var input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json";
  input.click();

  input.onchange = function () {
    var file = input.files[0];
    var reader = new FileReader();

    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (data.wardRows && Array.isArray(data.wardRows)) {
          wardRows = data.wardRows;
          clearAllFilters();
          renderTable();
          setStatus("Loaded " + wardRows.length + " patients", "ok");
        } else {
          alert("Invalid file format");
        }
      } catch (err) {
        alert("Error loading file: " + err.message);
      }
    };

    reader.readAsText(file);
  };
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  console.log("App starting...");

  // Set age field to read-only
  if ($("age")) {
    $("age").readOnly = true;
    $("age").title = "Auto-calculated from date of birth";
  }

  // Set max date for DOB to today
  if ($("dob")) {
    $("dob").max = getTodayDateString();

    // Auto-calculate age when DOB changes
    $("dob").onchange = function () {
      var dob = $("dob").value;
      if (dob) {
        var age = computeAgeFromDob(dob);
        if ($("age")) {
          $("age").value = age;
          setStatus("Age calculated: " + age + " years", "ok");
        }
      } else {
        if ($("age")) $("age").value = "";
      }
    };
  }

  // Restrict contact number to numbers only
  if ($("contactNo")) {
    $("contactNo").oninput = function () {
      this.value = this.value.replace(/[^0-9]/g, "");
    };
  }

  // Wire up buttons
  if ($("btnAddRow")) {
    $("btnAddRow").onclick = doAddRow;
    console.log("Add row button wired");
  }

  if ($("btnExportCsv")) $("btnExportCsv").onclick = exportCsv;
  if ($("btnSaveJson")) $("btnSaveJson").onclick = saveJson;
  if ($("btnLoadJson")) $("btnLoadJson").onclick = loadJson;

  if ($("btnClearForm")) {
    $("btnClearForm").onclick = function () {
      clearAllFormFields();
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Form cleared", "info");
    };
  }

  if ($("btnClearAll")) {
    $("btnClearAll").onclick = function () {
      if (confirm("Clear everything?")) {
        wardRows = [];
        clearAllFormFields();
        clearAllFilters();
        if ($("admitDateTime")) $("admitDateTime").value = isoNow();
        if ($("privacyMode")) $("privacyMode").checked = false;
        renderTable();
        setStatus("All cleared", "warn");
      }
    };
  }

  if ($("btnAutofillNow")) {
    $("btnAutofillNow").onclick = function () {
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Date/time set to now", "ok");
    };
  }

  if ($("privacyMode")) $("privacyMode").onchange = renderTable;

  // Wire up filters
  ["filterShift", "filterStatus", "filterNurse", "filterSearch"].forEach(
    function (id) {
      var el = $(id);
      if (el) {
        el.oninput = renderTable;
        el.onchange = renderTable;
      }
    },
  );

  // Set initial date
  if ($("admitDateTime")) $("admitDateTime").value = isoNow();

  // Initial render
  renderTable();

  console.log("App ready");
});
