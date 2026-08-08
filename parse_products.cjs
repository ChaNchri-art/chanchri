const fs = require('fs');

const csvContent = fs.readFileSync('./products.csv', 'utf8');

function parseCSV(text) {
  const lines = text.split('\n');
  const result = [];
  let headers = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
    if (!matches) continue;
    
    const row = matches.map(m => {
      let cell = m.startsWith(',') ? m.slice(1) : m;
      cell = cell.trim();
      if (cell.startsWith('"') && cell.endsWith('"')) {
        cell = cell.slice(1, -1).replace(/""/g, '"');
      }
      return cell;
    });

    if (!headers) {
      headers = row;
    } else {
      result.push(row);
    }
  }
  return { headers, result };
}

const { result } = parseCSV(csvContent);

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
}

function parsePrice(priceStr) {
  if (!priceStr) return 1000;
  const numStr = priceStr.replace(/[^0-9]/g, '');
  const price = parseInt(numStr, 10);
  if (isNaN(price) || price <= 0) return 1000;
  return price;
}

function detectCategory(title, url = '') {
  if (url && (url.includes('/category/17') || url.includes('category/17'))) return 'maison';
  if (url && (url.includes('/category/12') || url.includes('category/12') || url.includes('/category/23') || url.includes('category/23'))) return 'camping';
  if (url && (url.includes('/category/11') || url.includes('category/11'))) return 'sport';
  if (url && (url.includes('/category/10') || url.includes('category/10'))) return 'sante';
  if (url && (url.includes('/category/9') || url.includes('category/9'))) return 'sacs';

  const t = title.toLowerCase();
  if (/camping|tente|tent|sac de couchage|randonnee|matelas|piscine|glaciere|hamac|paddle|kayak|bouee|brassard|pelle|rechaud|lanterne|pique-nique|gourde|تخييم|رحلات|خيمة|حقيبة ظهر|طاولة تخييم|مظلة|شاطئ|سباحة/i.test(t)) return 'camping';
  if (/voiture|auto|retroviseur|pneu|balai|bache|volant|pedale|radar|moteur|siege|moto|casque|demarrage|compresseur|سيارة|قيادة|دراجة|سيارات|pare-soleil|housse|essuie-glace/i.test(t)) return 'auto';
  if (/jouet|enfant|bebe|trottinette|magic book|blocs|karting|لعبة|أطفال|طفل|سكوتر|كتابة|biberon/i.test(t)) return 'jouets';
  if (/sport|fitness|yoga|musculation|abdominaux|poignee|massage|pistolet|corde|ceinture|entrainement|رياضة|تمرين|لياقة|تدليك|معصم|boxe|sauter|sit-up/i.test(t)) return 'sport';
  if (/outil|caisse|cle|tournevis|pince|scie|niveau laser|multimetre|testeur|fer|colle|عدّة|مفك|أدوات|تصليح|مقياس|cloueur|visseuse|douilles|foret/i.test(t)) return 'outils';
  if (/ongles|maquillage|cheveux|rasoir|visage|pinceaux|beaute|sante|تجميل|مكياج|شعر|أظافر|صحة|manucure|pedicure|dentaire|hydropulseur|brosse a dents/i.test(t)) return 'sante';
  if (/sac|valise|sacoche|pochette|dos|voyage|حقيبة|محفظة|أمتعة/i.test(t)) return 'sacs';
  if (/bluetooth|ecouteurs|casque|wifi|camera|gps|montre|smart|led|lampe|veilleuse|torche|clavier|gaming|projecteur|power bank|usb|lecteur|enceinte|haut parleur|alarme|شاحن|ساعة|سماعات|إلكترونية|مصباح|لوحة مفاتيح/i.test(t)) return 'tech';
  if (/horloge|tableau|cadre|deco|fleurs|vase|miroir|bougie|drap|housse|oreiller|tapis|rideau|منزل|ديكور|مرآة|سجادة|ستائر/i.test(t)) return 'decor';

  return 'maison';
}

function splitTitle(fullTitle) {
  let fr = fullTitle.trim();
  let ar = fullTitle.trim();
  let en = fullTitle.trim();

  const parts = fullTitle.split(/–|-/);
  if (parts.length >= 2) {
    const p1 = parts[0].trim();
    const p2 = parts.slice(1).join(' - ').trim();
    
    const p1HasAr = /[\u0600-\u06FF]/.test(p1);
    const p2HasAr = /[\u0600-\u06FF]/.test(p2);
    
    if (p2HasAr && !p1HasAr) {
      fr = p1;
      ar = p2;
      en = p1;
    } else if (p1HasAr && !p2HasAr) {
      fr = p2;
      ar = p1;
      en = p2;
    }
  }

  fr = fr.replace(/\s+/g, ' ');
  ar = ar.replace(/\s+/g, ' ');
  en = en.replace(/\s+/g, ' ');

  return { fr, ar, en };
}

const CATEGORY_DEFAULT_TITLES = {
  maison: { fr: 'Article Maison & Confort', ar: 'منتج للمنزل والراحة', en: 'Home & Living Product' },
  camping: { fr: 'Équipement Camping & Voyage', ar: 'معدات التخييم والسفر', en: 'Camping & Outdoor Gear' },
  sport: { fr: 'Accessoire Sport & Fitness', ar: 'مستلزمات الرياضة واللياقة', en: 'Sport & Fitness Accessory' },
  sante: { fr: 'Produit Beauté & Soin', ar: 'منتج الجمال والعناية', en: 'Beauty & Care Product' },
  sacs: { fr: 'Sac & Bagagerie', ar: 'حقيبة وأمتعة', en: 'Bag & Travel Luggage' },
  auto: { fr: 'Accessoire Auto & Moto', ar: 'ملحقات السيارات والدراجات', en: 'Car & Bike Accessory' },
  jouets: { fr: 'Jouet & Article Enfant', ar: 'لعبة ومستلزمات الأطفال', en: 'Toy & Kids Item' },
  outils: { fr: 'Outil & Matériel Bricolage', ar: 'أدوات ومعدات التصليح', en: 'Tool & DIY Equipment' },
  tech: { fr: 'Gadget & Électronique', ar: 'إلكترونيات وأجهزة ذكية', en: 'Tech & Electronics Gadget' },
  decor: { fr: 'Objet Décoration & Intérieur', ar: 'ديكورات وإكسسوارات منزلية', en: 'Home Decor & Accent' }
};

function isHashOrInvalid(str) {
  if (!str) return true;
  str = str.trim();
  if (/^[0-9\s\-_.,]+$/.test(str)) return true;
  if (/^\d+[-_\d]*$/.test(str)) return true;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(str)) return true;
  if (/^[0-9a-f]{16,}$/i.test(str)) return true;
  if (/^(photo|il_\d|s-l\d|O1CN|Ha\d|0024|WhatsApp|Untitled|file|image|img|\d+x\d+|téléchargement|telechargement)/i.test(str)) return true;
  if (/^[a-zA-Z0-9]{8,15}\./i.test(str)) return true;

  const letters = str.replace(/[^a-zA-Z\u0600-\u06FF]/g, '');
  if (letters.length < 3) return true;
  return false;
}

function extractTitleFromImage(imageUrl, categoryId) {
  const catDefaults = CATEGORY_DEFAULT_TITLES[categoryId] || CATEGORY_DEFAULT_TITLES.maison;
  if (!imageUrl) return catDefaults;
  
  let filename = imageUrl.split('?')[0].split('#')[0].split('/').pop() || '';
  filename = filename.replace(/\.(jpg|jpeg|png|webp|gif|svg)(\_*\.webp)?$/i, '');
  
  if (isHashOrInvalid(filename)) {
    return catDefaults;
  }

  let clean = filename.replace(/[-_]+/g, ' ').trim();
  clean = clean.replace(/\b(cnc|600x600|1000x1000|sl1000|ac sl1500|jpg|jpeg|png|webp|gif|38 cm|photo)\b/gi, '').trim();
  clean = clean.replace(/\s+/g, ' ');

  // Fix French words
  clean = clean.replace(/\bcr ative\b/gi, 'créative')
               .replace(/\bm duse\b/gi, 'méduse')
               .replace(/\bdhuiles\b/gi, "d'huiles")
               .replace(/\bdair\b/gi, "d'air")
               .replace(/\bdarome\b/gi, "d'arôme");

  if (clean.length < 3 || isHashOrInvalid(clean)) {
    return catDefaults;
  }

  const titleFr = clean.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ');
  
  return {
    fr: titleFr,
    en: titleFr,
    ar: titleFr
  };
}

// Custom overrides for specific items with known rich images/data
const CUSTOM_OVERRIDES = {
  "1786124408-6": { // LED Message Box
    image: "./images/lightbox_main.jpg",
    images: [
      "./images/lightbox_main.jpg",
      "./images/lightbox_cards.jpg",
      "./images/lightbox_details.jpg",
      "./images/lightbox_lifestyle.jpg"
    ]
  },
  "1786124408-5": { // Trottinette
    images: [
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/2249/ball50pcs-1.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/2250/143655033dbb297b548a2500231297a37d77ff21_1630733476-1.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/2251/abdb19e1ebf17c7252a2ee71045670103a667acd_1630733477-1.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/2252/5a_1.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/2253/7bc5db47f19ea5954192c27b7faa57f15373aa7b_1637694825.jpg"
    ]
  },
  "1786124408-4": { // Porte Manteau Blanc Marron
    images: [
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/1003/Porte-Manteau-Blanc-Marron-7Cro-CNC.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/1004/Porte-Manteau-Blanc-Marron-7Cro-2.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/1005/Porte-Manteau-Blanc-Marron-7Cro-1.jpg"
    ]
  },
  "1786124408-3": { // Porte Manteau Blanc Noir
    images: [
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/995/38-cm-2023-02-13T151808.288.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/996/38-cm-2023-02-13T173911.062.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/997/38-cm-2023-02-13T174342.971.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/998/38-cm-2023-02-13T174302.688.jpg",
      "https://sawaqli.fra1.cdn.digitaloceanspaces.com/999/38-cm-2023-02-13T174240.413.jpg"
    ]
  },
  "1786124408-267": { // Deflecteur
    images: [
      "https://sawa9ly.app/storage/75134/1782117845026_58z712he_1.jpg",
      "https://sawa9ly.app/storage/75135/1782117610923_2x3yarkc_71kspbbwszl._ac_sl1500_.jpg",
      "https://sawa9ly.app/storage/75136/1782117609971_o3qlw4n5_71ioqqhldtl._ac_sl1500_.jpg",
      "https://sawa9ly.app/storage/75137/1782117613007_ssw87553_61g9q1iguql._ac_sl1500_.jpg",
      "https://sawa9ly.app/storage/75138/1782117613022_pm8jh5w5_61gqcr0ip4l._ac_sl1001_.jpg"
    ]
  },
  "1786124408-274": { // Organisateur Maquillage
    images: [
      "https://sawa9ly.app/storage/76237/1785059402073_s6cbglsj_61jgaad5lml._ac_sl1001_.jpg",
      "https://sawa9ly.app/storage/76238/1785059377595_ly2ge5f9_61ddlzzyr0l._ac_sl1166_.jpg",
      "https://sawa9ly.app/storage/76239/1785059377569_2gm3shcp_61fs6ruhwwl._ac_sl1001_.jpg",
      "https://sawa9ly.app/storage/76240/1785059380872_qngqoiu9_9ff891ff-1218-4595-96b0-27a84862a6a9.c05d995e4efd95060fc1f5b1e538e0e1.jpeg",
      "https://sawa9ly.app/storage/76241/1785059380865_597okvr5_5bf16b3c-a5aa-4a08-9cb9-bdae42c53e68.8a8ff32d63395c420e4c04fee3f8ce57.jpeg"
    ]
  }
};

const products = [];

result.forEach((row, index) => {
  let order, url, rawTitle, priceStr, btnText, imageUrl;
  if (row.length >= 7) {
    [order, url, , rawTitle, priceStr, btnText, imageUrl] = row;
  } else {
    [order, url, rawTitle, priceStr, btnText, imageUrl] = row;
  }
  if (!rawTitle) return;

  const basePrice = parsePrice(priceStr);
  const categoryId = detectCategory(rawTitle, url);
  
  let names;
  if (isHashOrInvalid(rawTitle)) {
    names = extractTitleFromImage(imageUrl, categoryId);
  } else {
    names = splitTitle(rawTitle);
  }

  const { fr, ar, en } = names;
  const id = `${slugify(fr || 'produit')}-${index + 1}`;
  const override = CUSTOM_OVERRIDES[order] || {};

  products.push({
    id,
    categoryId,
    basePrice,
    image: override.image || imageUrl,
    images: override.images || [imageUrl],
    name: { fr, en, ar },
    tagline: {
      fr: `${fr} — Paiement à la livraison dans les 58 wilayas`,
      en: `${en} — Cash on delivery across 58 wilayas`,
      ar: `${ar} — الدفع عند الاستلام في جميع الـ 58 ولاية`
    },
    description: {
      fr: `${fr}\n• Livraison rapide disponible dans les 58 wilayas.\n• Paiement sécurisé à la réception du colis (Cash sur Livraison).\n• Garantie de satisfaction et produit conforme aux photos.`,
      en: `${en}\n• Fast delivery available across all 58 wilayas.\n• Cash on Delivery (COD) payment upon receipt.\n• Satisfaction guaranteed & quality assured.`,
      ar: `${ar}\n• توصيل سريع متوفر لجميع الـ 58 ولاية.\n• الدفع عند الاستلام بعد معاينة الطلبية.\n• جودة عالية ومطابقة للمواصفات.`
    }
  });
});

console.log(`Generated ${products.length} products!`);

fs.writeFileSync('./products_parsed.json', JSON.stringify(products, null, 2), 'utf8');

const jsOutput = `/* Auto-generated products catalog from CSV (${products.length} items) */
window.PRODUCTS_CATALOG = ${JSON.stringify(products, null, 2)};
`;

fs.writeFileSync('./public/products_catalog.js', jsOutput, 'utf8');
console.log('Saved to /public/products_catalog.js');
