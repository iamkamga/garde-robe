// Catalogue partagé : utilisé par le site (secours hors ligne) et par server/seed.js.

export const CATEGORIES = [
  "Chaussures",
  "Godasses",
  "Habits Enfants",
  "Jeans",
  "Robes",
  "Smokings",
  "T-shirts",
];

export const PRODUCT_FILES = {
  "Chaussures": ["Air Jordan N.jpg", "Air Jordan.jpg", "Air Max.jpg", "Casual.jpg", "Mocassin B.jpg", "Mocassin.jpg", "NIKE AIR FORCE .jpg", "Nike Air Force 1 i.jpg", "Pointinini B.jpg", "Pointinini.jpg", "Sebastian Leather.jpg", "Timberland.jpg", "Under amour.jpg"],
  "Godasses": ["Adidas Chaos.jpg", "Adidas G.jpg", "Adidas J.jpg", "Adidas.jpg", "Crazyfast.jpg", "Gold.jpg", "Green Mood.jpg", "Guayos.jpg", "Inspires Player .jpg", "Mercurial Vapor 17.jpg", "Nike B.jpg", "Nike P.jpg", "Nike R.jpg"],
  "Habits Enfants": ["Ensemble 1.jpg", "Ensemble 2.jpg", "Ensemble 3.jpg", "Ensemble 4.jpg", "Ensemble 5.jpg", "Ensemble 6.jpg", "Ensemble 7.jpg", "Ensemble 8.jpg", "Ensemble 9.jpg", "Ensemble 10.jpg", "Ensemble 11.jpg", "Ensemble 12.jpg", "Ensemble 13.jpg"],
  "Jeans": ["Bad Mood.jpg", "Baggui N.jpg", "Baggui.jpg", "Baggy.jpg", "Cool Break.jpg", "Essential.jpg", "Grayzzy.jpg", "Large.jpg", "Regular.jpg", "Skinny.jpg", "Stone.jpg", "Viral.jpg", "Wide Merge.jpg"],
  "Robes": ["Beauty.jpg", "Elegant.jpg", "Glamour.jpg", "Luxury.jpg", "Mirage.jpg", "Princesse.jpg", "Rose Bonbon.jpg", "Violette M.jpg"],
  "Smokings": ["Addict.jpg", "Atelier.jpg", "Black Tailor.jpg", "Bordeauxx.jpg", "Croisénoir.jpg", "Custom.jpg", "Hypper.jpg", "King.jpg", "Monster.jpg", "Riffer.jpg", "Smoking Fursac.jpg", "Smoking H.jpg", "Smoking Litan.jpg", "Von.jpg", "soot.jpg"],
  "T-shirts": ["Black.jpg", "Décontracté.jpg", "Grphical.jpg", "Instagram.jpg", "Stylish.jpg", "Teen Boy.jpg", "White.jpg"],
};

const FOLDER_NAMES = {
  "Chaussures": "chaussures",
  "Smokings": "Smockings",
  "T-shirts": "T-shirt",
};
export const BASE_PRICES = {
  "Chaussures": 95,
  "Godasses": 110,
  "Habits Enfants": 42,
  "Jeans": 82,
  "Robes": 115,
  "Smokings": 240,
  "T-shirts": 28,
};

export const PRODUCTS = CATEGORIES.flatMap((category) =>
  PRODUCT_FILES[category].map((file, index) => ({
    id: `${category}-${index}`,
    category,
    name: file.replace(/\.jpg$/i, "").trim(),
    price: BASE_PRICES[category] + (index % 4) * 5,
    image: `/products/${FOLDER_NAMES[category] || category}/${file}`,
  }))
);
