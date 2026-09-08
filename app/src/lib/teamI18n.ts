type LocaleCopy = { name: string; role: string; bio: string };

const TEAM_I18N: Record<string, { en: LocaleCopy; kk: LocaleCopy }> = {
  "Павел Борисов": {
    en: {
      name: "Pavel Borisov",
      role: "Club chairman",
      bio: "Pavel Vladimirovich Borisov is the founder and leader of Peloton Sports Club. His passion for sport and a healthy lifestyle inspired the club’s creation. Pavel is a Candidate Master of Sport in biathlon, a prize-winner at many competitions, a practising cycling coach and the chief judge at our events. He won two medals at the Asian Biathlon Championships. His athletes take podium places at national and regional championships and hold sport ranks and titles.",
    },
    kk: {
      name: "Павел Борисов",
      role: "Клуб төрағасы",
      bio: "Борисов Павел Владимирович — «Peloton» спорт клубының негізін қалаушы және жетекшісі. Спорт пен салауатты өмір салтына деген құштарлығы клубты құруға шабыт берді. Павел — биатлоннан спорт шеберіне кандидат, көптеген жарыстардың жүлдегері, велоспорттан әрекеттегі жаттықтырушы және біздің іс-шаралардың бас төрешісі. Азия чемпионатында биатлоннан екі жүлделі орын алды. Тәрбиеленушілері ел және облыс чемпионаттарында жүлделі орындарға ие, спорттық атақ пен дәрежелері бар.",
    },
  },
  "Елизаров Денис": {
    en: {
      name: "Denis Elizarov",
      role: "Front Line",
      bio: "He is passionate about sport and cannot imagine life without it. He loves hiking in the mountains. He used to do CrossFit and general fitness, and since 2019 he has focused on running. Denis now enjoys skyrunning and trail running, preferring long distances. He races marathons and half-marathons; in 2024 he finished the 50 km at Tengri on the Ili river. In the club he plays a key role organising events and solving day-to-day operational questions.",
    },
    kk: {
      name: "Елизаров Денис",
      role: "Front Line",
      bio: "Ол спортқа құмар және өмірін онсыз елестете алмайды. Тауға жорықты жақсы көреді. Бұрын CrossFit және жалпы дене дайындығымен айналысқан, ал 2019 жылдан бері жүгіруге ден қойды. Қазір Денис скайраннинг пен трейлраннингті ұнатады, ұзақ қашықтықтарды таңдайды. Марафон мен жартылай марафондарға қатысады. 2024 жылы Іле жағасында өткен Tengri жарысында 50 км қашықтықты сәтті аяқтады. Клубта Денис іс-шараларды ұйымдастырумен және көптеген ұйымдастырушылық мәселелерді шешумен айналысады.",
    },
  },
  "Мрзагарайева Альмира": {
    en: {
      name: "Almira Mrzagarayeva",
      role: "Back Office",
      bio: "She never gave sport much weight, training only in the gym for herself. In 2023 she decided to change her life completely. After completing a “body tuning” programme as a participant, she became a curator of the project. In June 2024 Almira started trail running and found it brings her huge joy. She now sets ambitious goals in trail running and keeps developing as a fitness professional. In the club she handles race registration, sponsor relations and organisational questions.",
    },
    kk: {
      name: "Мрзагарайева Альмира",
      role: "Back Office",
      bio: "Бұрын спортқа ерекше мән бермеген, тек өзі үшін тренажёр залында жаттыққан. 2023 жылы өмірін түбегейлі өзгертуге бел буды. «Денені түзету» бағдарламасын қатысушы ретінде өтіп, осы жобаның кураторы болды. 2024 жылдың маусымынан Альмира трейлраннингпен айналыса бастады және бұл спорт оған зор қуаныш сыйлайтынын байқады. Енді трейлраннингте өзіне амбициялы мақсаттар қояды. Фитнес саласында кәсіби дамумен белсенді айналысады. Клубта Альмира қатысушыларды іс-шараларға тіркеумен, демеушілермен жұмыспен және ұйымдастыру мәселелерін шешумен айналысады.",
    },
  },
  "Жгун Иван": {
    en: {
      name: "Ivan Zhgun",
      role: "Chief treasurer",
      bio: "Chief treasurer of Peloton Sports Club. He carefully collects and looks after the club’s finances. Sport has always been part of his life, along with selling gear and providing technical support for athletes at the @extremalridder shop. He is a reliable shoulder in organising our events and often races them himself. Ivan @psy_zhgunivan has also taken up psychology, and the team is glad to have a qualified specialist among us.",
    },
    kk: {
      name: "Жгун Иван",
      role: "Бас қазынашы",
      bio: "«Peloton» спорт клубының бас қазынашысы. Қаржыны жауапкершілікпен жинап, сақтайды. Өмірінің көп бөлігі спортпен, спорттық инвентарь сатумен және @extremalridder дүкенінде әуесқойлар мен спортшыларға техникалық қолдау көрсетумен өтеді. Іс-шараларды ұйымдастыруда әрқашан сенімді тірек болып, өзі де қатысушыға айналады. Жақында Иван @psy_zhgunivan психология бағытын таңдады, командамыз білікті маманмен толықты.",
    },
  },
  "Виталий Грибенщиков": {
    en: {
      name: "Vitaly Gribenchshikov",
      role: "Website, photo, drone",
      bio: "He runs peloton-ridder.kz, photographs events and pilots a drone. Since 2006 his main hobby has been long-distance mountain-bike trips. His tyres have rolled around Baikal and Belarus, Mongolia and the Caucasus, India and China, Serbia and Turkey. On tour he values not only the elevation profile but also ethnographic interest. The love of cycling passed to his son, Ivan Gribenchshikov — a pupil of Pavel Borisov and a multiple prize-winner at regional and national races.",
    },
    kk: {
      name: "Виталий Грибенщиков",
      role: "Сайт, фото, дрон",
      bio: "peloton-ridder.kz сайтын әкімшілендіреді, фотограф және дрон пилоты. 2006 жылдан бері басты хоббиі — Mountain Bike-пен ұзақ қашықтыққа сапарлар. Велосипед дөңгелектерінің географиясы алуан: Байкал мен Беларусь, Моңғолия мен Кавказ, Үндістан мен Қытай, Сербия мен Түркия. Жорықтарда биіктік бедерімен қатар этнографиялық қызығушылықты да бағалайды. Велоспортқа деген құштарлық ұлы Иван Грибенщиковқа да берілді — Павел Борисовтың тәрбиеленушісі, облыстық және республикалық жарыстардың бірнеше мәрте жүлдегері.",
    },
  },
  "Мазурин Сергей": {
    en: {
      name: "Sergey Mazurin",
      role: "Candidate Master, MTB",
      bio: "A dedicated athlete and active person. His titles include Candidate Master of Sport in powerlifting, Candidate Master of Sport in mountain bike, and a rank in athletics. He also treks and races multi-day events such as Jeyran Trophy, the Crimean MTB marathon, Eurasia, and the Silk Road Mountain Race in 2022 and 2024. Always happy to share experience and find new friends to talk sport and adventure.",
    },
    kk: {
      name: "Мазурин Сергей",
      role: "КМС, MTB",
      bio: "Құштар спортшы және белсенді адам. Жетістіктері: пауэрлифтингтен КМС, Mountain bike-тен КМС және жеңіл атлетикадан дәреже. Туризммен де айналысады, Джейран Трофи, Қырым MTB марафоны, Еуразия, сондай-ақ Silk Road Mountain Race 2022 және 2024 сияқты көпкүндік велогонкаларға қатысады. Спорт пен шытырман оқиға туралы тәжірибе алмасып, жаңа достар табуға әрқашан қуанышты.",
    },
  },
  "Евгений Евдокин": {
    en: {
      name: "Evgeny Evdokin",
      role: "Mountain Bike",
      bio: "He loves long mountain-bike journeys. Since 2007 he has ridden every mountain within 100 km of Ridder, then set a route through European capitals from Prague to Venice, with stops in Berlin, Amsterdam, Brussels, Paris and Venice. In 2017 he first raced MTB at Lake Bartogay near Almaty, returned in 2018 and also rode the Eurasia stage race in Yekaterinburg. In 2019 he raced Eurasia again, this time in Crimea. That racing experience strongly shapes how we organise our events.",
    },
    kk: {
      name: "Евгений Евдокин",
      role: "Mountain Bike",
      bio: "Mountain Bike-пен ұзақ сапарларды ұнатады. 2007 жылдан Риддер төңірегіндегі 100 км-дегі барлық тауды аралады. Содан соң Прагадан Венецияға дейінгі Еуропа астаналары арқылы маршрут салып, Берлин, Амстердам, Брюссель, Париж және Венецияда тоқтады. 2017 жылы Алматы маңындағы Бартоғай көлінде MTB жарысына алғаш қатысты. 2018 жылы сол жарысқа қайта шығып, Екатеринбургтегі «Еуразия» көпкүндік гонкасына да қатысты. 2019 жылы «Еуразияға» Қырымда қайта қатысты. Жарыс тәжірибесі біздің іс-шараларды ұйымдастыруға айтарлықтай әсер етеді.",
    },
  },
  "Жасулан Омарбаев": {
    en: {
      name: "Zhasulan Omarbayev",
      role: "Race organisation",
      bio: "Someone who knows sport from the inside. He used to do CrossFit and now gives his sporting life to running. Zhasulan races many distances, including marathons, and keeps improving his results. He loves hiking and an active lifestyle. He helps organise every event and supports runners on the course during our races. His energy and experience inspire new goals.",
    },
    kk: {
      name: "Жасулан Омарбаев",
      role: "Старттарды ұйымдастыру",
      bio: "Спортты іштен білетін адам. Бұрын CrossFit-пен айналысқан, қазір спорттық өмірін жүгіруге арнады. Жасулан әртүрлі қашықтықтарға жүгіреді, марафондарға қатысады және нәтижелерін үнемі жақсартады. Жорықты жақсы көреді, белсенді өмір сүреді. Барлық іс-шараларды ұйымдастыруға қатысады, старт кезінде трассада қатысушыларды қолдайды және көмектеседі. Оның ынтасы мен тәжірибесі жаңа жетістіктерге шабыттандырады.",
    },
  },
  "Байтубаев Мадий": {
    en: {
      name: "Madiy Baitubayev",
      role: "Event organisation",
      bio: "Working in the paramilitary mine-rescue service, he first got on a bike and immediately fell in love with cycling. His whole family caught the same bug. After moving to Semipalatinsk he remains a devoted cyclist. Madiy has rich experience at the Abai Region Sports Events Centre and is always ready to help organise races. Even after the move he is still part of the team, supporting the organisation and the runners with a positive attitude.",
    },
    kk: {
      name: "Байтубаев Мадий",
      role: "Іс-шараларды ұйымдастыру",
      bio: "ВГСЧ-да жұмыс істеп жүріп алғаш рет велосипедке отырып, осы спортты бірден ұнатты. Отбасының бәрі де велоспортқа әуестенді. Семейге қоныс аударса да, велоспорттың ынталы әуесқойы болып қала береді. Мадийдің Абай облысындағы спорттық-бұқаралық іс-шаралар орталығында тәжірибесі мол, іс-шараларды ұйымдастыруға әрқашан дайын. Семейге көшкенімен, командамыздың бөлігі болып қалады. Ұйымдастыруда да, старттағы қатысушыларға да қолдау мен жақсы көңіл-күй сыйлайды.",
    },
  },
  "Алексей Немцев": {
    en: {
      name: "Alexey Nemtsev",
      role: "IMS, ski sport",
      bio: "International Master of Sport of Kazakhstan in skiing and ski orienteering. He took silver in the long distance at the 2011 Winter Asian Games. Alexey now teaches PE and coaches children’s ice hockey. He helps develop Peloton Sports Club — organising events, designing courses and working with sponsors.",
    },
    kk: {
      name: "Алексей Немцев",
      role: "ХСШ, шаңғы спорты",
      bio: "ҚР халықаралық дәрежелі спорт шебері, шаңғы спорты мен шаңғымен бағдарлауға маманданған. 2011 жылғы қысқы Азиадада ұзын қашықтықта күміс алды. Қазір Алексей дене шынықтыру мұғалімі және балалар хоккейінің жаттықтырушысы. «Peloton» спорт клубын дамытуға белсене қатысады: іс-шараларды ұйымдастыру, трассаларды әзірлеу және демеушілермен жұмыс.",
    },
  },
  "Константин Курмамбаев": {
    en: {
      name: "Konstantin Kurmambaev",
      role: "Trail running",
      bio: "A dedicated trail and sky runner on rough terrain and high mountains. Over the past three years he has raced many ultras, including 100 km — twice — and earned the title Skyrunner of Kazakhstan. By profession he is a general practitioner, but mountain running is an essential part of his life. In the club Konstantin designs courses, helps with organisation and works with sponsors.",
    },
    kk: {
      name: "Константин Курмамбаев",
      role: "Трейлраннинг",
      bio: "Құштар трейлраннер және скайраннер, бедерлі жер мен биік тауда жүгіреді. Соңғы үш жылда ультрамарафондарға көп қатысты, 100 км қашықтықты екі рет жүгіріп өтіп, Қазақстан скайраннері атағын алды. Мамандығы — жалпы практика дәрігері, бірақ тауда жүгіру өмірінің ажырамас бөлігі. Клубта Константин іс-шара трассаларын әзірлейді, ұйымдастыру мәселелерін шешеді және демеушілермен жұмыс істейді.",
    },
  },
  "Наталья Соковнина": {
    en: {
      name: "Natalya Sokovnina",
      role: "Cycling coach",
      bio: "An outstanding cycling coach at Peloton Sports Club. Under her guidance athletes win podiums at regional and national championships. Natalya holds three Master of Sport titles of Kazakhstan: cross-country skiing, road cycling and track cycling. She is a multiple national champion in the individual cycling time trial and raced the Giro d’Italia. Her experience helps the club grow and organise events.",
    },
    kk: {
      name: "Наталья Соковнина",
      role: "Велоспорт жаттықтырушысы",
      bio: "«Peloton» спорт клубы командасындағы үздік велоспорт жаттықтырушысы. Оның басшылығымен спортшылар облыс пен ел чемпионаттарында жүлделі орындарға шығады. Натальяның үш спорт шебері атағы бар: «ҚР шаңғы жарысынан спорт шебері», «ҚР велоспортынан спорт шебері (ШОССЕ)», «ҚР велоспортынан спорт шебері (ТРЕК)». Жеке жарыста Қазақстанның бірнеше дүркін чемпионы, әлемдік көпкүндік Джиро д’Италияға қатысқан. Бай тәжірибесі клубтың дамуына және іс-шараларды ұйымдастыруға көмектеседі.",
    },
  },
  "Елена Грибенщикова": {
    en: {
      name: "Elena Gribenchshikova",
      role: "Frost running",
      bio: "Elena is devoted to frost running, winter swimming and tourism. Her love of winter hiking and mountaineering inspires many. She recently expanded her training with the “Pravilo” apparatus. She stays open to new challenges and aims high in what she loves.",
    },
    kk: {
      name: "Елена Грибенщикова",
      role: "Frost running",
      bio: "Елена Frost running (аязды жүгіру), морж болу және туризммен құлшыныспен айналысады. Қысқы жорық пен альпинизмге деген құштарлығы көпшілікті шабыттандырады. Жақында көкжиегін кеңейтіп, «Правило» тренажёрінде жаттыға бастады. Жаңа сын-қатерлерге әрқашан ашық және сүйікті ісінде жоғары нәтижеге ұмтылады.",
    },
  },
  "Сергей Кокорин": {
    en: {
      name: "Sergey Kokorin",
      role: "Club member",
      bio: "Sergey has been an entrepreneur since 2007 and has built his business over many years. He balances the roles of father and husband, which gives his work particular meaning. Active weekends are an important part of his life and help him keep work and rest in balance. He keeps learning, exploring the unknown and widening his horizons. He aims to be a source of confidence for partners and colleagues. Sergey takes part in all club events.",
    },
    kk: {
      name: "Сергей Кокорин",
      role: "Клуб мүшесі",
      bio: "Сергей 2007 жылдан бері кәсіпкер, бизнесін көп жыл бойы дамытып келеді. Өмірінде әке мен күйеу рөлін ұштастырады, бұл ісіне ерекше мән береді. Демалыс күндерін белсенді өткізу — жұмыс пен демалыс теңгерімін сақтауға көмектесетін маңызды бөлік. Үнемі оқып, беймәлімді зерттеп, көкжиегін кеңейтеді. Мақсаты — серіктестер мен әріптестер үшін сенім мен сенімділіктің көзі болу. Сергей клубтың барлық іс-шараларына белсене қатысады.",
    },
  },
  "Коротина Ольга": {
    en: {
      name: "Olga Korotina",
      role: "Club member",
      bio: "A member of Peloton Sports Club for whom sport is an essential part of life. Since childhood she has played volleyball, ridden a bike and run. She also loves mountain hiking. Now a mother of three, she tries to pass on a love of sport to her children. Olga gives huge support to participants at our events, both at the start and at the finish.",
    },
    kk: {
      name: "Коротина Ольга",
      role: "Клуб мүшесі",
      bio: "«Peloton» спорт клубының қатысушысы, спорт оның өмірінің ажырамас бөлігі. Бала кезінен волейбол, велосипед және жүгірумен айналысқан. Тауға жорықты да жақсы көреді. Қазір үш баланың анасы ретінде оларға спортқа деген сүйіспеншілікті сіңіруге тырысады. Ольга іс-шараларымыздың қатысушыларына стартта да, финиште де зор қолдау көрсетеді.",
    },
  },
  "Анатолий Егоров": {
    en: {
      name: "Anatoly Egorov",
      role: "Event organisation",
      bio: "An all-round sportsman devoted to cycling. For more than ten years he competed in folk games in table tennis and kettlebell sport, representing the city and the republic. He also did athletics. Anatoly is known for a positive, helpful character and a real contribution to organising sports events.",
    },
    kk: {
      name: "Анатолий Егоров",
      role: "Іс-шараларды ұйымдастыру",
      bio: "Велоспортқа құмар жан-жақты спортшы. 10 жылдан астам үстел теннисі мен гир спорты бойынша халық ойындарында қала мен республика намысын қорғады. Жеңіл атлетикамен де айналысқан. Анатолий жағымды, көмекші мінезімен және спорттық іс-шараларды ұйымдастыруға қосқан үлесімен танымал.",
    },
  },
};

export function localizeTeamMember<T extends { name: string; role: string; bio: string | null }>(
  member: T,
  locale: string,
): T {
  if (locale === "ru") return member;
  const copy = TEAM_I18N[member.name]?.[locale === "kk" ? "kk" : "en"];
  if (!copy) return member;
  return { ...member, name: copy.name, role: copy.role, bio: copy.bio };
}
