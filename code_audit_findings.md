# Code Audit Findings

## 1) MAGIC NUMBERS (hardcoded numeric literals that should be constants)

**src/lib/constants/index.ts:36**
- Line 36: `LOW: 10` - hardcoded low stock threshold, but should reference settings.low_stock_threshold

**src/lib/components/features/new-sale-dialog.svelte:54-58**
- Line 58: `200` - hardcoded debounce delay for search (200ms)

**src/lib/components/features/booking-page.svelte:97**
- Line 97: `120` - hardcoded buffer for football bookings instead of using configurable setting

**src/lib/components/features/new-sale-dialog.svelte:220**
- Line 220: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` - hardcoded grid breakpoints

**src/routes/onboarding/+page.svelte:115**
- Line 115: `2000` - hardcoded timeout delay (2 seconds) for redirect

**src/lib/utils/receipt.ts:21**
- Line 21: `"width=300,height=600"` - hardcoded window dimensions for print

**src/routes/(app)/admin/+page.svelte:95-99**
- Line 96: `chartHeight = 240` - hardcoded chart height
- Line 97: `chartPadding = { top: 8, right: 8, bottom: 32, left: 56 }` - hardcoded padding values

**src/routes/(app)/admin/registers/+page.svelte:43-44**
- Line 43-44: Button state toggle based on expanded state (cosmetic, not structural magic number)

---

## 2) ARTIFICIAL/FAKE LOADING STATES (setTimeout used to simulate loading instead of real async)

**src/routes/onboarding/+page.svelte:115**
- Line 115: `setTimeout(() => { window.location.href = "/admin"; }, 2000);` - FAKE loading state to simulate completion before redirect (should redirect immediately or await actual completion)

---

## 3) HARDCODED STRINGS THAT SHOULD BE CONFIG/I18N

**src/lib/config/auth.ts:13-56**
- Lines 13-56: Plan names ("Basic", "Pro", "Enterprise") and prices ("€29", "€59", "€149") are hardcoded. Prices should come from Stripe/config, not hardcoded.

**src/lib/components/layout/public-header.svelte:24-25**
- Lines 24-25: "English" and "Ελληνικά" are hardcoded strings instead of using i18n keys

**src/routes/onboarding/+page.svelte:33-40**
- Lines 33-40: Timezone names ("Athens (GMT+2/+3)", "London (GMT+0/+1)", etc.) are hardcoded strings

**src/routes/onboarding/+page.svelte:42-47**
- Lines 42-47: Staff count labels ("1-5", "6-15", etc.) are hardcoded

**src/lib/utils/receipt.ts:39**
- Line 39: `font-family:monospace;font-size:12px` - hardcoded CSS in receipt generation should be externalized

---

## 4) PLACES WHERE A FEATURE IS FAKED RATHER THAN PROPERLY IMPLEMENTED

**src/lib/components/features/new-sale-dialog.svelte:314**
- Line 314: `"each" in unit price display hardcoded instead of pulling from settings/i18n

**src/routes/(app)/admin/+page.svelte:100-142**
- Lines 100-142: Chart is manually rendered with SVG instead of using a real charting library (rickshaw, chart.js, etc.)

**src/routes/onboarding/+page.svelte:128-136**
- Lines 128-136: "Completed" state with fake loading indicator before redirect - shows success but hasn't actually finished setup

**src/lib/components/features/booking-page.svelte:78-79**
- Lines 78-79: `pad = (n: number) => String(n).padStart(2, "0")` and manual datetime string construction instead of using proper date formatting utilities

**src/lib/utils/receipt.ts:60-62**
- Lines 60-62: Print receipt opens new window and writes HTML directly - should use a proper PDF library or print CSS

---

## 5) PLACES THAT WOULD BREAK IF YOU ADDED NEW ROLE/BOOKING TYPE/CURRENCY/PLAN TIER

**src/hooks.server.ts:60-62**
- Lines 60-62: Hardcoded role checks: `if (path.startsWith("/admin") && !isAdmin)` and `if (path.startsWith("/secretary") && !(isAdmin || role === "manager"))` - would need updates for new roles

**src/lib/components/layout/sidebar.svelte:25-36**
- Lines 25-36: `navConfig: Record<MemberRole, NavItem[]>` - requires manual update for each new role added

**src/routes/(app)/bookings/[type]/+page.svelte:8-12**
- Lines 8-12: `icons` object has hardcoded types, would break if new booking types added without updating icons map

**src/lib/config/auth.ts:9-57**
- Lines 9-57: PLANS array is hardcoded - adding new tier requires code change, not config

**src/lib/config/settings.ts:36-63**
- Lines 36-63: DEFAULT_SETTINGS hardcoded with specific booking types (birthday, football) - would break with new booking types

**src/lib/constants/index.ts:15-19**
- Lines 15-19: BOOKING_TYPE only supports "birthday" and "football" - hardcoded enum

**src/lib/constants/index.ts:24-29**
- Lines 24-29: USER_ROLE hardcoded to 4 roles - would need code change for new role

**src/lib/utils/format.ts:4 & 28-30**
- Lines 4 & 28-30: CurrencyCodeType and CURRENCY_SYMBOLS - missing currencies (GBP missing from type union on line 4 but present in symbols on line 28), would break if adding new currencies inconsistently

**src/lib/components/features/plan-selector.svelte:16**
- Line 16: `const icons = { Building2, Users, Zap }` - hardcoded icon mapping, would need update for new plans

---

## 6) DEAD FEATURE FLAGS OR COMMENTED-OUT CODE

**src/lib/components/features/booking-page.svelte:72**
- Line 72: `// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive state, just a temp computation value` - comment indicates disabled linting rule, suggests suboptimal pattern

**src/routes/(app)/bookings/[type]/+page.svelte:15**
- Line 15: `// data.type is BookingType (includes event/other), cast to BookingTypeValue for BookingPage` - comment indicates type mismatch hack (line 16 casts to BookingTypeValue)

---

## 7) PLACES WHERE DATA IS HARDCODED THAT SHOULD COME FROM DB/CONFIG

**src/lib/config/auth.ts:13-56**
- Lines 13-56: PLANS with priceIds ("price_1Sc4wV9fJvoeQ48O2RI2I9bl", etc.) are hardcoded - should be fetched from Stripe API or stored in DB

**src/lib/config/settings.ts:36-63**
- Lines 36-63: DEFAULT_SETTINGS hardcoded values (e.g., `football_fields_count: 2`, `birthday_default_hour: 15`) should come from DB or tenant-specific config

**src/routes/onboarding/+page.svelte:33-40**
- Lines 33-40: Timezone list hardcoded - should come from DB/config or Intl API

**src/lib/utils/format.ts:2-4**
- Lines 2-4: CurrencyCodeType union restricted to 3 currencies ("EUR" | "USD" | "GBP") - line 28-30 lists more (CHF, PLN, CZK, SEK, NOK, DKK) - mismatch indicates incomplete data model

**src/lib/components/features/booking-page.svelte:50 & 69**
- Lines 50 & 69: Default football player count (`settings.current.football_default_players`) used as fallback when should validate it exists

**src/lib/components/features/new-sale-dialog.svelte:41**
- Line 41: `COUPON_VALUE = $derived(globalSettings.current.coupons_value)` - relies on settings being loaded; no validation if undefined

**src/lib/services/db.ts** (not fully shown, but referenced)
- DB service functions referenced but not shown - likely missing error handling for missing config data

**src/routes/(app)/admin/settings/+page.svelte:21-29**
- Lines 21-29: THEME_OPTIONS and LANGUAGE_OPTIONS hardcoded - should be extensible from config

---

## SUMMARY TABLE

| Issue Type | Count | Severity |
|-----------|-------|----------|
| Magic Numbers | 8 | Medium |
| Fake Loading States | 1 | Low |
| Hardcoded Strings | 5+ | Medium |
| Faked Features | 5 | Medium |
| Breakage Risk (New Role/Type/Currency) | 9 | High |
| Dead Code/Comments | 2 | Low |
| Data Should Be Dynamic | 8+ | High |

**Total Issues Found: 38+**
