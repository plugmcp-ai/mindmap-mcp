import type { Doc } from "../../src/model/schema.js";

/**
 * The demo in other languages: the same ticket backlog, the question the user
 * types, the scripted replies and the captions. Node ids are the same in every
 * language, so one recording script drives them all.
 *
 * The app's own buttons stay in English: the interface is not translated yet.
 * These show that the diagram itself handles any language, right-to-left included.
 */
export interface Locale {
  doc: Doc;
  prompt: string;
  reply: string;
  question: string;
  /** Three parts the pretend AI breaks "f1" into. */
  breakdown: [string, string, string];
  ask: { first: string; second: string; say: string };
  later: string;
  commentSay: string;
  added: (label: string, count: number) => string;
  captions: { intro: string; click: string; edits: string; own: string; end: string };
}

const tickets = (labels: Record<string, string>, title: string): Doc => ({
  title,
  structure: "two_sided",
  nodes: [
    { id: "root", label: labels.root! },
    { id: "auth", label: labels.auth!, parent: "root" },
    { id: "a1", label: labels.a1!, parent: "auth", status: "blocked" },
    { id: "a2", label: labels.a2!, parent: "auth", status: "todo" },
    { id: "a3", label: labels.a3!, parent: "auth", status: "todo" },
    { id: "pay", label: labels.pay!, parent: "root" },
    { id: "p1", label: labels.p1!, parent: "pay", status: "todo" },
    { id: "p2", label: labels.p2!, parent: "pay", status: "todo" },
    { id: "p3", label: labels.p3!, parent: "pay", status: "idea" },
    { id: "perf", label: labels.perf!, parent: "root" },
    { id: "f1", label: labels.f1!, parent: "perf", status: "todo" },
    { id: "f2", label: labels.f2!, parent: "perf", status: "todo" },
    { id: "f3", label: labels.f3!, parent: "perf", status: "todo" },
    { id: "mob", label: labels.mob!, parent: "root" },
    { id: "m1", label: labels.m1!, parent: "mob", status: "blocked" },
    { id: "m2", label: labels.m2!, parent: "mob", status: "todo" },
    { id: "m3", label: labels.m3!, parent: "mob", status: "idea" },
    { id: "docs", label: labels.docs!, parent: "root" },
    { id: "d1", label: labels.d1!, parent: "docs", status: "todo" },
    { id: "d2", label: labels.d2!, parent: "docs", status: "idea" },
  ],
});

const REPO = "github.com/plugmcp-ai/mindmap-mcp";

export const LOCALES: Record<string, Locale> = {
  ar: {
    doc: tickets(
      {
        root: "التذاكر المفتوحة",
        auth: "الدخول والحسابات",
        a1: "فشل الدخول الموحد على سفاري",
        a2: "تأخر بريد إعادة التعيين",
        a3: "رفض رموز التحقق",
        pay: "الفوترة",
        p1: "خصم مزدوج عند الإعادة",
        p2: "ملف الفاتورة معطل",
        p3: "إضافة خطة سنوية",
        perf: "الأداء",
        f1: "اللوحة تفتح في 9 ثوان",
        f2: "البحث يتجاوز المهلة",
        f3: "رفع الصور يتوقف",
        mob: "تطبيق الجوال",
        m1: "تعطل على أندرويد 14",
        m2: "الإشعارات لا تصل",
        m3: "نواقص الوضع الداكن",
        docs: "الوثائق والدعم",
        d1: "دليل الواجهة قديم",
        d2: "لا يوجد فيديو تعريفي",
      },
      "التذاكر المفتوحة",
    ),
    prompt: "لا أستطيع متابعة 14 تذكرة في رأسي. اعرضها كخريطة ذهنية:\nفشل الدخول الموحد على سفاري\nخصم مزدوج عند الإعادة\nاللوحة تفتح في 9 ثوان\n... و11 أخرى",
    reply: "هذه تذاكرك الـ14 مرتبة حسب المجال. اضغط على أي منها للتعمق.",
    question: "أيها نصلح أولا؟",
    breakdown: ["تحليل الاستعلام البطيء", "تخزين العناصر مؤقتا", "تحميل الرسوم أخيرا"],
    ask: {
      first: "الأولوية الأولى. العملاء يدفعون مرتين، وكل يوم تأخير يكلف مالا وثقة.",
      second: "الثانية. مزعجة، لكن لا أحد يخسر مالا.",
      say: "ابدأ بالخصم المزدوج: إنه يكلف العملاء مالا. وضعته قيد التنفيذ وكتبت السبب في ملاحظته.",
    },
    later: "لاحقا",
    commentSay: "تم. نقلت «نواقص الوضع الداكن» إلى فرع جديد باسم «لاحقا».",
    added: (label, count) => `أضفت ${count} عناصر تحت «${label}».`,
    captions: {
      intro: "تطبيق MCP تعدل فيه إجابة الذكاء الاصطناعي بالضغط عليها",
      click: "اضغط على أي عنصر واسأل الذكاء الاصطناعي عنه",
      edits: "الذكاء الاصطناعي يجيب بتعديل الخريطة نفسها",
      own: "أو اطرح سؤالك الخاص",
      end: `مفتوح المصدر: ${REPO}`,
    },
  },
  fr: {
    doc: tickets(
      {
        root: "Tickets ouverts",
        auth: "Connexion et comptes",
        a1: "SSO en panne sur Safari",
        a2: "E-mail de réinitialisation en retard",
        a3: "Codes 2FA refusés",
        pay: "Facturation",
        p1: "Double débit au nouvel essai",
        p2: "Facture PDF cassée",
        p3: "Ajouter une offre annuelle",
        perf: "Performance",
        f1: "Tableau de bord en 9 s",
        f2: "La recherche expire",
        f3: "Envoi d'images bloqué",
        mob: "Application mobile",
        m1: "Plantage sur Android 14",
        m2: "Notifications non reçues",
        m3: "Mode sombre incomplet",
        docs: "Docs et support",
        d1: "Guide API obsolète",
        d2: "Pas de vidéo d'accueil",
      },
      "Tickets ouverts",
    ),
    prompt: "Je n'arrive pas à garder 14 tickets en tête. Montre-les en carte mentale :\nSSO en panne sur Safari\nDouble débit au nouvel essai\nTableau de bord en 9 s\n... 11 de plus",
    reply: "Voici vos 14 tickets, regroupés par domaine. Cliquez sur l'un d'eux pour creuser.",
    question: "Lequel corriger en premier ?",
    breakdown: ["Profiler la requête lente", "Mettre les widgets en cache", "Charger les graphiques en dernier"],
    ask: {
      first: "À corriger en premier. Les clients sont débités deux fois : chaque jour coûte de l'argent et de la confiance.",
      second: "En second. Gênant, mais personne ne perd d'argent.",
      say: "Le double débit d'abord : il coûte de l'argent aux clients. Je l'ai passé en cours et j'ai noté la raison.",
    },
    later: "Plus tard",
    commentSay: "C'est fait. J'ai déplacé « Mode sombre incomplet » dans une nouvelle branche « Plus tard ».",
    added: (label, count) => `J'ai ajouté ${count} éléments sous « ${label} ».`,
    captions: {
      intro: "Une app MCP où l'on modifie la réponse de l'IA en cliquant dessus",
      click: "Cliquez sur un élément et interrogez l'IA",
      edits: "L'IA répond en modifiant la même carte",
      own: "Ou posez votre propre question",
      end: `Open source : ${REPO}`,
    },
  },
  es: {
    doc: tickets(
      {
        root: "Tickets abiertos",
        auth: "Acceso y cuentas",
        a1: "SSO falla en Safari",
        a2: "Correo de restablecimiento tardío",
        a3: "Códigos 2FA rechazados",
        pay: "Facturación",
        p1: "Cobro doble al reintentar",
        p2: "Factura PDF dañada",
        p3: "Añadir plan anual",
        perf: "Rendimiento",
        f1: "El panel carga en 9 s",
        f2: "La búsqueda se agota",
        f3: "Subida de imágenes atascada",
        mob: "App móvil",
        m1: "Cierre en Android 14",
        m2: "Notificaciones no llegan",
        m3: "Modo oscuro incompleto",
        docs: "Docs y soporte",
        d1: "Guía de API desactualizada",
        d2: "Sin video de bienvenida",
      },
      "Tickets abiertos",
    ),
    prompt: "No puedo tener 14 tickets en la cabeza. Muéstralos como mapa mental:\nSSO falla en Safari\nCobro doble al reintentar\nEl panel carga en 9 s\n... 11 más",
    reply: "Aquí están tus 14 tickets, agrupados por área. Haz clic en cualquiera para profundizar.",
    question: "¿Cuál arreglamos primero?",
    breakdown: ["Analizar la consulta lenta", "Guardar widgets en caché", "Cargar gráficos al final"],
    ask: {
      first: "Arreglar primero. Se cobra dos veces a los clientes: cada día cuesta dinero y confianza.",
      second: "Segundo. Molesto, pero nadie pierde dinero.",
      say: "Primero el cobro doble: les cuesta dinero a los clientes. Lo marqué como en curso y anoté el motivo.",
    },
    later: "Más adelante",
    commentSay: "Hecho. Moví «Modo oscuro incompleto» a una rama nueva, «Más adelante».",
    added: (label, count) => `Añadí ${count} nodos bajo «${label}».`,
    captions: {
      intro: "Una app MCP donde editas la respuesta de la IA haciendo clic",
      click: "Haz clic en un nodo y pregunta a la IA",
      edits: "La IA responde editando el mismo mapa",
      own: "O haz tu propia pregunta",
      end: `Código abierto: ${REPO}`,
    },
  },
};
