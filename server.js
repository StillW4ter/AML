const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT || 5173);

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
  const countryOptions = countries.map((country) => `<option value="${escapeHtml(country)}">${escapeHtml(country)}</option>`).join("");
  const secondCountryOptions = `<option value="">არ აქვს</option>${countryOptions}`;

  return `<!doctype html>
<html lang="ka">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AML - კლიენტის რეგისტრაცია</title>
    <style>
      :root { color-scheme: light; --ink:#17211f; --muted:#61706b; --line:#dce7e3; --soft:#edf5f2; --brand:#ff3f17; --ok:#047857; --bad:#b42318; --danger-bg:#fdebea; --field:#fdfefe; --disabled:#edf2f0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: radial-gradient(circle at 10% 0%, #f7fbf9 0, var(--soft) 420px); color: var(--ink); }
      main { min-height: 100vh; padding: 34px 40px; }
      .wrap { max-width: 1880px; margin: 0 auto; display: grid; gap: 26px; }
      .panel { background: rgba(255,255,255,.96); border: 1px solid rgba(189, 209, 202, .85); border-radius: 22px; box-shadow: 0 22px 55px rgba(43, 65, 58, .10); }
      header.panel { padding: 32px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 28px; align-items: center; }
      .eyebrow { margin: 0 0 10px; color: var(--brand); font-weight: 950; font-size: 17px; letter-spacing: .01em; }
      h1 { margin: 0; font-size: clamp(40px, 4.4vw, 66px); line-height: .98; letter-spacing: 0; font-weight: 950; }
      .sub { margin: 10px 0 0; color: var(--muted); font-weight: 850; max-width: 980px; font-size: clamp(18px, 1.6vw, 24px); line-height: 1.22; }
      .actions { display: grid; grid-template-columns: auto auto; gap: 10px; align-items: start; justify-content: end; }
      .langs, .registry-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
      button { border: 0; border-radius: 12px; padding: 14px 18px; min-height: 54px; font-weight: 950; cursor: pointer; background: #f1f6f4; color: var(--ink); font-size: 16px; transition: transform .12s ease, background .12s ease, box-shadow .12s ease; }
      button:hover { transform: translateY(-1px); box-shadow: 0 10px 18px rgba(22,33,31,.08); }
      button.primary { background: var(--brand); color: white; }
      button.active { background: var(--ink); color: white; }
      .langs button { width: 66px; padding-inline: 0; }
      .actions > button[data-registry] { grid-column: 2; min-width: 300px; }
      .actions > .primary { grid-column: 1 / -1; justify-self: start; min-width: 250px; }
      .grid { display: grid; gap: 26px; grid-template-columns: minmax(0, 1fr) 496px; align-items: start; }
      form.panel, aside.panel { padding: 28px; }
      .section { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 22px; padding-bottom: 26px; border-bottom: 1px solid var(--line); margin-bottom: 26px; }
      .section:last-child { border-bottom: 0; margin-bottom: 0; padding-bottom: 0; }
      label { display: grid; gap: 10px; font-weight: 950; font-size: 17px; line-height: 1.1; }
      input, select { width: 100%; height: 62px; border: 1.5px solid var(--line); border-radius: 13px; padding: 0 18px; font: inherit; font-weight: 850; background: var(--field); color: var(--ink); min-width: 0; outline: none; }
      input:focus, select:focus { border-color: #a9c6bc; box-shadow: 0 0 0 4px rgba(169,198,188,.22); }
      input:disabled { background: var(--disabled); color: #8a9693; }
      small { color: var(--muted); font-weight: 850; font-size: 13px; }
      .required { color: var(--brand); }
      .status-box { min-height: 62px; border: 1.5px solid var(--line); border-radius: 13px; padding: 0 18px; background: #f7faf8; display: flex; align-items: center; justify-content: space-between; font-weight: 950; }
      .registry-actions { grid-column: 1 / -1; }
      aside { display: grid; align-content: start; gap: 16px; }
      aside section { padding-bottom: 22px; border-bottom: 1px solid var(--line); }
      aside section:last-child { border-bottom: 0; padding-bottom: 0; }
      h2 { margin: 0 0 18px; font-size: 29px; line-height: 1.05; font-weight: 950; }
      #validationMode { margin: 0 0 14px; color: var(--ink); font-weight: 850; font-size: 17px; }
      .error { background: var(--danger-bg); color: var(--bad); padding: 18px; border-radius: 12px; font-weight: 950; margin-top: 12px; font-size: 18px; line-height: 1.18; }
      .success { background: #ecfdf3; color: var(--ok); padding: 18px; border-radius: 12px; font-weight: 950; font-size: 18px; }
      ul { margin: 0; padding-left: 24px; }
      li { margin: 13px 0; color: var(--muted); font-weight: 900; font-size: 18px; line-height: 1.18; }
      @media (max-width: 1180px) { header.panel, .grid { grid-template-columns: 1fr; } .actions { justify-content: start; grid-template-columns: 1fr; } .actions > button[data-registry], .actions > .primary { grid-column: auto; justify-self: stretch; } .section { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 700px) { main { padding: 14px; } header.panel, form.panel, aside.panel { padding: 18px; border-radius: 18px; } h1 { font-size: 36px; } .sub { font-size: 17px; } .section { grid-template-columns: 1fr; } .langs button { width: 58px; } button { width: 100%; } }
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

        <section class="grid">
          <form class="panel">
            <div class="section">
              <label><span><span data-i18n="firstName">სახელი</span><span class="required"> *</span></span><input id="firstName" /></label>
              <label><span><span data-i18n="lastName">გვარი</span><span class="required"> *</span></span><input id="lastName" /></label>
              <label><span><span data-i18n="personalId">პირადი ნომერი</span><span class="required"> *</span></span><input id="personalId" inputmode="numeric" maxlength="11" /><small data-i18n="personalIdHelp">საქართველოს მოქალაქისთვის ზუსტად 11 ციფრი</small></label>
              <label><span><span data-i18n="birthDate">დაბადების თარიღი</span><span class="required"> *</span></span><input id="birthDate" type="date" /></label>
              <label><span><span data-i18n="citizenship">მოქალაქეობა</span><span class="required"> *</span></span><select id="citizenship">${countryOptions}</select></label>
              <label><span data-i18n="secondCitizenship">მეორე მოქალაქეობა</span><select id="secondCitizenship">${secondCountryOptions}</select></label>
              <label><span><span data-i18n="legalAddress">იურიდიული მისამართი</span><span class="required"> *</span></span><input id="legalAddress" /></label>
              <label><span><span data-i18n="actualAddress">ფაქტიური მისამართი</span><span class="required"> *</span></span><input id="actualAddress" /></label>
            </div>
            <div class="section">
              <label><span><span data-i18n="documentType">დოკუმენტის ტიპი</span><span class="required"> *</span></span><select id="documentType"></select></label>
              <label><span data-i18n="documentNumber">დოკუმენტის ნომერი</span><input id="documentNumber" /></label>
              <label><span data-i18n="documentStatus">დოკუმენტის სტატუსი</span><div class="status-box"><span id="documentStatusText">არ არის გადამოწმებული</span><span>🔒</span></div><small data-i18n="readOnly">ხელით არ რედაქტირდება</small></label>
              <div class="registry-actions">
                <button type="button" data-registry="active" data-i18n="civilActive">სამოქალაქო რეესტრი: აქტიური</button>
                <button type="button" data-registry="inactive" data-i18n="civilInactive">სამოქალაქო რეესტრი: არააქტიური</button>
                <button type="button" data-registry="timeout" data-i18n="timeout">Timeout</button>
              </div>
            </div>
            <div class="section">
              <label><span><span data-i18n="activityStatus">საქმიანობის სტატუსი</span><span class="required"> *</span></span><select id="activityStatus"></select></label>
              <label><span><span data-i18n="employerName">დამსაქმებელი ორგანიზაცია</span><span class="required employed-only"> *</span></span><input id="employerName" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="position">თანამდებობა</span><span class="required employed-only"> *</span></span><input id="position" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="employerBusinessField">დამსაქმებლის საქმიანობის სფერო</span><span class="required employed-only"> *</span></span><input id="employerBusinessField" disabled /><small data-i18n="activatesOnEmployed">აქტიურდება სტატუსზე: დასაქმებული</small></label>
              <label><span><span data-i18n="incomeSource">შემოსავლის წყარო</span><span class="required"> *</span></span><select id="incomeSource"></select></label>
              <label><span><span data-i18n="expectedPremium">მოსალოდნელი წლიური პრემია</span><span class="required"> *</span></span><select id="expectedPremium"><option value=""></option><option>&lt; 50,000 GEL</option><option>50,000 - 200,000 GEL</option><option>200,000 - 1,000,000 GEL</option><option>&gt; 1,000,000 GEL</option></select></label>
            </div>
          </form>

          <aside class="panel">
            <section>
              <h2 id="validationTitle">შესავსებია</h2>
              <p id="validationMode">ცოცხალი ვალიდაცია</p>
              <div id="errors"></div>
            </section>
            <section>
              <h2 data-i18n="implementation">მოთხოვნების სტატუსი</h2>
              <ul>
                <li id="countryCount">Excel ფაილიდან დამატებულია ${countries.length} ქვეყანა.</li>
                <li data-i18n="legalDone">იურიდიული მისამართი დამატებულია.</li>
                <li data-i18n="statusDone">დოკუმენტის სტატუსი locked/read-only რეჟიმშია.</li>
                <li data-i18n="kycDone">დასაქმებულზე დამსაქმებელი, თანამდებობა და სფერო სავალდებულოა.</li>
              </ul>
            </section>
          </aside>
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
      const ids = ["firstName","lastName","personalId","birthDate","citizenship","legalAddress","actualAddress","activityStatus","employerName","position","employerBusinessField","incomeSource","expectedPremium"];
      const el = (id) => document.getElementById(id);
      function fillSelect(id, pairs) { el(id).innerHTML = pairs.map(([value, label]) => '<option value="' + value + '">' + label + '</option>').join(""); }
      function fillOptions(id, values) { el(id).innerHTML = values.map((value, index) => '<option value="' + (index ? value : "") + '">' + (value || copy[state.lang].choose) + '</option>').join(""); }
      function validate() {
        const c = copy[state.lang], errors = [];
        if (!el("firstName").value.trim()) errors.push(c.errors[0]);
        if (!el("lastName").value.trim()) errors.push(c.errors[1]);
        if (el("citizenship").value === "საქართველო" && !/^\\d{11}$/.test(el("personalId").value)) errors.push(c.errors[2]);
        if (!el("legalAddress").value.trim()) errors.push(c.errors[3]);
        if (!el("actualAddress").value.trim()) errors.push(c.errors[4]);
        if (state.documentStatus !== "active") errors.push(c.errors[5]);
        if (!el("activityStatus").value) errors.push(c.errors[6]);
        if (el("activityStatus").value === "employed") {
          if (!el("employerName").value.trim()) errors.push(c.errors[7]);
          if (!el("position").value.trim()) errors.push(c.errors[8]);
          if (!el("employerBusinessField").value.trim()) errors.push(c.errors[9]);
        }
        if (!el("incomeSource").value) errors.push(c.errors[10]);
        if (!el("expectedPremium").value) errors.push(c.errors[11]);
        el("validationTitle").textContent = errors.length ? c.todo : c.ready;
        el("validationMode").textContent = state.submitted ? c.checkResult : c.liveValidation;
        el("errors").innerHTML = errors.length ? errors.map((error) => '<div class="error">' + error + '</div>').join("") : '<div class="success">' + c.allDone + '</div>';
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
        if (event.target.id === "submitCheck") { state.submitted = true; validate(); }
      });
      document.addEventListener("input", validate);
      el("activityStatus").addEventListener("change", updateKyc);
      el("personalId").addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\\D/g, ""); });
      renderLang();
      updateKyc();
    </script>
  </body>
</html>`;
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname === "/api/health") {
    send(res, 200, JSON.stringify({ ok: true, service: "acton-aml-workbench", time: new Date().toISOString() }), "application/json; charset=utf-8");
    return;
  }
  if (url.pathname === "/api/version") {
    send(res, 200, JSON.stringify({ name: "acton-aml-workbench", version: "0.2.0", mode: "stable-static" }), "application/json; charset=utf-8");
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
