import { TOKI23_CATEGORIES, TOKI23_PRODUCTS } from "./menu-seed.js";

function getSeedImage(productId) {
  return TOKI23_PRODUCTS.find((product) => product.id === productId)?.image || "";
}

export const DEFAULT_STATE = {
  meta: {
    appName: "Токи23",
    version: "2.0.0",
    seededAt: "2026-03-27",
  },
  settings: {
    brandName: "Токи23",
    brandTagline: "Доставка суши и роллов в Сочи с актуальным меню и управлением через админку",
    phone: "+7 (862) 555-23-23",
    email: "hello@toki23.ru",
    supportEmail: "support@toki23.ru",
    city: "Сочи",
    address: "ул. Навагинская, 9",
    schedule: "Ежедневно с 10:00 до 23:00",
    avgDeliveryTime: "35-50 мин",
    footerNote:
      "Актуальное меню, акции, зоны доставки и контент сайта редактируются прямо из административной панели без ручного обновления кода.",
    checkoutAgreement:
      "Нажимая кнопку оформления, вы подтверждаете согласие с офертой и политикой обработки персональных данных.",
    seo: {
      defaultTitle: "Токи23",
      defaultDescription:
        "Токи23 — доставка суши и роллов в Сочи: единая главная с каталогом, быстрый поиск, корзина, checkout и управляемая админ-панель.",
      pages: {
        home: {
          title: "Токи23 | Доставка суши и роллов в Сочи",
          description:
            "На главной сразу доступны баннеры, акции и каталог роллов Токи23 с быстрым поиском, категориями и мгновенным добавлением в корзину.",
        },
        catalog: {
          title: "Меню | Токи23",
          description:
            "Актуальное меню Токи23: классические, запечённые, жареные и BIG роллы с редактированием через админку.",
        },
        offers: {
          title: "Акции | Токи23",
          description:
            "Промокоды, бонусы и автоматические акции Токи23 для заказов по Сочи.",
        },
        checkout: {
          title: "Оформление заказа | Токи23",
          description:
            "Checkout Токи23 с выбором зоны доставки, времени, способа оплаты и быстрым подтверждением заказа.",
        },
        admin: {
          title: "Админ-панель | Токи23",
          description:
            "Управление контентом, меню, заказами, зонами доставки и акциями сайта Токи23.",
        },
      },
    },
  },
  content: {
    home: {
      eyebrow: "ТОКИ23 • Сочи",
      title: "Свежие роллы с доставкой по Сочи. После первого экрана сразу начинается меню.",
      subtitle:
        "Главная объединена с каталогом: сначала баннеры и акции, затем полноценное меню с поиском, якорями по категориям и быстрым добавлением в корзину.",
      ctaLabel: "Смотреть меню",
      ctaLink: "/#menu",
      secondaryLabel: "Акции и бонусы",
      secondaryLink: "/offers",
      editorialText:
        "Меню обновлено по текущим позициям Токи23: классические, запечённые, жареные и BIG роллы доступны на одной странице и редактируются через админку.",
      featuredTitle: "Выбирают сегодня",
      banners: [
        {
          id: "hero-classics",
          title: "Классические роллы",
          subtitle: "Филадельфия, Канада, Эби ролл и другие хиты без перехода на отдельную страницу каталога.",
          ctaLabel: "К хитам меню",
          ctaLink: "/#menu-classic-rolls",
          image: getSeedImage("philadelphia"),
        },
        {
          id: "hero-baked",
          title: "Запечённые новинки",
          subtitle: "Запечённая филадельфия, ролл Том-Ям и тёплые позиции для вечернего заказа.",
          ctaLabel: "Смотреть запечённые",
          ctaLink: "/#menu-baked-rolls",
          image: getSeedImage("baked-philadelphia"),
        },
        {
          id: "hero-tempura",
          title: "Темпура и BIG",
          subtitle: "Королевская темпура, фирменные ТемпуРАНы и большие роллы для компании.",
          ctaLabel: "Открыть жареные роллы",
          ctaLink: "/#menu-fried-rolls",
          image: getSeedImage("royal-tempura"),
        },
      ],
      benefits: [
        {
          icon: "schedule",
          title: "Понятное время доставки",
          text: "Зона определяется по адресу или выбирается вручную, а стоимость и минимальная сумма пересчитываются без перезагрузки.",
        },
        {
          icon: "manage_search",
          title: "Поиск работает в реальном времени",
          text: "Ищите по названию и категориям прямо на главной странице, не теряя фокус и позицию в каталоге.",
        },
        {
          icon: "admin_panel_settings",
          title: "Меню полностью управляемо",
          text: "Категории, карточки, цены, акции и тексты редактируются в админке и сразу отражаются на витрине.",
        },
      ],
    },
    catalog: {
      title: "Меню Токи23",
      subtitle:
        "Актуальные роллы из текущего меню Токи23 в Сочи: классические, запечённые, жареные и BIG позиции.",
    },
    offers: {
      title: "Бонусы и акции Токи23",
      subtitle:
        "Промокоды, приветственные скидки и автоматические спецпредложения применяются без перезагрузки и сразу учитываются в корзине.",
      referralTitle: "Пригласите друга",
      referralText:
        "Поделитесь реферальным кодом: новый гость получит скидку на первый заказ, а вы — бонусные баллы на счёт.",
      referralCode: "TOKI23-FRIEND",
    },
    faq: {
      title: "Частые вопросы",
      subtitle:
        "Коротко собрали ответы по доставке, оплате, зонам, промокодам и работе объединённой главной с каталогом.",
      items: [
        {
          question: "Как работает каталог на главной?",
          answer:
            "После первого экрана на главной сразу начинается меню. Между категориями можно перемещаться по якорям, а поиск и фильтры работают без перезагрузки.",
        },
        {
          question: "Можно ли выбрать зону доставки вручную?",
          answer:
            "Да. В корзине и checkout доступен ручной выбор зоны, если адрес не распознался автоматически.",
        },
        {
          question: "Почему некоторые позиции временно недоступны?",
          answer:
            "Если товар попадает в стоп-лист, карточка остаётся в каталоге, но кнопка добавления отключается. Это состояние тоже управляется через админку.",
        },
        {
          question: "Сохраняется ли выбранная тема сайта?",
          answer:
            "Да. Тёмная и светлая темы переключаются мгновенно и сохраняются локально, поэтому выбранный режим остаётся после обновления страницы.",
        },
      ],
    },
    contacts: {
      title: "Контакты и доставка",
      subtitle:
        "Токи23 доставляет по Сочи, Хосте и Адлеру. Если адрес не распознан автоматически, зону можно выбрать вручную в корзине или checkout.",
      mapTitle: "Зоны доставки",
      notes: [
        "Стоимость доставки и минимальная сумма зависят от зоны.",
        "Самовывоз доступен в часы работы кухни.",
        "Актуальные зоны и пороги всегда можно отредактировать через админку.",
      ],
    },
    footer: {
      links: [
        { label: "Меню", href: "/#menu" },
        { label: "Акции", href: "/offers" },
        { label: "FAQ", href: "/faq" },
        { label: "Контакты", href: "/contacts" },
        { label: "Политика", href: "/legal/privacy" },
        { label: "Оферта", href: "/legal/terms" },
      ],
    },
    legal: {
      privacy: {
        title: "Политика конфиденциальности",
        intro:
          "Мы обрабатываем только те данные, которые нужны для оформления заказа, связи с клиентом и хранения истории заказов.",
        points: [
          "Имя, телефон, email и адрес используются только для обработки и доставки заказа.",
          "История заказов хранится в системе для бонусной программы, аналитики и повторных заказов.",
          "Данные не передаются третьим лицам, кроме случаев, необходимых для исполнения заказа.",
        ],
      },
      terms: {
        title: "Публичная оферта",
        intro:
          "Размещение заказа на сайте считается акцептом публичной оферты. Актуальные цены, меню и акции публикуются на витрине Токи23.",
        points: [
          "Сумма заказа складывается из товаров, модификаторов, скидок и стоимости доставки.",
          "Сроки доставки зависят от загруженности кухни, курьеров и дорожной ситуации.",
          "При необходимости оператор может связаться с клиентом для уточнения деталей заказа.",
        ],
      },
    },
  },
  categories: TOKI23_CATEGORIES,
  products: TOKI23_PRODUCTS,
  zones: [
    {
      id: "sochi-center",
      name: "Центральный Сочи",
      slug: "sochi-center",
      keywords: ["сочи", "навагинская", "московская", "конституции", "центр"],
      deliveryPrice: 0,
      minOrder: 1500,
      freeFrom: 1500,
      eta: "35-45 мин",
      note: "Быстрая доставка по центру города.",
      enabled: true,
    },
    {
      id: "hosta",
      name: "Хоста / Мацеста",
      slug: "hosta",
      keywords: ["хоста", "мацеста", "бытха", "курортный"],
      deliveryPrice: 190,
      minOrder: 1800,
      freeFrom: 3000,
      eta: "45-60 мин",
      note: "Доставка с вечерними слотами без скрытых доплат.",
      enabled: true,
    },
    {
      id: "adler",
      name: "Адлер / Сириус",
      slug: "adler",
      keywords: ["адлер", "сириус", "имерет", "олимпийский"],
      deliveryPrice: 250,
      minOrder: 2200,
      freeFrom: 3500,
      eta: "55-75 мин",
      note: "Учитывайте увеличенное время доставки в высокий сезон.",
      enabled: true,
    },
  ],
  promotions: [
    {
      id: "promo-free-delivery",
      title: "Бесплатная доставка в центре",
      slug: "free-delivery-center",
      mode: "auto",
      code: "",
      description: "Для центра Сочи доставка становится бесплатной уже от 1 500 ₽.",
      discountType: "free_delivery",
      amount: 0,
      minSubtotal: 1500,
      firstOrderOnly: false,
      categoryId: "",
      dayOfWeek: "",
      active: true,
      label: "AUTO",
      image: getSeedImage("philadelphia"),
    },
    {
      id: "promo-toki23",
      title: "TOKI23",
      slug: "toki23",
      mode: "code",
      code: "TOKI23",
      description: "Скидка 10% на заказы от 2 000 ₽.",
      discountType: "percent",
      amount: 10,
      minSubtotal: 2000,
      firstOrderOnly: false,
      categoryId: "",
      dayOfWeek: "",
      active: true,
      label: "CODE",
      image: getSeedImage("canada"),
    },
    {
      id: "promo-start23",
      title: "START23",
      slug: "start23",
      mode: "code",
      code: "START23",
      description: "Минус 300 ₽ на первый заказ от 1 200 ₽.",
      discountType: "fixed",
      amount: 300,
      minSubtotal: 1200,
      firstOrderOnly: true,
      categoryId: "",
      dayOfWeek: "",
      active: true,
      label: "WELCOME",
      image: getSeedImage("ebi-roll"),
    },
    {
      id: "promo-baked-day",
      title: "Тёплый четверг",
      slug: "baked-day",
      mode: "auto",
      code: "",
      description: "По четвергам скидка 12% на запечённые роллы от 1 800 ₽.",
      discountType: "percent",
      amount: 12,
      minSubtotal: 1800,
      firstOrderOnly: false,
      categoryId: "baked-rolls",
      dayOfWeek: "4",
      active: true,
      label: "WEEKLY",
      image: getSeedImage("baked-philadelphia"),
    },
  ],
  customers: [
    {
      id: "customer-anna",
      name: "Анна Смирнова",
      phone: "+7 (999) 100-10-10",
      email: "anna@toki23.ru",
      birthday: "1994-06-14",
      bonusPoints: 960,
      loyaltyTier: "Gold",
      totalSpent: 12640,
      ordersCount: 5,
      note: "Просит не звонить в домофон после 22:00.",
    },
    {
      id: "customer-igor",
      name: "Игорь Беляев",
      phone: "+7 (999) 200-20-20",
      email: "igor@toki23.ru",
      birthday: "1989-12-02",
      bonusPoints: 420,
      loyaltyTier: "Silver",
      totalSpent: 8120,
      ordersCount: 3,
      note: "",
    },
    {
      id: "customer-maria",
      name: "Мария Волкова",
      phone: "+7 (999) 300-30-30",
      email: "maria@toki23.ru",
      birthday: "1997-03-19",
      bonusPoints: 180,
      loyaltyTier: "Base",
      totalSpent: 2870,
      ordersCount: 1,
      note: "Удобнее доставка без звонка, писать в чат.",
    },
  ],
  orders: [
    {
      id: "TK23-8842",
      customerId: "customer-anna",
      createdAt: "2026-03-27T14:20:00+03:00",
      status: "cooking",
      deliveryMode: "delivery",
      address: "ул. Навагинская, 17",
      zoneId: "sochi-center",
      paymentMethod: "card_online",
      comment: "Без звонка, пожалуйста.",
      adminNote: "Повторный клиент, просит палочки на 3 персоны.",
      items: [
        { productId: "philadelphia", quantity: 2, modifierIds: [] },
        { productId: "canada", quantity: 1, modifierIds: ["unagi-sauce"] },
        { productId: "tempuran-salmon", quantity: 1, modifierIds: [] },
      ],
      subtotal: 3141,
      discountTotal: 0,
      deliveryFee: 0,
      total: 3141,
    },
    {
      id: "TK23-8841",
      customerId: "customer-igor",
      createdAt: "2026-03-27T13:05:00+03:00",
      status: "on_way",
      deliveryMode: "delivery",
      address: "ул. Яна Фабрициуса, 5",
      zoneId: "hosta",
      paymentMethod: "apple_pay",
      comment: "",
      adminNote: "",
      items: [
        { productId: "baked-philadelphia", quantity: 1, modifierIds: ["extra-cheese"] },
        { productId: "ebi-roll", quantity: 2, modifierIds: [] },
      ],
      subtotal: 2418,
      discountTotal: 242,
      deliveryFee: 0,
      total: 2176,
    },
    {
      id: "TK23-8840",
      customerId: "customer-maria",
      createdAt: "2026-03-27T11:40:00+03:00",
      status: "delivered",
      deliveryMode: "pickup",
      address: "",
      zoneId: "",
      paymentMethod: "cash",
      comment: "",
      adminNote: "Самовывоз забрали вовремя.",
      items: [
        { productId: "california", quantity: 2, modifierIds: [] },
        { productId: "royal-tempura", quantity: 1, modifierIds: [] },
      ],
      subtotal: 1697,
      discountTotal: 0,
      deliveryFee: 0,
      total: 1697,
    },
  ],
  cart: {
    items: [
      { productId: "philadelphia", quantity: 1, modifierIds: ["extra-cheese"] },
      { productId: "ebi-tempura", quantity: 1, modifierIds: [] },
    ],
    promoCode: "",
    comment: "",
    deliveryMode: "delivery",
    address: "ул. Навагинская, 9",
    manualZoneId: "",
    timeSlot: "Как можно скорее",
    paymentMethod: "card_online",
    customerName: "Анна",
    customerPhone: "+7 (999) 100-10-10",
    customerEmail: "anna@toki23.ru",
    options: {
      noCutlery: false,
      noCall: true,
      needNapkins: true,
    },
  },
  session: {
    currentCustomerId: "customer-anna",
    recentOrderId: "",
  },
  logs: [],
};
