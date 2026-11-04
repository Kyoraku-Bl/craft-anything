import assert from 'node:assert/strict';
import { COURSES, COURSE_MAP } from '../src/data';
import { fushaGrammarUnits } from '../src/data/fushaCourse';
import { EXTRA_PRONUNCIATION_PHRASES } from '../src/data/pronunciationPhrases';
import { normalizeAnswer } from '../src/utils/sound';

assert.equal(COURSES.length, 5);
assert.equal(COURSE_MAP.fusha.ttsLang, 'ar-SA');
assert.deepEqual(fushaGrammarUnits.map(u => u.cefr), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
assert.equal(COURSE_MAP.fusha.units.length, 6);
assert.equal(EXTRA_PRONUNCIATION_PHRASES.filter(p => p.courseId === 'fusha').length, 12);
for (const unit of fushaGrammarUnits) {
  assert.equal(unit.items.length, 12);
  assert.equal(unit.grammarNotes.length, 5);
  for (const item of unit.items) {
    assert(item.blankWord && item.target.includes(item.blankWord), item.key);
    assert.equal(new Set([item.blankWord, ...(item.blankDistractors || [])]).size, 4, item.key);
    for (const lang of ['ar', 'fr', 'en'] as const) assert(item.meaning[lang] && item.tip[lang], `${item.key}: ${lang}`);
  }
}
for (const unit of COURSE_MAP.fusha.units) {
  assert.equal(unit.nodes.length, 9);
  const exercises = unit.nodes.flatMap(n => n.exercises);
  assert(exercises.some(e => e.type === 'speaking'));
  assert(exercises.some(e => e.type === 'fill_blank'));
  for (const e of exercises.filter(e => e.type === 'fill_blank')) {
    assert(e.sentenceWithBlank?.includes('____'), e.id);
    assert(e.options?.some(o => o.id === e.correctAnswer), e.id);
    assert.equal(new Set(e.options?.map(o => o.id)).size, e.options?.length, e.id);
  }
}
assert.equal(normalizeAnswer('الْعِلْمُ'), normalizeAnswer('العلم'));
console.log('Fusha curriculum, exercise options, translations and pronunciation normalization: OK');
