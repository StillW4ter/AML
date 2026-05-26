"use client";

import { AML_COUNTRIES } from "@/lib/aml/countries";
import { CheckCircle2, Database, FileWarning, Languages, Lock, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

type Lang = "ka" | "en" | "ru" | "tr";
type RegistryState = "not_checked" | "active" | "inactive" | "timeout";
type ActivityStatus = "" | "employed" | "business_owner" | "sole_proprietor" | "self_employed" | "unemployed" | "student" | "retired";

type FormState = {
  firstName: string;
  lastName: string;
  personalId: string;
  birthDate: string;
  citizenship: string;
  secondCitizenship: string;
  legalAddress: string;
  actualAddress: string;
  documentType: string;
  documentNumber: string;
  documentStatus: RegistryState;
  activityStatus: ActivityStatus;
  employerName: string;
  position: string;
  employerBusinessField: string;
  incomeSource: string;
  expectedPremium: string;
};

const initialState: FormState = {
  firstName: "",
  lastName: "",
  personalId: "",
  birthDate: "",
  citizenship: "საქართველო",
  secondCitizenship: "",
  legalAddress: "",
  actualAddress: "",
  documentType: "id_card",
  documentNumber: "",
  documentStatus: "not_checked",
  activityStatus: "",
  employerName: "",
  position: "",
  employerBusinessField: "",
  incomeSource: "",
  expectedPremium: "",
};

const copy = {
  ka: {
    langLabel: "ენა",
    eyebrow: "AML მოდული · ფიზიკური პირის რეგისტრაცია",
    title: "კლიენტის რეგისტრაციის ფორმა",
    subtitle: "მოქალაქეობა, იურიდიული მისამართი, რეესტრის სტატუსი და KYC ველები მზად არის ოპერატორის სამუშაო პროცესისთვის.",
    registryActive: "რეესტრიდან აქტიური სტატუსი",
    validateSave: "შემოწმება და შენახვა",
    firstName: "სახელი",
    lastName: "გვარი",
    personalId: "პირადი ნომერი",
    personalIdHelp: "საქართველოს მოქალაქისთვის ზუსტად 11 ციფრი",
    birthDate: "დაბადების თარიღი",
    citizenship: "მოქალაქეობა",
    secondCitizenship: "მეორე მოქალაქეობა",
    none: "არ აქვს",
    legalAddress: "იურიდიული მისამართი",
    actualAddress: "ფაქტიური მისამართი",
    documentType: "დოკუმენტის ტიპი",
    documentNumber: "დოკუმენტის ნომერი",
    documentStatus: "დოკუმენტის სტატუსი",
    readOnly: "ხელით არ რედაქტირდება",
    civilActive: "სამოქალაქო რეესტრი: აქტიური",
    civilInactive: "სამოქალაქო რეესტრი: არააქტიური",
    timeout: "Timeout",
    activityStatus: "საქმიანობის სტატუსი",
    choose: "აირჩიეთ",
    employerName: "დამსაქმებელი ორგანიზაცია",
    position: "თანამდებობა",
    employerBusinessField: "დამსაქმებლის საქმიანობის სფერო",
    activatesOnEmployed: "აქტიურდება სტატუსზე: დასაქმებული",
    incomeSource: "შემოსავლის წყარო",
    expectedPremium: "მოსალოდნელი წლიური პრემია",
    todo: "შესავსებია",
    ready: "ფორმა მზად არის",
    checkResult: "შემოწმების შედეგი",
    liveValidation: "ცოცხალი ვალიდაცია",
    allRequiredDone: "ყველა სავალდებულო ველი შევსებულია.",
    implementation: "მოთხოვნების სტატუსი",
    countriesDone: `Excel ფაილიდან დამატებულია ${AML_COUNTRIES.length} ქვეყანა.`,
    legalDone: "იურიდიული მისამართი დამატებულია.",
    statusDone: "დოკუმენტის სტატუსი locked/read-only რეჟიმშია.",
    kycDone: "დასაქმებულზე დამსაქმებელი, თანამდებობა და სფერო სავალდებულოა.",
    firstNameError: "სახელი სავალდებულოა.",
    lastNameError: "გვარი სავალდებულოა.",
    personalIdError: "საქართველოს მოქალაქისთვის პირადი ნომერი უნდა იყოს ზუსტად 11 ციფრი.",
    underageError: "ასაკი <18, რეგისტრაცია შეუძლებელია.",
    legalAddressError: "იურიდიული მისამართი სავალდებულოა.",
    actualAddressError: "ფაქტიური მისამართი სავალდებულოა.",
    documentStatusError: "დოკუმენტის სტატუსი უნდა წამოვიდეს სამოქალაქო რეესტრიდან და იყოს აქტიური.",
    activityError: "საქმიანობის სტატუსი სავალდებულოა.",
    employerError: "დასაქმებულისთვის დამსაქმებელი ორგანიზაცია სავალდებულოა.",
    positionError: "დასაქმებულისთვის თანამდებობა სავალდებულოა.",
    employerFieldError: "დასაქმებულისთვის საქმიანობის სფერო სავალდებულოა.",
    incomeError: "შემოსავლის წყარო სავალდებულოა.",
    premiumError: "მოსალოდნელი წლიური პრემია სავალდებულოა.",
  },
  en: {
    langLabel: "Language",
    eyebrow: "AML module · Individual registration",
    title: "Client registration form",
    subtitle: "Citizenship, legal address, registry status, and KYC fields are ready for the employee workflow.",
    registryActive: "Mark active from registry",
    validateSave: "Validate and save",
    firstName: "First name",
    lastName: "Last name",
    personalId: "Personal ID",
    personalIdHelp: "Exactly 11 digits for Georgian citizens",
    birthDate: "Date of birth",
    citizenship: "Citizenship",
    secondCitizenship: "Second citizenship",
    none: "None",
    legalAddress: "Legal address",
    actualAddress: "Actual address",
    documentType: "Document type",
    documentNumber: "Document number",
    documentStatus: "Document status",
    readOnly: "Not manually editable",
    civilActive: "Civil Registry: active",
    civilInactive: "Civil Registry: inactive",
    timeout: "Timeout",
    activityStatus: "Employment status",
    choose: "Choose",
    employerName: "Employer organization",
    position: "Position",
    employerBusinessField: "Employer business field",
    activatesOnEmployed: "Enabled when status is Employed",
    incomeSource: "Source of income",
    expectedPremium: "Expected annual premium",
    todo: "Needs input",
    ready: "Form is ready",
    checkResult: "Validation result",
    liveValidation: "Live validation",
    allRequiredDone: "All required fields are complete.",
    implementation: "Request status",
    countriesDone: `${AML_COUNTRIES.length} countries imported from Excel.`,
    legalDone: "Legal address field added.",
    statusDone: "Document status is locked/read-only.",
    kycDone: "Employer, position, and business field are required for Employed clients.",
    firstNameError: "First name is required.",
    lastNameError: "Last name is required.",
    personalIdError: "Personal ID must be exactly 11 digits for Georgian citizens.",
    underageError: "Age is under 18; registration is not allowed.",
    legalAddressError: "Legal address is required.",
    actualAddressError: "Actual address is required.",
    documentStatusError: "Document status must come from the Civil Registry and be active.",
    activityError: "Employment status is required.",
    employerError: "Employer organization is required for Employed clients.",
    positionError: "Position is required for Employed clients.",
    employerFieldError: "Employer business field is required for Employed clients.",
    incomeError: "Source of income is required.",
    premiumError: "Expected annual premium is required.",
  },
  ru: {
    langLabel: "Язык",
    eyebrow: "AML модуль · Регистрация физического лица",
    title: "Форма регистрации клиента",
    subtitle: "Гражданство, юридический адрес, статус из реестра и KYC-поля готовы для рабочего процесса сотрудника.",
    registryActive: "Активно из реестра",
    validateSave: "Проверить и сохранить",
    firstName: "Имя",
    lastName: "Фамилия",
    personalId: "Личный номер",
    personalIdHelp: "Для граждан Грузии ровно 11 цифр",
    birthDate: "Дата рождения",
    citizenship: "Гражданство",
    secondCitizenship: "Второе гражданство",
    none: "Нет",
    legalAddress: "Юридический адрес",
    actualAddress: "Фактический адрес",
    documentType: "Тип документа",
    documentNumber: "Номер документа",
    documentStatus: "Статус документа",
    readOnly: "Не редактируется вручную",
    civilActive: "Гражданский реестр: активен",
    civilInactive: "Гражданский реестр: неактивен",
    timeout: "Timeout",
    activityStatus: "Статус занятости",
    choose: "Выберите",
    employerName: "Организация-работодатель",
    position: "Должность",
    employerBusinessField: "Сфера деятельности работодателя",
    activatesOnEmployed: "Активируется при статусе: Работает",
    incomeSource: "Источник дохода",
    expectedPremium: "Ожидаемая годовая премия",
    todo: "Нужно заполнить",
    ready: "Форма готова",
    checkResult: "Результат проверки",
    liveValidation: "Живая валидация",
    allRequiredDone: "Все обязательные поля заполнены.",
    implementation: "Статус требований",
    countriesDone: `${AML_COUNTRIES.length} стран импортировано из Excel.`,
    legalDone: "Добавлено поле юридического адреса.",
    statusDone: "Статус документа заблокирован/read-only.",
    kycDone: "Работодатель, должность и сфера обязательны для статуса Работает.",
    firstNameError: "Имя обязательно.",
    lastNameError: "Фамилия обязательна.",
    personalIdError: "Для граждан Грузии личный номер должен состоять ровно из 11 цифр.",
    underageError: "Возраст меньше 18; регистрация невозможна.",
    legalAddressError: "Юридический адрес обязателен.",
    actualAddressError: "Фактический адрес обязателен.",
    documentStatusError: "Статус документа должен прийти из Гражданского реестра и быть активным.",
    activityError: "Статус занятости обязателен.",
    employerError: "Работодатель обязателен для статуса Работает.",
    positionError: "Должность обязательна для статуса Работает.",
    employerFieldError: "Сфера работодателя обязательна для статуса Работает.",
    incomeError: "Источник дохода обязателен.",
    premiumError: "Ожидаемая годовая премия обязательна.",
  },
  tr: {
    langLabel: "Dil",
    eyebrow: "AML modülü · Bireysel kayıt",
    title: "Müşteri kayıt formu",
    subtitle: "Vatandaşlık, yasal adres, sicil durumu ve KYC alanları çalışan akışı için hazır.",
    registryActive: "Sicilden aktif işaretle",
    validateSave: "Kontrol et ve kaydet",
    firstName: "Ad",
    lastName: "Soyad",
    personalId: "Kimlik numarası",
    personalIdHelp: "Gürcistan vatandaşları için tam 11 rakam",
    birthDate: "Doğum tarihi",
    citizenship: "Vatandaşlık",
    secondCitizenship: "İkinci vatandaşlık",
    none: "Yok",
    legalAddress: "Yasal adres",
    actualAddress: "Fiili adres",
    documentType: "Belge türü",
    documentNumber: "Belge numarası",
    documentStatus: "Belge durumu",
    readOnly: "Elle düzenlenemez",
    civilActive: "Sivil Sicil: aktif",
    civilInactive: "Sivil Sicil: pasif",
    timeout: "Timeout",
    activityStatus: "Çalışma durumu",
    choose: "Seçin",
    employerName: "İşveren kuruluş",
    position: "Pozisyon",
    employerBusinessField: "İşveren faaliyet alanı",
    activatesOnEmployed: "Çalışan durumunda etkinleşir",
    incomeSource: "Gelir kaynağı",
    expectedPremium: "Beklenen yıllık prim",
    todo: "Doldurulacak",
    ready: "Form hazır",
    checkResult: "Kontrol sonucu",
    liveValidation: "Canlı doğrulama",
    allRequiredDone: "Tüm zorunlu alanlar tamamlandı.",
    implementation: "Talep durumu",
    countriesDone: `${AML_COUNTRIES.length} ülke Excel'den aktarıldı.`,
    legalDone: "Yasal adres alanı eklendi.",
    statusDone: "Belge durumu kilitli/read-only.",
    kycDone: "Çalışan müşteriler için işveren, pozisyon ve faaliyet alanı zorunlu.",
    firstNameError: "Ad zorunludur.",
    lastNameError: "Soyad zorunludur.",
    personalIdError: "Gürcistan vatandaşları için kimlik numarası tam 11 rakam olmalıdır.",
    underageError: "Yaş 18'in altında; kayıt yapılamaz.",
    legalAddressError: "Yasal adres zorunludur.",
    actualAddressError: "Fiili adres zorunludur.",
    documentStatusError: "Belge durumu Sivil Sicil'den gelmeli ve aktif olmalıdır.",
    activityError: "Çalışma durumu zorunludur.",
    employerError: "Çalışan müşteriler için işveren zorunludur.",
    positionError: "Çalışan müşteriler için pozisyon zorunludur.",
    employerFieldError: "Çalışan müşteriler için işveren faaliyet alanı zorunludur.",
    incomeError: "Gelir kaynağı zorunludur.",
    premiumError: "Beklenen yıllık prim zorunludur.",
  },
} satisfies Record<Lang, Record<string, string>>;

const registryLabels: Record<Lang, Record<RegistryState, string>> = {
  ka: { not_checked: "არ არის გადამოწმებული", active: "აქტიური", inactive: "არ არის აქტიური", timeout: "რეესტრიდან პასუხი ვერ მივიღეთ" },
  en: { not_checked: "Not checked", active: "Active", inactive: "Inactive", timeout: "No registry response" },
  ru: { not_checked: "Не проверено", active: "Активен", inactive: "Неактивен", timeout: "Нет ответа реестра" },
  tr: { not_checked: "Kontrol edilmedi", active: "Aktif", inactive: "Pasif", timeout: "Sicilden yanıt yok" },
};

const documentTypes: Record<Lang, [string, string][]> = {
  ka: [["id_card", "პირადობის მოწმობა"], ["residence", "ბინადრობის მოწმობა"], ["temporary_residence", "დროებითი ბინადრობის მოწმობა"], ["passport", "პასპორტი"]],
  en: [["id_card", "ID card"], ["residence", "Residence card"], ["temporary_residence", "Temporary residence card"], ["passport", "Passport"]],
  ru: [["id_card", "ID-карта"], ["residence", "Вид на жительство"], ["temporary_residence", "Временный вид на жительство"], ["passport", "Паспорт"]],
  tr: [["id_card", "Kimlik kartı"], ["residence", "Oturum kartı"], ["temporary_residence", "Geçici oturum kartı"], ["passport", "Pasaport"]],
};

const activities: Record<Lang, [ActivityStatus, string][]> = {
  ka: [["", "აირჩიეთ"], ["employed", "დასაქმებული"], ["business_owner", "ბიზნესის მფლობელი"], ["sole_proprietor", "ინდ. მეწარმე"], ["self_employed", "თვითდასაქმებული"], ["unemployed", "უმუშევარი"], ["student", "სტუდენტი"], ["retired", "პენსიონერი"]],
  en: [["", "Choose"], ["employed", "Employed"], ["business_owner", "Business owner"], ["sole_proprietor", "Sole proprietor"], ["self_employed", "Self-employed"], ["unemployed", "Unemployed"], ["student", "Student"], ["retired", "Retired"]],
  ru: [["", "Выберите"], ["employed", "Работает"], ["business_owner", "Владелец бизнеса"], ["sole_proprietor", "ИП"], ["self_employed", "Самозанятый"], ["unemployed", "Безработный"], ["student", "Студент"], ["retired", "Пенсионер"]],
  tr: [["", "Seçin"], ["employed", "Çalışan"], ["business_owner", "İşletme sahibi"], ["sole_proprietor", "Şahıs girişimci"], ["self_employed", "Serbest çalışan"], ["unemployed", "İşsiz"], ["student", "Öğrenci"], ["retired", "Emekli"]],
};

const incomeSources: Record<Lang, string[]> = {
  ka: ["ხელფასი", "დივიდენდი", "იჯარა", "პენსია", "სხვა"],
  en: ["Salary", "Dividend", "Rent", "Pension", "Other"],
  ru: ["Зарплата", "Дивиденды", "Аренда", "Пенсия", "Другое"],
  tr: ["Maaş", "Temettü", "Kira", "Emeklilik", "Diğer"],
};

const premiumRanges = ["< 50,000 GEL", "50,000 - 200,000 GEL", "200,000 - 1,000,000 GEL", "> 1,000,000 GEL"];

function calculateAge(value: string) {
  if (!value) return null;
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
}

function Field({ label, children, required, helper }: { label: string; children: React.ReactNode; required?: boolean; helper?: string }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">{label}{required ? <span className="text-[#fb4d19]"> *</span> : null}</span>
      {children}
      {helper ? <small className="text-xs font-semibold text-slate-500">{helper}</small> : null}
    </label>
  );
}

export default function AmlPage() {
  const [lang, setLang] = useState<Lang>("ka");
  const [form, setForm] = useState<FormState>(initialState);
  const [submitted, setSubmitted] = useState(false);
  const c = copy[lang];

  const isEmployed = form.activityStatus === "employed";
  const age = calculateAge(form.birthDate);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (!form.firstName.trim()) list.push(c.firstNameError);
    if (!form.lastName.trim()) list.push(c.lastNameError);
    if (form.citizenship === "საქართველო" && !/^\d{11}$/.test(form.personalId)) list.push(c.personalIdError);
    if (age !== null && age < 18) list.push(c.underageError);
    if (!form.legalAddress.trim()) list.push(c.legalAddressError);
    if (!form.actualAddress.trim()) list.push(c.actualAddressError);
    if (form.documentStatus !== "active") list.push(c.documentStatusError);
    if (!form.activityStatus) list.push(c.activityError);
    if (isEmployed) {
      if (!form.employerName.trim()) list.push(c.employerError);
      if (!form.position.trim()) list.push(c.positionError);
      if (!form.employerBusinessField.trim()) list.push(c.employerFieldError);
    }
    if (!form.incomeSource) list.push(c.incomeError);
    if (!form.expectedPremium) list.push(c.premiumError);
    return list;
  }, [age, c, form, isEmployed]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function simulateRegistry(status: RegistryState) {
    setForm((current) => ({ ...current, documentStatus: status, documentNumber: current.documentNumber || "AA1234567" }));
  }

  return (
    <main className="min-h-screen bg-[#eef2f1] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black text-[#fb4d19]">{c.eyebrow}</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal">{c.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">{c.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label={c.langLabel}>
                <Languages className="ml-2 size-4 text-slate-500" />
                {(["ka", "en", "ru", "tr"] as Lang[]).map((item) => (
                  <button key={item} className={`rounded-lg px-3 py-2 text-xs font-black ${lang === item ? "bg-slate-950 text-white" : "text-slate-600"}`} type="button" onClick={() => setLang(item)}>
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black" type="button" onClick={() => simulateRegistry("active")}>
                <Database className="size-4" />
                {c.registryActive}
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl bg-[#fb4d19] px-4 py-3 text-sm font-black text-white" type="button" onClick={() => setSubmitted(true)}>
                <Save className="size-4" />
                {c.validateSave}
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-3">
              <Field label={c.firstName} required><input className="rounded-xl border border-slate-200 px-3 py-3" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} /></Field>
              <Field label={c.lastName} required><input className="rounded-xl border border-slate-200 px-3 py-3" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} /></Field>
              <Field label={c.personalId} required helper={c.personalIdHelp}><input className="rounded-xl border border-slate-200 px-3 py-3" inputMode="numeric" maxLength={11} value={form.personalId} onChange={(event) => update("personalId", event.target.value.replace(/\D/g, ""))} /></Field>
              <Field label={c.birthDate} required><input className="rounded-xl border border-slate-200 px-3 py-3" type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} /></Field>
              <Field label={c.citizenship} required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.citizenship} onChange={(event) => update("citizenship", event.target.value)}>
                  {AML_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </Field>
              <Field label={c.secondCitizenship}>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.secondCitizenship} onChange={(event) => update("secondCitizenship", event.target.value)}>
                  <option value="">{c.none}</option>
                  {AML_COUNTRIES.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </Field>
              <Field label={c.legalAddress} required><input className="rounded-xl border border-slate-200 px-3 py-3" value={form.legalAddress} onChange={(event) => update("legalAddress", event.target.value)} /></Field>
              <Field label={c.actualAddress} required><input className="rounded-xl border border-slate-200 px-3 py-3" value={form.actualAddress} onChange={(event) => update("actualAddress", event.target.value)} /></Field>
            </div>

            <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-3">
              <Field label={c.documentType} required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.documentType} onChange={(event) => update("documentType", event.target.value)}>
                  {documentTypes[lang].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label={c.documentNumber}><input className="rounded-xl border border-slate-200 px-3 py-3" value={form.documentNumber} onChange={(event) => update("documentNumber", event.target.value)} /></Field>
              <Field label={c.documentStatus} helper={c.readOnly}>
                <div className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black">
                  <span>{registryLabels[lang][form.documentStatus]}</span>
                  <Lock className="size-4 text-slate-500" />
                </div>
              </Field>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800" type="button" onClick={() => simulateRegistry("active")}>{c.civilActive}</button>
                <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-800" type="button" onClick={() => simulateRegistry("inactive")}>{c.civilInactive}</button>
                <button className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800" type="button" onClick={() => simulateRegistry("timeout")}>{c.timeout}</button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label={c.activityStatus} required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.activityStatus} onChange={(event) => update("activityStatus", event.target.value as ActivityStatus)}>
                  {activities[lang].map(([value, label]) => <option key={value || "empty"} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label={c.employerName} required={isEmployed} helper={!isEmployed ? c.activatesOnEmployed : undefined}><input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.employerName} onChange={(event) => update("employerName", event.target.value)} /></Field>
              <Field label={c.position} required={isEmployed} helper={!isEmployed ? c.activatesOnEmployed : undefined}><input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.position} onChange={(event) => update("position", event.target.value)} /></Field>
              <Field label={c.employerBusinessField} required={isEmployed} helper={!isEmployed ? c.activatesOnEmployed : undefined}><input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.employerBusinessField} onChange={(event) => update("employerBusinessField", event.target.value)} /></Field>
              <Field label={c.incomeSource} required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.incomeSource} onChange={(event) => update("incomeSource", event.target.value)}>
                  <option value="">{c.choose}</option>
                  {incomeSources[lang].map((source) => <option key={source}>{source}</option>)}
                </select>
              </Field>
              <Field label={c.expectedPremium} required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.expectedPremium} onChange={(event) => update("expectedPremium", event.target.value)}>
                  <option value="">{c.choose}</option>
                  {premiumRanges.map((range) => <option key={range}>{range}</option>)}
                </select>
              </Field>
            </div>
          </form>

          <aside className="grid content-start gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {errors.length ? <FileWarning className="size-6 text-[#fb4d19]" /> : <CheckCircle2 className="size-6 text-emerald-600" />}
                <div>
                  <h2 className="text-lg font-black">{errors.length ? c.todo : c.ready}</h2>
                  <p className="text-sm font-semibold text-slate-500">{submitted ? c.checkResult : c.liveValidation}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {errors.length ? errors.map((error) => <div key={error} className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>) : <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{c.allRequiredDone}</div>}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-[#fb4d19]" />
                <h2 className="text-lg font-black">{c.implementation}</h2>
              </div>
              <ul className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
                <li>{c.countriesDone}</li>
                <li>{c.legalDone}</li>
                <li>{c.statusDone}</li>
                <li>{c.kycDone}</li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
