const STORAGE = "acton_aml_workbench_v1";

const roles = {
  operator: {
    label: "ოპერატორი / გამყიდველი",
    views: ["onboarding", "monitoring"]
  },
  officer: {
    label: "AML ოფიცერი",
    views: ["dashboard", "onboarding", "alerts", "whitelist", "monitoring", "str", "audit", "reports"]
  },
  admin: {
    label: "ადმინისტრატორი",
    views: ["dashboard", "config", "audit", "reports"]
  },
  manager: {
    label: "მენეჯერი",
    views: ["dashboard", "reports", "audit"]
  },
  auditor: {
    label: "აუდიტორი",
    views: ["dashboard", "alerts", "whitelist", "monitoring", "str", "audit", "reports"]
  }
};

const navItems = [
  { id: "dashboard", title: "Dashboard" },
  { id: "onboarding", title: "Onboarding" },
  { id: "alerts", title: "Alert Review" },
  { id: "whitelist", title: "White List" },
  { id: "monitoring", title: "Monitoring" },
  { id: "str", title: "STR" },
  { id: "audit", title: "Audit Log" },
  { id: "reports", title: "Reports" },
  { id: "config", title: "Config" }
];

const countries = ["GE", "US", "GB", "DE", "FR", "TR", "RU", "IR", "SY", "PA", "VG", "KY"];
const highRiskCountries = ["RU", "IR", "SY"];
const offshoreCountries = ["PA", "VG", "KY"];
const sources = ["FMS Local", "UN Consolidated", "EU Sanctions", "OFAC SDN", "UK HMT", "PEP DB"];

const watchlist = [
  {
    id: "OFAC-99001",
    source: "OFAC SDN",
    type: "Sanction",
    firstName: "გიორგი",
    lastName: "ბერიძე",
    personalId: "01001001001",
    birthDate: "1988-04-12",
    country: "GE",
    reason: "Exact Georgian personal ID and birth date match"
  },
  {
    id: "PEP-22017",
    source: "PEP DB",
    type: "PEP",
    firstName: "Nika",
    lastName: "Kapanadze",
    personalId: "",
    birthDate: "1976-11-03",
    country: "GB",
    reason: "Foreign politically exposed person"
  },
  {
    id: "UN-55120",
    source: "UN Consolidated",
    type: "RCA",
    firstName: "მარიამ",
    lastName: "ლომიძე",
    personalId: "09009009009",
    birthDate: "1991-01-09",
    country: "GE",
    reason: "RCA record"
  }
];

const defaults = {
  role: "officer",
  activeView: "dashboard",
  threshold: 85,
  clients: [],
  alerts: [],
  whitelist: [],
  audit: [],
  str: [],
  monitoring: [
    {
      id: "MON-1001",
      clientName: "Nino LLC",
      type: "Premium deviation",
      status: "Soft Alert",
      description: "Actual annual premium exceeds expected KYC range by 28%."
    },
    {
      id: "MON-1002",
      clientName: "Giorgi Beridze",
      type: "3+ policies",
      status: "Soft Alert",
      description: "Three new policies issued in one calendar month."
    }
  ],
  config: {
    threshold: 85,
    lowMax: 25,
    mediumMax: 60,
    sddMonths: 36,
    cddMonths: 12,
    eddMonths: 6
  }
};

let state = loadState();
let selectedAlertId = "";
let pendingDecision = null;

const roleSelect = document.querySelector("#roleSelect");
const nav = document.querySelector("#nav");
const pageTitle = document.querySelector("#pageTitle");
const accessNotice = document.querySelector("#accessNotice");
const decisionDialog = document.querySelector("#decisionDialog");
const decisionTitle = document.querySelector("#decisionTitle");
const decisionHelp = document.querySelector("#decisionHelp");
const decisionComment = document.querySelector("#decisionComment");
const decisionFiles = document.querySelector("#decisionFiles");

function loadState() {
  try {
    return { ...structuredClone(defaults), ...JSON.parse(localStorage.getItem(STORAGE) || "{}") };
  } catch {
    return structuredClone(defaults);
  }
}

function saveState() {
  localStorage.setItem(STORAGE, JSON.stringify(state));
}

function audit(action, object, detail = "") {
  state.audit.unshift({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    user: roles[state.role].label,
    ip: "127.0.0.1",
    action,
    object,
    detail
  });
  saveState();
}

function can(view) {
  return roles[state.role].views.includes(view);
}

function setView(view) {
  state.activeView = can(view) ? view : roles[state.role].views[0];
  saveState();
  render();
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function levenshtein(a, b) {
  const left = normalize(a);
  const right = normalize(b);
  const matrix = Array.from({ length: left.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= right.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
  }
  return matrix[left.length][right.length];
}

function similarity(a, b) {
  const max = Math.max(normalize(a).length, normalize(b).length, 1);
  return Math.round((1 - levenshtein(a, b) / max) * 100);
}

function age(date) {
  if (!date) return null;
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let years = today.getFullYear() - d.getFullYear();
  const month = today.getMonth() - d.getMonth();
  if (month < 0 || (month === 0 && today.getDate() < d.getDate())) years -= 1;
  return years;
}

function scoreClient(client) {
  const reasons = [];
  let score = 0;
  const add = (points, reason) => {
    score += points;
    if (points) reasons.push({ points, reason });
  };

  if (["GE", "US", "GB", "DE", "FR"].includes(client.citizenship || client.registrationCountry)) add(0, "Low-risk jurisdiction");
  else if (highRiskCountries.includes(client.citizenship || client.registrationCountry)) add(40, "FATF / high-risk jurisdiction");
  else add(10, "Other jurisdiction");

  if (client.secondCitizenship && highRiskCountries.includes(client.secondCitizenship)) add(40, "Second citizenship high risk");
  if (client.pepStatus === "Foreign PEP" || client.pepStatus === "International PEP") add(40, "Foreign/international PEP");
  if (client.pepStatus === "Local PEP") add(25, "Local PEP");
  if (client.pepStatus === "RCA") add(20, "PEP-related RCA");
  if (["cash-intensive", "crypto", "gambling", "weapons", "precious-metals"].includes(client.businessSector)) {
    add(client.businessSector === "cash-intensive" ? 15 : 30, "Risky business sector");
  }
  if (["life-investment"].includes(client.productType)) add(20, "Investment-linked product");
  else if (["health", "property", "car-ear"].includes(client.productType)) add(5, "Moderate-risk product");
  if (client.expectedPremium === "50-200k") add(5, "Premium 50k-200k");
  if (client.expectedPremium === "200k-1m") add(15, "Premium 200k-1m");
  if (client.expectedPremium === ">1m") add(25, "Premium above 1m");
  if (["business-income", "rent", "investment"].includes(client.incomeSource)) add(5, "Business/rent/investment income");
  if (["inheritance", "gift", "other"].includes(client.incomeSource)) add(15, "Non-standard income source");
  if (client.clientType === "legal" && client.uboStructure === "multi-level") add(15, "Multi-level UBO structure");
  if (client.clientType === "legal" && offshoreCountries.includes(client.uboCountry)) add(30, "UBO offshore");

  const forcedHigh = Boolean((client.pepStatus && client.pepStatus !== "No") || client.screeningBlock || client.confirmedMatch);
  if (client.screeningBlock) reasons.push({ points: 100, reason: "Blocking sanctions/PEP screening match" });
  if (client.confirmedMatch) reasons.push({ points: 100, reason: "AML officer confirmed true match" });
  const finalScore = forcedHigh ? Math.max(score, 61) : score;
  const level = forcedHigh || finalScore >= 61 ? "High" : finalScore >= 26 ? "Medium" : "Low";
  return { score: finalScore, level, reasons, dueDiligence: level === "High" ? "EDD" : level === "Medium" ? "CDD" : "SDD" };
}

function validateClient(client) {
  const errors = [];
  if (client.clientType === "physical") {
    if (!client.firstName || client.firstName.length < 2) errors.push("სახელი მინ. 2 სიმბოლო.");
    if (!client.lastName || client.lastName.length < 2) errors.push("გვარი მინ. 2 სიმბოლო.");
    if (client.citizenship === "GE" && !/^\d{11}$/.test(client.personalId || "")) errors.push("საქართველოს მოქალაქის პირადი ნომერი უნდა იყოს 11 ციფრი.");
    if (age(client.birthDate) !== null && age(client.birthDate) < 18) errors.push("ასაკი <18, რეგისტრაცია შეუძლებელია.");
    if (!client.gender) errors.push("სქესი სავალდებულოა.");
    if (!client.phone || !/^\+\d{8,15}$/.test(client.phone)) errors.push("ტელეფონი უნდა იყოს E.164 ფორმატში.");
    if (!client.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) errors.push("ელ. ფოსტა არასწორია.");
    if (client.documentStatus !== "Active") errors.push("დოკუმენტის სტატუსი არ არის აქტიური.");
  } else {
    if (!client.organizationName) errors.push("ორგანიზაციის დასახელება სავალდებულოა.");
    if (client.registrationCountry === "GE" && !/^\d{9}$/.test(client.taxId || "")) errors.push("საქართველოს იურიდიული პირის კოდი უნდა იყოს 9 ციფრი.");
    if (!client.legalForm) errors.push("სამართლებრივი ფორმა სავალდებულოა.");
    if (!client.directorName) errors.push("დირექტორი/წარმომადგენელი სავალდებულოა.");
    if (!client.uboName && client.uboUnknown !== "on") errors.push("UBO ან Senior Managing Official სავალდებულოა.");
  }
  if (!client.productType) errors.push("პროდუქტის ტიპი სავალდებულოა.");
  if (!client.expectedPremium) errors.push("მოსალოდნელი წლიური პრემია სავალდებულოა.");
  if (!client.incomeSource) errors.push("შემოსავლის წყარო სავალდებულოა.");
  return errors;
}

function screenClient(client, mode = "Initial") {
  const whitePairs = new Set(state.whitelist.filter((w) => w.status === "Active").map((w) => `${w.clientId}:${w.entityId}`));
  const hits = watchlist
    .map((entity) => {
      const clientName = client.clientType === "legal" ? client.organizationName : `${client.firstName || ""} ${client.lastName || ""}`;
      const entityName = `${entity.firstName} ${entity.lastName}`;
      const exactId = client.personalId && entity.personalId && client.personalId === entity.personalId;
      const exactBirth = client.birthDate && entity.birthDate && client.birthDate === entity.birthDate;
      const fuzzy = similarity(clientName, entityName);
      const match = exactId && exactBirth ? 100 : fuzzy;
      const blocked = match >= state.config.threshold || (exactId && exactBirth);
      const soft = match >= state.config.threshold - 10 && match < state.config.threshold;
      return {
        id: crypto.randomUUID(),
        clientId: client.id,
        clientName,
        entity,
        source: entity.source,
        type: entity.type,
        match,
        status: blocked ? "Open" : soft ? "Soft Alert" : "Below threshold",
        priority: blocked ? "High" : "Medium",
        mode,
        assignedTo: "AML Officer 1",
        createdAt: new Date().toISOString(),
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        clientSnapshot: client
      };
    })
    .filter((hit) => hit.status !== "Below threshold" && !whitePairs.has(`${client.id}:${hit.entity.id}`));

  state.alerts.unshift(...hits);
  if (hits.some((hit) => hit.status === "Open")) {
    client.status = "Temporary delay";
    client.screeningBlock = true;
    client.risk = scoreClient(client);
  }
  audit("Screening", "Client", `${client.clientType} ${client.id}: ${hits.length} hits`);
  saveState();
  return hits;
}

function seedDemo() {
  state.clients = [
    {
      id: "CLI-1001",
      clientType: "physical",
      firstName: "გიორგი",
      lastName: "ბერიძე",
      personalId: "01001001001",
      birthDate: "1988-04-12",
      gender: "Male",
      citizenship: "GE",
      secondCitizenship: "",
      documentType: "ID Card",
      documentStatus: "Active",
      phone: "+995555123456",
      email: "giorgi@example.ge",
      productType: "property",
      expectedPremium: "200k-1m",
      businessSector: "cash-intensive",
      incomeSource: "business-income",
      pepStatus: "No",
      status: "Draft",
      createdAt: new Date().toISOString()
    },
    {
      id: "CLI-2001",
      clientType: "legal",
      organizationName: "Nino Holdings LLC",
      taxId: "404123456",
      legalForm: "LLC",
      registrationCountry: "GE",
      directorName: "Nino Kapanadze",
      uboName: "Nika Kapanadze",
      uboShare: "75",
      uboCountry: "GB",
      uboStructure: "multi-level",
      productType: "life-investment",
      expectedPremium: ">1m",
      businessSector: "crypto",
      incomeSource: "investment",
      pepStatus: "Foreign PEP",
      status: "EDD Required",
      createdAt: new Date().toISOString()
    }
  ];
  state.alerts = [];
  state.whitelist = [];
  state.str = [];
  audit("Seed", "System", "Demo data loaded");
  state.clients.forEach((client) => screenClient(client, "Initial"));
  saveState();
  render();
}

function renderNav() {
  nav.innerHTML = navItems
    .map((item) => {
      const locked = !can(item.id);
      return `<button class="${state.activeView === item.id ? "active" : ""} ${locked ? "locked" : ""}" data-view="${item.id}" type="button">
        ${item.title}<span>${locked ? "Locked" : ""}</span>
      </button>`;
    })
    .join("");
}

function renderAccessNotice() {
  const restricted = navItems.filter((item) => !can(item.id)).map((item) => item.title);
  if (!restricted.length) {
    accessNotice.classList.add("hidden");
    return;
  }
  accessNotice.classList.remove("hidden");
  accessNotice.textContent = `${roles[state.role].label}: restricted views hidden by RBAC: ${restricted.join(", ")}.`;
}

function renderDashboard() {
  const openAlerts = state.alerts.filter((a) => ["Open", "In Review", "Soft Alert", "Escalated"].includes(a.status));
  const highRisk = state.clients.filter((c) => scoreClient(c).level === "High");
  const overdue = openAlerts.filter((a) => new Date(a.dueAt) < new Date());
  const avg = openAlerts.length ? "5.4h" : "0h";
  return `
    <div class="kpi-grid">
      ${kpi("Open alerts", openAlerts.length)}
      ${kpi("Avg review time", avg)}
      ${kpi("High-risk clients", highRisk.length)}
      ${kpi("Overdue SLA", overdue.length)}
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-head"><div><h2>Alert trend</h2><p>Last 30 days sample trend</p></div></div>
        <div class="score-box">
          ${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => `<div><strong>${d}</strong><div class="score-line"><span style="width:${25 + i * 9}%"></span></div></div>`).join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h2>Risk structure</h2><p>Automatic scoring result</p></div></div>
        ${state.clients.map((client) => clientRow(client)).join("") || `<div class="empty">No clients yet. Seed demo or create one.</div>`}
      </section>
    </div>`;
}

function kpi(label, value) {
  return `<article class="kpi"><span>${esc(label)}</span><strong>${esc(value)}</strong></article>`;
}

function clientName(client) {
  return client.clientType === "legal" ? client.organizationName : `${client.firstName || ""} ${client.lastName || ""}`.trim();
}

function clientRow(client) {
  const risk = scoreClient(client);
  return `<div class="kv"><span>${esc(clientName(client))}</span><strong class="risk-${risk.level.toLowerCase()}">${risk.level} · ${risk.score} · ${risk.dueDiligence}</strong></div>`;
}

function renderOnboarding() {
  return `
    <form id="clientForm" class="client-form">
      <div class="panel-head">
        <div>
          <h2>Client onboarding</h2>
          <p>Physical/legal registration, KYC, UBO, initial screening, risk scoring.</p>
        </div>
        <div class="segmented">
          <label class="check-pill"><input type="radio" name="clientType" value="physical" checked /> ფიზიკური</label>
          <label class="check-pill"><input type="radio" name="clientType" value="legal" /> იურიდიული</label>
        </div>
      </div>
      <div id="dynamicForm"></div>
      <div class="grid-2 form-section">
        <div id="liveScore" class="score-box"></div>
        <div id="validationBox" class="score-box"></div>
      </div>
      <div class="actions form-section">
        <button class="secondary" id="registryLookup" type="button">Registry lookup</button>
        <button class="secondary" id="saveDraft" type="button">Save draft</button>
        <button class="primary" id="completeOnboarding" type="button">Initial screening + save</button>
      </div>
    </form>`;
}

function formField(name, label, type = "text", options = [], extra = "") {
  if (type === "select") {
    return `<label class="field ${extra}"><span>${label}</span><select name="${name}">${options.map((o) => `<option value="${o}">${o || "None"}</option>`).join("")}</select></label>`;
  }
  if (type === "file") return `<label class="field ${extra}"><span>${label}</span><input name="${name}" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" /></label>`;
  return `<label class="field ${extra}"><span>${label}</span><input name="${name}" type="${type}" /></label>`;
}

function physicalForm() {
  return `
    <section class="form-section"><h3>3. ფიზიკური პირი</h3><div class="fields">
      ${formField("firstName", "სახელი")}
      ${formField("lastName", "გვარი")}
      ${formField("personalId", "პირადი ნომერი")}
      ${formField("birthDate", "დაბადების თარიღი", "date")}
      ${formField("gender", "სქესი", "select", ["", "Male", "Female"])}
      ${formField("citizenship", "მოქალაქეობა", "select", countries)}
      ${formField("secondCitizenship", "მეორე მოქალაქეობა", "select", ["", ...countries])}
      ${formField("documentType", "დოკუმენტის ტიპი", "select", ["ID Card", "Residence Permit", "Temporary Residence", "Passport"])}
      ${formField("documentStatus", "დოკუმენტის სტატუსი", "select", ["Active", "Inactive", "Expired", "Lost"])}
      ${formField("actualAddress", "ფაქტიური მისამართი", "text", [], "wide")}
      ${formField("phone", "საკონტაქტო ტელეფონი")}
      ${formField("email", "ელ. ფოსტა", "email")}
      ${formField("taxResidence", "საგადასახადო რეზიდენტობა", "select", countries)}
      ${formField("tin", "TIN")}
      ${formField("idScan", "პასპორტი/ID სკან-ასლი", "file", [], "full")}
    </div></section>`;
}

function legalForm() {
  return `
    <section class="form-section"><h3>4. იურიდიული პირი</h3><div class="fields">
      ${formField("organizationName", "ორგანიზაციის დასახელება", "text", [], "wide")}
      ${formField("taxId", "საიდენტიფიკაციო კოდი")}
      ${formField("legalForm", "სამართლებრივი ფორმა", "select", ["", "LLC", "JSC", "IE", "Branch", "NPO"])}
      ${formField("registrationCountry", "რეგისტრაციის ქვეყანა", "select", countries)}
      ${formField("registrationDate", "რეგისტრაციის თარიღი", "date")}
      ${formField("legalAddress", "იურიდიული მისამართი", "text", [], "wide")}
      ${formField("actualAddress", "ფაქტიური მისამართი", "text", [], "wide")}
      ${formField("directorName", "დირექტორი/წარმომადგენელი")}
      ${formField("contactEmail", "საკონტაქტო ელ. ფოსტა", "email")}
      ${formField("licenseNumber", "ლიცენზიის ნომერი")}
    </div></section>
    <section class="form-section"><h3>4.2 UBO / Beneficial ownership</h3><div class="fields">
      ${formField("uboName", "UBO სახელი/გვარი")}
      ${formField("uboShare", "წილი %", "number")}
      ${formField("uboCountry", "UBO ქვეყანა", "select", countries)}
      ${formField("uboStructure", "ფლობის სტრუქტურა", "select", ["single", "multi-level"])}
      <label class="check-pill"><input name="uboUnknown" type="checkbox" /> UBO ვერ დგინდება — Senior Managing Official</label>
      ${formField("ownershipChain", "Ownership chain", "text", [], "full")}
    </div></section>`;
}

function kycForm() {
  return `
    <section class="form-section"><h3>5. KYC</h3><div class="fields">
      ${formField("productType", "პროდუქტის ტიპი", "select", ["", "auto-tpl", "health", "property", "car-ear", "cargo", "life-investment"])}
      ${formField("expectedPremium", "მოსალოდნელი წლიური პრემია", "select", ["", "<50k", "50-200k", "200k-1m", ">1m"])}
      ${formField("activityStatus", "საქმიანობის სტატუსი", "select", ["", "employed", "business-owner", "individual-entrepreneur", "self-employed", "unemployed", "student", "pensioner"])}
      ${formField("businessSector", "საქმიანობის სფერო", "select", ["", "low-risk", "ordinary", "cash-intensive", "crypto", "gambling", "weapons", "precious-metals"])}
      ${formField("incomeSource", "შემოსავლის წყარო", "select", ["", "salary", "pension", "dividend", "business-income", "rent", "investment", "inheritance", "gift", "other"])}
      ${formField("annualIncome", "წლიური შემოსავალი", "select", ["", "<50k", "50-100k", "100-500k", ">500k"])}
      ${formField("pepStatus", "PEP/RCA სტატუსი", "select", ["No", "Local PEP", "Foreign PEP", "International PEP", "RCA"])}
      ${formField("pepDetails", "PEP დეტალები", "text", [], "wide")}
      ${formField("supportingDocs", "KYC დოკუმენტები", "file", [], "full")}
    </div></section>`;
}

function readClientForm() {
  const form = document.querySelector("#clientForm");
  const data = Object.fromEntries(new FormData(form).entries());
  data.clientType = form.querySelector("input[name='clientType']:checked").value;
  data.id = `CLI-${Date.now().toString().slice(-6)}`;
  data.documentStatus ||= "Active";
  data.status = "Draft";
  data.createdAt = new Date().toISOString();
  data.fileCount = form.querySelectorAll("input[type='file']").length;
  return data;
}

function updateLiveForm() {
  const data = readClientForm();
  const risk = scoreClient(data);
  const errors = validateClient(data);
  document.querySelector("#liveScore").innerHTML = `
    <h3>Risk scoring</h3>
    <strong class="risk-${risk.level.toLowerCase()}">${risk.level} · ${risk.score} · ${risk.dueDiligence}</strong>
    <div class="score-line"><span style="width:${Math.min(risk.score, 100)}%"></span></div>
    ${risk.reasons.map((r) => `<div class="kv"><span>+${r.points}</span><strong>${esc(r.reason)}</strong></div>`).join("") || `<p>No risk factors yet.</p>`}`;
  document.querySelector("#validationBox").innerHTML = `
    <h3>Validation</h3>
    ${errors.length ? errors.map((e) => `<div class="kv"><span>Issue</span><strong class="risk-high">${esc(e)}</strong></div>`).join("") : `<strong class="risk-low">Ready for initial screening</strong>`}`;
}

function renderAlerts() {
  if (state.role === "operator") return `<div class="empty">ოპერატორი ვერ ხედავს ალერტების სრულ ცხრილს.</div>`;
  const alerts = [...state.alerts].sort((a, b) => a.match - b.match);
  if (!selectedAlertId && alerts[0]) selectedAlertId = alerts[0].id;
  const selected = alerts.find((a) => a.id === selectedAlertId);
  return `
    <div class="panel-head">
      <div><h2>8. AML მართვის პანელი და ალერტები</h2><p>Default sort: lower match % first.</p></div>
      <div class="actions"><button class="secondary" data-bulk="review" type="button">Bulk In Review</button></div>
    </div>
    <div class="alert-workbench">
      <div class="alert-list">${alerts.map(alertButton).join("") || `<div class="empty">No alerts.</div>`}</div>
      <div class="panel">${selected ? alertDetail(selected) : `<div class="empty">Select an alert.</div>`}</div>
    </div>`;
}

function alertButton(alert) {
  return `<button class="alert-card ${alert.id === selectedAlertId ? "active" : ""}" data-alert="${alert.id}" type="button">
    <strong>${esc(alert.clientName)}</strong>
    <p>${esc(alert.type)} · ${esc(alert.source)} · ${alert.match}%</p>
    <span class="badge ${alert.priority === "High" ? "high" : "medium"}">${esc(alert.status)}</span>
  </button>`;
}

function alertDetail(alert) {
  const risk = scoreClient(alert.clientSnapshot);
  return `
    <div class="panel-head"><div><h2>${esc(alert.clientName)}</h2><p>${esc(alert.mode)} screening · ${esc(alert.assignedTo)}</p></div><span class="badge high">${alert.match}%</span></div>
    <div class="split-card">
      <div class="side-panel">
        <h3>ჩვენი კლიენტი</h3>
        ${kv("Client ID", alert.clientId)}
        ${kv("Type", alert.clientSnapshot.clientType)}
        ${kv("Risk", `${risk.level} · ${risk.score} · ${risk.dueDiligence}`)}
        ${kv("Status", alert.clientSnapshot.status)}
        ${kv("KYC", `${alert.clientSnapshot.productType || ""} / ${alert.clientSnapshot.expectedPremium || ""}`)}
      </div>
      <div class="side-panel">
        <h3>სიის ჩანაწერი</h3>
        ${kv("Entity ID", alert.entity.id)}
        ${kv("Name", `${alert.entity.firstName} ${alert.entity.lastName}`)}
        ${kv("Source", alert.source)}
        ${kv("Type", alert.type)}
        ${kv("Reason", alert.entity.reason)}
      </div>
    </div>
    <div class="score-box" style="margin-top:14px">
      <h3>Decision</h3>
      <p>Comment is mandatory, minimum 20 characters. Evidence files: PDF/JPG/PNG, max 10 MB each in production.</p>
      <div class="decision-row">
        <button class="danger" data-decision="confirm" type="button">კი — Confirmed Match</button>
        <button class="primary" data-decision="falsePositive" type="button">არა — False Positive</button>
        <button class="secondary" data-decision="escalate" type="button">Escalate</button>
        <button class="secondary" data-str="${alert.id}" type="button">Prepare STR</button>
      </div>
    </div>`;
}

function kv(label, value) {
  return `<div class="kv"><span>${esc(label)}</span><strong>${esc(value || "-")}</strong></div>`;
}

function renderTable(rows, columns) {
  if (!rows.length) return `<div class="empty">No data.</div>`;
  return `<div class="table-card"><table><thead><tr>${columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${columns.map((c) => `<td>${c.render ? c.render(row) : esc(row[c.key])}</td>`).join("")}</tr>`)
    .join("")}</tbody></table></div>`;
}

function renderWhitelist() {
  return renderTable(state.whitelist, [
    { label: "Client", key: "clientName" },
    { label: "Entity", key: "entityId" },
    { label: "Officer", key: "officer" },
    { label: "Reason", key: "reason" },
    { label: "Expires", key: "expiresAt" },
    { label: "Status", key: "status", render: (r) => `<span class="badge">${esc(r.status)}</span>` }
  ]);
}

function renderMonitoring() {
  return `<section class="panel"><div class="panel-head"><div><h2>10. Ongoing Monitoring</h2><p>Behavior anomalies and re-classification.</p></div></div>${renderTable(state.monitoring, [
    { label: "ID", key: "id" },
    { label: "Client", key: "clientName" },
    { label: "Type", key: "type" },
    { label: "Status", key: "status" },
    { label: "Description", key: "description" }
  ])}</section>`;
}

function renderStr() {
  return `<section class="panel"><div class="panel-head"><div><h2>10.2 STR workspace</h2><p>Visible only to permitted AML/compliance/audit roles. Operators do not see STR facts.</p></div><button class="secondary" id="exportStr" type="button">Export XML/PDF mock</button></div>${renderTable(state.str, [
    { label: "STR ID", key: "id" },
    { label: "Client", key: "clientName" },
    { label: "Reason", key: "reason" },
    { label: "Deadline", key: "deadline" },
    { label: "Status", key: "status" }
  ])}</section>`;
}

function renderAudit() {
  return renderTable(state.audit, [
    { label: "UTC time", key: "at" },
    { label: "User", key: "user" },
    { label: "IP", key: "ip" },
    { label: "Action", key: "action" },
    { label: "Object", key: "object" },
    { label: "Detail", key: "detail" }
  ]);
}

function renderReports() {
  const riskCounts = ["Low", "Medium", "High"].map((level) => ({
    level,
    count: state.clients.filter((client) => scoreClient(client).level === level).length
  }));
  return `<div class="grid-2">
    <section class="panel"><div class="panel-head"><div><h2>12. Reports</h2><p>Daily, monthly, quarterly, annual AML reporting.</p></div></div>
      ${riskCounts.map((r) => kv(r.level, r.count)).join("")}
      <div class="actions form-section"><button class="secondary" type="button">PDF</button><button class="secondary" type="button">Excel</button><button class="secondary" type="button">CSV</button><button class="secondary" type="button">XML/JSON</button></div>
    </section>
    <section class="panel"><h2>Acceptance checklist</h2><div class="timeline">
      ${["Physical onboarding valid ID", "17-year-old blocked", "Sanctioned personal ID creates alert", "False positive whitelist suppresses batch", "Operator cannot see full alerts", "Audit log captures decisions"].map((item) => `<div class="timeline-item">${item}</div>`).join("")}
    </div></section>
  </div>`;
}

function renderConfig() {
  return `<form id="configForm" class="panel">
    <div class="panel-head"><div><h2>Admin configuration</h2><p>Threshold and risk review cycles. Changes are audit logged.</p></div></div>
    <div class="fields">
      ${configInput("threshold", "Match threshold %")}
      ${configInput("lowMax", "Low risk max")}
      ${configInput("mediumMax", "Medium risk max")}
      ${configInput("sddMonths", "SDD review months")}
      ${configInput("cddMonths", "CDD review months")}
      ${configInput("eddMonths", "EDD review months")}
    </div>
    <div class="actions form-section"><button class="primary" id="saveConfig" type="button">Save config</button></div>
  </form>`;
}

function configInput(name, label) {
  return `<label class="field"><span>${label}</span><input name="${name}" type="number" value="${esc(state.config[name])}" /></label>`;
}

function render() {
  if (!can(state.activeView)) state.activeView = roles[state.role].views[0];
  roleSelect.value = state.role;
  renderNav();
  renderAccessNotice();
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const view = document.querySelector(`#${state.activeView}View`);
  view.classList.add("active");
  pageTitle.textContent = navItems.find((item) => item.id === state.activeView)?.title || "AML";
  view.innerHTML =
    state.activeView === "dashboard" ? renderDashboard() :
    state.activeView === "onboarding" ? renderOnboarding() :
    state.activeView === "alerts" ? renderAlerts() :
    state.activeView === "whitelist" ? renderWhitelist() :
    state.activeView === "monitoring" ? renderMonitoring() :
    state.activeView === "str" ? renderStr() :
    state.activeView === "audit" ? renderAudit() :
    state.activeView === "reports" ? renderReports() :
    renderConfig();
  wireView();
}

function wireView() {
  if (state.activeView === "onboarding") {
    const dynamic = document.querySelector("#dynamicForm");
    const repaint = () => {
      const type = document.querySelector("input[name='clientType']:checked").value;
      dynamic.innerHTML = `${type === "physical" ? physicalForm() : legalForm()}${kycForm()}`;
      dynamic.querySelectorAll("input,select").forEach((el) => el.addEventListener("input", updateLiveForm));
      dynamic.querySelectorAll("input,select").forEach((el) => el.addEventListener("change", updateLiveForm));
      updateLiveForm();
    };
    document.querySelectorAll("input[name='clientType']").forEach((el) => el.addEventListener("change", repaint));
    repaint();
    document.querySelector("#registryLookup").addEventListener("click", () => {
      audit("Lookup", "Registry", "Mock registry lookup requested");
      alert("Mock registry lookup: integration unavailable, manual entry allowed with AML approval.");
    });
    document.querySelector("#saveDraft").addEventListener("click", () => saveClient(false));
    document.querySelector("#completeOnboarding").addEventListener("click", () => saveClient(true));
  }
}

function saveClient(withScreening) {
  const client = readClientForm();
  const errors = validateClient(client);
  if (errors.length) {
    updateLiveForm();
    audit("Validation failed", "Client", errors.join("; "));
    return;
  }
  client.risk = scoreClient(client);
  client.status = withScreening ? (client.risk.level === "High" ? "EDD Required" : "Active") : "Draft";
  state.clients.unshift(client);
  audit(withScreening ? "Create + Initial Screening" : "Create Draft", "Client", `${clientName(client)} ${client.risk.level}`);
  if (withScreening) screenClient(client, "Initial");
  saveState();
  render();
}

function openDecision(action) {
  const alert = state.alerts.find((a) => a.id === selectedAlertId);
  if (!alert) return;
  pendingDecision = { action, alertId: alert.id };
  decisionComment.value = "";
  decisionFiles.value = "";
  decisionTitle.textContent =
    action === "confirm" ? "Confirmed Match" :
    action === "falsePositive" ? "False Positive" :
    "Escalate alert";
  decisionHelp.textContent = `Alert ${alert.entity.id} for ${alert.clientName}.`;
  decisionDialog.showModal();
}

function applyDecision() {
  if (!pendingDecision) return;
  const comment = decisionComment.value.trim();
  if (comment.length < 20) {
    alert("Decision comment must be at least 20 characters.");
    return;
  }
  const alert = state.alerts.find((a) => a.id === pendingDecision.alertId);
  if (!alert) return;
  if (pendingDecision.action === "confirm") {
    alert.status = "Confirmed Match";
    const client = state.clients.find((c) => c.id === alert.clientId);
    if (client) {
      client.status = "Blocked";
      client.confirmedMatch = true;
      client.risk = scoreClient(client);
    }
    audit("Decision", "Alert", `Confirmed ${alert.entity.id}: ${comment}`);
  }
  if (pendingDecision.action === "falsePositive") {
    alert.status = "False Positive";
    state.whitelist.unshift({
      id: crypto.randomUUID(),
      clientId: alert.clientId,
      clientName: alert.clientName,
      entityId: alert.entity.id,
      source: alert.source,
      decidedAt: new Date().toISOString(),
      officer: roles[state.role].label,
      reason: comment,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: "Active"
    });
    audit("Decision", "Alert", `False positive ${alert.entity.id}: ${comment}`);
  }
  if (pendingDecision.action === "escalate") {
    alert.status = "Escalated";
    audit("Decision", "Alert", `Escalated ${alert.entity.id}: ${comment}`);
  }
  pendingDecision = null;
  saveState();
  render();
}

function prepareStr(alertId) {
  const alert = state.alerts.find((a) => a.id === alertId);
  if (!alert) return;
  state.str.unshift({
    id: `STR-${Date.now().toString().slice(-6)}`,
    clientName: alert.clientName,
    reason: `${alert.type} / ${alert.source} / ${alert.match}%`,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: "Draft"
  });
  audit("Create", "STR", alert.clientName);
  state.activeView = "str";
  saveState();
  render();
}

function runBatchScreening() {
  state.alerts = state.alerts.filter((a) => !["Soft Alert", "Open"].includes(a.status));
  state.clients.forEach((client) => screenClient(client, "Batch"));
  audit("Batch Screening", "System", `${state.clients.length} clients screened`);
  saveState();
  render();
}

nav.addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (!button) return;
  setView(button.dataset.view);
});

roleSelect.addEventListener("change", () => {
  state.role = roleSelect.value;
  audit("Role switch", "Session", roles[state.role].label);
  if (!can(state.activeView)) state.activeView = roles[state.role].views[0];
  saveState();
  render();
});

document.querySelector("#seedData").addEventListener("click", seedDemo);
document.querySelector("#runScreening").addEventListener("click", runBatchScreening);
document.body.addEventListener("click", (event) => {
  const alertButtonEl = event.target.closest("[data-alert]");
  if (alertButtonEl) {
    selectedAlertId = alertButtonEl.dataset.alert;
    render();
  }
  const decisionButton = event.target.closest("[data-decision]");
  if (decisionButton) openDecision(decisionButton.dataset.decision);
  const strButton = event.target.closest("[data-str]");
  if (strButton) prepareStr(strButton.dataset.str);
  if (event.target.id === "saveConfig") {
    const data = Object.fromEntries(new FormData(document.querySelector("#configForm")).entries());
    Object.keys(data).forEach((key) => {
      state.config[key] = Number(data[key]);
    });
    audit("Update", "Config", `Threshold ${state.config.threshold}%`);
    saveState();
    render();
  }
});

document.querySelector("#confirmDecision").addEventListener("click", (event) => {
  event.preventDefault();
  applyDecision();
  decisionDialog.close();
});

if (!state.audit.length) audit("Login", "Session", "Initial local session");
render();
