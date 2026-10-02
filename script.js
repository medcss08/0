/* =========================================================
   MED — Web Studio
   Firebase + Requests + Portfolio
   ========================================================= */

const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_FIREBASE_APP_ID"
};

let firebaseReady = false;
let db = null;
let storage = null;

try {
    if (
        firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("YOUR_") &&
        firebaseConfig.projectId && !firebaseConfig.projectId.startsWith("YOUR_")
    ) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        storage = firebase.storage();
        firebaseReady = true;
    } else {
        console.warn("MED Firebase: configuration not added. Local mode is active.");
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const ADMIN_USERNAME = "admin";
const WHATSAPP_NUMBER = "21627049943";
const DEFAULT_ADMIN_PASSWORD_HASH = "8784ec77ede999217eaffe2353ddf6a1fabc65523f67f39b59218614715bc45a";

function cloudAvailable() { return firebaseReady && db !== null; }

/* ---------- helpers ---------- */

function readLocal(key) {
    try {
        const x = JSON.parse(localStorage.getItem(key) || "[]");
        return Array.isArray(x) ? x : [];
    } catch { return []; }
}

function writeLocal(key, x) { localStorage.setItem(key, JSON.stringify(x)); }

function escapeHTML(v) {
    return String(v ?? "")
        .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function btn(t, c, f) {
    const b = document.createElement("button");
    b.textContent = t; b.className = c; b.onclick = f;
    return b;
}

const $ = id => document.getElementById(id);

/* ---------- navigation ---------- */

function show(id) {
    if (id === "adminDashboard" && !isAdmin()) {
        alert("غير مسموح بالدخول إلى لوحة الإدارة.");
        return;
    }
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const e = $(id);
    if (!e) return;
    e.classList.add("active");

    if (id === "portfolio") renderPortfolio();
    if (id === "adminDashboard") { renderAdminOrders(); renderAdminPortfolio(); }

    $("mainNav")?.classList.remove("mobile-open");
    scrollTo({ top: 0, behavior: "smooth" });
}

function toggleMobileMenu() { $("mainNav").classList.toggle("mobile-open"); }

/* ---------- website request form ---------- */

function openRequest() {
    ["orderUsername", "orderWhatsApp", "orderType", "orderDetails"].forEach(id => $(id).value = "");
    $("orderMessage").textContent = "";
    $("orderReview").style.display = "none";
    $("orderFormFields").style.display = "block";
    $("orderModal").classList.add("show");
    $("mainNav")?.classList.remove("mobile-open");
}

function closeOrder() { $("orderModal").classList.remove("show"); }

function getDraft() {
    const name = $("orderUsername").value.trim();
    const wa = $("orderWhatsApp").value.trim();
    const type = $("orderType").value;
    const details = $("orderDetails").value.trim();

    if (!name || !wa || !type || !details) {
        return { error: "يرجى إدخال الاسم ورقم WhatsApp ونوع الموقع وتفاصيل المشروع." };
    }
    return {
        customerName: name,
        whatsappNumber: wa,
        siteType: type,
        details: details,
        createdAt: new Date().toISOString(),
        status: "pending"
    };
}

function reviewOrder() {
    const d = getDraft();
    if (!d || d.error) {
        $("orderMessage").textContent = d?.error || "حدث خطأ.";
        return;
    }
    window.currentOrderDraft = d;
    $("orderReviewContent").innerHTML = `
        <div class="review-line"><strong>Nom</strong><span>${escapeHTML(d.customerName)}</span></div>
        <div class="review-line"><strong>WhatsApp</strong><span>${escapeHTML(d.whatsappNumber)}</span></div>
        <div class="review-line"><strong>Type</strong><span>${escapeHTML(d.siteType)}</span></div>
        <div class="review-line"><strong>Détails</strong><span>${escapeHTML(d.details)}</span></div>
    `;
    $("orderFormFields").style.display = "none";
    $("orderReview").style.display = "block";
}

function backToOrderForm() {
    $("orderReview").style.display = "none";
    $("orderFormFields").style.display = "block";
}

/* ---------- requests storage ---------- */

function getOrders() { return readLocal("med_orders"); }
function saveOrdersLocal(x) { writeLocal("med_orders", x); }

async function saveOrderToFirebase(order) {
    const id = String(Date.now() + Math.floor(Math.random() * 1000));
    const finalOrder = { ...order, id };

    const local = getOrders();
    local.unshift(finalOrder);
    saveOrdersLocal(local);

    if (cloudAvailable()) {
        await db.collection("orders").doc(id).set(finalOrder);
    }
    return finalOrder;
}

async function loadOrdersFromFirebase() {
    if (!cloudAvailable()) { renderAdminOrders(); return; }
    try {
        const snapshot = await db.collection("orders").orderBy("createdAt", "desc").get();
        saveOrdersLocal(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    } catch (error) {
        console.error("Firebase orders error:", error);
    }
    renderAdminOrders();
}

async function confirmAndSendOrder() {
    const d = window.currentOrderDraft;
    if (!d) return;

    const button = document.querySelector("#orderReview .primary-btn");
    try {
        if (button) { button.disabled = true; button.textContent = "جاري حفظ الطلب..."; }
        const o = await saveOrderToFirebase(d);
        closeOrder();
        window.currentOrderDraft = null;
        alert("تم إرسال طلبك بنجاح.\nرقم الطلب: #" + o.id + "\nسنتواصل معك قريبًا.");
        if (isAdmin()) renderAdminOrders();
    } catch (error) {
        console.error("Order save error:", error);
        alert("حدث خطأ أثناء حفظ الطلب. حاول مرة أخرى.");
    } finally {
        if (button) { button.disabled = false; button.textContent = "تأكيد الطلب"; }
    }
}

function whatsapp() { window.open("https://wa.me/" + WHATSAPP_NUMBER, "_blank"); }

/* ---------- login ---------- */

function openLogin() {
    $("loginModal").classList.add("show");
    $("loginMessage").textContent = "";
}
function closeLogin() { $("loginModal").classList.remove("show"); }

async function sha256(t) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t));
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function ensureAdminPassword() {
    if (!localStorage.getItem("med_admin_password_hash")) {
        localStorage.setItem("med_admin_password_hash", DEFAULT_ADMIN_PASSWORD_HASH);
    }
}

async function login() {
    const u = $("usernameInput").value.trim();
    const p = $("passwordInput").value;
    const m = $("loginMessage");

    if (!u || !p) { m.textContent = "يرجى إدخال البيانات."; return; }

    ensureAdminPassword();

    if (u === ADMIN_USERNAME && await sha256(p) === localStorage.getItem("med_admin_password_hash")) {
        localStorage.setItem("med_logged_in", "true");
        localStorage.setItem("med_role", "admin");
        closeLogin();
        updateLoginUI();
        alert("تم تسجيل الدخول كـ Admin.");
        return;
    }
    m.textContent = "بيانات الدخول غير صحيحة.";
}

function isLoggedIn() { return localStorage.getItem("med_logged_in") === "true"; }
function isAdmin() { return isLoggedIn() && localStorage.getItem("med_role") === "admin"; }

function updateLoginUI() {
    const l = $("loginButton"), a = $("adminButton"), o = $("logoutButton");
    if (l) l.style.display = isLoggedIn() ? "none" : "inline-block";
    if (a) a.style.display = isAdmin() ? "inline-block" : "none";
    if (o) o.style.display = isLoggedIn() ? "inline-block" : "none";
}

function logout() {
    localStorage.removeItem("med_logged_in");
    localStorage.removeItem("med_role");
    updateLoginUI();
    show("home");
}

function openAdminDashboard() {
    if (isAdmin()) show("adminDashboard");
    else alert("غير مسموح.");
}

function openAdminTab(id, b) {
    document.querySelectorAll(".admin-content").forEach(x => x.classList.remove("active"));
    document.querySelectorAll(".admin-tab").forEach(x => x.classList.remove("active"));
    $(id).classList.add("active");
    b.classList.add("active");
    if (id === "ordersAdmin") renderAdminOrders();
    if (id === "portfolioAdmin") renderAdminPortfolio();
}

/* ---------- image upload ---------- */

function fileToDataURL(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

async function uploadImageToFirebase(file, folder) {
    if (!cloudAvailable() || !storage) return await fileToDataURL(file);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ref = storage.ref(folder + "/" + Date.now() + "_" + safeName);
    await ref.put(file);
    return await ref.getDownloadURL();
}

/* ---------- portfolio ---------- */

function getPortfolio() { return readLocal("med_portfolio"); }
function savePortfolio(x) { writeLocal("med_portfolio", x); }

async function addPortfolioProject() {
    if (!isAdmin()) return;

    const name = $("portfolioName").value.trim();
    const description = $("portfolioDescription").value.trim();
    const url = $("portfolioUrl").value.trim();
    const year = $("portfolioYear").value.trim();
    const file = $("portfolioImageFile").files[0];

    if (!name) { alert("أدخل اسم المشروع."); return; }

    let image = $("portfolioImageUrl").value.trim();
    if (file) image = await uploadImageToFirebase(file, "portfolio");

    const ps = getPortfolio();
    const project = {
        id: Date.now(), name, description, url, year, image,
        visible: true, positionOrder: ps.length + 1
    };

    ps.push(project);
    savePortfolio(ps);

    if (cloudAvailable()) {
        try { await db.collection("portfolio").doc(String(project.id)).set(project); }
        catch (error) { console.error(error); }
    }

    ["portfolioName", "portfolioDescription", "portfolioUrl", "portfolioYear", "portfolioImageUrl"]
        .forEach(id => $(id).value = "");
    $("portfolioImageFile").value = "";

    renderPortfolio();
    renderAdminPortfolio();
    alert("تمت إضافة المشروع.");
}

async function loadPortfolioFromFirebase() {
    if (!cloudAvailable()) { renderPortfolio(); return; }
    try {
        const snapshot = await db.collection("portfolio").orderBy("positionOrder").get();
        const projects = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        if (projects.length) savePortfolio(projects);
    } catch (error) {
        console.error("Portfolio Firebase error:", error);
    }
    renderPortfolio();
    if (isAdmin()) renderAdminPortfolio();
}

function renderPortfolio() {
    const c = $("portfolioContainer");
    if (!c) return;
    c.innerHTML = "";

    const list = getPortfolio()
        .filter(x => x.visible !== false)
        .sort((a, b) => (a.positionOrder || 0) - (b.positionOrder || 0));

    if (!list.length) {
        c.innerHTML = '<p class="admin-note">سيتم عرض أعمالنا قريبًا.</p>';
        return;
    }

    list.forEach(p => {
        const x = document.createElement("article");
        x.className = "portfolio-card";
        x.innerHTML = `
            <img src="${escapeHTML(p.image || "")}" alt="${escapeHTML(p.name)}">
            <div class="portfolio-content">
                <h3>${escapeHTML(p.name)}</h3>
                <p>${escapeHTML(p.description || "")}</p>
                ${p.year ? `<small>${escapeHTML(p.year)}</small>` : ""}
                ${p.url ? `<br><a class="visit-btn" href="${escapeHTML(p.url)}" target="_blank" rel="noopener">VISITER LE SITE →</a>` : ""}
            </div>
        `;
        c.appendChild(x);
    });
}

function renderAdminPortfolio() {
    const c = $("adminPortfolio");
    if (!c || !isAdmin()) return;
    c.innerHTML = "";

    getPortfolio().forEach(p => {
        const x = document.createElement("div");
        x.className = "admin-portfolio-item";
        x.innerHTML = `
            <img src="${escapeHTML(p.image || "")}" alt="">
            <div>
                <strong>${escapeHTML(p.name)}</strong><br>
                <small>${escapeHTML(p.description || "")}</small>
            </div>
            <div class="admin-actions"></div>
        `;
        x.querySelector(".admin-actions").append(
            btn("Edit", "edit-btn", () => editPortfolio(p.id)),
            btn(p.visible !== false ? "Hide" : "Show", "toggle-btn", () => togglePortfolio(p.id)),
            btn("Delete", "delete-btn", () => deletePortfolio(p.id))
        );
        c.appendChild(x);
    });
}

function syncProject(p) {
    if (cloudAvailable()) {
        return db.collection("portfolio").doc(String(p.id)).set(p).catch(console.error);
    }
}

async function editPortfolio(id) {
    const ps = getPortfolio();
    const p = ps.find(x => String(x.id) === String(id));
    if (!p) return;

    const n = prompt("اسم المشروع:", p.name);
    if (n === null) return;
    const d = prompt("الوصف:", p.description || "");
    if (d === null) return;

    p.name = n.trim() || p.name;
    p.description = d.trim();
    savePortfolio(ps);
    await syncProject(p);
    renderPortfolio();
    renderAdminPortfolio();
}

function togglePortfolio(id) {
    const ps = getPortfolio();
    const p = ps.find(x => String(x.id) === String(id));
    if (!p) return;
    p.visible = p.visible === false;
    savePortfolio(ps);
    syncProject(p);
    renderPortfolio();
    renderAdminPortfolio();
}

async function deletePortfolio(id) {
    const ps = getPortfolio();
    const p = ps.find(x => String(x.id) === String(id));
    if (!p || !confirm('حذف "' + p.name + '"؟')) return;

    savePortfolio(ps.filter(x => String(x.id) !== String(id)));

    if (cloudAvailable()) {
        try { await db.collection("portfolio").doc(String(id)).delete(); }
        catch (error) { console.error(error); }
    }
    renderPortfolio();
    renderAdminPortfolio();
}

/* ---------- admin: requests ---------- */

function renderAdminOrders() {
    const c = $("adminOrders");
    if (!c || !isAdmin()) return;

    const os = getOrders();
    c.innerHTML = "";

    if (!os.length) {
        c.innerHTML = '<p class="admin-note">لا توجد طلبات.</p>';
        return;
    }

    os.forEach(o => {
        const x = document.createElement("article");
        x.className = "order-admin-card";
        x.innerHTML = `
            <div class="order-admin-top">
                <div>
                    <strong>#${escapeHTML(o.id)}</strong>
                    <small>${o.createdAt ? new Date(o.createdAt).toLocaleString("fr-TN") : ""}</small>
                </div>
                <select>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>
            <div class="order-admin-details">
                <div><strong>Nom</strong><span>${escapeHTML(o.customerName)}</span></div>
                <div><strong>WhatsApp</strong><span>${escapeHTML(o.whatsappNumber)}</span></div>
                <div><strong>Type</strong><span>${escapeHTML(o.siteType || "")}</span></div>
                <div><strong>Détails</strong><span>${escapeHTML(o.details || "")}</span></div>
            </div>
            <button class="delete-order-btn">حذف الطلب</button>
        `;

        const s = x.querySelector("select");
        s.value = o.status || "pending";

        s.onchange = async () => {
            const a = getOrders();
            const q = a.find(z => String(z.id) === String(o.id));
            if (!q) return;
            q.status = s.value;
            saveOrdersLocal(a);
            if (cloudAvailable()) {
                try { await db.collection("orders").doc(String(o.id)).update({ status: s.value }); }
                catch (error) { console.error(error); }
            }
        };

        x.querySelector(".delete-order-btn").onclick = async () => {
            if (!confirm("حذف الطلب؟")) return;
            saveOrdersLocal(getOrders().filter(z => String(z.id) !== String(o.id)));
            if (cloudAvailable()) {
                try { await db.collection("orders").doc(String(o.id)).delete(); }
                catch (error) { console.error(error); }
            }
            renderAdminOrders();
        };

        c.appendChild(x);
    });
}

/* ---------- admin password ---------- */

async function changeAdminPassword() {
    const c = $("currentAdminPassword").value;
    const n = $("newAdminPassword").value;
    const v = $("confirmAdminPassword").value;

    if (!c || !n || !v) { alert("أكمل الحقول."); return; }
    if (n.length < 8 || n !== v) {
        alert("كلمة السر يجب أن تكون 8 أحرف على الأقل والتأكيد مطابق.");
        return;
    }

    ensureAdminPassword();

    if (await sha256(c) !== localStorage.getItem("med_admin_password_hash")) {
        alert("كلمة السر الحالية غير صحيحة.");
        return;
    }

    localStorage.setItem("med_admin_password_hash", await sha256(n));
    alert("تم تغيير كلمة السر.");
}

/* ---------- translations ---------- */

const translations = {
ar: {
    home: "الرئيسية", services: "خدماتنا", portfolio: "أعمالنا", order: "اطلب موقعك",
    login: "تسجيل الدخول", logout: "تسجيل الخروج",
    heroTitle: "نصنع لك موقعًا احترافيًا يخدم عملك",
    heroText: "MED متخصصة في تصميم وبرمجة المواقع الإلكترونية: مواقع تعريفية، متاجر إلكترونية وصفحات هبوط بتصاميم عصرية وسريعة.",
    orderNow: "اطلب موقعك الآن →",
    servicesTitle: "خدماتنا", servicesText: "كل ما تحتاجه لتكون حاضرًا على الإنترنت.",
    s1t: "موقع تعريفي", s1d: "موقع يعرّف بنشاطك أو شركتك بشكل واضح ومحترف.",
    s2t: "متجر إلكتروني", s2d: "موقع لبيع منتجاتك مع نظام طلبات سهل.",
    s3t: "صفحة هبوط", s3d: "صفحة واحدة مصممة لجذب الزبائن وزيادة الطلبات.",
    s4t: "لوحة تحكم", s4d: "لوحة إدارة لتعديل محتوى موقعك بنفسك.",
    s5t: "تصميم متجاوب", s5d: "مواقع تعمل بشكل ممتاز على الهاتف والحاسوب.",
    s6t: "صيانة وتطوير", s6d: "تحديث وتحسين موقعك الحالي وإضافة ميزات جديدة.",
    portfolioTitle: "أعمالنا", portfolioText: "المواقع والمشاريع التي صنعتها MED.",
    loginTitle: "تسجيل الدخول"
},
fr: {
    home: "Accueil", services: "Services", portfolio: "Réalisations", order: "Demander un site",
    login: "Connexion", logout: "Déconnexion",
    heroTitle: "Nous créons votre site web professionnel",
    heroText: "MED est spécialisée dans la création de sites web : sites vitrines, boutiques en ligne et pages d'atterrissage modernes et rapides.",
    orderNow: "Demander mon site →",
    servicesTitle: "Nos services", servicesText: "Tout ce qu'il faut pour être présent en ligne.",
    s1t: "Site vitrine", s1d: "Un site qui présente clairement votre activité ou votre entreprise.",
    s2t: "Boutique en ligne", s2d: "Un site pour vendre vos produits avec un système de commandes simple.",
    s3t: "Page d'atterrissage", s3d: "Une page unique conçue pour attirer des clients et générer des demandes.",
    s4t: "Tableau de bord", s4d: "Un espace d'administration pour modifier le contenu de votre site.",
    s5t: "Design responsive", s5d: "Des sites qui fonctionnent parfaitement sur mobile et ordinateur.",
    s6t: "Maintenance et évolution", s6d: "Mise à jour et amélioration de votre site existant.",
    portfolioTitle: "Nos réalisations", portfolioText: "Sites et projets créés par MED.",
    loginTitle: "Connexion"
},
en: {
    home: "Home", services: "Services", portfolio: "Portfolio", order: "Request a site",
    login: "Login", logout: "Logout",
    heroTitle: "We build a professional website for your business",
    heroText: "MED specializes in website design and development: business sites, online stores and landing pages that are modern and fast.",
    orderNow: "Request my website →",
    servicesTitle: "Our services", servicesText: "Everything you need to be present online.",
    s1t: "Business website", s1d: "A site that presents your activity or company clearly and professionally.",
    s2t: "Online store", s2d: "A website to sell your products with a simple ordering system.",
    s3t: "Landing page", s3d: "A single page designed to attract customers and increase requests.",
    s4t: "Dashboard", s4d: "An admin panel to edit your website content yourself.",
    s5t: "Responsive design", s5d: "Websites that work perfectly on mobile and desktop.",
    s6t: "Maintenance & upgrades", s6d: "Updating and improving your existing website.",
    portfolioTitle: "Our work", portfolioText: "Websites and projects created by MED.",
    loginTitle: "Login"
}
};

function changeLanguage(l) {
    const d = translations[l] || translations.ar;
    document.querySelectorAll("[data-i18n]").forEach(e => {
        if (d[e.dataset.i18n]) e.textContent = d[e.dataset.i18n];
    });
    document.documentElement.lang = l;
    document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    localStorage.setItem("med_language", l);
}

/* ---------- events ---------- */

document.addEventListener("click", e => {
    if (e.target === $("loginModal")) closeLogin();
    if (e.target === $("orderModal")) closeOrder();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") { closeLogin(); closeOrder(); }
});

/* ---------- start ---------- */

document.addEventListener("DOMContentLoaded", async () => {
    ensureAdminPassword();

    if (!localStorage.getItem("med_orders")) saveOrdersLocal([]);
    if (!localStorage.getItem("med_portfolio")) savePortfolio([]);

    renderPortfolio();
    updateLoginUI();

    const l = localStorage.getItem("med_language") || "ar";
    $("languageSelect").value = l;
    changeLanguage(l);

    if (cloudAvailable()) {
        await loadPortfolioFromFirebase();
        if (isAdmin()) await loadOrdersFromFirebase();
    }
});
