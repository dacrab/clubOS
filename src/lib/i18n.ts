import { writable, get } from 'svelte/store';

type Locale = 'en' | 'el';

export const locale = writable<Locale>('en');

const translations: Record<Locale, Record<string, string>> = {
  en: {
    'login.title': 'Sign in',
    'login.placeholder': 'code (local-part-password)',
    'login.submit': 'Sign in',
    'nav.orders': 'Orders',
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
  },
  el: {
    'login.title': 'Σύνδεση',
    'login.placeholder': 'κωδικός (τοπικό-μέρος-κωδικός)',
    'login.submit': 'Σύνδεση',
    'nav.orders': 'Παραγγελίες',
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
  },
};

export function t(key: string): string {
  const current = get(locale);
  return translations[current][key] ?? key;
}


