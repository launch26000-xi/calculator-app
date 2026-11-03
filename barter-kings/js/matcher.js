// Barter Kings — Smart Matcher (simple on-device version).
//
// This file is on its own on purpose: a smarter AI matcher can replace it later.
// Keep the same export: findMatches(myItems, otherItems, ctx) -> [{ mine, theirs, score, reasons, method, message }]
//
// Scoring idea (higher is better):
//   - Do they want my category (or are they "open to anything")?   up to +30
//   - Do I want their category (or am I "open to anything")?       up to +25
//   - Both sides want each other's stuff                          +15
//   - Conditions are close                                        up to +10
//   - Close enough to meet, or both will ship                     up to +20
//   - Either side open to adding cash                             +4
//   - Trust: well-rated owner +6, "Use Caution" owner -25

const COND = ['New', 'Like new', 'Good', 'Fair', 'For parts'];

function wantsCategory(item, category) {
  return item.openAny || (item.wants || []).includes(category);
}

function shortName(item) {
  const t = (item.title || '').trim();
  return t.length > 38 ? t.slice(0, 36) + '…' : t;
}

export function scorePair(mine, theirs, ctx) {
  const theyWant = wantsCategory(theirs, mine.category);
  const iWant = wantsCategory(mine, theirs.category);
  if (!theyWant && !iWant) return null;

  let score = 0;
  const reasons = [];

  if (theyWant) {
    const exact = (theirs.wants || []).includes(mine.category);
    score += exact ? 30 : 20;
    reasons.push(exact ? 'They are looking for this kind of item' : 'They said "open to anything"');
  }
  if (iWant) {
    const exact = (mine.wants || []).includes(theirs.category);
    score += exact ? 25 : 10;
    reasons.push(exact ? 'It is in a category you want' : 'You said "open to anything"');
  }
  if (theyWant && iWant) { score += 15; reasons.push('You both want what the other has'); }

  const diff = Math.abs(COND.indexOf(mine.condition) - COND.indexOf(theirs.condition));
  score += Math.max(0, 10 - diff * 4);
  if (diff === 0) reasons.push('Same condition');

  const miles = ctx.milesTo(theirs);
  let method = null;
  if (mine.meet && theirs.meet && miles <= 40) {
    method = 'meet';
    score += Math.max(5, 20 - miles / 2);
    reasons.push('Close enough to meet up');
  } else if (mine.ship && theirs.ship) {
    method = 'ship';
    score += 8;
    reasons.push('You both will ship');
  } else {
    return null; // no way to complete the trade
  }

  if (mine.cash || theirs.cash) score += 4;

  const owner = ctx.memberInfo(theirs.ownerId);
  if (owner.caution) { score -= 25; reasons.push('Owner has a Use Caution label'); }
  else if (owner.avg >= 4.5) { score += 6; reasons.push('Owner is well rated'); }

  return {
    mine, theirs, method, reasons,
    score: Math.round(score),
    message: `You might like trading your ${shortName(mine)} for this ${shortName(theirs)}`,
  };
}

export function findMatches(myItems, otherItems, ctx, limit = 20) {
  const best = new Map(); // one suggestion per item of theirs, using my best item for it
  for (const mine of myItems) {
    for (const theirs of otherItems) {
      if (theirs.ownerId === mine.ownerId) continue;
      const m = scorePair(mine, theirs, ctx);
      if (!m || m.score < 25) continue;
      const prev = best.get(theirs.id);
      if (!prev || m.score > prev.score) best.set(theirs.id, m);
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}
