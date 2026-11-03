// Barter Kings — sample (fake) data for the test-drive version.
// Everything here is made up so the app feels alive on first open.

export const CATEGORIES = [
  { id: 'tools', name: 'Tools', emoji: '🔧' },
  { id: 'bikes', name: 'Bikes', emoji: '🚲' },
  { id: 'electronics', name: 'Electronics', emoji: '🎮' },
  { id: 'furniture', name: 'Furniture', emoji: '🛋️' },
  { id: 'outdoor', name: 'Outdoor & Camping', emoji: '⛺' },
  { id: 'collectibles', name: 'Collectibles', emoji: '🃏' },
  { id: 'kids', name: 'Kids & Baby', emoji: '🧸' },
  { id: 'sports', name: 'Sports & Fitness', emoji: '🏋️' },
  { id: 'home', name: 'Home & Kitchen', emoji: '🍳' },
  { id: 'auto', name: 'Auto Parts', emoji: '🚗' },
  { id: 'yard', name: 'Yard & Garden', emoji: '🌻' },
  { id: 'music', name: 'Music Gear', emoji: '🎸' },
  { id: 'clothing', name: 'Clothing', emoji: '👕' },
  // Restricted: these may not be legal to send across state lines.
  { id: 'plants', name: 'Plants & Seeds', emoji: '🌱', restricted: true },
  { id: 'fireworks', name: 'Fireworks', emoji: '🎆', restricted: true },
];

export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair', 'For parts'];
export const AGES = ['Under 1 year', '1–3 years', '3–5 years', '5–10 years', '10+ years', 'Not sure'];
export const SOURCES = ['Bought new', 'Bought used', 'Gift', 'Handed down', 'Found or free', 'Made it myself'];
export const WORKS = ['Works', 'Works with issues', "Doesn't work", 'Not a working item'];

// Places used for rough distance only (city centres, never home addresses).
export const PLACES = [
  { city: 'Castle Rock', county: 'Douglas County', state: 'CO', zip: '80104', lat: 39.372, lng: -104.856 },
  { city: 'Parker', county: 'Douglas County', state: 'CO', zip: '80134', lat: 39.518, lng: -104.761 },
  { city: 'Highlands Ranch', county: 'Douglas County', state: 'CO', zip: '80126', lat: 39.554, lng: -104.969 },
  { city: 'Lone Tree', county: 'Douglas County', state: 'CO', zip: '80124', lat: 39.552, lng: -104.886 },
  { city: 'Larkspur', county: 'Douglas County', state: 'CO', zip: '80118', lat: 39.229, lng: -104.886 },
  { city: 'Denver', county: 'Denver County', state: 'CO', zip: '80202', lat: 39.739, lng: -104.990 },
  { city: 'Aurora', county: 'Arapahoe County', state: 'CO', zip: '80012', lat: 39.729, lng: -104.832 },
  { city: 'Centennial', county: 'Arapahoe County', state: 'CO', zip: '80112', lat: 39.579, lng: -104.877 },
  { city: 'Littleton', county: 'Arapahoe County', state: 'CO', zip: '80120', lat: 39.613, lng: -105.017 },
  { city: 'Colorado Springs', county: 'El Paso County', state: 'CO', zip: '80903', lat: 38.834, lng: -104.821 },
  { city: 'Monument', county: 'El Paso County', state: 'CO', zip: '80132', lat: 39.092, lng: -104.873 },
  { city: 'Boulder', county: 'Boulder County', state: 'CO', zip: '80302', lat: 40.015, lng: -105.271 },
  { city: 'Golden', county: 'Jefferson County', state: 'CO', zip: '80401', lat: 39.756, lng: -105.221 },
  { city: 'Cheyenne', county: 'Laramie County', state: 'WY', zip: '82001', lat: 41.140, lng: -104.820 },
  { city: 'Albuquerque', county: 'Bernalillo County', state: 'NM', zip: '87102', lat: 35.084, lng: -106.651 },
  { city: 'Salt Lake City', county: 'Salt Lake County', state: 'UT', zip: '84101', lat: 40.761, lng: -111.891 },
];

const r = (by, stars, text) => ({ by, stars, text });

export const MEMBERS = [
  { id: 'm1', name: 'Dave R.', city: 'Castle Rock', ratings: [r('Maria L.', 5, 'Easy swap, drill was like new.'), r('Tony B.', 5, 'Showed up on time.')] },
  { id: 'm2', name: 'Maria L.', city: 'Parker', ratings: [r('Dave R.', 5, 'Great trader, friendly.'), r('Jen T.', 4, 'Item as described.')] },
  { id: 'm3', name: 'Tony B.', city: 'Highlands Ranch', ratings: [r('Dave R.', 4, 'Good deal.')] },
  { id: 'm4', name: 'Kelsey W.', city: 'Lone Tree', ratings: [r('Ashley P.', 5, 'Super honest.')] },
  { id: 'm5', name: 'Ray S.', city: 'Larkspur', ratings: [r('Big Mike', 5, 'Tent was spotless.'), r('Hank D.', 5, 'Would trade again.')] },
  { id: 'm6', name: 'Ashley P.', city: 'Aurora', ratings: [r('Kelsey W.', 4, 'Quick to reply.')] },
  { id: 'm7', name: 'Big Mike', city: 'Centennial', ratings: [r('Ray S.', 5, 'Straight shooter.'), r('Wes H.', 4, 'Toolbox had a few dents but fair.')] },
  { id: 'm8', name: 'Jen T.', city: 'Littleton', ratings: [r('Maria L.', 5, 'Stroller was perfect.')] },
  { id: 'm9', name: 'Carlos G.', city: 'Colorado Springs', ratings: [r('Priya K.', 5, 'Met halfway, easy.')] },
  { id: 'm10', name: 'Hank D.', city: 'Monument', ratings: [r('Ray S.', 4, 'Mower ran after a fix.')] },
  { id: 'm11', name: 'Priya K.', city: 'Boulder', ratings: [r('Carlos G.', 5, 'Shipped fast and packed well.')] },
  { id: 'm12', name: 'Wes H.', city: 'Golden', ratings: [r('Big Mike', 4, 'Good guy.')] },
  { id: 'm13', name: 'Shawn C.', city: 'Cheyenne', ratings: [r('Rosa M.', 5, 'Pyrex arrived safe.')] },
  { id: 'm14', name: 'Rosa M.', city: 'Albuquerque', ratings: [r('Shawn C.', 5, 'Seeds sprouted great!')] },
  { id: 'm15', name: 'Dusty', city: 'Salt Lake City', ratings: [
    r('Tony B.', 1, 'Never shipped his side.'), r('Jen T.', 2, 'Phone was worse than described.'),
    r('Wes H.', 1, 'Stopped answering after Lock It In.'), r('Kelsey W.', 3, 'Okay in the end.')] },
];

// helper to build a listing
const L = (id, ownerId, title, category, condition, opts = {}) => ({
  id, ownerId, title, category, condition,
  age: opts.age || '1–3 years',
  source: opts.source || 'Bought new',
  works: opts.works || 'Works',
  box: !!opts.box,
  meet: opts.meet !== false,
  ship: !!opts.ship,
  cash: opts.cash !== false,
  openAny: !!opts.openAny,
  wants: opts.wants || [],
  emoji: opts.emoji,
  photo: null,
  photoTime: opts.time || Date.now() - (Number(id.slice(1)) * 5.3 * 3600 * 1000),
  sample: true,
});

export const LISTINGS = [
  L('s1', 'm1', 'DeWalt 20V drill + 2 batteries', 'tools', 'Like new', { box: true, wants: ['bikes', 'outdoor'], emoji: '🔧' }),
  L('s2', 'm2', 'Trek mountain bike, 26 inch', 'bikes', 'Good', { age: '3–5 years', openAny: true, wants: ['tools', 'electronics'], emoji: '🚲' }),
  L('s3', 'm3', 'PlayStation 4 with 2 controllers', 'electronics', 'Good', { age: '5–10 years', ship: true, wants: ['bikes', 'sports'], emoji: '🎮' }),
  L('s4', 'm4', 'Solid oak coffee table', 'furniture', 'Good', { age: '10+ years', source: 'Handed down', wants: ['home', 'kids'], emoji: '🪵' }),
  L('s5', 'm5', 'Coleman 6-person tent', 'outdoor', 'Like new', { box: true, ship: true, wants: ['tools', 'sports'], emoji: '⛺' }),
  L('s6', 'm6', 'Baseball card binder (80s and 90s)', 'collectibles', 'Good', { age: '10+ years', ship: true, source: 'Handed down', wants: ['collectibles', 'electronics'], emoji: '🃏' }),
  L('s7', 'm7', 'Craftsman rolling toolbox', 'tools', 'Fair', { age: '10+ years', source: 'Bought used', wants: ['auto', 'tools'], emoji: '🧰' }),
  L('s8', 'm8', 'Graco stroller', 'kids', 'Like new', { age: 'Under 1 year', source: 'Gift', wants: ['home', 'furniture'], emoji: '👶' }),
  L('s9', 'm9', '10 ft kayak with paddle', 'outdoor', 'Good', { age: '3–5 years', wants: ['bikes', 'sports'], emoji: '🛶' }),
  L('s10', 'm10', 'Riding mower (needs a belt)', 'yard', 'For parts', { works: "Doesn't work", age: '10+ years', openAny: true, emoji: '🚜' }),
  L('s11', 'm11', 'Yamaha acoustic guitar', 'music', 'Good', { ship: true, box: true, wants: ['electronics', 'music'], emoji: '🎸' }),
  L('s12', 'm12', 'Weight bench + 150 lb set', 'sports', 'Good', { age: '5–10 years', source: 'Bought used', wants: ['bikes', 'outdoor'], emoji: '🏋️' }),
  L('s13', 'm13', 'Vintage Pyrex bowls, set of 4', 'home', 'Good', { age: '10+ years', meet: false, ship: true, source: 'Found or free', wants: ['collectibles', 'home'], emoji: '🥣' }),
  L('s14', 'm14', 'Heirloom tomato and chile seeds', 'plants', 'New', { age: 'Under 1 year', meet: false, ship: true, source: 'Made it myself', wants: ['yard', 'home'], emoji: '🌶️' }),
  L('s15', 'm15', 'Smartphone, unlocked, cracked screen', 'electronics', 'Fair', { works: 'Works with issues', meet: false, ship: true, openAny: true, emoji: '📱' }),
  L('s16', 'm1', 'Snowboard 155 cm with bindings', 'sports', 'Good', { age: '3–5 years', wants: ['bikes', 'tools'], emoji: '🏂' }),
  L('s17', 'm2', 'Stand mixer, red', 'home', 'Like new', { box: true, source: 'Gift', wants: ['tools', 'yard'], emoji: '🍰' }),
  L('s18', 'm3', 'Car roof rack with crossbars', 'auto', 'Good', { wants: ['outdoor', 'bikes'], emoji: '🚙' }),
  L('s19', 'm5', '18 inch chainsaw', 'tools', 'Good', { age: '3–5 years', wants: ['yard', 'outdoor'], emoji: '🪚' }),
  L('s20', 'm6', "Kids' 16 inch bike with training wheels", 'bikes', 'Good', { source: 'Bought used', wants: ['kids'], emoji: '🚲' }),
  L('s21', 'm7', '42 inch flat-screen TV', 'electronics', 'Good', { age: '5–10 years', openAny: true, emoji: '📺' }),
  L('s22', 'm9', 'Leather recliner', 'furniture', 'Fair', { age: '5–10 years', wants: ['electronics', 'tools'], emoji: '🪑' }),
  L('s23', 'm11', 'Steel backyard fire pit', 'yard', 'Like new', { wants: ['outdoor', 'home'], emoji: '🔥' }),
  L('s24', 'm12', 'Electric guitar amp, 40 watt', 'music', 'Good', { ship: true, wants: ['music', 'electronics'], emoji: '🔊' }),
  L('s25', 'm8', 'Big bin of Lego, about 8 lbs', 'kids', 'Good', { ship: true, source: 'Handed down', wants: ['collectibles', 'electronics', 'kids'], emoji: '🧱' }),
];

const H = 3600 * 1000;
export const SUGGESTIONS = [
  { id: 'g1', by: 'Maria L.', text: 'Let us save searches and get a ping when a match shows up.', votes: 41, time: Date.now() - 30 * H },
  { id: 'g2', by: 'Big Mike', text: 'Add a list of safe public meetup spots, like police station parking lots.', votes: 37, time: Date.now() - 50 * H },
  { id: 'g3', by: 'Ray S.', text: 'Three-way trades! I have what you want, you have what he wants.', votes: 29, time: Date.now() - 8 * H },
  { id: 'g4', by: 'Jen T.', text: 'A kids section so parents can swap outgrown stuff fast.', votes: 22, time: Date.now() - 70 * H },
  { id: 'g5', by: 'Carlos G.', text: 'Show a badge for members who have done 10+ deals.', votes: 18, time: Date.now() - 4 * H },
  { id: 'g6', by: 'Priya K.', text: 'Monthly in-person swap meet in each county.', votes: 15, time: Date.now() - 100 * H },
  { id: 'g7', by: 'Hank D.', text: 'Let me trade a service, like mowing, for an item.', votes: 11, time: Date.now() - 2 * H },
  { id: 'g8', by: 'Kelsey W.', text: 'Dark mode for late night browsing.', votes: 6, time: Date.now() - 20 * H },
];
