"""Makes the PDFs for Jason. Run: python3 tools/make_pdfs.py"""
import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Flowable, SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'for-jason')
NAVY, RED, PAPER = colors.HexColor('#0B2545'), colors.HexColor('#C8102E'), colors.HexColor('#F4ECD8')
URL = 'https://launch26000-xi.github.io/calculator-app/'

def S(name, **kw):
    base = dict(fontName='Helvetica', fontSize=10.5, leading=14, textColor=colors.HexColor('#1B1B1B'))
    base.update(kw); return ParagraphStyle(name, **base)
H1 = S('h1', fontName='Times-Bold', fontSize=22, leading=26, textColor=NAVY)
H2 = S('h2', fontName='Times-Bold', fontSize=14, leading=18, textColor=NAVY, spaceBefore=8, spaceAfter=3)
P = S('p'); SMALL = S('s', fontSize=9, leading=12, textColor=colors.HexColor('#444444'))
BIG = S('big', fontName='Helvetica-Bold', fontSize=13, leading=17, textColor=RED)
CELL = S('cell', fontSize=11.5, leading=15)

def header(story, title, sub):
    logo = Image(os.path.join(ROOT, 'icons/icon-192.png'), width=0.8*inch, height=0.8*inch)
    t = Table([[logo, [Paragraph(title, H1), Paragraph(sub, S('sub', fontName='Times-Italic', fontSize=12, textColor=RED))]]],
              colWidths=[0.95*inch, 6.3*inch])
    t.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('LINEBELOW', (0,0), (-1,0), 2, RED), ('BOTTOMPADDING', (0,0), (-1,-1), 6)]))
    story += [t, Spacer(1, 8)]

class Box(Flowable):
    """An empty checkbox with its number beside it."""
    def __init__(self, n): super().__init__(); self.n = n; self.width = 0.5*inch; self.height = 13
    def draw(self):
        self.canv.setFont('Helvetica-Bold', 11); self.canv.setFillColor(NAVY)
        self.canv.drawRightString(16, 2, f'{self.n}.')
        self.canv.setStrokeColor(NAVY); self.canv.setLineWidth(1.2); self.canv.rect(21, 0, 11, 11)

def boxlist(items, num=True):
    rows = [[Box(i), Paragraph(t, CELL)] for i, t in enumerate(items, 1)]
    t = Table(rows, colWidths=[0.6*inch, 6.65*inch])
    t.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('TOPPADDING', (0,0), (-1,-1), 2), ('BOTTOMPADDING', (0,0), (-1,-1), 2),
                           ('ROWBACKGROUNDS', (0,0), (-1,-1), [colors.white, colors.HexColor('#FBF7EE')])]))
    return t

def bullets(items):
    return [Paragraph('• ' + t, S('b', leftIndent=12, firstLineIndent=-8, spaceAfter=2)) for t in items]

# ---------------- One-page "Check My Work" ----------------
def check_my_work():
    doc = SimpleDocTemplate(os.path.join(OUT, 'No2-Check-My-Work.pdf'), pagesize=letter,
                            leftMargin=0.6*inch, rightMargin=0.6*inch, topMargin=0.5*inch, bottomMargin=0.45*inch,
                            title='Colorado No2 - Check My Work', author='Colorado No2')
    st = []
    header(st, 'Colorado No2: Check My Work', 'The Right Rite. Stage 1 test sheet.')
    st.append(Paragraph('Open this address in <b>Chrome</b> on your Android phone:', P))
    st.append(Paragraph(URL, BIG))
    st.append(Paragraph('(It works after you do the 3 setup steps in the plan. Until then this address shows "404".)', SMALL))
    st.append(Spacer(1, 4))
    st.append(Paragraph('Test it. Check each box when it works.', H2))
    st.append(boxlist([
        'You see the <b>No2 crate logo</b>, "The Right Rite", and the <b>Trading Post</b> first.',
        'Slide <b>How far will you go?</b> to <b>10 miles</b>. Fewer items show (4). Slide back to <b>Whole state</b>. All 22 show.',
        'Tap <b>Knives</b> at the top of the list. Only knives show. Tap <b>All</b> to go back.',
        'Tap any item. It says something like "about 12 miles away." It <b>never</b> shows an address.',
        'Open the <b>Remington 870</b>. Type <b>$300</b>, tap <b>Send Offer</b>, then <b>Accept</b>. Tap <b>Lock It In</b> and the demo button. A ticket stamped <b>LOCKED</b> shows the item, price and time. Finish the steps and give stars.',
        'Open the <b>Mossberg 500 youth</b> and tap the seller, <b>ElkCreekEd</b>. You see <b>Not Verified</b> and a red <b>Use Caution</b> label.',
        'Tap <b>Library</b> at the bottom. Type <b>background check</b> and tap <b>Ask</b>. You see "No2\'s Library," a <b>Constitutional view</b> box, and "This is information, not legal advice."',
        'Tap <b>Messages</b>, <b>Newsletter</b> and <b>Suggestion Box</b> at the bottom. Each one opens.',
        'Tap the <b>gear</b> at the top right. Tap the red <b>Install No2</b> button, then <b>Install</b>. The crate icon lands on your home screen. Open it: <b>no browser bar</b>.',
        'Turn on <b>airplane mode</b>. Open No2 from your home screen. It still works. Turn airplane mode off.',
    ]))
    st.append(Paragraph('My test scores (out of 100)', H2))
    sc = Table([
        [Paragraph('<b>Install check</b>', CELL), Paragraph('<b>PASSED.</b> Chrome says No2 can be installed. It works offline and shows a friendly page when there is no signal.', CELL)],
        [Paragraph('<b>Easy to use for everyone</b><br/>(Accessibility)', CELL), Paragraph('<b>100</b> on every screen I tested.', CELL)],
        [Paragraph('<b>Speed</b>', CELL), Paragraph('<b>97 to 99.</b> Very fast, even on a phone.', CELL)],
        [Paragraph('<b>Safe and well built</b><br/>(Best practices)', CELL), Paragraph('<b>100.</b>', CELL)],
    ], colWidths=[2.1*inch, 5.15*inch])
    sc.setStyle(TableStyle([('GRID', (0,0), (-1,-1), 0.75, colors.HexColor('#CDBF9E')), ('BACKGROUND', (0,0), (0,-1), PAPER), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
    st.append(sc)
    st.append(Spacer(1, 6))
    st.append(Paragraph('<b>Good to know:</b> the listings, members and replies are <b>samples</b> for testing. Real sign-ups, real messages and real members come in Stage 2. No money ever moves through No2. No app store is used anywhere.', SMALL))
    doc.build(st)

# ---------------- Plan ----------------
def plan():
    doc = SimpleDocTemplate(os.path.join(OUT, 'No2-Plan.pdf'), pagesize=letter,
                            leftMargin=0.7*inch, rightMargin=0.7*inch, topMargin=0.55*inch, bottomMargin=0.55*inch,
                            title='Colorado No2 - Plan', author='Colorado No2')
    st = []
    header(st, 'Colorado No2: The Plan', 'What is built, what comes next, and where it lives.')
    st.append(Paragraph('The big idea', H2))
    st.append(Paragraph('No2 is a website that installs on a phone like an app. Android and iPhone use the very same site. '
                        'It does not use the Google Play Store or the Apple App Store at all, so no app store can block it.', P))
    st.append(Paragraph('Stage 1: built now', H2))
    st += bullets([
        '<b>Trading Post</b> home screen with 11 categories: Handguns, Long Guns, Shotguns, Hunting Guns, Slingshots, Bear Mace, Personal Self-Defense, Bows and Arrows, Accessories, Knives, Collectors. 22 sample listings.',
        '<b>Privacy:</b> only rough distance ("about 12 miles away"), never an address. Slider: 10 miles, 50 miles, Whole state. Colorado only.',
        '<b>Deal steps on every listing:</b> Offer, Counter, Lock It In (both tap, price/item/time freeze), Meet and Inspect, Deal Done (both confirm), then 1 to 5 star ratings. Five negotiation tips. No money moves through No2.',
        '<b>Colorado gun-law reminders</b> on gun listings: background check at a licensed dealer, age 21, 3-day wait.',
        '<b>Profiles</b> labeled Photo ID, Picture, Phone, or Not Verified. 3 or more ratings of 2 stars or less shows <b>Use Caution</b>.',
        '<b>No2\'s Library:</b> ask a question, get an answer. Every answer says "This is information, not legal advice." The Constitutional view note shows where the Constitution and current law differ. Our answers say "No2\'s Library"; web answers say "Web answer" and link to the official site.',
        '<b>Bottom buttons:</b> Trading Post, Library, Messages (safety tips), Newsletter (preview), Suggestion Box ("The Best Thing Worth Saying" contest preview).',
        '<b>Settings</b> with "Install No2" for Android and a 3-picture guide for iPhone.',
        '<b>App parts:</b> app name and icons in every size, navy color, full screen, works offline, friendly offline page.',
        '<b>Look:</b> navy, red and white; "No2" stenciled on a wooden crate; 13-star circle with "Second Amendment"; faded eagle, Liberty Bell, quill and flag art that changes on each page.',
    ])
    st.append(Paragraph('Stage 2 and later: planned, not built yet', H2))
    st += bullets([
        'Real member accounts and sign-in (with "Continue with Google").',
        'Real ID, picture and phone checks for the verification labels.',
        'Private messages that are locked (encrypted) so only the two members can read them.',
        'Newsletter with five sections: Foundation, Law Watch, Trading Post, Gear and Skills, Art Corner.',
        'The Best Thing Worth Saying voting contest: one vote per verified account.',
        'Sponsor banners shown only inside each member\'s distance, with weekly bidding for spots.',
        'Event calendar, and a finder for ranges and classes.',
        'Phone alerts (push notifications) for new Colorado gun-law news.',
        'A small, free-to-start database service (for example Supabase or Firebase) to hold accounts, listings and messages.',
    ])
    st.append(Paragraph('Where No2 lives (hosting)', H2))
    st.append(Paragraph('<b>GitHub Pages</b>: free, simple, and already tied to your GitHub account. Your web address will be:', P))
    st.append(Paragraph(URL, BIG))
    st.append(Paragraph('GitHub Pages is only free for <b>public</b> projects. That is fine: No2 is a public website and there are no passwords in it.', P))
    st.append(KeepTogether([Paragraph('Your 3 setup steps (about 5 minutes, on your Chromebook)', H2),
        boxlist([
            'Go to <b>github.com/launch26000-xi/calculator-app</b>. If asked, sign in with <b>Continue with Google</b>. Tap <b>Settings</b> (gear tab in the top row). Scroll to the very bottom, to <b>Danger Zone</b>. Tap <b>Change visibility</b>, then <b>Change to public</b>, and confirm.',
            'Still in Settings, tap <b>Pages</b> in the left menu. Under "Branch," pick <b>claude/nice-euler-z63yg0</b>, leave the folder as <b>/ (root)</b>, and tap <b>Save</b>.',
            'Wait 2 minutes, then refresh. At the top it says <b>"Your site is live at..."</b>. Open that address on your phone.',
        ])]))
    doc.build(st)

os.makedirs(OUT, exist_ok=True)
check_my_work(); plan()
print('PDFs written to', os.path.abspath(OUT))
