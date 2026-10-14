import React, { useState, useMemo, useEffect } from "react";
import { Search, Heart, ShoppingBag, X, Plus, Minus, UserRound } from "lucide-react";
import { CATEGORIES, PRODUCTS as LOCAL_PRODUCTS } from "./data/catalog.js";
import { useAuth } from "./auth.jsx";

const CART_KEY = "garde-robe-cart";

// Le panier survit au passage par la page compte (stockage local du navigateur).
function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

const INK = "#22201D";
const IVORY = "#F5F2ED";
const CARD = "#FFFFFF";

const CAT_STYLE = {
  "Chaussures": { bg: "#C9B79C", fg: INK },
  "Godasses": { bg: "#6B705C", fg: IVORY },
  "Habits Enfants": { bg: "#E8B4B8", fg: INK },
  "Jeans": { bg: "#4A5A6A", fg: IVORY },
  "Robes": { bg: "#7A2E2E", fg: IVORY },
  "Smokings": { bg: "#1D1B18", fg: "#C7A15A" },
  "T-shirts": { bg: "#EDE6DA", fg: INK },
};

const ICONS = {
  "Chaussures": "M3 18c0-3 2-5 5-6l2-1 4 1c3 1 6 2 8 3v3H3z",
  "Godasses": "M6 3v8l-3 3v4h16v-3c0-2-2-3-4-4V3H6z",
  "Habits Enfants": "M9 3L7 5v3H4l1 4h2v9h10v-9h2l1-4h-3V5l-2-2H9z",
  "Jeans": "M6 3h12l1 9-1 9h-4l-1-10-1 10H8l-1-9z",
  "Robes": "M12 3l-2 3H8L5 21h14L16 6h-2z",
  "Smokings": "M2 8l8 4-8 4V8zM22 8l-8 4 8 4V8zM10 12h4",
  "T-shirts": "M8 4L3 7v4h3v9h12v-9h3V7l-5-3-2 2h-4z",
};

function CategoryIcon({ category, size = 40 }) {
  const { fg } = CAT_STYLE[category];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={fg}
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[category]} />
    </svg>
  );
}

function ProductCard({ product, onAdd, wished, onToggleWish }) {
  const { bg } = CAT_STYLE[product.category];
  return (
    <div className="flex flex-col group">
      <div
        className="relative aspect-[4/5] flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: bg }}
      >
        {product.badge && (
          <span
            className="absolute top-3 left-3 text-xs font-medium px-2 py-1"
            style={{ backgroundColor: IVORY, color: INK }}
          >
            {product.badge}
          </span>
        )}
        <button
          onClick={() => onToggleWish(product.id)}
          aria-label="Ajouter aux favoris"
          className="absolute top-3 right-3 p-1.5 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: "rgba(245,242,237,0.85)" }}
        >
          <Heart
            size={16}
            color={INK}
            fill={wished ? INK : "none"}
          />
        </button>
        <div className="w-full h-full transition-transform duration-300 group-hover:scale-105">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </div>
      <div className="pt-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm" style={{ color: INK }}>{product.name}</p>
          <p className="text-sm mt-0.5" style={{ color: "#8A8578" }}>{product.price} €</p>
        </div>
      </div>
      <button
        onClick={() => onAdd(product)}
        className="mt-3 w-full text-sm py-2.5 border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        style={{ borderColor: INK, color: INK }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = INK; e.currentTarget.style.color = IVORY; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = INK; }}
      >
        Ajouter au panier
      </button>
    </div>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const { user } = useAuth();
  const [cart, setCart] = useState(loadCart);
  const [wishlist, setWishlist] = useState(new Set());
  const [newsletterSent, setNewsletterSent] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterError, setNewsletterError] = useState("");
  const [products, setProducts] = useState(LOCAL_PRODUCTS);
  const [ordering, setOrdering] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");

  // Catalogue depuis Neon via l'API ; on garde le catalogue local si l'API ne répond pas.
  useEffect(() => {
    fetch("/api/products")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((rows) => rows.length && setProducts(rows))
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart]);

  async function subscribeNewsletter() {
    setNewsletterError("");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || "Erreur");
      setNewsletterSent(true);
    } catch (e) {
      setNewsletterError(e.message === "Email invalide" ? "Email invalide." : "Service indisponible, réessayez plus tard.");
    }
  }

  async function placeOrder() {
    setOrdering(true);
    setOrderMessage("");
    try {
      const r = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((i) => ({ id: i.id, qty: i.qty })) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error);
      setCart([]);
      setOrderMessage(`Merci ! Commande n° ${data.orderId} enregistrée (${data.total} €).`);
    } catch {
      setOrderMessage("La commande n'a pas pu être enregistrée. Réessayez plus tard.");
    } finally {
      setOrdering(false);
    }
  }

  function addToCart(product) {
    setOrderMessage("");
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...product, qty: 1 }];
    });
    setCartOpen(true);
  }

  function updateQty(id, delta) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
        .filter((i) => i.qty > 0)
    );
  }

  function removeFromCart(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }

  function toggleWish(id) {
    setWishlist((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat = activeCategory === "Tout" || p.category === activeCategory;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, activeCategory, search]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.price, 0);

  return (
    <div className="min-h-screen font-body" style={{ backgroundColor: IVORY, color: INK }}>
      <style>{`
        @keyframes heroIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .hero-anim { animation: heroIn 0.7s ease-out both; }
        ::selection { background: ${INK}; color: ${IVORY}; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: IVORY, borderColor: "#DEDACF" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="flex items-center justify-between h-16">
            <span className="font-display text-xl tracking-tight" style={{ color: INK }}>
              Garde-Robe
            </span>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSearchOpen((s) => !s)}
                aria-label="Rechercher"
                className="p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Search size={19} color={INK} />
              </button>
              <button
                onClick={() => setCartOpen(true)}
                aria-label="Voir le panier"
                className="relative p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <ShoppingBag size={19} color={INK} />
                {cartCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ backgroundColor: "#7A2E2E", color: IVORY }}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
              <a
                href="#/compte"
                aria-label={user ? `Mon compte (${user.name})` : "Se connecter"}
                title={user ? `Connecté : ${user.name}` : "Se connecter / créer un compte"}
                className="relative p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                {user ? (
                  <span
                    className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-medium"
                    style={{ backgroundColor: INK, color: IVORY }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <UserRound size={19} color={INK} />
                )}
              </a>
            </div>
          </div>
          {searchOpen && (
            <div className="pb-3">
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un article"
                className="w-full text-sm px-3 py-2 border focus:outline-none"
                style={{ borderColor: "#DEDACF", backgroundColor: CARD }}
              />
            </div>
          )}
          <nav className="flex gap-6 overflow-x-auto pb-3 pt-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {["Tout", ...CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="text-sm whitespace-nowrap pb-1 border-b-2 transition-colors focus:outline-none"
                style={{
                  borderColor: activeCategory === cat ? INK : "transparent",
                  color: activeCategory === cat ? INK : "#8A8578",
                }}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-12 pb-16 grid grid-cols-1 md:grid-cols-5 gap-10 items-center">
        <div className="md:col-span-3 hero-anim">
          <h1 className="font-display text-4xl md:text-5xl leading-tight" style={{ color: INK }}>
            Chaque pièce a sa place dans votre semaine
          </h1>
          <p className="mt-5 text-base max-w-md" style={{ color: "#5C5748" }}>
            Des chaussures du matin aux smokings du soir, en passant par le vestiaire des
            plus petits — une garde-robe pensée pour durer, pas pour suivre les saisons.
          </p>
          <button
            onClick={() => setActiveCategory("Tout")}
            className="mt-7 inline-block text-sm px-6 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ backgroundColor: INK, color: IVORY }}
          >
            Voir la collection
          </button>
        </div>
        <div className="md:col-span-2 relative h-72 hidden md:block">
          <div
            className="absolute top-0 left-4 w-40 h-52 flex items-end p-4"
            style={{ backgroundColor: CAT_STYLE["Robes"].bg }}
          >
            <span className="text-sm" style={{ color: CAT_STYLE["Robes"].fg }}>Robes</span>
          </div>
          <div
            className="absolute top-10 right-0 w-36 h-44 flex items-end p-4"
            style={{ backgroundColor: CAT_STYLE["Smokings"].bg }}
          >
            <span className="text-sm" style={{ color: CAT_STYLE["Smokings"].fg }}>Smokings</span>
          </div>
          <div
            className="absolute bottom-0 left-24 w-32 h-32 flex items-end p-4"
            style={{ backgroundColor: CAT_STYLE["Jeans"].bg }}
          >
            <span className="text-sm" style={{ color: CAT_STYLE["Jeans"].fg }}>Jeans</span>
          </div>
        </div>
      </section>

      {/* Product grid */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pb-20">
        <div className="flex items-baseline justify-between mb-6 border-t pt-6" style={{ borderColor: "#DEDACF" }}>
          <h2 className="font-display text-2xl" style={{ color: INK }}>
            {activeCategory === "Tout" ? "Toute la collection" : activeCategory}
          </h2>
          <span className="text-sm" style={{ color: "#8A8578" }}>{filtered.length} articles</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm py-12 text-center" style={{ color: "#8A8578" }}>
            Aucun article ne correspond à votre recherche.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
            {filtered.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAdd={addToCart}
                wished={wishlist.has(p.id)}
                onToggleWish={toggleWish}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t" style={{ borderColor: "#DEDACF" }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <span className="font-display text-xl" style={{ color: INK }}>Garde-Robe</span>
            <p className="text-sm mt-3 max-w-xs" style={{ color: "#8A8578" }}>
              Une sélection resserrée de vêtements et de chaussures, du berceau au grand soir.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: INK }}>Boutique</p>
            <ul className="space-y-2 text-sm" style={{ color: "#8A8578" }}>
              {CATEGORIES.map((c) => (
                <li key={c}>
                  <button onClick={() => setActiveCategory(c)} className="hover:underline">
                    {c}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: INK }}>Restez informé</p>
            <p className="text-sm mb-3" style={{ color: "#8A8578" }}>
              Les nouveautés, une fois par mois, sans surcharge.
            </p>
            {newsletterSent ? (
              <p className="text-sm" style={{ color: INK }}>Merci, à bientôt.</p>
            ) : (
              <>
                <div className="flex">
                  <input
                    type="email"
                    placeholder="Votre email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 border focus:outline-none"
                    style={{ borderColor: "#DEDACF", backgroundColor: CARD }}
                  />
                  <button
                    onClick={subscribeNewsletter}
                    className="text-sm px-4 focus:outline-none focus-visible:ring-2"
                    style={{ backgroundColor: INK, color: IVORY }}
                  >
                    Envoyer
                  </button>
                </div>
                {newsletterError && (
                  <p className="text-xs mt-2" style={{ color: "#7A2E2E" }}>{newsletterError}</p>
                )}
              </>
            )}
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-5 md:px-8 pb-8 text-xs" style={{ color: "#A6A190" }}>
          © 2026 Garde-Robe.
        </div>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setCartOpen(false)}
          />
          <div
            className="relative w-full max-w-sm h-full flex flex-col"
            style={{ backgroundColor: IVORY }}
          >
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#DEDACF" }}>
              <span className="font-display text-lg" style={{ color: INK }}>Votre panier</span>
              <button onClick={() => setCartOpen(false)} aria-label="Fermer" className="focus:outline-none">
                <X size={20} color={INK} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {orderMessage && (
                <p className="text-sm" style={{ color: INK }}>{orderMessage}</p>
              )}
              {cart.length === 0 ? (
                !orderMessage && (
                  <p className="text-sm" style={{ color: "#8A8578" }}>
                    Votre panier est vide pour le moment.
                  </p>
                )
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div
                      className="w-16 h-20 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: CAT_STYLE[item.category].bg }}
                    >
                      <CategoryIcon category={item.category} size={26} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="text-sm" style={{ color: INK }}>{item.name}</p>
                        <button onClick={() => removeFromCart(item.id)} className="focus:outline-none">
                          <X size={14} color="#8A8578" />
                        </button>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: "#8A8578" }}>{item.price} €</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          className="p-1 border focus:outline-none"
                          style={{ borderColor: "#DEDACF" }}
                        >
                          <Minus size={12} color={INK} />
                        </button>
                        <span className="text-sm" style={{ color: INK }}>{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          className="p-1 border focus:outline-none"
                          style={{ borderColor: "#DEDACF" }}
                        >
                          <Plus size={12} color={INK} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t" style={{ borderColor: "#DEDACF" }}>
                <div className="flex justify-between text-sm mb-4">
                  <span style={{ color: "#8A8578" }}>Sous-total</span>
                  <span style={{ color: INK }}>{cartTotal} €</span>
                </div>
                <button
                  onClick={placeOrder}
                  disabled={ordering}
                  className="w-full text-sm py-3 focus:outline-none focus-visible:ring-2 disabled:opacity-60"
                  style={{ backgroundColor: INK, color: IVORY }}
                >
                  {ordering ? "Envoi…" : "Passer commande"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
