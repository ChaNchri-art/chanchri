import { PRODUCTS_CATALOG } from './products_catalog.js';

  /* =====================================================
     EDIT ME — products. Each needs: id, categoryId (must match a key
     in CATEGORIES), basePrice (your supplier cost — markup is added
     automatically, see computeMarkup()), name{fr,en,ar}, tagline{fr,en,ar}.
     image (optional) — a photo URL; if omitted, the decorative placeholder is shown.
     ===================================================== */  /* EDIT ME — categories matching product catalog */
  const CATEGORIES = {
    sacs:   { fr:"Sacs & Bagages", en:"Bags & Luggage", ar:"حقائب وأمتعة" },
    camping:{ fr:"Camping & Outdoor", en:"Camping & Outdoor", ar:"التخييم والرحلات" },
    decor:  { fr:"Décoration", en:"Decor", ar:"ديكور" },
    maison: { fr:"Maison & Cuisine", en:"Home & Kitchen", ar:"المنزل والمطبخ" },
    jouets: { fr:"Jouets & Enfants", en:"Toys & Kids", ar:"ألعاب وأطفال" },
    auto:   { fr:"Auto & Moto", en:"Auto & Moto", ar:"السيارات والدراجات" },
    tech:   { fr:"High-Tech & Gadgets", en:"Tech & Gadgets", ar:"إلكترونيات وتقنية" },
    sport:  { fr:"Sport & Fitness", en:"Sport & Fitness", ar:"رياضة ولياقة" },
    sante:  { fr:"Beauté & Santé", en:"Beauty & Health", ar:"جمال وصحة" },
    outils: { fr:"Outillage & Bricolage", en:"Tools & DIY", ar:"أدوات وعدة" }
  };

  function getCatalogList() {
    if (typeof window !== "undefined" && window.PRODUCTS_CATALOG && Array.isArray(window.PRODUCTS_CATALOG) && window.PRODUCTS_CATALOG.length) {
      return window.PRODUCTS_CATALOG;
    }
    if (typeof PRODUCTS_CATALOG !== "undefined" && Array.isArray(PRODUCTS_CATALOG) && PRODUCTS_CATALOG.length) {
      return PRODUCTS_CATALOG;
    }
    return [];
  }

  /* Maps a Supabase `products` row into the shape the rest of this file expects
     (same shape as the old static PRODUCTS_CATALOG entries). */
  function mapSupabaseProduct(row) {
    return {
      id: row.id,
      categoryId: row.category_id || 'divers',
      basePrice: row.base_price || 0,
      image: row.image || '',
      images: Array.isArray(row.images) ? row.images : [],
      name: { fr: row.name_fr || '', en: row.name_en || '', ar: row.name_ar || '' },
      tagline: { fr: row.tagline_fr || '', en: row.tagline_en || '', ar: row.tagline_ar || '' },
      description: { fr: row.description_fr || '', en: row.description_en || '', ar: row.description_ar || '' },
      stock: row.stock,
      active: row.active !== false
    };
  }

  let PRODUCTS = getCatalogList();
  let productsSource = 'static'; // 'static' | 'supabase'

  /* Loads the live product catalog from Supabase. Falls back silently to the
     bundled static catalog (already in PRODUCTS) if Supabase is unavailable,
     so the storefront never breaks even if the DB is briefly unreachable. */
  async function loadProductsFromSupabase() {
    if (!window.sb || typeof window.sb.from !== 'function') return;
    try {
      const { data, error } = await window.sb
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (Array.isArray(data) && data.length) {
        PRODUCTS = data.map(mapSupabaseProduct);
        productsSource = 'supabase';
        renderCatalog();
        renderCatFilters();
      }
    } catch (e) {
      console.warn('Could not load live products from Supabase, using bundled catalog instead.', e);
    }
  }

  /* EDIT ME — your markup rules (applied automatically on top of basePrice) */
  function computeMarkup(base){
    if (base < 1000) return 200;
    if (base <= 3000) return 400;
    if (base <= 9000) return 700;
    if (base <= 14000) return 1000;
    if (base <= 20000) return 1200;
    return 1500;
  }
  function sellPrice(p){ return p.basePrice + computeMarkup(p.basePrice); }

  /* EDIT ME — contact info */
  const CONTACT = { whatsappNumber: "213797467013", phoneDisplay: "07 97 46 70 13" };
  const WHATSAPP_NUMBER = CONTACT.whatsappNumber;
  const DEFAULT_WILAYA = "Béchar";

  /* Shipping rates researched from Algerian courier tariff tables (Yalidine-style),
     in DZD. null = not deliverable by that method. EDIT ME if your rates differ. */
  const SHIPPING_RATES = {
    "Adrar":{bureau:900,domicile:1300}, "Chlef":{bureau:500,domicile:900}, "Laghouat":{bureau:600,domicile:1000},
    "Oum El Bouaghi":{bureau:500,domicile:900}, "Batna":{bureau:500,domicile:900}, "Béjaïa":{bureau:500,domicile:900},
    "Biskra":{bureau:600,domicile:1000}, "Béchar":{bureau:900,domicile:1300}, "Blida":{bureau:400,domicile:700},
    "Bouira":{bureau:500,domicile:900}, "Tamanrasset":{bureau:1300,domicile:1700}, "Tébessa":{bureau:500,domicile:1000},
    "Tlemcen":{bureau:500,domicile:900}, "Tiaret":{bureau:500,domicile:900}, "Tizi Ouzou":{bureau:500,domicile:900},
    "Alger":{bureau:400,domicile:500}, "Djelfa":{bureau:500,domicile:950}, "Jijel":{bureau:500,domicile:900},
    "Sétif":{bureau:500,domicile:900}, "Saïda":{bureau:500,domicile:900}, "Skikda":{bureau:500,domicile:900},
    "Sidi Bel Abbès":{bureau:500,domicile:900}, "Annaba":{bureau:500,domicile:900}, "Guelma":{bureau:500,domicile:900},
    "Constantine":{bureau:500,domicile:900}, "Médéa":{bureau:500,domicile:900}, "Mostaganem":{bureau:500,domicile:900},
    "M'Sila":{bureau:500,domicile:900}, "Mascara":{bureau:500,domicile:900}, "Ouargla":{bureau:600,domicile:1000},
    "Oran":{bureau:500,domicile:900}, "El Bayadh":{bureau:800,domicile:1200}, "Illizi":{bureau:1300,domicile:1600},
    "Bordj Bou Arreridj":{bureau:500,domicile:900}, "Boumerdès":{bureau:400,domicile:700}, "El Tarf":{bureau:500,domicile:900},
    "Tindouf":{bureau:1200,domicile:1600}, "Tissemsilt":{bureau:500,domicile:900}, "El Oued":{bureau:600,domicile:1000},
    "Khenchela":{bureau:500,domicile:900}, "Souk Ahras":{bureau:500,domicile:900}, "Tipaza":{bureau:400,domicile:700},
    "Mila":{bureau:500,domicile:900}, "Aïn Defla":{bureau:500,domicile:900}, "Naâma":{bureau:900,domicile:1200},
    "Aïn Témouchent":{bureau:500,domicile:900}, "Ghardaïa":{bureau:600,domicile:1000}, "Relizane":{bureau:500,domicile:900},
    "Timimoun":{bureau:900,domicile:1300}, "Bordj Badji Mokhtar":{bureau:null,domicile:null}, "Ouled Djellal":{bureau:600,domicile:1000},
    "Béni Abbès":{bureau:null,domicile:1600}, "In Salah":{bureau:1300,domicile:1700}, "In Guezzam":{bureau:null,domicile:null},
    "Touggourt":{bureau:600,domicile:1000}, "Djanet":{bureau:null,domicile:2000}, "El M'Ghair":{bureau:null,domicile:900},
    "El Meniaa":{bureau:600,domicile:1300}
  };

  const LANGS = ["fr","en","ar"];
  let currentLang = "fr";
  let activeCategory = "Tous";
  let cart = {}; // { productId: qty }
  let deliveryType = "domicile";

  const TRANSLATIONS = {
    fr: {
      navHome:"Accueil", navCatalog:"Catalogue", navContact:"Contact",
      topbarDelivery:"Livraison disponible dans les 58 wilayas",
      topbarHours:"Ouvert 24/7 — Paiement à la livraison",
      heroEyebrow:"Nouveautés — hiver 2026",
      heroTitle:"Des articles tendance, livrés chez toi",
      heroText:"Choisis un article ci-dessous, ajoute-le au panier, et paie seulement à la réception. Livraison partout en Algérie.",
      heroCta:"Voir les articles",
      stripDelivery:"Livraison rapide 24–72h", stripCod:"Paiement à la livraison", stripReturn:"Retour possible 7 jours",
      howLabel:"Comment commander",
      step1Title:"Choisis tes articles", step1Text:"Parcours le catalogue et ajoute au panier tout ce qu'il te faut.",
      step2Title:"Remplis le bon de commande", step2Text:"Nom, téléphone, wilaya et mode de livraison — 30 secondes.",
      step3Title:"Paie à la livraison", step3Text:"Le livreur t'apporte le colis, tu vérifies, tu paies en espèces.",
      catalogLabel:"Catalogue", filterLabel:"Filtrer par catégorie", allCat:"Tous",
      searchPlaceholder:"Rechercher un produit...",
      chooseBtn:"Ajouter au panier", addedBtn:"Ajouté ✓",
      noProducts:"Aucun article ne correspond à votre recherche.",
      testimonialsLabel:"Avis clients", writeReviewBtnText:"Donner mon avis",
      writeReviewTitle:"Ajouter votre avis", reviewAuthorLabel:"Votre nom / Pseudonyme",
      reviewAuthorPh:"Votre nom", reviewRatingLabel:"Note", reviewTextLabel:"Votre commentaire",
      reviewTextPh:"Votre avis sur nos produits ou le service...", cancelBtn:"Annuler",
      submitReviewBtn:"Publier mon avis", noReviewsYet:"Aucun avis pour le moment. Soyez le premier à donner votre avis !",
      verifiedCustomer:"Client vérifié",
      cartTitle:"Mon panier", cartSubtotal:"Sous-total", cartCheckoutBtn:"Passer à la commande", cartEmpty:"Ton panier est vide.",
      orderFormLabel:"Bon de commande", orderHeading:"Finalise ta commande", orderNoLabel:"N°", todayLabel:"Aujourd'hui",
      fieldArticle:"Article", fieldName:"Nom et prénom", fieldNamePh:"Nom et prénom",
      fieldPhone:"Téléphone", fieldPhonePh:"05XX XX XX XX",
      fieldWilaya:"Wilaya", fieldCommune:"Commune / adresse", fieldCommunePh:"Commune, quartier, repère",
      fieldNote:"Remarque (optionnel)", fieldNotePlaceholder:"Couleur, taille, instructions de livraison…",
      domicileLabel:"Domicile", bureauLabel:"Bureau (StopDesk)",
      productsSubtotalLabel:"Prix des produits", shippingFeeLabel:"Frais de livraison", totalLabel:"Total à payer à la livraison",
      notDeliverableMsg:"Livraison non disponible pour cette wilaya avec ce mode.",
      submitBtn:"Confirmer ma commande", codNote:"Aucun paiement maintenant · vous payez à la réception du colis",
      slipFoot:"CONFIRMATION PAR WHATSAPP APRÈS ENVOI DU FORMULAIRE",
      checkoutEmptyNote:"Ajoute des articles au panier avant de commander.",
      phoneError:"Merci de vérifier le numéro de téléphone (format : 05XXXXXXXX)",
      contactLabel:"Contact", contactHeading:"Une question avant de commander ?", contactText:"Écris-nous directement, on répond rapidement.",
      contactPhoneLabel:"Téléphone", contactWhatsappLabel:"WhatsApp", contactWhatsappSub:"Réponse rapide, tous les jours",
      contactZoneLabel:"Zone de livraison", contactZoneText:"58 wilayas — tarifs indiqués à la commande",
      contactBtn:"Écrire sur WhatsApp", contactHours:"Ouvert 24/7",
      confirmHeading:"Commande enregistrée", confirmText:"Ta commande a été enregistrée. Notre équipe te contactera bientôt pour confirmer la livraison.",
      confirmRefLabel:"Référence :", closeBtn:"Fermer",
      footerText:"© 2026 Cha.Nechri — وش تحتاج كاين !",
      drawerCatsLabel:"Catégories",
      backToTop:"Retour en haut",
      sortDefault:"Trier par : Par défaut",
      sortPriceAsc:"Prix : Croissant",
      sortPriceDesc:"Prix : Décroissant",
      sortNameAsc:"Nom : A à Z",
      themeToggleTitle:"Changer le thème (Clair / Sombre)",
      themeLabel:"Mode d'affichage",
      themeDark:"Thème sombre",
      themeLight:"Thème clair"
    },
    en: {
      navHome:"Home", navCatalog:"Catalog", navContact:"Contact",
      topbarDelivery:"Delivery available in all 58 wilayas",
      topbarHours:"Open 24/7 — Pay on delivery",
      heroEyebrow:"New in — Winter 2026",
      heroTitle:"Trending items, delivered to your door",
      heroText:"Pick an item below, add it to your cart, and pay only when it arrives. Delivery all across Algeria.",
      heroCta:"Browse items",
      stripDelivery:"Fast delivery 24–72h", stripCod:"Pay on delivery", stripReturn:"7-day returns",
      howLabel:"How to order",
      step1Title:"Choose your items", step1Text:"Browse the catalog and add everything you need to your cart.",
      step2Title:"Fill in the order slip", step2Text:"Name, phone, wilaya and delivery method — 30 seconds.",
      step3Title:"Pay on delivery", step3Text:"The courier brings your parcel, you check it, you pay cash.",
      catalogLabel:"Catalog", filterLabel:"Filter by category", allCat:"All",
      searchPlaceholder:"Search for a product...",
      chooseBtn:"Add to cart", addedBtn:"Added ✓",
      noProducts:"No products matched your search.",
      testimonialsLabel:"Customer reviews", writeReviewBtnText:"Write a review",
      writeReviewTitle:"Leave a review", reviewAuthorLabel:"Your name / Username",
      reviewAuthorPh:"Your name", reviewRatingLabel:"Rating", reviewTextLabel:"Your review",
      reviewTextPh:"Your experience with our products...", cancelBtn:"Cancel",
      submitReviewBtn:"Post review", noReviewsYet:"No reviews yet. Be the first to leave a review!",
      verifiedCustomer:"Verified customer",
      cartTitle:"My cart", cartSubtotal:"Subtotal", cartCheckoutBtn:"Go to checkout", cartEmpty:"Your cart is empty.",
      orderFormLabel:"Order slip", orderHeading:"Complete your order", orderNoLabel:"No.", todayLabel:"Today",
      fieldArticle:"Item", fieldName:"Full name", fieldNamePh:"Full name",
      fieldPhone:"Phone", fieldPhonePh:"05XX XX XX XX",
      fieldWilaya:"Wilaya", fieldCommune:"City / address", fieldCommunePh:"City, neighborhood, landmark",
      fieldNote:"Note (optional)", fieldNotePlaceholder:"Color, size, delivery instructions…",
      domicileLabel:"Home delivery", bureauLabel:"Office (StopDesk)",
      productsSubtotalLabel:"Products price", shippingFeeLabel:"Shipping fee", totalLabel:"Total due on delivery",
      notDeliverableMsg:"Delivery not available to this wilaya with this method.",
      submitBtn:"Confirm my order", codNote:"No payment now · you pay when the parcel arrives",
      slipFoot:"CONFIRMATION VIA WHATSAPP AFTER SENDING THE FORM",
      checkoutEmptyNote:"Add items to your cart before ordering.",
      phoneError:"Please check the phone number (format: 05XXXXXXXX)",
      contactLabel:"Contact", contactHeading:"A question before ordering?", contactText:"Write to us directly, we reply fast.",
      contactPhoneLabel:"Phone", contactWhatsappLabel:"WhatsApp", contactWhatsappSub:"Fast reply, every day",
      contactZoneLabel:"Delivery area", contactZoneText:"58 wilayas — rates shown at checkout",
      contactBtn:"Message us on WhatsApp", contactHours:"Open 24/7",
      confirmHeading:"Order received", confirmText:"Your order has been saved. Our team will contact you soon to confirm delivery.",
      confirmRefLabel:"Reference:", closeBtn:"Close",
      footerText:"© 2026 Cha.Nechri — All rights reserved.",
      drawerCatsLabel:"Categories",
      backToTop:"Back to top",
      sortDefault:"Sort by: Default",
      sortPriceAsc:"Price: Low to High",
      sortPriceDesc:"Price: High to Low",
      sortNameAsc:"Name: A-Z",
      themeToggleTitle:"Toggle Theme (Light / Dark)",
      themeLabel:"Display Mode",
      themeDark:"Dark Mode",
      themeLight:"Light Mode"
    },
    ar: {
      navHome:"الرئيسية", navCatalog:"المنتجات", navContact:"اتصل بنا",
      topbarDelivery:"التوصيل متوفر في جميع الولايات الـ58",
      topbarHours:"متوفرون 24/7 — الدفع عند الاستلام",
      heroEyebrow:"جديدنا — شتاء 2026",
      heroTitle:"منتجات رائجة، توصيل لباب الدار",
      heroText:"اختر منتج من تحت، زيده للسلة، وادفع فقط عند الاستلام. التوصيل يغطي كامل الجزائر.",
      heroCta:"شوف المنتجات",
      stripDelivery:"توصيل سريع 24–72 ساعة", stripCod:"الدفع عند الاستلام", stripReturn:"إرجاع خلال 7 أيام",
      howLabel:"كيفاش تطلب",
      step1Title:"اختر منتجاتك", step1Text:"تصفح المنتجات وزيد للسلة كل ما يلزمك.",
      step2Title:"عمّر استمارة الطلب", step2Text:"الاسم، الهاتف، الولاية وطريقة التوصيل — 30 ثانية.",
      step3Title:"ادفع عند الاستلام", step3Text:"عامل التوصيل يجيبلك الطرد، تتأكد منه، وتدفع كاش.",
      catalogLabel:"المنتجات", filterLabel:"صفّي حسب التصنيف", allCat:"الكل",
      searchPlaceholder:"ابحث عن منتج...",
      chooseBtn:"زيد للسلة", addedBtn:"تمت الإضافة ✓",
      noProducts:"لا توجد منتجات تطابق بحثك.",
      testimonialsLabel:"آراء الزبائن", writeReviewBtnText:"أترك تقييماً",
      writeReviewTitle:"إضافة تقييمك", reviewAuthorLabel:"اسمك / اسم المستخدم",
      reviewAuthorPh:"اسمك الكامل", reviewRatingLabel:"التقييم", reviewTextLabel:"تعليقك",
      reviewTextPh:"اكتب تجربتك مع منتجاتنا...", cancelBtn:"إلغاء",
      submitReviewBtn:"نشر التقييم", noReviewsYet:"لا توجد تقييمات بعد. كن أول من يترك تقييماً!",
      verifiedCustomer:"زبون موثوق",
      cartTitle:"سلتي", cartSubtotal:"المجموع الفرعي", cartCheckoutBtn:"إتمام الطلب", cartEmpty:"سلتك فارغة.",
      orderFormLabel:"استمارة الطلب", orderHeading:"كمّل طلبك", orderNoLabel:"رقم", todayLabel:"اليوم",
      fieldArticle:"المنتج", fieldName:"الاسم الكامل", fieldNamePh:"الاسم الكامل",
      fieldPhone:"الهاتف", fieldPhonePh:"05XX XX XX XX",
      fieldWilaya:"الولاية", fieldCommune:"البلدية / العنوان", fieldCommunePh:"البلدية، الحي، نقطة مميزة",
      fieldNote:"ملاحظة (اختياري)", fieldNotePlaceholder:"اللون، المقاس، تعليمات التوصيل…",
      domicileLabel:"توصيل للمنزل", bureauLabel:"مكتب (StopDesk)",
      productsSubtotalLabel:"سعر المنتجات", shippingFeeLabel:"سعر التوصيل", totalLabel:"المجموع يُدفع عند الاستلام",
      notDeliverableMsg:"التوصيل غير متوفر لهذه الولاية بهذه الطريقة.",
      submitBtn:"أكّد طلبي", codNote:"بدون دفع الآن · تدفع عند استلام الطرد",
      slipFoot:"التأكيد عبر واتساب بعد إرسال الاستمارة",
      checkoutEmptyNote:"زيد منتجات للسلة قبل ما تطلب.",
      phoneError:"تحقق من رقم الهاتف من فضلك (الصيغة: 05XXXXXXXX)",
      contactLabel:"اتصل بنا", contactHeading:"عندك سؤال قبل الطلب؟", contactText:"راسلنا مباشرة، نردّو بسرعة.",
      contactPhoneLabel:"الهاتف", contactWhatsappLabel:"واتساب", contactWhatsappSub:"رد سريع، كل يوم",
      contactZoneLabel:"منطقة التوصيل", contactZoneText:"58 ولاية — الأسعار تظهر عند الطلب",
      contactBtn:"راسلنا على واتساب", contactHours:"متوفرون 24/7",
      confirmHeading:"تم تسجيل الطلب", confirmText:"تم تسجيل طلبك. سيتواصل معك فريقنا قريبًا لتأكيد التوصيل.",
      confirmRefLabel:"المرجع:", closeBtn:"إغلاق",
      footerText:"© 2026 Cha.Nechri — وش تحتاج كاين !",
      drawerCatsLabel:"التصنيفات",
      backToTop:"العودة إلى الأعلى",
      sortDefault:"ترتيب حسب: الافتراضي",
      sortPriceAsc:"السعر: من الأقل إلى الأعلى",
      sortPriceDesc:"السعر: من الأعلى إلى الأقل",
      sortNameAsc:"الاسم: أ - ي",
      themeToggleTitle:"تغيير المظهر (فاتح / داكن)",
      themeLabel:"طريقة العرض",
      themeDark:"المظهر الداكن",
      themeLight:"المظهر الفاتح"
    }
  };

  const WILAYAS = [
    "Adrar","Chlef","Laghouat","Oum El Bouaghi","Batna","Béjaïa","Biskra","Béchar","Blida","Bouira",
    "Tamanrasset","Tébessa","Tlemcen","Tiaret","Tizi Ouzou","Alger","Djelfa","Jijel","Sétif","Saïda",
    "Skikda","Sidi Bel Abbès","Annaba","Guelma","Constantine","Médéa","Mostaganem","M'Sila","Mascara","Ouargla",
    "Oran","El Bayadh","Illizi","Bordj Bou Arreridj","Boumerdès","El Tarf","Tindouf","Tissemsilt","El Oued","Khenchela",
    "Souk Ahras","Tipaza","Mila","Aïn Defla","Naâma","Aïn Témouchent","Ghardaïa","Relizane","Timimoun","Bordj Badji Mokhtar",
    "Ouled Djellal","Béni Abbès","In Salah","In Guezzam","Touggourt","Djanet","El M'Ghair","El Meniaa"
  ];

  /* Logo is set directly in index.html as logo-lockup.png — nothing to do here. */

  function fmt(n){ return n.toLocaleString('fr-FR') + ' DA'; }
  function getProduct(id){ return PRODUCTS.find(p => p.id === id); }
  function t(key){ return TRANSLATIONS[currentLang][key] || key; }

  /* ---------------- language ---------------- */
  function applyLanguage(lang){
    currentLang = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.classList.toggle('rtl', lang === 'ar');
    const lc = document.getElementById('langCode');
    if (lc) lc.textContent = lang.toUpperCase();

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (TRANSLATIONS[lang][key] !== undefined) el.textContent = TRANSLATIONS[lang][key];
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (TRANSLATIONS[lang][key] !== undefined) el.placeholder = TRANSLATIONS[lang][key];
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (TRANSLATIONS[lang][key] !== undefined) {
        el.title = TRANSLATIONS[lang][key];
        el.setAttribute('aria-label', TRANSLATIONS[lang][key]);
      }
    });

    renderDrawerLang();
    renderCatFilters();
    renderDrawerCats();
    renderCatalog();
    renderCart();
    renderCheckout();
    if (typeof applyTheme === 'function') applyTheme(currentTheme);
  }

  /* ---------------- theme toggle ---------------- */
  let currentTheme = localStorage.getItem('cn_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('cn_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);

    const drawerThemeText = document.getElementById('drawerThemeText');
    if (drawerThemeText) {
      drawerThemeText.textContent = theme === 'dark' ? t('themeLight') : t('themeDark');
    }

    const themeToggleBtn = document.getElementById('themeToggle');
    if (themeToggleBtn) {
      themeToggleBtn.setAttribute('title', t('themeToggleTitle'));
      themeToggleBtn.setAttribute('aria-label', t('themeToggleTitle'));
    }
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  const themeToggleBtn = document.getElementById('themeToggle');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }

  const drawerThemeToggleBtn = document.getElementById('drawerThemeToggle');
  if (drawerThemeToggleBtn) {
    drawerThemeToggleBtn.addEventListener('click', () => {
      toggleTheme();
      closeDrawer();
    });
  }

  // Apply initial theme on script load
  applyTheme(currentTheme);

  const langToggleBtn = document.getElementById('langToggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      applyLanguage(LANGS[(LANGS.indexOf(currentLang) + 1) % LANGS.length]);
    });
  }

  function renderDrawerLang(){
    const el = document.getElementById('drawerLang');
    if (!el) return;
    el.innerHTML = '';
    LANGS.forEach(l => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-lang-btn' + (l === currentLang ? ' active' : '');
      btn.textContent = l.toUpperCase();
      btn.addEventListener('click', () => applyLanguage(l));
      el.appendChild(btn);
    });
  }

  /* ---------------- drawer ---------------- */
  const drawer = document.getElementById('drawer');
  const drawerOverlay = document.getElementById('drawerOverlay');
  function openDrawer(){ if (drawer) drawer.classList.add('open'); if (drawerOverlay) drawerOverlay.classList.add('open'); }
  function closeDrawer(){ if (drawer) drawer.classList.remove('open'); if (drawerOverlay) drawerOverlay.classList.remove('open'); }
  const menuToggleBtn = document.getElementById('menuToggle');
  const drawerCloseBtn = document.getElementById('drawerClose');
  if (menuToggleBtn) menuToggleBtn.addEventListener('click', openDrawer);
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);
  document.querySelectorAll('[data-close-drawer]').forEach(el => el.addEventListener('click', closeDrawer));

  function renderDrawerCats(){
    const el = document.getElementById('drawerCats');
    if (!el) return;
    el.innerHTML = '';
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'drawer-cat-btn' + (activeCategory === 'Tous' ? ' active' : '');
    allBtn.textContent = t('allCat');
    allBtn.addEventListener('click', () => { setCategory('Tous'); closeDrawer(); });
    el.appendChild(allBtn);
    Object.keys(CATEGORIES).forEach(catId => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'drawer-cat-btn' + (activeCategory === catId ? ' active' : '');
      btn.textContent = CATEGORIES[catId][currentLang];
      btn.addEventListener('click', () => { setCategory(catId); closeDrawer(); });
      el.appendChild(btn);
    });
  }

  function setCategory(catId){
    activeCategory = catId;
    renderCatFilters();
    renderDrawerCats();
    renderCatalog();
    const catSec = document.getElementById('catalog');
    if (catSec) catSec.scrollIntoView({ behavior:'smooth' });
  }

  function renderCatFilters(){
    const catFiltersEl = document.getElementById('catFilters');
    if (!catFiltersEl) return;
    catFiltersEl.innerHTML = '';
    const mk = (id, label) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.style.cssText = "font-family:'Space Mono', monospace; font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; border:1px solid var(--line); background:none; padding:8px 16px; border-radius:999px; color:var(--ink-soft);";
      if (activeCategory === id){ btn.style.background = 'var(--ink)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--ink)'; }
      btn.addEventListener('click', () => setCategory(id));
      return btn;
    };
    catFiltersEl.appendChild(mk('Tous', t('allCat')));
    Object.keys(CATEGORIES).forEach(catId => catFiltersEl.appendChild(mk(catId, CATEGORIES[catId][currentLang])));
  }

  /* ---------------- catalog & search ---------------- */
  let searchQuery = "";
  let currentSort = "default";
  const searchInput = document.getElementById('productSearchInput');
  const sortSelect = document.getElementById('productSortSelect');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderCatalog();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCatalog();
    });
  }

  function renderCatalog(){
    const grid = document.getElementById('catalogGrid');
    if (!grid) return;
    if (!PRODUCTS || !PRODUCTS.length) {
      PRODUCTS = getCatalogList();
    }
    grid.innerHTML = '';
    let visible = activeCategory === "Tous" ? PRODUCTS.slice() : PRODUCTS.filter(p => p.categoryId === activeCategory);
    
    if (searchQuery) {
      visible = visible.filter(p => {
        const nameFr = (p.name.fr || "").toLowerCase();
        const nameAr = (p.name.ar || "").toLowerCase();
        const nameEn = (p.name.en || "").toLowerCase();
        const tagFr = (p.tagline.fr || "").toLowerCase();
        const tagAr = (p.tagline.ar || "").toLowerCase();
        const tagEn = (p.tagline.en || "").toLowerCase();
        const catName = CATEGORIES[p.categoryId] ? (CATEGORIES[p.categoryId][currentLang] || "").toLowerCase() : "";
        return nameFr.includes(searchQuery) || nameAr.includes(searchQuery) || nameEn.includes(searchQuery) ||
               tagFr.includes(searchQuery) || tagAr.includes(searchQuery) || tagEn.includes(searchQuery) ||
               catName.includes(searchQuery);
      });
    }

    if (currentSort === "price-asc") {
      visible.sort((a, b) => sellPrice(a) - sellPrice(b));
    } else if (currentSort === "price-desc") {
      visible.sort((a, b) => sellPrice(b) - sellPrice(a));
    } else if (currentSort === "name-asc") {
      visible.sort((a, b) => {
        const nameA = (a.name && (a.name[currentLang] || a.name.fr)) || "";
        const nameB = (b.name && (b.name[currentLang] || b.name.fr)) || "";
        return nameA.localeCompare(nameB, currentLang);
      });
    }

    if (visible.length === 0){
      const msg = document.createElement('p');
      msg.className = 'mono';
      msg.style.cssText = "font-size:13px; color:var(--ink-soft); grid-column:1/-1; padding:20px 0;";
      msg.textContent = t('noProducts');
      grid.appendChild(msg);
      return;
    }

    visible.forEach(p => {
      const inCart = !!cart[p.id];
      const card = document.createElement('div');
      card.className = 'product-card';
      if (p.categoryId) {
        card.setAttribute('data-category', p.categoryId);
      }
      const catLabel = (CATEGORIES[p.categoryId] && CATEGORIES[p.categoryId][currentLang]) || p.categoryId || '';
      card.innerHTML = `
        <div class="card-art" style="cursor:pointer;">
          <button type="button" class="card-cat-badge" data-cat="${p.categoryId}">${catLabel}</button>
          ${p.image ? `<img src="${p.image}" alt="${p.name[currentLang]}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">` : `
          <svg viewBox="0 0 200 200" fill="none" style="color:var(--ink);">
            <rect x="26" y="70" width="148" height="86" rx="10" fill="currentColor" opacity="0.12"/>
            <rect x="26" y="70" width="148" height="86" rx="10" stroke="currentColor" stroke-width="2.5"/>
            <path d="M40 70 C40 50 160 50 160 70" stroke="#9B5FCB" stroke-width="3" fill="none"/>
            <circle cx="100" cy="113" r="18" stroke="#E06F9B" stroke-width="2.5" fill="none"/>
          </svg>`}
        </div>
        <div class="card-body">
          <h3 class="pm-open-title" style="cursor:pointer;">${p.name[currentLang]}</h3>
          <p class="card-tagline" style="cursor:pointer;">${p.tagline[currentLang]}</p>
          <div class="card-price-row"><span class="card-price-new mono">${fmt(sellPrice(p))}</span></div>
          <button type="button" class="card-select-btn ${inCart ? 'is-added' : ''}" data-id="${p.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-12L5 3H2"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg>
            ${inCart ? t('addedBtn') : t('chooseBtn')}
          </button>
        </div>`;

      // Attach click handlers to open product detail modal
      const artEl = card.querySelector('.card-art');
      const titleEl = card.querySelector('.pm-open-title');
      const taglineEl = card.querySelector('.card-tagline');

      [artEl, titleEl, taglineEl].forEach(el => {
        if (el) {
          el.addEventListener('click', (e) => {
            if (e.target.classList.contains('card-cat-badge')) return;
            openProductModal(p);
          });
        }
      });

      grid.appendChild(card);
    });

    grid.querySelectorAll('.card-select-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        addToCart(btn.dataset.id, 1);
        renderCatalog();
      });
    });
    grid.querySelectorAll('.card-cat-badge').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCategory(btn.dataset.cat);
      });
    });
  }

  /* ---------------- Product Detail Modal & Per-Product Order Slip ---------------- */
  let currentModalProduct = null;
  let pmQty = 1;
  let pmDeliveryType = "domicile";

  function showToast(msgText) {
    let toast = document.getElementById('cnToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cnToast';
      toast.style.cssText = "position:fixed; bottom:24px; left:50%; transform:translateX(-50%); background:var(--ink); color:var(--surface); padding:10px 22px; border-radius:999px; font-size:13px; font-weight:700; z-index:99999; box-shadow:0 10px 30px rgba(0,0,0,0.25); transition:opacity 0.3s ease;";
      document.body.appendChild(toast);
    }
    toast.textContent = msgText;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
  }

  function openProductModal(p) {
    currentModalProduct = p;

    /* Fire-and-forget click tracking for admin "most viewed" stats. Never
       blocks the UI and never throws if Supabase is unavailable. */
    try {
      if (window.sb && typeof window.sb.rpc === 'function' && p && p.id) {
        window.sb.rpc('increment_product_click', { p_id: p.id }).then(() => {}, () => {});
      }
    } catch (e) { /* silent */ }
    pmQty = 1;
    pmDeliveryType = "domicile";

    const overlay = document.getElementById('productModalOverlay');
    if (!overlay) return;

    // Set product details
    const pmTitle = document.getElementById('pmTitle');
    const pmTagline = document.getElementById('pmTagline');
    const pmCategoryBadge = document.getElementById('pmCategoryBadge');
    const pmPrice = document.getElementById('pmPrice');
    const pmDescText = document.getElementById('pmDescriptionText');
    const pmOrderPreviewNo = document.getElementById('pmOrderPreviewNo');

    if (pmTitle) pmTitle.textContent = p.name[currentLang] || p.name.fr;
    if (pmTagline) pmTagline.textContent = p.tagline[currentLang] || p.tagline.fr;
    if (pmCategoryBadge) pmCategoryBadge.textContent = CATEGORIES[p.categoryId] ? CATEGORIES[p.categoryId][currentLang] : '';
    if (pmPrice) pmPrice.textContent = fmt(sellPrice(p));

    if (pmDescText) {
      let desc = "";
      if (p.description && p.description[currentLang]) desc = p.description[currentLang];
      else if (p.description && p.description.fr) desc = p.description.fr;
      else desc = p.tagline[currentLang] || p.tagline.fr;
      pmDescText.textContent = desc;
    }

    if (pmOrderPreviewNo) pmOrderPreviewNo.textContent = genOrderNo();

    // Image & Thumbnails
    const mainImg = document.getElementById('pmMainImage');
    const thumbsContainer = document.getElementById('pmThumbnails');
    if (thumbsContainer) thumbsContainer.innerHTML = '';

    const imagesList = (p.images && p.images.length > 0) ? p.images : (p.image ? [p.image] : []);
    if (imagesList.length > 0) {
      if (mainImg) mainImg.src = imagesList[0];
      if (imagesList.length > 1 && thumbsContainer) {
        imagesList.forEach((imgUrl, idx) => {
          const thumb = document.createElement('img');
          thumb.src = imgUrl;
          thumb.style.cssText = `width:56px; height:56px; object-fit:cover; border-radius:6px; cursor:pointer; border:${idx === 0 ? '2px solid var(--pink-deep)' : '1px solid var(--line)'}; opacity:${idx === 0 ? '1' : '0.7'}; transition:all 0.2s;`;
          thumb.addEventListener('click', () => {
            if (mainImg) mainImg.src = imgUrl;
            thumbsContainer.querySelectorAll('img').forEach(t => {
              t.style.border = '1px solid var(--line)';
              t.style.opacity = '0.7';
            });
            thumb.style.border = '2px solid var(--pink-deep)';
            thumb.style.opacity = '1';
          });
          thumbsContainer.appendChild(thumb);
        });
      }
    } else if (mainImg) {
      mainImg.src = "https://images.unsplash.com/photo-1543198181-e61932024851?auto=format&fit=crop&w=800&q=80";
    }

    // Populate Wilaya select
    const pmWilayaSelect = document.getElementById('pmWilaya');
    if (pmWilayaSelect) {
      pmWilayaSelect.innerHTML = '';
      WILAYAS.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w; opt.textContent = w;
        if (w === DEFAULT_WILAYA) opt.selected = true;
        pmWilayaSelect.appendChild(opt);
      });
    }

    // Quantity Reset
    const pmQtyVal = document.getElementById('pmQtyVal');
    if (pmQtyVal) pmQtyVal.textContent = pmQty;

    // Delivery Reset
    const pmDomicile = document.getElementById('pmDeliveryDomicile');
    const pmBureau = document.getElementById('pmDeliveryBureau');
    const pmAddressField = document.getElementById('pmAddressField');

    if (pmDomicile && pmBureau) {
      pmDomicile.classList.add('active');
      pmBureau.classList.remove('active');
      if (pmAddressField) pmAddressField.style.display = 'block';
    }

    updatePmCheckout();

    overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    const overlay = document.getElementById('productModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Copy handlers
  const copyTitleBtn = document.getElementById('copyTitleBtn');
  if (copyTitleBtn) {
    copyTitleBtn.addEventListener('click', () => {
      if (!currentModalProduct) return;
      const title = currentModalProduct.name[currentLang] || currentModalProduct.name.fr;
      navigator.clipboard.writeText(title).then(() => showToast("تم النسخ بنجاح ! / Copié !"));
    });
  }

  const copyDescBtn = document.getElementById('copyDescBtn');
  if (copyDescBtn) {
    copyDescBtn.addEventListener('click', () => {
      const descEl = document.getElementById('pmDescriptionText');
      if (descEl) {
        navigator.clipboard.writeText(descEl.textContent).then(() => showToast("تم النسخ بنجاح ! / Copié !"));
      }
    });
  }

  // Modal Quantity handlers
  const pmQtyMinus = document.getElementById('pmQtyMinus');
  const pmQtyPlus = document.getElementById('pmQtyPlus');
  if (pmQtyMinus) {
    pmQtyMinus.addEventListener('click', () => {
      if (pmQty > 1) {
        pmQty--;
        const el = document.getElementById('pmQtyVal');
        if (el) el.textContent = pmQty;
        updatePmCheckout();
      }
    });
  }
  if (pmQtyPlus) {
    pmQtyPlus.addEventListener('click', () => {
      pmQty++;
      const el = document.getElementById('pmQtyVal');
      if (el) el.textContent = pmQty;
      updatePmCheckout();
    });
  }

  // Add to Cart inside Modal
  const pmAddToCartBtn = document.getElementById('pmAddToCartBtn');
  if (pmAddToCartBtn) {
    pmAddToCartBtn.addEventListener('click', () => {
      if (!currentModalProduct) return;
      addToCart(currentModalProduct.id, pmQty);
      showToast("Ajouté au panier ! / تم الإضافة للسلة !");
      renderCatalog();
    });
  }

  // Delivery type toggle inside Modal
  const pmDomicile = document.getElementById('pmDeliveryDomicile');
  const pmBureau = document.getElementById('pmDeliveryBureau');
  if (pmDomicile && pmBureau) {
    pmDomicile.addEventListener('click', () => {
      pmDeliveryType = "domicile";
      pmDomicile.classList.add('active');
      pmBureau.classList.remove('active');
      const fld = document.getElementById('pmAddressField');
      if (fld) fld.style.display = 'block';
      updatePmCheckout();
    });
    pmBureau.addEventListener('click', () => {
      pmDeliveryType = "bureau";
      pmBureau.classList.add('active');
      pmDomicile.classList.remove('active');
      const fld = document.getElementById('pmAddressField');
      if (fld) fld.style.display = 'none';
      updatePmCheckout();
    });
  }

  const pmWilayaSelect = document.getElementById('pmWilaya');
  if (pmWilayaSelect) {
    pmWilayaSelect.addEventListener('change', updatePmCheckout);
  }

  function updatePmCheckout() {
    if (!currentModalProduct) return;
    const unitP = sellPrice(currentModalProduct);
    const subtotal = unitP * pmQty;
    const subtotalEl = document.getElementById('pmProductsSubtotalAmount');
    if (subtotalEl) subtotalEl.textContent = fmt(subtotal);

    const wilayaVal = document.getElementById('pmWilaya') ? document.getElementById('pmWilaya').value : DEFAULT_WILAYA;
    const rates = SHIPPING_RATES[wilayaVal];
    const fee = rates ? rates[pmDeliveryType] : null;

    const notDeliv = document.getElementById('pmNotDeliverableMsg');
    const shipAmt = document.getElementById('pmShippingAmount');
    const totAmt = document.getElementById('pmTotalAmount');
    const subBtn = document.getElementById('pmSubmitOrderBtn');

    if (fee === null || fee === undefined) {
      if (shipAmt) shipAmt.textContent = '—';
      if (notDeliv) notDeliv.style.display = 'block';
      if (totAmt) totAmt.textContent = fmt(subtotal);
      if (subBtn) subBtn.disabled = true;
    } else {
      if (shipAmt) shipAmt.textContent = fmt(fee);
      if (notDeliv) notDeliv.style.display = 'none';
      if (totAmt) totAmt.textContent = fmt(subtotal + fee);
      if (subBtn) subBtn.disabled = false;
    }
  }

  // Close Modal handlers
  const closePmBtn = document.getElementById('closeProductModalBtn');
  if (closePmBtn) closePmBtn.addEventListener('click', closeProductModal);

  const pmOverlay = document.getElementById('productModalOverlay');
  if (pmOverlay) {
    pmOverlay.addEventListener('click', (e) => {
      if (e.target === pmOverlay) closeProductModal();
    });
  }

  // Modal Order Form Submission
  const pmOrderForm = document.getElementById('pmOrderForm');
  if (pmOrderForm) {
    pmOrderForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (!currentModalProduct) return;

      const nameInput = document.getElementById('pmFullName');
      const phoneInput = document.getElementById('pmPhone');
      const wilayaSelect = document.getElementById('pmWilaya');
      const communeInput = document.getElementById('pmCommune');
      const noteInput = document.getElementById('pmNote');

      const name = nameInput ? nameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const wilaya = wilayaSelect ? wilayaSelect.value : DEFAULT_WILAYA;
      const commune = communeInput ? communeInput.value.trim() : "";
      const note = noteInput ? noteInput.value.trim() : "";

      if (!name || !phone) return;
      if (pmDeliveryType === 'domicile' && !commune) return;

      const rates = SHIPPING_RATES[wilaya];
      const fee = rates ? rates[pmDeliveryType] : null;
      if (fee === null || fee === undefined) return;

      const unitP = sellPrice(currentModalProduct);
      const subtotal = unitP * pmQty;
      const grandTotal = subtotal + fee;
      const orderPreviewNo = document.getElementById('pmOrderPreviewNo');
      const orderNo = (orderPreviewNo && orderPreviewNo.textContent) ? orderPreviewNo.textContent : genOrderNo();

      const orderData = {
        order_no: orderNo,
        customer_name: name,
        customer_phone: phone,
        wilaya: wilaya,
        address: commune,
        delivery_type: pmDeliveryType,
        items: [{
          id: currentModalProduct.id,
          name: currentModalProduct.name[currentLang] || currentModalProduct.name.fr,
          unitPrice: unitP,
          qty: pmQty,
          lineTotal: subtotal
        }],
        items_total: subtotal,
        shipping_fee: fee,
        grand_total: grandTotal,
        lang: currentLang,
        note: note
      };

      try {
        if (window.sb) {
          const { error } = await window.sb.from('orders').insert(orderData);
          if (error) console.error('Supabase insert error', error);
        } else {
          console.error('Supabase client not initialized, order not saved to Supabase');
        }
      } catch(err) {
        console.error('Order save to Supabase failed', err);
      }

      closeProductModal();

      const overlay = document.getElementById('overlay');
      if (overlay) {
        const finalNoEl = document.getElementById('finalOrderNo');
        if (finalNoEl) finalNoEl.textContent = orderNo;
        overlay.classList.add('show');
      }
    });
  }

  /* ---------------- Real Customer Reviews ---------------- */
  let reviews = [];
  function loadReviews() {
    try {
      const stored = localStorage.getItem('cn_reviews');
      if (stored) reviews = JSON.parse(stored);
      else reviews = [];
    } catch(e) { reviews = []; }
    renderReviews();
  }

  function saveReviewLocally(review) {
    reviews.unshift(review);
    try {
      localStorage.setItem('cn_reviews', JSON.stringify(reviews));
    } catch(e) {}
    renderReviews();
  }

  function renderReviews() {
    const reviewsGrid = document.getElementById('reviewsGrid');
    if (!reviewsGrid) return;
    reviewsGrid.innerHTML = '';

    if (reviews.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.cssText = "grid-column:1/-1; text-align:center; color:var(--ink-soft); padding:30px 0; font-size:14px;";
      emptyMsg.textContent = t('noReviewsYet');
      reviewsGrid.appendChild(emptyMsg);
      return;
    }

    reviews.forEach(r => {
      const card = document.createElement('div');
      card.className = 'test-card reveal in';
      const stars = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
      card.innerHTML = `
        <div class="stamp-mini">✓</div>
        <div style="color:#f59e0b; font-size:14px; margin-bottom:6px;">${stars}</div>
        <p style="font-size:13.5px; color:var(--ink); margin-bottom:10px;">"${r.text}"</p>
        <div class="who" style="font-size:12px; color:var(--ink-soft);">${r.author} — <span style="color:var(--success);">${t('verifiedCustomer')}</span></div>
      `;
      reviewsGrid.appendChild(card);
    });
  }

  const writeReviewBtn = document.getElementById('writeReviewBtn');
  const reviewFormBox = document.getElementById('reviewFormBox');
  const cancelReviewBtn = document.getElementById('cancelReviewBtn');
  const addReviewForm = document.getElementById('addReviewForm');

  if (writeReviewBtn && reviewFormBox) {
    writeReviewBtn.addEventListener('click', () => {
      reviewFormBox.style.display = reviewFormBox.style.display === 'none' ? 'block' : 'none';
    });
  }
  if (cancelReviewBtn && reviewFormBox) {
    cancelReviewBtn.addEventListener('click', () => {
      reviewFormBox.style.display = 'none';
    });
  }
  if (addReviewForm) {
    addReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const author = document.getElementById('reviewAuthorInput').value.trim();
      const rating = parseInt(document.getElementById('reviewRatingInput').value, 10) || 5;
      const text = document.getElementById('reviewTextInput').value.trim();

      if (!author || !text) return;

      const newReview = { author, rating, text, date: new Date().toISOString() };
      saveReviewLocally(newReview);

      addReviewForm.reset();
      reviewFormBox.style.display = 'none';
    });
  }
  loadReviews();

  /* ---------------- cart ---------------- */
  function addToCart(id, qty){ cart[id] = (cart[id] || 0) + qty; renderCart(); renderCheckout(); }
  function setCartQty(id, qty){
    if (qty <= 0) delete cart[id]; else cart[id] = qty;
    renderCart(); renderCheckout(); renderCatalog();
  }
  function removeFromCart(id){ delete cart[id]; renderCart(); renderCheckout(); renderCatalog(); }
  function cartCount(){ return Object.values(cart).reduce((a,b) => a+b, 0); }
  function cartItemsTotal(){
    return Object.entries(cart).reduce((sum,[id,qty]) => {
      const p = getProduct(id);
      return p ? sum + sellPrice(p) * qty : sum;
    }, 0);
  }

  const cartBadge = document.getElementById('cartBadge');
  const cartLinesEl = document.getElementById('cartLines');
  const cartSubtotalEl = document.getElementById('cartSubtotalAmount');

  function renderCart(){
    const count = cartCount();
    if (cartBadge) {
      cartBadge.textContent = count;
      cartBadge.style.display = count > 0 ? 'flex' : 'none';
    }

    if (cartLinesEl) {
      cartLinesEl.innerHTML = '';
      const entries = Object.entries(cart);
      if (entries.length === 0){
        const empty = document.createElement('div');
        empty.className = 'cart-empty';
        empty.textContent = t('cartEmpty');
        cartLinesEl.appendChild(empty);
      } else {
        entries.forEach(([id, qty]) => {
          const p = getProduct(id);
          if (!p) return;
          const line = document.createElement('div');
          line.className = 'cart-line';
          line.innerHTML = `
            <div class="cart-line-thumb"></div>
            <div class="cart-line-info">
              <div class="name">${p.name[currentLang]}</div>
              <div class="unit mono">${fmt(sellPrice(p))}</div>
            </div>
            <div class="cart-line-qty">
              <button type="button" class="cart-qty-btn" data-act="minus" data-id="${id}">−</button>
              <span class="mono">${qty}</span>
              <button type="button" class="cart-qty-btn" data-act="plus" data-id="${id}">+</button>
            </div>
            <button type="button" class="cart-line-remove" data-id="${id}">✕</button>`;
          cartLinesEl.appendChild(line);
        });
      }

      cartLinesEl.querySelectorAll('.cart-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          const current = cart[id] || 0;
          setCartQty(id, btn.dataset.act === 'plus' ? current + 1 : current - 1);
        });
      });
      cartLinesEl.querySelectorAll('.cart-line-remove').forEach(btn => {
        btn.addEventListener('click', () => removeFromCart(btn.dataset.id));
      });
    }

    if (cartSubtotalEl) cartSubtotalEl.textContent = fmt(cartItemsTotal());
  }

  const cartOverlay = document.getElementById('cartOverlay');
  const cartToggleBtn = document.getElementById('cartToggle');
  const cartCloseBtn = document.getElementById('cartClose');
  const cartCheckoutBtn = document.getElementById('cartCheckoutBtn');

  if (cartToggleBtn) cartToggleBtn.addEventListener('click', () => { renderCart(); if (cartOverlay) cartOverlay.classList.add('show'); });
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', () => { if (cartOverlay) cartOverlay.classList.remove('show'); });
  if (cartOverlay) cartOverlay.addEventListener('click', (e) => { if (e.target === cartOverlay) cartOverlay.classList.remove('show'); });
  if (cartCheckoutBtn) {
    cartCheckoutBtn.addEventListener('click', () => {
      if (cartOverlay) cartOverlay.classList.remove('show');
      const entries = Object.entries(cart);
      if (entries.length > 0) {
        const firstId = entries[0][0];
        const p = getProduct(firstId);
        if (p) openProductModal(p);
      } else {
        const catEl = document.getElementById('catalog');
        if (catEl) catEl.scrollIntoView({ behavior:'smooth' });
      }
    });
  }

  /* ---------------- checkout ---------------- */
  const wilayaSelect = document.getElementById('wilaya');
  if (wilayaSelect) {
    WILAYAS.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w; opt.textContent = w;
      if (w === DEFAULT_WILAYA) opt.selected = true;
      wilayaSelect.appendChild(opt);
    });
  }

  const domicileBtn = document.getElementById('deliveryDomicile');
  const bureauBtn = document.getElementById('deliveryBureau');
  const addressField = document.getElementById('addressField');
  const communeInput = document.getElementById('commune');
  function setDeliveryType(type){
    deliveryType = type;
    if (domicileBtn) domicileBtn.classList.toggle('active', type === 'domicile');
    if (bureauBtn) bureauBtn.classList.toggle('active', type === 'bureau');
    if (addressField) addressField.style.display = type === 'domicile' ? 'block' : 'none';
    if (communeInput) communeInput.required = type === 'domicile';
    renderCheckout();
  }
  if (domicileBtn) domicileBtn.addEventListener('click', () => setDeliveryType('domicile'));
  if (bureauBtn) bureauBtn.addEventListener('click', () => setDeliveryType('bureau'));
  if (wilayaSelect) wilayaSelect.addEventListener('change', renderCheckout);

  const checkoutCartLinesEl = document.getElementById('checkoutCartLines');
  const productsSubtotalEl = document.getElementById('productsSubtotalAmount');
  const shippingAmountEl = document.getElementById('shippingAmount');
  const notDeliverableEl = document.getElementById('notDeliverableMsg');
  const totalAmountEl = document.getElementById('totalAmount');
  const submitOrderBtn = document.getElementById('submitOrderBtn');

  function getShippingFee(){
    if (!wilayaSelect) return null;
    const rates = SHIPPING_RATES[wilayaSelect.value];
    if (!rates) return null;
    return rates[deliveryType];
  }

  function renderCheckout(){
    if (!checkoutCartLinesEl) return;
    checkoutCartLinesEl.innerHTML = '';
    const entries = Object.entries(cart);
    if (entries.length === 0){
      const p = document.createElement('div');
      p.className = 'checkout-empty-note mono';
      p.textContent = t('checkoutEmptyNote');
      checkoutCartLinesEl.appendChild(p);
    } else {
      entries.forEach(([id, qty]) => {
        const p = getProduct(id);
        if (!p) return;
        const row = document.createElement('div');
        row.className = 'checkout-cart-line';
        row.innerHTML = `<span class="n">${p.name[currentLang]} × ${qty}</span><span class="p mono">${fmt(sellPrice(p) * qty)}</span>`;
        checkoutCartLinesEl.appendChild(row);
      });
    }

    const itemsTotal = cartItemsTotal();
    if (productsSubtotalEl) productsSubtotalEl.textContent = fmt(itemsTotal);
    const fee = getShippingFee();
    const hasItems = entries.length > 0;

    if (fee === null || fee === undefined){
      if (shippingAmountEl) shippingAmountEl.textContent = '—';
      if (notDeliverableEl) notDeliverableEl.style.display = 'block';
      if (totalAmountEl) totalAmountEl.textContent = fmt(itemsTotal);
      if (submitOrderBtn) submitOrderBtn.disabled = true;
    } else {
      if (shippingAmountEl) shippingAmountEl.textContent = fmt(fee);
      if (notDeliverableEl) notDeliverableEl.style.display = 'none';
      if (totalAmountEl) totalAmountEl.textContent = fmt(itemsTotal + fee);
      if (submitOrderBtn) submitOrderBtn.disabled = !hasItems;
    }
  }

  const contactWa = document.getElementById('contactWhatsapp');
  if (contactWa) {
    contactWa.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Bonjour, j\'ai une question avant de commander.')}`;
  }
  const contactPhone = document.getElementById('contactPhoneText');
  if (contactPhone) {
    contactPhone.textContent = CONTACT.phoneDisplay;
  }

  function genOrderNo(){
    const d = new Date();
    return `${d.getFullYear().toString().slice(2)}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}-${Math.floor(Math.random()*900+100)}`;
  }

  const orderPreviewNo = document.getElementById('orderPreviewNo');
  if (orderPreviewNo) orderPreviewNo.textContent = genOrderNo();

  const form = document.getElementById('orderForm');
  const overlay = document.getElementById('overlay');
  const finalOrderNo = document.getElementById('finalOrderNo');

  if (form) {
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      const entries = Object.entries(cart);
      if (entries.length === 0) return;

      const nameInput = document.getElementById('fullName');
      const phoneInput = document.getElementById('phone');
      const name = nameInput ? nameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const wilaya = wilayaSelect ? wilayaSelect.value : DEFAULT_WILAYA;
      const commune = communeInput ? communeInput.value.trim() : "";
      const fee = getShippingFee();

      if (!name || !phone) return;
      if (deliveryType === 'domicile' && !commune) return;
      const phoneOk = /^0[5-7][0-9]{8}$/.test(phone.replace(/\s+/g,''));
      if (!phoneOk) { alert(t('phoneError')); return; }
      if (fee === null || fee === undefined) return;

      const items = entries.map(([id, qty]) => {
        const p = getProduct(id);
        return { id, name: p.name[currentLang], unitPrice: sellPrice(p), qty, lineTotal: sellPrice(p) * qty };
      });
      const itemsTotal = cartItemsTotal();
      const grandTotal = itemsTotal + fee;
      const orderNo = genOrderNo();

      const orderData = {
        order_no: orderNo,
        customer_name: name,
        customer_phone: phone,
        wilaya,
        address: commune,
        delivery_type: deliveryType,
        items,
        items_total: itemsTotal,
        shipping_fee: fee,
        grand_total: grandTotal
      };

      try {
        if (window.sb) {
          await window.sb.from('orders').insert(orderData);
        }
      } catch (err) {
        console.error('Order save to Supabase failed', err);
      }

      // Send order to Google Sheets backend
      try {
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
      } catch (err) {
        console.error('Order push to Google Sheets failed', err);
      }

      const itemsText = items.map(it => `${it.name} × ${it.qty} — ${fmt(it.lineTotal)}`).join('\n');
      const message =
  `Nouvelle commande — ${orderNo}
  ${itemsText}

  Sous-total : ${fmt(itemsTotal)}
  Livraison (${deliveryType === 'domicile' ? 'Domicile' : 'Bureau'}) : ${fmt(fee)}
  Total : ${fmt(grandTotal)} (paiement à la livraison)

  Nom : ${name}
  Téléphone : ${phone}
  Wilaya : ${wilaya}
  Adresse : ${commune || '—'}`;

      if (finalOrderNo) finalOrderNo.textContent = orderNo;
      if (overlay) overlay.classList.add('show');
      const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
      setTimeout(() => { window.open(waLink, '_blank'); }, 350);

      cart = {};
    });
  }

  const closeOverlayBtn = document.getElementById('closeOverlay');
  if (closeOverlayBtn) {
    closeOverlayBtn.addEventListener('click', () => {
      if (overlay) overlay.classList.remove('show');
      if (form) form.reset();
      if (wilayaSelect) wilayaSelect.value = DEFAULT_WILAYA;
      setDeliveryType('domicile');
      renderCart(); renderCheckout(); renderCatalog();
      if (orderPreviewNo) orderPreviewNo.textContent = genOrderNo();
    });
  }

  /* ---------------- Google Sheets link check ---------------- */
  async function checkGoogleSheetsStatus(){
    const sheetLink = document.getElementById('googleSheetLink');
    if (!sheetLink) return;
    try {
      const res = await fetch('/api/sheets-info');
      const data = await res.json();
      if (data && data.connected && data.url) {
        sheetLink.href = data.url;
        sheetLink.style.display = 'inline-flex';
      }
    } catch (e) {
      console.warn('Sheets info check failed', e);
    }
  }

  /* ---------------- visit tracking ---------------- */
  (async function trackVisit(){
    try {
      if (window.sb && typeof window.sb.from === 'function') {
        let vk = localStorage.getItem('cn_vk');
        if (!vk){ vk = 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); localStorage.setItem('cn_vk', vk); }
        await window.sb.from('visits').insert({ visitor_key: vk });
      }
    } catch (e) { /* silent — don't break the page */ }
  })();

  /* ---------------- scroll reveal ---------------- */
  function initReveal(){
    const revealEls = document.querySelectorAll('.reveal');
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ---------------- back to top button ---------------- */
  function initBackToTop(){
    const backToTopBtn = document.getElementById('backToTop');
    const heroSection = document.getElementById('top');
    if (!backToTopBtn) return;

    function checkScroll(){
      const heroThreshold = heroSection ? (heroSection.offsetTop + heroSection.offsetHeight - 60) : 300;
      if (window.scrollY > heroThreshold) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    }

    window.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  function initApp(){
    setDeliveryType('domicile');
    applyLanguage('fr');
    initReveal();
    initBackToTop();
    checkGoogleSheetsStatus();

    if ((!PRODUCTS || !PRODUCTS.length) && typeof window !== "undefined" && window.PRODUCTS_CATALOG) {
      PRODUCTS = window.PRODUCTS_CATALOG;
      renderCatalog();
    }

    // Load the live catalog from Supabase — this is what makes admin edits
    // appear on the storefront without a redeploy. Bundled catalog above
    // renders immediately so the page isn't empty while this loads.
    loadProductsFromSupabase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
