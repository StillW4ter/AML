"use client";

import { AML_COUNTRIES } from "@/lib/aml/countries";
import { CheckCircle2, Database, FileWarning, Lock, Save, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

type RegistryState = "not_checked" | "active" | "inactive" | "timeout";

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
  activityStatus: string;
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
  documentType: "პირადობის მოწმობა",
  documentNumber: "",
  documentStatus: "not_checked",
  activityStatus: "",
  employerName: "",
  position: "",
  employerBusinessField: "",
  incomeSource: "",
  expectedPremium: "",
};

const statusLabels: Record<RegistryState, string> = {
  not_checked: "არ არის გადამოწმებული",
  active: "აქტიური",
  inactive: "არ არის აქტიური",
  timeout: "რეესტრიდან პასუხი ვერ მივიღეთ",
};

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

function Field({
  label,
  children,
  required,
  helper,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  helper?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-black text-slate-800">
        {label}
        {required ? <span className="text-[#fb4d19]"> *</span> : null}
      </span>
      {children}
      {helper ? <small className="text-xs font-semibold text-slate-500">{helper}</small> : null}
    </label>
  );
}

export default function AmlPage() {
  const [form, setForm] = useState<FormState>(initialState);
  const [submitted, setSubmitted] = useState(false);

  const isEmployed = form.activityStatus === "დასაქმებული";
  const age = calculateAge(form.birthDate);

  const errors = useMemo(() => {
    const list: string[] = [];
    if (!form.firstName.trim()) list.push("სახელი სავალდებულოა.");
    if (!form.lastName.trim()) list.push("გვარი სავალდებულოა.");
    if (form.citizenship === "საქართველო" && !/^\d{11}$/.test(form.personalId)) {
      list.push("საქართველოს მოქალაქისთვის პირადი ნომერი უნდა იყოს ზუსტად 11 ციფრი.");
    }
    if (age !== null && age < 18) list.push("ასაკი <18, რეგისტრაცია შეუძლებელია.");
    if (!form.legalAddress.trim()) list.push("იურიდიული მისამართი სავალდებულოა.");
    if (!form.actualAddress.trim()) list.push("ფაქტიური მისამართი სავალდებულოა.");
    if (form.documentStatus !== "active") {
      list.push("დოკუმენტის სტატუსი უნდა წამოვიდეს სამოქალაქო რეესტრიდან და იყოს აქტიური.");
    }
    if (!form.activityStatus) list.push("საქმიანობის სტატუსი სავალდებულოა.");
    if (isEmployed) {
      if (!form.employerName.trim()) list.push("დასაქმებულისთვის დამსაქმებელი ორგანიზაცია სავალდებულოა.");
      if (!form.position.trim()) list.push("დასაქმებულისთვის თანამდებობა სავალდებულოა.");
      if (!form.employerBusinessField.trim()) list.push("დასაქმებულისთვის საქმიანობის სფერო სავალდებულოა.");
    }
    if (!form.incomeSource) list.push("შემოსავლის წყარო სავალდებულოა.");
    if (!form.expectedPremium) list.push("მოსალოდნელი წლიური პრემია სავალდებულოა.");
    return list;
  }, [age, form, isEmployed]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function simulateRegistry(status: RegistryState) {
    setForm((current) => ({
      ...current,
      documentStatus: status,
      documentNumber: current.documentNumber || "AA1234567",
    }));
  }

  return (
    <main className="min-h-screen bg-[#eef2f1] px-4 py-6 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black text-[#fb4d19]">AML მოდული · ფიზიკური პირის რეგისტრაცია</p>
              <h1 className="mt-2 text-3xl font-black tracking-normal">კლიენტის რეგისტრაციის ფორმა</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">
                მოქალაქეობის ველები იყენებს Excel-იდან დამატებულ ქვეყნების სიას. დოკუმენტის სტატუსი ხელით აღარ ივსება და აქტიურდება მხოლოდ სამოქალაქო რეესტრიდან მიღებული პასუხით.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black"
                type="button"
                onClick={() => simulateRegistry("active")}
              >
                <Database className="size-4" />
                რეესტრიდან აქტიური სტატუსი
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-[#fb4d19] px-4 py-3 text-sm font-black text-white"
                type="button"
                onClick={() => setSubmitted(true)}
              >
                <Save className="size-4" />
                შემოწმება და შენახვა
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <form className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-3">
              <Field label="სახელი" required>
                <input className="rounded-xl border border-slate-200 px-3 py-3" value={form.firstName} onChange={(event) => update("firstName", event.target.value)} />
              </Field>
              <Field label="გვარი" required>
                <input className="rounded-xl border border-slate-200 px-3 py-3" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} />
              </Field>
              <Field label="პირადი ნომერი" required helper="საქართველოს მოქალაქისთვის ზუსტად 11 ციფრი">
                <input className="rounded-xl border border-slate-200 px-3 py-3" inputMode="numeric" maxLength={11} value={form.personalId} onChange={(event) => update("personalId", event.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="დაბადების თარიღი" required>
                <input className="rounded-xl border border-slate-200 px-3 py-3" type="date" value={form.birthDate} onChange={(event) => update("birthDate", event.target.value)} />
              </Field>
              <Field label="მოქალაქეობა" required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.citizenship} onChange={(event) => update("citizenship", event.target.value)}>
                  {AML_COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </Field>
              <Field label="მეორე მოქალაქეობა">
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.secondCitizenship} onChange={(event) => update("secondCitizenship", event.target.value)}>
                  <option value="">არ აქვს</option>
                  {AML_COUNTRIES.map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </Field>
              <Field label="იურიდიული მისამართი" required>
                <input className="rounded-xl border border-slate-200 px-3 py-3" value={form.legalAddress} onChange={(event) => update("legalAddress", event.target.value)} />
              </Field>
              <Field label="ფაქტიური მისამართი" required>
                <input className="rounded-xl border border-slate-200 px-3 py-3" value={form.actualAddress} onChange={(event) => update("actualAddress", event.target.value)} />
              </Field>
            </div>

            <div className="grid gap-4 border-b border-slate-200 pb-5 md:grid-cols-3">
              <Field label="დოკუმენტის ტიპი" required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.documentType} onChange={(event) => update("documentType", event.target.value)}>
                  <option>პირადობის მოწმობა</option>
                  <option>ბინადრობის მოწმობა</option>
                  <option>დროებითი ბინადრობის მოწმობა</option>
                  <option>პასპორტი</option>
                </select>
              </Field>
              <Field label="დოკუმენტის ნომერი">
                <input className="rounded-xl border border-slate-200 px-3 py-3" value={form.documentNumber} onChange={(event) => update("documentNumber", event.target.value)} />
              </Field>
              <Field label="დოკუმენტის სტატუსი" helper="ხელით არ რედაქტირდება">
                <div className="flex min-h-12 items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black">
                  <span>{statusLabels[form.documentStatus]}</span>
                  <Lock className="size-4 text-slate-500" />
                </div>
              </Field>
              <div className="flex flex-wrap gap-2 md:col-span-3">
                <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800" type="button" onClick={() => simulateRegistry("active")}>სამოქალაქო რეესტრი: აქტიური</button>
                <button className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-black text-red-800" type="button" onClick={() => simulateRegistry("inactive")}>სამოქალაქო რეესტრი: არააქტიური</button>
                <button className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-black text-amber-800" type="button" onClick={() => simulateRegistry("timeout")}>Timeout</button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="საქმიანობის სტატუსი" required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.activityStatus} onChange={(event) => update("activityStatus", event.target.value)}>
                  <option value="">აირჩიეთ</option>
                  <option value="დასაქმებული">დასაქმებული</option>
                  <option value="ბიზნესის მფლობელი">ბიზნესის მფლობელი</option>
                  <option value="ინდ. მეწარმე">ინდ. მეწარმე</option>
                  <option value="თვითდასაქმებული">თვითდასაქმებული</option>
                  <option value="უმუშევარი">უმუშევარი</option>
                  <option value="სტუდენტი">სტუდენტი</option>
                  <option value="პენსიონერი">პენსიონერი</option>
                </select>
              </Field>
              <Field label="დამსაქმებელი ორგანიზაცია" required={isEmployed} helper={!isEmployed ? "აქტიურდება სტატუსზე: დასაქმებული" : undefined}>
                <input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.employerName} onChange={(event) => update("employerName", event.target.value)} />
              </Field>
              <Field label="თანამდებობა" required={isEmployed} helper={!isEmployed ? "აქტიურდება სტატუსზე: დასაქმებული" : undefined}>
                <input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.position} onChange={(event) => update("position", event.target.value)} />
              </Field>
              <Field label="დამსაქმებლის საქმიანობის სფერო" required={isEmployed} helper={!isEmployed ? "აქტიურდება სტატუსზე: დასაქმებული" : undefined}>
                <input disabled={!isEmployed} className="rounded-xl border border-slate-200 px-3 py-3 disabled:bg-slate-100 disabled:text-slate-400" value={form.employerBusinessField} onChange={(event) => update("employerBusinessField", event.target.value)} />
              </Field>
              <Field label="შემოსავლის წყარო" required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.incomeSource} onChange={(event) => update("incomeSource", event.target.value)}>
                  <option value="">აირჩიეთ</option>
                  <option>ხელფასი</option>
                  <option>დივიდენდი</option>
                  <option>იჯარა</option>
                  <option>პენსია</option>
                  <option>სხვა</option>
                </select>
              </Field>
              <Field label="მოსალოდნელი წლიური პრემია" required>
                <select className="rounded-xl border border-slate-200 px-3 py-3" value={form.expectedPremium} onChange={(event) => update("expectedPremium", event.target.value)}>
                  <option value="">აირჩიეთ</option>
                  <option>{"< 50,000 ლარი"}</option>
                  <option>50,000 – 200,000 ლარი</option>
                  <option>200,000 – 1,000,000 ლარი</option>
                  <option>{"> 1,000,000 ლარი"}</option>
                </select>
              </Field>
            </div>
          </form>

          <aside className="grid content-start gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                {errors.length ? <FileWarning className="size-6 text-[#fb4d19]" /> : <CheckCircle2 className="size-6 text-emerald-600" />}
                <div>
                  <h2 className="text-lg font-black">{errors.length ? "შესავსებია" : "ფორმა მზად არის"}</h2>
                  <p className="text-sm font-semibold text-slate-500">{submitted ? "შემოწმების შედეგი" : "ცოცხალი ვალიდაცია"}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {errors.length ? errors.map((error) => (
                  <div key={error} className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">{error}</div>
                )) : (
                  <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800">ყველა სავალდებულო ველი შევსებულია.</div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-6 text-[#fb4d19]" />
                <h2 className="text-lg font-black">ცვლილებები</h2>
              </div>
              <ul className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
                <li>ქვეყნების სია დამატებულია Excel ფაილიდან: {AML_COUNTRIES.length} ჩანაწერი.</li>
                <li>დამატებულია იურიდიული მისამართის ველი.</li>
                <li>დოკუმენტის სტატუსი არის read-only და მოდის მხოლოდ რეესტრის სიმულაციიდან.</li>
                <li>„დასაქმებული“-ს არჩევისას დამსაქმებელი, თანამდებობა და საქმიანობის სფერო აქტიურდება და სავალდებულო ხდება.</li>
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
