// Ward Admission & Census - script.js
// Script is loaded at bottom of <body> so all elements are guaranteed to exist

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, kind) {
  var el = $("statusBadge");
  if (el) {
    el.textContent = text;
    el.className = kind === "ok" ? "ok" : kind === "warn" ? "warn" : "";
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

function computeAgeFromDob(dobStr) {
  if (!dobStr) return "";
  
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((dobStr || "").trim());
  if (!m) return "";
  
  var dob = new Date(+m[1], +m[2] - 1, +m[3]);
  if (isNaN(dob.getTime())) return "";
  
  var today = new Date();
  var age = today.getFullYear() - dob.getFullYear();
  var monthDiff = today.getMonth() - dob.getMonth();
  
  // Adjust age if birthday hasn't occurred this year
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age >= 0 ? String(age) : "";
}

function escapeCsv(v) {
  var s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function parseBP(s) {
  var m = /^(\d{2,3})\s*\/\s*(\d{2,3})$/.exec((s || "").trim());
  return m ? { sys: +m[1], dia: +m[2] } : null;
}

function toNum(v) {
  var n = Number((v || "").toString().trim());
  return isFinite(n) ? n : null;
}

function computeRiskFlags(r) {
  var flags = [];
  
  // Restore full risk flag computation
  var bp = parseBP(r.bpRaw);
  var tempN = toNum(r.tempRaw),
    spo2N = toNum(r.spo2Raw),
    painN = toNum(r.painRaw);
  
  if (spo2N !== null && spo2N < 92)
    flags.push({ text: "SpO2 <92%", cls: "red" });
  if (bp && (bp.sys >= 180 || bp.dia >= 120))
    flags.push({ text: "Hypertensive Crisis", cls: "red" });
  if (tempN !== null && tempN >= 38.5)
    flags.push({ text: "Fever >=38.5C", cls: "orange" });
  if (painN !== null && painN >= 7)
    flags.push({ text: "Pain >=7/10", cls: "orange" });
  
  var p = (r.precautions || "").toLowerCase();
  if (p.indexOf("airborne") >= 0)
    flags.push({ text: "Airborne", cls: "purple" });
  else if (p.indexOf("droplet") >= 0)
    flags.push({ text: "Droplet", cls: "purple" });
  else if (p.indexOf("contact") >= 0)
    flags.push({ text: "Contact", cls: "purple" });
  if (p.indexOf("fall") >= 0) 
    flags.push({ text: "Fall Risk", cls: "orange" });
  if (p.indexOf("suicide") >= 0)
    flags.push({ text: "Suicide Precautions", cls: "red" });
  
  if (!flags.length) 
    flags.push({ text: "No high-risk flags", cls: "green" });
  return flags;
}

function checklistSummary(ck) {
  ck = ck || {};
  var items = [
    ["ID band", ck.idband],
    ["Allergies verified", ck.allergy],
    ["VS taken", ck.vitals],
    ["IV access", ck.iv],
    ["Consent", ck.consent],
    ["Orders done", ck.orders],
  ];
  var done = items.filter(function (x) { return x[1]; }).length;
  var missing = items
    .filter(function (x) {
      return !x[1];
    })
    .map(function (x) {
      return x[0];
    });
  return {
    done: done,
    total: 6,
    missingText: missing.length
      ? "Pending: " + missing.join("; ")
      : "All completed",
  };
}

function generateSBAR(r) {
  return [
    "S: " +
      (r.patientName || "") +
      " admitted (" +
      (r.admitType || "Admission") +
      ") in " +
      (r.ward || "ward") +
      (r.room ? " Room " + r.room : "") +
      (r.bed ? " Bed " + r.bed : "") +
      ". CC: " +
      (r.chiefComplaint || "-") +
      ".",
    "B: Hx/Meds: " +
      (r.history || "-") +
      ". Allergies: " +
      (r.allergies || "-") +
      ".",
    "A: VS: " +
      (r.vitals || "-") +
      ". Dx: " +
      (r.workingDx || "-") +
      ". Precautions: " +
      (r.precautions || "-") +
      ".",
    "R: Orders/Plan: " +
      (r.orders || "-") +
      ". Monitor and endorse per unit protocol.",
  ].join("\n");
}

function readForm() {
  var dob = $("dob") ? $("dob").value.trim() : "";
  if (dob && $("age") && !$("age").value.trim()) {
    var a = computeAgeFromDob(dob);
    if (a) $("age").value = a;
  }
  
  var last = $("lastName") ? $("lastName").value.trim() : "";
  var first = $("firstName") ? $("firstName").value.trim() : "";
  var mid = $("middleName") ? $("middleName").value.trim() : "";
  var parts = [];
  if (last) parts.push(last);
  if (first) parts.push(first);
  if (mid) parts.push(mid);
  
  // Build vitals text
  var vitalsParts = [];
  function addVital(label, id) {
    var v = $(id) ? $(id).value.trim() : "";
    if (v) vitalsParts.push(label + " " + v);
  }
  addVital("BP", "bp");
  addVital("HR", "hr");
  addVital("RR", "rr");
  addVital("T", "temp");
  addVital("SpO2", "spo2");
  addVital("Pain", "pain");
  
  return {
    facility: $("facility") ? $("facility").value.trim() : "",
    ward: $("ward") ? $("ward").value.trim() : "",
    room: $("room") ? $("room").value.trim() : "",
    bed: $("bed") ? $("bed").value.trim() : "",
    mrn: $("mrn") ? $("mrn").value.trim() : "",
    admitDateTime: $("admitDateTime") ? $("admitDateTime").value.trim() : isoNow(),
    shift: $("shift") ? $("shift").value : "",
    patientStatus: $("patientStatus") ? $("patientStatus").value : "Admitted",
    admitType: $("admitType") ? $("admitType").value : "",
    service: $("service") ? $("service").value : "",
    attending: $("attending") ? $("attending").value.trim() : "",
    nurseOnDuty: $("nurseOnDuty") ? $("nurseOnDuty").value.trim() : "",
    diet: $("diet") ? $("diet").value.trim() : "",
    lastName: last,
    firstName: first,
    middleName: mid,
    patientName: parts.join(", ") || "Unknown Patient",
    sex: $("sex") ? $("sex").value : "",
    dob: dob,
    age: $("age") ? $("age").value.trim() : "",
    civilStatus: $("civilStatus") ? $("civilStatus").value : "",
    contactNo: $("contactNo") ? $("contactNo").value.trim() : "",
    address: $("address") ? $("address").value.trim() : "",
    emergencyContact: $("emergencyContact") ? $("emergencyContact").value.trim() : "",
    chiefComplaint: $("chiefComplaint") ? $("chiefComplaint").value.trim() : "",
    workingDx: $("workingDx") ? $("workingDx").value.trim() : "",
    allergies: $("allergies") ? $("allergies").value.trim() : "",
    precautions: $("precautions") ? $("precautions").value : "",
    codeStatus: $("codeStatus") ? $("codeStatus").value : "",
    bpRaw: $("bp") ? $("bp").value.trim() : "",
    hrRaw: $("hr") ? $("hr").value.trim() : "",
    rrRaw: $("rr") ? $("rr").value.trim() : "",
    tempRaw: $("temp") ? $("temp").value.trim() : "",
    spo2Raw: $("spo2") ? $("spo2").value.trim() : "",
    painRaw: $("pain") ? $("pain").value.trim() : "",
    vitals: vitalsParts.join(" | ") || "No vitals",
    history: $("history") ? $("history").value.trim() : "",
    orders: $("orders") ? $("orders").value.trim() : "",
    checklist: {
      idband: $("ck_idband") ? $("ck_idband").checked : false,
      allergy: $("ck_allergy") ? $("ck_allergy").checked : false,
      vitals: $("ck_vitals") ? $("ck_vitals").checked : false,
      iv: $("ck_iv") ? $("ck_iv").checked : false,
      consent: $("ck_consent") ? $("ck_consent").checked : false,
      orders: $("ck_orders") ? $("ck_orders").checked : false,
    },
    createdAt: isoNow(),
  };
}

function validateRequired(r) {
  var m = [];
  if (!r.lastName) m.push("Last Name");
  if (!r.firstName) m.push("First Name");
  if (!r.admitDateTime) m.push("Admission Date/Time");
  if (!r.shift) m.push("Shift");
  return m;
}

function clearFormOnly() {
  // Clear all form fields
  var fieldsToClear = [
    "facility", "ward", "room", "bed", "mrn", "shift", "admitType", 
    "service", "attending", "nurseOnDuty", "diet", "lastName", "firstName", 
    "middleName", "sex", "dob", "civilStatus", "contactNo", "address", 
    "emergencyContact", "chiefComplaint", "workingDx", "allergies", "precautions", 
    "codeStatus", "bp", "hr", "rr", "temp", "spo2", "pain", "history", "orders"
  ];
  
  fieldsToClear.forEach(function(id) {
    if ($(id)) $(id).value = "";
  });
  
  // Also clear age field
  if ($("age")) $("age").value = "";
  
  // Reset checkboxes
  var checkboxesToClear = [
    "ck_idband", "ck_allergy", "ck_vitals", "ck_iv", "ck_consent", "ck_orders"
  ];
  
  checkboxesToClear.forEach(function(id) {
    if ($(id)) $(id).checked = false;
  });
  
  // Reset patient status to default
  if ($("patientStatus")) $("patientStatus").value = "Admitted";
}

function clearAllFilters() {
  if ($("filterShift")) $("filterShift").value = "";
  if ($("filterStatus")) $("filterStatus").value = "";
  if ($("filterNurse")) $("filterNurse").value = "";
  if ($("filterSearch")) $("filterSearch").value = "";
}

// ── STATE ──
var wardRows = [];

function masked(v) {
  return v ? "••••••" : "";
}

function matchesFilters(r) {
  var fs = $("filterShift") ? $("filterShift").value : "";
  var fst = $("filterStatus") ? $("filterStatus").value : "";
  var fn = $("filterNurse") ? $("filterNurse").value.trim().toLowerCase() : "";
  var q = $("filterSearch") ? $("filterSearch").value.trim().toLowerCase() : "";
  
  if (fs && r.shift !== fs) return false;
  if (fst && r.patientStatus !== fst) return false;
  if (fn && (r.nurseOnDuty || "").toLowerCase().indexOf(fn) < 0) return false;
  if (q) {
    var hay = [
      r.patientName,
      r.mrn,
      r.room,
      r.bed,
      r.workingDx,
      r.chiefComplaint,
    ]
      .join(" ")
      .toLowerCase();
    if (hay.indexOf(q) < 0) return false;
  }
  return true;
}

function getStatusClass(s) {
  var map = {
    Admitted: "Admitted",
    "For Transfer": "ForTransfer",
    "For OR": "ForOR",
    Discharged: "Discharged",
    Deceased: "Deceased",
  };
  return "status-" + (map[s] || "Admitted");
}

function renderTable() {
  console.log("Rendering table with", wardRows.length, "rows");
  
  var tbody = $("tbody");
  if (!tbody) {
    console.error("Table body not found!");
    return;
  }

  var privacy = $("privacyMode") ? $("privacyMode").checked : false;

  // Clear table
  tbody.innerHTML = "";

  var visible = wardRows.filter(matchesFilters);
  
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
    emptyRow.innerHTML = '<td colspan="12" style="text-align: center; padding: 40px;">No patients added yet. Fill out the form and click "Add to Ward List".</td>';
    tbody.appendChild(emptyRow);
    return;
  }

  for (var i = 0; i < visible.length; i++) {
    (function (r) {
      var flags = computeRiskFlags(r);
      var ckSum = checklistSummary(r.checklist || {});
      var sbar = r.sbar || generateSBAR(r);
      var tr = document.createElement("tr");

      function mc(html) {
        var td = document.createElement("td");
        td.innerHTML = html;
        tr.appendChild(td);
      }

      var sk = r.shift || "";
      mc(
        '<span class="shift-chip shift-' + sk + '">' + (sk || "—") + "</span>"
      );
      mc(
        '<span class="status-pill ' +
          getStatusClass(r.patientStatus) +
          '">' +
          (r.patientStatus || "—") +
          "</span>"
      );
      mc(
        "<strong>" +
          (r.room || "—") +
          "</strong>" +
          (r.bed
            ? ' <span style="color:var(--text-3)">/ ' + r.bed + "</span>"
            : "")
      );
      mc(
        '<span style="font-family:monospace;font-size:12px">' +
          (privacy ? masked(r.mrn) : r.mrn || "—") +
          "</span>"
      );
      mc(
        '<strong style="' +
          (privacy ? "filter:blur(5px);user-select:none;" : "") +
          '">' +
          (r.patientName || "—") +
          "</strong>"
      );

      var flagTd = document.createElement("td");
      for (var f = 0; f < flags.length; f++) {
        var sp = document.createElement("span");
        sp.className = "badge badge-" + flags[f].cls;
        sp.textContent = flags[f].text;
        flagTd.appendChild(sp);
      }
      tr.appendChild(flagTd);

      mc('<span style="font-size:12.5px">' + (r.workingDx || "—") + "</span>");
      mc(
        '<span style="font-size:12px;color:var(--text-2)">' +
          (r.vitals || "—") +
          "</span>"
      );
      mc(r.precautions || "—");

      var ckTd = document.createElement("td");
      var ckBadge = document.createElement("span");
      ckBadge.className =
        "badge badge-" + (ckSum.done === ckSum.total ? "green" : "orange");
      ckBadge.textContent = ckSum.done + "/" + ckSum.total;
      ckTd.appendChild(ckBadge);
      if (ckSum.done < ckSum.total) {
        var note = document.createElement("div");
        note.style.cssText =
          "font-size:11px;color:var(--text-3);margin-top:4px;";
        note.textContent = ckSum.missingText;
        ckTd.appendChild(note);
      }
      tr.appendChild(ckTd);

      var sbarTd = document.createElement("td");
      var pre = document.createElement("pre");
      pre.className = "sbar-text";
      pre.textContent = sbar;
      sbarTd.appendChild(pre);
      tr.appendChild(sbarTd);

      var actTd = document.createElement("td");
      var actDiv = document.createElement("div");
      actDiv.className = "inline-actions";

      var bCopy = document.createElement("button");
      bCopy.className = "btn btn-sm btn-ghost";
      bCopy.textContent = "📋 Copy SBAR";
      bCopy.onclick = (function (s) {
        return function () {
          navigator.clipboard
            .writeText(s)
            .then(function () {
              setStatus("SBAR copied!", "ok");
            })
            .catch(function () {
              setStatus("Clipboard blocked.", "warn");
            });
        };
      })(sbar);

      var bDel = document.createElement("button");
      bDel.className = "btn btn-sm btn-danger";
      bDel.textContent = "🗑 Remove";
      bDel.onclick = (function (row) {
        return function () {
          var idx = wardRows.indexOf(row);
          if (idx >= 0) wardRows.splice(idx, 1);
          renderTable();
          setStatus("Patient removed.", "warn");
        };
      })(r);

      actDiv.appendChild(bCopy);
      actDiv.appendChild(bDel);
      actTd.appendChild(actDiv);
      tr.appendChild(actTd);
      tbody.appendChild(tr);
    })(visible[i]);
  }
}

function doAddRow() {
  console.log("Add row clicked");
  
  // Set admitDateTime if empty
  if ($("admitDateTime") && !$("admitDateTime").value.trim()) {
    $("admitDateTime").value = isoNow();
  }
  
  var row = readForm();
  console.log("Form data:", row);
  
  var missing = validateRequired(row);
  if (missing.length) {
    alert("Please fill in: " + missing.join(", "));
    return;
  }
  
  // Add computed fields
  row.riskFlagsText = computeRiskFlags(row)
    .map(function (f) {
      return f.text;
    })
    .join("; ");
  var ck = checklistSummary(row.checklist);
  row.checklistCompleted = ck.done + "/" + ck.total;
  row.checklistPending = ck.missingText;
  row.sbar = generateSBAR(row);
  
  // Add to array
  wardRows.push(row);
  console.log("Total rows:", wardRows.length);
  
  // Update table
  renderTable();
  
  // Clear form completely
  clearFormOnly();
  
  // Reset admitDateTime to current time
  if ($("admitDateTime")) $("admitDateTime").value = isoNow();
  
  setStatus("✓ Added: " + (row.patientName || "Patient"), "ok");
  
  // Scroll to table
  var tc = $("tbody") ? $("tbody").closest(".card") : null;
  if (tc) tc.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exportCsv() {
  if (!wardRows.length) {
    alert("No data to export");
    return;
  }
  
  // Full CSV export with all columns restored
  var cols = [
    "Facility", "Ward", "Room", "Bed", "MRN", "AdmissionDateTime", "Shift", 
    "PatientStatus", "AdmissionType", "Service", "AttendingPhysician", "NurseOnDuty", 
    "LastName", "FirstName", "MiddleName", "Sex", "DOB", "Age", "CivilStatus", 
    "ContactNo", "Address", "EmergencyContact", "ChiefComplaint", "AdmittingDiagnosis", 
    "Allergies", "Precautions", "CodeStatus", "DietOrder", "Vitals", "RiskFlags", 
    "ChecklistCompleted", "ChecklistPending", "History", "Orders", "SBAR", "CreatedAt"
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
        r.riskFlagsText || "",
        r.checklistCompleted || "",
        r.checklistPending || "",
        r.history || "",
        r.orders || "",
        r.sbar || "",
        r.createdAt || "",
      ]
        .map(escapeCsv)
        .join(",")
    );
  });
  
  var blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ward_admissions_" + isoNow().replace(/[: ]/g, "-") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  setStatus("CSV exported.", "ok");
}

// ── WIRE BUTTONS ──
document.addEventListener("DOMContentLoaded", function() {
  console.log("DOM loaded, wiring buttons...");
  
  // Set age field to read-only (automatic only)
  if ($("age")) {
    $("age").readOnly = true;
    $("age").title = "Automatically calculated from date of birth";
  }
  
  // Restrict contact number to numbers only
  if ($("contactNo")) {
    $("contactNo").oninput = function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    };
    $("contactNo").title = "Numbers only please";
  }
  
  // Set max date for DOB to today (prevents future dates)
  if ($("dob")) {
    $("dob").max = getTodayDateString();
  }
  
  // Auto-calculate age when DOB changes
  if ($("dob")) {
    $("dob").onchange = function() {
      var dob = $("dob").value;
      if (dob) {
        var age = computeAgeFromDob(dob);
        if ($("age")) {
          $("age").value = age;
          setStatus("Age calculated: " + age + " years", "ok");
        }
      } else {
        // Clear age if DOB is cleared
        if ($("age")) $("age").value = "";
      }
    };
  }
  
  if ($("btnAddRow")) {
    $("btnAddRow").onclick = doAddRow;
    console.log("Add row button wired");
  }
  
  if ($("btnAutofillNow")) {
    $("btnAutofillNow").onclick = function() {
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Date/time set to now.", "ok");
    };
  }
  
  if ($("btnClearForm")) {
    $("btnClearForm").onclick = function() {
      clearFormOnly();
      if ($("admitDateTime")) $("admitDateTime").value = isoNow();
      setStatus("Form cleared.", "info");
    };
  }
  
  if ($("btnExportCsv")) {
    $("btnExportCsv").onclick = exportCsv;
  }
  
  if ($("btnSaveJson")) {
    $("btnSaveJson").onclick = function() {
      if (wardRows.length === 0) {
        alert("No data to save");
        return;
      }
      
      var blob = new Blob(
        [JSON.stringify({ version: 2, exportedAt: isoNow(), wardRows: wardRows }, null, 2)],
        { type: "application/json" }
      );
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ward_admissions_" + isoNow().replace(/[: ]/g, "-") + ".json";
      a.click();
      setStatus("JSON saved.", "ok");
    };
  }
  
  if ($("btnLoadJson")) {
    $("btnLoadJson").onclick = function() {
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.style.cssText = "position:fixed;top:-999px;left:-999px;opacity:0;";
      document.body.appendChild(input);
      
      input.onchange = function () {
        var file = input.files && input.files[0];
        if (!file) {
          document.body.removeChild(input);
          return;
        }
        var reader = new FileReader();
        reader.onload = function (e) {
          document.body.removeChild(input);
          try {
            var data = JSON.parse(e.target.result);
            if (!data || !Array.isArray(data.wardRows))
              throw new Error("wardRows not found in file.");
            
            // Clear filters
            clearAllFilters();
            
            wardRows = data.wardRows.map(function (r) {
              if (!r.checklist) r.checklist = {};
              if (!r.riskFlagsText)
                r.riskFlagsText = computeRiskFlags(r)
                  .map(function (f) {
                    return f.text;
                  })
                  .join("; ");
              var ck = checklistSummary(r.checklist || {});
              if (!r.checklistCompleted)
                r.checklistCompleted = ck.done + "/" + ck.total;
              if (!r.checklistPending) r.checklistPending = ck.missingText;
              if (!r.sbar) r.sbar = generateSBAR(r);
              return r;
            });
            
            renderTable();
            setStatus("✓ Loaded " + wardRows.length + " patient(s).", "ok");
            
            var tc = $("tbody") ? $("tbody").closest(".card") : null;
            if (tc) tc.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (err) {
            setStatus("Load failed: " + err.message, "warn");
          }
        };
        reader.onerror = function () {
          document.body.removeChild(input);
          setStatus("Could not read file.", "warn");
        };
        reader.readAsText(file);
      };
      
      input.click();
    };
  }
  
  if ($("btnClearAll")) {
    $("btnClearAll").onclick = function() {
      if (confirm("Clear everything — form, filters, and ward list? Cannot be undone.")) {
        wardRows = [];
        clearFormOnly();
        clearAllFilters();
        if ($("admitDateTime")) $("admitDateTime").value = isoNow();
        if ($("patientStatus")) $("patientStatus").value = "Admitted";
        if ($("privacyMode")) $("privacyMode").checked = false;
        renderTable();
        setStatus("All cleared.", "warn");
      }
    };
  }
  
  if ($("privacyMode")) {
    $("privacyMode").onchange = renderTable;
  }
  
  ["filterShift", "filterStatus", "filterNurse", "filterSearch"].forEach(
    function (id) {
      var el = $(id);
      if (el) {
        el.oninput = renderTable;
        el.onchange = renderTable;
      }
    }
  );
  
  // Initialize
  if ($("admitDateTime")) $("admitDateTime").value = isoNow();
  if ($("patientStatus")) $("patientStatus").value = "Admitted";
  if ($("dob")) $("dob").max = getTodayDateString();
  renderTable();
});