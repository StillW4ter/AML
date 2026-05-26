/**
 * Multilingual (English / Georgian / Russian) UI dictionary for Gurdena.
 *
 * Storage trick — the base DICT keeps the existing [en, ka] tuples so we
 * don't have to rewrite every entry. A second DICT_RU map provides Russian
 * overlays, and translate(lang, key) falls back to English when a Russian
 * string isn't defined yet. This lets us roll Russian out incrementally.
 *
 * The React binding lives in components/crm/i18n.tsx.
 */

export type Lang = "en" | "ka" | "ru";
export const LANGS: Lang[] = ["en", "ka", "ru"];

/** Human-readable label for a language, in its own language. */
export const LANG_LABEL: Record<Lang, string> = {
  en: "English",
  ka: "ქართული",
  ru: "Русский",
};

/** Short ISO-ish tag shown in compact language pickers. */
export const LANG_SHORT: Record<Lang, string> = {
  en: "EN",
  ka: "ქარ",
  ru: "RU",
};

type Entry = readonly [en: string, ka: string];

export const DICT = {
  // Brand / shell
  brand: ["Gurdena", "გურდენა"],
  crm: ["CRM", "CRM"],
  searchPlaceholder: ["Search leads, people, policies…", "ძებნა: ლიდები, კლიენტები, პოლისები…"],
  newLead: ["New lead", "ახალი ლიდი"],

  // Navigation
  navPipeline: ["Pipeline", "პაიპლაინი"],
  navContacts: ["Contacts", "კონტაქტები"],
  navActivity: ["Activity", "აქტივობა"],
  navMessages: ["Messages", "შეტყობინებები"],
  navSettings: ["Settings", "პარამეტრები"],

  // Board
  boardView: ["Board", "დაფა"],
  tableView: ["Table", "ცხრილი"],
  dragHint: ["Drag a card to another stage to move the deal.", "გადაიტანე ბარათი სხვა ეტაპზე."],
  noDeals: ["No deals in this stage", "ამ ეტაპზე ლიდები არ არის"],
  deals: ["deals", "ლიდი"],
  pipelineValue: ["Pipeline value", "პაიპლაინის ღირებულება"],
  openDeals: ["Open deals", "აქტიური ლიდები"],
  wonThisCycle: ["Won", "მოგებული"],
  quoteReady: ["Quote-ready", "ოფერი მზადაა"],

  // Card / table fields
  value: ["Value", "ღირებულება"],
  missing: ["Missing", "აკლია"],
  owner: ["Owner", "აგენტი"],
  source: ["Source", "წყარო"],
  request: ["Request", "მოთხოვნა"],
  stage: ["Stage", "ეტაპი"],
  name: ["Name", "სახელი"],
  phone: ["Phone", "ტელეფონი"],
  email: ["Email", "ელფოსტა"],
  city: ["City", "ქალაქი"],
  contact: ["Contact", "კონტაქტი"],
  unassigned: ["Unassigned", "მიუნიჭებელი"],

  // Record panel
  overview: ["Overview", "მიმოხილვა"],
  insurance: ["Insurance", "დაზღვევა"],
  activityTab: ["Activity", "აქტივობა"],
  messaging: ["Messaging", "კომუნიკაცია"],
  dealDetails: ["Deal details", "ლიდის დეტალები"],
  contactDetails: ["Contact", "კონტაქტი"],
  pipelineProgress: ["Pipeline progress", "პაიპლაინის პროგრესი"],
  underwriting: ["Underwriting fields", "ანდერაიტინგის ველები"],
  quotes: ["Quotes", "შეთავაზებები"],
  noQuotes: ["No quotes yet", "შეთავაზებები ჯერ არ არის"],
  aiSuggested: ["AI", "AI"],
  required: ["Required", "სავალდებულო"],
  empty: ["Empty", "ცარიელი"],
  save: ["Save", "შენახვა"],
  saving: ["Saving…", "ინახება…"],
  saved: ["Saved", "შენახულია"],
  close: ["Close", "დახურვა"],
  lastActivity: ["Last activity", "ბოლო აქტივობა"],
  lineOfBusiness: ["Line of business", "დაზღვევის ტიპი"],

  // Timeline / activity
  timeline: ["Timeline", "ისტორია"],
  logActivity: ["Log activity", "აქტივობის დამატება"],
  addNote: ["Add a call note, update, or summary…", "დაამატე ზარის ჩანაწერი ან კომენტარი…"],
  note: ["Note", "ჩანაწერი"],
  call: ["Call", "ზარი"],
  add: ["Add", "დამატება"],
  noActivity: ["No activity logged yet", "აქტივობა ჯერ არ დაფიქსირებულა"],

  // Messaging
  sendEmail: ["Email", "ელფოსტა"],
  sendSms: ["SMS", "SMS"],
  sendWhatsapp: ["WhatsApp", "WhatsApp"],
  channel: ["Channel", "არხი"],
  to: ["To", "მიმღები"],
  subject: ["Subject", "თემა"],
  message: ["Message", "შეტყობინება"],
  send: ["Send", "გაგზავნა"],
  sending: ["Sending…", "იგზავნება…"],
  messageHistory: ["Message history", "შეტყობინებების ისტორია"],
  noMessages: ["No messages yet", "შეტყობინებები ჯერ არ არის"],
  inbound: ["Received", "მიღებული"],
  outbound: ["Sent", "გაგზავნილი"],
  mockNotice: ["Mock mode — add provider keys in .env.local to send for real.", "სატესტო რეჟიმი — დაამატე გასაღებები ნამდვილი გაგზავნისთვის."],

  // New lead form
  createLead: ["Create lead", "ლიდის შექმნა"],
  createLeadTitle: ["New insurance lead", "ახალი სადაზღვევო ლიდი"],
  cancel: ["Cancel", "გაუქმება"],
  creating: ["Creating…", "იქმნება…"],
  fieldRequired: ["This field is required", "ეს ველი სავალდებულოა"],

  // Lines of business
  lobAuto: ["Auto / CASCO", "ავტო / კასკო"],
  lobHealth: ["Health", "ჯანმრთელობა"],
  lobHome: ["Home", "ქონება"],
  lobTravel: ["Travel", "სამოგზაურო"],
  lobPet: ["Pet", "შინაური ცხოველი"],
  lobCommercial: ["Commercial", "კომერციული"],

  // Misc
  loading: ["Loading…", "იტვირთება…"],
  retry: ["Retry", "ხელახლა"],
  blockedTitle: ["Stage gate", "ეტაპის შეზღუდვა"],
  blockedBody: ["Fill these fields before moving to this stage:", "შეავსე ეს ველები ამ ეტაპზე გადასვლამდე:"],
  agentSettings: ["Agents", "აგენტები"],

  // Navigation (added)
  navReports: ["Reports", "ანგარიშები"],
  soon: ["Soon", "მალე"],

  // Reports dashboard
  reportsTitle: ["Reports", "ანგარიშები"],
  reportsSubtitle: ["Pipeline health and team performance", "პაიპლაინის მდგომარეობა და გუნდის შედეგები"],
  totalPipeline: ["Open pipeline", "ღია პაიპლაინი"],
  wonValueLabel: ["Won value", "მოგებული ღირებულება"],
  winRate: ["Win rate", "მოგების მაჩვენებელი"],
  avgDealAge: ["Avg. deal age", "ლიდის საშ. ასაკი"],
  conversionFunnel: ["Conversion funnel", "კონვერსიის ძაბრი"],
  perAgent: ["Agent performance", "აგენტების შედეგები"],
  byLine: ["By line of business", "ტიპის მიხედვით"],
  dealsLabel: ["Deals", "ლიდები"],
  wonLabel: ["Won", "მოგებული"],
  lostLabel: ["Lost", "წაგებული"],
  openLabel: ["Open", "ღია"],
  days: ["days", "დღე"],

  // Contacts
  contactsTitle: ["Contacts", "კონტაქტები"],
  contactsSubtitle: ["Everyone in your book of business", "ყველა კლიენტი თქვენს ბაზაში"],
  searchContacts: ["Search contacts…", "კონტაქტების ძებნა…"],
  totalDeals: ["Deals", "ლიდები"],
  noContacts: ["No contacts found", "კონტაქტები ვერ მოიძებნა"],

  // Filters
  allOwners: ["All owners", "ყველა აგენტი"],
  allTypes: ["All types", "ყველა ტიპი"],
  noResults: ["No deals match your filters", "ფილტრს ლიდი არ ემთხვევა"],

  // Sales depth — edit, close, quotes
  edit: ["Edit", "რედაქტირება"],
  editDeal: ["Edit deal", "ლიდის რედაქტირება"],
  dealTitle: ["Deal title", "ლიდის სათაური"],
  closeValue: ["Close value", "დახურვის ღირებულება"],
  lossReason: ["Loss reason", "წაგების მიზეზი"],
  confirmWon: ["Confirm — deal won", "დადასტურება — მოგებული"],
  confirmLost: ["Confirm — deal lost", "დადასტურება — წაგებული"],
  confirm: ["Confirm", "დადასტურება"],
  addQuote: ["Add quote", "შეთავაზების დამატება"],
  insurer: ["Insurer", "მზღვეველი"],
  premium: ["Premium", "პრემია"],

  // Settings
  settingsTitle: ["Settings", "პარამეტრები"],
  settingsSubtitle: ["Customize the pipeline, fields and renewals", "პაიპლაინის, ველებისა და განახლებების მართვა"],
  tabStages: ["Pipeline stages", "ეტაპები"],
  tabFields: ["Custom fields", "ველები"],
  tabRenewals: ["Renewals", "განახლებები"],
  stageName: ["Stage name", "ეტაპის სახელი"],
  addStage: ["Add stage", "ეტაპის დამატება"],
  stageType: ["Type", "ტიპი"],
  typeOpen: ["Open", "ღია"],
  typeWon: ["Won", "მოგებული"],
  typeLost: ["Lost", "წაგებული"],
  fieldLabel: ["Field label", "ველის სახელი"],
  fieldType: ["Type", "ტიპი"],
  fieldScope: ["Applies to", "ვრცელდება"],
  sharedScope: ["All insurance types", "ყველა ტიპი"],
  addField: ["Add field", "ველის დამატება"],
  requiredShort: ["Required", "სავალდებულო"],
  renewalScheduleTitle: ["Renewal notification schedule", "განახლების შეტყობინების გრაფიკი"],
  renewalIntro: ["Notify the assigned agent this many days before a policy expires.", "შეატყობინე აგენტს პოლისის ვადის გასვლამდე."],
  daysBefore: ["Days before expiry", "დღე ვადის გასვლამდე"],
  dailyLastDays: ["Then notify every day for the final N days", "შემდეგ ყოველდღე ბოლო N დღეში"],
  addInterval: ["Add", "დამატება"],
  typeText: ["Text", "ტექსტი"],
  typeNumber: ["Number", "რიცხვი"],
  typeDate: ["Date", "თარიღი"],
  typeSelect: ["Choice", "არჩევანი"],
  typeBoolean: ["Yes / No", "კი / არა"],
  policy: ["Policy", "პოლისი"],
  policyNumber: ["Policy number", "პოლისის ნომერი"],
  policyStart: ["Start date", "დაწყების თარიღი"],
  policyExpiry: ["Expiry date & time", "ვადის გასვლის თარიღი"],
  noExpiry: ["No expiry set", "ვადა მითითებული არ არის"],
  expiresIn: ["Expires in", "ვადა იწურება"],

  // Navigation (Checkpoint B)
  navAssign: ["Assignments", "განაწილება"],
  navRenewals: ["Renewals", "განახლებები"],

  // Contact detail — insurances hub
  insurances: ["Insurances", "დაზღვევები"],
  addInsurance: ["Add insurance", "დაზღვევის დამატება"],
  noInsurances: ["No insurances yet", "დაზღვევები ჯერ არ არის"],
  addedOn: ["Added", "დამატებულია"],
  openInsurance: ["Open", "გახსნა"],
  newInsuranceFor: ["New insurance for this contact", "ახალი დაზღვევა"],

  // Lead assignment
  assignTitle: ["Lead assignment", "ლიდების განაწილება"],
  assignSubtitle: ["Distribute new leads across the team", "ლიდების განაწილება გუნდზე"],
  unassignedLeads: ["Needs assignment", "მისანიჭებელი"],
  autoSplit: ["Auto-split evenly", "თანაბრად განაწილება"],
  allAssigned: ["Every lead is assigned", "ყველა ლიდი მინიჭებულია"],
  agentLoad: ["Team workload", "გუნდის დატვირთვა"],
  openCount: ["open", "ღია"],

  // Renewals
  renewalsTitle: ["Policy renewals", "პოლისის განახლებები"],
  renewalsSubtitle: ["Policies coming up for renewal", "განახლებას დაქვემდებარებული პოლისები"],
  dueNow: ["Action due", "ვადა მოახლოვდა"],
  daysLeft: ["days left", "დარჩა დღე"],
  expired: ["Expired", "ვადაგასული"],
  expiresLabel: ["Expires", "ვადა"],
  noRenewals: ["No policies with an expiry date yet", "პოლისებს ვადა არ აქვთ მითითებული"],

  // Notifications inbox
  navNotifications: ["Notifications", "შეტყობინებები"],
  notificationsTitle: ["Notifications", "შეტყობინებები"],
  notificationsSubtitle: ["Renewal alerts and updates from your CRM", "შეტყობინებები CRM-დან"],
  markAllRead: ["Mark all read", "ყველაფერი წაკითხულად მონიშნე"],
  noNotificationsYet: ["No notifications yet", "შეტყობინებები ჯერ არ არის"],

  // Flow builder (Settings → Quote flows)
  tabFlows: ["Quote flows", "ფორმის ნაკადი"],
  flowsTitle: ["Quote flows", "ფორმის ნაკადი"],
  flowsSubtitle: [
    "Configure the public quote form for each insurance type",
    "ფორმის კონფიგურაცია თითოეული დაზღვევისთვის",
  ],
  flowPickLob: ["Insurance type", "დაზღვევის ტიპი"],
  flowName: ["Flow name", "ფორმის სახელი"],
  flowDefaultLang: ["Default form language", "ფორმის ნაგულისხმევი ენა"],
  flowActive: ["Active (visible on public site)", "აქტიური (ხილული საჯაროდ)"],
  flowSteps: ["Steps", "ეტაპები"],
  addStep: ["Add step", "ეტაპის დამატება"],
  stepIcon: ["Icon", "ხატულა"],
  stepType: ["Question type", "კითხვის ტიპი"],
  stepTitle: ["Question", "კითხვა"],
  stepHelp: ["Helper text", "დახმარების ტექსტი"],
  stepOptions: ["Options", "ვარიანტები"],
  stepOptionLabel: ["Option label", "ვარიანტი"],
  stepKey: ["Field key", "ველის გასაღები"],
  stepShowIf: ["Only show if previous answer is", "ჩვენება მხოლოდ თუ წინა პასუხია"],
  stepNone: ["No condition", "პირობის გარეშე"],
  reset: ["Reset", "გადატვირთვა"],
  copyPublicLink: ["Copy public link", "საჯარო ბმულის კოპირება"],
  copied: ["Copied!", "დაკოპირდა!"],
  noStepsYet: ["No steps yet — add the first question.", "ეტაპები არ არის — დაამატე პირველი კითხვა."],
  inputChoice: ["Single choice", "ერთი არჩევანი"],
  inputMulti: ["Multiple choice", "მრავალი არჩევანი"],
  inputText: ["Short text", "ტექსტი"],
  inputLongText: ["Long text", "გრძელი ტექსტი"],
  inputNumber: ["Number", "რიცხვი"],
  inputDate: ["Date", "თარიღი"],
  inputPhone: ["Phone", "ტელეფონი"],
  inputEmail: ["Email", "ელფოსტა"],
  delete: ["Delete", "წაშლა"],
  confirmDeleteStep: ["Delete this step?", "წავშალოთ ეს ეტაპი?"],

  // Public quote form
  quotePageTitle: ["Get your insurance quote", "მიიღე სადაზღვევო შეთავაზება"],
  quoteIntro: [
    "Answer a few questions and an agent will call you back with the best offers.",
    "უპასუხე რამდენიმე კითხვას და აგენტი დაგიკავშირდება საუკეთესო შეთავაზებებით.",
  ],
  quoteStartButton: ["Get my quote", "ფასის გაგება"],
  quoteContinue: ["Continue", "გაგრძელება"],
  quoteBack: ["Back", "უკან"],
  quoteSubmit: ["Submit", "გაგზავნა"],
  quoteSubmitting: ["Sending…", "იგზავნება…"],
  quoteThanksTitle: ["Thanks — we got it!", "მადლობა — მივიღეთ!"],
  quoteThanksBody: [
    "An agent will call you within the next hour to walk you through your options.",
    "აგენტი დაგიკავშირდებათ უახლოეს საათში.",
  ],
  quoteContactStepTitle: ["How can we reach you?", "როგორ დაგიკავშირდეთ?"],
  quoteName: ["Your name", "სახელი"],
  quoteEmail: ["Email", "ელფოსტა"],
  quotePhone: ["Phone", "ტელეფონი"],
  quoteCity: ["City", "ქალაქი"],
  quoteRequired: ["Required", "სავალდებულო"],
  quoteStepCount: ["Step", "ეტაპი"],
  quoteOf: ["of", "/"],
  quoteFlowMissing: ["This quote form isn't ready yet.", "ფორმა ჯერ არ არის მზად."],
  quoteFlowMissingHint: [
    "A manager can configure it in Settings → Quote flows.",
    "მენეჯერს შეუძლია ფორმის კონფიგურაცია პარამეტრებში.",
  ],
} as const satisfies Record<string, Entry>;

export type TKey = keyof typeof DICT;

/**
 * Russian overlay — partial, falls back to English for any missing key.
 * Add entries here as the UI surfaces evolve; no need to keep parity with
 * the English/Georgian dict for back-office screens.
 */
export const DICT_RU: Partial<Record<TKey, string>> = {
  brand: "Гурдена",
  crm: "CRM",

  // Navigation
  navPipeline: "Воронка",
  navContacts: "Контакты",
  navActivity: "Активность",
  navMessages: "Сообщения",
  navSettings: "Настройки",
  navReports: "Отчёты",
  navAssign: "Распределение",
  navRenewals: "Продления",
  navNotifications: "Уведомления",

  // Lines of business
  lobAuto: "Авто / КАСКО",
  lobHealth: "Здоровье",
  lobHome: "Имущество",
  lobTravel: "Путешествия",
  lobPet: "Питомцы",
  lobCommercial: "Коммерческое",

  // Common buttons & states
  save: "Сохранить",
  saving: "Сохранение…",
  saved: "Сохранено",
  cancel: "Отмена",
  close: "Закрыть",
  send: "Отправить",
  sending: "Отправка…",
  add: "Добавить",
  edit: "Редактировать",
  delete: "Удалить",
  reset: "Сбросить",
  required: "Обязательно",
  requiredShort: "Обязательно",
  loading: "Загрузка…",
  retry: "Повторить",
  soon: "Скоро",
  copied: "Скопировано!",

  // Flow builder
  tabFlows: "Формы заявок",
  flowsTitle: "Формы заявок",
  flowsSubtitle:
    "Настройте публичную форму заявки для каждого вида страхования",
  flowPickLob: "Вид страхования",
  flowName: "Название формы",
  flowDefaultLang: "Язык формы по умолчанию",
  flowActive: "Активна (доступна на сайте)",
  flowSteps: "Шаги",
  addStep: "Добавить шаг",
  stepIcon: "Иконка",
  stepType: "Тип вопроса",
  stepTitle: "Вопрос",
  stepHelp: "Подсказка",
  stepOptions: "Варианты",
  stepOptionLabel: "Вариант",
  stepKey: "Ключ поля",
  stepShowIf: "Показать только если предыдущий ответ",
  stepNone: "Без условия",
  copyPublicLink: "Скопировать публичную ссылку",
  noStepsYet: "Шагов пока нет — добавьте первый вопрос.",
  inputChoice: "Один вариант",
  inputMulti: "Несколько вариантов",
  inputText: "Короткий текст",
  inputLongText: "Длинный текст",
  inputNumber: "Число",
  inputDate: "Дата",
  inputPhone: "Телефон",
  inputEmail: "Email",
  confirmDeleteStep: "Удалить этот шаг?",

  // Public quote form
  quotePageTitle: "Получите страховое предложение",
  quoteIntro:
    "Ответьте на несколько вопросов — агент перезвонит с лучшими предложениями.",
  quoteStartButton: "Узнать цену",
  quoteContinue: "Продолжить",
  quoteBack: "Назад",
  quoteSubmit: "Отправить",
  quoteSubmitting: "Отправка…",
  quoteThanksTitle: "Спасибо — получили!",
  quoteThanksBody:
    "Агент свяжется с вами в течение часа, чтобы обсудить варианты.",
  quoteContactStepTitle: "Как с вами связаться?",
  quoteName: "Ваше имя",
  quoteEmail: "Email",
  quotePhone: "Телефон",
  quoteCity: "Город",
  quoteRequired: "Обязательно",
  quoteStepCount: "Шаг",
  quoteOf: "из",
  quoteFlowMissing: "Эта форма ещё не настроена.",
  quoteFlowMissingHint:
    "Менеджер может настроить её в разделе Настройки → Формы заявок.",
};

/** Translate a key for a language. */
export function translate(lang: Lang, key: TKey): string {
  const entry = DICT[key];
  if (lang === "ka") return entry[1];
  if (lang === "ru") return DICT_RU[key] ?? entry[0];
  return entry[0];
}

/**
 * Pick the localized variant of a value with separate language forms.
 *
 * `ru` is optional so we don't have to thread Russian through every legacy
 * call site — when omitted, Russian falls back to English (which is itself
 * a fallback for Georgian when missing).
 */
export function localized(
  lang: Lang,
  en: string | null | undefined,
  ka: string | null | undefined,
  ru?: string | null,
): string {
  if (lang === "ka") return (ka || en || ru) ?? "";
  if (lang === "ru") return (ru || en || ka) ?? "";
  return (en || ka || ru) ?? "";
}

export const LOB_KEYS: Record<string, TKey> = {
  auto: "lobAuto",
  health: "lobHealth",
  home: "lobHome",
  travel: "lobTravel",
  pet: "lobPet",
  commercial: "lobCommercial",
};
