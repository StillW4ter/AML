const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);
const UN_CONSOLIDATED_XML_URL = "https://scsanctions.un.org/resources/xml/en/consolidated.xml";
const SANCTIONS_REFRESH_MS = 24 * 60 * 60 * 1000;

let sanctionsCache = {
  records: [],
  sourceUrl: UN_CONSOLIDATED_XML_URL,
  sourceName: "UN Security Council Consolidated List",
  fetchedAt: null,
  dateGenerated: null,
  xmlBytes: 0,
  error: null,
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".otf": "font/otf",
  ".woff2": "font/woff2",
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function tagValue(block, tag) {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ").trim()) : "";
}

function tagValues(block, tag) {
  return [...block.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => decodeXml(match[1].replace(/<[^>]+>/g, " ").trim()))
    .filter(Boolean);
}

function sectionValues(block, sectionTag, valueTag = "VALUE") {
  return [...block.matchAll(new RegExp(`<${sectionTag}>([\\s\\S]*?)<\\/${sectionTag}>`, "gi"))]
    .flatMap((match) => tagValues(match[1], valueTag));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\u10a0-\u10ff]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(value) {
  const text = normalizeText(value).replace(/\s/g, "");
  if (text.length < 2) return text ? [text] : [];
  const grams = [];
  for (let index = 0; index < text.length - 1; index += 1) grams.push(text.slice(index, index + 2));
  return grams;
}

function stringSimilarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  const leftTokens = new Set(left.split(" "));
  const rightTokens = new Set(right.split(" "));
  const tokenOverlap = [...leftTokens].filter((token) => rightTokens.has(token)).length / Math.max(leftTokens.size, rightTokens.size);
  const leftGrams = bigrams(left);
  const rightGrams = bigrams(right);
  const rightCounts = new Map();
  rightGrams.forEach((gram) => rightCounts.set(gram, (rightCounts.get(gram) || 0) + 1));
  let matches = 0;
  leftGrams.forEach((gram) => {
    const count = rightCounts.get(gram) || 0;
    if (count > 0) {
      matches += 1;
      rightCounts.set(gram, count - 1);
    }
  });
  const dice = (2 * matches) / Math.max(1, leftGrams.length + rightGrams.length);
  return Math.max(tokenOverlap, dice);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => value.trim()).filter(Boolean))];
}

function parseUnSanctionsXml(xml) {
  const dateGenerated = xml.match(/dateGenerated="([^"]+)"/)?.[1] || null;
  const records = [];

  for (const match of xml.matchAll(/<INDIVIDUAL>([\s\S]*?)<\/INDIVIDUAL>/g)) {
    const block = match[1];
    const names = unique([tagValue(block, "FIRST_NAME"), tagValue(block, "SECOND_NAME"), tagValue(block, "THIRD_NAME"), tagValue(block, "FOURTH_NAME")]);
    const aliases = unique([...tagValues(block, "ALIAS_NAME"), tagValue(block, "NAME_ORIGINAL_SCRIPT")]);
    const documents = unique([...tagValues(block, "NUMBER"), ...tagValues(block, "PASSPORT"), ...tagValues(block, "NATIONAL_IDENTIFICATION_NUMBER")]);
    const nationalities = unique(sectionValues(block, "NATIONALITY"));
    const dobs = unique([...tagValues(block, "DATE_OF_BIRTH"), ...tagValues(block, "YEAR"), ...tagValues(block, "FROM_YEAR"), ...tagValues(block, "TO_YEAR")]);
    const addresses = unique(tagValues(block, "COUNTRY"));
    const fullName = names.join(" ");
    records.push({
      id: tagValue(block, "DATAID") || tagValue(block, "REFERENCE_NUMBER") || `individual-${records.length}`,
      type: "individual",
      referenceNumber: tagValue(block, "REFERENCE_NUMBER"),
      listType: tagValue(block, "UN_LIST_TYPE"),
      fullName,
      aliases,
      names: unique([fullName, ...aliases]),
      documents,
      nationalities,
      dobs,
      addresses,
      listedOn: tagValue(block, "LISTED_ON"),
      comments: tagValue(block, "COMMENTS1"),
    });
  }

  for (const match of xml.matchAll(/<ENTITY>([\s\S]*?)<\/ENTITY>/g)) {
    const block = match[1];
    const name = tagValue(block, "FIRST_NAME");
    const aliases = unique([...tagValues(block, "ALIAS_NAME"), tagValue(block, "NAME_ORIGINAL_SCRIPT")]);
    const addresses = unique([...tagValues(block, "COUNTRY"), ...tagValues(block, "STREET"), ...tagValues(block, "CITY")]);
    records.push({
      id: tagValue(block, "DATAID") || tagValue(block, "REFERENCE_NUMBER") || `entity-${records.length}`,
      type: "entity",
      referenceNumber: tagValue(block, "REFERENCE_NUMBER"),
      listType: tagValue(block, "UN_LIST_TYPE"),
      fullName: name,
      aliases,
      names: unique([name, ...aliases]),
      documents: unique(tagValues(block, "NUMBER")),
      nationalities: [],
      dobs: [],
      addresses,
      listedOn: tagValue(block, "LISTED_ON"),
      comments: tagValue(block, "COMMENTS1"),
    });
  }

  return { records, dateGenerated };
}

async function syncSanctionsList(force = false) {
  const freshEnough = sanctionsCache.fetchedAt && Date.now() - new Date(sanctionsCache.fetchedAt).getTime() < SANCTIONS_REFRESH_MS;
  if (!force && freshEnough && sanctionsCache.records.length) return sanctionsCache;
  try {
    const response = await fetch(UN_CONSOLIDATED_XML_URL, { headers: { "user-agent": "Acton AML screening prototype" } });
    if (!response.ok) throw new Error(`UN XML download failed with HTTP ${response.status}`);
    const xml = await response.text();
    const parsed = parseUnSanctionsXml(xml);
    sanctionsCache = {
      records: parsed.records,
      sourceUrl: UN_CONSOLIDATED_XML_URL,
      sourceName: "UN Security Council Consolidated List",
      fetchedAt: new Date().toISOString(),
      dateGenerated: parsed.dateGenerated,
      xmlBytes: Buffer.byteLength(xml),
      error: null,
    };
    return sanctionsCache;
  } catch (error) {
    sanctionsCache = { ...sanctionsCache, error: error.message, fetchedAt: sanctionsCache.fetchedAt };
    throw error;
  }
}

function screenClientAgainstSanctions(client) {
  const clientName = unique([client.fullName, [client.firstName, client.lastName].filter(Boolean).join(" "), client.companyName]).join(" ");
  const clientDob = normalizeText(client.birthDate);
  const clientNationality = normalizeText(client.citizenship || client.nationality);
  const clientDocuments = unique([client.personalId, client.documentNumber, client.passportNumber, client.taxId]).map(normalizeText);
  const clientAddress = normalizeText([client.legalAddress, client.actualAddress, client.address].filter(Boolean).join(" "));

  const matches = sanctionsCache.records.map((record) => {
    const nameScores = record.names.map((name) => ({ name, score: stringSimilarity(clientName, name) }));
    const bestName = nameScores.sort((a, b) => b.score - a.score)[0] || { name: "", score: 0 };
    const reasons = [];
    let score = Math.round(bestName.score * 75);

    if (bestName.score >= 0.98) reasons.push("ზუსტი სახელის დამთხვევა");
    else if (bestName.score >= 0.78) reasons.push("მსგავსი სახელი / alias");
    else if (bestName.score >= 0.62) reasons.push("სუსტი სახელის მსგავსება");

    if (clientDob && record.dobs.some((dob) => normalizeText(dob).includes(clientDob) || clientDob.includes(normalizeText(dob)))) {
      score += 20;
      reasons.push("დაბადების თარიღი დაემთხვა");
    }

    if (clientNationality && record.nationalities.some((nationality) => stringSimilarity(clientNationality, nationality) >= 0.8)) {
      score += 10;
      reasons.push("მოქალაქეობა / nationality დაემთხვა");
    }

    if (clientDocuments.some((doc) => doc && record.documents.some((recordDoc) => normalizeText(recordDoc).includes(doc) || doc.includes(normalizeText(recordDoc))))) {
      score += 40;
      reasons.push("დოკუმენტის ან ID ნომერი დაემთხვა");
    }

    if (clientAddress && record.addresses.some((address) => stringSimilarity(clientAddress, address) >= 0.85)) {
      score += 10;
      reasons.push("მისამართის / ქვეყნის დამთხვევა");
    }

    const finalScore = Math.min(100, score);
    return {
      score: finalScore,
      status: finalScore >= 90 ? "strong_match" : finalScore >= 75 ? "possible_match" : "clear",
      reasons,
      matchedName: bestName.name,
      record: {
        id: record.id,
        type: record.type,
        fullName: record.fullName,
        aliases: record.aliases.slice(0, 5),
        referenceNumber: record.referenceNumber,
        listType: record.listType,
        listedOn: record.listedOn,
        comments: record.comments,
      },
    };
  }).filter((match) => match.score >= 60 && match.reasons.length)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const topScore = matches[0]?.score || 0;
  const status = topScore >= 90 ? "strong_match" : topScore >= 75 ? "possible_match" : "clear";
  return {
    status,
    score: topScore,
    checkedAt: new Date().toISOString(),
    sourceName: sanctionsCache.sourceName,
    sourceDate: sanctionsCache.dateGenerated,
    recordsChecked: sanctionsCache.records.length,
    matches,
  };
}

function readRequestJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      if (!body.trim()) resolve({});
      else {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Invalid JSON body")); }
      }
    });
    req.on("error", reject);
  });
}

function publicSanctionsStatus() {
  return {
    sourceName: sanctionsCache.sourceName,
    sourceUrl: sanctionsCache.sourceUrl,
    fetchedAt: sanctionsCache.fetchedAt,
    dateGenerated: sanctionsCache.dateGenerated,
    records: sanctionsCache.records.length,
    individuals: sanctionsCache.records.filter((record) => record.type === "individual").length,
    entities: sanctionsCache.records.filter((record) => record.type === "entity").length,
    xmlBytes: sanctionsCache.xmlBytes,
    error: sanctionsCache.error,
  };
}

function sendJson(res, status, body) {
  send(res, status, JSON.stringify(body), "application/json; charset=utf-8");
}

function getCountries() {
  const source = fs.readFileSync(path.join(root, "lib/aml/countries.ts"), "utf8");
  return [...source.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function send(res, status, body, type = "text/html; charset=utf-8") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
  });
  res.end(body);
}

function renderAmlPage() {
  const countries = getCountries();
  const plainCountryOptions = countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("");
  const countryOptions = countries.map((country) => `<option value="${escapeHtml(country)}"${country === "საქართველო" ? " selected" : ""}>${escapeHtml(country)}</option>`).join("");
  const secondCountryOptions = `<option value="">არ აქვს</option>${plainCountryOptions}`;

  return `<!doctype html>
<html lang="ka">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AML - კლიენტის რეგისტრაცია</title>
    <style>
      :root { color-scheme: light; --ink:#182522; --muted:#667570; --line:#d8e4df; --soft:#f4f8f6; --panel:#ffffff; --accent:#0f766e; --accent-weak:#e5f3ef; --accent-ink:#064e47; --ok:#047857; --bad:#9f1239; --danger-bg:#fdf2f5; --field:#ffffff; --disabled:#eef3f1; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: linear-gradient(180deg, #f7faf8 0%, var(--soft) 100%); color: var(--ink); }
      main { min-height: 100vh; padding: 28px 34px 40px; }
      .wrap { max-width: 1760px; margin: 0 auto; display: grid; gap: 18px; }
      .panel { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; box-shadow: 0 16px 34px rgba(25, 49, 43, .07); }
      header.panel { padding: 24px 28px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: center; border-top: 5px solid var(--accent); }
      .eyebrow { margin: 0 0 8px; color: var(--accent); font-weight: 950; font-size: 14px; letter-spacing: .08em; text-transform: uppercase; }
      h1 { margin: 0; font-size: clamp(32px, 3.2vw, 48px); line-height: 1.05; letter-spacing: 0; font-weight: 950; max-width: 980px; }
      .sub { margin: 10px 0 0; color: var(--muted); font-weight: 760; max-width: 920px; font-size: clamp(16px, 1.25vw, 20px); line-height: 1.35; }
      .actions { display: grid; grid-template-columns: 1fr; gap: 10px; align-items: stretch; min-width: 360px; }
      .langs, .registry-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      button { border: 1px solid transparent; border-radius: 11px; padding: 12px 16px; min-height: 46px; font-weight: 900; cursor: pointer; background: #eef5f2; color: var(--ink); font-size: 15px; transition: border-color .12s ease, background .12s ease, box-shadow .12s ease; }
      button:hover { border-color: #b7cdc6; box-shadow: 0 8px 16px rgba(22,33,31,.06); }
      button.primary { background: var(--accent); color: white; }
      button.active { background: var(--ink); color: white; }
      .langs { display: grid; grid-template-columns: repeat(4, 1fr); }
      .langs button { width: auto; padding-inline: 0; background: #f5f8f7; }
      .langs button.active { background: var(--ink); }
      .actions > button[data-registry] { background: var(--accent-weak); color: var(--accent-ink); border-color: #c6ded7; }
      .actions > .primary { width: 100%; }
      .workflow { display: grid; grid-template-columns: repeat(8, minmax(130px, 1fr)); gap: 10px; padding: 12px; }
      .flow-step { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #f8fbfa; min-height: 76px; display: grid; align-content: center; gap: 4px; }
      .flow-step strong { font-size: 13px; line-height: 1.15; }
      .flow-step span { color: var(--muted); font-weight: 800; font-size: 11px; line-height: 1.2; }
      .flow-step.active { background: var(--accent-weak); border-color: #a8d3ca; color: var(--accent-ink); }
      .grid { display: grid; gap: 22px; grid-template-columns: minmax(0, 1fr) 420px; align-items: start; }
      form.panel, aside.panel { padding: 24px; }
      .section { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px 20px; padding-bottom: 24px; border-bottom: 1px solid var(--line); margin-bottom: 24px; position: relative; }
      .section:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
      .section-title { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
      .section-title h2 { margin: 0; font-size: 18px; }
      .section-title span { color: var(--muted); font-size: 12px; font-weight: 900; }
      .wide { grid-column: span 2; }
      .full { grid-column: 1 / -1; }
      .module-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
      .module-card { padding: 16px; display: grid; gap: 10px; min-height: 128px; }
      .module-card h3 { margin: 0; font-size: 16px; line-height: 1.15; }
      .module-card p { margin: 0; color: var(--muted); font-weight: 780; font-size: 13px; line-height: 1.35; }
      label { display: grid; gap: 8px; font-weight: 900; font-size: 15px; line-height: 1.15; }
      input, select { width: 100%; height: 54px; border: 1px solid var(--line); border-radius: 10px; padding: 0 14px; font: inherit; font-weight: 760; background: var(--field); color: var(--ink); min-width: 0; outline: none; }
      input:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(15,118,110,.14); }
      input:disabled { background: var(--disabled); color: #8a9693; }
      small { color: var(--muted); font-weight: 750; font-size: 12px; }
      .required { color: var(--bad); }
      .invalid-field { border-color: var(--bad) !important; box-shadow: 0 0 0 3px rgba(159,18,57,.10) !important; background: #fff8fa; }
      .field-error { color: var(--bad); font-weight: 900; font-size: 12px; line-height: 1.25; }
      .form-notice { grid-column: 1 / -1; border: 1px solid #f0c8d2; border-left: 4px solid var(--bad); background: var(--danger-bg); color: var(--bad); border-radius: 12px; padding: 12px 14px; font-weight: 900; line-height: 1.3; }
      .form-notice[hidden] { display: none; }
      .status-box { min-height: 54px; border: 1px solid var(--line); border-radius: 10px; padding: 0 14px; background: var(--disabled); display: flex; align-items: center; justify-content: space-between; font-weight: 850; }
      .registry-actions { grid-column: 1 / -1; }
      aside { display: grid; align-content: start; gap: 16px; }
      aside section { padding-bottom: 20px; border-bottom: 1px solid var(--line); }
      aside section:last-child { border-bottom: 0; padding-bottom: 0; }
      h2 { margin: 0 0 14px; font-size: 24px; line-height: 1.08; font-weight: 950; }
      #validationMode { margin: 0 0 12px; color: var(--muted); font-weight: 800; font-size: 14px; }
      .error { background: var(--danger-bg); color: var(--bad); padding: 13px 14px; border-radius: 10px; border-left: 4px solid var(--bad); font-weight: 860; margin-top: 8px; font-size: 15px; line-height: 1.25; }
      .success { background: #ecfdf3; color: var(--ok); padding: 13px 14px; border-radius: 10px; border-left: 4px solid var(--ok); font-weight: 860; font-size: 15px; }
      .screening-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; }
      .screening-actions button { min-height: 42px; padding: 10px 12px; font-size: 13px; }
      .screening-result { border: 1px solid var(--line); border-radius: 12px; padding: 12px; background: #f8fbfa; display: grid; gap: 8px; }
      .screening-result strong { font-size: 14px; }
      .screening-result p { margin: 0; color: var(--muted); font-size: 12px; font-weight: 800; line-height: 1.35; }
      .badge { display: inline-flex; width: fit-content; align-items: center; border-radius: 999px; padding: 6px 10px; font-size: 12px; font-weight: 950; background: var(--accent-weak); color: var(--accent-ink); }
      .badge.bad { background: var(--danger-bg); color: var(--bad); }
      .badge.warn { background: #eef6ff; color: #0f5e8a; }
      ul { margin: 0; padding-left: 21px; }
      li { margin: 11px 0; color: var(--muted); font-weight: 800; font-size: 15px; line-height: 1.28; }
      @media (max-width: 1180px) { header.panel, .grid { grid-template-columns: 1fr; } .actions { min-width: 0; } .section { grid-template-columns: repeat(2, minmax(0, 1fr)); } .workflow, .module-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 700px) { main { padding: 14px; } header.panel, form.panel, aside.panel { padding: 18px; border-radius: 16px; } h1 { font-size: 32px; } .sub { font-size: 15px; } .section { grid-template-columns: 1fr; } button { width: 100%; } }
    </style>
  </head>
  <body>
    <main>
      <div class="wrap">
        <header class="panel">
          <div>
            <p class="eyebrow" data-i18n="eyebrow">AML მოდული · ფიზიკური პირის რეგისტრაცია</p>
            <h1 data-i18n="title">კლიენტის რეგისტრაციის ფორმა</h1>
            <p class="sub" data-i18n="subtitle">მოქალაქეობა, იურიდიული მისამართი, რეესტრის სტატუსი და KYC ველები მზად არის ოპერატორის სამუშაო პროცესისთვის.</p>
          </div>
          <div class="actions">
            <div class="langs" aria-label="Language">
              <button type="button" class="lang active" data-lang="ka">KA</button>
              <button type="button" class="lang" data-lang="en">EN</button>
              <button type="button" class="lang" data-lang="ru">RU</button>
              <button type="button" class="lang" data-lang="tr">TR</button>
            </div>
            <button type="button" data-registry="active" data-i18n="registryActive">რეესტრიდან აქტიური სტატუსი</button>
            <button type="button" class="primary" id="submitCheck" data-i18n="validateSave">შემოწმება და შენახვა</button>
          </div>
        </header>

        <nav class="panel workflow" aria-label="AML workflow from old specification">
          <div class="flow-step active"><strong>ფიზიკური პირი</strong><span>რეგისტრაცია და KYC</span></div>
          <div class="flow-step"><strong>იურიდიული პირი</strong><span>კომპანია, დირექტორი, მისამართები</span></div>
          <div class="flow-step"><strong>UBO</strong><span>ბენეფიციარები და მფლობელობა</span></div>
          <div class="flow-step"><strong>რისკი</strong><span>SDD / CDD / EDD</span></div>
          <div class="flow-step"><strong>სკრინინგი</strong><span>საწყისი და პერიოდული</span></div>
          <div class="flow-step"><strong>შეტყობინებები</strong><span>Alerts და whitelist</span></div>
          <div class="flow-step"><strong>STR</strong><span>საეჭვო ტრანზაქცია</span></div>
          <div class="flow-step"><strong>აუდიტი</strong><span>ჟურნალი და რეპორტები</span></div>
        </nav>

        <section class="grid">
          <form class="panel">
            <div id="formNotice" class="form-notice" hidden>გთხოვთ შეავსოთ მონიშნული სავალდებულო ველები.</div>
            <div class="section">
              <div class="section-title"><h2>ფიზიკური პირის მონაცემები</h2><span>OLD AML baseline</span></div>
              <label><span><span data-i18n="firstName">სახელი</span><span class="required"> *</span></span><input id="firstName" /></label>
              <label><span><span data-i18n="lastName">გვარი</span><span class="required"> *</span></span><input id="lastName" /></label>
              <label><span><span data-i18n="personalId">პირადი ნომერი</span><span class="required"> *</span></span><input id="personalId" inputmode="numeric" maxlength="11" /><small data-i18n="personalIdHelp">საქართველოს მოქალაქისთვის ზუსტად 11 ციფრი</small></label>
              <label><span><span data-i18n="birthDate">დაბადების თარიღი</span><span class="required"> *</span></span><input id="birthDate" type="date" /></label>
              <label><span>სქესი<span class="required"> *</span></span><select id="gender"><option value="">აირჩიეთ</option><option>მამრობითი</option><option>მდედრობითი</option></select></label>
              <label><span><span data-i18n="citizenship">მოქალაქეობა</span><span class="required"> *</span></span><select id="citizenship">${countryOptions}</select></label>
              <label><span data-i18n="secondCitizenship">მეორე მოქალაქეობა</span><select id="secondCitizenship">${secondCountryOptions}</select></label>
              <label><span><span data-i18n="legalAddress">იურიდიული მისამართი</span><span class="required"> *</span></span><input id="legalAddress" /></label>
              <label><span><span data-i18n="actualAddress">ფაქტიური მისამართი</span><span class="required"> *</span></span><input id="actualAddress" /></label>
              <label><span>საკონტაქტო ტელეფონი<span class="required"> *</span></span><input id="phone" placeholder="+995..." /></label>
              <label><span>ელ. ფოსტა<span class="required"> *</span></span><input id="email" type="email" /></label>
              <label><span>საგადასახადო რეზიდენტობა</span><select id="taxResidence">${secondCountryOptions}</select></label>
              <label><span>საგადასახადო ნომერი (TIN)</span><input id="tin" /></label>
              <label class="wide"><span>პასპორტის/პირადობის ასლი</span><input id="idScan" type="file" /></label>
            </div>
            <div class="section">
              <div class="section-title"><h2>დოკუმენტი და სამოქალაქო რეესტრი</h2><span>სტატუსი read-only</span></div>
              <label><span><span data-i18n="documentType">დოკუმენტის ტიპი</span><span class="required"> *</span></span><select id="documentType"></select></label>
              <label><span data-i18n="documentNumber">დოკუმენტის ნომერი</span><input id="documentNumber" /></label>
              <label><span data-i18n="documentStatus">დოკუმენტის სტატუსი</span><div id="documentStatusBox" class="status-box"><span id="documentStatusText">არ არის გადამოწმებული</span><span>🔒</span></div><small data-i18n="readOnly">ხელით არ რედაქტირდება</small></label>
              <div class="registry-actions">
                <button type="button" data-registry="active" data-i18n="civilActive">სამოქალაქო რეესტრი: აქტიური</button>
                <button type="button" data-registry="inactive" data-i18n="civilInactive">სამოქალაქო რეესტრი: არააქტიური</button>
                <button type="button" data-registry="timeout" data-i18n="timeout">Timeout</button>
              </div>
            </div>
            <div class="section">
              <div class="section-title"><h2>KYC და რისკის საწყისი ფაქტორები</h2><span>დასაქმებულზე ველები აქტიურდება</span></div>
              <label><span><span data-i18n="activityStatus">საქმიანობის სტატუსი</span><span class="required"> *</span></span><select id="activityStatus"></select></label>
              <label><span><span data-i18n="employerName">დამსაქმებელი ორგანიზაცია</span><span class="required employed-only"> *</span></span><input id="employerName" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="position">თანამდებობა</span><span class="required employed-only"> *</span></span><input id="position" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="employerBusinessField">დამსაქმებლის საქმიანობის სფერო</span><span class="required employed-only"> *</span></span><input id="employerBusinessField" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="incomeSource">შემოსავლის წყარო</span><span class="required"> *</span></span><select id="incomeSource"></select></label>
              <label><span><span data-i18n="expectedPremium">მოსალოდნელი წლიური პრემია</span><span class="required"> *</span></span><select id="expectedPremium"><option value=""></option><option>&lt; 50,000 GEL</option><option>50,000 - 200,000 GEL</option><option>200,000 - 1,000,000 GEL</option><option>&gt; 1,000,000 GEL</option></select></label>
              <label><span>პროდუქტის ტიპი<span class="required"> *</span></span><select id="productType"><option value="">აირჩიეთ</option><option value="auto-tpl">ავტო TPL</option><option value="health">ჯანმრთელობა</option><option value="property">ქონება</option><option value="car-ear">CAR/EAR</option><option value="cargo">ტვირთი</option><option value="life-investment">სიცოცხლე / საინვესტიციო</option></select></label>
              <label><span>საქმიანობის სფერო<span class="required"> *</span></span><select id="businessSector"><option value="">აირჩიეთ</option><option value="low-risk">დაბალი რისკის სფერო</option><option value="ordinary">ჩვეულებრივი ბიზნესი</option><option value="cash-intensive">ნაღდზე ინტენსიური</option><option value="crypto">კრიპტო</option><option value="gambling">აზარტული თამაშები</option><option value="weapons">იარაღი</option><option value="precious-metals">ძვირფასი მეტალები</option></select></label>
              <label><span>წლიური შემოსავალი</span><select id="annualIncome"><option value="">აირჩიეთ</option><option>&lt; 50,000 GEL</option><option>50,000 - 100,000 GEL</option><option>100,000 - 500,000 GEL</option><option>&gt; 500,000 GEL</option></select></label>
              <label><span>PEP/RCA სტატუსი<span class="required"> *</span></span><select id="pepStatus"><option value="No">არა</option><option value="Local PEP">ადგილობრივი PEP</option><option value="Foreign PEP">უცხო ქვეყნის PEP</option><option value="International PEP">საერთაშორისო ორგანიზაციის PEP</option><option value="RCA">RCA</option></select></label>
              <label class="wide"><span>PEP დეტალები</span><input id="pepDetails" /></label>
              <label class="full"><span>KYC დოკუმენტები</span><input id="supportingDocs" type="file" multiple /></label>
            </div>
          </form>

          <aside class="panel">
            <section>
              <h2>რისკის სქორინგი</h2>
              <div id="riskBox"></div>
            </section>
            <section>
              <h2>სანქციების სკრინინგი</h2>
              <p id="sanctionsStatus" style="margin:0;color:var(--muted);font-weight:800;font-size:13px">UN სია ჯერ არ არის ჩატვირთული.</p>
              <div class="screening-actions">
                <button type="button" id="syncSanctions">UN სიის განახლება</button>
                <button type="button" class="primary" id="screenClient">კლიენტის შემოწმება</button>
              </div>
              <div id="screeningResults" class="screening-result">
                <span class="badge">მზად არის შემოწმებისთვის</span>
                <p>შემოწმება ადარებს სახელს, alias-ებს, დაბადების თარიღს, მოქალაქეობას, დოკუმენტს და მისამართს UN Security Council Consolidated List-თან.</p>
              </div>
            </section>
            <section>
              <h2 data-i18n="implementation">მოთხოვნების სტატუსი</h2>
              <ul>
                <li id="countryCount">Excel ფაილიდან დამატებულია ${countries.length} ქვეყანა.</li>
                <li data-i18n="legalDone">იურიდიული მისამართი დამატებულია.</li>
                <li data-i18n="statusDone">დოკუმენტის სტატუსი locked/read-only რეჟიმშია.</li>
                <li data-i18n="kycDone">დასაქმებულზე დამსაქმებელი, თანამდებობა და სფერო სავალდებულოა.</li>
                <li>ძველი AML დოკუმენტაციიდან დაბრუნებულია KYC, PEP/RCA და რისკის სქორინგის ძირითადი ველები.</li>
                <li>დამატებულია UN სანქციების ავტომატური განახლება და კლიენტის blacklist screening.</li>
              </ul>
            </section>
          </aside>
        </section>

        <section class="panel" style="padding:24px">
          <div class="section-title" style="margin-bottom:16px">
            <h2>OLD AML სისტემის სრული ჩარჩო</h2>
            <span>არ არის წაშლილი - ახალი მოთხოვნები ემატება ამ ბაზას</span>
          </div>
          <div class="module-grid">
            <article class="panel module-card"><h3>იურიდიული პირი</h3><p>ორგანიზაციის სახელი, საიდენტიფიკაციო ნომერი, იურიდიული და ფაქტიური მისამართი, დირექტორი, რეგისტრაციის ქვეყანა და თარიღი.</p></article>
            <article class="panel module-card"><h3>UBO</h3><p>ბენეფიციარი მესაკუთრეები, წილი, კონტროლის ტიპი, ოფშორი/მრავალდონიანი სტრუქტურის რისკი.</p></article>
            <article class="panel module-card"><h3>რისკის სქორინგი</h3><p>მოქალაქეობა, მეორე მოქალაქეობა, PEP/RCA, პროდუქტი, პრემია, შემოსავალი და საქმიანობის სფერო ითვლის SDD/CDD/EDD-ს.</p></article>
            <article class="panel module-card"><h3>სკრინინგი</h3><p>საწყისი და პერიოდული შემოწმება სანქციებზე, PEP სიებზე, უარყოფით მედიაზე და whitelist გამონაკლისებზე.</p></article>
            <article class="panel module-card"><h3>Alerts</h3><p>გადამოწმების შედეგები გადადის AML ოფიცერთან დამუშავების სტატუსებით და კომენტარებით.</p></article>
            <article class="panel module-card"><h3>STR</h3><p>საეჭვო ტრანზაქციის შიდა ესკალაცია, გადაწყვეტილება, ფაილები და რეგულატორული მომზადება.</p></article>
            <article class="panel module-card"><h3>რეპორტები</h3><p>კლიენტების რისკი, გახსნილი alerts, ვადაგადაცილებული periodic review და სტატისტიკა.</p></article>
            <article class="panel module-card"><h3>Audit log</h3><p>ყველა ცვლილების ავტორი, დრო, ძველი/ახალი მნიშვნელობა და გადაწყვეტილების კვალი.</p></article>
          </div>
        </section>
      </div>
    </main>
    <script>
      const countriesCount = ${countries.length};
      const state = { lang: "ka", documentStatus: "not_checked", submitted: false };
      const copy = {
        ka: { eyebrow:"AML მოდული · ფიზიკური პირის რეგისტრაცია", title:"კლიენტის რეგისტრაციის ფორმა", subtitle:"მოქალაქეობა, იურიდიული მისამართი, რეესტრის სტატუსი და KYC ველები მზად არის ოპერატორის სამუშაო პროცესისთვის.", registryActive:"რეესტრიდან აქტიური სტატუსი", validateSave:"შემოწმება და შენახვა", firstName:"სახელი", lastName:"გვარი", personalId:"პირადი ნომერი", personalIdHelp:"საქართველოს მოქალაქისთვის ზუსტად 11 ციფრი", birthDate:"დაბადების თარიღი", citizenship:"მოქალაქეობა", secondCitizenship:"მეორე მოქალაქეობა", legalAddress:"იურიდიული მისამართი", actualAddress:"ფაქტიური მისამართი", documentType:"დოკუმენტის ტიპი", documentNumber:"დოკუმენტის ნომერი", documentStatus:"დოკუმენტის სტატუსი", readOnly:"ხელით არ რედაქტირდება", civilActive:"სამოქალაქო რეესტრი: აქტიური", civilInactive:"სამოქალაქო რეესტრი: არააქტიური", timeout:"Timeout", activityStatus:"საქმიანობის სტატუსი", employerName:"დამსაქმებელი ორგანიზაცია", position:"თანამდებობა", employerBusinessField:"დამსაქმებლის საქმიანობის სფერო", activatesOnEmployed:"აქტიურდება სტატუსზე: დასაქმებული", incomeSource:"შემოსავლის წყარო", expectedPremium:"მოსალოდნელი წლიური პრემია", implementation:"მოთხოვნების სტატუსი", legalDone:"იურიდიული მისამართი დამატებულია.", statusDone:"დოკუმენტის სტატუსი locked/read-only რეჟიმშია.", kycDone:"დასაქმებულზე დამსაქმებელი, თანამდებობა და სფერო სავალდებულოა.", todo:"შესავსებია", ready:"ფორმა მზად არის", liveValidation:"ცოცხალი ვალიდაცია", checkResult:"შემოწმების შედეგი", allDone:"ყველა სავალდებულო ველი შევსებულია.", countryCount:"Excel ფაილიდან დამატებულია " + countriesCount + " ქვეყანა.", choose:"აირჩიეთ", none:"არ აქვს", statuses:{not_checked:"არ არის გადამოწმებული", active:"აქტიური", inactive:"არ არის აქტიური", timeout:"რეესტრიდან პასუხი ვერ მივიღეთ"}, documentTypes:[["id_card","პირადობის მოწმობა"],["residence","ბინადრობის მოწმობა"],["temporary_residence","დროებითი ბინადრობის მოწმობა"],["passport","პასპორტი"]], activities:[["","აირჩიეთ"],["employed","დასაქმებული"],["business_owner","ბიზნესის მფლობელი"],["sole_proprietor","ინდ. მეწარმე"],["self_employed","თვითდასაქმებული"],["unemployed","უმუშევარი"],["student","სტუდენტი"],["retired","პენსიონერი"]], income:["","ხელფასი","დივიდენდი","იჯარა","პენსია","სხვა"], errors:["სახელი სავალდებულოა.","გვარი სავალდებულოა.","საქართველოს მოქალაქისთვის პირადი ნომერი უნდა იყოს ზუსტად 11 ციფრი.","იურიდიული მისამართი სავალდებულოა.","ფაქტიური მისამართი სავალდებულოა.","დოკუმენტის სტატუსი უნდა წამოვიდეს სამოქალაქო რეესტრიდან და იყოს აქტიური.","საქმიანობის სტატუსი სავალდებულოა.","დასაქმებულისთვის დამსაქმებელი ორგანიზაცია სავალდებულოა.","დასაქმებულისთვის თანამდებობა სავალდებულოა.","დასაქმებულისთვის საქმიანობის სფერო სავალდებულოა.","შემოსავლის წყარო სავალდებულოა.","მოსალოდნელი წლიური პრემია სავალდებულოა."] },
        en: { eyebrow:"AML module · Individual registration", title:"Client registration form", subtitle:"Citizenship, legal address, registry status, and KYC fields are ready for the employee workflow.", registryActive:"Mark active from registry", validateSave:"Validate and save", firstName:"First name", lastName:"Last name", personalId:"Personal ID", personalIdHelp:"Exactly 11 digits for Georgian citizens", birthDate:"Date of birth", citizenship:"Citizenship", secondCitizenship:"Second citizenship", legalAddress:"Legal address", actualAddress:"Actual address", documentType:"Document type", documentNumber:"Document number", documentStatus:"Document status", readOnly:"Not manually editable", civilActive:"Civil Registry: active", civilInactive:"Civil Registry: inactive", timeout:"Timeout", activityStatus:"Employment status", employerName:"Employer organization", position:"Position", employerBusinessField:"Employer business field", activatesOnEmployed:"Enabled when status is Employed", incomeSource:"Source of income", expectedPremium:"Expected annual premium", implementation:"Request status", legalDone:"Legal address field added.", statusDone:"Document status is locked/read-only.", kycDone:"Employer, position, and business field are required for Employed clients.", todo:"Needs input", ready:"Form is ready", liveValidation:"Live validation", checkResult:"Validation result", allDone:"All required fields are complete.", countryCount:countriesCount + " countries imported from Excel.", choose:"Choose", none:"None", statuses:{not_checked:"Not checked", active:"Active", inactive:"Inactive", timeout:"No registry response"}, documentTypes:[["id_card","ID card"],["residence","Residence card"],["temporary_residence","Temporary residence card"],["passport","Passport"]], activities:[["","Choose"],["employed","Employed"],["business_owner","Business owner"],["sole_proprietor","Sole proprietor"],["self_employed","Self-employed"],["unemployed","Unemployed"],["student","Student"],["retired","Retired"]], income:["","Salary","Dividend","Rent","Pension","Other"], errors:["First name is required.","Last name is required.","Personal ID must be exactly 11 digits for Georgian citizens.","Legal address is required.","Actual address is required.","Document status must come from the Civil Registry and be active.","Employment status is required.","Employer organization is required for Employed clients.","Position is required for Employed clients.","Employer business field is required for Employed clients.","Source of income is required.","Expected annual premium is required."] },
        ru: { eyebrow:"AML модуль · Регистрация физического лица", title:"Форма регистрации клиента", subtitle:"Гражданство, юридический адрес, статус из реестра и KYC-поля готовы для рабочего процесса сотрудника.", registryActive:"Активно из реестра", validateSave:"Проверить и сохранить", firstName:"Имя", lastName:"Фамилия", personalId:"Личный номер", personalIdHelp:"Для граждан Грузии ровно 11 цифр", birthDate:"Дата рождения", citizenship:"Гражданство", secondCitizenship:"Второе гражданство", legalAddress:"Юридический адрес", actualAddress:"Фактический адрес", documentType:"Тип документа", documentNumber:"Номер документа", documentStatus:"Статус документа", readOnly:"Не редактируется вручную", civilActive:"Гражданский реестр: активен", civilInactive:"Гражданский реестр: неактивен", timeout:"Timeout", activityStatus:"Статус занятости", employerName:"Организация-работодатель", position:"Должность", employerBusinessField:"Сфера деятельности работодателя", activatesOnEmployed:"Активируется при статусе: Работает", incomeSource:"Источник дохода", expectedPremium:"Ожидаемая годовая премия", implementation:"Статус требований", legalDone:"Добавлено поле юридического адреса.", statusDone:"Статус документа заблокирован/read-only.", kycDone:"Работодатель, должность и сфера обязательны для статуса Работает.", todo:"Нужно заполнить", ready:"Форма готова", liveValidation:"Живая валидация", checkResult:"Результат проверки", allDone:"Все обязательные поля заполнены.", countryCount:countriesCount + " стран импортировано из Excel.", choose:"Выберите", none:"Нет", statuses:{not_checked:"Не проверено", active:"Активен", inactive:"Неактивен", timeout:"Нет ответа реестра"}, documentTypes:[["id_card","ID-карта"],["residence","Вид на жительство"],["temporary_residence","Временный вид на жительство"],["passport","Паспорт"]], activities:[["","Выберите"],["employed","Работает"],["business_owner","Владелец бизнеса"],["sole_proprietor","ИП"],["self_employed","Самозанятый"],["unemployed","Безработный"],["student","Студент"],["retired","Пенсионер"]], income:["","Зарплата","Дивиденды","Аренда","Пенсия","Другое"], errors:["Имя обязательно.","Фамилия обязательна.","Для граждан Грузии личный номер должен состоять ровно из 11 цифр.","Юридический адрес обязателен.","Фактический адрес обязателен.","Статус документа должен прийти из Гражданского реестра и быть активным.","Статус занятости обязателен.","Работодатель обязателен для статуса Работает.","Должность обязательна для статуса Работает.","Сфера работодателя обязательна для статуса Работает.","Источник дохода обязателен.","Ожидаемая годовая премия обязательна."] },
        tr: { eyebrow:"AML modülü · Bireysel kayıt", title:"Müşteri kayıt formu", subtitle:"Vatandaşlık, yasal adres, sicil durumu ve KYC alanları çalışan akışı için hazır.", registryActive:"Sicilden aktif işaretle", validateSave:"Kontrol et ve kaydet", firstName:"Ad", lastName:"Soyad", personalId:"Kimlik numarası", personalIdHelp:"Gürcistan vatandaşları için tam 11 rakam", birthDate:"Doğum tarihi", citizenship:"Vatandaşlık", secondCitizenship:"İkinci vatandaşlık", legalAddress:"Yasal adres", actualAddress:"Fiili adres", documentType:"Belge türü", documentNumber:"Belge numarası", documentStatus:"Belge durumu", readOnly:"Elle düzenlenemez", civilActive:"Sivil Sicil: aktif", civilInactive:"Sivil Sicil: pasif", timeout:"Timeout", activityStatus:"Çalışma durumu", employerName:"İşveren kuruluş", position:"Pozisyon", employerBusinessField:"İşveren faaliyet alanı", activatesOnEmployed:"Çalışan durumunda etkinleşir", incomeSource:"Gelir kaynağı", expectedPremium:"Beklenen yıllık prim", implementation:"Talep durumu", legalDone:"Yasal adres alanı eklendi.", statusDone:"Belge durumu kilitli/read-only.", kycDone:"Çalışan müşteriler için işveren, pozisyon ve faaliyet alanı zorunlu.", todo:"Doldurulacak", ready:"Form hazır", liveValidation:"Canlı doğrulama", checkResult:"Kontrol sonucu", allDone:"Tüm zorunlu alanlar tamamlandı.", countryCount:countriesCount + " ülke Excel'den aktarıldı.", choose:"Seçin", none:"Yok", statuses:{not_checked:"Kontrol edilmedi", active:"Aktif", inactive:"Pasif", timeout:"Sicilden yanıt yok"}, documentTypes:[["id_card","Kimlik kartı"],["residence","Oturum kartı"],["temporary_residence","Geçici oturum kartı"],["passport","Pasaport"]], activities:[["","Seçin"],["employed","Çalışan"],["business_owner","İşletme sahibi"],["sole_proprietor","Şahıs girişimci"],["self_employed","Serbest çalışan"],["unemployed","İşsiz"],["student","Öğrenci"],["retired","Emekli"]], income:["","Maaş","Temettü","Kira","Emeklilik","Diğer"], errors:["Ad zorunludur.","Soyad zorunludur.","Gürcistan vatandaşları için kimlik numarası tam 11 rakam olmalıdır.","Yasal adres zorunludur.","Fiili adres zorunludur.","Belge durumu Sivil Sicil'den gelmeli ve aktif olmalıdır.","Çalışma durumu zorunludur.","Çalışan müşteriler için işveren zorunludur.","Çalışan müşteriler için pozisyon zorunludur.","Çalışan müşteriler için işveren faaliyet alanı zorunludur.","Gelir kaynağı zorunludur.","Beklenen yıllık prim zorunludur."] }
      };
      const highRiskCountries = ["რუსეთის ფედერაცია", "ირანი (ისლამური რესპუბლიკა)", "სირიის არაბთა რესპუბლიკა", "კორეის სახალხო დემოკრატიული რესპუბლიკა"];
      const ids = ["firstName","lastName","personalId","birthDate","gender","citizenship","legalAddress","actualAddress","phone","email","taxResidence","tin","activityStatus","employerName","position","employerBusinessField","incomeSource","expectedPremium","productType","businessSector","annualIncome","pepStatus","pepDetails"];
      const el = (id) => document.getElementById(id);
      function fillSelect(id, pairs) {
        const node = el(id), selected = node.value;
        node.innerHTML = pairs.map(([value, label]) => '<option value="' + value + '">' + label + '</option>').join("");
        if (pairs.some(([value]) => value === selected)) node.value = selected;
      }
      function fillOptions(id, values) {
        const node = el(id), selected = node.value;
        node.innerHTML = values.map((value, index) => '<option value="' + (index ? value : "") + '">' + (value || copy[state.lang].choose) + '</option>').join("");
        if (values.includes(selected)) node.value = selected;
      }
      function clearInlineValidation() {
        document.querySelectorAll(".field-error").forEach((node) => node.remove());
        document.querySelectorAll(".invalid-field").forEach((node) => node.classList.remove("invalid-field"));
      }
      function addFieldError(id, message) {
        const field = id === "documentStatusBox" ? el("documentStatusBox") : el(id);
        if (!field) return;
        field.classList.add("invalid-field");
        const label = field.closest("label") || field.parentElement;
        if (!label || label.querySelector(".field-error")) return;
        const help = document.createElement("small");
        help.className = "field-error";
        help.textContent = message;
        label.appendChild(help);
      }
      function showInlineValidation(fieldErrors) {
        clearInlineValidation();
        fieldErrors.forEach((item) => addFieldError(item.id, item.message));
        const notice = el("formNotice");
        if (fieldErrors.length && state.submitted) {
          notice.hidden = false;
          notice.style.borderLeftColor = "var(--bad)";
          notice.style.color = "var(--bad)";
          notice.style.background = "var(--danger-bg)";
          notice.textContent = "გთხოვთ შეავსოთ მონიშნული სავალდებულო ველები. გაგრძელება შეუძლებელია სანამ ფორმა სწორად არ შეივსება.";
        } else {
          notice.hidden = true;
        }
      }
      function validate() {
        const c = copy[state.lang], fieldErrors = [];
        const addError = (id, message) => fieldErrors.push({ id, message });
        if (!el("firstName").value.trim()) addError("firstName", c.errors[0]);
        if (!el("lastName").value.trim()) addError("lastName", c.errors[1]);
        if (el("citizenship").value === "საქართველო" && !/^\\d{11}$/.test(el("personalId").value)) addError("personalId", c.errors[2]);
        if (!el("birthDate").value) addError("birthDate", "დაბადების თარიღი სავალდებულოა.");
        if (el("birthDate").value) {
          const birth = new Date(el("birthDate").value + "T00:00:00");
          const now = new Date();
          let age = now.getFullYear() - birth.getFullYear();
          const month = now.getMonth() - birth.getMonth();
          if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
          if (age < 18) addError("birthDate", "ასაკი <18, რეგისტრაცია შეუძლებელია.");
        }
        if (!el("gender").value) addError("gender", "სქესი სავალდებულოა.");
        if (!el("legalAddress").value.trim()) addError("legalAddress", c.errors[3]);
        if (!el("actualAddress").value.trim()) addError("actualAddress", c.errors[4]);
        if (!/^\\+\\d{8,15}$/.test(el("phone").value.trim())) addError("phone", "ტელეფონი უნდა იყოს E.164 ფორმატში, მაგალითად +995555123456.");
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(el("email").value.trim())) addError("email", "ელ. ფოსტა არასწორია.");
        if (state.documentStatus !== "active") addError("documentStatusBox", c.errors[5]);
        if (!el("activityStatus").value) addError("activityStatus", c.errors[6]);
        if (el("activityStatus").value === "employed") {
          if (!el("employerName").value.trim()) addError("employerName", c.errors[7]);
          if (!el("position").value.trim()) addError("position", c.errors[8]);
          if (!el("employerBusinessField").value.trim()) addError("employerBusinessField", c.errors[9]);
        }
        if (!el("incomeSource").value) addError("incomeSource", c.errors[10]);
        if (!el("expectedPremium").value) addError("expectedPremium", c.errors[11]);
        if (!el("productType").value) addError("productType", "საქმიანი ურთიერთობის მიზანი / პროდუქტის ტიპი სავალდებულოა.");
        if (!el("businessSector").value) addError("businessSector", "საქმიანობის სფერო სავალდებულოა.");
        if (el("pepStatus").value !== "No" && !el("pepDetails").value.trim()) addError("pepDetails", "PEP/RCA სტატუსის შემთხვევაში დეტალები სავალდებულოა.");
        if (state.submitted) showInlineValidation(fieldErrors);
        renderRisk();
        return fieldErrors;
      }
      function scoreClient() {
        let score = 0;
        const reasons = [];
        const add = (points, reason) => { score += points; reasons.push({ points, reason }); };
        if (el("citizenship").value && el("citizenship").value !== "საქართველო") add(highRiskCountries.includes(el("citizenship").value) ? 40 : 10, "მოქალაქეობის იურისდიქცია");
        if (el("secondCitizenship").value) add(highRiskCountries.includes(el("secondCitizenship").value) ? 40 : 10, "მეორე მოქალაქეობა");
        if (["crypto", "gambling", "weapons", "precious-metals"].includes(el("businessSector").value)) add(30, "მაღალი რისკის საქმიანობის სფერო");
        if (el("businessSector").value === "cash-intensive") add(15, "ნაღდზე ინტენსიური საქმიანობა");
        if (el("productType").value === "life-investment") add(20, "საინვესტიციო კომპონენტის პროდუქტი");
        if (el("expectedPremium").value.includes("50,000 - 200,000")) add(5, "პრემია 50k-200k");
        if (el("expectedPremium").value.includes("200,000 - 1,000,000")) add(15, "პრემია 200k-1m");
        if (el("expectedPremium").value.includes("> 1,000,000")) add(25, "პრემია 1m-ზე მეტი");
        if (["დივიდენდი","იჯარა","სხვა","Dividend","Rent","Other","Дивиденды","Аренда","Другое","Temettü","Kira","Diğer"].includes(el("incomeSource").value)) add(5, "შემოსავლის წყარო საჭიროებს ყურადღებას");
        if (el("pepStatus").value !== "No") add(45, "PEP/RCA სტატუსი");
        const finalScore = Math.min(100, score);
        const level = finalScore >= 61 ? "მაღალი" : finalScore >= 26 ? "საშუალო" : "დაბალი";
        const due = finalScore >= 61 ? "EDD" : finalScore >= 26 ? "CDD" : "SDD";
        return { score: finalScore, level, due, reasons };
      }
      function renderRisk() {
        const risk = scoreClient();
        const color = risk.level === "მაღალი" ? "var(--bad)" : risk.level === "საშუალო" ? "#0f5e8a" : "var(--ok)";
        el("riskBox").innerHTML = '<div class="success" style="border-left-color:' + color + ';color:' + color + '">' + risk.level + ' · ' + risk.score + ' · ' + risk.due + '</div>' +
          (risk.reasons.length ? risk.reasons.map((r) => '<div class="error" style="background:#f8fbfa;color:var(--ink);border-left-color:#b7cdc6">+' + r.points + ' · ' + r.reason + '</div>').join("") : '<p style="color:var(--muted);font-weight:800">რისკ-ფაქტორი ჯერ არ დაფიქსირებულა.</p>');
      }
      function escapeUi(value) {
        return String(value || "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
      }
      function collectClientForScreening() {
        return {
          firstName: el("firstName").value,
          lastName: el("lastName").value,
          fullName: [el("firstName").value, el("lastName").value].filter(Boolean).join(" "),
          birthDate: el("birthDate").value,
          citizenship: el("citizenship").value,
          personalId: el("personalId").value,
          documentNumber: el("documentNumber").value,
          legalAddress: el("legalAddress").value,
          actualAddress: el("actualAddress").value,
        };
      }
      function renderSanctionsStatus(status) {
        const date = status.dateGenerated ? new Date(status.dateGenerated).toLocaleString() : "ჯერ არ არის";
        const fetched = status.fetchedAt ? new Date(status.fetchedAt).toLocaleString() : "ჯერ არ არის";
        el("sanctionsStatus").textContent = "UN სია: " + status.records + " ჩანაწერი (" + status.individuals + " ფიზიკური, " + status.entities + " იურიდიული). წყაროს თარიღი: " + date + ". ბოლო ჩამოტვირთვა: " + fetched + ".";
      }
      function renderScreening(result) {
        const statusLabel = result.status === "strong_match" ? "ძლიერი დამთხვევა" : result.status === "possible_match" ? "შესაძლო დამთხვევა" : "სუფთა";
        const badgeClass = result.status === "strong_match" ? "bad" : result.status === "possible_match" ? "warn" : "";
        const matches = result.matches.length ? result.matches.map((match) => (
          '<div class="screening-result">' +
          '<strong>' + escapeUi(match.record.fullName || match.matchedName) + ' · ' + match.score + '</strong>' +
          '<p>UN ref: ' + escapeUi(match.record.referenceNumber || match.record.id) + ' · ' + escapeUi(match.record.listType || "UN") + '</p>' +
          '<p>მიზეზი: ' + escapeUi(match.reasons.join(", ")) + '</p>' +
          (match.record.aliases.length ? '<p>Aliases: ' + escapeUi(match.record.aliases.join(", ")) + '</p>' : '') +
          '</div>'
        )).join("") : '<p>UN სიაში მნიშვნელოვანი დამთხვევა არ მოიძებნა.</p>';
        el("screeningResults").innerHTML = '<span class="badge ' + badgeClass + '">' + statusLabel + ' · ' + result.score + '</span>' +
          '<p>შემოწმდა ' + result.recordsChecked + ' UN ჩანაწერი. წყარო: ' + escapeUi(result.sourceName) + '.</p>' + matches;
      }
      async function loadSanctionsStatus() {
        try {
          const response = await fetch("/api/sanctions/status");
          renderSanctionsStatus(await response.json());
        } catch {
          el("sanctionsStatus").textContent = "UN სიის სტატუსი ვერ ჩაიტვირთა.";
        }
      }
      async function syncSanctions() {
        el("sanctionsStatus").textContent = "UN სია იტვირთება...";
        const response = await fetch("/api/sanctions/sync", { method: "POST" });
        const data = await response.json();
        renderSanctionsStatus(data);
        if (!data.ok) throw new Error(data.error || "UN sync failed");
      }
      async function screenClient() {
        el("screeningResults").innerHTML = '<span class="badge">მოწმდება...</span><p>UN blacklist screening მიმდინარეობს.</p>';
        const response = await fetch("/api/screening/client", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(collectClientForScreening()),
        });
        const data = await response.json();
        if (!data.ok) throw new Error(data.error || "Screening failed");
        renderScreening(data.result);
        loadSanctionsStatus();
      }
      function renderLang() {
        const c = copy[state.lang];
        document.documentElement.lang = state.lang;
        document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = c[node.dataset.i18n] || node.textContent; });
        document.querySelectorAll(".lang").forEach((button) => button.classList.toggle("active", button.dataset.lang === state.lang));
        fillSelect("documentType", c.documentTypes);
        fillSelect("activityStatus", c.activities);
        fillOptions("incomeSource", c.income);
        el("documentStatusText").textContent = c.statuses[state.documentStatus];
        el("countryCount").textContent = c.countryCount;
        validate();
      }
      function updateKyc() {
        const enabled = el("activityStatus").value === "employed";
        ["employerName","position","employerBusinessField"].forEach((id) => { el(id).disabled = !enabled; if (!enabled) el(id).value = ""; });
        document.querySelectorAll(".employed-only").forEach((item) => item.style.display = enabled ? "" : "none");
        validate();
      }
      document.addEventListener("click", (event) => {
        const lang = event.target.closest("[data-lang]");
        if (lang) { state.lang = lang.dataset.lang; renderLang(); return; }
        const registry = event.target.closest("[data-registry]");
        if (registry) { state.documentStatus = registry.dataset.registry; if (!el("documentNumber").value) el("documentNumber").value = "AA1234567"; renderLang(); return; }
        if (event.target.id === "syncSanctions") { syncSanctions().catch((error) => { el("screeningResults").innerHTML = '<span class="badge bad">შეცდომა</span><p>' + escapeUi(error.message) + '</p>'; }); return; }
        if (event.target.id === "screenClient") { screenClient().catch((error) => { el("screeningResults").innerHTML = '<span class="badge bad">შეცდომა</span><p>' + escapeUi(error.message) + '</p>'; }); return; }
        if (event.target.id === "submitCheck") {
          state.submitted = true;
          const fieldErrors = validate();
          if (fieldErrors.length) {
            const first = fieldErrors[0].id === "documentStatusBox" ? el("documentStatusBox") : el(fieldErrors[0].id);
            first?.scrollIntoView({ behavior: "smooth", block: "center" });
            if (first && "focus" in first) first.focus({ preventScroll: true });
            return;
          }
          el("formNotice").hidden = false;
          el("formNotice").style.borderLeftColor = "var(--ok)";
          el("formNotice").style.color = "var(--ok)";
          el("formNotice").style.background = "#ecfdf3";
          el("formNotice").textContent = "ფორმა სწორად არის შევსებული. შესაძლებელია შემდეგ ეტაპზე გადასვლა.";
        }
      });
      document.addEventListener("input", validate);
      document.addEventListener("change", validate);
      el("activityStatus").addEventListener("change", updateKyc);
      el("personalId").addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\\D/g, ""); });
      renderLang();
      updateKyc();
      loadSanctionsStatus();
    </script>
  </body>
</html>`;
}

async function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true, service: "acton-aml-workbench", time: new Date().toISOString() });
    return;
  }
  if (url.pathname === "/api/version") {
    sendJson(res, 200, { name: "acton-aml-workbench", version: "0.3.0", mode: "stable-static", screening: true });
    return;
  }
  if (url.pathname === "/api/sanctions/status") {
    sendJson(res, 200, publicSanctionsStatus());
    return;
  }
  if (url.pathname === "/api/sanctions/sync") {
    try {
      const force = req.method === "POST" || url.searchParams.get("force") === "1";
      const cache = await syncSanctionsList(force);
      sendJson(res, 200, { ok: true, ...publicSanctionsStatus(), cached: cache.records.length > 0 && !force });
    } catch (error) {
      sendJson(res, 502, { ok: false, error: error.message, ...publicSanctionsStatus() });
    }
    return;
  }
  if (url.pathname === "/api/screening/client") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "POST required" });
      return;
    }
    try {
      const client = await readRequestJson(req);
      await syncSanctionsList(false);
      sendJson(res, 200, { ok: true, result: screenClientAgainstSanctions(client) });
    } catch (error) {
      sendJson(res, 400, { ok: false, error: error.message });
    }
    return;
  }
  if (url.pathname === "/aml" || url.pathname === "/aml/") {
    send(res, 200, renderAmlPage());
    return;
  }

  const pathname = decodeURIComponent(url.pathname);
  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath === "/" ? "index.html" : safePath);

  if (!filePath.startsWith(root)) {
    send(res, 403, JSON.stringify({ error: "Forbidden" }), "application/json; charset=utf-8");
    return;
  }

  fs.readFile(filePath, (error, file) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, fallback) => {
        if (fallbackError) send(res, 404, "Not found", "text/plain; charset=utf-8");
        else send(res, 200, fallback, "text/html; charset=utf-8");
      });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, file, contentTypes[ext] || "application/octet-stream");
  });
}

http.createServer(serveFile).listen(port, "0.0.0.0", () => {
  console.log(`Acton AML Workbench listening on port ${port}`);
});
