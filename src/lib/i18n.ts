import { derived, get, writable } from "svelte/store";

export type Locale = "en" | "el";

export const locale = writable<Locale>("en");
if (typeof window !== "undefined") {
  const saved = window.localStorage.getItem("locale");
  if (saved === "en" || saved === "el") {
    locale.set(saved);
  }
  locale.subscribe((val) => {
    try {
      window.localStorage.setItem("locale", val);
    } catch {
      /* ignore */
    }
    try {
      document.documentElement.setAttribute("lang", val);
    } catch {
      /* ignore */
    }
  });
}

// Helper type for deeply nested keys
type DeepKey<T> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | `${K}.${DeepKey<T[K]>}`
        : never;
    }[keyof T]
  : "";

const translations = {
  nav: {
    dashboard: { en: "Dashboard", el: "Πίνακας Ελέγχου" },
    orders: { en: "Orders", el: "Παραγγελίες" },
    admin: { en: "Admin", el: "Διαχείριση" },
    settings: { en: "Settings", el: "Ρυθμίσεις" },
    products: { en: "Products", el: "Προϊόντα" },
    categories: { en: "Categories", el: "Κατηγορίες" },
    users: { en: "Users", el: "Χρήστες" },
    appointments: { en: "Appointments", el: "Ραντεβού" },
    football: { en: "Football", el: "Γήπεδα Ποδοσφαίρου" },
    logout: { en: "Logout", el: "Αποσύνδεση" },
    reports: { en: "Reports", el: "Αναφορές" },
    registers: { en: "Registers", el: "Ταμεία" },
    bookings: { en: "Bookings", el: "Κρατήσεις" },
    overview: { en: "Overview", el: "Επισκόπηση" },
  },
  orders: {
    recent: { en: "Recent Orders", el: "Πρόσφατες Παραγγελίες" },
    new: { en: "New Sale", el: "Νέα Πώληση" },
    search: { en: "Search products...", el: "Αναζήτηση προϊόντων..." },
    cart: { en: "Cart", el: "Καλάθι" },
    categories: { en: "Categories", el: "Κατηγορίες" },
    all: { en: "All", el: "Όλα" },
    availableProducts: { en: "Available Products", el: "Διαθέσιμα Προϊόντα" },
    empty: { en: "Empty", el: "Άδειο" },
    subtotal: { en: "Subtotal", el: "Μερικό Σύνολο" },
    discount: { en: "Discount", el: "Έκπτωση" },
    total: { en: "Total", el: "Σύνολο" },
    products: { en: "Products", el: "Προϊόντα" },
    coupon: { en: "Coupon", el: "Κουπόνι" },
    coupons: { en: "Coupons", el: "Κουπόνια" },
    cash: { en: "Cash", el: "Μετρητά" },
    treat: { en: "Treat", el: "Κέρασμα" },
    free: { en: "Free", el: "Δωρεάν" },
    clear: { en: "Clear", el: "Καθάρισμα" },
    emptyCart: { en: "Your cart is empty", el: "Το καλάθι σας είναι άδειο" },
    addProductsHint: {
      en: "Add some products to get started",
      el: "Προσθέστε προϊόντα για να ξεκινήσετε",
    },
    newSalesSubtitle: {
      en: "Filter categories, mark treats, and apply coupons in one flow.",
      el: "Φιλτράρετε κατηγορίες, ορίστε κεράσματα και εφαρμόστε κουπόνια σε μία ροή.",
    },
    menuSubtitle: {
      en: "Tap to add products to the ticket.",
      el: "Πατήστε για προσθήκη.",
    },
    menuFallback: {
      en: "Tap to add products to the ticket.",
      el: "Πατήστε για προσθήκη.",
    },
    cartSubtitle: {
      en: "Review items, mark treats, apply coupons.",
      el: "Ελέγξτε είδη, ορίστε κεράσματα, εφαρμόστε κουπόνια.",
    },
    couponsHint: {
      en: "Every coupon deducts €2 from the total.",
      el: "Κάθε κουπόνι αφαιρεί €2 από το σύνολο.",
    },
    decrementCoupon: { en: "Remove coupon", el: "Αφαίρεση κουπονιού" },
    incrementCoupon: { en: "Add coupon", el: "Προσθήκη κουπονιού" },
    markTreat: { en: "Mark treat", el: "Σήμανση κεράσματος" },
    removeItem: { en: "Remove item", el: "Αφαίρεση είδους" },
    summaryHint: {
      en: "Session syncs automatically when you submit.",
      el: "Η συνεδρία ενημερώνεται αυτόματα με την υποβολή.",
    },
    close: { en: "Close", el: "Κλείσιμο" },
    submit: { en: "Submit Order", el: "Υποβολή Παραγγελίας" },
    actions: { en: "Actions", el: "Ενέργειες" },
    viewDetails: { en: "View Details", el: "Προβολή Λεπτομερειών" },
    printReceipt: { en: "Print Receipt", el: "Εκτύπωση Απόδειξης" },
    none: {
      en: "No recent orders to show.",
      el: "Δεν υπάρχουν πρόσφατες πωλήσεις για εμφάνιση.",
    },
    orderLabel: { en: "Order", el: "Παραγγελία" },
    itemsHeader: { en: "Items", el: "Είδη" },
    itemsWord: { en: "items", el: "είδη" },
    treatsWord: { en: "treats", el: "κεράσματα" },
    paymentLabel: { en: "Payment", el: "Πληρωμή" },
    receiptTitle: { en: "Receipt", el: "Απόδειξη" },
    details: { en: "Details", el: "Λεπτομέρειες" },
    print: { en: "Print", el: "Εκτύπωση" },
    latest: { en: "Latest activity", el: "Τελευταίες κινήσεις" },
    toast: {
      success: { en: "Order created", el: "Η παραγγελία δημιουργήθηκε" },
      error: {
        en: "Failed to create order",
        el: "Αποτυχία δημιουργίας παραγγελίας",
      },
    },
  },
  dashboard: {
    admin: {
      title: { en: "Admin Dashboard", el: "Πίνακας Ελέγχου Διαχειριστή" },
      revenue: { en: "Today's Revenue", el: "Σημερινά Έσοδα" },
      manageRegisters: { en: "Manage Registers", el: "Διαχείριση Ταμείων" },
      closeRegister: {
        en: "Close Current Register",
        el: "Κλείσιμο Ταμείου",
      },
      closing: { en: "Closing...", el: "Κλείσιμο..." },
    },
    staff: {
      title: { en: "Staff Dashboard", el: "Πίνακας Ελέγχου Προσωπικού" },
      pos: { en: "Point of Sale", el: "Σημείο Πώλησης" },
      posDesc: {
        en: "Process customer transactions",
        el: "Επεξεργασία συναλλαγών",
      },
      quickActions: {
        en: "Fast actions for daily work",
        el: "Γρήγορες ενέργειες",
      },
      register: { en: "Register", el: "Ταμείο" },
      closeRegister: { en: "Close Register", el: "Κλείσιμο Ταμείου" },
      closePromptTitle: { en: "Close register", el: "Κλείσιμο ταμείου" },
      closePromptDesc: {
        en: "Please enter your name (required) and optional notes before closing.",
        el: "Παρακαλώ εισάγετε το όνομά σας (υποχρεωτικό) και προαιρετικές σημειώσεις πριν το κλείσιμο.",
      },
      confirmClose: { en: "Confirm Close", el: "Επιβεβαίωση Κλεισίματος" },
      required: { en: "Required", el: "Υποχρεωτικό" },
      optional: { en: "Optional", el: "Προαιρετικό" },
    },
    secretary: {
      title: { en: "Secretary Dashboard", el: "Πίνακας Ελέγχου Γραμματείας" },
      appointmentsDesc: {
        en: "Manage birthday parties and events.",
        el: "Διαχείριση παιδικών πάρτυ και εκδηλώσεων.",
      },
      footballDesc: {
        en: "Manage football field reservations.",
        el: "Διαχείριση κρατήσεων γηπέδων ποδοσφαίρου.",
      },
      manage: { en: "Manage", el: "Διαχείριση" },
    },
    loading: { en: "Loading dashboard...", el: "Φόρτωση πίνακα..." },
  },
  common: {
    actions: { en: "Actions", el: "Ενέργειες" },
    edit: { en: "Edit", el: "Επεξεργασία" },
    delete: { en: "Delete", el: "Διαγραφή" },
    save: { en: "Save", el: "Αποθήκευση" },
    add: { en: "Add", el: "Προσθήκη" },
    cancel: { en: "Cancel", el: "Ακύρωση" },
    status: { en: "Status", el: "Κατάσταση" },
    name: { en: "Name", el: "Όνομα" },
    price: { en: "Price", el: "Τιμή" },
    stock: { en: "Stock", el: "Απόθεμα" },
    image: { en: "Image", el: "Εικόνα" },
    category: { en: "Category", el: "Κατηγορία" },
    role: { en: "Role", el: "Ρόλος" },
    active: { en: "Active", el: "Ενεργός" },
    password: { en: "Password", el: "Κωδικός" },
    username: { en: "Username", el: "Όνομα Χρήστη" },
    notes: { en: "Notes", el: "Σημειώσεις" },
    description: { en: "Description", el: "Περιγραφή" },
    parent: { en: "Parent", el: "Γονική" },
    toggleTheme: { en: "Toggle theme", el: "Εναλλαγή θέματος" },
    toggleSidebar: {
      en: "Toggle sidebar",
      el: "Άνοιγμα/Κλείσιμο πλαϊνού μενού",
    },
    viewAll: { en: "View All", el: "Προβολή όλων" },
    clear: { en: "Clear", el: "Καθαρισμός" },
    uploadImage: { en: "Upload Image", el: "Μεταφόρτωση Εικόνας" },
    changeImage: { en: "Change Image", el: "Αλλαγή Εικόνας" },
    unlimited: { en: "Unlimited", el: "Απεριόριστο" },
    tagline: {
      en: "Control centre for your club operations.",
      el: "Κέντρο ελέγχου για τις λειτουργίες του συλλόγου σας.",
    },
    operatingSuite: { en: "Operating Suite", el: "Σουίτα Λειτουργιών" },
    open: { en: "Open", el: "Ανοιχτό" },
  },
  pages: {
    settings: {
      inventory: { en: "Inventory", el: "Απόθεμα" },
      lowStockThreshold: {
        en: "Low stock threshold",
        el: "Όριο χαμηλού αποθέματος",
      },
    },
    products: {
      title: { en: "All Products", el: "Όλα τα Προϊόντα" },
      add: { en: "Add Product", el: "Προσθήκη Προϊόντος" },
      manageCategories: {
        en: "Manage Categories",
        el: "Διαχείριση Κατηγοριών",
      },
      selectCategory: { en: "Select category", el: "Επιλέξτε κατηγορία" },
    },
    categories: {
      title: { en: "Product Categories", el: "Κατηγορίες Προϊόντων" },
      add: { en: "Add Category", el: "Προσθήκη Κατηγορίας" },
      placeholder: { en: "Category name", el: "Όνομα κατηγορίας" },
    },
    users: {
      title: { en: "Users", el: "Χρήστες" },
      add: { en: "Create User", el: "Δημιουργία Χρήστη" },
      edit: { en: "Edit User", el: "Επεξεργασία Χρήστη" },
      usernamePlaceholder: {
        en: "Enter username",
        el: "Εισαγάγετε όνομα χρήστη",
      },
      passwordOptionalPlaceholder: {
        en: "Leave blank to keep unchanged",
        el: "Αφήστε κενό για να παραμείνει",
      },
      newPasswordPlaceholder: { en: "New password", el: "Νέος κωδικός" },
    },
    pos: {
      title: { en: "Point of Sale", el: "Σημείο Πώλησης" },
      subtitle: {
        en: "Process sales and manage transactions",
        el: "Επεξεργασία πωλήσεων και διαχείριση συναλλαγών",
      },
      todaySales: { en: "Today's Sales", el: "Σημερινές Πωλήσεις" },
      transactions: { en: "Transactions", el: "Συναλλαγές" },
      products: { en: "Products", el: "Προϊόντα" },
      latest: { en: "Latest", el: "Τελευταία" },
    },
    ordersPage: {
      title: { en: "All Orders", el: "Όλες οι Παραγγελίες" },
      date: { en: "Date", el: "Ημερομηνία" },
    },
    admin: {
      overview: {
        en: "Overview of your business",
        el: "Επισκόπηση της επιχείρησής σας",
      },
      activeUsers: { en: "Active Users", el: "Ενεργοί Χρήστες" },
      pendingTasks: { en: "Pending Tasks", el: "Εκκρεμείς Εργασίες" },
    },
    appointments: {
      title: { en: "Appointments", el: "Ραντεβού" },
      subtitle: {
        en: "Manage birthday parties and events",
        el: "Διαχείριση παιδικών πάρτυ και εκδηλώσεων",
      },
      totalBookings: { en: "Total Bookings", el: "Συνολικές Κρατήσεις" },
      activeAppointments: { en: "Active Appointments", el: "Ενεργά Ραντεβού" },
      thisMonth: { en: "This Month", el: "Αυτός ο Μήνας" },
      upcoming: { en: "Upcoming", el: "Επερχόμενα" },
      next7Days: { en: "Next 7 Days", el: "Επόμενες 7 Ημέρες" },
      tabsCreate: { en: "Create New", el: "Δημιουργία" },
      tabsUpcoming: { en: "View All", el: "Προβολή όλων" },
      createTitle: {
        en: "Create New Appointment",
        el: "Δημιουργία Νέου Ραντεβού",
      },
      createSubtitle: {
        en: "Schedule a new birthday party or event",
        el: "Προγραμματίστε νέο πάρτυ ή εκδήλωση",
      },
      customerName: { en: "Customer Name", el: "Όνομα Πελάτη" },
      customerPlaceholder: {
        en: "Enter customer name",
        el: "Εισάγετε το όνομα πελάτη",
      },
      contactInfo: { en: "Contact Information", el: "Στοιχεία Επικοινωνίας" },
      contactPlaceholder: {
        en: "Phone number or email",
        el: "Τηλέφωνο ή email",
      },
      dateTime: { en: "Date & Time", el: "Ημερομηνία & Ώρα" },
      children: { en: "Children", el: "Παιδιά" },
      adults: { en: "Adults", el: "Ενήλικες" },
      notes: { en: "Additional Notes", el: "Επιπλέον Σημειώσεις" },
      notesPlaceholder: {
        en: "Any special requirements or notes...",
        el: "Ειδικές απαιτήσεις ή σημειώσεις...",
      },
      createButton: { en: "Create Appointment", el: "Δημιουργία Ραντεβού" },
      allAppointments: { en: "All Appointments", el: "Όλα τα Ραντεβού" },
      manageExisting: {
        en: "Manage existing bookings and appointments",
        el: "Διαχείριση υπαρχόντων κρατήσεων και ραντεβού",
      },
      exportList: { en: "Export List", el: "Εξαγωγή Λίστας" },
      emptyTitle: { en: "No appointments yet", el: "Δεν υπάρχουν ραντεβού" },
      emptySubtitle: {
        en: "Start by creating your first appointment",
        el: "Ξεκινήστε δημιουργώντας το πρώτο ραντεβού",
      },
      sendReminder: { en: "Send Reminder", el: "Αποστολή Υπενθύμισης" },
      reminderInWeek: { en: "Reminder in 1w", el: "Υπενθύμιση σε 1εβ" },
      createCta: { en: "Create Appointment", el: "Δημιουργία Ραντεβού" },
      editTitle: { en: "Edit Appointment", el: "Επεξεργασία Ραντεβού" },
      status: {
        confirmed: { en: "Confirmed", el: "Επιβεβαιώθηκε" },
        completed: { en: "Completed", el: "Ολοκληρώθηκε" },
        cancelled: { en: "Cancelled", el: "Ακυρώθηκε" },
      },
    },
    football: {
      title: { en: "Football Bookings", el: "Κρατήσεις Γηπέδων" },
      subtitle: {
        en: "Manage football field reservations",
        el: "Διαχείριση κρατήσεων γηπέδων ποδοσφαίρου",
      },
      tabsCreate: { en: "Create", el: "Δημιουργία" },
      tabsUpcoming: { en: "View All", el: "Προβολή όλων" },
      customerName: { en: "Customer", el: "Πελάτης" },
      contactInfo: { en: "Contact Info", el: "Στοιχεία Επικοινωνίας" },
      contactPlaceholder: { en: "Phone or email", el: "Τηλέφωνο ή email" },
      dateTime: { en: "Date & Time", el: "Ημερομηνία & Ώρα" },
      field: { en: "Field", el: "Γήπεδο" },
      players: { en: "Players", el: "Παίκτες" },
      notes: { en: "Notes", el: "Σημειώσεις" },
      notesPlaceholder: { en: "Notes", el: "Σημειώσεις" },
      createTitle: { en: "Create Booking", el: "Δημιουργία Κράτησης" },
      createButton: { en: "Create", el: "Δημιουργία" },
      upcomingTitle: { en: "Upcoming", el: "Επερχόμενες" },
      none: { en: "No bookings yet", el: "Δεν υπάρχουν κρατήσεις" },
      fieldLabel: { en: "Field", el: "Γήπεδο" },
      editTitle: { en: "Edit Booking", el: "Επεξεργασία Κράτησης" },
      manageExisting: {
        en: "View and update bookings",
        el: "Δείτε και ενημερώστε τις κρατήσεις",
      },
      status: {
        confirmed: { en: "Confirmed", el: "Επιβεβαιώθηκε" },
        completed: { en: "Completed", el: "Ολοκληρώθηκε" },
        cancelled: { en: "Cancelled", el: "Ακυρώθηκε" },
      },
    },
    registers: {
      title: { en: "Register Sessions", el: "Συνεδρίες Ταμείου" },
      subtitle: {
        en: "Daily openings, closings, and cash insights",
        el: "Καθημερινά ανοίγματα, κλείσιμο και συνοπτικά οικονομικά",
      },
      pickDate: { en: "Pick date", el: "Επιλογή ημερομηνίας" },
      allDates: { en: "All", el: "Όλα" },
      totalSessions: { en: "Sessions", el: "Συνεδρίες" },
      openSessions: { en: "Open Today", el: "Ανοιχτές σήμερα" },
      totalDiscounts: { en: "Discounts", el: "Εκπτώσεις" },
      totalTreats: { en: "Treats", el: "Κεράσματα" },
      empty: {
        en: "No register activity for this date",
        el: "Δεν υπάρχουν κινήσεις ταμείου για αυτή την ημερομηνία",
      },
      date: { en: "Date", el: "Ημερομηνία" },
      id: { en: "ID", el: "ID" },
      opened: { en: "Opened", el: "Άνοιξε" },
      closed: { en: "Closed", el: "Έκλεισε" },
      coupons: { en: "Coupons", el: "Κουπόνια" },
      treats: { en: "Treats", el: "Κεράσματα" },
    },
  },
  login: {
    title: { en: "Management System", el: "Σύστημα Διαχείρισης" },
    subtitle: { en: "Sign in to continue", el: "Συνδεθείτε για να συνεχίσετε" },
    usernameLabel: { en: "Username", el: "Όνομα Χρήστη" },
    usernamePlaceholder: {
      en: "Enter username",
      el: "Εισάγετε το όνομα χρήστη",
    },
    passwordLabel: { en: "Password", el: "Κωδικός" },
    passwordPlaceholder: {
      en: "Enter your password",
      el: "Εισάγετε τον κωδικό σας",
    },
    submit: { en: "Sign in", el: "Σύνδεση" },
    loading: { en: "Signing in...", el: "Γίνεται σύνδεση..." },
    success: { en: "Welcome back!", el: "Καλώς ήρθατε!" },
    error: { en: "Invalid credentials", el: "Μη έγκυρα στοιχεία" },
    quickLogin: { en: "Quick login", el: "Γρήγορη σύνδεση" },
    seeded: { en: "Demo users", el: "Χρήστες demo" },
    missingCredentials: {
      en: "Please enter your username and password",
      el: "Παρακαλώ εισάγετε όνομα χρήστη και κωδικό",
    },
  },
  theme: {
    system: { en: "System", el: "Σύστημα" },
    light: { en: "Light", el: "Φωτεινό" },
    dark: { en: "Dark", el: "Σκούρο" },
  },
  date: {
    all: { en: "All", el: "Όλα" },
    today: { en: "Today", el: "Σήμερα" },
    yesterday: { en: "Yesterday", el: "Χθες" },
    last7: { en: "Last 7", el: "Τελευταίες 7" },
    last30: { en: "Last 30", el: "Τελευταίες 30" },
  },
  inventory: {
    lowStock: {
      title: { en: "Low Stock", el: "Χαμηλό Απόθεμα" },
      subtitle: {
        en: "Keep an eye on items nearing depletion.",
        el: "Παρακολουθήστε τα είδη που κοντεύουν να εξαντληθούν.",
      },
      limitPrefix: { en: "Limit:", el: "Όριο:" },
      items: { en: "items", el: "τεμάχια" },
      empty: {
        en: "No products with low stock",
        el: "Δεν υπάρχουν προϊόντα με χαμηλό απόθεμα",
      },
      threshold: { en: "Below threshold", el: "Κάτω από το όριο" },
    },
    low: { en: "low", el: "χαμηλό" },
  },
} as const;

export type TranslationKey = DeepKey<typeof translations>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedTranslation<T extends Record<string, unknown>>(
  obj: T,
  path: string,
  current: Locale
): string | undefined {
  const keys = path.split(".");
  let result: unknown = obj;
  for (const key of keys) {
    if (
      typeof result === "object" &&
      result !== null &&
      key in (result as Record<string, unknown>)
    ) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return;
    }
  }
  if (
    typeof result === "object" &&
    result !== null &&
    current in (result as Record<string, string>)
  ) {
    return (result as Record<string, string>)[current];
  }
  return;
}

export function t(key: TranslationKey): string {
  const currentLocale = get(locale);
  return getNestedTranslation(translations, key, currentLocale) ?? key;
}

// Reactive translator: use as $tt('nav.dashboard') for reactivity on locale change
export const tt = derived(
  locale,
  ($locale) => (key: TranslationKey) =>
    getNestedTranslation(translations, key, $locale) ?? key
);
