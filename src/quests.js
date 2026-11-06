export function newQuestLedger(quests) {
  return {
    counts:{bumperHits:0,targetHits:0,rampRuns:0},
    completed:[],
    quests:quests.map(q=>({...q}))
  };
}
export function recordQuestEvent(ledger, kind) {
  if (!(kind in ledger.counts)) return [];
  ledger.counts[kind]++;
  const unlocked = [];
  for (const quest of ledger.quests) {
    if (!ledger.completed.includes(quest.id) && ledger.counts[quest.kind] >= quest.goal) {
      ledger.completed.push(quest.id);
      unlocked.push(quest);
    }
  }
  return unlocked;
}
