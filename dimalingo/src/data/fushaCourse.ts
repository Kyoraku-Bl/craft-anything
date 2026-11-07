import { Course, CEFRLevel, LocalizedText } from '../types';
import { buildCEFRCurriculum, UnitInput } from './curriculumBuilder';

// sentence | tested word | alternatives | paraphrase | French | English | rule (Arabic, French, English)
type Row = [string, string, string[], string, string, string, LocalizedText];
const rule = (ar: string, fr: string, en: string): LocalizedText => ({ ar, fr, en });
const subject = rule('المبتدأ أو الفاعل مرفوع بالضمة في هذا المثال.', 'Le sujet est au nominatif.', 'The subject is nominative.');
const pred = rule('الخبر مرفوع بالضمة في الجملة الاسمية.', 'Le prédicat nominal est au nominatif.', 'The nominal predicate is nominative.');
const gen = rule('الاسم بعد حرف الجر مجرور بالكسرة.', 'Le nom après une préposition est au génitif.', 'The noun after a preposition is genitive.');
const obj = rule('المفعول به منصوب بالفتحة في هذا المثال.', 'Le complément d’objet est à l’accusatif.', 'The direct object is accusative.');
const chapters: {level: CEFRLevel; color: UnitInput['themeColor']; title: LocalizedText; rows: Row[]}[] = [
{level:'A1',color:'emerald',title:{ar:'أساسيات اللغة والجملة الاسمية',fr:'Les bases et la phrase nominale',en:'Foundations and nominal sentences'},rows:[
['الْبَيْتُ جَمِيلٌ','الْبَيْتُ',['الْبَيْتَ','الْبَيْتِ','الْبَيْتْ'],'المنزل جميل','La maison est belle','The house is beautiful',subject],
['الطَّالِبُ مُجْتَهِدٌ','مُجْتَهِدٌ',['مُجْتَهِدًا','مُجْتَهِدٍ','مُجْتَهِدْ'],'التلميذ مجتهد','L’élève est appliqué','The student is diligent',pred],
['الطَّالِبَةُ مُجْتَهِدَةٌ','مُجْتَهِدَةٌ',['مُجْتَهِدٌ','مُجْتَهِدَةً','مُجْتَهِدَةٍ'],'التلميذة مجتهدة','L’élève est appliquée','The female student is diligent',rule('الخبر مؤنث ليتوافق مع المبتدأ المؤنث وهو مرفوع.','Le prédicat s’accorde au féminin.','The predicate agrees in the feminine.')],
['فِي الْبَيْتِ كِتَابٌ','الْبَيْتِ',['الْبَيْتُ','الْبَيْتَ','الْبَيْتْ'],'يوجد كتاب في المنزل','Il y a un livre dans la maison','There is a book in the house',gen],
['هَذَا كِتَابٌ مُفِيدٌ','مُفِيدٌ',['مُفِيدًا','مُفِيدٍ','مُفِيدْ'],'هذا مؤلَّف نافع','C’est un livre utile','This is a useful book',rule('مفيدٌ نعت يتبع كتابٌ في الرفع والتنكير والتذكير.','L’adjectif suit le nom en cas, genre et détermination.','The adjective follows the noun in case, gender and definiteness.')],
['الْبِنْتُ صَغِيرَةٌ','صَغِيرَةٌ',['صَغِيرٌ','صَغِيرَةً','صَغِيرَةٍ'],'الفتاة صغيرة السن','La fille est petite','The girl is little',pred],
['عَلَى الْمَكْتَبِ قَلَمٌ','الْمَكْتَبِ',['الْمَكْتَبُ','الْمَكْتَبَ','الْمَكْتَبْ'],'يوجد قلم فوق المكتب','Il y a un stylo sur le bureau','There is a pen on the desk',gen],
['الشَّمْسُ مُشْرِقَةٌ','الشَّمْسُ',['الشَّمْسَ','الشَّمْسِ','الشَّمْسْ'],'الشمس ساطعة','Le soleil brille','The sun is shining',subject],
['هَذِهِ مَدْرَسَةٌ كَبِيرَةٌ','كَبِيرَةٌ',['كَبِيرٌ','كَبِيرَةً','كَبِيرَةٍ'],'هذه مؤسسة تعليمية كبيرة','C’est une grande école','This is a big school',rule('كبيرةٌ نعت مرفوع يطابق مدرسةٌ في التأنيث.','L’adjectif s’accorde avec le nom féminin.','The adjective agrees with the feminine noun.')],
['الْمَاءُ بَارِدٌ','بَارِدٌ',['بَارِدًا','بَارِدٍ','بَارِدْ'],'الماء غير ساخن','L’eau est froide','The water is cold',pred],
['أَنَا مِنَ الْمَغْرِبِ','الْمَغْرِبِ',['الْمَغْرِبُ','الْمَغْرِبَ','الْمَغْرِبْ'],'بلدي المغرب','Je viens du Maroc','I am from Morocco',gen],
['الْوَلَدُ فِي الْمَدْرَسَةِ','الْمَدْرَسَةِ',['الْمَدْرَسَةُ','الْمَدْرَسَةَ','الْمَدْرَسَةْ'],'الفتى موجود بالمدرسة','Le garçon est à l’école','The boy is at school',gen]
]},
{level:'A2',color:'sky',title:{ar:'الأفعال والفاعل والمفعول والظروف',fr:'Verbes et compléments',en:'Verbs and complements'},rows:[
['كَتَبَ الطَّالِبُ الدَّرْسَ','الطَّالِبُ',['الطَّالِبَ','الطَّالِبِ','الطَّالِبْ'],'دوّن التلميذ الدرس','L’élève a écrit la leçon','The student wrote the lesson',subject],
['قَرَأَتِ الْبِنْتُ الْكِتَابَ','الْكِتَابَ',['الْكِتَابُ','الْكِتَابِ','الْكِتَابْ'],'طالعت الفتاة الكتاب','La fille a lu le livre','The girl read the book',obj],
['يَكْتُبُ الْوَلَدُ رِسَالَةً','رِسَالَةً',['رِسَالَةٌ','رِسَالَةٍ','رِسَالَةْ'],'الفتى يدوّن رسالة','Le garçon écrit une lettre','The boy writes a letter',obj],
['شَرِبَ الرَّجُلُ الْمَاءَ','الْمَاءَ',['الْمَاءُ','الْمَاءِ','الْمَاءْ'],'تناول الرجل الماء','L’homme a bu de l’eau','The man drank the water',obj],
['اِفْتَحْ الْبَابَ','الْبَابَ',['الْبَابُ','الْبَابِ','الْبَابْ'],'قم بفتح الباب','Ouvre la porte','Open the door',rule('افتحْ فعل أمر مبني على السكون، والبابَ مفعول به منصوب.','L’impératif est suivi d’un objet accusatif.','The imperative is followed by an accusative object.')],
['يَذْهَبُ الطِّفْلُ إِلَى الْمَدْرَسَةِ','الطِّفْلُ',['الطِّفْلَ','الطِّفْلِ','الطِّفْلْ'],'يتوجه الطفل للمدرسة','L’enfant va à l’école','The child goes to school',subject],
['جَلَسَ الْوَلَدُ تَحْتَ الشَّجَرَةِ','تَحْتَ',['تَحْتُ','تَحْتِ','تَحْتْ'],'قعد الفتى أسفل الشجرة','Le garçon s’est assis sous l’arbre','The boy sat under the tree',rule('تحتَ ظرف مكان منصوب، والشجرةِ مضاف إليه مجرور.','Le complément de lieu est à l’accusatif.','The adverb of place is accusative.')],
['سَافَرَ أَحْمَدُ صَبَاحًا','صَبَاحًا',['صَبَاحٌ','صَبَاحٍ','صَبَاحْ'],'رحل أحمد في الصباح','Ahmed est parti le matin','Ahmad travelled in the morning',rule('صباحًا ظرف زمان منصوب يبيّن وقت السفر.','Le complément de temps est à l’accusatif.','The adverb of time is accusative.')],
['تَكْتُبُ الْمُعَلِّمَةُ دَرْسًا','الْمُعَلِّمَةُ',['الْمُعَلِّمَةَ','الْمُعَلِّمَةِ','الْمُعَلِّمَةْ'],'تدوّن الأستاذة درساً','L’enseignante écrit une leçon','The teacher writes a lesson',subject],
['أَكَلَ الطِّفْلُ تُفَّاحَةً','تُفَّاحَةً',['تُفَّاحَةٌ','تُفَّاحَةٍ','تُفَّاحَةْ'],'تناول الطفل تفاحة','L’enfant a mangé une pomme','The child ate an apple',obj],
['عَادَ الْأَبُ مَسَاءً','مَسَاءً',['مَسَاءٌ','مَسَاءٍ','مَسَاءْ'],'رجع الوالد في المساء','Le père est revenu le soir','The father returned in the evening',rule('مساءً ظرف زمان منصوب يبيّن وقت العودة.','Le complément de temps indique quand.','The adverb of time indicates when.')],
['اُكْتُبْ دَرْسَكَ','دَرْسَكَ',['دَرْسُكَ','دَرْسِكَ','دَرْسْكَ'],'دوّن درسك','Écris ta leçon','Write your lesson',obj]
]},
{level:'B1',color:'violet',title:{ar:'النواسخ والمثنى والجموع',fr:'Particules, duel et pluriels',en:'Particles, dual and plurals'},rows:[
['كَانَ الْجَوُّ جَمِيلًا','جَمِيلًا',['جَمِيلٌ','جَمِيلٍ','جَمِيلْ'],'كان الطقس جميلاً','Il faisait beau','The weather was beautiful',rule('كان ترفع اسمها وتنصب خبرها جميلًا.','Kāna met son prédicat à l’accusatif.','Kāna puts its predicate in the accusative.')],
['إِنَّ الْعِلْمَ نَافِعٌ','الْعِلْمَ',['الْعِلْمُ','الْعِلْمِ','الْعِلْمْ'],'العلم مفيد بالتأكيد','Le savoir est certes utile','Knowledge is indeed useful',rule('إنَّ تنصب اسمها العلمَ وترفع خبرها نافعٌ.','Inna met son nom à l’accusatif.','Inna puts its subject in the accusative.')],
['أَصْبَحَ الطَّقْسُ بَارِدًا','بَارِدًا',['بَارِدٌ','بَارِدٍ','بَارِدْ'],'صار الجو بارداً','Le temps est devenu froid','The weather became cold',rule('أصبح من أخوات كان؛ باردًا خبرها منصوب.','Le prédicat de aṣbaḥa est accusatif.','The predicate of aṣbaḥa is accusative.')],
['لَيْتَ السَّفَرَ قَرِيبٌ','السَّفَرَ',['السَّفَرُ','السَّفَرِ','السَّفَرْ'],'أتمنى أن يكون السفر قريباً','Si seulement le voyage était proche','If only the journey were near',rule('ليتَ من أخوات إنّ؛ السفرَ اسمها منصوب.','Layta met son nom à l’accusatif.','Layta puts its subject in the accusative.')],
['حَضَرَ الطَّالِبَانِ','الطَّالِبَانِ',['الطَّالِبَيْنِ','الطَّالِبُونَ','الطَّالِبَاتِ'],'جاء التلميذان','Les deux élèves sont arrivés','The two students arrived',rule('الطالبانِ فاعل مرفوع بالألف لأنه مثنى.','Le duel est au nominatif en -ān.','The dual nominative ends in -ān.')],
['رَأَيْتُ الطَّالِبَيْنِ','الطَّالِبَيْنِ',['الطَّالِبَانِ','الطَّالِبُونَ','الطَّالِبَاتُ'],'شاهدت التلميذين','J’ai vu les deux élèves','I saw the two students',rule('الطالبينِ مفعول به منصوب بالياء لأنه مثنى.','Le duel accusatif se termine en -ayn.','The dual accusative ends in -ayn.')],
['نَجَحَ الْمُعَلِّمُونَ','الْمُعَلِّمُونَ',['الْمُعَلِّمِينَ','الْمُعَلِّمَاتِ','الْمُعَلِّمَانِ'],'حقق المعلمون النجاح','Les enseignants ont réussi','The male teachers succeeded',rule('المعلمونَ فاعل مرفوع بالواو لأنه جمع مذكر سالم.','Le pluriel masculin nominatif prend -ūn.','The sound masculine nominative ends in -ūn.')],
['كَرَّمْتُ الْمُعَلِّمِينَ','الْمُعَلِّمِينَ',['الْمُعَلِّمُونَ','الْمُعَلِّمَانِ','الْمُعَلِّمَاتُ'],'منحت المعلمين تكريماً','J’ai honoré les enseignants','I honored the male teachers',rule('المعلمينَ مفعول به منصوب بالياء لجمع المذكر السالم.','Le pluriel masculin accusatif prend -īn.','The sound masculine accusative ends in -īn.')],
['حَضَرَتِ الطَّالِبَاتُ','الطَّالِبَاتُ',['الطَّالِبَاتِ','الطَّالِبَاتَ','الطَّالِبُونَ'],'جاءت التلميذات','Les étudiantes sont arrivées','The female students arrived',subject],
['كَرَّمْتُ الطَّالِبَاتِ','الطَّالِبَاتِ',['الطَّالِبَاتُ','الطَّالِبَاتَ','الطَّالِبُونَ'],'منحت الطالبات تكريماً','J’ai honoré les étudiantes','I honored the female students',rule('الطالباتِ مفعول به منصوب بالكسرة نيابة عن الفتحة.','Le pluriel féminin prend la kasra à l’accusatif.','The sound feminine plural takes kasra in the accusative.')],
['إِنَّ الطَّالِبَيْنِ مُجْتَهِدَانِ','الطَّالِبَيْنِ',['الطَّالِبَانِ','الطَّالِبُونَ','الطَّالِبَاتُ'],'التلميذان مجتهدان بالتأكيد','Les deux élèves sont assurément appliqués','The two students are indeed diligent',rule('الطالبينِ اسم إن منصوب بالياء، ومجتهدانِ خبرها مرفوع بالألف.','Le nom de inna est au duel accusatif.','The subject of inna is dual accusative.')],
['كَانَ الْمُعَلِّمُونَ حَاضِرِينَ','حَاضِرِينَ',['حَاضِرُونَ','حَاضِرَانِ','حَاضِرَاتُ'],'المعلمون كانوا موجودين','Les enseignants étaient présents','The male teachers were present',rule('حاضرينَ خبر كان منصوب بالياء لأنه جمع مذكر سالم.','Le prédicat pluriel de kāna est accusatif.','The plural predicate of kāna is accusative.')]
]},
{level:'B2',color:'amber',title:{ar:'المضارع والشرط والإضافة والتوابع',fr:'Modes, condition et dépendances',en:'Verb moods, conditionals and modifiers'},rows:[
['لَنْ يَكْتُبَ الطَّالِبُ','يَكْتُبَ',['يَكْتُبُ','يَكْتُبْ','يَكْتُبِ'],'التلميذ لن يكتب','L’élève n’écrira pas','The student will not write',rule('لن تنصب المضارع: يكتبَ منصوب بالفتحة.','Lan met le verbe au subjonctif.','Lan puts the verb in the subjunctive.')],
['لَمْ يَكْتُبْ الطَّالِبُ','يَكْتُبْ',['يَكْتُبُ','يَكْتُبَ','يَكْتُبِ'],'التلميذ لم يدوّن','L’élève n’a pas écrit','The student did not write',rule('لم تجزم المضارع: يكتبْ مجزوم بالسكون.','Lam met le verbe à l’apocopé.','Lam puts the verb in the jussive.')],
['أُرِيدُ أَنْ أَتَعَلَّمَ','أَتَعَلَّمَ',['أَتَعَلَّمُ','أَتَعَلَّمْ','أَتَعَلَّمِ'],'أرغب في التعلم','Je veux apprendre','I want to learn',rule('أنْ تنصب الفعل المضارع بعدها بالفتحة.','An met le verbe au subjonctif.','An puts the verb in the subjunctive.')],
['إِنْ تَجْتَهِدْ تَنْجَحْ','تَجْتَهِدْ',['تَجْتَهِدُ','تَجْتَهِدَ','تَجْتَهِدِ'],'بالاجتهاد تنجح','Si tu travailles, tu réussiras','If you work hard, you will succeed',rule('إنْ الشرطية تجزم فعل الشرط وجوابه بالسكون هنا.','La conditionnelle met les deux verbes à l’apocopé.','The conditional makes both verbs jussive.')],
['الطَّالِبَانِ يَكْتُبَانِ','يَكْتُبَانِ',['يَكْتُبَا','يَكْتُبُونَ','يَكْتُبِينَ'],'التلميذان يدوّنان','Les deux élèves écrivent','The two students write',rule('يكتبانِ من الأفعال الخمسة، مرفوع بثبوت النون.','Le verbe duel indicatif garde son nūn.','The indicative dual verb retains its nūn.')],
['لَمْ يَكْتُبُوا الدَّرْسَ','يَكْتُبُوا',['يَكْتُبُونَ','يَكْتُبَانِ','يَكْتُبُ'],'هم لم يدوّنوا الدرس','Ils n’ont pas écrit la leçon','They did not write the lesson',rule('يكتبوا مضارع مجزوم بحذف النون لأنه من الأفعال الخمسة.','L’apocopé supprime le nūn.','The jussive drops nūn in the five verbs.')],
['كِتَابُ الطَّالِبِ جَدِيدٌ','الطَّالِبِ',['الطَّالِبُ','الطَّالِبَ','الطَّالِبْ'],'كتاب التلميذ حديث','Le livre de l’élève est neuf','The student’s book is new',rule('الطالبِ مضاف إليه مجرور بالكسرة.','Le second terme de l’annexion est au génitif.','The second term of an iḍāfa is genitive.')],
['رَأَيْتُ طَالِبًا مُجْتَهِدًا','مُجْتَهِدًا',['مُجْتَهِدٌ','مُجْتَهِدٍ','مُجْتَهِدْ'],'شاهدت تلميذاً مثابراً','J’ai vu un élève appliqué','I saw a diligent student',rule('مجتهدًا نعت منصوب يتبع المنعوت طالبًا.','L’adjectif suit le cas accusatif du nom.','The adjective follows the noun in the accusative.')],
['جَاءَ مُحَمَّدٌ وَعَلِيٌّ','عَلِيٌّ',['عَلِيًّا','عَلِيٍّ','عَلِيّْ'],'حضر محمد وعلي','Mohammed et Ali sont venus','Muhammad and Ali came',rule('عليٌّ معطوف مرفوع يتبع محمدٌ في الإعراب.','Le nom coordonné suit le cas du premier.','The coordinated noun follows the first noun’s case.')],
['حَضَرَ الْمُدِيرُ نَفْسُهُ','نَفْسُهُ',['نَفْسَهُ','نَفْسِهِ','نَفْسْهُ'],'المدير حضر بذاته','Le directeur lui-même est venu','The director himself came',rule('نفسُه توكيد معنوي مرفوع يتبع المديرُ.','Le terme emphatique suit le cas du nom.','The emphatic word follows the noun’s case.')],
['جَاءَ أَخُوكَ زَيْدٌ','زَيْدٌ',['زَيْدًا','زَيْدٍ','زَيْدْ'],'حضر أخوك زيد','Ton frère Zayd est venu','Your brother Zayd came',rule('زيدٌ بدل مرفوع يوضح المقصود بأخوك.','L’apposition suit le cas du nom.','The appositive follows the noun’s case.')],
['لَنْ تَكْتُبِي الدَّرْسَ','تَكْتُبِي',['تَكْتُبِينَ','تَكْتُبُونَ','تَكْتُبَانِ'],'أنتِ لن تكتبي الدرس','Tu n’écriras pas la leçon','You (feminine) will not write the lesson',rule('تكتبي مضارع منصوب بلن وعلامة نصبه حذف النون.','Lan supprime le nūn de ce verbe.','Lan removes the nūn from this verb.')]
]},
{level:'C1',color:'rose',title:{ar:'المنصوبات والعدد',fr:'Compléments accusatifs et nombres',en:'Accusative complements and numbers'},rows:[
['جَاءَ الطِّفْلُ ضَاحِكًا','ضَاحِكًا',['ضَاحِكٌ','ضَاحِكٍ','ضَاحِكْ'],'حضر الطفل وهو يضحك','L’enfant est venu en riant','The child came laughing',rule('ضاحكًا حال منصوب يبيّن هيئة الطفل عند مجيئه.','Le ḥāl exprime l’état et est accusatif.','The ḥāl describes a state and is accusative.')],
['ازْدَادَ الطَّالِبُ عِلْمًا','عِلْمًا',['عِلْمٌ','عِلْمٍ','عِلْمْ'],'زاد علم التلميذ','L’élève a gagné en savoir','The student gained knowledge',rule('علمًا تمييز منصوب يوضح وجه الزيادة.','Le tamyīz précise le sens et est accusatif.','The tamyīz clarifies the meaning and is accusative.')],
['حَضَرَ الطُّلَّابُ إِلَّا زَيْدًا','زَيْدًا',['زَيْدٌ','زَيْدٍ','زَيْدْ'],'جاء الطلاب عدا زيد','Les élèves sont venus sauf Zayd','The students came except Zayd',rule('زيدًا مستثنى منصوب بعد إلا في كلام تام مثبت.','L’exclusion complète affirmative est accusative.','The exception in a complete affirmative sentence is accusative.')],
['يَا طَالِبًا اجْتَهِدْ','طَالِبًا',['طَالِبٌ','طَالِبٍ','طَالِبْ'],'أيها الطالب اجتهد','Ô étudiant, travaille !','O student, work hard!',rule('طالبًا منادى نكرة غير مقصودة منصوب.','Le vocatif indéfini non spécifique est accusatif.','A non-specific indefinite vocative is accusative.')],
['شَكَرْتُهُ شُكْرًا','شُكْرًا',['شُكْرٌ','شُكْرٍ','شُكْرْ'],'قدمت له الشكر','Je l’ai remercié','I thanked him',rule('شكرًا مفعول مطلق منصوب يؤكد معنى الفعل.','Le complément absolu renforce le verbe.','The cognate accusative reinforces the verb.')],
['دَرَسْتُ طَلَبًا لِلْعِلْمِ','طَلَبًا',['طَلَبٌ','طَلَبٍ','طَلَبْ'],'درست رغبة في العلم','J’ai étudié pour acquérir le savoir','I studied in pursuit of knowledge',rule('طلبًا مفعول لأجله منصوب يبيّن سبب الدراسة.','Le complément de cause explique le motif.','The accusative of purpose explains the reason.')],
['قَرَأْتُ ثَلَاثَةَ كُتُبٍ','كُتُبٍ',['كُتُبٌ','كُتُبًا','كِتَابًا'],'طالعت ثلاثة مؤلفات','J’ai lu trois livres','I read three books',rule('المعدود بعد ثلاثة إلى عشرة جمع مجرور؛ كتبٍ مضاف إليه.','Après trois à dix, le compté est pluriel génitif.','After three to ten, the counted noun is plural genitive.')],
['عِنْدِي عِشْرُونَ كِتَابًا','كِتَابًا',['كِتَابٌ','كِتَابٍ','كُتُبٍ'],'أملك عشرين مؤلفاً','J’ai vingt livres','I have twenty books',rule('كتابًا تمييز مفرد منصوب بعد العدد عشرون.','Après vingt, le compté est singulier accusatif.','After twenty, the counted noun is singular accusative.')],
['رَجَعَ الْجُنْدِيُّ سَالِمًا','سَالِمًا',['سَالِمٌ','سَالِمٍ','سَالِمْ'],'عاد الجندي دون أذى','Le soldat est revenu sain et sauf','The soldier returned safe',rule('سالمًا حال منصوب يصف هيئة الجندي عند رجوعه.','Le ḥāl décrit l’état au retour.','The ḥāl describes the state upon return.')],
['اشْتَرَيْتُ لِتْرًا حَلِيبًا','حَلِيبًا',['حَلِيبٌ','حَلِيبٍ','حَلِيبْ'],'اشتريت لتراً من الحليب','J’ai acheté un litre de lait','I bought a litre of milk',rule('حليبًا تمييز منصوب يوضح المقدار لترًا.','Le tamyīz précise la mesure.','The tamyīz specifies the measure.')],
['قَرَأْتُ الدَّرْسَ قِرَاءَةً','قِرَاءَةً',['قِرَاءَةٌ','قِرَاءَةٍ','قِرَاءَةْ'],'طالعت الدرس قراءة','J’ai lu la leçon','I read the lesson',rule('قراءةً مفعول مطلق من لفظ الفعل قرأ.','Le complément absolu partage la racine du verbe.','The cognate accusative shares the verb’s root.')],
['زُرْتُ خَمْسَ مَدَارِسَ','مَدَارِسَ',['مَدَارِسِ','مَدَارِسُ','مَدْرَسَةً'],'ذهبت إلى خمس مدارس','J’ai visité cinq écoles','I visited five schools',rule('مدارسَ مضاف إليه مجرور بالفتحة لأنه ممنوع من الصرف.','Ce pluriel est génitif en fatḥa car diptote.','This diptote plural takes fatḥa in the genitive.')]
]},
{level:'C2',color:'teal',title:{ar:'الصرف والأساليب والبلاغة',fr:'Morphologie, style et rhétorique',en:'Morphology, style and rhetoric'},rows:[
['جَاءَ أَبُوكَ','أَبُوكَ',['أَبَاكَ','أَبِيكَ','أَبْكَ'],'حضر والدك','Ton père est venu','Your father came',rule('أبوك فاعل مرفوع بالواو لأنه من الأسماء الخمسة مستوفٍ للشروط.','Abūka est nominatif en wāw.','Abūka is nominative with wāw.')],
['رَأَيْتُ أَبَاكَ','أَبَاكَ',['أَبُوكَ','أَبِيكَ','أَبْكَ'],'شاهدت والدك','J’ai vu ton père','I saw your father',rule('أباك مفعول به منصوب بالألف من الأسماء الخمسة.','Abāka est accusatif en alif.','Abāka is accusative with alif.')],
['سَلَّمْتُ عَلَى أَبِيكَ','أَبِيكَ',['أَبُوكَ','أَبَاكَ','أَبْكَ'],'حييت والدك','J’ai salué ton père','I greeted your father',rule('أبيك اسم مجرور بالياء لأنه من الأسماء الخمسة.','Abīka est génitif en yā.','Abīka is genitive with yā.')],
['مَرَرْتُ بِأَحْمَدَ','أَحْمَدَ',['أَحْمَدِ','أَحْمَدُ','أَحْمَدْ'],'اجتزت مكان أحمد','Je suis passé près d’Ahmed','I passed by Ahmad',rule('أحمدَ اسم مجرور بالفتحة لأنه علم ممنوع من الصرف.','Le nom diptote prend fatḥa au génitif.','The diptote name takes fatḥa in the genitive.')],
['مَا أَجْمَلَ السَّمَاءَ','أَجْمَلَ',['أَجْمَلُ','أَجْمَلِ','أَجْمَلْ'],'ما أشد جمال السماء','Que le ciel est beau !','How beautiful the sky is!',rule('ما أجملَ صيغة تعجب، والسماءَ مفعول به منصوب.','Mā afʿala est une formule d’exclamation.','Mā afʿala is an exclamatory pattern.')],
['نِعْمَ الرَّجُلُ زَيْدٌ','الرَّجُلُ',['الرَّجُلَ','الرَّجُلِ','الرَّجُلْ'],'زيد رجل محمود','Quel homme excellent que Zayd !','Zayd is an excellent man!',rule('نعمَ فعل مدح، والرجلُ فاعله، وزيدٌ المخصوص بالمدح.','Niʿma sert à exprimer l’éloge.','Niʿma expresses praise.')],
['الْكَاتِبُ مُبْدِعٌ','الْكَاتِبُ',['الْمَكْتُوبُ','الْكَاتِبَ','الْكَاتِبِ'],'المؤلف مبدع','L’écrivain est créatif','The writer is creative',rule('الكاتبُ اسم فاعل من كتب على وزن فاعل.','Kātib est un participe actif de kataba.','Kātib is the active participle of kataba.')],
['الْكِتَابُ مَكْتُوبٌ','مَكْتُوبٌ',['كَاتِبٌ','مَكْتُوبًا','مَكْتُوبٍ'],'الكتاب قد دُوّن','Le livre est écrit','The book is written',rule('مكتوبٌ اسم مفعول من كتب على وزن مفعول.','Maktūb est un participe passif.','Maktūb is a passive participle.')],
['الْعِلْمُ نُورٌ','نُورٌ',['نُورًا','نُورٍ','نُورْ'],'العلم كالنور في الهداية','Le savoir est lumière','Knowledge is light',rule('العلم نور: تشبيه بليغ حُذفت منه أداة التشبيه ووجه الشبه.','Comparaison éloquente sans outil comparatif.','An eloquent simile without an explicit comparison particle.')],
['الْجُنْدِيُّ كَالْأَسَدِ','الْأَسَدِ',['الْأَسَدُ','الْأَسَدَ','الْأَسَدْ'],'الجندي شجاع مثل الأسد','Le soldat est comme un lion','The soldier is like a lion',rule('الكاف أداة تشبيه، والأسدِ مشبّه به مجرور بالكاف.','La particule kāf introduit la comparaison.','The particle kāf introduces the simile.')],
['نَحْنُ الْعَرَبَ نُحِبُّ الْبَيَانَ','الْعَرَبَ',['الْعَرَبُ','الْعَرَبِ','الْعَرَبْ'],'نحن العرب نعشق الفصاحة','Nous, les Arabes, aimons l’éloquence','We Arabs love eloquence',rule('العربَ اسم منصوب على الاختصاص بفعل محذوف تقديره أخصّ.','Le nom de spécialisation est à l’accusatif.','The noun of specification is accusative.')],
['الْعَدْلُ أَفْضَلُ مِنَ الظُّلْمِ','أَفْضَلُ',['أَفْضَلَ','أَفْضَلِ','أَفْضَلْ'],'العدل خير من الظلم','La justice vaut mieux que l’injustice','Justice is better than injustice',rule('أفضلُ اسم تفضيل على وزن أفعل، وهو خبر مرفوع.','Afḍal est un comparatif au nominatif.','Afḍal is a comparative in the nominative.')]
]}
];

export const fushaGrammarUnits: UnitInput[] = chapters.map((chapter, index) => ({
  cefr: chapter.level, number: index + 1, themeColor: chapter.color,
  title: { ar: `${chapter.level} • ${chapter.title.ar}`, fr: `${chapter.level} • ${chapter.title.fr}`, en: `${chapter.level} • ${chapter.title.en}` },
  description: { ar: 'تعلّم القاعدة وطبّقها في جمل مشكولة وتمارين استماع ونطق.', fr: 'Apprenez les règles avec des phrases vocalisées et des exercices.', en: 'Learn the rules through vocalized sentences, practice and pronunciation.' },
  grammarNotes: chapter.rows.slice(0, 5).map(r => r[6]),
  items: chapter.rows.map((r, i) => ({key:`fusha_${chapter.level.toLowerCase()}_${i+1}`, target:r[0], blankWord:r[1], blankDistractors:r[2], meaning:{ar:r[3], fr:r[4], en:r[5]}, tip:r[6]}))
}));

export const fushaCourse: Course = {
  id:'fusha', flag:'📚', badgeCode:'ع', ttsLang:'ar-SA', speechRecLang:'ar-SA',
  name:{ar:'اللغة العربية الفصحى وقواعدها',fr:'Arabe littéraire et grammaire',en:'Arabic (Fusha) & Grammar'},
  tagline:{ar:'من A1 إلى C2: النحو والصرف والإعراب والبلاغة',fr:'De A1 à C2 : grammaire, morphologie et rhétorique',en:'A1 to C2: grammar, morphology and rhetoric'},
  learnersCount:'', units:buildCEFRCurriculum('fusha','ar-SA',fushaGrammarUnits),
};
