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
	admin: {
		activeUsers: { en: "Active Users", el: "Ενεργοί Χρήστες" },
		overview: {
			en: "Overview of your business",
			el: "Επισκόπηση της επιχείρησής σας",
		},
		pendingTasks: { en: "Pending Tasks", el: "Εκκρεμείς Εργασίες" },
	},
	appointments: {
		activeAppointments: { en: "Active Appointments", el: "Ενεργά Ραντεβού" },
		adults: { en: "Adults", el: "Ενήλικες" },
		allAppointments: { en: "All Appointments", el: "Όλα τα Ραντεβού" },
		children: { en: "Children", el: "Παιδιά" },
		createButton: { en: "Create Appointment", el: "Δημιουργία Ραντεβού" },
		createCta: { en: "Create Appointment", el: "Δημιουργία Ραντεβού" },
		createSubtitle: {
			en: "Schedule a new birthday party or event",
			el: "Προγραμματίστε νέο πάρτυ ή εκδήλωση",
		},
		createTitle: {
			en: "Create New Appointment",
			el: "Δημιουργία Νέου Ραντεβού",
		},
		editTitle: { en: "Edit Appointment", el: "Επεξεργασία Ραντεβού" },
		emptySubtitle: {
			en: "Start by creating your first appointment",
			el: "Ξεκινήστε δημιουργώντας το πρώτο ραντεβού",
		},
		emptyTitle: { en: "No appointments yet", el: "Δεν υπάρχουν ραντεβού" },
		exportList: { en: "Export List", el: "Εξαγωγή Λίστας" },
		manageExisting: {
			en: "Manage existing bookings and appointments",
			el: "Διαχείριση υπαρχόντων κρατήσεων και ραντεβού",
		},
		next7Days: { en: "Next 7 Days", el: "Επόμενες 7 Ημέρες" },
		reminderInWeek: { en: "Reminder in 1w", el: "Υπενθύμιση σε 1εβ" },
		sendReminder: { en: "Send Reminder", el: "Αποστολή Υπενθύμισης" },
		status: {
			cancelled: { en: "Cancelled", el: "Ακυρώθηκε" },
			completed: { en: "Completed", el: "Ολοκληρώθηκε" },
			confirmed: { en: "Confirmed", el: "Επιβεβαιώθηκε" },
		},
		subtitle: {
			en: "Manage birthday parties and events",
			el: "Διαχείριση παιδικών πάρτυ και εκδηλώσεων",
		},
		tabsCreate: { en: "Create New", el: "Δημιουργία" },
		tabsUpcoming: { en: "View All", el: "Προβολή όλων" },
		thisMonth: { en: "This Month", el: "Αυτός ο Μήνας" },
		title: { en: "Appointments", el: "Ραντεβού" },
		totalBookings: { en: "Total Bookings", el: "Συνολικές Κρατήσεις" },
		upcoming: { en: "Upcoming", el: "Επερχόμενα" },
	},
	categories: {
		add: { en: "Add Category", el: "Προσθήκη Κατηγορίας" },
		empty: {
			description: {
				en: "Create categories to organize your products",
				el: "Δημιουργήστε κατηγορίες για να οργανώσετε τα προϊόντα σας",
			},
			title: { en: "No categories yet", el: "Δεν υπάρχουν κατηγορίες ακόμα" },
		},
		placeholder: { en: "Category name", el: "Όνομα κατηγορίας" },
		title: { en: "Product Categories", el: "Κατηγορίες Προϊόντων" },
	},
	common: {
		actions: { en: "Actions", el: "Ενέργειες" },
		add: { en: "Add", el: "Προσθήκη" },
		active: { en: "Active", el: "Ενεργός" },
		cancel: { en: "Cancel", el: "Ακύρωση" },
		category: { en: "Category", el: "Κατηγορία" },
		changeImage: { en: "Change Image", el: "Αλλαγή Εικόνας" },
		changeLanguage: { en: "Change language", el: "Αλλαγή γλώσσας" },
		clear: { en: "Clear", el: "Καθαρισμός" },
		close: { en: "Close", el: "Κλείσιμο" },
		collapse: { en: "Collapse", el: "Σύμπτυξη" },
		contactInfo: { en: "Contact Information", el: "Στοιχεία Επικοινωνίας" },
		contactPlaceholder: {
			en: "Phone number or email",
			el: "Τηλέφωνο ή email",
		},
		customerName: { en: "Customer Name", el: "Όνομα Πελάτη" },
		customerPlaceholder: {
			en: "Enter customer name",
			el: "Εισάγετε το όνομα πελάτη",
		},
		dateTime: { en: "Date & Time", el: "Ημερομηνία & Ώρα" },
		delete: { en: "Delete", el: "Διαγραφή" },
		description: { en: "Description", el: "Περιγραφή" },
		details: { en: "Details", el: "Λεπτομέρειες" },
		edit: { en: "Edit", el: "Επεξεργασία" },
		emptyState: {
			title: { en: "No items found", el: "Δεν βρέθηκαν στοιχεία" },
			description: {
				en: "Get started by adding your first item",
				el: "Ξεκινήστε προσθέτοντας το πρώτο σας στοιχείο",
			},
		},
		facility: { en: "Facility", el: "Εγκατάσταση" },
		image: { en: "Image", el: "Εικόνα" },
		name: { en: "Name", el: "Όνομα" },
		notes: { en: "Notes", el: "Σημειώσεις" },
		notesPlaceholder: {
			en: "Any special requirements or notes...",
			el: "Ειδικές απαιτήσεις ή σημειώσεις...",
		},
		open: { en: "Open", el: "Ανοιχτό" },
		operatingSuite: { en: "Operating Suite", el: "Σουίτα Λειτουργιών" },
		parent: { en: "Parent", el: "Γονική" },
		password: { en: "Password", el: "Κωδικός" },
		price: { en: "Price", el: "Τιμή" },
		print: { en: "Print", el: "Εκτύπωση" },
		quickSettings: { en: "Quick settings", el: "Γρήγορες ρυθμίσεις" },
		receipt: { en: "Receipt", el: "Απόδειξη" },
		role: { en: "Role", el: "Ρόλος" },
		save: { en: "Save", el: "Αποθήκευση" },
		status: { en: "Status", el: "Κατάσταση" },
		stock: { en: "Stock", el: "Απόθεμα" },
		tagline: {
			en: "Control centre for your club operations.",
			el: "Κέντρο ελέγχου για τις λειτουργίες του συλλόγου σας.",
		},
		toggleSidebar: {
			en: "Toggle sidebar",
			el: "Άνοιγμα/Κλείσιμο πλαϊνού μενού",
		},
		toggleTheme: { en: "Toggle theme", el: "Εναλλαγή θέματος" },
		unlimited: { en: "Unlimited", el: "Απεριόριστο" },
		uploadImage: { en: "Upload Image", el: "Μεταφόρτωση Εικόνας" },
		username: { en: "Username", el: "Όνομα Χρήστη" },
		viewAll: { en: "View All", el: "Προβολή όλων" },
	},
	dashboard: {
		admin: {
			closing: { en: "Closing...", el: "Κλείσιμο..." },
			closeRegister: {
				en: "Close Current Register",
				el: "Κλείσιμο Ταμείου",
			},
			manageRegisters: { en: "Manage Registers", el: "Διαχείριση Ταμείων" },
			revenue: { en: "Today's Revenue", el: "Σημερινά Έσοδα" },
			title: { en: "Admin Dashboard", el: "Πίνακας Ελέγχου Διαχειριστή" },
		},
		loading: { en: "Loading dashboard...", el: "Φόρτωση πίνακα..." },
		secretary: {
			appointmentsDesc: {
				en: "Manage birthday parties and events.",
				el: "Διαχείριση παιδικών πάρτυ και εκδηλώσεων.",
			},
			footballDesc: {
				en: "Manage football field reservations.",
				el: "Διαχείριση κρατήσεων γηπέδων ποδοσφαίρου.",
			},
			manage: { en: "Manage", el: "Διαχείριση" },
			title: { en: "Secretary Dashboard", el: "Πίνακας Ελέγχου Γραμματείας" },
		},
		staff: {
			closePromptDesc: {
				en: "Please enter your name (required) and optional notes before closing.",
				el: "Παρακαλώ εισάγετε το όνομά σας (υποχρεωτικό) και προαιρετικές σημειώσεις πριν το κλείσιμο.",
			},
			closePromptTitle: { en: "Close register", el: "Κλείσιμο ταμείου" },
			closeRegister: { en: "Close Register", el: "Κλείσιμο Ταμείου" },
			confirmClose: { en: "Confirm Close", el: "Επιβεβαίωση Κλεισίματος" },
			optional: { en: "Optional", el: "Προαιρετικό" },
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
			required: { en: "Required", el: "Υποχρεωτικό" },
			title: { en: "Staff Dashboard", el: "Πίνακας Ελέγχου Προσωπικού" },
		},
	},
	date: {
		all: { en: "All", el: "Όλα" },
		last30: { en: "Last 30", el: "Τελευταίες 30" },
		last7: { en: "Last 7", el: "Τελευταίες 7" },
		placeholder: { en: "Select date", el: "Επιλέξτε ημερομηνία" },
		placeholderShort: { en: "dd-mm-yy", el: "ηη-μμ-εε" },
		rangePlaceholderEnd: { en: "End date", el: "Ημ/νία λήξης" },
		rangePlaceholderStart: { en: "Start date", el: "Ημ/νία αρχής" },
		today: { en: "Today", el: "Σήμερα" },
		yesterday: { en: "Yesterday", el: "Χθες" },
	},
	errors: {
		generic: {
			en: "Something went wrong while loading this page.",
			el: "Κάτι πήγε στραβά κατά τη φόρτωση της σελίδας.",
		},
		goHome: { en: "Go to home", el: "Μετάβαση στην αρχική" },
		notFound: {
			description: {
				en: "The page you are looking for doesn't exist.",
				el: "Η σελίδα που αναζητάτε δεν υπάρχει.",
			},
			title: { en: "Page not found", el: "Η σελίδα δεν βρέθηκε" },
		},
	},
	football: {
		contactInfo: { en: "Contact Info", el: "Στοιχεία Επικοινωνίας" },
		contactPlaceholder: { en: "Phone or email", el: "Τηλέφωνο ή email" },
		createButton: { en: "Create", el: "Δημιουργία" },
		createTitle: { en: "Create Booking", el: "Δημιουργία Κράτησης" },
		customerName: { en: "Customer", el: "Πελάτης" },
		dateTime: { en: "Date & Time", el: "Ημερομηνία & Ώρα" },
		editTitle: { en: "Edit Booking", el: "Επεξεργασία Κράτησης" },
		empty: {
			description: {
				en: "Create your first booking to get started",
				el: "Δημιουργήστε την πρώτη σας κράτηση για να ξεκινήσετε",
			},
			title: { en: "No bookings yet", el: "Δεν υπάρχουν κρατήσεις ακόμα" },
		},
		field: { en: "Field", el: "Γήπεδο" },
		fieldLabel: { en: "Field", el: "Γήπεδο" },
		manageExisting: {
			en: "View and update bookings",
			el: "Δείτε και ενημερώστε τις κρατήσεις",
		},
		none: { en: "No bookings yet", el: "Δεν υπάρχουν κρατήσεις" },
		notes: { en: "Notes", el: "Σημειώσεις" },
		notesPlaceholder: { en: "Notes", el: "Σημειώσεις" },
		players: { en: "Players", el: "Παίκτες" },
		status: {
			cancelled: { en: "Cancelled", el: "Ακυρώθηκε" },
			completed: { en: "Completed", el: "Ολοκληρώθηκε" },
			confirmed: { en: "Confirmed", el: "Επιβεβαιώθηκε" },
		},
		subtitle: {
			en: "Manage football field reservations",
			el: "Διαχείριση κρατήσεων γηπέδων ποδοσφαίρου",
		},
		tabsCreate: { en: "Create", el: "Δημιουργία" },
		tabsUpcoming: { en: "View All", el: "Προβολή όλων" },
		title: { en: "Football Bookings", el: "Κρατήσεις Γηπέδων" },
		upcomingTitle: { en: "Upcoming", el: "Επερχόμενες" },
	},
	inventory: {
		low: { en: "low", el: "χαμηλό" },
		lowStock: {
			empty: {
				en: "No products with low stock",
				el: "Δεν υπάρχουν προϊόντα με χαμηλό απόθεμα",
			},
			items: { en: "items", el: "τεμάχια" },
			limitPrefix: { en: "Limit:", el: "Όριο:" },
			subtitle: {
				en: "Keep an eye on items nearing depletion.",
				el: "Παρακολουθήστε τα είδη που κοντεύουν να εξαντληθούν.",
			},
			threshold: { en: "Below threshold", el: "Κάτω από το όριο" },
			title: { en: "Low Stock", el: "Χαμηλό Απόθεμα" },
		},
	},
	login: {
		emailLabel: { en: "Email", el: "Email" },
		emailPlaceholder: { en: "Enter your email", el: "Εισάγετε το email σας" },
		enterEmailFirst: {
			en: "Enter your email first",
			el: "Εισάγετε πρώτα το email σας",
		},
		error: { en: "Invalid credentials", el: "Μη έγκυρα στοιχεία" },
		forgotPassword: { en: "Forgot password?", el: "Ξεχάσατε τον κωδικό;" },
		loading: { en: "Signing in...", el: "Γίνεται σύνδεση..." },
		missingCredentials: {
			en: "Please enter your email and password",
			el: "Παρακαλώ εισάγετε email και κωδικό",
		},
		passwordLabel: { en: "Password", el: "Κωδικός" },
		passwordPlaceholder: {
			en: "Enter your password",
			el: "Εισάγετε τον κωδικό σας",
		},
		quickLogin: { en: "Quick login", el: "Γρήγορη σύνδεση" },
		resetEmailFailed: {
			en: "Failed to send reset email",
			el: "Αποτυχία αποστολής email επαναφοράς",
		},
		resetEmailSent: {
			en: "Password reset email sent",
			el: "Στάλθηκε email επαναφοράς κωδικού",
		},
		seeded: { en: "Demo users", el: "Χρήστες demo" },
		submit: { en: "Sign in", el: "Σύνδεση" },
		success: { en: "Welcome back!", el: "Καλώς ήρθατε!" },
		subtitle: { en: "Sign in to continue", el: "Συνδεθείτε για να συνεχίσετε" },
		title: { en: "Management System", el: "Σύστημα Διαχείρισης" },
	},
	nav: {
		admin: { en: "Admin", el: "Διαχείριση" },
		appointments: { en: "Appointments", el: "Ραντεβού" },
		bookings: { en: "Bookings", el: "Κρατήσεις" },
		categories: { en: "Categories", el: "Κατηγορίες" },
		dashboard: { en: "Dashboard", el: "Πίνακας Ελέγχου" },
		football: { en: "Football", el: "Γήπεδα Ποδοσφαίρου" },
		logout: { en: "Logout", el: "Αποσύνδεση" },
		orders: { en: "Orders", el: "Παραγγελίες" },
		overview: { en: "Overview", el: "Επισκόπηση" },
		products: { en: "Products", el: "Προϊόντα" },
		registers: { en: "Registers", el: "Ταμεία" },
		reports: { en: "Reports", el: "Αναφορές" },
		settings: { en: "Settings", el: "Ρυθμίσεις" },
		users: { en: "Users", el: "Χρήστες" },
	},
	orders: {
		addProductsHint: {
			en: "Add some products to get started",
			el: "Προσθέστε προϊόντα για να ξεκινήσετε",
		},
		cart: { en: "Cart", el: "Καλάθι" },
		cartSubtitle: {
			en: "Review items, mark treats, apply coupons.",
			el: "Ελέγξτε είδη, ορίστε κεράσματα, εφαρμόστε κουπόνια.",
		},
		cash: { en: "Cash", el: "Μετρητά" },
		coupon: { en: "Coupon", el: "Κουπόνι" },
		coupons: { en: "Coupons", el: "Κουπόνια" },
		couponsHint: {
			en: "Every coupon deducts €2 from the total.",
			el: "Κάθε κουπόνι αφαιρεί €2 από το σύνολο.",
		},
		decrementCoupon: { en: "Remove coupon", el: "Αφαίρεση κουπονιού" },
		discount: { en: "Discount", el: "Έκπτωση" },
		empty: { en: "Empty", el: "Άδειο" },
		emptyCart: { en: "Your cart is empty", el: "Το καλάθι σας είναι άδειο" },
		free: { en: "Free", el: "Δωρεάν" },
		incrementCoupon: { en: "Add coupon", el: "Προσθήκη κουπονιού" },
		itemsHeader: { en: "Items", el: "Είδη" },
		itemsWord: { en: "items", el: "είδη" },
		latest: { en: "Latest activity", el: "Τελευταίες κινήσεις" },
		list: {
			date: { en: "Date", el: "Ημερομηνία" },
			empty: {
				description: {
					en: "No orders found for the selected date range",
					el: "Δεν βρέθηκαν παραγγελίες για την επιλεγμένη χρονική περίοδο",
				},
				title: { en: "No orders found", el: "Δεν βρέθηκαν παραγγελίες" },
			},
			title: { en: "All Orders", el: "Όλες οι Παραγγελίες" },
		},
		markTreat: { en: "Mark treat", el: "Σήμανση κεράσματος" },
		menuFallback: {
			en: "Tap to add products to the ticket.",
			el: "Πατήστε για προσθήκη.",
		},
		menuSubtitle: {
			en: "Tap to add products to the ticket.",
			el: "Πατήστε για προσθήκη.",
		},
		new: { en: "New Sale", el: "Νέα Πώληση" },
		newSalesSubtitle: {
			en: "Filter categories, mark treats, and apply coupons in one flow.",
			el: "Φιλτράρετε κατηγορίες, ορίστε κεράσματα και εφαρμόστε κουπόνια σε μία ροή.",
		},
		none: {
			en: "No recent orders to show.",
			el: "Δεν υπάρχουν πρόσφατες πωλήσεις για εμφάνιση.",
		},
		orderLabel: { en: "Order", el: "Παραγγελία" },
		paymentLabel: { en: "Payment", el: "Πληρωμή" },
		recent: { en: "Recent Orders", el: "Πρόσφατες Παραγγελίες" },
		removeItem: { en: "Remove item", el: "Αφαίρεση είδους" },
		search: { en: "Search products...", el: "Αναζήτηση προϊόντων..." },
		subtotal: { en: "Subtotal", el: "Μερικό Σύνολο" },
		summaryHint: {
			en: "Session syncs automatically when you submit.",
			el: "Η συνεδρία ενημερώνεται αυτόματα με την υποβολή.",
		},
		submit: { en: "Submit Order", el: "Υποβολή Παραγγελίας" },
		toast: {
			error: {
				en: "Failed to create order",
				el: "Αποτυχία δημιουργίας παραγγελίας",
			},
			success: { en: "Order created", el: "Η παραγγελία δημιουργήθηκε" },
		},
		total: { en: "Total", el: "Σύνολο" },
		treat: { en: "Treat", el: "Κέρασμα" },
		treatsWord: { en: "treats", el: "κεράσματα" },
		availableProducts: { en: "Available Products", el: "Διαθέσιμα Προϊόντα" },
	},
	pos: {
		latest: { en: "Latest", el: "Τελευταία" },
		products: { en: "Products", el: "Προϊόντα" },
		subtitle: {
			en: "Process sales and manage transactions",
			el: "Επεξεργασία πωλήσεων και διαχείριση συναλλαγών",
		},
		title: { en: "Point of Sale", el: "Σημείο Πώλησης" },
		todaySales: { en: "Today's Sales", el: "Σημερινές Πωλήσεις" },
		transactions: { en: "Transactions", el: "Συναλλαγές" },
	},
	products: {
		add: { en: "Add Product", el: "Προσθήκη Προϊόντος" },
		empty: {
			description: {
				en: "Add products to start managing your inventory",
				el: "Προσθέστε προϊόντα για να ξεκινήσετε τη διαχείριση του αποθέματος",
			},
			title: { en: "No products yet", el: "Δεν υπάρχουν προϊόντα ακόμα" },
		},
		manageCategories: {
			en: "Manage Categories",
			el: "Διαχείριση Κατηγοριών",
		},
		selectCategory: { en: "Select category", el: "Επιλέξτε κατηγορία" },
		title: { en: "All Products", el: "Όλα τα Προϊόντα" },
	},
	registers: {
		allDates: { en: "All", el: "Όλα" },
		closed: { en: "Closed", el: "Έκλεισε" },
		coupons: { en: "Coupons", el: "Κουπόνια" },
		date: { en: "Date", el: "Ημερομηνία" },
		empty: {
			en: "No register activity for this date",
			el: "Δεν υπάρχουν κινήσεις ταμείου για αυτή την ημερομηνία",
		},
		id: { en: "ID", el: "ID" },
		openSessions: { en: "Open Today", el: "Ανοιχτές σήμερα" },
		opened: { en: "Opened", el: "Άνοιξε" },
		pickDate: { en: "Pick date", el: "Επιλογή ημερομηνίας" },
		subtitle: {
			en: "Daily openings, closings, and cash insights",
			el: "Καθημερινά ανοίγματα, κλείσιμο και συνοπτικά οικονομικά",
		},
		title: { en: "Register Sessions", el: "Συνεδρίες Ταμείου" },
		totalDiscounts: { en: "Discounts", el: "Εκπτώσεις" },
		totalSessions: { en: "Sessions", el: "Συνεδρίες" },
		totalTreats: { en: "Treats", el: "Κεράσματα" },
		treats: { en: "Treats", el: "Κεράσματα" },
	},
	reset: {
		missingFields: {
			en: "Enter password and confirmation",
			el: "Εισάγετε κωδικό και επιβεβαίωση",
		},
		mismatch: {
			en: "Passwords do not match",
			el: "Οι κωδικοί δεν ταιριάζουν",
		},
		updated: { en: "Password updated", el: "Ο κωδικός ενημερώθηκε" },
	},
	settings: {
		allowTreats: { en: "Allow treats", el: "Επιτρέπονται κεράσματα" },
		allowUnlimitedStock: {
			en: "Allow unlimited stock",
			el: "Επιτρέπεται απεριόριστο απόθεμα",
		},
		appearance: { en: "Appearance", el: "Εμφάνιση" },
		appointmentBufferMin: {
			en: "Appointment buffer (min)",
			el: "Χρόνος διαλείμματος ραντεβού (λεπτά)",
		},
		bookingDefaultDurationMin: {
			en: "Default booking duration (min)",
			el: "Προεπιλεγμένη διάρκεια κράτησης (λεπτά)",
		},
		bookings: { en: "Bookings", el: "Κρατήσεις" },
		categorySort: {
			custom: { en: "Custom", el: "Προσαρμοσμένο" },
			name: { en: "Name", el: "Όνομα" },
		},
		coupons: { en: "Coupons", el: "Κουπόνια" },
		couponsValue: { en: "Coupon value", el: "Αξία κουπονιού" },
		currencyCode: { en: "Currency", el: "Νόμισμα" },
		defaultCategorySort: {
			en: "Default category sort",
			el: "Προεπιλογή ταξινόμησης κατηγορίας",
		},
		defaultLocale: { en: "Default language", el: "Προεπιλεγμένη γλώσσα" },
		finance: { en: "Finance", el: "Οικονομικά" },
		football: { en: "Football", el: "Ποδόσφαιρο" },
		footballFieldsCount: { en: "Fields count", el: "Αριθμός γηπέδων" },
		imageMaxSizeMb: {
			en: "Image max size (MB)",
			el: "Μέγιστο μέγεθος εικόνας (MB)",
		},
		inventory: { en: "Inventory", el: "Απόθεμα" },
		lowStockThreshold: {
			en: "Low stock threshold",
			el: "Όριο χαμηλού αποθέματος",
		},
		negativeStockAllowed: {
			en: "Allow negative stock",
			el: "Επιτρέπεται αρνητικό απόθεμα",
		},
		preventOverlaps: { en: "Prevent overlaps", el: "Αποτροπή επικαλύψεων" },
		productsPageSize: {
			en: "Products page size",
			el: "Μέγεθος σελίδας προϊόντων",
		},
		receipt: { en: "Receipt", el: "Απόδειξη" },
		receiptFooterText: {
			en: "Receipt footer text",
			el: "Κείμενο υποσέλιδου απόδειξης",
		},
		requireOpenRegisterForSale: {
			en: "Require open register for sale",
			el: "Απαιτείται ανοιχτό ταμείο για πώληση",
		},
		sales: { en: "Sales", el: "Πωλήσεις" },
		taxRatePercent: { en: "Tax rate (%)", el: "Φόρος (%)" },
		themeDefault: { en: "Default theme", el: "Προεπιλεγμένο θέμα" },
	},
	theme: {
		dark: { en: "Dark", el: "Σκούρο" },
		light: { en: "Light", el: "Φωτεινό" },
		system: { en: "System", el: "Σύστημα" },
	},
	users: {
		add: { en: "Create User", el: "Δημιουργία Χρήστη" },
		edit: { en: "Edit User", el: "Επεξεργασία Χρήστη" },
		empty: {
			description: {
				en: "Create users to grant access to your system",
				el: "Δημιουργήστε χρήστες για να δώσετε πρόσβαση στο σύστημά σας",
			},
			title: { en: "No users yet", el: "Δεν υπάρχουν χρήστες ακόμα" },
		},
		newPasswordPlaceholder: { en: "New password", el: "Νέος κωδικός" },
		passwordOptionalPlaceholder: {
			en: "Leave blank to keep unchanged",
			el: "Αφήστε κενό για να παραμείνει",
		},
		title: { en: "Users", el: "Χρήστες" },
		usernamePlaceholder: {
			en: "Enter username",
			el: "Εισαγάγετε όνομα χρήστη",
		},
	},
} as const;

export type TranslationKey = DeepKey<typeof translations>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedTranslation<T extends Record<string, unknown>>(
	obj: T,
	path: string,
	current: Locale,
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
		getNestedTranslation(translations, key, $locale) ?? key,
);
