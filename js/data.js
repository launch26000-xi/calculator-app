/* Colorado No2 — app settings and fixed text. No sample members or listings: real data lives in the member database. */

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

/* How a member proved who they are. Set only by No2 staff after checking. */
export const VERIFY = {
  photoid: { label: 'Photo ID Verified', short: 'Photo ID', how: 'Showed a government photo ID to No2 staff that matched their face. The strongest check.' },
  picture: { label: 'Picture Verified', short: 'Picture', how: 'Sent No2 staff a live picture that matched their profile.' },
  phone: { label: 'Phone Verified', short: 'Phone', how: 'Confirmed a real phone number with No2 staff.' },
  none: { label: 'Not Verified', short: 'Not Verified', how: 'Has not verified yet. Be extra careful.' },
};

export const NEGOTIATION_TIPS = [
  { t: 'Know the going price', d: 'Look at a few similar listings before you make an offer.' },
  { t: 'Start fair', d: 'A fair first offer gets a friendly answer. A silly-low one ends the talk.' },
  { t: 'Ask before you offer', d: 'Ask about condition, how much it was used, and what comes with it.' },
  { t: 'Put it in writing', d: '“Lock It In” freezes the price, the item and the time so nobody forgets.' },
  { t: 'Be ready to walk away', d: 'A polite “No thanks” is always okay. There will be other deals.' },
];

export const NOT_ADVICE = 'This is information, not legal advice.';
export const CONST_VIEW = 'Constitutional view: this reflects the Constitution, but current law may differ, and police and courts enforce current law.';

export const SAFETY_TIPS = [
  { t: 'Use a nickname.', d: 'Don’t use your full real name on No2.' },
  { t: 'Never share your home address.', d: 'Meet at a gun shop or a police “safe exchange” spot instead.' },
  { t: 'Strip location data from photos.', d: 'Phones can hide your location inside a picture. On Android, open the Camera app, tap Settings, and turn off “Location tags.” In Google Photos, choose “Remove location” before you share.' },
  { t: 'Never send money ahead.', d: 'No money moves through No2. Pay in person, after you inspect.' },
  { t: 'Trust your gut.', d: 'If something feels wrong, walk away and tell No2 staff.' },
];

export const CONTEST = {
  name: 'The Best Thing Worth Saying',
  rules: [
    'Write the one thing most worth saying about freedom, the Constitution, or the right to keep and bear arms.',
    '280 letters or less. One entry per member each month.',
    'Choose to be credited by nickname, or stay anonymous.',
    'One vote per verified member each month. You can’t vote for your own entry.',
    'Entries are ranked by votes. The winner is printed in the next newsletter.',
  ],
  prizes: ['No2 merch', 'Holsters', 'Metal poster art'],
};

export const SPONSOR_LEVELS = [
  { id: '50', price: 50, name: 'Supporter', perks: ['Your business listed on the No2 Sponsors page', 'A thank-you in the monthly newsletter'] },
  { id: '150', price: 150, name: 'Partner', perks: ['Everything in Supporter', 'A banner shown to members near your business', 'Your events added to the No2 calendar'] },
  { id: '300', price: 300, name: 'Champion', perks: ['Everything in Partner', 'A banner shown to members statewide', 'One featured spot in the newsletter each month'] },
];

export const MEMBER_RULES = [
  'No money moves through No2. Settle up in person, after you inspect.',
  'Follow Colorado and federal law. Gun sales and trades go through a licensed dealer for a background check.',
  'No illegal items, like magazines over 15 rounds.',
  'Meet in public. Never share your home address.',
  'Be honest. Members with 3 or more ratings of 2 stars or less get a “Use Caution” label.',
];
