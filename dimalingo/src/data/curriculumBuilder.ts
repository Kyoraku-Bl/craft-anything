import { CEFR_LABELS } from '../i18n';
import {
  CEFRLevel,
  CourseId,
  Exercise,
  LocalizedText,
  Unit,
} from '../types';

export interface VocabEntry {
  key: string;
  target: string;
  altTargets?: string[];
  meaning: LocalizedText;
  pronunciation?: string;
  tip: LocalizedText;
  blankWord?: string;
  blankDistractors?: string[];
}

export interface UnitInput {
  cefr: CEFRLevel;
  number: number;
  themeColor: 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'teal';
  title: LocalizedText;
  description: LocalizedText;
  grammarNotes: LocalizedText[];
  items: VocabEntry[];
}

function tokenizeTarget(sentence: string): string[] {
  return sentence
    .replace(/[.,!?;:¡¿«»"']/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function buildSelectExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry,
  pool: VocabEntry[]
): Exercise {
  const distractors = pool.filter((p) => p.key !== item.key).slice(0, 3);
  return {
    id,
    type: 'select_meaning',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    prompt: {
      ar: `شنو كتعني هاد العبارة؟ (${cefr})`,
      fr: `Que signifie cette expression ? (${cefr})`,
      en: `What does this expression mean? (${cefr})`,
    },
    correctAnswer: 'opt_correct',
    options: [
      { id: 'opt_correct', label: item.meaning },
      ...distractors.map((d, idx) => ({
        id: `opt_d_${idx}`,
        label: d.meaning,
      })),
    ],
    grammarTip: item.tip,
  };
}

function buildReverseSelectExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry,
  pool: VocabEntry[]
): Exercise {
  const distractors = pool.filter((p) => p.key !== item.key).slice(0, 3);
  return {
    id,
    type: 'reverse_select',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    prompt: {
      ar: `كيفاش كنقولو هاد المعنى؟ (${cefr})`,
      fr: `Comment exprimer cette idée ? (${cefr})`,
      en: `How do you express this meaning? (${cefr})`,
    },
    correctAnswer: 'opt_correct',
    options: [
      { id: 'opt_correct', label: item.target, tts: item.target },
      ...distractors.map((d, idx) => ({
        id: `opt_rev_${idx}`,
        label: d.target,
        tts: d.target,
      })),
    ],
    grammarTip: item.tip,
  };
}

function buildListeningExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry,
  pool: VocabEntry[]
): Exercise {
  const distractors = pool.filter((p) => p.key !== item.key).slice(0, 3);
  return {
    id,
    type: 'listening',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    prompt: {
      ar: 'اسمع مزيان واختار الجملة اللي سمعتيها:',
      fr: 'Écoutez attentivement et choisissez la phrase entendue :',
      en: 'Listen carefully and pick what you heard:',
    },
    correctAnswer: 'opt_correct',
    options: [
      { id: 'opt_correct', label: item.target, tts: item.target },
      ...distractors.map((d, idx) => ({
        id: `opt_l_${idx}`,
        label: d.target,
        tts: d.target,
      })),
    ],
    grammarTip: item.tip,
  };
}

function buildSpeakingExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry
): Exercise {
  return {
    id,
    type: 'speaking',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    acceptedSpokenVariants: item.altTargets,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    prompt: {
      ar: `🎙️ انطق هاد الجملة بصوت واضح فالمايكروفون (${cefr}):`,
      fr: `🎙️ Prononcez cette phrase au microphone (${cefr}) :`,
      en: `🎙️ Speak this sentence aloud into your microphone (${cefr}):`,
    },
    grammarTip: item.tip,
  };
}

function buildWordBankExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry,
  pool: VocabEntry[]
): Exercise {
  const correctTokens = tokenizeTarget(item.target);
  const otherWords = pool
    .filter((p) => p.key !== item.key)
    .flatMap((p) => tokenizeTarget(p.target))
    .filter((w) => !correctTokens.includes(w))
    .slice(0, 3);

  const bank = [...correctTokens, ...otherWords];

  return {
    id,
    type: 'word_bank',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    isTargetWordBank: true,
    prompt: {
      ar: 'ركّب الجملة الصحيحة انطلاقاً من المعنى:',
      fr: 'Construisez la phrase correspondant à ce sens :',
      en: 'Build the sentence matching this meaning:',
    },
    correctTokenSequence: correctTokens,
    wordBankTokens: bank,
    grammarTip: item.tip,
  };
}

function buildFillBlankExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  item: VocabEntry,
  pool: VocabEntry[]
): Exercise {
  const words = tokenizeTarget(item.target);
  const chosenWord =
    item.blankWord ||
    words.reduce((longest, w) => (w.length > longest.length ? w : longest), words[0] || item.target);

  const escaped = chosenWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blanked = item.target.replace(new RegExp(escaped, 'i'), '____');
  const sentenceWithBlank = blanked.includes('____') ? blanked : `____ (${item.meaning.en})`;

  const extraWords =
    item.blankDistractors ||
    pool
      .filter((p) => p.key !== item.key)
      .map((p) => {
        const pw = tokenizeTarget(p.target);
        return pw[Math.min(1, pw.length - 1)] || pw[0] || p.target;
      })
      .filter((w) => w.toLowerCase() !== chosenWord.toLowerCase())
      .slice(0, 3);

  return {
    id,
    type: 'fill_blank',
    cefr,
    vocabKey: item.key,
    targetText: item.target,
    phoneticHint: item.pronunciation,
    ttsLang,
    correctMeaning: item.meaning,
    prompt: {
      ar: 'كمّل الجملة بالكلمة المناسبة للسياق:',
      fr: 'Complétez la phrase avec le mot approprié :',
      en: 'Complete the sentence with the fitting word:',
    },
    sentenceWithBlank,
    correctAnswer: chosenWord,
    options: [
      { id: chosenWord, label: chosenWord, tts: chosenWord },
      ...extraWords.slice(0, 3).map((w, idx) => ({
        id: `${w}_${idx}`,
        label: w,
        tts: w,
      })),
    ],
    grammarTip: item.tip,
  };
}

function buildMatchExercise(
  id: string,
  cefr: CEFRLevel,
  ttsLang: string,
  items: VocabEntry[]
): Exercise {
  return {
    id,
    type: 'match_pairs',
    cefr,
    ttsLang,
    prompt: {
      ar: `اربط كل عبارة بالمعنى الصحيح ديالها (${cefr}):`,
      fr: `Associez chaque expression à son sens (${cefr}) :`,
      en: `Match each expression with its meaning (${cefr}):`,
    },
    pairs: items.slice(0, 5).map((it) => ({
      id: it.key,
      target: it.target,
      meaning: it.meaning,
    })),
    grammarTip: {
      ar: 'مراجعة المترادفات فدفعة وحدة كتقوّي سرعة الاستحضار فالمحادثة الحقيقية.',
      fr: 'Associer les expressions accélère le rappel spontané à l’oral.',
      en: 'Rapid association builds instant recall speed in real conversations.',
    },
  };
}

export function buildCEFRCurriculum(
  courseId: CourseId,
  ttsLang: string,
  unitInputs: UnitInput[]
): Unit[] {
  return unitInputs.map((u) => {
    const items = u.items;
    const n = items.length;
    const at = (i: number) => items[((i % n) + n) % n];

    const group1 = [at(0), at(1), at(2), at(3)];
    const group2 = [at(3), at(4), at(5), at(6)];
    const group3 = [at(6), at(7), at(8), at(9)];
    const group4 = [at(8), at(9), at(10), at(11)];

    return {
      id: `${courseId}_u${u.number}_${u.cefr.toLowerCase()}`,
      number: u.number,
      cefr: u.cefr,
      cefrTitle: CEFR_LABELS[u.cefr],
      themeColor: u.themeColor,
      title: u.title,
      description: u.description,
      grammarNotes: u.grammarNotes,
      guidePhrases: items.map((it) => ({
        target: it.target,
        meaning: it.meaning,
        pronunciation: it.pronunciation,
      })),
      nodes: [
        // Node 1: Lesson 1 — Core Foundations (8 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_n1`,
          type: 'lesson',
          cefr: u.cefr,
          icon: '📘',
          title: {
            ar: `${u.cefr} • الدرس 1: المفردات المفتاحية`,
            fr: `${u.cefr} • Leçon 1 : Bases clés`,
            en: `${u.cefr} • Lesson 1: Core Vocabulary`,
          },
          subtitle: {
            ar: '8 تمارين متنوعة • فهم، سماع وتركيب',
            fr: '8 exercices variés • Compréhension & écoute',
            en: '8 varied exercises • Meaning, audio & recall',
          },
          xpReward: 20,
          gemReward: 12,
          exercises: [
            buildSelectExercise(`${courseId}_${u.cefr}_1_1`, u.cefr, ttsLang, group1[0], items),
            buildSelectExercise(`${courseId}_${u.cefr}_1_2`, u.cefr, ttsLang, group1[1], items),
            buildListeningExercise(`${courseId}_${u.cefr}_1_3`, u.cefr, ttsLang, group1[0], items),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_1_4`, u.cefr, ttsLang, group1[2], items),
            buildWordBankExercise(`${courseId}_${u.cefr}_1_5`, u.cefr, ttsLang, group1[1], items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_1_6`, u.cefr, ttsLang, group1[3], items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_1_7`, u.cefr, ttsLang, group1[2]),
            buildMatchExercise(`${courseId}_${u.cefr}_1_8`, u.cefr, ttsLang, [
              group1[0],
              group1[1],
              group1[2],
              group1[3],
              at(4),
            ]),
          ],
        },

        // Node 2: Lesson 2 — Context & Sentence Building (8 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_n2`,
          type: 'lesson',
          cefr: u.cefr,
          icon: '🧩',
          title: {
            ar: `${u.cefr} • الدرس 2: بناء الجمل والسياق`,
            fr: `${u.cefr} • Leçon 2 : Phrases en contexte`,
            en: `${u.cefr} • Lesson 2: Sentences in Context`,
          },
          subtitle: {
            ar: '8 تمارين • تركيب جمل وقواعد تطبيقية',
            fr: '8 exercices • Construction & grammaire',
            en: '8 exercises • Sentence building & cloze',
          },
          xpReward: 22,
          gemReward: 14,
          exercises: [
            buildSelectExercise(`${courseId}_${u.cefr}_2_1`, u.cefr, ttsLang, group2[1], items),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_2_2`, u.cefr, ttsLang, group2[2], items),
            buildListeningExercise(`${courseId}_${u.cefr}_2_3`, u.cefr, ttsLang, group2[1], items),
            buildWordBankExercise(`${courseId}_${u.cefr}_2_4`, u.cefr, ttsLang, group2[2], items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_2_5`, u.cefr, ttsLang, group2[3], items),
            buildWordBankExercise(`${courseId}_${u.cefr}_2_6`, u.cefr, ttsLang, group2[0], items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_2_7`, u.cefr, ttsLang, group2[3]),
            buildMatchExercise(`${courseId}_${u.cefr}_2_8`, u.cefr, ttsLang, [
              group2[0],
              group2[1],
              group2[2],
              group2[3],
              at(7),
            ]),
          ],
        },

        // Node 3: Speaking Focus 1 (6 speaking + audio exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_speak_1`,
          type: 'speaking_focus',
          cefr: u.cefr,
          icon: '🎙️',
          title: {
            ar: `${u.cefr} • ورشة النطق 1 (بالمايكروفون)`,
            fr: `${u.cefr} • Atelier Prononciation 1`,
            en: `${u.cefr} • Speaking Workshop 1 (Mic)`,
          },
          subtitle: {
            ar: '6 تمارين صوتية • تقييم النطق المباشر',
            fr: '6 exercices vocaux • Score de prononciation',
            en: '6 voice drills • Live pronunciation scoring',
          },
          xpReward: 25,
          gemReward: 16,
          exercises: [
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp1_1`, u.cefr, ttsLang, at(0)),
            buildListeningExercise(`${courseId}_${u.cefr}_sp1_2`, u.cefr, ttsLang, at(1), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp1_3`, u.cefr, ttsLang, at(2)),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp1_4`, u.cefr, ttsLang, at(4)),
            buildListeningExercise(`${courseId}_${u.cefr}_sp1_5`, u.cefr, ttsLang, at(5), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp1_6`, u.cefr, ttsLang, at(5)),
          ],
        },

        // Node 4: Lesson 3 — Advanced Expressions (8 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_n3`,
          type: 'lesson',
          cefr: u.cefr,
          icon: '💬',
          title: {
            ar: `${u.cefr} • الدرس 3: تعابير المحادثة`,
            fr: `${u.cefr} • Leçon 3 : Expressions courantes`,
            en: `${u.cefr} • Lesson 3: Conversational Flow`,
          },
          subtitle: {
            ar: '8 تمارين • سرعة البديهة والاستماع',
            fr: '8 exercices • Fluidité & compréhension',
            en: '8 exercises • Conversational fluency',
          },
          xpReward: 22,
          gemReward: 14,
          exercises: [
            buildSelectExercise(`${courseId}_${u.cefr}_3_1`, u.cefr, ttsLang, group3[0], items),
            buildSelectExercise(`${courseId}_${u.cefr}_3_2`, u.cefr, ttsLang, group3[1], items),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_3_3`, u.cefr, ttsLang, group3[2], items),
            buildListeningExercise(`${courseId}_${u.cefr}_3_4`, u.cefr, ttsLang, group3[3], items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_3_5`, u.cefr, ttsLang, group3[1], items),
            buildWordBankExercise(`${courseId}_${u.cefr}_3_6`, u.cefr, ttsLang, group3[2], items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_3_7`, u.cefr, ttsLang, group3[0]),
            buildMatchExercise(`${courseId}_${u.cefr}_3_8`, u.cefr, ttsLang, [
              group3[0],
              group3[1],
              group3[2],
              group3[3],
              at(10),
            ]),
          ],
        },

        // Node 5: Mid-Unit Reward Chest
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_chest`,
          type: 'chest',
          cefr: u.cefr,
          icon: '🎁',
          title: {
            ar: `صندوق مكافأة منتصف ${u.cefr}`,
            fr: `Coffre Bonus ${u.cefr}`,
            en: `${u.cefr} Mid-Unit Bonus Chest`,
          },
          subtitle: {
            ar: '+35 جوهرة مجانية على مواظبتك!',
            fr: '+35 gemmes gratuites !',
            en: '+35 Free Gems for staying consistent!',
          },
          xpReward: 15,
          gemReward: 35,
          exercises: [],
        },

        // Node 6: Lesson 4 — Deep Nuance & Grammar Mastery (8 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_n4`,
          type: 'lesson',
          cefr: u.cefr,
          icon: '⚡',
          title: {
            ar: `${u.cefr} • الدرس 4: الدقة اللغوية والقواعد`,
            fr: `${u.cefr} • Leçon 4 : Précision & Grammaire`,
            en: `${u.cefr} • Lesson 4: Nuance & Grammar`,
          },
          subtitle: {
            ar: '8 تمارين • إتقان التراكيب الدقيقة',
            fr: '8 exercices • Maîtrise grammaticale',
            en: '8 exercises • Precision & active production',
          },
          xpReward: 25,
          gemReward: 15,
          exercises: [
            buildSelectExercise(`${courseId}_${u.cefr}_4_1`, u.cefr, ttsLang, group4[2], items),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_4_2`, u.cefr, ttsLang, group4[3], items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_4_3`, u.cefr, ttsLang, group4[2], items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_4_4`, u.cefr, ttsLang, group4[3], items),
            buildListeningExercise(`${courseId}_${u.cefr}_4_5`, u.cefr, ttsLang, group4[1], items),
            buildWordBankExercise(`${courseId}_${u.cefr}_4_6`, u.cefr, ttsLang, group4[3], items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_4_7`, u.cefr, ttsLang, group4[2]),
            buildMatchExercise(`${courseId}_${u.cefr}_4_8`, u.cefr, ttsLang, [
              group4[0],
              group4[1],
              group4[2],
              group4[3],
              at(0),
            ]),
          ],
        },

        // Node 7: Speaking Focus 2 — Advanced Fluency (6 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_speak_2`,
          type: 'speaking_focus',
          cefr: u.cefr,
          icon: '🎙️',
          title: {
            ar: `${u.cefr} • ورشة الطلاقة الصوتية 2`,
            fr: `${u.cefr} • Atelier Fluidité Orale 2`,
            en: `${u.cefr} • Fluency Mic Lab 2`,
          },
          subtitle: {
            ar: '6 جمل متقدمة بالمايكروفون',
            fr: '6 phrases avancées au micro',
            en: '6 full-sentence pronunciation challenges',
          },
          xpReward: 28,
          gemReward: 18,
          exercises: [
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp2_1`, u.cefr, ttsLang, at(6)),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp2_2`, u.cefr, ttsLang, at(7)),
            buildListeningExercise(`${courseId}_${u.cefr}_sp2_3`, u.cefr, ttsLang, at(8), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp2_4`, u.cefr, ttsLang, at(9)),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp2_5`, u.cefr, ttsLang, at(10)),
            buildSpeakingExercise(`${courseId}_${u.cefr}_sp2_6`, u.cefr, ttsLang, at(11)),
          ],
        },

        // Node 8: Comprehensive Unit Revision (10 exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_review`,
          type: 'unit_review',
          cefr: u.cefr,
          icon: '🔄',
          title: {
            ar: `${u.cefr} • المراجعة الشاملة للوحدة`,
            fr: `${u.cefr} • Révision Globale de l'Unité`,
            en: `${u.cefr} • Full Unit Revision`,
          },
          subtitle: {
            ar: '10 تمارين تثبيت قبل التحدي الأسطوري',
            fr: '10 exercices de consolidation',
            en: '10 consolidation drills across the whole unit',
          },
          xpReward: 32,
          gemReward: 20,
          exercises: [
            buildReverseSelectExercise(`${courseId}_${u.cefr}_rv_1`, u.cefr, ttsLang, at(0), items),
            buildListeningExercise(`${courseId}_${u.cefr}_rv_2`, u.cefr, ttsLang, at(2), items),
            buildWordBankExercise(`${courseId}_${u.cefr}_rv_3`, u.cefr, ttsLang, at(3), items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_rv_4`, u.cefr, ttsLang, at(5), items),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_rv_5`, u.cefr, ttsLang, at(7), items),
            buildListeningExercise(`${courseId}_${u.cefr}_rv_6`, u.cefr, ttsLang, at(9), items),
            buildWordBankExercise(`${courseId}_${u.cefr}_rv_7`, u.cefr, ttsLang, at(10), items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_rv_8`, u.cefr, ttsLang, at(11), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_rv_9`, u.cefr, ttsLang, at(8)),
            buildMatchExercise(`${courseId}_${u.cefr}_rv_10`, u.cefr, ttsLang, [
              at(1),
              at(4),
              at(6),
              at(9),
              at(11),
            ]),
          ],
        },

        // Node 9: Legendary Mastery Exam (12 high-impact exercises)
        {
          id: `${courseId}_${u.cefr.toLowerCase()}_legend`,
          type: 'legendary',
          cefr: u.cefr,
          icon: '👑',
          title: {
            ar: `التحدي الأسطوري ${u.cefr} 👑`,
            fr: `Défi Légendaire ${u.cefr} 👑`,
            en: `${u.cefr} Legendary Mastery Exam 👑`,
          },
          subtitle: {
            ar: '12 سؤال إتقان شامل • بدون رسوم مجاناً!',
            fr: '12 questions de maîtrise • 100% Gratuit !',
            en: '12 mastery questions • 100% Free Crown!',
          },
          xpReward: 55,
          gemReward: 35,
          exercises: [
            buildReverseSelectExercise(`${courseId}_${u.cefr}_lg_1`, u.cefr, ttsLang, at(1), items),
            buildWordBankExercise(`${courseId}_${u.cefr}_lg_2`, u.cefr, ttsLang, at(2), items),
            buildListeningExercise(`${courseId}_${u.cefr}_lg_3`, u.cefr, ttsLang, at(4), items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_lg_4`, u.cefr, ttsLang, at(5), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_lg_5`, u.cefr, ttsLang, at(3)),
            buildReverseSelectExercise(`${courseId}_${u.cefr}_lg_6`, u.cefr, ttsLang, at(6), items),
            buildWordBankExercise(`${courseId}_${u.cefr}_lg_7`, u.cefr, ttsLang, at(8), items),
            buildListeningExercise(`${courseId}_${u.cefr}_lg_8`, u.cefr, ttsLang, at(10), items),
            buildFillBlankExercise(`${courseId}_${u.cefr}_lg_9`, u.cefr, ttsLang, at(9), items),
            buildSpeakingExercise(`${courseId}_${u.cefr}_lg_10`, u.cefr, ttsLang, at(11)),
            buildWordBankExercise(`${courseId}_${u.cefr}_lg_11`, u.cefr, ttsLang, at(11), items),
            buildMatchExercise(`${courseId}_${u.cefr}_lg_12`, u.cefr, ttsLang, [
              at(0),
              at(3),
              at(7),
              at(10),
              at(11),
            ]),
          ],
        },
      ],
    };
  });
}
