import { DEFAULT_STATE } from "./default-state.js";

const STORAGE_KEY = "toki23-state-v3";
const THEME_KEY = "toki23-theme-v1";
const MAX_LOGS = 50;
const APP_BASE_PATH = resolveAppBasePath();
const ORDER_STATUS_LABELS = {
  new: "Новый",
  confirmed: "Подтверждён",
  cooking: "Готовится",
  on_way: "В пути",
  delivered: "Доставлен",
  cancelled: "Отменён",
};
const ORDER_STATUS_CLASSES = {
  new: "is-new",
  confirmed: "is-confirmed",
  cooking: "is-cooking",
  on_way: "is-on_way",
  delivered: "is-delivered",
  cancelled: "is-cancelled",
};
const ADMIN_SECTIONS = [
  { id: "dashboard", label: "Dashboard", icon: "dashboard" },
  { id: "content", label: "Контент", icon: "dashboard_customize" },
  { id: "menu", label: "Меню", icon: "restaurant_menu" },
  { id: "orders", label: "Заказы", icon: "receipt_long" },
  { id: "zones", label: "Зоны", icon: "map" },
  { id: "promos", label: "Акции", icon: "campaign" },
  { id: "users", label: "Клиенты", icon: "groups" },
  { id: "settings", label: "Настройки", icon: "settings" },
  { id: "logs", label: "Логи", icon: "bug_report" },
];

const root = document.querySelector("#app");

let state = loadState();
let uiState = createUiState();
let heroTimerId = null;

function resolveAppBasePath() {
  if (typeof window !== "undefined" && typeof window.__APP_BASE_PATH__ === "string" && window.__APP_BASE_PATH__) {
    return window.__APP_BASE_PATH__;
  }

  if (typeof window !== "undefined") {
    const pathname = window.location.pathname || "/";

    if (/github\.io$/i.test(window.location.hostname)) {
      const [repoName] = pathname.split("/").filter(Boolean);
      if (repoName) return `/${repoName}/`;
    }

    if (/\/[^/]+\.[a-z0-9]+$/i.test(pathname)) {
      return pathname.slice(0, pathname.lastIndexOf("/") + 1) || "/";
    }

    return pathname.endsWith("/") ? pathname : `${pathname}/`;
  }

  return "/";
}

function resolveCurrentRoutePath() {
  const params = new URLSearchParams(window.location.search);
  const routeOverride = params.get("route");

  if (routeOverride) {
    return routeOverride.startsWith("/") ? routeOverride : `/${routeOverride}`;
  }

  const routePath = stripBasePath(window.location.pathname);

  if (routePath === "/index.html") {
    return "/";
  }

  if (/\/index\.html$/i.test(routePath)) {
    return routePath.slice(0, -"/index.html".length) || "/";
  }

  return routePath || "/";
}

function stripBasePath(pathname) {
  const cleanPath = pathname || "/";
  const normalizedBase = APP_BASE_PATH === "/" ? "" : APP_BASE_PATH.replace(/\/$/, "");
  if (!normalizedBase) return cleanPath || "/";
  if (cleanPath === normalizedBase) return "/";
  return cleanPath.startsWith(`${normalizedBase}/`) ? cleanPath.slice(normalizedBase.length) || "/" : cleanPath;
}

function appHref(path = "/") {
  if (/^(?:[a-z]+:)?\/\//i.test(path)) return path;
  const url = new URL(path || "/", window.location.origin);
  const routePath = stripBasePath(url.pathname);
  const basePrefix = APP_BASE_PATH === "/" ? "" : APP_BASE_PATH.replace(/\/$/, "");
  return `${basePrefix}${routePath}${url.search}${url.hash}` || "/";
}

function linkProps(path = "/") {
  return `href="${escapeHtml(appHref(path))}" data-link="${escapeHtml(path)}"`;
}

function createUiState() {
  const params = new URLSearchParams(window.location.search);
  return {
    route: parseRoute(resolveCurrentRoutePath()),
    adminSection: params.get("section") || "dashboard",
    theme: loadTheme(),
    catalog: {
      search: "",
      sort: "popular",
      premiumOnly: false,
      spicyOnly: false,
      availableOnly: true,
    },
    productTab: "description",
    heroSlide: 0,
    openFaq: 0,
    accountOrderFilter: "all",
    adminOrderFilter: "all",
    modal: null,
    toasts: [],
    pendingHash: window.location.hash || "",
    pendingScrollBehavior: "auto",
    focusRestore: null,
    previewModifiers: {},
    previewQuantities: {},
    selectedCategoryId: state.categories[0]?.id || "",
    selectedProductId: state.products[0]?.id || "",
    selectedZoneId: state.zones[0]?.id || "",
    selectedPromoId: state.promotions[0]?.id || "",
    selectedOrderId: state.orders[0]?.id || "",
    selectedCustomerId: state.session.currentCustomerId || state.customers[0]?.id || "",
  };
}

function loadTheme() {
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "dark";
}

function saveTheme(theme) {
  window.localStorage.setItem(THEME_KEY, theme);
}

function applyTheme() {
  document.documentElement.dataset.theme = uiState.theme;
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.content = uiState.theme === "light" ? "#f7f2eb" : "#0f131c";
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeState(base, override) {
  if (Array.isArray(base)) {
    return Array.isArray(override) ? deepClone(override) : deepClone(base);
  }

  if (isPlainObject(base)) {
    const result = {};
    const source = isPlainObject(override) ? override : {};

    Object.keys(base).forEach((key) => {
      result[key] = mergeState(base[key], source[key]);
    });

    Object.keys(source).forEach((key) => {
      if (!(key in result)) result[key] = deepClone(source[key]);
    });

    return result;
  }

  return override === undefined ? base : override;
}

function loadState() {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initial = deepClone(DEFAULT_STATE);
    saveState(initial);
    return initial;
  }

  try {
    const parsed = JSON.parse(stored);
    if (!isPlainObject(parsed)) throw new Error("Invalid stored state");
    const merged = mergeState(DEFAULT_STATE, parsed);
    saveState(merged);
    return merged;
  } catch {
    const fallback = deepClone(DEFAULT_STATE);
    saveState(fallback);
    return fallback;
  }
}

function saveState(nextState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function updateState(mutator, options = {}) {
  mutator(state);
  saveState(state);
  syncUiSelections();
  if (options.toast) {
    pushToast(options.toast, options.tone || "success");
  }
  renderApp();
}

function syncUiSelections() {
  if (!state.categories.some((item) => item.id === uiState.selectedCategoryId)) uiState.selectedCategoryId = state.categories[0]?.id || "";
  if (!state.products.some((item) => item.id === uiState.selectedProductId)) uiState.selectedProductId = state.products[0]?.id || "";
  if (!state.zones.some((item) => item.id === uiState.selectedZoneId)) uiState.selectedZoneId = state.zones[0]?.id || "";
  if (!state.promotions.some((item) => item.id === uiState.selectedPromoId)) uiState.selectedPromoId = state.promotions[0]?.id || "";
  if (!state.orders.some((item) => item.id === uiState.selectedOrderId)) uiState.selectedOrderId = state.orders[0]?.id || "";
  if (!state.customers.some((item) => item.id === uiState.selectedCustomerId)) uiState.selectedCustomerId = state.session.currentCustomerId || state.customers[0]?.id || "";
}

function pushToast(message, tone = "success") {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  uiState.toasts = [...uiState.toasts, { id, message, tone }];
  renderApp();
  window.setTimeout(() => {
    uiState.toasts = uiState.toasts.filter((item) => item.id !== id);
    renderApp();
  }, 3200);
}

function parseRoute(pathname) {
  const clean = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const parts = clean.split("/").filter(Boolean);
  if (!parts.length) return { name: "home" };
  if (parts[0] === "catalog" && !parts[1]) return { name: "catalog", categorySlug: "" };
  if (parts[0] === "catalog" && parts[1]) return { name: "catalog", categorySlug: parts[1] };
  if (parts[0] === "product" && parts[1]) return { name: "product", slug: parts[1] };
  if (parts[0] === "cart") return { name: "cart" };
  if (parts[0] === "checkout") return { name: "checkout" };
  if (parts[0] === "offers") return { name: "offers" };
  if (parts[0] === "faq") return { name: "faq" };
  if (parts[0] === "contacts") return { name: "contacts" };
  if (parts[0] === "account" && parts[1] === "orders") return { name: "orders" };
  if (parts[0] === "account") return { name: "account" };
  if (parts[0] === "legal" && parts[1]) return { name: "legal", slug: parts[1] };
  if (parts[0] === "admin") return { name: "admin" };
  return { name: "not-found" };
}

function navigateTo(path, options = {}) {
  const url = new URL(appHref(path || "/"), window.location.origin);
  if (options.replace) {
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } else {
    window.history.pushState({}, "", url.pathname + url.search + url.hash);
  }
  uiState.route = parseRoute(stripBasePath(url.pathname));
  if (uiState.route.name === "admin") {
    uiState.adminSection = new URLSearchParams(url.search).get("section") || uiState.adminSection || "dashboard";
  }
  uiState.pendingHash = url.hash || "";
  uiState.pendingScrollBehavior = options.scrollBehavior || "smooth";
  uiState.focusRestore = options.focusSelector ? { selector: options.focusSelector } : uiState.focusRestore;
  if (!url.hash && !options.preserveScroll) {
    window.scrollTo({ top: 0, behavior: options.scrollBehavior || "smooth" });
  }
  renderApp();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPlaceholderImage(label = "Токи23") {
  const title = escapeHtml(String(label || "Токи23").trim().slice(0, 32) || "Токи23");
  const subtitle = escapeHtml((state?.settings?.brandName || "Токи23").slice(0, 24));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#171c25" />
          <stop offset="100%" stop-color="#0f131c" />
        </linearGradient>
        <linearGradient id="accent" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ffb59d" />
          <stop offset="100%" stop-color="#f85f27" />
        </linearGradient>
      </defs>
      <rect width="640" height="640" rx="36" fill="url(#bg)" />
      <circle cx="520" cy="120" r="96" fill="#ffb59d" fill-opacity="0.14" />
      <circle cx="122" cy="522" r="84" fill="#c2c1ff" fill-opacity="0.12" />
      <rect x="88" y="116" width="464" height="248" rx="28" fill="#1b2029" stroke="#31353f" />
      <rect x="118" y="156" width="404" height="16" rx="8" fill="url(#accent)" fill-opacity="0.95" />
      <rect x="118" y="196" width="294" height="12" rx="6" fill="#353943" />
      <rect x="118" y="224" width="238" height="12" rx="6" fill="#2a303a" />
      <rect x="118" y="264" width="116" height="52" rx="18" fill="#262a34" />
      <rect x="248" y="264" width="146" height="52" rx="18" fill="url(#accent)" />
      <text x="88" y="442" fill="#ffb59d" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="4">TOKI23</text>
      <text x="88" y="486" fill="#dfe2ef" font-family="Plus Jakarta Sans, Inter, Arial, sans-serif" font-size="42" font-weight="800">${title}</text>
      <text x="88" y="530" fill="#858d9d" font-family="Inter, Arial, sans-serif" font-size="20">${subtitle}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getSafeImageSrc(src, label) {
  const value = String(src || "").trim();
  return value || getPlaceholderImage(label);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(iso) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function getById(list, id) {
  return list.find((item) => item.id === id) || null;
}

function getCurrentCustomer() {
  return getById(state.customers, state.session.currentCustomerId) || state.customers[0] || null;
}

function getCustomerOrders(customerId) {
  return state.orders.filter((order) => order.customerId === customerId);
}

function findNamedFields(name) {
  return [...document.querySelectorAll(`[name="${name}"], [data-cart-field="${name}"]`)];
}

function clearFieldInvalid(target) {
  if (target?.matches?.(".input, .select, .textarea")) target.removeAttribute("aria-invalid");
}

function markFieldInvalid(name) {
  findNamedFields(name).forEach((field) => field.setAttribute("aria-invalid", "true"));
}

function focusField(name) {
  const field = findNamedFields(name)[0];
  if (!field) return;
  field.focus({ preventScroll: true });
  field.scrollIntoView({ block: "center", behavior: "smooth" });
}

function rememberFocusedControl(target) {
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
  let selector = "";
  if (target.matches("[data-catalog-filter='search']")) selector = "[data-catalog-filter='search']";
  if (target.matches("[data-cart-field]")) selector = `[data-cart-field="${target.getAttribute("data-cart-field")}"]`;
  if (!selector && target.name) selector = `[name="${target.name}"]`;
  if (!selector) return;
  uiState.focusRestore = {
    selector,
    selectionStart: typeof target.selectionStart === "number" ? target.selectionStart : null,
    selectionEnd: typeof target.selectionEnd === "number" ? target.selectionEnd : null,
  };
}

function badgeMarkup(badge) {
  const map = {
    top: { label: "TOP", className: "" },
    premium: { label: "PREMIUM", className: "badge--primary" },
    spicy: { label: "SPICY", className: "badge--danger" },
    new: { label: "NEW", className: "" },
  };
  const item = map[badge] || { label: String(badge).toUpperCase(), className: "" };
  return `<span class="badge ${item.className}">${item.label}</span>`;
}

function getModifierTotal(product, modifierIds) {
  return (modifierIds || []).reduce((sum, id) => {
    const modifier = (product.modifiers || []).find((item) => item.id === id);
    return sum + (modifier?.price || 0);
  }, 0);
}

function getItemKey(item) {
  const modifiersKey = [...(item.modifierIds || [])].sort().join(",");
  return `${item.productId}::${modifiersKey}`;
}

function getLineCategoryIds(lines) {
  return [...new Set(lines.map((line) => line.product.categoryId))];
}

function resolveZone(address, manualZoneId) {
  if (manualZoneId) {
    const manualZone = getById(state.zones, manualZoneId);
    if (manualZone?.enabled) return manualZone;
  }
  const normalized = String(address || "").toLowerCase();
  return state.zones.find((zone) => zone.enabled && zone.keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()))) || null;
}

function isFirstOrder(customer) {
  return !customer || Number(customer.ordersCount || 0) === 0;
}

function promoMatches(promo, context, manualCode = "") {
  if (!promo.active) return false;
  if (promo.mode === "code" && promo.code.toLowerCase() !== manualCode.trim().toLowerCase()) return false;
  if (promo.minSubtotal && context.subtotal < promo.minSubtotal) return false;
  if (promo.firstOrderOnly && !isFirstOrder(context.customer)) return false;
  if (promo.categoryId && !context.categoryIds.includes(promo.categoryId)) return false;
  if (promo.dayOfWeek && String(new Date().getDay()) !== String(promo.dayOfWeek)) return false;
  return true;
}

function computePromoDiscount(promo, context) {
  if (promo.discountType === "free_delivery") return { amount: 0, freeDelivery: true };
  const eligibleSubtotal = promo.categoryId
    ? context.lines.filter((line) => line.product.categoryId === promo.categoryId).reduce((sum, line) => sum + line.lineTotal, 0)
    : context.subtotal;
  if (!eligibleSubtotal) return { amount: 0, freeDelivery: false };
  if (promo.discountType === "percent") return { amount: Math.round((eligibleSubtotal * promo.amount) / 100), freeDelivery: false };
  if (promo.discountType === "fixed") return { amount: Math.min(eligibleSubtotal, promo.amount), freeDelivery: false };
  return { amount: 0, freeDelivery: false };
}

function getCartSnapshot() {
  const lines = state.cart.items
    .map((item) => {
      const product = getById(state.products, item.productId);
      if (!product) return null;
      const modifierTotal = getModifierTotal(product, item.modifierIds);
      const unitPrice = product.price + modifierTotal;
      return {
        ...item,
        key: getItemKey(item),
        product,
        unitPrice,
        lineTotal: unitPrice * item.quantity,
        modifiers: (item.modifierIds || [])
          .map((id) => (product.modifiers || []).find((modifier) => modifier.id === id))
          .filter(Boolean),
      };
    })
    .filter(Boolean);

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const customer = getCurrentCustomer();
  const zone = state.cart.deliveryMode === "pickup" ? null : resolveZone(state.cart.address, state.cart.manualZoneId);
  const context = {
    subtotal,
    customer,
    zone,
    lines,
    categoryIds: getLineCategoryIds(lines),
  };
  const automaticPromos = state.promotions.filter((promo) => promo.mode === "auto" && promoMatches(promo, context));
  const manualPromo = state.cart.promoCode
    ? state.promotions.find((promo) => promo.mode === "code" && promoMatches(promo, context, state.cart.promoCode))
    : null;
  const activePromos = [...automaticPromos, ...(manualPromo ? [manualPromo] : [])];

  const discounts = [];
  let discountTotal = 0;
  let freeDelivery = false;

  activePromos.forEach((promo) => {
    const result = computePromoDiscount(promo, context);
    if (result.freeDelivery) freeDelivery = true;
    if (result.amount > 0) {
      discountTotal += result.amount;
      discounts.push({ id: promo.id, title: promo.title, amount: result.amount });
    }
  });

  const discountedSubtotal = Math.max(0, subtotal - discountTotal);
  const minOrder = zone?.minOrder || 0;
  const freeFrom = zone?.freeFrom || 0;
  const missingForMinOrder = state.cart.deliveryMode === "delivery" ? Math.max(0, minOrder - discountedSubtotal) : 0;
  const missingForFreeDelivery = state.cart.deliveryMode === "delivery" && freeFrom ? Math.max(0, freeFrom - discountedSubtotal) : 0;
  const deliveryFee =
    state.cart.deliveryMode === "pickup"
      ? 0
      : !zone
        ? 0
        : freeDelivery || discountedSubtotal >= freeFrom
          ? 0
          : zone.deliveryPrice;

  return {
    lines,
    customer,
    zone,
    subtotal,
    discounts,
    activePromos,
    discountTotal,
    discountedSubtotal,
    deliveryFee,
    total: discountedSubtotal + deliveryFee,
    minOrder,
    freeFrom,
    missingForMinOrder,
    missingForFreeDelivery,
    isValidZone: state.cart.deliveryMode === "pickup" || Boolean(zone),
  };
}

function getCatalogCategories() {
  return [...state.categories].filter((item) => item.active).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }
  return matrix[a.length][b.length];
}

function matchesCatalogTerm(token, term) {
  if (token.includes(term) || term.includes(token)) return true;
  if (term.length < 4 || token.length < 4) return false;
  if (Math.abs(token.length - term.length) > 1) return false;
  return levenshteinDistance(token, term) <= 1;
}

function productMatchesCatalogSearch(product, terms) {
  if (!terms.length) return true;
  const category = getById(state.categories, product.categoryId);
  const haystack = normalizeSearchText(
    [product.name, product.subcategory, product.description, product.composition, category?.name || "", category?.subtitle || ""].join(" "),
  );
  const tokens = [...new Set(haystack.split(" ").filter(Boolean))];
  return terms.every((term) => haystack.includes(term) || tokens.some((token) => matchesCatalogTerm(token, term)));
}

function getCatalogProducts(categoryId = "") {
  const routeCategorySlug = uiState.route.name === "catalog" ? uiState.route.categorySlug || "" : "";
  const routeCategory = routeCategorySlug ? state.categories.find((item) => item.slug === routeCategorySlug) : null;
  const activeCategoryId = categoryId || routeCategory?.id || "";
  let products = [...state.products];
  if (activeCategoryId) {
    products = products.filter((product) => product.categoryId === activeCategoryId);
  }
  const searchTerms = normalizeSearchText(uiState.catalog.search).split(" ").filter(Boolean);
  if (searchTerms.length) {
    products = products.filter((product) => productMatchesCatalogSearch(product, searchTerms));
  }
  if (uiState.catalog.premiumOnly) products = products.filter((product) => product.premium);
  if (uiState.catalog.spicyOnly) products = products.filter((product) => product.spicy);
  if (uiState.catalog.availableOnly) products = products.filter((product) => product.available);
  products.sort((a, b) => {
    if (uiState.catalog.sort === "price-asc") return a.price - b.price;
    if (uiState.catalog.sort === "price-desc") return b.price - a.price;
    return (a.sortOrder || 0) - (b.sortOrder || 0);
  });
  return products;
}

function getMenuSections() {
  const routeCategorySlug = uiState.route.name === "catalog" ? uiState.route.categorySlug || "" : "";
  const scopedCategories = routeCategorySlug
    ? getCatalogCategories().filter((category) => category.slug === routeCategorySlug)
    : getCatalogCategories();

  return scopedCategories
    .map((category) => ({ ...category, products: getCatalogProducts(category.id) }))
    .filter((category) => category.products.length);
}

function getMenuActiveSlug() {
  const currentHash = uiState.pendingHash || window.location.hash || "";
  if (currentHash.startsWith("#menu-")) return currentHash.replace("#menu-", "");
  if (uiState.route.name === "catalog") return uiState.route.categorySlug || "";
  return "";
}

function getProductBySlug(slug) {
  return state.products.find((product) => product.slug === slug) || null;
}

function addToCart(productId, quantity = 1, modifierIds = []) {
  const product = getById(state.products, productId);
  if (!product || !product.available) {
    pushToast("Этот товар сейчас недоступен", "error");
    return;
  }
  updateState(
    (draft) => {
      draft.session.recentOrderId = "";
      const key = `${productId}::${[...modifierIds].sort().join(",")}`;
      const existing = draft.cart.items.find((item) => getItemKey(item) === key);
      if (existing) {
        existing.quantity += quantity;
      } else {
        draft.cart.items.push({ productId, quantity, modifierIds: [...modifierIds] });
      }
    },
    { toast: `${product.name} добавлен в корзину` },
  );
}

function updateCartLine(lineKey, delta) {
  updateState((draft) => {
    const line = draft.cart.items.find((item) => getItemKey(item) === lineKey);
    if (!line) return;
    line.quantity = Math.max(1, line.quantity + delta);
  });
}

function removeCartLine(lineKey) {
  updateState(
    (draft) => {
      draft.cart.items = draft.cart.items.filter((item) => getItemKey(item) !== lineKey);
    },
    { toast: "Позиция удалена из корзины", tone: "error" },
  );
}

function repeatOrder(orderId) {
  const order = getById(state.orders, orderId);
  if (!order) return;
  updateState(
    (draft) => {
      draft.session.recentOrderId = "";
      draft.cart.items = order.items.map((item) => ({ productId: item.productId, quantity: item.quantity, modifierIds: [...(item.modifierIds || [])] }));
      draft.cart.promoCode = "";
    },
    { toast: `Заказ ${order.id} снова в корзине` },
  );
  navigateTo("/cart");
}

function setSeo(route) {
  const settings = state.settings.seo.pages[route.name] || {};
  let title = settings.title || state.settings.seo.defaultTitle;
  let description = settings.description || state.settings.seo.defaultDescription;
  if (route.name === "product") {
    const product = getProductBySlug(route.slug);
    if (product) {
      title = `${product.name} | ${state.settings.brandName}`;
      description = product.description;
    }
  }
  document.title = title;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "description";
    document.head.append(meta);
  }
  meta.content = description;
}

function renderStatus(status) {
  const label = ORDER_STATUS_LABELS[status] || status;
  const className = ORDER_STATUS_CLASSES[status] || "is-new";
  return `<span class="status-pill ${className}">${label}</span>`;
}

function renderProductCard(product) {
  const imageSrc = getSafeImageSrc(product.image, product.name);
  return `
    <article class="product-card ${product.available ? "" : "is-disabled"}">
      <button class="product-media" data-action="open-product" data-slug="${escapeHtml(product.slug)}" aria-label="Открыть ${escapeHtml(product.name)}">
        <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.name)}" loading="lazy" decoding="async" />
        <div class="product-badges">${(product.badges || []).map((badge) => badgeMarkup(badge)).join("")}</div>
      </button>
      <div class="product-body">
        <span class="product-weight">${escapeHtml(product.weight)} г</span>
        <h3 class="product-name">${escapeHtml(product.name)}</h3>
        <p class="product-subtitle muted">${escapeHtml(product.subcategory)}</p>
        <div class="price-line">
          <span class="price">${formatCurrency(product.price)}</span>
          <button
            class="add-button"
            data-action="add-to-cart"
            data-product-id="${escapeHtml(product.id)}"
            aria-label="${product.available ? `Добавить ${escapeHtml(product.name)} в корзину` : `${escapeHtml(product.name)} недоступен`}"
            ${product.available ? "" : "disabled"}
          >
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderThemeToggle(compact = false) {
  const nextThemeLabel = uiState.theme === "light" ? "Тёмная тема" : "Светлая тема";
  const icon = uiState.theme === "light" ? "dark_mode" : "light_mode";
  return compact
    ? `<button class="icon-button theme-toggle theme-toggle--compact" type="button" data-action="toggle-theme" aria-label="${nextThemeLabel}" title="${nextThemeLabel}">
         <span class="material-symbols-outlined">${icon}</span>
       </button>`
    : `<button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="${nextThemeLabel}">
         <span class="material-symbols-outlined">${icon}</span>
         <span>${nextThemeLabel}</span>
       </button>`;
}

function renderHeader() {
  const routeName = uiState.route.name;
  const menuHashActive = routeName === "home" && window.location.hash.startsWith("#menu");
  const cartCount = state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const links = [
    { href: "/", label: "Главная", active: routeName === "home" && !menuHashActive },
    { href: "/#menu", label: "Меню", active: routeName === "catalog" || routeName === "product" || menuHashActive },
    { href: "/offers", label: "Акции", active: routeName === "offers" },
    { href: "/faq", label: "FAQ", active: routeName === "faq" },
    { href: "/contacts", label: "Контакты", active: routeName === "contacts" },
  ];
  return `
    <header class="site-header">
      <div class="topbar">
        <a class="brand" ${linkProps("/")}>Токи23<small>delivery lounge</small></a>
        <nav class="main-nav">
          ${links
            .map((link) => `<a class="nav-link ${link.active ? "is-active" : ""}" ${linkProps(link.href)}>${link.label}</a>`)
            .join("")}
        </nav>
        <div class="header-actions">
          ${renderThemeToggle(true)}
          <button class="icon-button" data-action="go-catalog" aria-label="Поиск по меню"><span class="material-symbols-outlined">search</span></button>
          <a class="icon-button" ${linkProps("/account")} aria-label="Личный кабинет"><span class="material-symbols-outlined">person</span></a>
          <a class="icon-button cart-badge ${cartCount ? "" : "is-empty"}" data-count="${cartCount}" ${linkProps("/cart")} aria-label="Корзина"><span class="material-symbols-outlined">shopping_bag</span></a>
        </div>
      </div>
    </header>
  `;
}

function renderFooter() {
  return `
    <footer class="footer">
      <div class="container footer-grid">
        <div>
          <div class="brand">Токи23</div>
          <p class="page-subtitle">${escapeHtml(state.settings.footerNote)}</p>
        </div>
        <div class="footer-links">
          ${state.content.footer.links
            .map((item) => `<a class="nav-link" ${linkProps(item.href)}>${escapeHtml(item.label)}</a>`)
            .join("")}
        </div>
        <div class="footer-links">
          <span class="tiny">Контакты</span>
          <a class="nav-link" href="tel:${state.settings.phone}">${escapeHtml(state.settings.phone)}</a>
          <a class="nav-link" href="mailto:${state.settings.email}">${escapeHtml(state.settings.email)}</a>
        </div>
        <div class="footer-links">
          <span class="tiny">График</span>
          <span class="muted">${escapeHtml(state.settings.schedule)}</span>
          <span class="muted">${escapeHtml(state.settings.city)}, ${escapeHtml(state.settings.address)}</span>
        </div>
      </div>
    </footer>
  `;
}

function renderMobileNav() {
  const menuHashActive = uiState.route.name === "home" && window.location.hash.startsWith("#menu");
  const items = [
    { href: "/", label: "Главная", icon: "home", active: uiState.route.name === "home" && !menuHashActive },
    { href: "/#menu", label: "Меню", icon: "restaurant", active: uiState.route.name === "catalog" || uiState.route.name === "product" || menuHashActive },
    { href: "/cart", label: "Корзина", icon: "shopping_cart", active: uiState.route.name === "cart" || uiState.route.name === "checkout" },
    { href: "/account", label: "Профиль", icon: "person", active: uiState.route.name === "account" || uiState.route.name === "orders" },
  ];
  return `
    <nav class="mobile-nav">
      ${items
        .map(
          (item) => `
            <a ${linkProps(item.href)} class="${item.active ? "is-active" : ""}">
              <span class="material-symbols-outlined">${item.icon}</span>
              <span>${item.label}</span>
            </a>`,
        )
        .join("")}
    </nav>
  `;
}

function renderFloatingCart() {
  if (uiState.route.name === "cart" || uiState.route.name === "checkout" || !state.cart.items.length) return "";
  const snapshot = getCartSnapshot();
  const count = state.cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return `
    <div class="floating-cart">
      <div class="floating-cart__inner">
        <div>
          <div class="tiny">Итого • ${count} шт</div>
          <div class="price">${formatCurrency(snapshot.total)}</div>
        </div>
        <a class="btn btn-primary" ${linkProps("/checkout")}>Оформить</a>
      </div>
    </div>
  `;
}

function renderToastStack() {
  if (!uiState.toasts.length) return "";
  return `
    <div class="toast-stack">
      ${uiState.toasts
        .map(
          (toast) => `
            <div class="toast ${toast.tone}">
              <span class="material-symbols-outlined">${toast.tone === "error" ? "error" : "check_circle"}</span>
              <div>${escapeHtml(toast.message)}</div>
            </div>`,
        )
        .join("")}
    </div>
  `;
}

function getHomeBanners() {
  const banners = state.content?.home?.banners;
  return Array.isArray(banners) && banners.length ? banners : DEFAULT_STATE.content.home.banners;
}

function renderCatalogExplorer(options = {}) {
  const scopedCategory = uiState.route.name === "catalog" && uiState.route.categorySlug
    ? state.categories.find((item) => item.slug === uiState.route.categorySlug) || null
    : null;
  const sections = getMenuSections();
  const visibleCount = sections.reduce((sum, section) => sum + section.products.length, 0);
  const activeSlug = scopedCategory?.slug || getMenuActiveSlug();
  const title = scopedCategory?.name || state.content.catalog.title;
  const subtitle = scopedCategory?.subtitle || state.content.catalog.subtitle;
  const hasFilters =
    Boolean(uiState.catalog.search.trim()) ||
    uiState.catalog.sort !== "popular" ||
    uiState.catalog.premiumOnly ||
    uiState.catalog.spicyOnly ||
    !uiState.catalog.availableOnly;
  const summary = uiState.catalog.search.trim()
    ? `По запросу «${escapeHtml(uiState.catalog.search.trim())}» найдено ${visibleCount} позиций.`
    : `Показываем ${visibleCount} позиций в актуальном меню Токи23.`;

  return `
    <section class="section section-menu" id="menu">
      <div class="container">
        <div class="section-head menu-head">
          <div>
            <div class="section-kicker">${escapeHtml(options.kicker || "Меню")}</div>
            <h2 class="page-title">${escapeHtml(title)}</h2>
            <p class="page-subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <a class="btn btn-secondary" ${linkProps("/offers")}>Акции и бонусы</a>
        </div>
      </div>
    </section>
    <div class="category-strip category-strip--menu">
      <div class="container chip-row">
        <a class="chip ${activeSlug ? "" : "is-active"}" ${linkProps("/#menu")}>Все категории</a>
        ${getCatalogCategories()
          .map(
            (category) =>
              `<a class="chip ${activeSlug === category.slug ? "is-active" : ""}" ${linkProps(`/#menu-${category.slug}`)}>${escapeHtml(category.name)}</a>`,
          )
          .join("")}
      </div>
    </div>
    <section class="section section-menu-body">
      <div class="container">
        <div class="filter-row">
          <label class="input-group filter-field--search">
            <span class="input-label">Поиск</span>
            <input
              class="input"
              type="search"
              data-catalog-filter="search"
              value="${escapeHtml(uiState.catalog.search)}"
              placeholder="Название, категория или состав"
              autocomplete="off"
              spellcheck="false"
            />
          </label>
          <label class="input-group filter-field--sort">
            <span class="input-label">Сортировка</span>
            <select class="select" data-catalog-filter="sort">
              <option value="popular" ${uiState.catalog.sort === "popular" ? "selected" : ""}>По популярности</option>
              <option value="price-asc" ${uiState.catalog.sort === "price-asc" ? "selected" : ""}>Сначала дешевле</option>
              <option value="price-desc" ${uiState.catalog.sort === "price-desc" ? "selected" : ""}>Сначала дороже</option>
            </select>
          </label>
        </div>
        <div class="chip-row chip-row--section">
          <button class="chip ${uiState.catalog.premiumOnly ? "is-active" : ""}" data-action="toggle-filter" data-filter="premiumOnly">Premium</button>
          <button class="chip ${uiState.catalog.spicyOnly ? "is-active" : ""}" data-action="toggle-filter" data-filter="spicyOnly">Spicy</button>
          <button class="chip ${uiState.catalog.availableOnly ? "is-active" : ""}" data-action="toggle-filter" data-filter="availableOnly">Только доступные</button>
          ${hasFilters ? `<button class="chip" data-action="reset-catalog-filters">Сбросить</button>` : ""}
        </div>
        <p class="page-subtitle menu-summary">${summary}</p>
        ${
          sections.length
            ? `<div class="menu-sections">
                ${sections
                  .map(
                    (section) => `
                      <section class="menu-category-section" id="menu-${section.slug}">
                        <div class="section-head menu-category-head">
                          <div>
                            <div class="section-kicker">Категория</div>
                            <h3 class="page-title">${escapeHtml(section.name)}</h3>
                            <p class="page-subtitle">${escapeHtml(section.subtitle)}</p>
                          </div>
                          <span class="badge">${section.products.length} поз.</span>
                        </div>
                        <div class="product-grid">${section.products.map((product) => renderProductCard(product)).join("")}</div>
                      </section>`,
                  )
                  .join("")}
               </div>`
            : `<div class="empty-state"><h3>Ничего не найдено</h3><p class="page-subtitle">Попробуйте убрать фильтры или скорректировать поисковый запрос.</p><button class="btn btn-secondary" data-action="reset-catalog-filters">Сбросить фильтры</button></div>`
        }
      </div>
    </section>
  `;
}

function renderHomePromoPreview() {
  return `
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <div class="section-kicker">Offers</div>
            <h2 class="page-title">Текущие акции</h2>
            <p class="page-subtitle">Промокоды и автоматические предложения учитываются сразу в корзине и checkout.</p>
          </div>
          <a class="btn btn-secondary" ${linkProps("/offers")}>Все акции</a>
        </div>
        <div class="promo-grid">
          ${state.promotions
            .slice(0, 3)
            .map(
              (promo) => `
                <article class="promo-card">
                  <img src="${escapeHtml(getSafeImageSrc(promo.image, promo.title))}" alt="${escapeHtml(promo.title)}" loading="lazy" decoding="async" />
                  <div class="promo-card__content">
                    <span class="badge">${escapeHtml(promo.label)}</span>
                    <h3>${escapeHtml(promo.title)}</h3>
                    <p class="page-subtitle">${escapeHtml(promo.description)}</p>
                    <button class="btn btn-primary" data-action="apply-promo-card" data-code="${escapeHtml(promo.code)}">${promo.code ? "Применить код" : "Подробнее"}</button>
                  </div>
                </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderHomePage() {
  const customer = getCurrentCustomer();
  const banners = getHomeBanners();
  const slide = banners[uiState.heroSlide % banners.length];
  const heroImage = getSafeImageSrc(slide.image, slide.title || state.content.home.title);
  return `
    <section class="section">
      <div class="container hero-grid">
        <article class="hero-card">
          <div class="hero-media" style="background-image:url('${escapeHtml(heroImage)}')"></div>
          <div class="hero-content">
            <span class="section-kicker">${escapeHtml(state.content.home.eyebrow)}</span>
            <h1 class="hero-title">${escapeHtml(state.content.home.title)}</h1>
            <p class="hero-copy">${escapeHtml(state.content.home.subtitle)}</p>
            <div class="hero-actions">
              <a class="btn btn-primary" ${linkProps(slide.ctaLink)}>${escapeHtml(slide.ctaLabel)}</a>
              <button class="btn btn-secondary" data-action="toggle-hero-slide">Следующий баннер</button>
            </div>
          </div>
        </article>
        <article class="hero-card">
          <div class="hero-content">
            <span class="section-kicker">Loyalty Program</span>
            <h2 class="page-title">Ваши баллы <span class="text-gradient">Токи23</span></h2>
            <div class="stat-value">${escapeHtml(customer?.bonusPoints || 0)}</div>
            <p class="page-subtitle">Текущий статус: ${escapeHtml(customer?.loyaltyTier || "Base")} • Среднее время доставки ${escapeHtml(state.settings.avgDeliveryTime)}</p>
            <div class="hero-actions">
              <a class="btn btn-primary" ${linkProps("/offers")}>Использовать баллы</a>
              <a class="btn btn-secondary" ${linkProps("/account/orders")}>История заказов</a>
            </div>
          </div>
        </article>
      </div>
    </section>
    ${renderCatalogExplorer({ kicker: "Меню на главной" })}
    ${renderHomePromoPreview()}
    <section class="section">
      <div class="container feature-grid">
        ${state.content.home.benefits
          .map(
            (item) => `
              <article class="feature-card">
                <span class="material-symbols-outlined text-gradient">${item.icon}</span>
                <h3>${escapeHtml(item.title)}</h3>
                <p class="page-subtitle">${escapeHtml(item.text)}</p>
              </article>`,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderCatalogPage() {
  return renderCatalogExplorer({ kicker: "Меню Токи23" });
}

function renderProductPage() {
  const product = getProductBySlug(uiState.route.slug);
  if (!product) return renderNotFoundPage();
  const imageSrc = getSafeImageSrc(product.image, product.name);
  const selectedTab = uiState.productTab;
  const previewModifiers = uiState.previewModifiers[product.id] || [];
  const previewQty = uiState.previewQuantities[product.id] || 1;
  const modifierTotal = getModifierTotal(product, previewModifiers);
  const price = (product.price + modifierTotal) * previewQty;
  const related = state.products.filter((item) => product.relatedIds.includes(item.id)).slice(0, 3);
  const tabContent =
    selectedTab === "composition"
      ? escapeHtml(product.composition)
      : selectedTab === "nutrition"
        ? `Калории ${product.nutrition.calories} • Белки ${product.nutrition.protein} г • Жиры ${product.nutrition.fat} г • Углеводы ${product.nutrition.carbs} г`
        : escapeHtml(product.description);

  return `
    <section class="section">
      <div class="container product-layout">
        <div class="product-visual">
          <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.name)}" loading="eager" decoding="async" />
          <div class="product-badges">${(product.badges || []).map((badge) => badgeMarkup(badge)).join("")}</div>
        </div>
        <article class="product-panel">
          <div class="section-kicker">${escapeHtml(product.subcategory)}</div>
          <div class="product-heading">
            <div class="product-heading__body">
              <h1 class="page-title">${escapeHtml(product.name)}</h1>
              <p class="page-subtitle">${escapeHtml(product.weight)} г</p>
            </div>
            <div class="product-heading__meta">
              <div class="price">${formatCurrency(price)}</div>
              <span class="badge ${product.available ? "badge--success" : "badge--danger"}">${product.available ? "Доступно" : "В стоп-листе"}</span>
            </div>
          </div>
          <div class="tabs">
            <button class="tab ${selectedTab === "description" ? "is-active" : ""}" data-action="set-product-tab" data-tab="description">Описание</button>
            <button class="tab ${selectedTab === "composition" ? "is-active" : ""}" data-action="set-product-tab" data-tab="composition">Состав</button>
            <button class="tab ${selectedTab === "nutrition" ? "is-active" : ""}" data-action="set-product-tab" data-tab="nutrition">КБЖУ</button>
          </div>
          <p class="page-subtitle product-tab-content">${tabContent}</p>
          <div class="section"></div>
          <div class="nutrition-grid">
            <div class="nutrition-card"><div class="price">${product.nutrition.calories}</div><div class="tiny">ккал</div></div>
            <div class="nutrition-card"><div class="price">${product.nutrition.protein} г</div><div class="tiny">белки</div></div>
            <div class="nutrition-card"><div class="price">${product.nutrition.fat} г</div><div class="tiny">жиры</div></div>
            <div class="nutrition-card"><div class="price">${product.nutrition.carbs} г</div><div class="tiny">углеводы</div></div>
          </div>
          ${
            product.modifiers?.length
              ? `<div class="section"></div>
                 <div class="modifier-list">
                   ${(product.modifiers || [])
                     .map(
                       (modifier) => `
                         <label class="modifier-card">
                           <span class="modifier-card__name">${escapeHtml(modifier.name)}</span>
                           <span class="modifier-card__meta">
                             <input type="checkbox" data-product-modifier="${product.id}" value="${modifier.id}" aria-label="${escapeHtml(modifier.name)}" ${previewModifiers.includes(modifier.id) ? "checked" : ""} />
                             <span>${formatCurrency(modifier.price)}</span>
                           </span>
                         </label>`,
                     )
                     .join("")}
                 </div>`
              : ""
          }
          <div class="section"></div>
          <div class="toolbar-row product-actions">
            <div class="qty-control">
              <button data-action="set-product-qty" data-product-id="${product.id}" data-delta="-1"><span class="material-symbols-outlined">remove</span></button>
              <span>${previewQty}</span>
              <button data-action="set-product-qty" data-product-id="${product.id}" data-delta="1"><span class="material-symbols-outlined">add</span></button>
            </div>
            <button class="btn btn-primary" data-action="add-to-cart-preview" data-product-id="${product.id}" ${product.available ? "" : "disabled"}>
              <span class="material-symbols-outlined">shopping_bag</span> В корзину
            </button>
          </div>
        </article>
      </div>
    </section>
    <section class="section">
      <div class="container">
        <div class="section-head">
          <div>
            <div class="section-kicker">Рекомендуем дополнить</div>
            <h2 class="page-title">Добавьте к заказу</h2>
          </div>
        </div>
        ${
          related.length
            ? `<div class="product-grid">${related.map((item) => renderProductCard(item)).join("")}</div>`
            : `<div class="empty-state"><h3>Подходящих дополнений пока нет</h3><p class="page-subtitle">Посмотрите другие позиции в меню и соберите заказ вручную.</p><a class="btn btn-secondary" ${linkProps("/#menu")}>Перейти в меню</a></div>`
        }
      </div>
    </section>
  `;
}

function renderCartLines(snapshot, options = {}) {
  if (!snapshot.lines.length) {
    return `<div class="empty-state"><h3>Корзина пуста</h3><p class="page-subtitle">Добавьте роллы из меню на главной странице.</p><a class="btn btn-primary" ${linkProps("/#menu")}>Открыть меню</a></div>`;
  }
  return snapshot.lines
    .map(
      (line) => {
        const imageSrc = getSafeImageSrc(line.product.image, line.product.name);
        return `
        <article class="cart-item">
          <div class="cart-item__image"><img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(line.product.name)}" loading="lazy" decoding="async" /></div>
          <div class="cart-item__content">
            <div class="cart-item__head">
              <div class="cart-item__summary">
                <h3 class="card-title">${escapeHtml(line.product.name)}</h3>
                <p class="page-subtitle cart-item__description">${escapeHtml(line.product.description)}</p>
              </div>
              <div class="price cart-item__price">${formatCurrency(line.lineTotal)}</div>
            </div>
            ${
              line.modifiers.length
                ? `<p class="muted cart-item__modifiers">Модификаторы: ${line.modifiers.map((modifier) => escapeHtml(modifier.name)).join(", ")}</p>`
                : ""
            }
            <div class="toolbar-row cart-item__footer">
              <div class="qty-control">
                <button data-action="cart-qty" data-key="${line.key}" data-delta="-1"><span class="material-symbols-outlined">remove</span></button>
                <span>${line.quantity}</span>
                <button data-action="cart-qty" data-key="${line.key}" data-delta="1"><span class="material-symbols-outlined">add</span></button>
              </div>
              ${
                options.readOnly
                  ? ""
                  : `<button class="btn btn-ghost" data-action="remove-cart-item" data-key="${line.key}"><span class="material-symbols-outlined">delete</span> Удалить</button>`
              }
            </div>
          </div>
        </article>`;
      },
    )
    .join("");
}

function renderCartSummary(snapshot, options = {}) {
  return `
    <aside class="summary-card">
      <h3>Детали заказа</h3>
      <div class="toggle-grid">
        <button class="toggle-option ${state.cart.deliveryMode === "delivery" ? "is-active" : ""}" data-action="set-delivery-mode" data-mode="delivery">Доставка</button>
        <button class="toggle-option ${state.cart.deliveryMode === "pickup" ? "is-active" : ""}" data-action="set-delivery-mode" data-mode="pickup">Самовывоз</button>
      </div>
      ${
        state.cart.deliveryMode === "delivery"
          ? `<div class="section"></div>
             <div class="input-group">
               <span class="input-label">Адрес доставки</span>
               <input class="input" type="text" data-cart-field="address" value="${escapeHtml(state.cart.address)}" placeholder="Улица, дом, квартира" />
             </div>
             <div class="input-group" style="margin-top:12px">
               <span class="input-label">Ручной выбор зоны</span>
               <select class="select" data-cart-field="manualZoneId">
                 <option value="">Определить автоматически</option>
                 ${state.zones
                   .map((zone) => `<option value="${zone.id}" ${state.cart.manualZoneId === zone.id ? "selected" : ""}>${escapeHtml(zone.name)}${zone.enabled ? "" : " • отключена"}</option>`)
                   .join("")}
               </select>
             </div>`
          : ""
      }
      <div class="section"></div>
      <div class="input-group">
        <span class="input-label">Промокод</span>
        <input class="input" type="text" data-cart-field="promoCode" value="${escapeHtml(state.cart.promoCode)}" placeholder="Введите промокод" />
      </div>
      <div class="summary-lines">
        <div class="summary-row"><span class="muted">Сумма заказа</span><strong>${formatCurrency(snapshot.subtotal)}</strong></div>
        ${snapshot.discounts
          .map((discount) => `<div class="summary-row"><span class="muted">${escapeHtml(discount.title)}</span><strong>- ${formatCurrency(discount.amount)}</strong></div>`)
          .join("")}
        <div class="summary-row"><span class="muted">Доставка${snapshot.zone ? ` • ${escapeHtml(snapshot.zone.name)}` : ""}</span><strong>${formatCurrency(snapshot.deliveryFee)}</strong></div>
        <div class="summary-row summary-total"><span>Итого к оплате</span><span class="price">${formatCurrency(snapshot.total)}</span></div>
      </div>
      ${
        state.cart.deliveryMode === "delivery" && snapshot.missingForMinOrder
          ? `<div class="notice-card" style="margin-top:18px"><span class="material-symbols-outlined">info</span><div>До минимальной суммы для ${escapeHtml(snapshot.zone?.name || "зоны")} не хватает ${formatCurrency(snapshot.missingForMinOrder)}.</div></div>`
          : ""
      }
      ${
        options.showCheckout
          ? `<a class="btn btn-primary btn-block" style="margin-top:18px" ${linkProps("/checkout")}>Перейти к оформлению</a>`
          : ""
      }
    </aside>
  `;
}

function renderCartPage() {
  const snapshot = getCartSnapshot();
  if (!snapshot.lines.length) {
    return `
      <section class="section">
        <div class="container">${renderCartLines(snapshot)}</div>
      </section>
    `;
  }
  return `
    <section class="section">
      <div class="container two-column">
        <div>
          <h1 class="page-title">Корзина</h1>
          <p class="page-subtitle">Проверьте состав заказа, промокод, комментарий и параметры доставки перед checkout.</p>
          <div class="section"></div>
          <div class="cart-list">${renderCartLines(snapshot)}</div>
        </div>
        ${renderCartSummary(snapshot, { showCheckout: true })}
      </div>
    </section>
  `;
}

function renderCheckoutPage() {
  const snapshot = getCartSnapshot();
  const recentOrder = state.session.recentOrderId ? getById(state.orders, state.session.recentOrderId) : null;
  if (recentOrder && !state.cart.items.length) {
    return `
      <section class="section">
        <div class="container not-found-card">
          <div class="section-kicker">Order Success</div>
          <h1 class="page-title">Заказ ${escapeHtml(recentOrder.id)} принят</h1>
          <p class="page-subtitle">Статус и детали уже доступны в личном кабинете и в административной панели.</p>
          <div class="hero-actions" style="justify-content:center">
            <a class="btn btn-primary" ${linkProps("/account/orders")}>История заказов</a>
            <a class="btn btn-secondary" ${linkProps("/#menu")}>Вернуться в меню</a>
          </div>
        </div>
      </section>
    `;
  }
  if (!snapshot.lines.length) {
    return `
      <section class="section">
        <div class="container">
          <div class="empty-state">
            <h3>Оформлять пока нечего</h3>
            <p class="page-subtitle">Сначала добавьте товары в корзину, а затем вернитесь к checkout.</p>
            <a class="btn btn-primary" ${linkProps("/#menu")}>Перейти в меню</a>
          </div>
        </div>
      </section>
    `;
  }
  return `
    <section class="section">
      <div class="container two-column">
        <div>
          <h1 class="page-title">Оформление <span class="text-gradient">заказа</span></h1>
          <p class="page-subtitle">Заполните данные для доставки, оплаты и связи. Все расчёты происходят без перезагрузки страницы.</p>
          <div class="section"></div>
          <div class="cart-list">${renderCartLines(snapshot, { readOnly: true })}</div>
        </div>
        <form class="summary-card" data-form="checkout">
          <h3>Детали заказа</h3>
          <div class="toggle-grid">
            <button class="toggle-option ${state.cart.deliveryMode === "delivery" ? "is-active" : ""}" type="button" data-action="set-delivery-mode" data-mode="delivery">Доставка</button>
            <button class="toggle-option ${state.cart.deliveryMode === "pickup" ? "is-active" : ""}" type="button" data-action="set-delivery-mode" data-mode="pickup">Самовывоз</button>
          </div>
          <div class="section"></div>
          <div class="input-group">
            <span class="input-label">Ваше имя</span>
            <input class="input" name="customerName" autocomplete="name" value="${escapeHtml(state.cart.customerName)}" required />
          </div>
          <div class="input-group" style="margin-top:12px">
            <span class="input-label">Телефон</span>
            <input class="input" name="customerPhone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHtml(state.cart.customerPhone)}" required />
          </div>
          <div class="input-group" style="margin-top:12px">
            <span class="input-label">Email</span>
            <input class="input" name="customerEmail" type="email" inputmode="email" autocomplete="email" value="${escapeHtml(state.cart.customerEmail)}" />
          </div>
          ${
            state.cart.deliveryMode === "delivery"
              ? `<div class="input-group" style="margin-top:12px">
                   <span class="input-label">Адрес доставки</span>
                   <input class="input" name="address" autocomplete="street-address" value="${escapeHtml(state.cart.address)}" required />
                 </div>
                 <div class="input-group" style="margin-top:12px">
                   <span class="input-label">Зона</span>
                   <select class="select" name="manualZoneId">
                     <option value="">Определить автоматически</option>
                     ${state.zones.map((zone) => `<option value="${zone.id}" ${state.cart.manualZoneId === zone.id ? "selected" : ""}>${escapeHtml(zone.name)}${zone.enabled ? "" : " • отключена"}</option>`).join("")}
                   </select>
                 </div>`
              : ""
          }
          <div class="input-group" style="margin-top:12px">
            <span class="input-label">Время</span>
            <select class="select" name="timeSlot">
              ${["Как можно скорее", "18:00 - 18:30", "19:00 - 19:30", "20:00 - 20:30"]
                .map((slot) => `<option value="${slot}" ${state.cart.timeSlot === slot ? "selected" : ""}>${slot}</option>`)
                .join("")}
            </select>
          </div>
          <div class="input-group" style="margin-top:12px">
            <span class="input-label">Оплата</span>
            <select class="select" name="paymentMethod">
              ${[
                ["card_online", "Картой онлайн"],
                ["apple_pay", "Apple Pay / Google Pay"],
                ["courier_card", "Картой курьеру"],
                ["cash", "Наличными"],
              ]
                .map(([value, label]) => `<option value="${value}" ${state.cart.paymentMethod === value ? "selected" : ""}>${label}</option>`)
                .join("")}
            </select>
          </div>
          <div class="input-group" style="margin-top:12px">
            <span class="input-label">Комментарий к заказу</span>
            <textarea class="textarea" name="comment">${escapeHtml(state.cart.comment)}</textarea>
          </div>
          <input class="visually-hidden" name="website" autocomplete="off" tabindex="-1" />
          <div class="summary-lines">
            <div class="summary-row"><span class="muted">Сумма заказа</span><strong>${formatCurrency(snapshot.subtotal)}</strong></div>
            ${snapshot.discounts.map((discount) => `<div class="summary-row"><span class="muted">${escapeHtml(discount.title)}</span><strong>- ${formatCurrency(discount.amount)}</strong></div>`).join("")}
            <div class="summary-row"><span class="muted">Доставка${snapshot.zone ? ` • ${escapeHtml(snapshot.zone.name)}` : ""}</span><strong>${formatCurrency(snapshot.deliveryFee)}</strong></div>
            <div class="summary-row summary-total"><span>Итого к оплате</span><span class="price">${formatCurrency(snapshot.total)}</span></div>
          </div>
          <button class="btn btn-primary btn-block" style="margin-top:18px" type="submit">Оформить заказ</button>
          <p class="page-subtitle" style="font-size:0.84rem">${escapeHtml(state.settings.checkoutAgreement)}</p>
        </form>
      </div>
    </section>
  `;
}

function renderOffersPage() {
  const customer = getCurrentCustomer();
  return `
    <section class="section">
      <div class="container loyalty-grid">
        <article class="hero-card">
          <div class="hero-content">
            <span class="section-kicker">Loyalty Program</span>
            <h1 class="page-title">${escapeHtml(state.content.offers.title)}</h1>
            <p class="page-subtitle">${escapeHtml(state.content.offers.subtitle)}</p>
            <div class="stat-value">${escapeHtml(customer?.bonusPoints || 0)}</div>
            <p class="page-subtitle">Текущий статус: ${escapeHtml(customer?.loyaltyTier || "Base")}</p>
          </div>
        </article>
        <article class="summary-card">
          <h3>Текущие привилегии</h3>
          <div class="summary-lines">
            <div class="summary-row"><span class="muted">Кэшбэк</span><strong>10%</strong></div>
            <div class="summary-row"><span class="muted">Среднее время доставки</span><strong>${escapeHtml(state.settings.avgDeliveryTime)}</strong></div>
            <div class="summary-row"><span class="muted">Порог бесплатной доставки</span><strong>от 5 000 ₽</strong></div>
          </div>
        </article>
      </div>
    </section>
    <section class="section">
      <div class="container promo-grid">
        ${state.promotions
          .map(
            (promo) => `
              <article class="promo-card">
                <img src="${escapeHtml(getSafeImageSrc(promo.image, promo.title))}" alt="${escapeHtml(promo.title)}" loading="lazy" decoding="async" />
                <div class="promo-card__content">
                  <span class="badge">${escapeHtml(promo.label)}</span>
                  <h3>${escapeHtml(promo.title)}</h3>
                  <p class="page-subtitle">${escapeHtml(promo.description)}</p>
                  <button class="btn btn-primary" data-action="apply-promo-card" data-code="${escapeHtml(promo.code)}">${promo.code ? "Применить код" : "Подробнее"}</button>
                </div>
              </article>`,
          )
          .join("")}
      </div>
    </section>
    <section class="section">
      <div class="container referral-card surface-card">
        <div class="surface-card__content">
          <div class="section-kicker">${escapeHtml(state.content.offers.referralTitle)}</div>
          <h2 class="page-title">Реферальный код</h2>
          <p class="page-subtitle">${escapeHtml(state.content.offers.referralText)}</p>
          <div class="referral-code">
            <span>${escapeHtml(state.content.offers.referralCode)}</span>
            <button class="btn-icon" data-action="copy-referral"><span class="material-symbols-outlined">content_copy</span></button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderFaqPage() {
  return `
    <section class="section">
      <div class="container">
        <h1 class="page-title">${escapeHtml(state.content.faq.title)}</h1>
        <p class="page-subtitle">${escapeHtml(state.content.faq.subtitle)}</p>
        <div class="section"></div>
        <div class="faq-list">
          ${state.content.faq.items
            .map(
              (item, index) => `
                <article class="faq-item">
                  <button class="faq-question" data-action="toggle-faq" data-index="${index}">
                    <span>${escapeHtml(item.question)}</span>
                    <span class="material-symbols-outlined">${uiState.openFaq === index ? "remove" : "add"}</span>
                  </button>
                  ${uiState.openFaq === index ? `<div class="faq-answer">${escapeHtml(item.answer)}</div>` : ""}
                </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderContactsPage() {
  return `
    <section class="section">
      <div class="container contact-grid">
        <article class="contact-card">
          <div class="section-kicker">Contacts</div>
          <h1 class="page-title">${escapeHtml(state.content.contacts.title)}</h1>
          <p class="page-subtitle">${escapeHtml(state.content.contacts.subtitle)}</p>
          <div class="summary-lines">
            <div class="summary-row"><span class="muted">Телефон</span><strong>${escapeHtml(state.settings.phone)}</strong></div>
            <div class="summary-row"><span class="muted">Email</span><strong>${escapeHtml(state.settings.email)}</strong></div>
            <div class="summary-row"><span class="muted">Адрес</span><strong>${escapeHtml(state.settings.city)}, ${escapeHtml(state.settings.address)}</strong></div>
            <div class="summary-row"><span class="muted">График</span><strong>${escapeHtml(state.settings.schedule)}</strong></div>
          </div>
        </article>
        <article class="contact-card">
          <div class="section-kicker">${escapeHtml(state.content.contacts.mapTitle)}</div>
          <h3>Активные зоны</h3>
          <div class="zone-grid">
            ${state.zones
              .map(
                (zone) => `
                  <div class="zone-card">
                    <div class="summary-row">
                      <strong>${escapeHtml(zone.name)}</strong>
                      ${zone.enabled ? renderStatus("confirmed") : renderStatus("cancelled")}
                    </div>
                    <p class="page-subtitle">${escapeHtml(zone.note)}</p>
                    <p class="muted">${formatCurrency(zone.deliveryPrice)} • от ${formatCurrency(zone.minOrder)} • ${escapeHtml(zone.eta)}</p>
                  </div>`,
              )
              .join("")}
          </div>
        </article>
      </div>
    </section>
  `;
}

function renderAccountPage() {
  const customer = getCurrentCustomer();
  const orders = getCustomerOrders(customer?.id || "");
  return `
    <section class="section">
      <div class="container account-grid">
        <form class="profile-card" data-form="account">
          <div class="section-kicker">Личный кабинет</div>
          <h1 class="page-title">Профиль клиента</h1>
          <div class="input-group"><span class="input-label">Имя</span><input class="input" name="name" autocomplete="name" value="${escapeHtml(customer?.name || "")}" /></div>
          <div class="input-group" style="margin-top:12px"><span class="input-label">Телефон</span><input class="input" name="phone" type="tel" inputmode="tel" autocomplete="tel" value="${escapeHtml(customer?.phone || "")}" /></div>
          <div class="input-group" style="margin-top:12px"><span class="input-label">Email</span><input class="input" name="email" type="email" inputmode="email" autocomplete="email" value="${escapeHtml(customer?.email || "")}" /></div>
          <div class="input-group" style="margin-top:12px"><span class="input-label">Дата рождения</span><input class="input" name="birthday" type="date" value="${escapeHtml(customer?.birthday || "")}" /></div>
          <button class="btn btn-primary" style="margin-top:18px" type="submit">Сохранить профиль</button>
        </form>
        <aside class="profile-card">
          <div class="section-kicker">Статистика</div>
          <h3>${escapeHtml(customer?.loyaltyTier || "Base")} Member</h3>
          <div class="summary-lines">
            <div class="summary-row"><span class="muted">Баллы</span><strong>${escapeHtml(customer?.bonusPoints || 0)}</strong></div>
            <div class="summary-row"><span class="muted">Всего заказов</span><strong>${escapeHtml(customer?.ordersCount || 0)}</strong></div>
            <div class="summary-row"><span class="muted">Потрачено</span><strong>${formatCurrency(customer?.totalSpent || 0)}</strong></div>
          </div>
          <a class="btn btn-secondary" style="margin-top:18px" ${linkProps("/account/orders")}>История заказов</a>
          ${
            orders[0]
              ? `<div class="notice-card" style="margin-top:18px"><span class="material-symbols-outlined">bolt</span><div>Последний заказ ${escapeHtml(orders[0].id)} • ${escapeHtml(ORDER_STATUS_LABELS[orders[0].status])}</div></div>`
              : ""
          }
        </aside>
      </div>
    </section>
  `;
}

function renderOrdersPage() {
  const customer = getCurrentCustomer();
  const allOrders = getCustomerOrders(customer?.id || "");
  const orders = uiState.accountOrderFilter === "all" ? allOrders : allOrders.filter((order) => order.status === uiState.accountOrderFilter);
  const filters = ["all", "new", "cooking", "on_way", "delivered"];
  return `
    <section class="section">
      <div class="container">
        <h1 class="page-title">История заказов</h1>
        <div class="chip-row chip-row--section">
          ${filters
            .map(
              (filter) => `
                <button class="chip ${uiState.accountOrderFilter === filter ? "is-active" : ""}" data-action="set-account-filter" data-filter="${filter}">
                  ${filter === "all" ? "Все" : escapeHtml(ORDER_STATUS_LABELS[filter])}
                </button>`,
            )
            .join("")}
        </div>
        <div class="editor-list">
          ${
            orders.length
              ? orders
                  .map(
                    (order) => `
                      <article class="order-row-card">
                        <div class="summary-row">
                          <div>
                            <strong>${escapeHtml(order.id)}</strong>
                            <p class="page-subtitle">${escapeHtml(formatDateTime(order.createdAt))}</p>
                          </div>
                          ${renderStatus(order.status)}
                        </div>
                        <p class="muted">${order.items.length} поз. • ${formatCurrency(order.total)}</p>
                        <div class="hero-actions">
                          <button class="btn btn-secondary" data-action="repeat-order" data-id="${order.id}">Повторить</button>
                          <button class="btn btn-ghost" data-action="open-order-modal" data-id="${order.id}">Подробнее</button>
                        </div>
                      </article>`,
                  )
                  .join("")
              : `<div class="empty-state"><h3>Заказов пока нет</h3><p class="page-subtitle">После первого оформления они появятся здесь автоматически.</p></div>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderLegalPage() {
  const page = state.content.legal[uiState.route.slug];
  if (!page) return renderNotFoundPage();
  return `
    <section class="section">
      <div class="container legal-card">
        <div class="section-kicker">Legal</div>
        <h1 class="page-title">${escapeHtml(page.title)}</h1>
        <p class="page-subtitle">${escapeHtml(page.intro)}</p>
        <ul class="legal-list">${page.points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul>
      </div>
    </section>
  `;
}

function renderNotFoundPage() {
  return `
    <section class="section">
      <div class="container not-found-card">
        <div class="section-kicker">404</div>
        <h1 class="page-title">Страница не найдена</h1>
        <p class="page-subtitle">Похоже, ссылка устарела или страница была перемещена. Вернёмся в каталог или на главную.</p>
        <div class="hero-actions" style="justify-content:center">
          <a class="btn btn-primary" ${linkProps("/")}>На главную</a>
          <a class="btn btn-secondary" ${linkProps("/#menu")}>В меню</a>
        </div>
      </div>
    </section>
  `;
}

function benefitsToTextarea() {
  return state.content.home.benefits.map((item) => `${item.icon}|${item.title}|${item.text}`).join("\n");
}

function faqToTextarea() {
  return state.content.faq.items.map((item) => `${item.question}|${item.answer}`).join("\n");
}

function modifiersToTextarea(product) {
  return (product?.modifiers || []).map((item) => `${item.name}|${item.price}`).join("\n");
}

function relatedToTextarea(product) {
  return (product?.relatedIds || []).join(", ");
}

function getDashboardMetrics() {
  const totalSales = state.orders.reduce((sum, order) => sum + order.total, 0);
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = state.orders.filter((order) => order.createdAt.slice(0, 10) === today).length;
  const activeZones = state.zones.filter((zone) => zone.enabled).length;
  const counts = {};
  state.orders.forEach((order) => order.items.forEach((item) => { counts[item.productId] = (counts[item.productId] || 0) + item.quantity; }));
  const bestSellerId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const bestSeller = bestSellerId ? getById(state.products, bestSellerId) : null;
  return { totalSales, todayOrders, activeZones, bestSeller };
}

function renderAdminDashboard() {
  const metrics = getDashboardMetrics();
  return `
    <div class="admin-grid">
      <article class="metric-card"><div class="tiny">Общий объём продаж</div><div class="price">${formatCurrency(metrics.totalSales)}</div></article>
      <article class="metric-card"><div class="tiny">Новые заказы</div><div class="price">${metrics.todayOrders}</div></article>
      <article class="metric-card"><div class="tiny">Активные зоны</div><div class="price">${metrics.activeZones}/${state.zones.length}</div></article>
      <article class="metric-card"><div class="tiny">Хит продаж</div><div class="price">${escapeHtml(metrics.bestSeller?.name || "—")}</div></article>
    </div>
    <div class="section"></div>
    <div class="editor-grid">
      <div class="table-card">
        <h3>Последние заказы</h3>
        <table class="admin-table">
          <thead><tr><th>ID</th><th>Клиент</th><th>Статус</th><th>Сумма</th><th></th></tr></thead>
          <tbody>
            ${state.orders
              .slice(0, 5)
              .map((order) => {
                const customer = getById(state.customers, order.customerId);
                return `<tr>
                  <td>${escapeHtml(order.id)}</td>
                  <td>${escapeHtml(customer?.name || "Гость")}</td>
                  <td>${renderStatus(order.status)}</td>
                  <td>${formatCurrency(order.total)}</td>
                  <td><button class="btn btn-ghost" data-action="open-order-modal" data-id="${order.id}">Открыть</button></td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="editor-panel">
        <div class="section-kicker">Монитор доставки</div>
        <h3>Карта зон</h3>
        <div class="zone-grid">
          ${state.zones
            .map(
              (zone) => `
                <div class="zone-card">
                  <div class="summary-row"><strong>${escapeHtml(zone.name)}</strong>${zone.enabled ? renderStatus("confirmed") : renderStatus("cancelled")}</div>
                  <p class="page-subtitle">${escapeHtml(zone.note)}</p>
                  <p class="muted">${formatCurrency(zone.deliveryPrice)} • ${escapeHtml(zone.eta)}</p>
                </div>`,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderAdminContentSection() {
  return `
    <form class="admin-form editor-panel" data-form="admin-content">
      <h3>Контент страниц</h3>
      <div class="input-group"><span class="input-label">Главная — заголовок</span><input class="input" name="homeTitle" value="${escapeHtml(state.content.home.title)}" /></div>
      <div class="input-group"><span class="input-label">Главная — подзаголовок</span><textarea class="textarea" name="homeSubtitle">${escapeHtml(state.content.home.subtitle)}</textarea></div>
      <div class="input-group"><span class="input-label">Акции — заголовок</span><input class="input" name="offersTitle" value="${escapeHtml(state.content.offers.title)}" /></div>
      <div class="input-group"><span class="input-label">Акции — текст</span><textarea class="textarea" name="offersSubtitle">${escapeHtml(state.content.offers.subtitle)}</textarea></div>
      <div class="input-group"><span class="input-label">Контакты — заголовок</span><input class="input" name="contactsTitle" value="${escapeHtml(state.content.contacts.title)}" /></div>
      <div class="input-group"><span class="input-label">Контакты — текст</span><textarea class="textarea" name="contactsSubtitle">${escapeHtml(state.content.contacts.subtitle)}</textarea></div>
      <div class="input-group"><span class="input-label">Преимущества: icon|title|text</span><textarea class="textarea" name="benefits">${escapeHtml(benefitsToTextarea())}</textarea></div>
      <div class="input-group"><span class="input-label">FAQ: question|answer</span><textarea class="textarea" name="faqItems">${escapeHtml(faqToTextarea())}</textarea></div>
      <button class="btn btn-primary" type="submit">Сохранить контент</button>
    </form>
  `;
}

function renderAdminMenuSection() {
  const category = uiState.selectedCategoryId ? getById(state.categories, uiState.selectedCategoryId) : null;
  const product = uiState.selectedProductId ? getById(state.products, uiState.selectedProductId) : null;
  return `
    <div class="editor-grid">
      <div class="editor-list">
        ${state.categories
          .map((item) => `<button class="editor-item ${item.id === category?.id ? "is-active" : ""}" data-action="select-category" data-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.slug)}</div></button>`)
          .join("")}
      </div>
      <form class="admin-form editor-panel" data-form="admin-category">
        <h3>Категория</h3>
        <input type="hidden" name="id" value="${escapeHtml(category?.id || "")}" />
        <div class="input-group"><span class="input-label">Название</span><input class="input" name="name" value="${escapeHtml(category?.name || "")}" /></div>
        <div class="input-group"><span class="input-label">Slug</span><input class="input" name="slug" value="${escapeHtml(category?.slug || "")}" /></div>
        <div class="input-group"><span class="input-label">Подзаголовок</span><input class="input" name="subtitle" value="${escapeHtml(category?.subtitle || "")}" /></div>
        <div class="input-group"><span class="input-label">Порядок</span><input class="input" name="sortOrder" value="${escapeHtml(category?.sortOrder || 0)}" /></div>
        <label><input type="checkbox" name="active" ${category?.active ? "checked" : ""} /> Активна</label>
        <div class="toolbar-row"><button class="btn btn-primary" type="submit">Сохранить</button><button class="btn btn-secondary" type="button" data-action="new-category">Новая</button><button class="btn btn-ghost" type="button" data-action="delete-category">Удалить</button></div>
      </form>
    </div>
    <div class="section"></div>
    <div class="editor-grid">
      <div class="editor-list">
        ${state.products
          .map((item) => `<button class="editor-item ${item.id === product?.id ? "is-active" : ""}" data-action="select-product" data-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><div class="muted">${formatCurrency(item.price)} • ${escapeHtml(item.categoryId)}</div></button>`)
          .join("")}
      </div>
      <form class="admin-form editor-panel" data-form="admin-product">
        <h3>Товар</h3>
        <input type="hidden" name="id" value="${escapeHtml(product?.id || "")}" />
        <div class="input-group"><span class="input-label">Название</span><input class="input" name="name" value="${escapeHtml(product?.name || "")}" /></div>
        <div class="input-group"><span class="input-label">Slug</span><input class="input" name="slug" value="${escapeHtml(product?.slug || "")}" /></div>
        <div class="input-group"><span class="input-label">Категория</span><select class="select" name="categoryId">${state.categories.map((item) => `<option value="${item.id}" ${product?.categoryId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div>
        <div class="input-group"><span class="input-label">Подкатегория</span><input class="input" name="subcategory" value="${escapeHtml(product?.subcategory || "")}" /></div>
        <div class="input-group"><span class="input-label">Описание</span><textarea class="textarea" name="description">${escapeHtml(product?.description || "")}</textarea></div>
        <div class="input-group"><span class="input-label">Состав</span><textarea class="textarea" name="composition">${escapeHtml(product?.composition || "")}</textarea></div>
        <div class="input-group"><span class="input-label">Изображение URL</span><input class="input" name="image" value="${escapeHtml(product?.image || "")}" /></div>
        <div class="toolbar-row">
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Вес</span><input class="input" name="weight" value="${escapeHtml(product?.weight || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Цена</span><input class="input" name="price" value="${escapeHtml(product?.price || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Порядок</span><input class="input" name="sortOrder" value="${escapeHtml(product?.sortOrder || 0)}" /></label>
        </div>
        <div class="toolbar-row">
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Калории</span><input class="input" name="calories" value="${escapeHtml(product?.nutrition?.calories || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Белки</span><input class="input" name="protein" value="${escapeHtml(product?.nutrition?.protein || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Жиры</span><input class="input" name="fat" value="${escapeHtml(product?.nutrition?.fat || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Углеводы</span><input class="input" name="carbs" value="${escapeHtml(product?.nutrition?.carbs || 0)}" /></label>
        </div>
        <div class="input-group"><span class="input-label">Бейджи через запятую</span><input class="input" name="badges" value="${escapeHtml((product?.badges || []).join(", "))}" /></div>
        <div class="input-group"><span class="input-label">Модификаторы: name|price</span><textarea class="textarea" name="modifiers">${escapeHtml(modifiersToTextarea(product))}</textarea></div>
        <div class="input-group"><span class="input-label">Рекомендуемые товары: id,id</span><input class="input" name="relatedIds" value="${escapeHtml(relatedToTextarea(product))}" /></div>
        <div class="toolbar-row"><label><input type="checkbox" name="featured" ${product?.featured ? "checked" : ""} /> Хит</label><label><input type="checkbox" name="premium" ${product?.premium ? "checked" : ""} /> Premium</label><label><input type="checkbox" name="spicy" ${product?.spicy ? "checked" : ""} /> Spicy</label><label><input type="checkbox" name="available" ${product?.available ? "checked" : ""} /> Доступен</label></div>
        <div class="toolbar-row"><button class="btn btn-primary" type="submit">Сохранить</button><button class="btn btn-secondary" type="button" data-action="new-product">Новый</button><button class="btn btn-ghost" type="button" data-action="delete-product">Удалить</button></div>
      </form>
    </div>
  `;
}

function renderAdminOrdersSection() {
  const order = getById(state.orders, uiState.selectedOrderId) || state.orders[0];
  const filteredOrders = uiState.adminOrderFilter === "all" ? state.orders : state.orders.filter((item) => item.status === uiState.adminOrderFilter);
  return `
    <div class="chip-row" style="margin-bottom:18px">
      ${["all", "new", "cooking", "on_way", "delivered", "cancelled"]
        .map((filter) => `<button class="chip ${uiState.adminOrderFilter === filter ? "is-active" : ""}" data-action="set-admin-order-filter" data-filter="${filter}">${filter === "all" ? "Все" : escapeHtml(ORDER_STATUS_LABELS[filter])}</button>`)
        .join("")}
    </div>
    <div class="editor-grid">
      <div class="editor-list">
        ${filteredOrders.map((item) => `<button class="editor-item ${item.id === order?.id ? "is-active" : ""}" data-action="select-order" data-id="${item.id}"><strong>${escapeHtml(item.id)}</strong><div class="muted">${formatCurrency(item.total)} • ${escapeHtml(formatDateTime(item.createdAt))}</div></button>`).join("")}
      </div>
      <form class="admin-form editor-panel" data-form="admin-order">
        <h3>Заказ ${escapeHtml(order?.id || "")}</h3>
        <input type="hidden" name="id" value="${escapeHtml(order?.id || "")}" />
        <div class="input-group"><span class="input-label">Статус</span><select class="select" name="status">${Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => `<option value="${value}" ${order?.status === value ? "selected" : ""}>${label}</option>`).join("")}</select></div>
        <div class="input-group"><span class="input-label">Комментарий администратора</span><textarea class="textarea" name="adminNote">${escapeHtml(order?.adminNote || "")}</textarea></div>
        <div class="notice-card"><span class="material-symbols-outlined">receipt_long</span><div>${(order?.items || []).map((item) => { const product = getById(state.products, item.productId); return `${product?.name || item.productId} × ${item.quantity}`; }).join(", ")}</div></div>
        <button class="btn btn-primary" type="submit">Обновить заказ</button>
      </form>
    </div>
  `;
}

function renderAdminZonesSection() {
  const zone = uiState.selectedZoneId ? getById(state.zones, uiState.selectedZoneId) : null;
  return `
    <div class="editor-grid">
      <div class="editor-list">
        ${state.zones.map((item) => `<button class="editor-item ${item.id === zone?.id ? "is-active" : ""}" data-action="select-zone" data-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><div class="muted">${formatCurrency(item.deliveryPrice)} • ${escapeHtml(item.eta)}</div></button>`).join("")}
      </div>
      <form class="admin-form editor-panel" data-form="admin-zone">
        <h3>Зона доставки</h3>
        <input type="hidden" name="id" value="${escapeHtml(zone?.id || "")}" />
        <div class="input-group"><span class="input-label">Название</span><input class="input" name="name" value="${escapeHtml(zone?.name || "")}" /></div>
        <div class="input-group"><span class="input-label">Slug</span><input class="input" name="slug" value="${escapeHtml(zone?.slug || "")}" /></div>
        <div class="input-group"><span class="input-label">Ключевые слова через запятую</span><textarea class="textarea" name="keywords">${escapeHtml((zone?.keywords || []).join(", "))}</textarea></div>
        <div class="toolbar-row">
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Доставка</span><input class="input" name="deliveryPrice" value="${escapeHtml(zone?.deliveryPrice || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Минимум</span><input class="input" name="minOrder" value="${escapeHtml(zone?.minOrder || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Бесплатно от</span><input class="input" name="freeFrom" value="${escapeHtml(zone?.freeFrom || 0)}" /></label>
        </div>
        <div class="input-group"><span class="input-label">ETA</span><input class="input" name="eta" value="${escapeHtml(zone?.eta || "")}" /></div>
        <div class="input-group"><span class="input-label">Примечание</span><textarea class="textarea" name="note">${escapeHtml(zone?.note || "")}</textarea></div>
        <label><input type="checkbox" name="enabled" ${zone?.enabled ? "checked" : ""} /> Зона активна</label>
        <div class="toolbar-row"><button class="btn btn-primary" type="submit">Сохранить</button><button class="btn btn-secondary" type="button" data-action="new-zone">Новая</button><button class="btn btn-ghost" type="button" data-action="delete-zone">Удалить</button></div>
      </form>
    </div>
  `;
}

function renderAdminPromosSection() {
  const promo = uiState.selectedPromoId ? getById(state.promotions, uiState.selectedPromoId) : null;
  return `
    <div class="editor-grid">
      <div class="editor-list">
        ${state.promotions.map((item) => `<button class="editor-item ${item.id === promo?.id ? "is-active" : ""}" data-action="select-promo" data-id="${item.id}"><strong>${escapeHtml(item.title)}</strong><div class="muted">${escapeHtml(item.mode)} • ${escapeHtml(item.discountType)}</div></button>`).join("")}
      </div>
      <form class="admin-form editor-panel" data-form="admin-promo">
        <h3>Акция / промокод</h3>
        <input type="hidden" name="id" value="${escapeHtml(promo?.id || "")}" />
        <div class="input-group"><span class="input-label">Название</span><input class="input" name="title" value="${escapeHtml(promo?.title || "")}" /></div>
        <div class="input-group"><span class="input-label">Slug</span><input class="input" name="slug" value="${escapeHtml(promo?.slug || "")}" /></div>
        <div class="toolbar-row">
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Режим</span><select class="select" name="mode"><option value="auto" ${promo?.mode === "auto" ? "selected" : ""}>auto</option><option value="code" ${promo?.mode === "code" ? "selected" : ""}>code</option></select></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Код</span><input class="input" name="code" value="${escapeHtml(promo?.code || "")}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Тип скидки</span><select class="select" name="discountType"><option value="percent" ${promo?.discountType === "percent" ? "selected" : ""}>percent</option><option value="fixed" ${promo?.discountType === "fixed" ? "selected" : ""}>fixed</option><option value="free_delivery" ${promo?.discountType === "free_delivery" ? "selected" : ""}>free_delivery</option></select></label>
        </div>
        <div class="toolbar-row">
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Размер</span><input class="input" name="amount" value="${escapeHtml(promo?.amount || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">Мин. сумма</span><input class="input" name="minSubtotal" value="${escapeHtml(promo?.minSubtotal || 0)}" /></label>
          <label class="input-group" style="flex:1 1 120px"><span class="input-label">День недели</span><input class="input" name="dayOfWeek" value="${escapeHtml(promo?.dayOfWeek || "")}" /></label>
        </div>
        <div class="input-group"><span class="input-label">Категория</span><select class="select" name="categoryId"><option value="">Без ограничения</option>${state.categories.map((item) => `<option value="${item.id}" ${promo?.categoryId === item.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div>
        <div class="input-group"><span class="input-label">Описание</span><textarea class="textarea" name="description">${escapeHtml(promo?.description || "")}</textarea></div>
        <div class="input-group"><span class="input-label">Ярлык</span><input class="input" name="label" value="${escapeHtml(promo?.label || "")}" /></div>
        <div class="input-group"><span class="input-label">Картинка</span><input class="input" name="image" value="${escapeHtml(promo?.image || "")}" /></div>
        <label><input type="checkbox" name="firstOrderOnly" ${promo?.firstOrderOnly ? "checked" : ""} /> Только первый заказ</label>
        <label><input type="checkbox" name="active" ${promo?.active ? "checked" : ""} /> Акция активна</label>
        <div class="toolbar-row"><button class="btn btn-primary" type="submit">Сохранить</button><button class="btn btn-secondary" type="button" data-action="new-promo">Новая</button><button class="btn btn-ghost" type="button" data-action="delete-promo">Удалить</button></div>
      </form>
    </div>
  `;
}

function renderAdminUsersSection() {
  const customer = getById(state.customers, uiState.selectedCustomerId) || state.customers[0];
  const orders = getCustomerOrders(customer?.id || "");
  return `
    <div class="editor-grid">
      <div class="editor-list">
        ${state.customers.map((item) => `<button class="editor-item ${item.id === customer?.id ? "is-active" : ""}" data-action="select-customer" data-id="${item.id}"><strong>${escapeHtml(item.name)}</strong><div class="muted">${escapeHtml(item.phone)}</div></button>`).join("")}
      </div>
      <div class="editor-panel">
        <h3>${escapeHtml(customer?.name || "")}</h3>
        <div class="summary-lines">
          <div class="summary-row"><span class="muted">Телефон</span><strong>${escapeHtml(customer?.phone || "")}</strong></div>
          <div class="summary-row"><span class="muted">Email</span><strong>${escapeHtml(customer?.email || "")}</strong></div>
          <div class="summary-row"><span class="muted">Баллы</span><strong>${escapeHtml(customer?.bonusPoints || 0)}</strong></div>
          <div class="summary-row"><span class="muted">Заказы</span><strong>${escapeHtml(customer?.ordersCount || 0)}</strong></div>
          <div class="summary-row"><span class="muted">Оборот</span><strong>${formatCurrency(customer?.totalSpent || 0)}</strong></div>
        </div>
        <div class="section"></div>
        <h3>История клиента</h3>
        <div class="editor-list">
          ${orders.map((order) => `<div class="editor-item"><strong>${escapeHtml(order.id)}</strong><div class="muted">${formatCurrency(order.total)} • ${escapeHtml(formatDateTime(order.createdAt))}</div></div>`).join("") || `<div class="empty-state">Нет заказов</div>`}
        </div>
      </div>
    </div>
  `;
}

function renderAdminSettingsSection() {
  return `
    <form class="admin-form editor-panel" data-form="admin-settings">
      <h3>Общие настройки</h3>
      <div class="input-group"><span class="input-label">Бренд</span><input class="input" name="brandName" value="${escapeHtml(state.settings.brandName)}" /></div>
      <div class="input-group"><span class="input-label">Теглайн</span><input class="input" name="brandTagline" value="${escapeHtml(state.settings.brandTagline)}" /></div>
      <div class="toolbar-row">
        <label class="input-group" style="flex:1 1 180px"><span class="input-label">Телефон</span><input class="input" name="phone" value="${escapeHtml(state.settings.phone)}" /></label>
        <label class="input-group" style="flex:1 1 180px"><span class="input-label">Email</span><input class="input" name="email" value="${escapeHtml(state.settings.email)}" /></label>
      </div>
      <div class="input-group"><span class="input-label">Адрес</span><input class="input" name="address" value="${escapeHtml(state.settings.address)}" /></div>
      <div class="toolbar-row">
        <label class="input-group" style="flex:1 1 180px"><span class="input-label">Город</span><input class="input" name="city" value="${escapeHtml(state.settings.city)}" /></label>
        <label class="input-group" style="flex:1 1 180px"><span class="input-label">График</span><input class="input" name="schedule" value="${escapeHtml(state.settings.schedule)}" /></label>
      </div>
      <div class="input-group"><span class="input-label">SEO Title</span><input class="input" name="defaultTitle" value="${escapeHtml(state.settings.seo.defaultTitle)}" /></div>
      <div class="input-group"><span class="input-label">SEO Description</span><textarea class="textarea" name="defaultDescription">${escapeHtml(state.settings.seo.defaultDescription)}</textarea></div>
      <div class="toolbar-row"><button class="btn btn-primary" type="submit">Сохранить настройки</button><button class="btn btn-secondary" type="button" data-action="export-state">Экспорт JSON</button><button class="btn btn-ghost" type="button" data-action="reset-demo">Сбросить демо</button></div>
    </form>
  `;
}

function renderAdminLogsSection() {
  if (!state.logs.length) return `<div class="empty-state"><h3>Логи пусты</h3><p class="page-subtitle">Ошибки и системные события появятся здесь автоматически.</p></div>`;
  return `<div class="editor-list">${state.logs.map((entry) => `<div class="editor-item"><strong>${escapeHtml(entry.type)}</strong><div class="muted">${escapeHtml(entry.message)}</div><div class="tiny">${escapeHtml(entry.createdAt)}</div></div>`).join("")}</div>`;
}

function renderAdminPage() {
  let content = "";
  if (uiState.adminSection === "dashboard") content = renderAdminDashboard();
  if (uiState.adminSection === "content") content = renderAdminContentSection();
  if (uiState.adminSection === "menu") content = renderAdminMenuSection();
  if (uiState.adminSection === "orders") content = renderAdminOrdersSection();
  if (uiState.adminSection === "zones") content = renderAdminZonesSection();
  if (uiState.adminSection === "promos") content = renderAdminPromosSection();
  if (uiState.adminSection === "users") content = renderAdminUsersSection();
  if (uiState.adminSection === "settings") content = renderAdminSettingsSection();
  if (uiState.adminSection === "logs") content = renderAdminLogsSection();
  return `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="brand">Токи23<small>control room</small></div>
        <nav class="admin-nav">
          ${ADMIN_SECTIONS.map((section) => `<button class="admin-link ${uiState.adminSection === section.id ? "is-active" : ""}" data-action="set-admin-section" data-section="${section.id}"><span class="material-symbols-outlined">${section.icon}</span>${section.label}</button>`).join("")}
        </nav>
      </aside>
      <div class="admin-main">
        <header class="admin-topbar">
          <div class="brand">Панель управления</div>
          ${renderThemeToggle()}
        </header>
        <div class="admin-content">${content}</div>
      </div>
    </div>
  `;
}

function syncPostRender() {
  applyTheme();
  document.body.classList.toggle("has-modal", Boolean(uiState.modal?.id));

  const focusRestore = uiState.focusRestore;
  uiState.focusRestore = null;
  if (focusRestore?.selector) {
    const control = document.querySelector(focusRestore.selector);
    if (control instanceof HTMLElement) {
      control.focus({ preventScroll: true });
      if ("setSelectionRange" in control && focusRestore.selectionStart !== null && focusRestore.selectionEnd !== null) {
        control.setSelectionRange(focusRestore.selectionStart, focusRestore.selectionEnd);
      }
    }
  }

  const targetHash = uiState.pendingHash || window.location.hash || "";
  if (!targetHash) return;
  const target = document.querySelector(targetHash);
  uiState.pendingHash = "";
  if (!target) return;
  const behavior = uiState.pendingScrollBehavior || "smooth";
  uiState.pendingScrollBehavior = "smooth";
  window.requestAnimationFrame(() => {
    target.scrollIntoView({ block: "start", behavior });
  });
}

function renderApp() {
  setSeo(uiState.route);
  let pageContent = "";
  if (uiState.route.name === "admin") {
    pageContent = renderAdminPage();
  } else if (uiState.route.name === "home") {
    pageContent = renderHomePage();
  } else if (uiState.route.name === "catalog") {
    pageContent = renderCatalogPage();
  } else if (uiState.route.name === "product") {
    pageContent = renderProductPage();
  } else if (uiState.route.name === "cart") {
    pageContent = renderCartPage();
  } else if (uiState.route.name === "checkout") {
    pageContent = renderCheckoutPage();
  } else if (uiState.route.name === "offers") {
    pageContent = renderOffersPage();
  } else if (uiState.route.name === "faq") {
    pageContent = renderFaqPage();
  } else if (uiState.route.name === "contacts") {
    pageContent = renderContactsPage();
  } else if (uiState.route.name === "account") {
    pageContent = renderAccountPage();
  } else if (uiState.route.name === "orders") {
    pageContent = renderOrdersPage();
  } else if (uiState.route.name === "legal") {
    pageContent = renderLegalPage();
  } else {
    pageContent = renderNotFoundPage();
  }

  root.innerHTML =
    uiState.route.name === "admin"
      ? `${pageContent}${renderOrderModal()}${renderToastStack()}`
      : `<div class="site-shell">${renderHeader()}${pageContent}${renderFooter()}${renderFloatingCart()}${renderMobileNav()}</div>${renderOrderModal()}${renderToastStack()}`;
  syncPostRender();
}

function exportState() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "toki23-state.json";
  link.click();
  URL.revokeObjectURL(url);
}

function resetDemoState() {
  if (!window.confirm("Сбросить все изменения и вернуть демо-данные?")) return;
  state = deepClone(DEFAULT_STATE);
  uiState = createUiState();
  saveState(state);
  renderApp();
  pushToast("Демо-данные восстановлены");
}

function handleDocumentClick(event) {
  const link = event.target.closest("[data-link]");
  if (link) {
    event.preventDefault();
    navigateTo(link.getAttribute("data-link"));
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.getAttribute("data-action");
  const id = button.getAttribute("data-id");

  if (action === "go-catalog") navigateTo("/#menu", { focusSelector: "[data-catalog-filter='search']" });
  if (action === "toggle-theme") {
    uiState.theme = uiState.theme === "light" ? "dark" : "light";
    saveTheme(uiState.theme);
    renderApp();
  }
  if (action === "toggle-hero-slide") {
    const banners = getHomeBanners();
    uiState.heroSlide = (uiState.heroSlide + 1) % banners.length;
    renderApp();
  }
  if (action === "open-product") navigateTo(`/product/${button.getAttribute("data-slug")}`);
  if (action === "add-to-cart") addToCart(button.getAttribute("data-product-id"));
  if (action === "add-to-cart-preview") {
    const productId = button.getAttribute("data-product-id");
    addToCart(productId, uiState.previewQuantities[productId] || 1, uiState.previewModifiers[productId] || []);
  }
  if (action === "cart-qty") updateCartLine(button.getAttribute("data-key"), Number(button.getAttribute("data-delta")));
  if (action === "remove-cart-item") removeCartLine(button.getAttribute("data-key"));
  if (action === "toggle-filter") {
    const filter = button.getAttribute("data-filter");
    uiState.catalog[filter] = !uiState.catalog[filter];
    renderApp();
  }
  if (action === "reset-catalog-filters") {
    uiState.catalog.search = "";
    uiState.catalog.sort = "popular";
    uiState.catalog.premiumOnly = false;
    uiState.catalog.spicyOnly = false;
    uiState.catalog.availableOnly = true;
    renderApp();
  }
  if (action === "set-product-tab") {
    uiState.productTab = button.getAttribute("data-tab");
    renderApp();
  }
  if (action === "set-product-qty") {
    const productId = button.getAttribute("data-product-id");
    uiState.previewQuantities[productId] = Math.max(1, (uiState.previewQuantities[productId] || 1) + Number(button.getAttribute("data-delta")));
    renderApp();
  }
  if (action === "toggle-faq") {
    const index = Number(button.getAttribute("data-index"));
    uiState.openFaq = uiState.openFaq === index ? -1 : index;
    renderApp();
  }
  if (action === "set-delivery-mode") {
    updateState((draft) => {
      draft.cart.deliveryMode = button.getAttribute("data-mode");
    });
  }
  if (action === "repeat-order") repeatOrder(id);
  if (action === "apply-promo-card") {
    const code = button.getAttribute("data-code");
    if (code) {
      updateState((draft) => { draft.cart.promoCode = code; }, { toast: `Промокод ${code} добавлен` });
      navigateTo("/cart");
    } else {
      pushToast("Эта акция применяется автоматически");
    }
  }
  if (action === "copy-referral") {
    navigator.clipboard?.writeText(state.content.offers.referralCode);
    pushToast("Код скопирован");
  }
  if (action === "set-account-filter") {
    uiState.accountOrderFilter = button.getAttribute("data-filter");
    renderApp();
  }
  if (action === "open-order-modal") {
    uiState.modal = { id };
    renderApp();
  }
  if (action === "close-modal") {
    if (event.target.closest("[data-modal-panel]") && !event.target.closest("[data-close-button]")) return;
    uiState.modal = null;
    renderApp();
  }
  if (action === "set-admin-section") {
    uiState.adminSection = button.getAttribute("data-section");
    navigateTo(`/admin?section=${uiState.adminSection}`, { replace: true });
  }
  if (action === "select-category") { uiState.selectedCategoryId = id; renderApp(); }
  if (action === "select-product") { uiState.selectedProductId = id; renderApp(); }
  if (action === "select-zone") { uiState.selectedZoneId = id; renderApp(); }
  if (action === "select-promo") { uiState.selectedPromoId = id; renderApp(); }
  if (action === "select-order") { uiState.selectedOrderId = id; renderApp(); }
  if (action === "select-customer") { uiState.selectedCustomerId = id; renderApp(); }
  if (action === "new-category") { uiState.selectedCategoryId = ""; renderApp(); }
  if (action === "new-product") { uiState.selectedProductId = ""; renderApp(); }
  if (action === "new-zone") { uiState.selectedZoneId = ""; renderApp(); }
  if (action === "new-promo") { uiState.selectedPromoId = ""; renderApp(); }
  if (action === "delete-category") {
    if (!uiState.selectedCategoryId) return;
    const selected = uiState.selectedCategoryId;
    if (state.products.some((product) => product.categoryId === selected)) return pushToast("Сначала перенесите товары из категории", "error");
    uiState.selectedCategoryId = "";
    updateState((draft) => { draft.categories = draft.categories.filter((item) => item.id !== selected); }, { toast: "Категория удалена", tone: "error" });
  }
  if (action === "delete-product") {
    if (!uiState.selectedProductId) return;
    const selected = uiState.selectedProductId;
    uiState.selectedProductId = "";
    updateState((draft) => { draft.products = draft.products.filter((item) => item.id !== selected); }, { toast: "Товар удалён", tone: "error" });
  }
  if (action === "delete-zone") {
    if (!uiState.selectedZoneId) return;
    const selected = uiState.selectedZoneId;
    uiState.selectedZoneId = "";
    updateState((draft) => { draft.zones = draft.zones.filter((item) => item.id !== selected); }, { toast: "Зона удалена", tone: "error" });
  }
  if (action === "delete-promo") {
    if (!uiState.selectedPromoId) return;
    const selected = uiState.selectedPromoId;
    uiState.selectedPromoId = "";
    updateState((draft) => { draft.promotions = draft.promotions.filter((item) => item.id !== selected); }, { toast: "Акция удалена", tone: "error" });
  }
  if (action === "set-admin-order-filter") {
    uiState.adminOrderFilter = button.getAttribute("data-filter");
    renderApp();
  }
  if (action === "export-state") exportState();
  if (action === "reset-demo") resetDemoState();
}

function handleDocumentChange(event) {
  const target = event.target;
  clearFieldInvalid(target);
  if (target.matches("[data-catalog-filter='sort']")) { uiState.catalog.sort = target.value; renderApp(); }
  if (target.matches("[data-product-modifier]")) {
    const productId = target.getAttribute("data-product-modifier");
    const current = new Set(uiState.previewModifiers[productId] || []);
    if (target.checked) current.add(target.value);
    else current.delete(target.value);
    uiState.previewModifiers[productId] = [...current];
    renderApp();
  }
  if (target.matches("[data-cart-field]")) {
    updateCartField(target.getAttribute("data-cart-field"), target.value);
    renderApp();
  }
}

function handleDocumentInput(event) {
  const target = event.target;
  clearFieldInvalid(target);
  if (target.matches("[data-catalog-filter='search']")) {
    rememberFocusedControl(target);
    uiState.catalog.search = target.value;
    renderApp();
  }
  if (target.matches("[data-cart-field]")) {
    rememberFocusedControl(target);
    updateCartField(target.getAttribute("data-cart-field"), target.value);
    renderApp();
  }
}

function handleDocumentSubmit(event) {
  const form = event.target;
  const formName = form.getAttribute("data-form");
  if (!formName) return;
  event.preventDefault();

  if (formName === "checkout") handleCheckoutSubmit(form);
  if (formName === "account") handleAccountSubmit(form);
  if (formName === "admin-content") handleAdminContentSubmit(form);
  if (formName === "admin-category") handleAdminCategorySubmit(form);
  if (formName === "admin-product") handleAdminProductSubmit(form);
  if (formName === "admin-zone") handleAdminZoneSubmit(form);
  if (formName === "admin-promo") handleAdminPromoSubmit(form);
  if (formName === "admin-order") handleAdminOrderSubmit(form);
  if (formName === "admin-settings") handleAdminSettingsSubmit(form);
}

function handleDocumentKeydown(event) {
  if (event.key === "Escape" && uiState.modal) {
    uiState.modal = null;
    renderApp();
  }
}

function startHeroTimer() {
  if (heroTimerId) window.clearInterval(heroTimerId);
  heroTimerId = window.setInterval(() => {
    if (uiState.route.name === "home") {
      const banners = getHomeBanners();
      uiState.heroSlide = (uiState.heroSlide + 1) % banners.length;
      renderApp();
    }
  }, 6000);
}

function attachGlobalListeners() {
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("change", handleDocumentChange);
  document.addEventListener("input", handleDocumentInput);
  document.addEventListener("submit", handleDocumentSubmit);
  document.addEventListener("keydown", handleDocumentKeydown);
  document.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLImageElement) || target.dataset.fallbackApplied) return;
      target.dataset.fallbackApplied = "true";
      target.src = getPlaceholderImage(target.alt || state.settings.brandName);
    },
    true,
  );
  window.addEventListener("popstate", () => {
    uiState.route = parseRoute(resolveCurrentRoutePath());
    if (uiState.route.name === "admin") uiState.adminSection = new URLSearchParams(window.location.search).get("section") || "dashboard";
    uiState.pendingHash = window.location.hash || "";
    uiState.pendingScrollBehavior = "auto";
    renderApp();
  });
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      state = loadState();
      syncUiSelections();
      renderApp();
    }
    if (event.key === THEME_KEY) {
      uiState.theme = loadTheme();
      renderApp();
    }
  });
  window.addEventListener("error", (event) => logSystem("error", event.message || "Unhandled error"));
  window.addEventListener("unhandledrejection", (event) => logSystem("promise", String(event.reason || "Unhandled rejection")));
}

attachGlobalListeners();
startHeroTimer();
renderApp();

function renderOrderModal() {
  if (!uiState.modal?.id) return "";
  const order = getById(state.orders, uiState.modal.id);
  if (!order) return "";
  const customer = getById(state.customers, order.customerId);
  return `
    <div class="modal-backdrop" data-action="close-modal" aria-hidden="false">
      <div class="summary-card modal-dialog" data-modal-panel role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
        <div class="summary-row">
          <h3 id="order-modal-title">Заказ ${escapeHtml(order.id)}</h3>
          <button class="btn-icon" type="button" data-action="close-modal" data-close-button aria-label="Закрыть детали заказа"><span class="material-symbols-outlined">close</span></button>
        </div>
        <p class="page-subtitle">${escapeHtml(customer?.name || "Гость")} • ${escapeHtml(formatDateTime(order.createdAt))}</p>
        <div class="summary-lines">
          <div class="summary-row"><span class="muted">Статус</span>${renderStatus(order.status)}</div>
          <div class="summary-row"><span class="muted">Оплата</span><strong>${escapeHtml(order.paymentMethod)}</strong></div>
          <div class="summary-row"><span class="muted">Сумма</span><strong>${formatCurrency(order.total)}</strong></div>
        </div>
        <div class="notice-card" style="margin-top:16px"><span class="material-symbols-outlined">receipt_long</span><div>${order.items.map((item) => { const product = getById(state.products, item.productId); return `${product?.name || item.productId} × ${item.quantity}`; }).join(", ")}</div></div>
      </div>
    </div>
  `;
}

function parseMultiline(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function numberValue(value) {
  return Number(String(value || "0").replace(",", ".")) || 0;
}

function nextId(prefix) {
  return `${prefix}-${Math.random().toString(16).slice(2, 8)}`;
}

function nextOrderId() {
  const max = state.orders.reduce((acc, order) => Math.max(acc, Number(order.id.replace(/\D+/g, "")) || 0), 0);
  return `TK23-${max + 1}`;
}

function logSystem(type, message) {
  state.logs.unshift({ id: nextId("log"), type, message, createdAt: new Date().toISOString() });
  state.logs = state.logs.slice(0, MAX_LOGS);
  saveState(state);
}

function updateCartField(name, value) {
  state.cart[name] = value;
  saveState(state);
}

function upsertCustomerRecord(cartData, total) {
  let customer = state.customers.find((item) => item.phone === cartData.customerPhone) || getCurrentCustomer();
  if (!customer) {
    customer = {
      id: nextId("customer"),
      name: cartData.customerName,
      phone: cartData.customerPhone,
      email: cartData.customerEmail,
      birthday: "",
      bonusPoints: 0,
      loyaltyTier: "Base",
      totalSpent: 0,
      ordersCount: 0,
      note: "",
    };
    state.customers.unshift(customer);
  }
  customer.name = cartData.customerName;
  customer.phone = cartData.customerPhone;
  customer.email = cartData.customerEmail;
  customer.ordersCount = Number(customer.ordersCount || 0) + 1;
  customer.totalSpent = Number(customer.totalSpent || 0) + total;
  customer.bonusPoints = Number(customer.bonusPoints || 0) + Math.round(total * 0.1);
  customer.loyaltyTier = customer.totalSpent >= 25000 ? "Gold" : customer.totalSpent >= 12000 ? "Silver" : "Base";
  state.session.currentCustomerId = customer.id;
  return customer.id;
}

function handleCheckoutSubmit(form) {
  const formData = new FormData(form);
  if (String(formData.get("website") || "").trim()) {
    pushToast("Ошибка проверки формы", "error");
    return;
  }
  state.cart.customerName = String(formData.get("customerName") || "").trim();
  state.cart.customerPhone = String(formData.get("customerPhone") || "").trim();
  state.cart.customerEmail = String(formData.get("customerEmail") || "").trim();
  state.cart.address = String(formData.get("address") || "").trim();
  state.cart.manualZoneId = String(formData.get("manualZoneId") || "").trim();
  state.cart.timeSlot = String(formData.get("timeSlot") || "").trim();
  state.cart.paymentMethod = String(formData.get("paymentMethod") || "").trim();
  state.cart.comment = String(formData.get("comment") || "").trim();
  saveState(state);

  const snapshot = getCartSnapshot();
  if (!snapshot.lines.length) return pushToast("Корзина пуста", "error");
  if (!state.cart.customerName || !state.cart.customerPhone) {
    if (!state.cart.customerName) markFieldInvalid("customerName");
    if (!state.cart.customerPhone) markFieldInvalid("customerPhone");
    focusField(!state.cart.customerName ? "customerName" : "customerPhone");
    return pushToast("Заполните имя и телефон", "error");
  }
  if (state.cart.deliveryMode === "delivery" && !state.cart.address) {
    markFieldInvalid("address");
    focusField("address");
    return pushToast("Введите адрес доставки", "error");
  }
  if (state.cart.deliveryMode === "delivery" && !snapshot.isValidZone) {
    focusField("manualZoneId");
    return pushToast("Не удалось определить активную зону доставки", "error");
  }
  if (state.cart.deliveryMode === "delivery" && snapshot.missingForMinOrder > 0) return pushToast(`До минимальной суммы не хватает ${formatCurrency(snapshot.missingForMinOrder)}`, "error");

  const customerId = upsertCustomerRecord(state.cart, snapshot.total);
  const order = {
    id: nextOrderId(),
    customerId,
    createdAt: new Date().toISOString(),
    status: "new",
    deliveryMode: state.cart.deliveryMode,
    address: state.cart.address,
    zoneId: snapshot.zone?.id || "",
    paymentMethod: state.cart.paymentMethod,
    comment: state.cart.comment,
    adminNote: "",
    items: state.cart.items.map((item) => ({ productId: item.productId, quantity: item.quantity, modifierIds: [...(item.modifierIds || [])] })),
    subtotal: snapshot.subtotal,
    discountTotal: snapshot.discountTotal,
    deliveryFee: snapshot.deliveryFee,
    total: snapshot.total,
  };

  updateState(
    (draft) => {
      draft.orders.unshift(order);
      draft.session.recentOrderId = order.id;
      draft.cart.items = [];
      draft.cart.promoCode = "";
      draft.cart.comment = "";
    },
    { toast: `Заказ ${order.id} успешно оформлен` },
  );
  logSystem("order", `Оформлен новый заказ ${order.id}`);
  navigateTo("/checkout", { replace: true });
}

function handleAccountSubmit(form) {
  const customer = getCurrentCustomer();
  if (!customer) return;
  const formData = new FormData(form);
  updateState(
    (draft) => {
      const entity = draft.customers.find((item) => item.id === customer.id);
      if (!entity) return;
      entity.name = String(formData.get("name") || "").trim();
      entity.phone = String(formData.get("phone") || "").trim();
      entity.email = String(formData.get("email") || "").trim();
      entity.birthday = String(formData.get("birthday") || "").trim();
    },
    { toast: "Профиль обновлён" },
  );
}

function handleAdminContentSubmit(form) {
  const formData = new FormData(form);
  updateState(
    (draft) => {
      draft.content.home.title = String(formData.get("homeTitle") || "").trim();
      draft.content.home.subtitle = String(formData.get("homeSubtitle") || "").trim();
      draft.content.offers.title = String(formData.get("offersTitle") || "").trim();
      draft.content.offers.subtitle = String(formData.get("offersSubtitle") || "").trim();
      draft.content.contacts.title = String(formData.get("contactsTitle") || "").trim();
      draft.content.contacts.subtitle = String(formData.get("contactsSubtitle") || "").trim();
      draft.content.home.benefits = parseMultiline(formData.get("benefits")).map((line, index) => {
        const [icon = "star", title = `Преимущество ${index + 1}`, text = ""] = line.split("|");
        return { icon: icon.trim(), title: title.trim(), text: text.trim() };
      });
      draft.content.faq.items = parseMultiline(formData.get("faqItems")).map((line, index) => {
        const [question = `Вопрос ${index + 1}`, answer = ""] = line.split("|");
        return { question: question.trim(), answer: answer.trim() };
      });
    },
    { toast: "Контент обновлён" },
  );
}

function handleAdminCategorySubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get("id") || "").trim() || nextId("category");
  if (!String(formData.get("name") || "").trim()) return pushToast("Укажите название категории", "error");
  const payload = {
    id,
    slug: slugify(String(formData.get("slug") || formData.get("name"))),
    name: String(formData.get("name") || "").trim(),
    subtitle: String(formData.get("subtitle") || "").trim(),
    active: formData.has("active"),
    sortOrder: numberValue(formData.get("sortOrder")),
  };
  uiState.selectedCategoryId = id;
  updateState(
    (draft) => {
      const existing = draft.categories.find((item) => item.id === id);
      if (existing) Object.assign(existing, payload);
      else draft.categories.push(payload);
    },
    { toast: "Категория сохранена" },
  );
}

function handleAdminProductSubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get("id") || "").trim() || nextId("product");
  if (!String(formData.get("name") || "").trim()) return pushToast("Укажите название товара", "error");
  const payload = {
    id,
    slug: slugify(String(formData.get("slug") || formData.get("name"))),
    name: String(formData.get("name") || "").trim(),
    categoryId: String(formData.get("categoryId") || "rolls"),
    subcategory: String(formData.get("subcategory") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    composition: String(formData.get("composition") || "").trim(),
    weight: numberValue(formData.get("weight")),
    price: numberValue(formData.get("price")),
    image: String(formData.get("image") || "").trim(),
    badges: String(formData.get("badges") || "").split(",").map((item) => item.trim()).filter(Boolean),
    featured: formData.has("featured"),
    premium: formData.has("premium"),
    spicy: formData.has("spicy"),
    available: formData.has("available"),
    nutrition: {
      calories: numberValue(formData.get("calories")),
      protein: numberValue(formData.get("protein")),
      fat: numberValue(formData.get("fat")),
      carbs: numberValue(formData.get("carbs")),
    },
    modifiers: parseMultiline(formData.get("modifiers")).map((line) => {
      const [name = "", price = "0"] = line.split("|");
      return { id: slugify(name), name: name.trim(), price: numberValue(price) };
    }),
    relatedIds: String(formData.get("relatedIds") || "").split(",").map((item) => item.trim()).filter(Boolean),
    sortOrder: numberValue(formData.get("sortOrder")),
  };
  uiState.selectedProductId = id;
  updateState(
    (draft) => {
      const existing = draft.products.find((item) => item.id === id);
      if (existing) Object.assign(existing, payload);
      else draft.products.push(payload);
    },
    { toast: "Товар сохранён" },
  );
}

function handleAdminZoneSubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get("id") || "").trim() || nextId("zone");
  if (!String(formData.get("name") || "").trim()) return pushToast("Укажите название зоны", "error");
  const payload = {
    id,
    name: String(formData.get("name") || "").trim(),
    slug: slugify(String(formData.get("slug") || formData.get("name"))),
    keywords: String(formData.get("keywords") || "").split(",").map((item) => item.trim()).filter(Boolean),
    deliveryPrice: numberValue(formData.get("deliveryPrice")),
    minOrder: numberValue(formData.get("minOrder")),
    freeFrom: numberValue(formData.get("freeFrom")),
    eta: String(formData.get("eta") || "").trim(),
    note: String(formData.get("note") || "").trim(),
    enabled: formData.has("enabled"),
  };
  uiState.selectedZoneId = id;
  updateState(
    (draft) => {
      const existing = draft.zones.find((item) => item.id === id);
      if (existing) Object.assign(existing, payload);
      else draft.zones.push(payload);
    },
    { toast: "Зона сохранена" },
  );
}

function handleAdminPromoSubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get("id") || "").trim() || nextId("promo");
  if (!String(formData.get("title") || "").trim()) return pushToast("Укажите название акции", "error");
  const payload = {
    id,
    title: String(formData.get("title") || "").trim(),
    slug: slugify(String(formData.get("slug") || formData.get("title"))),
    mode: String(formData.get("mode") || "auto"),
    code: String(formData.get("code") || "").trim(),
    discountType: String(formData.get("discountType") || "percent"),
    amount: numberValue(formData.get("amount")),
    minSubtotal: numberValue(formData.get("minSubtotal")),
    dayOfWeek: String(formData.get("dayOfWeek") || "").trim(),
    categoryId: String(formData.get("categoryId") || "").trim(),
    description: String(formData.get("description") || "").trim(),
    label: String(formData.get("label") || "").trim(),
    image: String(formData.get("image") || "").trim(),
    firstOrderOnly: formData.has("firstOrderOnly"),
    active: formData.has("active"),
  };
  uiState.selectedPromoId = id;
  updateState(
    (draft) => {
      const existing = draft.promotions.find((item) => item.id === id);
      if (existing) Object.assign(existing, payload);
      else draft.promotions.push(payload);
    },
    { toast: "Акция сохранена" },
  );
}

function handleAdminOrderSubmit(form) {
  const formData = new FormData(form);
  const id = String(formData.get("id") || "");
  updateState(
    (draft) => {
      const order = draft.orders.find((item) => item.id === id);
      if (!order) return;
      order.status = String(formData.get("status") || order.status);
      order.adminNote = String(formData.get("adminNote") || "").trim();
    },
    { toast: `Заказ ${id} обновлён` },
  );
}

function handleAdminSettingsSubmit(form) {
  const formData = new FormData(form);
  updateState(
    (draft) => {
      draft.settings.brandName = String(formData.get("brandName") || "").trim();
      draft.settings.brandTagline = String(formData.get("brandTagline") || "").trim();
      draft.settings.phone = String(formData.get("phone") || "").trim();
      draft.settings.email = String(formData.get("email") || "").trim();
      draft.settings.address = String(formData.get("address") || "").trim();
      draft.settings.city = String(formData.get("city") || "").trim();
      draft.settings.schedule = String(formData.get("schedule") || "").trim();
      draft.settings.seo.defaultTitle = String(formData.get("defaultTitle") || "").trim();
      draft.settings.seo.defaultDescription = String(formData.get("defaultDescription") || "").trim();
    },
    { toast: "Настройки сохранены" },
  );
}
