/* Colorado No2 — Foundation lessons. Real history, real sources. One lesson per day. */

const SRC = {
  billOfRights: { label: 'National Archives: Bill of Rights (transcript)', url: 'https://www.archives.gov/founding-docs/bill-of-rights-transcript' },
  constitution: { label: 'National Archives: U.S. Constitution (transcript)', url: 'https://www.archives.gov/founding-docs/constitution-transcript' },
  declaration: { label: 'National Archives: Declaration of Independence (transcript)', url: 'https://www.archives.gov/founding-docs/declaration-transcript' },
  vaDeclaration: { label: 'National Archives: Virginia Declaration of Rights (1776)', url: 'https://www.archives.gov/founding-docs/virginia-declaration-of-rights' },
  fed29: { label: 'Federalist No. 29 (Hamilton), Yale Avalon Project', url: 'https://avalon.law.yale.edu/18th_century/fed29.asp' },
  fed45: { label: 'Federalist No. 45 (Madison), Yale Avalon Project', url: 'https://avalon.law.yale.edu/18th_century/fed45.asp' },
  fed46: { label: 'Federalist No. 46 (Madison), Yale Avalon Project', url: 'https://avalon.law.yale.edu/18th_century/fed46.asp' },
  fed84: { label: 'Federalist No. 84 (Hamilton), Yale Avalon Project', url: 'https://avalon.law.yale.edu/18th_century/fed84.asp' },
  madison629: { label: 'Madison’s notes, Constitutional Convention, June 29, 1787 (Avalon Project)', url: 'https://avalon.law.yale.edu/18th_century/debates_629.asp' },
  heller: { label: 'District of Columbia v. Heller, 554 U.S. 570 (2008), U.S. Supreme Court opinion', url: 'https://www.supremecourt.gov/opinions/07pdf/07-290.pdf' },
  mcdonald: { label: 'McDonald v. City of Chicago, 561 U.S. 742 (2010), U.S. Supreme Court opinion', url: 'https://www.supremecourt.gov/opinions/09pdf/08-1521.pdf' },
  bruen: { label: 'New York State Rifle & Pistol Assn. v. Bruen, 597 U.S. 1 (2022), U.S. Supreme Court opinion', url: 'https://www.supremecourt.gov/opinions/21pdf/20-843_7j80.pdf' },
  printz: { label: 'Printz v. United States, 521 U.S. 898 (1997) (Justia)', url: 'https://supreme.justia.com/cases/federal/us/521/898/' },
  milligan: { label: 'Ex parte Milligan, 71 U.S. 2 (1866) (Justia)', url: 'https://supreme.justia.com/cases/federal/us/71/2/' },
  coConst: { label: 'Colorado General Assembly: Colorado Constitution', url: 'https://leg.colorado.gov/colorado-constitution' },
  usc246: { label: '10 U.S. Code § 246: Militia (Office of the Law Revision Counsel)', url: 'https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title10-section246&num=0&edition=prelim' },
};

export const LESSONS = [
  {
    id: 'well-regulated', date: '2026-10-23',
    title: 'What “well regulated” meant in 1791',
    summary: 'In 1791, “well regulated” meant well trained and in good working order, not “controlled by government rules.”',
    body: [
      'The Second Amendment says: “A well regulated Militia, being necessary to the security of a free State, the right of the people to keep and bear Arms, shall not be infringed.”',
      'Today, “regulated” often makes people think of rules and permits. In the 1700s, the phrase “well regulated” described something that worked the way it should. A well-regulated clock kept good time. A well-regulated militia was trained, disciplined, and ready.',
      'Alexander Hamilton wrote in Federalist No. 29 about how much drilling it would take for ordinary citizens “to acquire the degree of perfection which would entitle them to the character of a well-regulated militia.” He was talking about skill and training.',
      'The Supreme Court said the same thing in 2008: “the adjective ‘well-regulated’ implies nothing more than the imposition of proper discipline and training.”',
      'The first half of the amendment explains a purpose. The second half protects the right, and it belongs to “the people.”',
    ],
    sources: [SRC.billOfRights, SRC.fed29, SRC.heller],
  },
  {
    id: 'militia-citizens', date: '2026-10-24',
    title: 'The militia meant ordinary citizens',
    summary: 'To the founders, the militia was the people themselves, not a government army.',
    body: [
      'At Virginia’s convention to approve the Constitution in 1788, George Mason asked: “Who are the militia? They consist now of the whole people, except a few public officers.”',
      'Virginia’s Declaration of Rights (1776) said “a well regulated militia, composed of the body of the people, trained to arms, is the proper, natural, and safe defence of a free state.”',
      'The first federal Militia Act, in 1792, called on “every free able-bodied white male citizen” ages 18 to 45 to enroll and to bring his own musket or rifle. (The racial limit was a wrong of its time that later laws removed.) The militia was everyday people with their own arms.',
      'Federal law still has an “unorganized militia.” Under 10 U.S. Code § 246, it includes able-bodied men ages 17 to 45 (and certain others) who are not in the National Guard or Naval Militia.',
      'In Heller (2008), the Supreme Court said the militia of the founding era “comprised all males physically capable of acting in concert for the common defense.”',
    ],
    sources: [SRC.vaDeclaration, SRC.usc246, SRC.heller],
  },
  {
    id: 'federalist-46', date: '2026-10-25',
    title: 'Madison’s promise in Federalist No. 46',
    summary: 'James Madison told Americans an armed people and strong states could check a federal government that went too far.',
    body: [
      'In 1788, people worried the new federal government might use an army against its own citizens. James Madison answered them in Federalist No. 46.',
      'He pointed to “the advantage of being armed, which the Americans possess over the people of almost every other nation.” He said any federal army would face “a militia amounting to near half a million of citizens with arms in their hands, officered by men chosen from among themselves.”',
      'Madison also described a peaceful way for states to resist unpopular federal actions: the people’s “refusal to co-operate with the officers of the Union.”',
      'That idea, that states do not have to help carry out federal programs, became a legal rule the Supreme Court has upheld. It is often called the “anti-commandeering doctrine.” (See the Tenth Amendment lesson.)',
    ],
    sources: [SRC.fed46, SRC.printz],
  },
  {
    id: 'heller', date: '2026-10-26',
    title: 'District of Columbia v. Heller (2008)',
    summary: 'The Supreme Court ruled the Second Amendment protects an individual right to keep a handgun at home for self-defense.',
    body: [
      'Washington, D.C. banned handguns in the home and required other guns at home to be taken apart or locked. Dick Heller, a security guard, sued.',
      'In a 5 to 4 decision written by Justice Antonin Scalia, the Supreme Court ruled for Heller. The Court said the Second Amendment protects an individual right to keep and bear arms. That right does not depend on being in a militia.',
      'The Court called the handgun “the quintessential self-defense weapon” and said a ban on handguns in the home went too far.',
      'The Court also said the right is not unlimited, and it listed some kinds of laws it was not questioning at the time, such as bans on possession by felons.',
    ],
    sources: [SRC.heller],
  },
  {
    id: 'mcdonald', date: '2026-10-27',
    title: 'McDonald v. City of Chicago (2010)',
    summary: 'The Supreme Court ruled the Second Amendment protects you from state and city governments too.',
    body: [
      'After Heller, a question remained. Heller involved Washington, D.C., which is run by the federal government. Did the Second Amendment also limit states and cities?',
      'Chicago had a handgun ban. Otis McDonald, a retired man who wanted a handgun to protect his home in a high-crime area, sued.',
      'In 2010 the Supreme Court ruled 5 to 4 that the Fourteenth Amendment applies the Second Amendment to state and local governments. Justice Samuel Alito wrote that the right to keep and bear arms is “fundamental to our scheme of ordered liberty.”',
      'Justice Clarence Thomas agreed with the result but gave a different reason. He said it comes from the Fourteenth Amendment’s “privileges or immunities” clause.',
    ],
    sources: [SRC.mcdonald],
  },
  {
    id: 'bruen', date: '2026-10-28',
    title: 'New York State Rifle & Pistol Assn. v. Bruen (2022)',
    summary: 'The Supreme Court ruled the right to bear arms reaches outside the home, and gun laws must fit the nation’s historical tradition.',
    body: [
      'New York only gave carry licenses to people who could prove “proper cause,” meaning a special need for self-defense beyond what ordinary people have.',
      'In a 6 to 3 decision written by Justice Clarence Thomas, the Supreme Court struck down that requirement. It said ordinary, law-abiding citizens have a right to carry a handgun in public for self-defense.',
      'Bruen also set the test courts must use. The government has to show a gun law “is consistent with this Nation’s historical tradition of firearm regulation.” Courts look at the text of the amendment and at history.',
      'In United States v. Rahimi (2024), the Court used this test and upheld a federal law that disarms people under certain domestic-violence restraining orders. The Court said a modern law does not need a “historical twin,” just a fitting historical match.',
    ],
    sources: [SRC.bruen],
  },
  {
    id: 'colorado-art-2-13', date: '2026-10-29',
    title: 'Colorado’s own guarantee: Article II, Section 13',
    summary: 'Colorado’s constitution has protected the right to keep and bear arms since statehood in 1876.',
    body: [
      'When Colorado became a state in 1876, its constitution included this: “The right of no person to keep and bear arms in defense of his home, person and property, or in aid of the civil power when thereto legally summoned, shall be called in question; but nothing herein contained shall be construed to justify the practice of carrying concealed weapons.”',
      'Notice the strong words: “shall be called in question.” It names three things you may defend: your home, your person, and your property.',
      'The last part says the section does not, by itself, protect carrying hidden weapons. That is why Colorado law treats concealed carry separately and uses a permit system.',
      'Colorado courts have ruled that state laws must be a “reasonable exercise” of government power when they limit this right (Robertson v. City and County of Denver, 1994). Many people believe the right deserves stronger protection than that.',
    ],
    constitutional: true,
    sources: [SRC.coConst],
  },
  {
    id: 'tenth-amendment', date: '2026-10-30',
    title: 'The Tenth Amendment and the power of the states',
    summary: 'The federal government has only the powers the Constitution gives it. The rest belong to the states or the people.',
    body: [
      'The Tenth Amendment says: “The powers not delegated to the United States by the Constitution, nor prohibited by it to the States, are reserved to the States respectively, or to the people.”',
      'James Madison explained it in Federalist No. 45: “The powers delegated by the proposed Constitution to the federal government are few and defined. Those which are to remain in the State governments are numerous and indefinite.”',
      'In Printz v. United States (1997), two sheriffs (Jay Printz of Montana and Richard Mack of Arizona) challenged part of the Brady Act that ordered local sheriffs to run background checks. The Supreme Court agreed with them. Justice Scalia wrote that the federal government may not “command the States’ officers … to administer or enforce a federal regulatory program.”',
      'This is the “anti-commandeering doctrine.” It means a state or county can choose not to help enforce a federal program.',
    ],
    sources: [SRC.billOfRights, SRC.fed45, SRC.printz],
  },
  {
    id: 'habeas-corpus', date: '2026-10-31',
    title: 'Habeas corpus: “you shall have the body”',
    summary: 'Habeas corpus lets a jailed person make the government prove in court that it has a lawful reason to hold them.',
    body: [
      '“Habeas corpus” is Latin for “you shall have the body.” It is an order that makes a jailer bring a prisoner before a judge and show a lawful reason for holding them. Without it, a government could lock people up and never explain why.',
      'The U.S. Constitution, Article I, Section 9, says: “The Privilege of the Writ of Habeas Corpus shall not be suspended, unless when in Cases of Rebellion or Invasion the public Safety may require it.”',
      'Alexander Hamilton wrote in Federalist No. 84 that protecting habeas corpus and banning ex post facto laws were “perhaps greater securities to liberty and republicanism” than anything else in the Constitution.',
      'In Ex parte Milligan (1866), the Supreme Court ruled that a civilian could not be tried by a military court where the regular courts were open and working.',
      'Colorado’s constitution protects it too (Article II, Section 21).',
    ],
    sources: [SRC.constitution, SRC.fed84, SRC.milligan, SRC.coConst],
  },
  {
    id: 'standing-armies', date: '2026-11-01',
    title: 'The founders’ warning about standing armies',
    summary: 'The founders feared a permanent army in peacetime and trusted an armed citizenry instead.',
    body: [
      'One of the complaints against King George III in the Declaration of Independence was: “He has kept among us, in times of peace, Standing Armies without the Consent of our legislatures.”',
      'Virginia’s Declaration of Rights (1776) said “standing armies, in time of peace, should be avoided as dangerous to liberty.”',
      'At the Constitutional Convention on June 29, 1787, James Madison warned: “A standing military force, with an overgrown Executive will not long be safe companions to liberty.”',
      'The Constitution built in a check. Congress may raise armies, but “no Appropriation of Money to that Use shall be for a longer Term than two Years” (Article I, Section 8). The Third Amendment also bars quartering soldiers in private homes in peacetime without the owner’s consent.',
      'That is the link to the Second Amendment: a free people who keep their own arms do not need to fear a standing army.',
    ],
    sources: [SRC.declaration, SRC.vaDeclaration, SRC.madison629, SRC.constitution],
  },
];

/* "The Pyramid": the owner's words to live by. Top to bottom. */
export const PYRAMID = [
  { label: 'A RULE', bricks: 1 },
  { label: 'A POLICY', bricks: 2 },
  { label: 'A PROCEDURE', bricks: 3 },
  { label: 'A STATUTE', bricks: 5 },
  { label: 'A LAW', bricks: 8 },
  { label: 'LAWFUL', bricks: 10 },
  { label: 'THE CONSTITUTION', bricks: 100, sub: 'The Supreme Law of the Land' },
];
export const PYRAMID_LINE = 'These are words to live by.';
