// ============================================================
//  LANGUAGES + CONSTANTS
// ============================================================

export const LANGUAGES = {
  fr: { name: 'Français', flag: '🇫🇷', accent: '#E8DCC4', tts: 'fr-FR', label: 'FRA', script: null },
  zh: { name: '中文',     flag: '🇨🇳', accent: '#FF5A4E', tts: 'zh-CN', label: 'ZHO', script: 'hanzi' },
  ru: { name: 'Русский', flag: '🇷🇺', accent: '#8DB9FF', tts: 'ru-RU', label: 'RUS', script: 'cyrillic' },
  id: { name: 'Bahasa',   flag: '🇮🇩', accent: '#5DD3A8', tts: 'id-ID', label: 'IND', script: null },
  es: { name: 'Español', flag: '🇪🇸', accent: '#F4A261', tts: 'es-ES', label: 'SPA', script: null },
};
export const LANG_ORDER = ['fr', 'zh', 'ru', 'id', 'es'];

export const NEW_PER_DAY = 5;
export const MAX_CHAT_HISTORY = 16;

// ============================================================
//  CYRILLIC: [char, romanization, hint, example, example_meaning]
// ============================================================

export const CYRILLIC = [
  ['А','a','wie deutsches A','мама','Mama'],['К','k','wie K','кот','Kater'],
  ['М','m','wie M','мир','Welt'],['О','o','wie O','окно','Fenster'],
  ['Т','t','wie T','тут','hier'],['Е','je','am Wortanfang "je", sonst "e"','нет','nein'],
  ['С','s','sieht aus wie C — ist S!','сын','Sohn'],['Н','n','sieht aus wie H — ist N!','нос','Nase'],
  ['Р','r','sieht aus wie P — ist R (gerollt)!','рука','Hand'],['В','v','sieht aus wie B — ist V!','вода','Wasser'],
  ['И','i','sieht aus wie umgekehrtes N — ist I!','мир','Welt'],['П','p','sieht aus wie umgekehrtes U — ist P!','парк','Park'],
  ['У','u','sieht aus wie y — ist U!','ум','Verstand'],['Х','ch','wie "ch" in Bach — sieht aus wie X!','хорошо','gut'],
  ['Б','b','wie B','банан','Banane'],['Г','g','umgekehrtes L — klingt wie G','год','Jahr'],
  ['Д','d','wie D','дом','Haus'],['Й','j','kurzes I, wie deutsches J','мой','mein'],
  ['Л','l','wie L','лето','Sommer'],['Ф','f','wie F','фото','Foto'],
  ['З','z','stimmhaftes S wie in Sonne','зима','Winter'],['Ж','zh','französisches J wie in Journal','жизнь','Leben'],
  ['Ц','ts','wie deutsches Z in Zeit','цвет','Farbe'],['Ч','tsch','wie deutsches "tsch"','час','Stunde'],
  ['Ш','sch','wie deutsches "sch"','школа','Schule'],['Щ','schtsch','weicheres "sch"','щи','Kohlsuppe'],
  ['Ы','y','zentrales I, eigener Laut','мы','wir'],['Э','e','klares E','это','dies'],
  ['Ю','ju','wie "ju" in Junge','юг','Süden'],['Я','ja','wie deutsches "ja"','я','ich'],
  ['Ё','jo','wie "jo" in Joker','ёлка','Tannenbaum'],['Ъ','—','Hartzeichen, stumm','объект','Objekt'],
  ['Ь','—','Weichzeichen, stumm','мать','Mutter'],
];

// ============================================================
//  HANZI: [char, pinyin, meaning, example, example_meaning]
// ============================================================

export const HANZI = [
  ['我','wǒ','ich','我是','ich bin'],['你','nǐ','du','你好','hallo'],
  ['好','hǎo','gut','你好','hallo'],['是','shì','sein/ja','是的','ja'],
  ['不','bù','nicht','不是','nein'],['有','yǒu','haben','我有','ich habe'],
  ['一','yī','eins','一个','ein/eine'],['二','èr','zwei','二月','Februar'],
  ['三','sān','drei','三个','drei Stück'],['四','sì','vier','四月','April'],
  ['五','wǔ','fünf','五个','fünf Stück'],['六','liù','sechs','六月','Juni'],
  ['七','qī','sieben','七天','sieben Tage'],['八','bā','acht','八月','August'],
  ['九','jiǔ','neun','九个','neun Stück'],['十','shí','zehn','十月','Oktober'],
  ['人','rén','Mensch','中国人','Chinese'],['大','dà','groß','大学','Uni'],
  ['小','xiǎo','klein','小心','vorsichtig'],['他','tā','er','他是','er ist'],
  ['她','tā','sie','她好','ihr geht es gut'],['们','men','Plural-Suffix','我们','wir'],
  ['中','zhōng','Mitte/China','中国','China'],['国','guó','Land','德国','Deutschland'],
  ['学','xué','lernen','学生','Schüler'],['生','shēng','leben/Schüler','生日','Geburtstag'],
  ['老','lǎo','alt','老师','Lehrer'],['师','shī','Lehrer','老师','Lehrer'],
  ['朋','péng','Freund (mit 友)','朋友','Freund'],['友','yǒu','Freund (mit 朋)','朋友','Freund'],
  ['谢','xiè','danken','谢谢','danke'],['请','qǐng','bitten','请问','bitte fragen'],
  ['对','duì','richtig','对不起','Verzeihung'],['起','qǐ','aufstehen','对不起','Verzeihung'],
  ['没','méi','nicht haben','没有','nicht haben'],['什','shén','was (mit 么)','什么','was'],
  ['么','me','Frage-Suffix','什么','was'],['名','míng','Name','名字','Name'],
  ['字','zì','Zeichen/Schrift','汉字','chin. Zeichen'],['叫','jiào','heißen/rufen','我叫','ich heiße'],
  ['吗','ma','Fragepartikel','好吗?','gut?'],['现','xiàn','jetzt','现在','jetzt'],
  ['在','zài','in/an/sich befinden','在家','zu Hause'],['几','jǐ','wieviel','几个','wieviele'],
  ['月','yuè','Monat/Mond','一月','Januar'],['日','rì','Tag/Sonne','生日','Geburtstag'],
  ['年','nián','Jahr','今年','dieses Jahr'],['个','gè','Maßwort (allgemein)','一个','ein Stück'],
  ['家','jiā','Haus/Familie','家人','Familie'],['吃','chī','essen','吃饭','essen'],
];

// ============================================================
//  VOCAB SEED: [lang, type, de, target, pronunciation, grammar, order]
// ============================================================

export const SEED = [
  ['fr','vocab','Hallo','Bonjour','','Wörtlich „guter Tag" — bon (gut) + jour (Tag).',1],
  ['fr','vocab','Tschüss','Au revoir','','Wörtlich „bis zum Wiedersehen". Au = à le.',2],
  ['fr','vocab','Danke','Merci','','Ein Wort, kein Artikel nötig.',3],
  ['fr','vocab','Bitte','S\'il vous plaît','','Wörtlich „wenn es Ihnen gefällt". Vous = höflich.',4],
  ['fr','vocab','Ja','Oui','','',5],
  ['fr','vocab','Nein','Non','','Im Französischen für Verneinung „ne...pas" um Verben.',6],
  ['fr','vocab','Entschuldigung','Pardon','','Auch „Désolé(e)" möglich (Adjektiv, mit Geschlecht).',7],
  ['fr','vocab','Eins','Un','','Bei femininen Wörtern: une.',8],
  ['fr','vocab','Zwei','Deux','','Final-x stumm — „dö" gesprochen.',9],
  ['fr','vocab','Drei','Trois','','Final-s stumm — „trwa".',10],
  ['fr','phrase','Wie heißt du?','Comment tu t\'appelles ?','','Reflexivverb s\'appeler. t\' = te + Apostroph vor Vokal.',11],
  ['fr','phrase','Ich heiße Wayan.','Je m\'appelle Wayan.','','m\' = me. Wörtlich: „Ich nenne mich Wayan".',12],
  ['fr','phrase','Wie geht\'s?','Ça va ?','','Wörtlich „das geht?". ça = das, va = von aller (gehen).',13],
  ['fr','sentence','Ich habe Hunger.','J\'ai faim.','','J\' = je vor Vokal. avoir faim = Hunger haben (nicht „sein").',14],
  ['fr','sentence','Wo ist die Toilette?','Où sont les toilettes ?','','Plural „les toilettes" — im Französischen meistens Pl.',15],
  ['es','vocab','Hallo','Hola','','H ist immer stumm — „ola".',1],
  ['es','vocab','Tschüss','Adiós','','Auch „Chao" (informell, italienisch entlehnt).',2],
  ['es','vocab','Danke','Gracias','','Plural-Form (las gracias = die Dankbarkeiten).',3],
  ['es','vocab','Bitte','Por favor','','Wörtlich „durch Gefallen".',4],
  ['es','vocab','Ja','Sí','','Mit Akzent — „si" ohne wäre „wenn".',5],
  ['es','vocab','Nein','No','','Auch Verneinung vor Verben: „No sé" (ich weiß nicht).',6],
  ['es','vocab','Entschuldigung','Perdón','','Auch „Disculpe" (formell) oder „Lo siento".',7],
  ['es','vocab','Eins','Uno','','Vor Substantiv → un (m) / una (f).',8],
  ['es','vocab','Zwei','Dos','','Unveränderlich.',9],
  ['es','vocab','Drei','Tres','','Unveränderlich.',10],
  ['es','phrase','Wie heißt du?','¿Cómo te llamas?','','Reflexivverb llamarse. ¿ am Anfang ist Pflicht im Spanischen.',11],
  ['es','phrase','Ich heiße Wayan.','Me llamo Wayan.','','Wörtlich „ich nenne mich Wayan".',12],
  ['es','phrase','Wie geht\'s?','¿Cómo estás?','','estar = sein (temporär). ser = sein (permanent). Hier: estar.',13],
  ['es','sentence','Ich habe Hunger.','Tengo hambre.','','Wörtlich „ich habe Hunger". tener = haben.',14],
  ['es','sentence','Wo ist die Toilette?','¿Dónde está el baño?','','está von estar (Ort/Zustand). „el baño" = das Bad.',15],
  ['id','vocab','Hallo','Halo','','Aussprache wie deutsches „Hallo".',1],
  ['id','vocab','Tschüss','Sampai jumpa','','Wörtlich „bis Treffen". Verben werden nicht konjugiert!',2],
  ['id','vocab','Danke','Terima kasih','','Wörtlich „erhalten Liebe". Antwort: „Sama-sama".',3],
  ['id','vocab','Bitte (höflich)','Tolong','','Wörtlich „helfen". Als Höflichkeitspartikel vor Imperativ.',4],
  ['id','vocab','Ja','Ya','','',5],
  ['id','vocab','Nein','Tidak','','Vor Verben/Adjektiven. Vor Substantiven: bukan.',6],
  ['id','vocab','Entschuldigung','Maaf','','Auch „Permisi" (um vorbeizugehen).',7],
  ['id','vocab','Eins','Satu','','',8],
  ['id','vocab','Zwei','Dua','','',9],
  ['id','vocab','Drei','Tiga','','',10],
  ['id','phrase','Wie heißt du?','Siapa namamu?','','Wörtlich „wer Name-dein?". -mu = Possessivsuffix „dein".',11],
  ['id','phrase','Ich heiße Wayan.','Nama saya Wayan.','','Wörtlich „Name mein Wayan". Kein Verb „sein" nötig!',12],
  ['id','phrase','Wie geht\'s?','Apa kabar?','','Wörtlich „was Nachricht?". Antwort: „Baik" (gut).',13],
  ['id','sentence','Ich habe Hunger.','Saya lapar.','','Wörtlich „ich hungrig". Adjektiv ohne Verb „sein".',14],
  ['id','sentence','Wo ist die Toilette?','Di mana toilet?','','„Di mana" = wo (Ortsfrage). „Ke mana" = wohin.',15],
  ['ru','vocab','Hallo','Привет','privét','Informell. Formell: Здравствуйте (zdrastvujtje).',1],
  ['ru','vocab','Tschüss','Пока','paká','Informell. Formell: До свидания (do svidanija).',2],
  ['ru','vocab','Danke','Спасибо','spasíba','Aus „спаси Бог" (rette Gott). Antwort: Пожалуйста.',3],
  ['ru','vocab','Bitte','Пожалуйста','pažálujsta','Doppelt: bedeutet auch „bitte sehr" (Antwort auf Danke).',4],
  ['ru','vocab','Ja','Да','da','',5],
  ['ru','vocab','Nein','Нет','njet','',6],
  ['ru','vocab','Entschuldigung','Извините','izvinítje','Formell. Informell: Извини (izviní).',7],
  ['ru','vocab','Eins','Один','adín','Russisch hat 3 Genera — masc. hier. Fem.: одна, neutr.: одно.',8],
  ['ru','vocab','Zwei','Два','dva','Fem.: две (dvje). Achtung: Genus-Anpassung bei Zahlen!',9],
  ['ru','vocab','Drei','Три','tri','',10],
  ['ru','phrase','Wie heißt du?','Как тебя зовут?','kak tibjá zavút?','Wörtlich „wie dich rufen?". Tebja = dich (Akkusativ).',11],
  ['ru','phrase','Ich heiße Wayan.','Меня зовут Wayan.','minjá zavút Wayan','Wörtlich „mich rufen Wayan". Кein Verb „sein"!',12],
  ['ru','phrase','Wie geht\'s?','Как дела?','kak dilá?','Wörtlich „wie Sachen?". Дела = Plural von дело.',13],
  ['ru','sentence','Ich habe Hunger.','Я хочу есть.','ja chačú jest','Wörtlich „ich will essen". Хочу = ich will (хотеть).',14],
  ['ru','sentence','Wo ist die Toilette?','Где туалет?','gdje tualét?','Kein Verb „sein" im Präsens — direkt „wo Toilette".',15],
  ['zh','vocab','Hallo','你好','nǐ hǎo','Wörtlich „du gut". 你 (nǐ) = du, 好 (hǎo) = gut.',1],
  ['zh','vocab','Tschüss','再见','zài jiàn','Wörtlich „wieder sehen". 再 (zài) = wieder.',2],
  ['zh','vocab','Danke','谢谢','xiè xie','Reduplizierung. Antwort: 不客气 (bú kèqi).',3],
  ['zh','vocab','Bitte (Aufforderung)','请','qǐng','Höfliche Aufforderung am Satzanfang. „请坐" = bitte setzen.',4],
  ['zh','vocab','Ja (richtig)','是','shì','Wörtlich „sein/richtig". Nicht universell — oft besser: Verb wiederholen.',5],
  ['zh','vocab','Nein (falsch)','不是','bú shì','不 + 是. Verneinung steht vor dem Verb.',6],
  ['zh','vocab','Entschuldigung','对不起','duì bu qǐ','Wörtlich „gegenüber nicht aufstehen können" — idiomatisch.',7],
  ['zh','vocab','Eins','一','yī','Tonänderung: vor 4. Ton wird 一 zu yí, sonst yì.',8],
  ['zh','vocab','Zwei','二','èr','Beim Zählen: 二. Vor Maßwörtern: 两 (liǎng).',9],
  ['zh','vocab','Drei','三','sān','',10],
  ['zh','phrase','Wie heißt du?','你叫什么名字?','nǐ jiào shén me míng zi?','Wörtlich „du heißt was Name?". 叫 = heißen/rufen.',11],
  ['zh','phrase','Ich heiße Wayan.','我叫 Wayan。','wǒ jiào Wayan','Kein Verb „sein" vor Namen mit 叫.',12],
  ['zh','phrase','Wie geht\'s?','你好吗?','nǐ hǎo ma?','吗 (ma) macht jede Aussage zur Ja/Nein-Frage.',13],
  ['zh','sentence','Ich habe Hunger.','我饿了。','wǒ è le','Wörtlich „ich hungrig PARTIKEL". 了 markiert Zustandswandel.',14],
  ['zh','sentence','Wo ist die Toilette?','洗手间在哪里?','xǐ shǒu jiān zài nǎ lǐ?','在 = sich befinden. 哪里 = wo.',15],
];

export const RATINGS = [
  { id: 'again', label: 'Nochmal', sub: '< 1m',  key: '1', tone: '#FF6B6B' },
  { id: 'hard',  label: 'Schwer',  sub: 'bald',  key: '2', tone: '#FFB84D' },
  { id: 'good',  label: 'Gut',     sub: '+',     key: '3', tone: '#4ADE80' },
  { id: 'easy',  label: 'Easy',    sub: '++',    key: '4', tone: '#60A5FA' },
];
