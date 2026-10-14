/* KRIAA STORE + ADMIN — Supabase */
const SUPABASE_URL="https://cytadjhcbqkzafvrlyys.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_BuZF3A3tXdXm4V4RlZxAOA_LDiZvavH";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

let products=[],selectedProduct=null,currentCategory="all",currentUser=null,currentUserIsAdmin=false;
let adminTab="dashboard",adminOrders=[],adminItems=[];
const STATUSES={new:"جديد",processing:"قيد المعالجة",confirmed:"تم التأكيد",shipping:"تم الشحن",delivered:"تم التسليم",cancelled:"ملغى"};
const GOVS={
  Tunis:["Tunis","La Marsa","Carthage","Le Bardo","Sidi Bou Said"],Ariana:["Ariana","Raoued","La Soukra","Ettadhamen","Mnihla"],"Ben Arous":["Ben Arous","Hammam Lif","Hammam Chott","Mornag","Rades"],Manouba:["Manouba","Douar Hicher","Oued Ellil","Tebourba","Djedeida"],Nabeul:["Nabeul","Hammamet","Dar Chaabane","Korba","Kelibia","Menzel Temime"],Zaghouan:["Zaghouan","Zriba","El Fahs","Bir Mcherga"],Bizerte:["Bizerte","Menzel Bourguiba","Mateur","Ras Jebel","Sejnane"],Béja:["Béja","Medjez el Bab","Testour","Nefza","Teboursouk"],Jendouba:["Jendouba","Tabarka","Ain Draham","Bou Salem"],"Le Kef":["Le Kef","Dahmani","Tajerouine","Sakiet Sidi Youssef"],Siliana:["Siliana","Bou Arada","Makthar","Gaafour"],Sousse:["Sousse","Msaken","Hammam Sousse","Akouda","Kalaa Kebira"],Monastir:["Monastir","Moknine","Jemmal","Ksar Hellal","Sahline"],Mahdia:["Mahdia","Ksour Essef","Chebba","El Jem","Mellouleche"],Sfax:["Sfax","Sakiet Ezzit","Sakiet Eddaier","Gremda","El Ain","Agareb"],Kairouan:["Kairouan","Haffouz","Oueslatia","Sbikha","Nasrallah"],Kasserine:["Kasserine","Sbeitla","Foussana","Feriana","Thala"],"Sidi Bouzid":["Sidi Bouzid","Meknassy","Regueb","Jilma","Bir El Hafey"],Gabes:["Gabes","Mareth","Metouia","El Hamma","Chenini"],Medenine:["Medenine","Djerba Midoun","Houmt Souk","Zarzis","Ben Gardane"],Tataouine:["Tataouine","Ghomrassen","Remada","Dehiba"],Gafsa:["Gafsa","Metlaoui","Redeyef","Mdhilla","El Guettar"],Tozeur:["Tozeur","Nefta","Degueche","Hazoua"],Kebili:["Kebili","Douz","Souk Lahad","Faouar"]
};

const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function money(v){return `${Number(v||0).toFixed(2)} TND`;}
function toast(msg){alert(msg);}

function show(id){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$(id)?.classList.add("active");$("mainNav")?.classList.remove("open");if(id==="portfolio")loadPortfolio();if(id==="admin")openAdminDashboard();}
function toggleMobileMenu(){$("mainNav")?.classList.toggle("open");}
function setCategory(c){currentCategory=c;document.querySelectorAll(".category-btn").forEach(b=>b.classList.toggle("active",b.dataset.category===c));renderProducts();}

async function isAdmin(){
  if(!currentUser){const r=await sb.auth.getUser();currentUser=r.data?.user||null;}
  if(!currentUser)return false;
  const {data,error}=await sb.rpc("check_is_admin");
  if(error){console.error("check_is_admin",error);return false;}
  return data===true;
}

async function updateUserInterface(){
  currentUserIsAdmin=await isAdmin();
  if($("adminButton"))$("adminButton").style.display=currentUserIsAdmin?"inline-block":"none";
  if($("logoutButton"))$("logoutButton").style.display=currentUser?"inline-block":"none";
  if($("loginButton"))$("loginButton").style.display=currentUser?"none":"inline-block";
}

function openLogin(){$("loginModal")?.classList.add("open");}
function closeLogin(){$("loginModal")?.classList.remove("open");}
async function login(){
  const email=$("loginEmail")?.value.trim(),password=$("loginPassword")?.value,msg=$("loginMessage");
  if(!email||!password){if(msg)msg.textContent="Entrez votre e-mail et votre mot de passe.";return;}
  if(msg)msg.textContent="Connexion en cours…";
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error){if(msg)msg.textContent=error.message;return;}
  currentUser=data.user;await updateUserInterface();closeLogin();show("home");
}
function openSignup(){
  closeLogin();
  let m=$("signupModal");
  if(!m){m=document.createElement("div");m.id="signupModal";m.className="modal";m.innerHTML=`<div class="modal-box"><button class="close-modal" onclick="closeSignup()">×</button><span class="eyebrow">ZOUARI</span><h2>Créer un compte</h2><input id="signupEmail" type="email" placeholder="E-mail"><input id="signupPassword" type="password" placeholder="Mot de passe"><input id="signupPasswordConfirm" type="password" placeholder="Confirmer le mot de passe"><button class="primary-btn full" onclick="signup()">Créer le compte</button><p id="signupMessage"></p><button class="secondary-btn full" onclick="backToLogin()">J'ai déjà un compte</button></div>`;document.body.appendChild(m);}
  m.classList.add("open");
}
function closeSignup(){$("signupModal")?.classList.remove("open");}
function backToLogin(){closeSignup();openLogin();}
async function signup(){
  const email=$("signupEmail")?.value.trim(),p=$("signupPassword")?.value,c=$("signupPasswordConfirm")?.value,msg=$("signupMessage");
  if(!email||!p||!c){msg.textContent="Complétez les informations.";return;} if(p.length<6){msg.textContent="6 caractères minimum.";return;} if(p!==c){msg.textContent="Les mots de passe ne correspondent pas.";return;}
  msg.textContent="Création du compte…";const {data,error}=await sb.auth.signUp({email,password:p});
  if(error){msg.textContent=error.message;return;}
  if(!data.session){msg.textContent="Compte créé. Vérifiez votre e-mail si la confirmation est activée.";return;}
  currentUser=data.user;await updateUserInterface();closeSignup();show("home");toast("Compte créé avec succès");
}
async function logout(){await sb.auth.signOut();currentUser=null;currentUserIsAdmin=false;await updateUserInterface();show("home");}

async function loadProducts(){
  const {data,error}=await sb.from("products").select("*").eq("active",true).order("position",{ascending:true}).order("created_at",{ascending:false});
  if(error){console.error(error);$("productsContainer").innerHTML="<p>Erreur de chargement des produits.</p>";return;}products=data||[];renderProducts();
}

/* (ancien formulaire de commande en popup — conservé, non utilisé par les cartes) */
function populateGovernorates(){const s=$("orderGovernorate");if(!s)return;s.innerHTML='<option value="">Gouvernorat</option>'+Object.keys(GOVS).map(g=>`<option value="${esc(g)}">${esc(g)}</option>`).join("");s.onchange=()=>populateCities(s.value);}
function populateCities(g){const s=$("orderCity");if(!s)return;s.innerHTML='<option value="">Ville</option>'+(GOVS[g]||[]).map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join("");}
function openOrder(id){
  selectedProduct=products.find(p=>p.id===id);if(!selectedProduct)return;
  $("orderTitle").textContent="Commande : "+selectedProduct.name;$("orderSummary").textContent=`Prix : ${money(selectedProduct.price)}`;
  $("orderSize").innerHTML='<option value="">Taille</option>'+(selectedProduct.sizes||["S","M","L","XL","XXL"]).map(x=>`<option>${esc(x)}</option>`).join("");
  $("orderColor").innerHTML='<option value="">Couleur</option>'+(selectedProduct.colors||[]).map(x=>`<option>${esc(x)}</option>`).join("");
  $("orderQuantity").max=selectedProduct.stock||1;$("orderQuantity").value=1;$("orderMessage").textContent="";populateGovernorates();$("orderCity").innerHTML='<option value="">Ville</option>';$('orderModal').classList.add("open");
}
function closeOrder(){$("orderModal")?.classList.remove("open");}
async function submitOrder(){
  if(!selectedProduct)return;

  const name=$("orderUsername").value.trim();
  const size=$("orderSize").value;
  const color=$("orderColor").value;
  const qty=Math.max(1,Number($("orderQuantity").value||1));
  const whatsapp=$("orderWhatsApp").value.trim();
  const gov=$("orderGovernorate").value;
  const city=$("orderCity").value;
  const msg=$("orderMessage");

  if(!name||!size||!whatsapp||!gov||!city){
    msg.textContent="Complétez les informations obligatoires.";
    return;
  }

  if(selectedProduct.stock<qty){
    msg.textContent="Quantité demandée non disponible.";
    return;
  }

  msg.textContent="Envoi de la commande…";

  const orderId=(window.crypto&&typeof crypto.randomUUID==="function")
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
        const r=Math.random()*16|0;
        const v=c==="x"?r:(r&3|8);
        return v.toString(16);
      });

  const total=Number(selectedProduct.price)*qty+SHIPPING_FEE;

  const {error:orderError}=await sb.from("orders").insert({
    id:orderId,
    customer_name:name,
    whatsapp,
    governorate:gov,
    city,
    total,
    user_id:currentUser?.id||null
  });

  if(orderError){
    console.error("ORDER ERROR:",orderError);
    msg.textContent="Impossible d'envoyer la commande : "+orderError.message;
    return;
  }

  const {error:itemError}=await sb.from("order_items").insert({
    order_id:orderId,
    product_id:selectedProduct.id,
    product_name:selectedProduct.name,
    size,
    quantity:qty,
    price:Number(selectedProduct.price),
    color:color||null
  });

  if(itemError){
    console.error("ORDER ITEM ERROR:",itemError);
    msg.textContent="La commande est créée mais les détails du produit n'ont pas pu être enregistrés.";
    return;
  }

  const {data:stockOk,error:stockError}=await sb.rpc(
    "decrement_product_stock",
    {p_product_id:selectedProduct.id,p_quantity:qty}
  );

  if(stockError){
    console.error("STOCK ERROR:",stockError);
  }

  if(stockOk===false){
    console.warn("Stock was not decremented because quantity was no longer available.");
  }

  msg.textContent="Votre commande a bien été envoyée !";
  setTimeout(closeOrder,1200);
  loadProducts();
}

/* ======================= ADMIN (inchangé) ======================= */
async function openAdminDashboard(){if(!currentUser){openLogin();return;}currentUserIsAdmin=await isAdmin();if(!currentUserIsAdmin){toast("Accès refusé");show("home");return;}showAdminPage();switchAdminTab(adminTab||"dashboard");}
function showAdminPage(){document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));$("admin")?.classList.add("active");}
function switchAdminTab(tab){if(!currentUserIsAdmin){openAdminDashboard();return;}adminTab=tab;document.querySelectorAll(".admin-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));const titles={dashboard:"Dashboard",products:"CLOTHES / المنتجات",orders:"ORDERS / الطلبات",portfolioAdmin:"PORTFOLIO",settings:"SETTINGS"};$("adminTitle").textContent=titles[tab]||"Dashboard";if(tab==="dashboard")renderDashboard();if(tab==="products")renderProductsAdmin();if(tab==="orders")renderOrdersAdmin();if(tab==="portfolioAdmin")renderPortfolioAdmin();if(tab==="settings")renderSettingsAdmin();}

async function getOrders(){const {data,error}=await sb.from("orders").select("*").order("created_at",{ascending:false});if(error)throw error;return data||[];}
async function getOrderItems(){const {data,error}=await sb.from("order_items").select("*");if(error)throw error;return data||[];}
async function renderDashboard(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل الإحصائيات...</div>';
  try{const orders=await getOrders(),items=await getOrderItems();const activeProducts=(await sb.from("products").select("id,stock",{count:"exact"}).eq("active",true)).data||[];const today=new Date();today.setHours(0,0,0,0);const todayOrders=orders.filter(o=>new Date(o.created_at)>=today);const sales=orders.filter(o=>o.status!=="cancelled").reduce((s,o)=>s+Number(o.total||0),0);const low=activeProducts.filter(p=>Number(p.stock)<=5).length;const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()-i);const next=new Date(d);next.setDate(d.getDate()+1);days.push({label:`${d.getDate()}/${d.getMonth()+1}`,count:orders.filter(o=>new Date(o.created_at)>=d&&new Date(o.created_at)<next).length,sales:orders.filter(o=>o.status!=="cancelled"&&new Date(o.created_at)>=d&&new Date(o.created_at)<next).reduce((s,o)=>s+Number(o.total||0),0)});}const max=Math.max(1,...days.map(d=>d.count));
    el.innerHTML=`<div class="stats-grid"><div class="stat-card"><small>الطلبات اليوم</small><strong>${todayOrders.length}</strong></div><div class="stat-card"><small>إجمالي الطلبات</small><strong>${orders.length}</strong></div><div class="stat-card"><small>المبيعات</small><strong>${sales.toFixed(2)}</strong><small>TND</small></div><div class="stat-card"><small>المنتجات</small><strong>${activeProducts.length}</strong></div><div class="stat-card"><small>قليلة المخزون</small><strong>${low}</strong></div></div><div class="admin-grid"><div class="admin-box"><h3>الطلبات — آخر 7 أيام</h3><div class="chart">${days.map(d=>`<div class="bar-wrap"><strong>${d.count}</strong><div class="bar" style="height:${Math.max(3,d.count/max*160)}px"></div><span class="bar-label">${d.label}</span></div>`).join("")}</div></div><div class="admin-box"><h3>المبيعات — آخر 7 أيام</h3><div class="chart">${days.map(d=>{const mx=Math.max(1,...days.map(x=>x.sales));return `<div class="bar-wrap"><strong>${d.sales.toFixed(0)}</strong><div class="bar" style="height:${Math.max(3,d.sales/mx*160)}px"></div><span class="bar-label">${d.label}</span></div>`}).join("")}</div></div></div><div class="admin-box"><h3>آخر الطلبات</h3>${orders.slice(0,5).map(orderRowCompact).join("")||'<div class="empty">لا توجد طلبات</div>'}</div>`;
  }catch(e){console.error(e);el.innerHTML=`<div class="admin-box"><p>تعذر تحميل Dashboard.</p><small>${esc(e.message)}</small></div>`;}
}
function orderRowCompact(o){return `<div class="product-admin-row"><div><span class="status-badge status-${esc(o.status)}">${STATUSES[o.status]||esc(o.status)}</span></div><div><b>${esc(o.customer_name)}</b><br><small>${esc(o.governorate||"")} — ${esc(o.city||"")} · ${money(o.total)}</small></div><button class="mini-btn" onclick="switchAdminTab('orders')">فتح</button></div>`;}

async function renderProductsAdmin(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل المنتجات...</div>';const {data,error}=await sb.from("products").select("*").order("position",{ascending:true}).order("created_at",{ascending:false});if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}
  const list=data||[];el.innerHTML=`<div class="admin-top-actions"><button class="primary-btn" onclick="openProductEditor()">＋ إضافة منتج جديد</button></div><div class="admin-box"><h3>المنتجات (${list.length})</h3>${list.map((p,i)=>`<div class="product-admin-row"><img src="${esc(p.image_url||'https://placehold.co/100x100?text=KRIAA')}" alt=""><div><b>${esc(p.name)}</b> ${p.badge?`<span class="badge">${esc(p.badge)}</span>`:""}<br><small>${money(p.price)} · Stock: ${p.stock} · ${p.active?'ظاهر':'مخفي'} ${p.featured?'· ★ Featured':''}</small></div><div class="admin-actions"><button onclick="openProductEditor('${p.id}')">✏️</button><button onclick="toggleProduct('${p.id}',${!p.active})">${p.active?'👁️':'🙈'}</button><button onclick="moveProduct('${p.id}',-1)">↑</button><button onclick="moveProduct('${p.id}',1)">↓</button><button class="danger" onclick="deleteProduct('${p.id}')">🗑️</button></div></div>`).join("")||'<div class="empty">لا توجد منتجات.</div>'}</div>`;
}
function closeEditor(){$("editorModal")?.classList.remove("open");}
async function openProductEditor(id=null){
  const p=id?(await sb.from("products").select("*").eq("id",id).single()).data:null;selectedProduct=p;const x=p||{name:"",description:"",price:0,old_price:"",category:"tshirts",sizes:["S","M","L","XL","XXL"],colors:[],stock:0,image_url:"",badge:"",featured:false,active:true,position:0};
  $("editorContent").innerHTML=`<span class="eyebrow">KRIAA CLOTHES</span><h2>${id?'تعديل المنتج':'إضافة منتج'}</h2><div class="admin-form"><div class="form-grid"><input id="pName" value="${esc(x.name)}" placeholder="اسم المنتج"><select id="pCategory"><option value="tshirts">T-SHIRTS</option><option value="hoodies">HOODIES</option><option value="autres">AUTRES</option></select><input id="pPrice" type="number" step="0.01" value="${x.price??0}" placeholder="السعر"><input id="pOldPrice" type="number" step="0.01" value="${x.old_price??''}" placeholder="السعر القديم"><input id="pBadge" value="${esc(x.badge||'')}" placeholder="Badge: NEW / SALE / LIMITED"><input id="pStock" type="number" min="0" value="${x.stock??0}" placeholder="Stock"><input id="pSizes" class="form-full" value="${esc((x.sizes||[]).join(', '))}" placeholder="المقاسات: S, M, L, XL, XXL"><input id="pColors" class="form-full" value="${esc((x.colors||[]).join(', '))}" placeholder="الألوان: Black, White, Red"><textarea id="pDescription" class="form-full" rows="4" placeholder="وصف المنتج">${esc(x.description||'')}</textarea><input id="pImageUrl" class="form-full" value="${esc(x.image_url||'')}" placeholder="رابط الصورة أو ارفع صورة أسفل"><input id="pImageFile" class="form-full" type="file" accept="image/*"><label class="checkbox-row"><input id="pFeatured" type="checkbox" ${x.featured?'checked':''}> Featured</label><label class="checkbox-row"><input id="pActive" type="checkbox" ${x.active!==false?'checked':''}> إظهار المنتج</label></div><button class="primary-btn full" onclick="saveProduct('${id||''}')">حفظ المنتج</button></div>`;$("editorModal").classList.add("open");$("pCategory").value=x.category||"autres";
}
async function uploadImage(file,bucket){if(!file)return null;const ext=(file.name.split('.').pop()||'jpg').toLowerCase();const path=`${Date.now()}-${crypto.randomUUID()}.${ext}`;const {error}=await sb.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;}
async function saveProduct(id){try{const file=$("pImageFile").files[0];let image=$("pImageUrl").value.trim();if(file)image=await uploadImage(file,'product-images');const payload={name:$("pName").value.trim(),description:$("pDescription").value.trim(),price:Number($("pPrice").value||0),old_price:$("pOldPrice").value?Number($("pOldPrice").value):null,category:$("pCategory").value,sizes:$("pSizes").value.split(',').map(x=>x.trim()).filter(Boolean),colors:$("pColors").value.split(',').map(x=>x.trim()).filter(Boolean),stock:Math.max(0,Number($("pStock").value||0)),badge:$("pBadge").value.trim(),featured:$("pFeatured").checked,active:$("pActive").checked,image_url:image};let r=id?await sb.from("products").update(payload).eq("id",id):await sb.from("products").insert(payload);if(r.error)throw r.error;closeEditor();toast("تم حفظ المنتج");renderProductsAdmin();loadProducts();}catch(e){console.error(e);toast("تعذر حفظ المنتج: "+e.message);}}
async function deleteProduct(id){if(!confirm("حذف المنتج؟"))return;const {error}=await sb.from("products").delete().eq("id",id);if(error){toast("تعذر الحذف: "+error.message);return;}renderProductsAdmin();loadProducts();}
async function toggleProduct(id,active){const {error}=await sb.from("products").update({active}).eq("id",id);if(error)toast(error.message);else renderProductsAdmin();}
async function moveProduct(id,direction){const {data}=await sb.from("products").select("id,position").order("position",{ascending:true});const i=(data||[]).findIndex(x=>x.id===id),j=i+direction;if(i<0||j<0||j>=data.length)return;const a=data[i],b=data[j];await sb.from("products").update({position:b.position}).eq("id",a.id);await sb.from("products").update({position:a.position}).eq("id",b.id);renderProductsAdmin();loadProducts();}

async function renderOrdersAdmin(){
  const el=$("adminContent");el.innerHTML='<div class="loading-box">جاري تحميل الطلبات...</div>';try{adminOrders=await getOrders();adminItems=await getOrderItems();drawOrdersTable();}catch(e){console.error(e);el.innerHTML=`<div class="admin-box"><p>تعذر تحميل الطلبات.</p><small>${esc(e.message)}</small></div>`;}
}
function drawOrdersTable(){const el=$("adminContent");const q=($("orderSearch")?.value||"").toLowerCase();const f=$("orderFilter")?.value||"all";const list=adminOrders.filter(o=>(f==="all"||o.status===f)&&(!q||`${o.customer_name} ${o.whatsapp} ${o.city} ${o.governorate}`.toLowerCase().includes(q)));el.innerHTML=`<div class="admin-box"><div class="admin-filters"><input id="orderSearch" value="${esc(q)}" oninput="drawOrdersTable()" placeholder="ابحث عن طلب / اسم / رقم"><select id="orderFilter" onchange="drawOrdersTable()"><option value="all">كل الحالات</option>${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}" ${f===k?'selected':''}>${v}</option>`).join("")}</select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>العميل</th><th>المنتج</th><th>المقاس</th><th>اللون</th><th>الكمية</th><th>المكان</th><th>التاريخ</th><th>الحالة</th><th>WhatsApp</th><th>إجراء</th></tr></thead><tbody>${list.map(o=>{const its=adminItems.filter(i=>i.order_id===o.id);return `<tr><td><b>${esc(o.customer_name)}</b><br><small>${esc(o.whatsapp)}</small></td><td>${its.map(i=>esc(i.product_name)).join('<br>')||'-'}</td><td>${its.map(i=>esc(i.size)).join('<br>')||'-'}</td><td>${its.map(i=>esc(i.color||'-')).join('<br>')||'-'}</td><td>${its.map(i=>i.quantity).join('<br>')||'-'}</td><td>${esc(o.governorate||'')}<br>${esc(o.city||'')}</td><td>${new Date(o.created_at).toLocaleString('fr-TN')}</td><td><select onchange="changeOrderStatus('${o.id}',this.value)">${Object.entries(STATUSES).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v}</option>`).join("")}</select></td><td><a class="whatsapp" target="_blank" href="https://wa.me/${encodeURIComponent(String(o.whatsapp).replace(/\D/g,''))}">فتح</a></td><td><button class="mini-btn" onclick="archiveOrder('${o.id}',${!o.archived})">${o.archived?'إلغاء الأرشفة':'أرشفة'}</button><button class="mini-btn danger" onclick="deleteOrder('${o.id}')">حذف</button></td></tr>`}).join("")||'<tr><td colspan="10" class="empty">لا توجد طلبات مطابقة.</td></tr>'}</tbody></table></div></div>`;}
async function changeOrderStatus(id,status){const {error}=await sb.from("orders").update({status}).eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}
async function archiveOrder(id,archived){const {error}=await sb.from("orders").update({archived}).eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}
async function deleteOrder(id){if(!confirm("حذف الطلب نهائيًا؟"))return;const {error}=await sb.from("orders").delete().eq("id",id);if(error)toast(error.message);else renderOrdersAdmin();}

async function loadPortfolio(){const {data,error}=await sb.from("portfolio").select("*").eq("active",true).order("position",{ascending:true});const el=$("portfolioContainer");if(!el)return;if(error){el.innerHTML="<p>Impossible de charger le portfolio.</p>";return;}el.innerHTML=(data||[]).map(p=>`<article class="portfolio-card">${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.title)}">`:''}<div class="p-body"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p></div></article>`).join("")||'<p>Aucune création pour le moment.</p>';}
async function renderPortfolioAdmin(){const {data,error}=await sb.from("portfolio").select("*").order("position",{ascending:true});const el=$("adminContent");if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}el.innerHTML=`<div class="admin-top-actions"><button class="primary-btn" onclick="openPortfolioEditor()">＋ إضافة صورة</button></div><div class="admin-box">${(data||[]).map(p=>`<div class="product-admin-row"><img src="${esc(p.image_url||'https://placehold.co/100x100?text=KRIAA')}" alt=""><div><b>${esc(p.title)}</b><br><small>${esc(p.description)}</small></div><div class="admin-actions"><button onclick="openPortfolioEditor('${p.id}')">✏️</button><button onclick="togglePortfolio('${p.id}',${!p.active})">${p.active?'👁️':'🙈'}</button><button class="danger" onclick="deletePortfolio('${p.id}')">🗑️</button></div></div>`).join("")||'<div class="empty">لا توجد صور.</div>'}</div>`;}
async function openPortfolioEditor(id=null){const p=id?(await sb.from("portfolio").select("*").eq("id",id).single()).data:null;const x=p||{title:'',description:'',image_url:'',active:true,position:0};$("editorContent").innerHTML=`<span class="eyebrow">PORTFOLIO</span><h2>${id?'تعديل الصورة':'إضافة صورة'}</h2><div class="admin-form"><input id="pfTitle" value="${esc(x.title)}" placeholder="العنوان"><textarea id="pfDescription" rows="4" placeholder="الوصف">${esc(x.description)}</textarea><input id="pfUrl" value="${esc(x.image_url||'')}" placeholder="رابط الصورة"><input id="pfFile" type="file" accept="image/*"><label class="checkbox-row"><input id="pfActive" type="checkbox" ${x.active!==false?'checked':''}> إظهار</label><button class="primary-btn full" onclick="savePortfolio('${id||''}')">حفظ</button></div>`;$("editorModal").classList.add("open");}
async function savePortfolio(id){try{const f=$("pfFile").files[0];let url=$("pfUrl").value.trim();if(f)url=await uploadImage(f,'portfolio-images');const payload={title:$("pfTitle").value.trim(),description:$("pfDescription").value.trim(),image_url:url,active:$("pfActive").checked};const r=id?await sb.from("portfolio").update(payload).eq("id",id):await sb.from("portfolio").insert(payload);if(r.error)throw r.error;closeEditor();renderPortfolioAdmin();loadPortfolio();}catch(e){toast("تعذر حفظ الصورة: "+e.message);}}
async function togglePortfolio(id,active){const {error}=await sb.from("portfolio").update({active}).eq("id",id);if(error)toast(error.message);else renderPortfolioAdmin();}
async function deletePortfolio(id){if(!confirm("حذف الصورة؟"))return;const {error}=await sb.from("portfolio").delete().eq("id",id);if(error)toast(error.message);else renderPortfolioAdmin();}

async function renderSettingsAdmin(){const {data,error}=await sb.from("store_settings").select("*").eq("id",1).single();const el=$("adminContent");if(error){el.innerHTML=`<div class="admin-box">${esc(error.message)}</div>`;return;}const s=data||{};el.innerHTML=`<div class="admin-box"><h3>إعدادات المتجر</h3><div class="admin-form"><div class="form-grid"><input id="sName" value="${esc(s.store_name||'KRIAA')}" placeholder="اسم المتجر"><input id="sCurrency" value="${esc(s.currency||'TND')}" placeholder="العملة"><input id="sLogo" class="form-full" value="${esc(s.logo_url||'')}" placeholder="رابط Logo"><input id="sLogoFile" class="form-full" type="file" accept="image/*"><input id="sSizes" class="form-full" value="${esc((s.default_sizes||[]).join(', '))}" placeholder="المقاسات الافتراضية"><input id="sColors" class="form-full" value="${esc((s.default_colors||[]).join(', '))}" placeholder="الألوان الافتراضية"><textarea id="sDelivery" class="form-full" rows="3" placeholder="إعدادات التوصيل">${esc(s.delivery_text||'')}</textarea><textarea id="sOrder" class="form-full" rows="3" placeholder="إعدادات الطلب">${esc(s.order_text||'')}</textarea></div><button class="primary-btn full" onclick="saveSettings()">حفظ الإعدادات</button></div></div><div class="admin-box"><h3>الحساب</h3><p>${esc(currentUser?.email||'')}</p><button class="secondary-btn" onclick="logout()">تسجيل الخروج</button></div>`;}
async function saveSettings(){try{const f=$("sLogoFile").files[0];let logo=$("sLogo").value.trim();if(f)logo=await uploadImage(f,'store-assets');const payload={store_name:$("sName").value.trim()||'KRIAA',currency:$("sCurrency").value.trim()||'TND',logo_url:logo,default_sizes:$("sSizes").value.split(',').map(x=>x.trim()).filter(Boolean),default_colors:$("sColors").value.split(',').map(x=>x.trim()).filter(Boolean),delivery_text:$("sDelivery").value.trim(),order_text:$("sOrder").value.trim(),updated_at:new Date().toISOString()};const {error}=await sb.from("store_settings").upsert({...payload,id:1});if(error)throw error;toast("تم حفظ الإعدادات");loadSettings();}catch(e){toast("تعذر حفظ الإعدادات: "+e.message);}}

sb.auth.onAuthStateChange((_event,session)=>{setTimeout(async()=>{currentUser=session?.user||null;currentUserIsAdmin=await isAdmin();await updateUserInterface();},0);});
sb.channel("kriaa-orders").on("postgres_changes",{event:"*",schema:"public",table:"orders"},()=>{if(currentUserIsAdmin&&adminTab) {if(adminTab==='dashboard')renderDashboard();if(adminTab==='orders')renderOrdersAdmin();}}).subscribe();

(async function start(){try{const {data}=await sb.auth.getUser();currentUser=data?.user||null;currentUserIsAdmin=await isAdmin();}catch(e){console.error(e);}populateGovernorates();await loadSettings();await loadProducts();await loadPortfolio();await updateUserInterface();})();

/* =====================================================================
   KRIAA — PAGE PRODUIT + COMMANDE DIRECTE
   ===================================================================== */

// Frais de livraison ajoutés au total de chaque commande (en DT)
const SHIPPING_FEE = 8;
const DELIVERY_TEXT = "Livraison en 48h · 8 DT";

// La table orders n'a pas de colonne "adresse". Si vous en ajoutez une (ex: "address"), mettez son nom ici.
// Sinon l'adresse est ajoutée à la colonne city sous la forme "Ville — Rue…" (visible dans l'Admin).
const KRIAA_ADDRESS_COLUMN = null;

let storeSettings = {};
let draft = { product: null, size: "", color: "", qty: 1 };
let kxImgs = [], kxLbIndex = 0;

/* ---------- helpers ---------- */
function kxList(v){
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
  return [];
}
function kxPrice(v){
  const n = Number(v || 0), cur = storeSettings.currency || "TND";
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ${cur === "TND" ? "DT" : cur}`;
}
/* Images du produit : 3 maximum, uniquement celles qui existent.
   Sources : image_url (une ou plusieurs URL séparées par virgule/espace/retour ligne) + colonne "images" si elle existe. */
function productImages(p){
  let a = [];
  if (p.image_url) a = a.concat(String(p.image_url).split(/[\s,]+/));
  if (Array.isArray(p.images)) a = a.concat(p.images);
  else if (typeof p.images === "string" && p.images.trim()) {
    let extra = [];
    try { extra = JSON.parse(p.images); } catch(e){ extra = p.images.split(/[\s,]+/); }
    if (Array.isArray(extra)) a = a.concat(extra);
  }
  a = [...new Set(a.map(x => String(x || "").trim()).filter(Boolean))].slice(0, 3);
  return a.length ? a : ["https://placehold.co/900x1100?text=ZOUARI"];
}
function kxHighlights(p){
  const h = p.highlights;
  if (Array.isArray(h)) return h.map(x => String(x).trim()).filter(Boolean);
  if (typeof h === "string") return h.split(/[\n;]/).map(x => x.trim()).filter(Boolean);
  return [];
}

/* ---------- settings ---------- */
async function loadSettings(){
  const {data} = await sb.from("store_settings").select("*").eq("id",1).single();
  if (data) {
    storeSettings = data;
    if ($("heroStoreName")) $("heroStoreName").textContent = "ZOUARI";
    document.title = "ZOUARI";
  }
}

/* ---------- grille boutique : la carte ouvre la page produit ---------- */
function renderProducts(){
  const el = $("productsContainer"); if (!el) return;
  const q = ($("searchInput")?.value || "").trim().toLowerCase();
  const list = products.filter(p => (currentCategory === "all" || p.category === currentCategory) &&
    (!q || (p.name||"").toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q)));
  if (!list.length) { el.innerHTML = "<p>Aucun produit pour le moment.</p>"; return; }
  el.innerHTML = list.map(p => `<article class="product-card kx-rv" onclick="openProduct('${p.id}')">
    <div class="pc-media">${p.badge ? `<span class="badge pc-badge">${esc(p.badge)}</span>` : ""}${p.featured ? '<span class="pc-feat">★</span>' : ""}<img class="product-image" loading="lazy" decoding="async" src="${esc(productImages(p)[0])}" alt="${esc(p.name)}"></div>
    <div class="product-info">
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.description || "")}</p>
      <div class="price">${esc(kxPrice(p.price))} ${p.old_price ? `<span class="old-price">${esc(kxPrice(p.old_price))}</span>` : ""}</div>
      <button type="button" class="product-btn">COMMANDER</button>
    </div></article>`).join("");
  kxReveal();
}

/* ---------- création des sections ---------- */
function ensureKriaaPages(){
  if ($("productPage")) return;
  const f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap";
  document.head.appendChild(f);

  document.querySelector("main").insertAdjacentHTML("beforeend",
    `<section id="productPage" class="page kx" dir="ltr"></section><section id="checkoutPage" class="page kx" dir="ltr"></section>`);

  const lb = document.createElement("div");
  lb.id = "kxLightbox"; lb.className = "kx-lb"; lb.setAttribute("dir","ltr");
  lb.innerHTML = `<button class="kx-lb-x" onclick="kxCloseLightbox()" aria-label="Fermer">×</button>
    <button class="kx-lb-n kx-lb-prev" onclick="kxLbStep(-1)" aria-label="Précédent">‹</button>
    <img id="kxLbImg" alt=""><button class="kx-lb-n kx-lb-next" onclick="kxLbStep(1)" aria-label="Suivant">›</button>
    <div class="kx-lb-c" id="kxLbCount"></div>`;
  document.body.appendChild(lb);

  let sx = 0;
  lb.addEventListener("touchstart", e => { sx = e.changedTouches[0].clientX; }, {passive:true});
  lb.addEventListener("touchend", e => {
    const dx = e.changedTouches[0].clientX - sx;
    if (Math.abs(dx) > 50) kxLbStep(dx < 0 ? 1 : -1);
  }, {passive:true});
  lb.addEventListener("click", e => { if (e.target === lb) kxCloseLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") kxCloseLightbox();
    if (e.key === "ArrowLeft") kxLbStep(-1);
    if (e.key === "ArrowRight") kxLbStep(1);
  });
}

/* ---------- PAGE PRODUIT ---------- */
function openProduct(id){
  const p = products.find(x => x.id === id); if (!p) return;
  selectedProduct = p;
  const colors = kxList(p.colors);
  draft = { product: p, size: "", color: colors.length === 1 ? colors[0] : "", qty: 1 };
  renderProductPage();
  show("productPage");
  window.scrollTo(0, 0);
}

function renderProductPage(){
  const p = draft.product, imgs = productImages(p), sizes = kxList(p.sizes), colors = kxList(p.colors);
  const out = Number(p.stock) <= 0, hl = kxHighlights(p);
  kxImgs = imgs;

  $("productPage").innerHTML = `<div class="kx-wrap">
  <button class="kx-back" onclick="show('shop')">← BOUTIQUE</button>
  <div class="kx-layout">
    <div class="kx-gallery">
      <div class="kx-track" id="kxTrack" onscroll="kxGalleryScroll()">
        ${imgs.map((s,i) => `<div class="kx-slide"><img src="${esc(s)}" alt="${esc(p.name)}" loading="${i ? "lazy" : "eager"}" onclick="kxOpenLightbox(${i})"></div>`).join("")}
      </div>
      ${imgs.length > 1 ? `<button class="kx-arrow kx-arrow-l" onclick="kxGo(-1)" aria-label="Précédent">‹</button><button class="kx-arrow kx-arrow-r" onclick="kxGo(1)" aria-label="Suivant">›</button>
      <div class="kx-dots" id="kxDots">${imgs.map((_,i) => `<span class="kx-dot${i === 0 ? " on" : ""}"></span>`).join("")}</div>` : ""}
    </div>

    <div class="kx-info">
      ${p.badge ? `<span class="kx-badge">${esc(p.badge)}</span>` : ""}
      <h1 class="kx-name">${esc(p.name)}</h1>
      <div class="kx-prices"><span class="kx-price">${esc(kxPrice(p.price))}</span>${p.old_price && Number(p.old_price) > Number(p.price) ? `<span class="kx-old">${esc(kxPrice(p.old_price))}</span>` : ""}</div>
      ${p.description ? `<p class="kx-desc">${esc(p.description).replace(/\n/g,"<br>")}</p>` : ""}

      ${sizes.length ? `<div class="kx-block"><div class="kx-label">TAILLE</div><div class="kx-opts">
        ${sizes.map(s => `<button type="button" class="kx-opt" data-v="${esc(s)}" onclick="kxPick('size',this)">${esc(s)}</button>`).join("")}</div></div>` : ""}

      ${colors.length > 1 ? `<div class="kx-block"><div class="kx-label">COULEUR</div><div class="kx-opts">
        ${colors.map(c => `<button type="button" class="kx-opt" data-v="${esc(c)}" onclick="kxPick('color',this)">${esc(c)}</button>`).join("")}</div></div>` : ""}

      <div class="kx-block"><div class="kx-label">QUANTITÉ</div>
        <div class="kx-qty"><button type="button" onclick="kxQty(-1)" aria-label="Moins">−</button><span class="kx-qty-v">1</span><button type="button" onclick="kxQty(1)" aria-label="Plus">+</button></div>
      </div>

      <p class="kx-msg" id="kxMsg"></p>
      <button type="button" class="kx-cta" ${out ? "disabled" : ""} onclick="kxOrderNow()">${out ? "ÉPUISÉ" : "COMMANDER"}</button>

      <div class="kx-del"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 6h13v10H1zM14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        <div><div class="kx-label">LIVRAISON</div><div class="kx-del-t">${esc(DELIVERY_TEXT)}</div></div></div>

      ${hl.length ? `<div class="kx-block"><div class="kx-label">HIGHLIGHTS</div><ul class="kx-hl">${hl.map(h => `<li>${esc(h)}</li>`).join("")}</ul></div>` : ""}
    </div>
  </div></div>`;

  document.querySelectorAll("#productPage .kx-opt").forEach(b => {
    const t = b.closest(".kx-block").querySelector(".kx-label").textContent;
    if ((t === "TAILLE" && draft.size === b.dataset.v) || (t === "COULEUR" && draft.color === b.dataset.v)) b.classList.add("on");
  });
}

/* galerie */
function kxGalleryScroll(){
  const t = $("kxTrack"); if (!t || !t.clientWidth) return;
  const i = Math.round(t.scrollLeft / t.clientWidth);
  document.querySelectorAll("#kxDots .kx-dot").forEach((d,k) => d.classList.toggle("on", k === i));
}
function kxGo(d){ const t = $("kxTrack"); if (t) t.scrollBy({left: d * t.clientWidth, behavior: "smooth"}); }
function kxOpenLightbox(i){ kxLbIndex = i; kxLbDraw(); $("kxLightbox").classList.add("open"); document.body.style.overflow = "hidden"; }
function kxCloseLightbox(){ $("kxLightbox").classList.remove("open"); document.body.style.overflow = ""; }
function kxLbStep(d){ if (kxImgs.length < 2) return; kxLbIndex = (kxLbIndex + d + kxImgs.length) % kxImgs.length; kxLbDraw(); }
function kxLbDraw(){
  $("kxLbImg").src = kxImgs[kxLbIndex];
  $("kxLbCount").textContent = kxImgs.length > 1 ? `${kxLbIndex + 1} / ${kxImgs.length}` : "";
  document.querySelectorAll(".kx-lb-n").forEach(b => b.style.display = kxImgs.length > 1 ? "" : "none");
}

/* options + quantité */
function kxPick(type, el){
  draft[type] = el.dataset.v;
  el.parentElement.querySelectorAll(".kx-opt").forEach(b => b.classList.toggle("on", b === el));
  if ($("kxMsg")) $("kxMsg").textContent = "";
}
function kxQty(d){
  const max = Math.max(1, Number(draft.product.stock) || 1);
  draft.qty = Math.min(max, Math.max(1, draft.qty + d));
  document.querySelectorAll(".kx-qty-v").forEach(e => e.textContent = draft.qty);
  if ($("kxCoTotals")) kxCoTotals();
}
function kxValid(){
  const p = draft.product;
  if (Number(p.stock) <= 0) return "Produit épuisé.";
  if (kxList(p.sizes).length && !draft.size) return "Veuillez choisir une taille.";
  if (kxList(p.colors).length > 1 && !draft.color) return "Veuillez choisir une couleur.";
  return "";
}

/* commande directe (pas de panier) */
function kxOrderNow(){
  const err = kxValid();
  if (err) { $("kxMsg").textContent = err; return; }
  openCheckout();
}

/* ---------- COMMANDE ---------- */
function openCheckout(){
  renderCheckout();
  show("checkoutPage");
  window.scrollTo(0, 0);
}

function renderCheckout(){
  const p = draft.product, sizes = kxList(p.sizes), colors = kxList(p.colors), img = productImages(p)[0];
  $("checkoutPage").innerHTML = `<div class="kx-wrap kx-co">
  <button class="kx-back" onclick="show('productPage')">← RETOUR AU PRODUIT</button>
  <div id="kxCoBody">
    <p class="kx-eyebrow">COMMANDE</p>
    <h1 class="kx-title">Finaliser la commande</h1>

    <div class="kx-sum"><img src="${esc(img)}" alt="${esc(p.name)}"><div><h3>${esc(p.name)}</h3><p>${esc(kxPrice(p.price))}</p></div></div>

    <div class="kx-grid">
      ${sizes.length ? `<label class="kx-f"><span>TAILLE *</span><select id="kxCoSize" onchange="draft.size=this.value;kxCoTotals()">
        <option value="">Choisir…</option>${sizes.map(s => `<option ${draft.size === s ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>` : ""}
      ${colors.length > 1 ? `<label class="kx-f"><span>COULEUR *</span><select id="kxCoColor" onchange="draft.color=this.value;kxCoTotals()">
        <option value="">Choisir…</option>${colors.map(c => `<option ${draft.color === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}
      <div class="kx-f"><span>QUANTITÉ</span><div class="kx-qty"><button type="button" onclick="kxQty(-1)" aria-label="Moins">−</button><span class="kx-qty-v">${draft.qty}</span><button type="button" onclick="kxQty(1)" aria-label="Plus">+</button></div></div>
    </div>

    <h2 class="kx-h2">Vos informations</h2>
    <div class="kx-grid">
      <label class="kx-f"><span>PRÉNOM *</span><input id="kxFn" placeholder="Prénom" autocomplete="given-name"></label>
      <label class="kx-f"><span>NOM *</span><input id="kxLn" placeholder="Nom" autocomplete="family-name"></label>
      <label class="kx-f kx-full"><span>TÉLÉPHONE *</span><input id="kxPhone" type="tel" inputmode="tel" placeholder="+216 XX XXX XXX" autocomplete="tel"></label>
      <label class="kx-f"><span>GOUVERNORAT *</span><select id="kxGov" onchange="kxCities(this.value)"><option value="">Choisir…</option>
        ${Object.keys(GOVS).map(g => `<option value="${esc(g)}">${esc(g)}</option>`).join("")}</select></label>
      <label class="kx-f"><span>VILLE *</span><select id="kxCity"><option value="">Choisir…</option></select></label>
      <label class="kx-f kx-full"><span>ADRESSE *</span><input id="kxAddr" placeholder="Rue, ville…" autocomplete="street-address"></label>
    </div>

    <div class="kx-totals" id="kxCoTotals"></div>
    <p class="kx-msg" id="kxCoMsg"></p>
    <button type="button" class="kx-cta" id="kxConfirm" onclick="kxSubmit()">CONFIRMER LA COMMANDE</button>
  </div></div>`;
  kxCoTotals();
}

function kxCities(g){
  $("kxCity").innerHTML = '<option value="">Choisir…</option>' + (GOVS[g] || []).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
}

function kxCoTotals(){
  const el = $("kxCoTotals"); if (!el) return;
  const p = draft.product, sub = Number(p.price) * draft.qty, total = sub + SHIPPING_FEE;
  const row = (a,b) => `<div class="kx-row"><span>${a}</span><b>${b}</b></div>`;
  el.innerHTML =
    row("Produit", esc(p.name)) +
    (kxList(p.sizes).length ? row("Taille", esc(draft.size || "—")) : "") +
    (kxList(p.colors).length ? row("Couleur", esc(draft.color || "—")) : "") +
    row("Quantité", draft.qty) +
    row("Sous-total", esc(kxPrice(sub))) +
    row("Livraison (48h)", esc(kxPrice(SHIPPING_FEE))) +
    `<div class="kx-row kx-total"><span>TOTAL</span><b>${esc(kxPrice(total))}</b></div>`;
}

function kxPhone(v){
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00216")) d = d.slice(2);
  if (d.startsWith("216") && d.length === 11) d = d.slice(3);
  return /^[2-9]\d{7}$/.test(d) ? "216" + d : "";
}

async function kxSubmit(){
  const p = draft.product; if (!p) return;
  const msg = $("kxCoMsg"), btn = $("kxConfirm");
  const fn = $("kxFn").value.trim(), ln = $("kxLn").value.trim(), addr = $("kxAddr").value.trim();
  const gov = $("kxGov").value, city = $("kxCity").value, phone = kxPhone($("kxPhone").value);
  const qty = Math.max(1, Number(draft.qty) || 1);

  if (kxList(p.sizes).length && !draft.size) { msg.textContent = "Veuillez choisir une taille."; return; }
  if (kxList(p.colors).length > 1 && !draft.color) { msg.textContent = "Veuillez choisir une couleur."; return; }
  if (!fn || !ln || !gov || !city || !addr) { msg.textContent = "Veuillez remplir tous les champs obligatoires."; return; }
  if (!phone) { msg.textContent = "Numéro de téléphone invalide (8 chiffres, ex : +216 20 123 456)."; return; }
  if (Number(p.stock) < qty) { msg.textContent = "Quantité demandée non disponible."; return; }

  btn.disabled = true; msg.textContent = "Envoi de la commande…";

  const orderId = (window.crypto && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c === "x" ? r : (r&3|8)).toString(16); });

  // total = prix des articles + 8 DT de livraison
  const total = Number(p.price) * qty + SHIPPING_FEE;

  const orderRow = {
    id: orderId,
    customer_name: `${fn} ${ln}`,
    whatsapp: phone,
    governorate: gov,
    city: KRIAA_ADDRESS_COLUMN ? city : `${city} — ${addr}`,
    total,
    user_id: currentUser?.id || null
  };
  if (KRIAA_ADDRESS_COLUMN) orderRow[KRIAA_ADDRESS_COLUMN] = addr;

  const {error: orderError} = await sb.from("orders").insert(orderRow);
  if (orderError) {
    console.error("ORDER ERROR:", orderError);
    msg.textContent = "Impossible d'envoyer la commande : " + orderError.message;
    btn.disabled = false; return;
  }

  const {error: itemError} = await sb.from("order_items").insert({
    order_id: orderId,
    product_id: p.id,
    product_name: p.name,
    size: draft.size || "",
    quantity: qty,
    price: Number(p.price),
    color: draft.color || null
  });
  if (itemError) {
    console.error("ORDER ITEM ERROR:", itemError);
    msg.textContent = "La commande est créée mais les détails du produit n'ont pas pu être enregistrés.";
    btn.disabled = false; return;
  }

  const {data: stockOk, error: stockError} = await sb.rpc("decrement_product_stock", {p_product_id: p.id, p_quantity: qty});
  if (stockError) console.error("STOCK ERROR:", stockError);
  if (stockOk === false) console.warn("Stock was not decremented because quantity was no longer available.");

  $("kxCoBody").innerHTML = `<div class="kx-ok"><div class="kx-ok-i">✓</div><h1 class="kx-title">Merci</h1>
    <p>Votre commande a bien été envoyée. Nous vous contacterons très bientôt pour la confirmer. Livraison en 48h.</p>
    <button type="button" class="kx-cta" onclick="show('shop')">CONTINUER VOS ACHATS</button></div>`;
  window.scrollTo(0, 0);
  loadProducts();
}

ensureKriaaPages();


/* =====================================================================
   KRIAA — UI (apparition au scroll, marquee, navigation par sections)
   ===================================================================== */
document.documentElement.classList.add("kx-js");

let kxIO = null;
function kxReveal(){
  const els = document.querySelectorAll(".kx-rv:not(.kx-in)");
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("kx-in")); return; }
  if (!kxIO) kxIO = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("kx-in"); kxIO.unobserve(e.target); }
  }), {rootMargin: "0px 0px -6% 0px", threshold: 0.08});
  els.forEach(e => kxIO.observe(e));
}

function kxInitMarquee(){
  const items = ["QUALITÉ PREMIUM", "ZOUARI", "DES DÉTAILS DIFFÉRENTS", "COLLECTION 2026"];
  const set = items.map(t => `<span>${t}</span><i>✦</i>`).join("");
  const group = `<div class="mq-group">${set.repeat(4)}</div>`;
  document.querySelectorAll("[data-marquee]").forEach(m => { m.innerHTML = `<div class="mq-track">${group}${group}</div>`; });
}

function goSection(id){
  show("shop");
  setTimeout(() => { const el = $(id); if (el) el.scrollIntoView({behavior: "smooth", block: "start"}); else window.scrollTo({top: 0, behavior: "smooth"}); }, 60);
}
function goCollection(c){
  show("shop"); setCategory(c);
  setTimeout(() => { const el = $("productsContainer"); if (el) el.scrollIntoView({behavior: "smooth", block: "start"}); }, 80);
}

kxInitMarquee();
kxReveal();