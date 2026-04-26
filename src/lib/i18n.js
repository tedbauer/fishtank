// Per-user UI translations. Add new strings here keyed by a short ID.
// Missing keys or unknown languages fall back to English.

export const LANGUAGES = [
    { code: "en", label: "English", native: "English", flag: "🇺🇸" },
    { code: "vi", label: "Vietnamese", native: "Tiếng Việt", flag: "🇻🇳" },
];

export const DEFAULT_LANG = "en";

export const translations = {
    en: {
        // Loading / generic
        loading: "Loading…",
        back: "← Back",

        // Login (rendered before language is known — English only)
        login_signIn: "Sign in with Google",
        login_redirecting: "Redirecting…",
        login_blurb_1: "Sign in to start tracking chores with your household.",
        login_blurb_2: "Your partner can join with an invite code.",

        // Language picker
        lang_pickTitle: "Choose your language",
        lang_pickSubtitle: "You can change this anytime in Manage.",
        lang_continue: "Continue",
        lang_section: "Language",
        lang_settingDesc: "Switch the app between English and Vietnamese.",

        // Household setup
        hh_welcome: "Welcome, {name}!",
        hh_setup_subtitle: "Set up your shared household",
        hh_create_title: "Create a household",
        hh_create_desc: "Start fresh and invite your partner",
        hh_join_title: "Join a household",
        hh_join_desc: "Enter an invite code from your partner",
        hh_create_heading: "Create your household",
        hh_create_blurb: "We'll set up default chores and give you an invite code.",
        hh_creating: "Creating…",
        hh_create_button: "Create household",
        hh_join_heading: "Join a household",
        hh_join_blurb: "Enter the 6-character invite code from your partner.",
        hh_joining: "Joining…",
        hh_join_button: "Join household",
        hh_created_heading: "Household created!",
        hh_created_share: "Share this code with your partner so they can join:",
        hh_continue: "Continue to app →",
        hh_err_empty: "Please enter an invite code",
        hh_err_invalid: "Invalid invite code. Check with your partner.",

        // ChoreApp tabs
        tab_today: "Today",
        tab_week: "This Week",
        tab_month: "This Month",
        tab_longterm: "Long-Term",
        tab_heatmap: "Heatmap",
        tab_store: "Store",
        tab_manage: "Manage",
        signOut: "Sign Out",

        // Frequencies
        freq_daily: "Daily",
        freq_every2: "Every 2 days",
        freq_weekly: "Weekly",
        freq_biweekly: "Every 2 weeks",
        freq_monthly: "Monthly",
        freq_quarterly: "Quarterly",
        freq_biannual: "Twice a year",

        // Friendly dates
        date_today: "today",
        date_yesterday: "yesterday",
        date_tomorrow: "tomorrow",
        date_daysAgo: "{n} days ago",
        date_inDays: "in {n} days",

        // Manage sections
        section_addChore: "Add A Chore",
        section_household: "Household",
        section_notifications: "Notifications",
        section_allChores: "All Chores",
        oneTimeTask: "One-time task",
        oneTimeTask_hint: "(won't repeat)",

        members: "Members:",
        inviteCode: "Invite Code",
        codeCopied: "Copied!",
        copyCode: "Code",
        copyShareLink: "Copy Share Link",
        linkCopied: "Link Copied!",

        // Today / week sections
        yourTurn: "Your Turn, {name}",
        upForGrabs: "Up For Grabs",
        partnersTurn: "{name}'s turn",
        snoozed: "Snoozed ({n})",
        yourItems: "Your Items",

        // Notifications panel
        notif_enabled: "Notifications Enabled",
        notif_push: "Push Notifications",
        notif_chooseDesc: "Choose what to get notified about",
        notif_blockedDesc: "Blocked — enable in browser settings",
        notif_defaultDesc: "Get reminded about chores and streaks",
        notif_enabling: "Enabling...",
        notif_enable: "Enable",
        notif_partnerActivity: "Partner Activity",
        notif_partnerActivityDesc: "When your partner completes a chore",
        notif_dailySummary: "Daily Summary",
        notif_dailySummaryDesc: "How many chores are due today",
        notif_overdue: "Overdue Alerts",
        notif_overdueDesc: "When chores go past their due date",
        notif_streak: "Streak Warnings",
        notif_streakDesc: "When your streak is about to break",

        // Today view empty states
        allCaughtUp: "All Caught Up!",
        nothingDue: "Nothing due today. Go enjoy your home!",
        allDoneForToday: "All Done For Today!",

        // Chore row
        doneTogether: "done together",
        doneBy: "done by {name}",
        oneTime: "one-time",
        dueToday: "due today",
        addButton: "Add!",
        edit: "Edit",
        delete: "Delete",
        save: "Save",
        cancel: "Cancel",
        unassigned: "Unassigned",
        choreNamePlaceholder: "water the succulents…",
        oneTimePlaceholder: "pick up dry cleaning…",
        descriptionPlaceholder: "Description (optional)",
        deadlinePlaceholder: "Deadline (optional)",
        rewardLabel: "Reward",
        last: "last:",
        back_text: "back",
        due: "due",
        overdueShort: "{n}d overdue!",
        dueNow: "due now!",
        overdueShort2: "{n}d overdue",
        inMonths: "in {n} months",
        inOneDay: "in 1 day",
        inDays: "in {n} days",

        // Header + stat cards
        hi: "Hi, {name}!",
        partner: "Partner",
        tankQuality: "Tank Quality",
        noStreak: "No Streak",
        dayStreak: "Day Streak",
        choresLeft: "Chores Left",
        usersChores: "{name}'s Chores",
        shop: "Shop →",
        inventory: "Inventory ({n})",
        refresh: "Refresh",
    },
    vi: {
        loading: "Đang tải…",
        back: "← Quay lại",

        login_signIn: "Sign in with Google",
        login_redirecting: "Redirecting…",
        login_blurb_1: "Sign in to start tracking chores with your household.",
        login_blurb_2: "Your partner can join with an invite code.",

        lang_pickTitle: "Chọn ngôn ngữ của bạn",
        lang_pickSubtitle: "Bạn có thể thay đổi bất cứ lúc nào trong mục Quản lý.",
        lang_continue: "Tiếp tục",
        lang_section: "Ngôn ngữ",
        lang_settingDesc: "Chuyển ứng dụng giữa Tiếng Anh và Tiếng Việt.",

        hh_welcome: "Chào mừng, {name}!",
        hh_setup_subtitle: "Thiết lập hộ gia đình chung của bạn",
        hh_create_title: "Tạo hộ gia đình",
        hh_create_desc: "Bắt đầu mới và mời bạn đời của bạn",
        hh_join_title: "Tham gia hộ gia đình",
        hh_join_desc: "Nhập mã mời từ bạn đời",
        hh_create_heading: "Tạo hộ gia đình của bạn",
        hh_create_blurb: "Chúng tôi sẽ thiết lập các công việc mặc định và cấp cho bạn một mã mời.",
        hh_creating: "Đang tạo…",
        hh_create_button: "Tạo hộ gia đình",
        hh_join_heading: "Tham gia hộ gia đình",
        hh_join_blurb: "Nhập mã mời 6 ký tự từ bạn đời của bạn.",
        hh_joining: "Đang tham gia…",
        hh_join_button: "Tham gia",
        hh_created_heading: "Đã tạo hộ gia đình!",
        hh_created_share: "Chia sẻ mã này với bạn đời để họ có thể tham gia:",
        hh_continue: "Vào ứng dụng →",
        hh_err_empty: "Vui lòng nhập mã mời",
        hh_err_invalid: "Mã mời không hợp lệ. Kiểm tra với bạn đời của bạn.",

        tab_today: "Hôm nay",
        tab_week: "Tuần này",
        tab_month: "Tháng này",
        tab_longterm: "Dài hạn",
        tab_heatmap: "Biểu đồ",
        tab_store: "Cửa hàng",
        tab_manage: "Quản lý",
        signOut: "Đăng xuất",

        freq_daily: "Hàng ngày",
        freq_every2: "Mỗi 2 ngày",
        freq_weekly: "Hàng tuần",
        freq_biweekly: "Mỗi 2 tuần",
        freq_monthly: "Hàng tháng",
        freq_quarterly: "Hàng quý",
        freq_biannual: "Hai lần một năm",

        date_today: "hôm nay",
        date_yesterday: "hôm qua",
        date_tomorrow: "ngày mai",
        date_daysAgo: "{n} ngày trước",
        date_inDays: "trong {n} ngày nữa",

        section_addChore: "Thêm việc nhà",
        section_household: "Hộ gia đình",
        section_notifications: "Thông báo",
        section_allChores: "Tất cả việc nhà",
        oneTimeTask: "Việc một lần",
        oneTimeTask_hint: "(không lặp lại)",

        members: "Thành viên:",
        inviteCode: "Mã mời",
        codeCopied: "Đã sao chép!",
        copyCode: "Mã",
        copyShareLink: "Sao chép liên kết",
        linkCopied: "Đã sao chép liên kết!",

        yourTurn: "Lượt của bạn, {name}",
        upForGrabs: "Còn trống",
        partnersTurn: "Lượt của {name}",
        snoozed: "Đã hoãn ({n})",
        yourItems: "Vật phẩm của bạn",

        notif_enabled: "Đã bật thông báo",
        notif_push: "Thông báo đẩy",
        notif_chooseDesc: "Chọn loại thông báo bạn muốn nhận",
        notif_blockedDesc: "Bị chặn — bật trong cài đặt trình duyệt",
        notif_defaultDesc: "Nhắc nhở việc nhà và chuỗi liên tiếp",
        notif_enabling: "Đang bật...",
        notif_enable: "Bật",
        notif_partnerActivity: "Hoạt động của bạn đời",
        notif_partnerActivityDesc: "Khi bạn đời hoàn thành một việc",
        notif_dailySummary: "Tóm tắt hàng ngày",
        notif_dailySummaryDesc: "Có bao nhiêu việc đến hạn hôm nay",
        notif_overdue: "Cảnh báo quá hạn",
        notif_overdueDesc: "Khi việc nhà quá hạn",
        notif_streak: "Cảnh báo chuỗi liên tiếp",
        notif_streakDesc: "Khi chuỗi liên tiếp sắp đứt",

        allCaughtUp: "Đã xong hết!",
        nothingDue: "Không có việc nào đến hạn hôm nay. Hãy tận hưởng nhà của bạn!",
        allDoneForToday: "Hôm nay đã xong tất cả!",

        doneTogether: "làm cùng nhau",
        doneBy: "{name} đã làm",
        oneTime: "một lần",
        dueToday: "đến hạn hôm nay",
        addButton: "Thêm!",
        edit: "Sửa",
        delete: "Xóa",
        save: "Lưu",
        cancel: "Hủy",
        unassigned: "Chưa phân công",
        choreNamePlaceholder: "tưới cây mọng nước…",
        oneTimePlaceholder: "lấy đồ giặt khô…",
        descriptionPlaceholder: "Mô tả (tùy chọn)",
        deadlinePlaceholder: "Hạn chót (tùy chọn)",
        rewardLabel: "Thưởng",
        last: "lần cuối:",
        back_text: "trở lại",
        due: "đến hạn",
        overdueShort: "trễ {n} ngày!",
        dueNow: "đến hạn ngay!",
        overdueShort2: "trễ {n} ngày",
        inMonths: "trong {n} tháng nữa",
        inOneDay: "trong 1 ngày nữa",
        inDays: "trong {n} ngày nữa",

        hi: "Chào, {name}!",
        partner: "Bạn đời",
        tankQuality: "Chất lượng bể",
        noStreak: "Chưa có chuỗi",
        dayStreak: "Ngày liên tiếp",
        choresLeft: "Việc còn lại",
        usersChores: "Việc của {name}",
        shop: "Cửa hàng →",
        inventory: "Kho ({n})",
        refresh: "Làm mới",
    },
};

export function t(key, lang, vars) {
    const dict = translations[lang] || translations[DEFAULT_LANG];
    let str = dict[key];
    if (str === undefined) str = translations[DEFAULT_LANG][key];
    if (str === undefined) return key;
    if (vars) {
        for (const k of Object.keys(vars)) {
            str = str.replace(new RegExp(`\\{${k}\\}`, "g"), vars[k]);
        }
    }
    return str;
}
