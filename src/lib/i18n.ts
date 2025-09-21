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
    products: { en: "Products", el: "Προϊόντα" },
    categories: { en: "Categories", el: "Κατηγορίες" },
    users: { en: "Users", el: "Χρήστες" },
    appointments: { en: "Appointments", el: "Ραντεβού" },
    football: { en: "Football", el: "Γήπεδα Ποδοσφαίρου" },
    logout: { en: "Logout", el: "Αποσύνδεση" },
    reports: { en: "Reports", el: "Αναφορές" },
    registers: { en: "Registers", el: "Ταμειακές" },
    bookings: { en: "Bookings", el: "Κρατήσεις" },
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
    close: { en: "Close", el: "Κλείσιμο" },
    submit: { en: "Submit Order", el: "Υποβολή Παραγγελίας" },
    actions: { en: "Actions", el: "Ενέργειες" },
    viewDetails: { en: "View Details", el: "Προβολή Λεπτομερειών" },
    printReceipt: { en: "Print Receipt", el: "Εκτύπωση Απόδειξης" },
    none: {
      en: "No recent orders to show.",
      el: "Δεν υπάρχουν πρόσφατες πωλήσεις για εμφάνιση.",
    },
  },
  dashboard: {
    admin: {
      title: { en: "Admin Dashboard", el: "Πίνακας Ελέγχου Διαχειριστή" },
      revenue: { en: "Today's Revenue", el: "Σημερινά Έσοδα" },
      manageRegisters: { en: "Manage Registers", el: "Διαχείριση Ταμειακών" },
      closeRegister: {
        en: "Close Current Register",
        el: "Κλείσιμο Τρέχουσας Ταμειακής",
      },
      closing: { en: "Closing...", el: "Κλείσιμο..." },
    },
    staff: {
      title: { en: "Staff Dashboard", el: "Πίνακας Ελέγχου Προσωπικού" },
      pos: { en: "Point of Sale", el: "Σημείο Πώλησης" },
      posDesc: {
        en: "Process customer transactions",
        el: "Επεξεργασία συναλλαγών πελατών",
      },
      quickActions: {
        en: "Fast actions for daily work",
        el: "Γρήγορες ενέργειες για την καθημερινή εργασία",
      },
      register: { en: "Register", el: "Ταμειακή" },
      closeRegister: { en: "Close Register", el: "Κλείσιμο Ταμειακής" },
      closePromptTitle: { en: "Close register", el: "Κλείσιμο ταμειακής" },
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
  },
  pages: {
    products: {
      title: { en: "All Products", el: "Όλα τα Προϊόντα" },
      add: { en: "Add Product", el: "Προσθήκη Προϊόντος" },
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
  },
  theme: {
    system: { en: "System", el: "Σύστημα" },
    light: { en: "Light", el: "Φωτεινό" },
    dark: { en: "Dark", el: "Σκούρο" },
  },
  inventory: {
    lowStock: {
      title: { en: "Low Stock", el: "Χαμηλό Απόθεμα" },
      limitPrefix: { en: "Limit:", el: "Όριο:" },
      items: { en: "items", el: "τεμάχια" },
      empty: {
        en: "No products with low stock",
        el: "Δεν υπάρχουν προϊόντα με χαμηλό απόθεμα",
      },
    },
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
