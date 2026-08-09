/* ==========================================================================
   MOMSLY — DATA
   Static content: the tool catalog, tracker type definitions, tips,
   testimonials. Nothing here mutates; user data lives in Storage.
   ========================================================================== */

const Data = (() => {

  // Every tracker type Momsly supports — used by tracker.js to render tabs,
  // log forms, and history rows consistently.
  const TRACKER_TYPES = [
    { id: 'feeding',      label: 'Feeding',       icon: 'bottle',       unit: 'oz',   color: 'primary', premium: false },
    { id: 'breastfeeding', label: 'Breastfeed',   icon: 'breastfeed',   unit: 'min',  color: 'primary', premium: false },
    { id: 'pump',          label: 'Pump',          icon: 'pump',         unit: 'oz',   color: 'secondary', premium: true },
    { id: 'sleep',         label: 'Sleep',         icon: 'sleep',        unit: 'hr',   color: 'secondary', premium: false },
    { id: 'diaper',        label: 'Diaper',        icon: 'diaper',       unit: '',     color: 'accent', premium: false },
    { id: 'medicine',      label: 'Medicine',      icon: 'medicine',     unit: 'dose', color: 'danger', premium: false },
    { id: 'weight',        label: 'Weight',        icon: 'weight',       unit: 'lb',   color: 'success', premium: false },
    { id: 'height',        label: 'Height',        icon: 'ruler',        unit: 'in',   color: 'success', premium: false },
    { id: 'vaccine',       label: 'Vaccine',       icon: 'syringe',      unit: '',     color: 'secondary', premium: true },
    { id: 'temperature',   label: 'Temperature',   icon: 'thermometer',  unit: '°F',   color: 'danger', premium: false },
    { id: 'mood',          label: 'Mood',          icon: 'smile',        unit: '',     color: 'accent', premium: false },
    { id: 'teething',      label: 'Teething',      icon: 'tooth',        unit: '',     color: 'primary', premium: true },
    { id: 'water',         label: 'Water',         icon: 'droplet',      unit: 'oz',   color: 'secondary', premium: false },
    { id: 'solids',        label: 'Solid Food',    icon: 'food',         unit: '',     color: 'success', premium: false },
  ];

  function trackerType(id) {
    return TRACKER_TYPES.find(t => t.id === id);
  }

  // The full tool catalog, mirroring every tool requested in the brief.
  // `route` points to a working page/section; tools without a dedicated
  // build yet open the Tracker or a friendly "coming soon" sheet, and are
  // clearly flagged so nothing pretends to be more finished than it is.
  const TOOLS = [
    { id: 'feeding-timer', name: 'Smart Feeding Timer', desc: 'Live timer with next-feed countdown', icon: 'bottle', category: 'Feeding', premium: true, route: 'tracker.html?tab=feeding&timer=1' },
    { id: 'sleep-timer', name: 'Smart Sleep Timer', desc: 'Track naps with a sleep score', icon: 'sleep', category: 'Sleep', premium: true, route: 'tracker.html?tab=sleep&timer=1' },
    { id: 'ai-schedule', name: 'AI Daily Planner', desc: 'A full day schedule, generated for your baby', icon: 'sparkles', category: 'Planning', premium: true, route: 'tools.html#ai-planner' },
    { id: 'reminders', name: 'Reminders', desc: 'Feeding, medicine, naps & more', icon: 'bell', category: 'Planning', premium: false, route: 'tools.html#reminders' },
    { id: 'growth-charts', name: 'Growth Charts', desc: 'Weight, height & head circumference', icon: 'growth', category: 'Health', premium: false, route: 'tracker.html?tab=weight&view=chart' },
    { id: 'milestones', name: 'Milestone Timeline', desc: 'Track every first, with photos', icon: 'milestone', category: 'Growth', premium: false, route: 'tools.html#milestones' },
    { id: 'learn-and-fun', name: 'Learn & Fun Activities', desc: 'Age-by-age play that builds real skills', icon: 'activity', category: 'Play', premium: false, route: 'tools.html#learn-and-fun' },
    { id: 'meal-planner', name: 'Meal Planner', desc: 'Weekly meals for the whole family', icon: 'food', category: 'Feeding', premium: true, route: 'tools.html#meal-planner' },
    { id: 'diaper-tracker', name: 'Diaper Tracker', desc: 'Wet, dirty & mixed, all logged', icon: 'diaper', category: 'Health', premium: false, route: 'tracker.html?tab=diaper' },
    { id: 'water-tracker', name: 'Water Tracker', desc: 'Daily hydration for toddlers & moms', icon: 'droplet', category: 'Health', premium: false, route: 'tracker.html?tab=water' },
    { id: 'weight-tracker', name: 'Weight Tracker', desc: 'Plot growth over time', icon: 'weight', category: 'Health', premium: false, route: 'tracker.html?tab=weight' },
    { id: 'height-tracker', name: 'Height Tracker', desc: 'Track length & height', icon: 'ruler', category: 'Health', premium: false, route: 'tracker.html?tab=height' },
    { id: 'bottle-tracker', name: 'Bottle Tracker', desc: 'Ounces, timing & totals', icon: 'bottle', category: 'Feeding', premium: false, route: 'tracker.html?tab=feeding' },
    { id: 'breastfeeding-tracker', name: 'Breastfeeding Tracker', desc: 'Side, duration & schedule', icon: 'breastfeed', category: 'Feeding', premium: false, route: 'tracker.html?tab=breastfeeding' },
    { id: 'pump-tracker', name: 'Pump Tracker', desc: 'Sessions & output, side by side', icon: 'pump', category: 'Feeding', premium: true, route: 'tracker.html?tab=pump' },
    { id: 'sleep-training', name: 'Sleep Training Guide', desc: 'Compare methods and find your fit', icon: 'sleep', category: 'Sleep', premium: true, route: 'tools.html#sleep-training' },
    { id: 'baby-exercise', name: 'Baby Exercise Guide', desc: 'Age-by-age moves that build strength', icon: 'activity', category: 'Growth', premium: false, route: 'tools.html#baby-exercise' },
    { id: 'breathing', name: 'Breathing Exercise', desc: 'A calm minute, just for you', icon: 'sparkles', category: 'Self Care', premium: false, route: 'tools.html#breathing' },
    { id: 'self-care', name: 'Mom Self Care', desc: 'Small resets for hard days', icon: 'heart', category: 'Self Care', premium: false, route: 'tools.html#self-care' },
    { id: 'emergency-contacts', name: 'Emergency Contacts', desc: 'Pediatrician, poison control & family', icon: 'contact', category: 'Health', premium: false, route: 'tools.html#emergency-contacts' },
    { id: 'expense-tracker', name: 'Expense Tracker', desc: 'Log baby expenses by category', icon: 'wallet', category: 'Finance', premium: true, route: 'tools.html#expense-tracker' },
    { id: 'photo-memories', name: 'Photo Memories', desc: 'A private album of the little moments', icon: 'camera', category: 'Growth', premium: false, route: 'tools.html#photo-memories' },
    { id: 'vaccine-tracker', name: 'Vaccination Reminder', desc: 'Never miss a scheduled shot', icon: 'syringe', category: 'Health', premium: true, route: 'tracker.html?tab=vaccine' },
    { id: 'doctor-reminder', name: 'Doctor Appointment', desc: 'Well visits & check-ups', icon: 'calendar', category: 'Health', premium: false, route: 'tools.html#reminders' },
  ];

  const TOOL_CATEGORIES = ['All', 'Feeding', 'Sleep', 'Health', 'Growth', 'Planning', 'Play', 'Self Care', 'Finance'];

  const DAILY_TIPS = [
    "A 3am feed doesn't need conversation — dim lights and a quiet voice help everyone get back to sleep faster.",
    "Growth spurts often bring extra hunger around 3 weeks, 6 weeks, and 3 months. More feeds is normal, not a supply problem.",
    "Tummy time in short 3-5 minute bursts, a few times a day, builds neck strength without a fight.",
    "Babies often sleep better in a room that's slightly cool — around 68-72°F is a comfortable range.",
    "A consistent 3-step wind-down (bath, book, bed) can start working as a sleep cue within a couple of weeks.",
    "It's normal for toddlers to refuse a food seven or more times before accepting it. Keep offering, no pressure.",
    "Skin-to-skin contact isn't just for newborns — it can calm an overtired baby of any age.",
    "A messy house and a fed, held baby is a good day. You're doing better than you think.",
  ];

  function tipOfTheDay() {
    const day = new Date().getDate();
    return DAILY_TIPS[day % DAILY_TIPS.length];
  }

  const TESTIMONIALS = [
    { name: 'Jess R.', role: 'Mom of 2, Austin TX', quote: 'The feeding timer alone replaced three sticky notes and a panicked group chat.', stars: 5 },
    { name: 'Amara O.', role: 'First-time mom, Toronto', quote: 'I finally know when the last nap ended without scrolling through texts to my husband.', stars: 5 },
    { name: 'Priya K.', role: 'Mom of 3, Sydney', quote: 'The milestone timeline made me cry a little. In a good way.', stars: 5 },
  ];

  const REMINDER_PRESETS = [
    { title: 'Feed baby', category: 'feeding', icon: 'bottle', every: 180 },
    { title: 'Medicine', category: 'medicine', icon: 'medicine', every: null },
    { title: 'Nap time', category: 'sleep', icon: 'sleep', every: null },
    { title: 'Bedtime', category: 'sleep', icon: 'moon', every: null },
    { title: 'Water break', category: 'water', icon: 'droplet', every: 120 },
    { title: 'Doctor visit', category: 'health', icon: 'calendar', every: null },
    { title: 'Vaccination', category: 'health', icon: 'syringe', every: null },
    { title: 'School drop-off', category: 'school', icon: 'checklist', every: null },
    { title: 'Bath time', category: 'care', icon: 'droplet', every: null },
    { title: 'Homework', category: 'school', icon: 'checklist', every: null },
  ];

  const AVATAR_COLORS = ['#F472B6', '#A78BFA', '#FDE68A', '#22C55E', '#60A5FA', '#FB923C'];

  return { TRACKER_TYPES, trackerType, TOOLS, TOOL_CATEGORIES, DAILY_TIPS, tipOfTheDay, TESTIMONIALS, REMINDER_PRESETS, AVATAR_COLORS };
})();
