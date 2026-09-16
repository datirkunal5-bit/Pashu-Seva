/**
 * Bilingual localization dictionary for Marathi (मराठी) and English
 * Covers all administrative and member workflows for the Cattle Feed Ledger
 */
export const translations = {
  mr: {
    // App Header & Branding
    societyName: 'सहकारी दूध व्यावसायिक संस्था मर्यादित',
    appTitle: 'पशू खाद्य खतावणी',
    appSubtitle: 'Cattle Feed Credit Ledger',
    langToggle: 'English',
    switchRole: 'भूमिका बदला',
    adminRole: 'क्लार्क (Admin)',
    memberRole: 'सभासद (Member)',
    logout: 'बाहेर पडा (Logout)',

    // Common
    save: 'जतन करा',
    cancel: 'रद्द करा',
    confirm: 'खात्री करा',
    delete: 'हटवा (Delete)',
    edit: 'बदला (Edit)',
    search: 'सभासद शोधा (नाव, फोन, खाते क्र.)...',
    all: 'सर्व',
    loading: 'माहिती लोड होत आहे...',
    error: 'त्रुटी आली',
    success: 'यशस्वी!',
    actions: 'कृती',
    date: 'तारीख',
    amount: 'रक्कम (₹)',
    note: 'तपशील / शेरा',
    balance: 'शिल्लक',
    resultingBalance: 'व्यवहारानंतर शिल्लक',
    viewLedger: 'खतावणी पहा',
    close: 'बंद करा',
    back: 'मागे',

    // Transaction Types & Badges
    feedGiven: 'कांडी (खाद्य दिले)',
    feedGivenShort: 'कांडी',
    paymentReceived: 'जमा (रक्कम मिळाली)',
    paymentReceivedShort: 'जमा',
    feedDesc: 'सभासदाने उधारीवर घेतलेले पशू खाद्य (बाकी वाढते)',
    paymentDesc: 'सभासदाने जमा केलेली रक्कम (बाकी कमी होते)',

    // Balance States
    youOwe: 'तुमच्याकडे बाकी रक्कम आहे',
    youAreInCredit: 'संस्थेकडे तुमची जमा रक्कम आहे',
    accountSettled: 'हिशोब पूर्ण चुकता आहे',
    memberOwes: 'बाकीदार (Dues)',
    memberCredit: 'जमा (Advance Credit)',
    memberSettled: 'निरंक (Settled)',

    // Admin Dashboard
    adminDashboard: 'व्यवस्थापक डॅशबोर्ड',
    totalMembers: 'एकूण सभासद',
    totalOutstandingDues: 'एकूण येणे बाकी (Dues)',
    totalAdvanceCredits: 'एकूण आगाऊ जमा (Credit)',
    topDebtors: 'सर्वाधिक बाकीदार सभासद',
    memberList: 'सभासद यादी व खतावणी',
    addNewMember: '+ नवीन सभासद जोडा',
    addTransaction: '+ नवीन नोंद करा',
    quickAddEntry: 'जलद खतावणी नोंद (Quick Entry)',
    sortBy: 'क्रमवारी:',
    sortBalanceDesc: 'बाकी जास्त ते कमी',
    sortBalanceAsc: 'बाकी कमी ते जास्त',
    sortName: 'नावाप्रमाणे (A-Z)',
    sortCode: 'खाते क्र. प्रमाणे',
    noMembersFound: 'कोणतेही सभासद आढळले नाहीत.',
    recordedBy: 'नोंदणी करणारे:',

    // Member Ledger
    memberLedgerTitle: 'सभासद खतावणी नोंदवही',
    memberCodeLabel: 'खाते क्र. (Page No.):',
    villageLabel: 'गाव:',
    phoneLabel: 'मोबाईल क्र.:',
    transactionsHistory: 'व्यवहार इतिहास (नवीन प्रथम)',
    noTransactionsYet: 'अद्याप कोणतेही व्यवहार नोंदवलेले नाहीत.',
    entryNotice: '२-३ टॅप्समध्ये जलद नोंद पूर्ण करा.',

    // Edit/Delete Recalculation Warning
    recalcWarningTitle: 'महत्त्वाची सूचना: शिल्लक फेरमोजणी',
    recalcWarningBody: 'ही नोंद बदलल्यास किंवा हटवल्यास, या तारखेनंतरच्या सर्व व्यवहारांची शिल्लक (Running Balance) आपोआप पुन्हा मोजली जाईल.',
    confirmDeletePrompt: 'तुम्हाला खात्री आहे का की ही नोंद हटवायची आहे?',

    // Member App
    memberLoginTitle: 'सभासद लॉगिन',
    memberLoginSubtitle: 'तुमचा १० अंकी मोबाईल नंबर टाकून OTP मिळवा',
    enterMobile: 'मोबाईल नंबर प्रविष्ट करा',
    sendOtpBtn: 'OTP मिळवा (Send OTP)',
    enterOtp: 'मिळालेला ६-अंकी OTP टाका',
    verifyOtpBtn: 'लॉगिन करा',
    resendOtp: 'OTP पुन्हा पाठवा',
    demoOtpNotice: 'डेमो मोड (प्रत्यक्ष SMS पाठवला जात नाही). खालील OTP वापरा:',
    memberRegisterTitle: 'नवीन सभासद नोंदणी',
    fullName: 'पूर्ण नाव',
    villageName: 'गाव / पत्ता',
    memberCode: 'खतावणी खाते क्र. (उदा. 15)',
    registerAndLogin: 'नोंदणी करा व पुढे जा',

    // Member Dashboard
    myLedger: 'माझे खाते / खतावणी',
    lifetimeSummary: 'एकूण व्यवहार आढावा',
    totalFeedTaken: 'एकूण खरेदी केलेले खाद्य',
    totalPaymentsMade: 'एकूण भरलेली रक्कम',
    lastTransactionDate: 'शेवटचा व्यवहार:',
    never: 'अद्याप नाही',

    // Quick Chips for Transaction Notes
    chipSugras: 'सुग्रास पशू खाद्य',
    chipSarki: 'सरकी ढेप',
    chipMaka: 'मका चुनी',
    chipMilkBill: 'दूध बिलातून जमा',
    chipCash: 'रोख जमा (Cash)',

    // Notifications
    memberCreatedSuccess: 'नवीन सभासद यशस्वीरीत्या जोडला गेला!',
    txAddedSuccess: 'नोंद यशस्वीरीत्या जतन झाली व शिल्लक अपडेट झाली!',
    txUpdatedSuccess: 'नोंद अपडेट केली आणि पुढील सर्व शिल्लक पुन्हा मोजली गेली!',
    txDeletedSuccess: 'नोंद हटवली आणि पुढील सर्व शिल्लक पुन्हा मोजली गेली!'
  },

  en: {
    // App Header & Branding
    societyName: 'Cooperative Dairy Business Society Ltd.',
    appTitle: 'Pashu Khadya Ledger',
    appSubtitle: 'Cattle Feed Credit Register',
    langToggle: 'मराठी',
    switchRole: 'Switch Role',
    adminRole: 'Clerk / Admin',
    memberRole: 'Member (सभासद)',
    logout: 'Logout',

    // Common
    save: 'Save Entry',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search members by name, phone, code...',
    all: 'All',
    loading: 'Loading data...',
    error: 'An error occurred',
    success: 'Success!',
    actions: 'Actions',
    date: 'Date',
    amount: 'Amount (₹)',
    note: 'Note / Item Description',
    balance: 'Balance',
    resultingBalance: 'Balance After Entry',
    viewLedger: 'View Ledger',
    close: 'Close',
    back: 'Back',

    // Transaction Types & Badges
    feedGiven: 'Feed Given (कांडी)',
    feedGivenShort: 'Feed (कांडी)',
    paymentReceived: 'Payment Received (जमा)',
    paymentReceivedShort: 'Payment (जमा)',
    feedDesc: 'Member took cattle feed on credit (increases balance owed)',
    paymentDesc: 'Member paid money to society (decreases balance owed)',

    // Balance States
    youOwe: 'You owe to the society',
    youAreInCredit: 'You are in credit with the society',
    accountSettled: 'Your account is settled',
    memberOwes: 'Dues Owed',
    memberCredit: 'Advance Credit',
    memberSettled: 'Settled (₹0)',

    // Admin Dashboard
    adminDashboard: 'Clerk Admin Dashboard',
    totalMembers: 'Total Members',
    totalOutstandingDues: 'Total Outstanding Dues',
    totalAdvanceCredits: 'Total Advance Credits',
    topDebtors: 'Highest Dues (Top Debtors)',
    memberList: 'Member Directory & Ledgers',
    addNewMember: '+ Add New Member',
    addTransaction: '+ Add Entry',
    quickAddEntry: 'Quick Ledger Entry',
    sortBy: 'Sort by:',
    sortBalanceDesc: 'Highest Dues First',
    sortBalanceAsc: 'Lowest Dues First',
    sortName: 'Name (A to Z)',
    sortCode: 'Member Code',
    noMembersFound: 'No members match the search query.',
    recordedBy: 'Recorded by:',

    // Member Ledger
    memberLedgerTitle: 'Member Cattle Feed Ledger',
    memberCodeLabel: 'Member / Ledger Code:',
    villageLabel: 'Village:',
    phoneLabel: 'Mobile Phone:',
    transactionsHistory: 'Transaction History (Newest First)',
    noTransactionsYet: 'No transactions recorded yet.',
    entryNotice: 'Fast 2-3 tap ledger entry.',

    // Edit/Delete Recalculation Warning
    recalcWarningTitle: 'Important Notice: Automatic Recalculation',
    recalcWarningBody: 'Modifying or deleting this entry will automatically recalculate running balances for all chronologically subsequent transactions for this member.',
    confirmDeletePrompt: 'Are you sure you want to delete this transaction entry?',

    // Member App
    memberLoginTitle: 'Member Login',
    memberLoginSubtitle: 'Enter your 10-digit mobile number to receive OTP',
    enterMobile: 'Enter Mobile Number',
    sendOtpBtn: 'Send OTP',
    enterOtp: 'Enter 6-Digit OTP',
    verifyOtpBtn: 'Verify & Login',
    resendOtp: 'Resend OTP',
    demoOtpNotice: 'Demo Mode (No telecom SMS sent). Please use OTP:',
    memberRegisterTitle: 'Member Registration',
    fullName: 'Full Name',
    villageName: 'Village / Address',
    memberCode: 'Ledger Code / Page No (e.g. 15)',
    registerAndLogin: 'Register & Continue',

    // Member Dashboard
    myLedger: 'My Account & Ledger',
    lifetimeSummary: 'Lifetime Activity Summary',
    totalFeedTaken: 'Total Feed Purchased',
    totalPaymentsMade: 'Total Payments Made',
    lastTransactionDate: 'Last Transaction:',
    never: 'None yet',

    // Quick Chips for Transaction Notes
    chipSugras: 'Sugras Cattle Feed',
    chipSarki: 'Cottonseed Cake (सरकी ढेप)',
    chipMaka: 'Maize Chuni (मका चुनी)',
    chipMilkBill: 'Milk Bill Deduction',
    chipCash: 'Cash Deposit',

    // Notifications
    memberCreatedSuccess: 'Member added successfully!',
    txAddedSuccess: 'Transaction saved and balance updated!',
    txUpdatedSuccess: 'Transaction updated and subsequent balances recalculated!',
    txDeletedSuccess: 'Transaction removed and subsequent balances recalculated!'
  }
};

let currentLang = localStorage.getItem('pk_language') || 'mr';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  currentLang = lang === 'en' ? 'en' : 'mr';
  localStorage.setItem('pk_language', currentLang);
  document.documentElement.lang = currentLang;
  return currentLang;
}

export function t(key) {
  const langDict = translations[currentLang] || translations.mr;
  return langDict[key] || translations.en[key] || key;
}

/**
 * Format monetary amount with Indian formatting: e.g. ₹12,450.00
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num));
  return (num < 0 ? '-' : '') + '₹' + formatted;
}

/**
 * Format date nicely: e.g. "05 Mar 2026" or Marathi localized format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsMr = ['जाने', 'फेब्रु', 'मार्च', 'एप्रिल', 'मे', 'जून', 'जुलै', 'ऑगस्ट', 'सप्टें', 'ऑक्टो', 'नोव्हें', 'डिसें'];
    const month = currentLang === 'mr' ? monthsMr[d.getMonth()] : monthsEn[d.getMonth()];
    return `${day} ${month} ${d.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
}
