import { writable, get } from 'svelte/store';

type Locale = 'en' | 'el';

export const locale = writable<Locale>('en');

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'login.title': 'Sign in',
    'login.placeholder': 'username',
    'login.submit': 'Sign in',
    'nav.orders': 'Orders',
    'nav.dashboard': 'Dashboard',
    'nav.admin': 'Admin',
    'nav.products': 'Products',
    'nav.categories': 'Categories',
    'nav.users': 'Users',
    'nav.appointments': 'Appointments',
    'nav.football': 'Football',
    'nav.logout': 'Logout',
    'orders.newSale': 'New sale',
    'orders.products': 'Products',
    'orders.close': 'Close',
    'orders.submit': 'Submit order',
    'orders.coupon': 'Coupon (-€2)',
    'orders.treat': 'Treat',
    'orders.total': 'Total',
    'orders.subtotal': 'Subtotal',
    'orders.discount': 'Discount',
    'orders.recent': 'Recent orders',
    'table.username': 'Username',
    'table.role': 'Role',
    'table.active': 'Active',
    'table.actions': 'Actions',
    'table.edit': 'Edit',
    'table.deactivate': 'Deactivate',
  },
  el: {
    'login.title': 'Σύνδεση',
    'login.placeholder': 'όνομα χρήστη',
    'login.submit': 'Σύνδεση',
    'nav.orders': 'Παραγγελίες',
    'nav.dashboard': 'Πίνακας',
    'nav.admin': 'Διαχείριση',
    'nav.products': 'Προϊόντα',
    'nav.categories': 'Κατηγορίες',
    'nav.users': 'Χρήστες',
    'nav.appointments': 'Ραντεβού',
    'nav.football': 'Ποδόσφαιρο',
    'nav.logout': 'Αποσύνδεση',
    'orders.newSale': 'Νέα πώληση',
    'orders.products': 'Προϊόντα',
    'orders.close': 'Κλείσιμο',
    'orders.submit': 'Καταχώρηση',
    'orders.coupon': 'Κουπόνι (-€2)',
    'orders.treat': 'Κέρασμα',
    'orders.total': 'Σύνολο',
    'orders.subtotal': 'Μερικό σύνολο',
    'orders.discount': 'Έκπτωση',
    'orders.recent': 'Πρόσφατες παραγγελίες',
    'table.username': 'Όνομα χρήστη',
    'table.role': 'Ρόλος',
    'table.active': 'Ενεργός',
    'table.actions': 'Ενέργειες',
    'table.edit': 'Επεξεργασία',
    'table.deactivate': 'Απενεργοποίηση',
  },
};

export function t(key: string): string {
  const current = get(locale);
  return translations[current][key] ?? key;
}


