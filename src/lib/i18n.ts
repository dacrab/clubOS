<script lang="ts">
  import { writable } from 'svelte/store';
  import { get } from 'svelte/store';

  type Locale = 'en' | 'el';

  export const locale = writable<Locale>('en');

  // Helper type for deeply nested keys
  type DeepKey<T> = T extends object ? {
    [K in keyof T]-?: K extends string | number ?
      `${K}` | `${K}.${DeepKey<T[K]>}`
      : never
  }[keyof T] : '';

  const translations = {
    nav: {
      dashboard: { en: 'Dashboard', el: 'Πίνακας Ελέγχου' },
      orders: { en: 'Orders', el: 'Παραγγελίες' },
      admin: { en: 'Admin', el: 'Διαχείριση' },
      products: { en: 'Products', el: 'Προϊόντα' },
      categories: { en: 'Categories', el: 'Κατηγορίες' },
      users: { en: 'Users', el: 'Χρήστες' },
      appointments: { en: 'Appointments', el: 'Ραντεβού' },
      football: { en: 'Football', el: 'Γήπεδα Ποδοσφαίρου' },
      logout: { en: 'Logout', el: 'Αποσύνδεση' },
      reports: { en: 'Reports', el: 'Αναφορές' },
      registers: { en: 'Registers', el: 'Ταμειακές' },
      bookings: { en: 'Bookings', el: 'Κρατήσεις' },
    },
    orders: {
      recent: { en: 'Recent Orders', el: 'Πρόσφατες Παραγγελίες' },
      new: { en: 'New Sale', el: 'Νέα Πώληση' },
      search: { en: 'Search products...', el: 'Αναζήτηση προϊόντων...' },
      cart: { en: 'Cart', el: 'Καλάθι' },
      empty: { en: 'Empty', el: 'Άδειο' },
      subtotal: { en: 'Subtotal', el: 'Μερικό Σύνολο' },
      coupon: { en: 'Coupon', el: 'Κουπόνι' },
      treat: { en: 'Treat', el: 'Κέρασμα' },
      clear: { en: 'Clear', el: 'Καθάρισμα' },
      close: { en: 'Close', el: 'Κλείσιμο' },
      submit: { en: 'Submit Order', el: 'Υποβολή Παραγγελίας' },
      actions: { en: 'Actions', el: 'Ενέργειες' },
      viewDetails: { en: 'View Details', el: 'Προβολή Λεπτομερειών' },
      printReceipt: { en: 'Print Receipt', el: 'Εκτύπωση Απόδειξης' },
    },
    dashboard: {
      admin: {
        title: { en: 'Admin Dashboard', el: 'Πίνακας Ελέγχου Διαχειριστή' },
        revenue: { en: 'Today\'s Revenue', el: 'Σημερινά Έσοδα' },
        manageRegisters: { en: 'Manage Registers', el: 'Διαχείριση Ταμειακών' },
        closeRegister: { en: 'Close Current Register', el: 'Κλείσιμο Τρέχουσας Ταμειακής' },
        closing: { en: 'Closing...', el: 'Κλείσιμο...' },
      },
      staff: {
        title: { en: 'Staff Dashboard', el: 'Πίνακας Ελέγχου Προσωπικού' },
        pos: { en: 'Point of Sale', el: 'Σημείο Πώλησης' },
        register: { en: 'Register', el: 'Ταμειακή' },
        closeRegister: { en: 'Close Register', el: 'Κλείσιμο Ταμειακής' },
      },
      secretary: {
        title: { en: 'Secretary Dashboard', el: 'Πίνακας Ελέγχου Γραμματείας' },
        appointmentsDesc: { en: 'Manage birthday parties and events.', el: 'Διαχείριση παιδικών πάρτυ και εκδηλώσεων.' },
        footballDesc: { en: 'Manage football field reservations.', el: 'Διαχείριση κρατήσεων γηπέδων ποδοσφαίρου.' },
        manage: { en: 'Manage', el: 'Διαχείριση' },
      }
    },
    common: {
      actions: { en: 'Actions', el: 'Ενέργειες' },
      edit: { en: 'Edit', el: 'Επεξεργασία' },
      delete: { en: 'Delete', el: 'Διαγραφή' },
      save: { en: 'Save', el: 'Αποθήκευση' },
      add: { en: 'Add', el: 'Προσθήκη' },
      cancel: { en: 'Cancel', el: 'Ακύρωση' },
      name: { en: 'Name', el: 'Όνομα' },
      price: { en: 'Price', el: 'Τιμή' },
      stock: { en: 'Stock', el: 'Απόθεμα' },
      image: { en: 'Image', el: 'Εικόνα' },
      category: { en: 'Category', el: 'Κατηγορία' },
      role: { en: 'Role', el: 'Ρόλος' },
      active: { en: 'Active', el: 'Ενεργός' },
      password: { en: 'Password', el: 'Κωδικός' },
      username: { en: 'Username', el: 'Όνομα Χρήστη' },
    },
    pages: {
      products: {
        title: { en: 'All Products', el: 'Όλα τα Προϊόντα' },
        add: { en: 'Add Product', el: 'Προσθήκη Προϊόντος' },
      },
      categories: {
        title: { en: 'Product Categories', el: 'Κατηγορίες Προϊόντων' },
        add: { en: 'Add Category', el: 'Προσθήκη Κατηγορίας' },
        placeholder: { en: 'Category name', el: 'Όνομα κατηγορίας' },
      },
      users: {
        title: { en: 'Users', el: 'Χρήστες' },
        add: { en: 'Create User', el: 'Δημιουργία Χρήστη' },
        edit: { en: 'Edit User', el: 'Επεξεργασία Χρήστη' },
      }
    }
  };

  const T = translations;
  type TranslationKey = DeepKey<typeof T>;

  function getNestedTranslation(obj: any, path: string, locale: Locale): string | undefined {
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
      result = result[key];
      if (result === undefined) return undefined;
    }
    return result[locale];
  }

  export function t(key: TranslationKey): string {
    const currentLocale = get(locale);
    return getNestedTranslation(translations, key, currentLocale) ?? key;
  }
</script>


