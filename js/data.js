/* Colorado No2 — Stage 1 sample data.
   Everything here is make-believe sample content so the screens can be tested.
   Real member accounts and listings arrive in Stage 2. */

export const CATEGORIES = [
  { id: 'handguns', name: 'Handguns', firearm: true },
  { id: 'long-guns', name: 'Long Guns', firearm: true },
  { id: 'shotguns', name: 'Shotguns', firearm: true },
  { id: 'hunting', name: 'Hunting Guns', firearm: true },
  { id: 'slingshots', name: 'Slingshots' },
  { id: 'bear-mace', name: 'Bear Mace' },
  { id: 'self-defense', name: 'Personal Self-Defense' },
  { id: 'bows', name: 'Bows and Arrows' },
  { id: 'accessories', name: 'Accessories' },
  { id: 'knives', name: 'Knives' },
  { id: 'collectors', name: 'Collectors', firearm: true },
];

/* How a member proved who they are. Strongest first. */
export const VERIFY = {
  photoid: { label: 'Photo ID Verified', short: 'Photo ID', rank: 3 },
  picture: { label: 'Picture Verified', short: 'Picture', rank: 2 },
  phone: { label: 'Phone Verified', short: 'Phone', rank: 1 },
  none: { label: 'Not Verified', short: 'Not Verified', rank: 0 },
};

export const MEMBERS = [
  { id: 'm1', nick: 'HighPlainsHank', verify: 'photoid', since: '2025', ratings: [5, 5, 4, 5, 5, 5, 4],
    reviews: ['Item was exactly as described.', 'On time and friendly.'] },
  { id: 'm2', nick: 'ArkansasRiverAnn', verify: 'picture', since: '2025', ratings: [5, 4, 5, 5],
    reviews: ['Fair price, easy meet at the dealer.'] },
  { id: 'm3', nick: 'SangreSam', verify: 'phone', since: '2026', ratings: [4, 5, 3],
    reviews: ['Good trade. Answered all my questions.'] },
  { id: 'm4', nick: 'PikesPeakPete', verify: 'photoid', since: '2024', ratings: [5, 5, 5, 5, 5, 4, 5, 5],
    reviews: ['Collector who knows his stuff.', 'Packed everything carefully.'] },
  { id: 'm5', nick: 'ElkCreekEd', verify: 'none', since: '2026', ratings: [2, 1, 2, 3, 1],
    reviews: ['Did not show up twice.', 'Item was not as described.', 'Changed the price at the meet.'] },
  { id: 'm6', nick: 'BlueSpruceBeth', verify: 'picture', since: '2025', ratings: [5, 5, 4],
    reviews: ['Very patient with a first-time buyer.'] },
  { id: 'm7', nick: 'SanJuanJoe', verify: 'phone', since: '2026', ratings: [],
    reviews: [] },
];

/* Rough distances only. No2 never shows addresses. */
export const LISTINGS = [
  { id: 'L101', cat: 'handguns', title: 'Ruger LCP II .380, two magazines', deal: 'Sell', price: 245, miles: 12, seller: 'm1', cond: 'Very good', posted: '2 days ago',
    desc: 'Carried, rarely fired. About 200 rounds through it. Comes with box and pocket holster.' },
  { id: 'L102', cat: 'handguns', title: 'Glock 19 Gen 5, night sights', deal: 'Trade or Sell', price: 520, miles: 38, seller: 'm4', cond: 'Like new', posted: '5 hours ago',
    desc: 'Factory night sights. Three 15-round magazines. Would trade for a quality .22 rifle plus cash.' },
  { id: 'L103', cat: 'handguns', title: 'Smith & Wesson Model 686 .357 revolver', deal: 'Sell', price: 780, miles: 74, seller: 'm2', cond: 'Good', posted: '1 week ago',
    desc: '4-inch barrel, light holster wear on the finish. Shoots great.' },
  { id: 'L104', cat: 'long-guns', title: 'Ruger 10/22 Carbine, .22 LR', deal: 'Trade', price: null, miles: 8, seller: 'm3', cond: 'Good', posted: 'Yesterday',
    desc: 'Great starter rifle. Looking to trade for a pump shotgun.' },
  { id: 'L105', cat: 'long-guns', title: 'Henry Big Boy lever action .44 Mag', deal: 'Sell', price: 850, miles: 140, seller: 'm4', cond: 'Very good', posted: '3 days ago',
    desc: 'Brass receiver, beautiful walnut stock. A shooter, not a safe queen.' },
  { id: 'L106', cat: 'shotguns', title: 'Remington 870 Express 12 ga', deal: 'Trade or Sell', price: 330, miles: 22, seller: 'm6', cond: 'Good', posted: '4 days ago',
    desc: '28-inch barrel, modified choke. Good for birds and clays.' },
  { id: 'L107', cat: 'shotguns', title: 'Mossberg 500 youth 20 ga', deal: 'Sell', price: 260, miles: 47, seller: 'm5', cond: 'Fair', posted: '2 weeks ago',
    desc: 'Short stock for a smaller shooter. Some scratches.' },
  { id: 'L108', cat: 'hunting', title: 'Tikka T3x Hunter .308 with Leupold scope', deal: 'Sell', price: 1150, miles: 61, seller: 'm1', cond: 'Like new', posted: '6 days ago',
    desc: 'Leupold VX-3HD 3.5-10x40. Zeroed at 200 yards. One elk season.' },
  { id: 'L109', cat: 'hunting', title: 'Savage 110 .30-06 elk rifle', deal: 'Trade or Sell', price: 540, miles: 9, seller: 'm3', cond: 'Very good', posted: 'Today',
    desc: 'AccuTrigger. Will trade toward a muzzleloader.' },
  { id: 'L110', cat: 'slingshots', title: 'Simple Shot Scout slingshot + 200 steel balls', deal: 'Sell', price: 45, miles: 4, seller: 'm6', cond: 'Like new', posted: 'Today',
    desc: 'Flat bands, extra band set included.' },
  { id: 'L111', cat: 'slingshots', title: 'Wrist-brace hunting slingshot', deal: 'Trade', price: null, miles: 33, seller: 'm7', cond: 'Good', posted: '3 days ago',
    desc: 'Want to trade for a good fixed-blade knife.' },
  { id: 'L112', cat: 'bear-mace', title: 'Counter Assault bear spray, 2-pack with holsters', deal: 'Sell', price: 70, miles: 15, seller: 'm2', cond: 'New, sealed', posted: 'Yesterday',
    desc: 'Expires 2029. Bought too many for a trip.' },
  { id: 'L113', cat: 'self-defense', title: 'Pepper gel keychain, 4-pack', deal: 'Sell', price: 30, miles: 6, seller: 'm6', cond: 'New', posted: '2 days ago',
    desc: 'Gel stream, less blowback. Great for family members.' },
  { id: 'L114', cat: 'self-defense', title: 'Trauma first-aid kit with tourniquet', deal: 'Sell', price: 55, miles: 52, seller: 'm4', cond: 'New', posted: '1 week ago',
    desc: 'Real CAT-style tourniquet, chest seals, gauze. Belt pouch.' },
  { id: 'L115', cat: 'bows', title: 'Bear Cruzer G3 compound bow, ready to hunt', deal: 'Trade or Sell', price: 360, miles: 28, seller: 'm1', cond: 'Very good', posted: '4 days ago',
    desc: 'Adjustable draw. Includes sight, rest, quiver and 6 arrows.' },
  { id: 'L116', cat: 'bows', title: 'Recurve takedown bow, 40 lb', deal: 'Sell', price: 150, miles: 96, seller: 'm7', cond: 'Good', posted: '2 weeks ago',
    desc: 'Wood riser. Good for learning traditional archery.' },
  { id: 'L117', cat: 'accessories', title: 'Vortex Crossfire II 4-12x44 scope', deal: 'Sell', price: 140, miles: 18, seller: 'm3', cond: 'Like new', posted: '3 days ago',
    desc: 'With rings. Never mounted on a rifle.' },
  { id: 'L118', cat: 'accessories', title: 'Lockable hard case, 42 inch', deal: 'Trade', price: null, miles: 41, seller: 'm5', cond: 'Good', posted: '1 week ago',
    desc: 'Foam inside is fine. Want to trade for range bag.' },
  { id: 'L119', cat: 'knives', title: 'Buck 119 Special fixed blade', deal: 'Sell', price: 65, miles: 11, seller: 'm2', cond: 'Very good', posted: 'Today',
    desc: 'Leather sheath. Sharpened once. Classic hunting knife.' },
  { id: 'L120', cat: 'knives', title: 'Benchmade Bugout folding knife', deal: 'Trade or Sell', price: 110, miles: 57, seller: 'm6', cond: 'Like new', posted: '5 days ago',
    desc: 'Light pocket knife. Blade under 3.5 inches.' },
  { id: 'L121', cat: 'collectors', title: 'M1 Garand, CMP, 1944 Springfield', deal: 'Sell', price: 1450, miles: 112, seller: 'm4', cond: 'Collector grade', posted: '1 week ago',
    desc: 'CMP paperwork included. Matching parts per CMP sheet.' },
  { id: 'L122', cat: 'collectors', title: 'Colt Single Action Army, 1970s, .45 LC', deal: 'Trade or Sell', price: 2300, miles: 45, seller: 'm1', cond: 'Very good', posted: '2 days ago',
    desc: 'Third generation. Original box. Serious offers only, please.' },
];

export const NEGOTIATION_TIPS = [
  { t: 'Know the going price', d: 'Look at a few similar listings before you make an offer.' },
  { t: 'Start fair', d: 'A fair first offer gets a friendly answer. A silly-low one ends the talk.' },
  { t: 'Ask before you offer', d: 'Ask about condition, how much it was used, and what comes with it.' },
  { t: 'Put it in writing', d: '"Lock It In" freezes the price, the item and the time so nobody forgets.' },
  { t: 'Be ready to walk away', d: 'A polite "No thanks" is always okay. There will be other deals.' },
];

export const DEAL_STEPS = [
  { id: 'offer', name: 'Offer', d: 'You make an offer.' },
  { id: 'counter', name: 'Counter', d: 'They answer or counter. You can counter back.' },
  { id: 'lock', name: 'Lock It In', d: 'Both tap. Price, item and time freeze.' },
  { id: 'meet', name: 'Meet and Inspect', d: 'Meet in a safe public place and look it over.' },
  { id: 'done', name: 'Deal Done', d: 'Both confirm. Then rate each other.' },
];

const NOT_ADVICE = 'This is information, not legal advice.';
export { NOT_ADVICE };

/* No2's Library. source: 'library' = our own content, 'web' = from an official website.
   constitutional: true shows the Constitutional view note.
   Laws change. Every answer links to the official source to double-check. */
export const LIBRARY = [
  {
    q: 'Do I need a background check to sell a gun to another person in Colorado?',
    keys: ['background', 'check', 'private', 'sale', 'sell', 'selling', 'buy', 'transfer', 'ffl', 'dealer', 'gun', 'firearm'],
    source: 'library', constitutional: true,
    a: [
      'Yes, under current Colorado law. Almost every private gun sale or trade must go through a licensed gun dealer (an "FFL"), who runs a background check on the buyer through the Colorado Bureau of Investigation.',
      'There are a few exceptions, such as gifts between close family members. The dealer may charge a small fee.',
      'Easy way to do it on No2: pick a licensed gun shop as your "Meet and Inspect" spot.',
    ],
    cite: 'Colorado Revised Statutes 18-12-112',
    link: { label: 'Colorado Bureau of Investigation', url: 'https://cbi.colorado.gov/' },
  },
  {
    q: 'How old do you have to be to buy a gun in Colorado?',
    keys: ['age', 'old', 'years', '21', '18', 'young', 'minimum', 'buy'],
    source: 'library', constitutional: true,
    a: [
      'Under current Colorado law, you must be 21 to buy any gun, including rifles and shotguns. A 2023 law raised the age from 18.',
      'There are some exceptions, such as for members of the military and peace officers.',
    ],
    cite: 'Senate Bill 23-169',
    link: { label: 'Colorado General Assembly: SB23-169', url: 'https://leg.colorado.gov/bills/sb23-169' },
  },
  {
    q: 'Is there a waiting period after I buy a gun?',
    keys: ['wait', 'waiting', 'period', 'days', 'three', '3', 'pick', 'up'],
    source: 'library', constitutional: true,
    a: [
      'Yes, under current Colorado law. The seller cannot hand over the gun until at least 3 days after the background check started, or until the check is approved, whichever is later.',
      'Plan your meet so the buyer can come back to the dealer to pick it up.',
    ],
    cite: 'House Bill 23-1219',
    link: { label: 'Colorado General Assembly: HB23-1219', url: 'https://leg.colorado.gov/bills/hb23-1219' },
  },
  {
    q: 'Can I sell or trade magazines that hold more than 15 rounds?',
    keys: ['magazine', 'magazines', 'mag', 'mags', 'rounds', '15', 'capacity', 'clip'],
    source: 'library', constitutional: true,
    a: [
      'Not under current Colorado law. Selling, buying or transferring a magazine that holds more than 15 rounds (more than 8 for some shotgun tubes) is against the law.',
      'No2 does not allow listings for them.',
    ],
    cite: 'Colorado Revised Statutes 18-12-301 to 303',
    link: { label: 'Colorado General Assembly', url: 'https://leg.colorado.gov/' },
  },
  {
    q: 'Do I need a permit to carry a concealed handgun?',
    keys: ['concealed', 'carry', 'permit', 'chp', 'ccw', 'license', 'open', 'holster', 'sheriff'],
    source: 'library', constitutional: true,
    a: [
      'Under current Colorado law, yes. To carry a hidden handgun in public you need a Concealed Handgun Permit from your county sheriff. You must be 21 and take a handgun safety class.',
      'Open carry is generally allowed by state law, but cities and counties may ban it (Denver does), and guns are not allowed in some places, like schools and polling places.',
      'You may carry in your own home, business, and car for protection without a permit.',
    ],
    cite: 'Colorado Revised Statutes 18-12-201 to 216',
    link: { label: 'Colorado Bureau of Investigation', url: 'https://cbi.colorado.gov/' },
  },
  {
    q: 'Is bear spray or pepper spray legal to carry?',
    keys: ['bear', 'mace', 'spray', 'pepper', 'gel', 'oc'],
    source: 'library', constitutional: false,
    a: [
      'Yes. Adults in Colorado can buy and carry bear spray and pepper spray. No permit is needed.',
      'Use it only to protect yourself from a person or an animal. Some places, like airplanes and some government buildings, do not allow it.',
    ],
    cite: 'No2\'s Library summary',
    link: { label: 'Colorado Parks and Wildlife: bear safety', url: 'https://cpw.state.co.us/' },
  },
  {
    q: 'What are the rules for carrying a knife?',
    keys: ['knife', 'knives', 'blade', 'switchblade', 'folding', 'fixed', 'inch', 'inches'],
    source: 'library', constitutional: true,
    a: [
      'Under current Colorado law, carrying a hidden knife with a blade longer than 3.5 inches is generally against the law. Exceptions include your home, your business, your car, and while hunting or fishing.',
      'Switchblades have been legal in Colorado since 2017. Some cities have stricter rules.',
    ],
    cite: 'Colorado Revised Statutes 18-12-101 and 18-12-105',
    link: { label: 'Colorado General Assembly', url: 'https://leg.colorado.gov/' },
  },
  {
    q: 'Can I sell a gun to someone who lives in another state?',
    keys: ['state', 'another', 'other', 'out', 'resident', 'ship', 'shipping', 'mail', 'wyoming', 'utah', 'kansas', 'nebraska', 'new mexico'],
    source: 'library', constitutional: true,
    a: [
      'Not directly. Federal law says a private seller may not sell a gun straight to someone who lives in a different state. It has to be shipped to a licensed dealer in the buyer\'s state.',
      'That is one reason No2 is for Colorado members only.',
    ],
    cite: 'U.S. Code, Title 18, Section 922',
    link: { label: 'ATF (federal)', url: 'https://www.atf.gov/' },
  },
  {
    q: 'What does the Second Amendment say?',
    keys: ['second', 'amendment', '2a', 'constitution', 'right', 'rights', 'bear', 'arms', 'infringed', 'militia', 'founders'],
    source: 'library', constitutional: false,
    a: [
      '"A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed." It was ratified in 1791 as part of the Bill of Rights.',
      'The U.S. Supreme Court has said it protects a person\'s own right to have a gun (Heller, 2008) and to carry one in public for self-defense (Bruen, 2022).',
      'Colorado\'s own Constitution says it too: "The right of no person to keep and bear arms in defense of his home, person and property ... shall be called in question" (Article II, Section 13).',
    ],
    cite: 'U.S. Constitution, 2nd Amendment; Colorado Constitution, Art. II, Sec. 13',
    link: { label: 'National Archives: Bill of Rights', url: 'https://www.archives.gov/founding-docs/bill-of-rights-transcript' },
  },
  {
    q: 'What is Colorado\'s "Make My Day" law?',
    keys: ['make', 'day', 'home', 'defense', 'self', 'intruder', 'castle', 'protect', 'break'],
    source: 'library', constitutional: false,
    a: [
      'It is Colorado\'s home-defense law. If someone breaks into your home, and you reasonably believe they are committing a crime there and might use force against anyone inside, you may use force, including deadly force, to defend against them.',
      'It applies inside your home. Outside the home, normal self-defense rules apply.',
    ],
    cite: 'Colorado Revised Statutes 18-1-704.5',
    link: { label: 'Colorado General Assembly', url: 'https://leg.colorado.gov/' },
  },
  {
    q: 'What do I need to hunt with a bow or rifle?',
    keys: ['hunt', 'hunting', 'license', 'elk', 'deer', 'archery', 'bow', 'tag', 'education', 'cpw'],
    source: 'library', constitutional: false,
    a: [
      'You need a hunting license from Colorado Parks and Wildlife for the animal and season.',
      'If you were born on or after January 1, 1949, you must pass a hunter education course before you can buy a hunting license.',
    ],
    cite: 'Colorado Parks and Wildlife',
    link: { label: 'Colorado Parks and Wildlife', url: 'https://cpw.state.co.us/' },
  },
  {
    q: 'Are there new rules for buying semiautomatic rifles in 2026?',
    keys: ['semi', 'semiautomatic', 'semi-automatic', 'ar', 'ar-15', 'ar15', 'rifle', 'new', '2026', 'sb25-003', 'course', 'training', 'card'],
    source: 'web', constitutional: true,
    a: [
      'Yes. Under a 2025 law (Senate Bill 25-003), starting August 1, 2026, buying many semiautomatic guns on the state\'s "specified semiautomatic firearms" list takes extra steps. First, get an eligibility card from a county sheriff. Then pass an in-person firearms safety course run through Colorado Parks and Wildlife. Then buy through a dealer with the normal background check.',
      'Guns a person already owned legally before August 1, 2026 are not affected. The list and the details can change, so read the official page and ask your sheriff before you buy or sell one.',
    ],
    cite: 'Senate Bill 25-003',
    link: { label: 'Colorado General Assembly: SB25-003', url: 'https://leg.colorado.gov/bills/sb25-003' },
  },
  {
    q: 'Does No2 hold my money or handle payment?',
    keys: ['money', 'pay', 'payment', 'cash', 'escrow', 'venmo', 'paypal', 'hold', 'fee', 'fees'],
    source: 'library', constitutional: false,
    a: [
      'No. No money ever moves through No2. You and the other member settle up in person when you meet.',
      'Never send money before you meet and inspect the item.',
    ],
    cite: 'No2 rules',
    link: null,
  },
];

export const NEWSLETTER_SECTIONS = [
  { t: 'Foundation', d: 'Where our rights come from: the founders, the Constitution, and the Bill of Rights.' },
  { t: 'Law Watch', d: 'New Colorado and federal bills, court cases, and what they mean in plain words.' },
  { t: 'Trading Post', d: 'Hot items, fair prices, and member trade stories.' },
  { t: 'Gear and Skills', d: 'Cleaning, safe storage, first aid, and range drills.' },
  { t: 'Art Corner', d: 'Member art, photos, and Colorado history.' },
];

/* ---------- Newsletter: Issue No. 1 (sample issue) ---------- */
export const NEWSLETTER_ISSUE = {
  no: 1, date: 'November 2026',
  intro: 'Welcome to the first No2 Newsletter. Each month: where our rights come from, what the law is doing, what is moving on the Trading Post, skills worth having, and art from members.',
  sections: [
    {
      id: 'foundation', t: 'Foundation', art: 'stars-circle',
      d: 'Where our rights come from.',
      stories: [
        { h: 'Twenty-seven words', p: [
          'The Second Amendment is only 27 words long: "A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed."',
          'It became part of the Constitution on December 15, 1791, along with the rest of the Bill of Rights. That is why December 15 is Bill of Rights Day.' ] },
        { h: 'Words to Live By: the Constitutional Ladder', ladder: true, p: [
          'Every rule should be checked against the one above it, all the way up to the Constitution, the supreme law of the land.' ] },
        { h: 'Colorado said it too', p: [
          'When Colorado became a state in 1876, it wrote the right into its own constitution: "The right of no person to keep and bear arms in defense of his home, person and property, or in aid of the civil power when thereto legally summoned, shall be called in question" (Article II, Section 13).' ] },
      ],
    },
    {
      id: 'law-watch', t: 'Law Watch', art: 'quill', law: true,
      d: 'New laws and what they mean, in plain words.',
      stories: [
        { h: 'New rule for some semiautomatic guns is now in effect', p: [
          'Since August 1, 2026, buying many semiautomatic guns on the state list takes extra steps: an eligibility card from a county sheriff, then an in-person safety course, then the normal dealer background check. Guns people already owned before August 1 are not affected.' ],
          link: { label: 'Colorado General Assembly: SB25-003', url: 'https://leg.colorado.gov/bills/sb25-003' } },
        { h: 'Reminders for every gun deal', p: [
          'Private gun sales and trades go through a licensed dealer for a background check. The buyer must be 21. There is a 3-day waiting period. Plan your No2 "Meet and Inspect" at a gun shop to make this easy.' ] },
        { h: 'Coming up: the 2027 session', p: [
          'The Colorado legislature meets again in January 2027. Law Watch will list every gun, knife and self-defense bill as it is introduced, and tell you how to reach your own lawmakers.' ] },
      ],
    },
    {
      id: 'trading-post', t: 'Trading Post', art: 'eagle',
      d: 'What is moving and what is fair.',
      stories: [
        { h: 'Hot this month: hunting gear', p: [
          'Fall hunting season keeps scoped rifles, bear spray and good fixed-blade knives moving fast. If you have gear sitting in a closet, now is the time to list it.' ] },
        { h: 'Fair-price check', p: [
          'Before you post, look at three similar listings on No2. Price in the middle if your item is in average shape, higher if it comes with extras like a scope, case or extra magazines.' ] },
        { h: 'How a No2 deal works', p: [
          'Offer, Counter, Lock It In, Meet and Inspect, Deal Done. When you both tap Lock It In, the price, the item and the time freeze, so nobody can change the deal at the meet. Then you rate each other. No money ever moves through No2.' ] },
      ],
    },
    {
      id: 'gear-skills', t: 'Gear and Skills', art: 'bell',
      d: 'Skills worth having.',
      stories: [
        { h: 'Safe storage is also the law', p: [
          'Colorado law requires guns to be stored safely, like in a locked safe or with a trigger lock, when a child or someone not allowed to have guns could get to them.' ] },
        { h: 'Report a lost or stolen gun', p: [
          'Colorado law says to report a lost or stolen gun to police within 5 days of finding out. Keep a photo and the serial number of each gun in a safe place.' ] },
        { h: 'Check your bear spray', p: [
          'Bear spray has an expiration date on the can. Old cans can lose pressure. Replace yours before spring hiking season.' ] },
        { h: 'Learn to stop bleeding', p: [
          'A tourniquet in your range bag or truck can save a life. Look for a free "Stop the Bleed" class near you.' ] },
      ],
    },
    {
      id: 'art-corner', t: 'Art Corner', art: 'flag',
      d: 'Member art, photos and history.',
      stories: [
        { h: '"Join, or Die"', p: [
          'In 1754 Benjamin Franklin printed a cartoon of a snake cut into pieces, one for each colony, with the words "Join, or Die." It became one of the first symbols of the colonies standing together.' ] },
        { h: 'The Best Thing Worth Saying', p: [
          'Our member contest is open. Write the one thing most worth saying about freedom, the Constitution, or the right to keep and bear arms. The winner is printed in the next issue.' ] },
        { h: 'Send your art', p: [
          'Drawings, photos of Colorado country, old family guns with a story. In Stage 2 you can send them right from the app.' ] },
      ],
    },
  ],
};

/* ---------- Suggestion Box (sample entries) ---------- */
export const CONTEST = {
  month: 'November 2026',
  closes: 'November 30, 2026',
  rules: [
    'Write the one thing most worth saying about freedom, the Constitution, or the right to keep and bear arms.',
    '280 letters or less. One entry per member each month.',
    'One vote per verified account. You cannot vote for yourself.',
    'The winner is printed in next month\'s newsletter.',
  ],
  entries: [],
};

export const IDEAS = [
  { t: 'Rough distance only, never an address', status: 'done' },
  { t: 'Deal steps with Lock It In and star ratings', status: 'done' },
  { t: 'No2\'s Library with Constitutional view notes', status: 'done' },
  { t: 'Install from the web, no app store', status: 'done' },
  { t: 'Real member accounts and sign-in', status: 'planned' },
  { t: 'Private, encrypted messages between members', status: 'planned' },
  { t: 'Monthly newsletter in the app', status: 'planned' },
  { t: 'Contest voting: one vote per verified account', status: 'planned' },
  { t: 'Local sponsor banners inside your distance, with weekly bidding', status: 'planned' },
  { t: 'Event calendar', status: 'planned' },
  { t: 'Range and class finder', status: 'planned' },
  { t: 'Phone alerts for Colorado law news', status: 'planned' },
];

/* The owner's rule. Shown on the Library and in the newsletter. */
export const LADDER = {
  title: 'The Constitutional Ladder',
  sub: 'Words to Live By',
  steps: [
    'Just because it’s a <b>rule</b> doesn’t make it a <b>policy</b>.',
    'Just because it’s a <b>policy</b> doesn’t make it a <b>law</b>.',
    'Just because it’s a <b>law</b> doesn’t make it <b>lawful</b>.',
    'And just because it’s <b>lawful</b> doesn’t make it <b>constitutional</b>.',
  ],
  credit: 'The founder of Colorado No2',
};
