-- RemAuto CRM: Detailing services seed (repair)
-- Migration 021
--
-- Populates public.detailing_services when the catalogue is empty or missing rows.
-- Idempotent: each row is inserted only when (category, name_cs) does not already exist.
--
-- Why this exists:
-- Migration 019 defines the same seed, but the table can remain empty if 019 was never
-- applied, failed before the INSERT, or was applied from an incorrect file version
-- (schema-only duplicate of 018 with no INSERT). This migration safely re-applies the seed.

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'detailing_services'
  ) then
    raise notice '021_detailing_services_seed: detailing_services table missing — apply 018 first';
    return;
  end if;
end $$;

insert into public.detailing_services (
  category,
  name_cs,
  name_ru,
  description_cs,
  description_ru,
  base_price,
  max_price,
  price_type,
  unit,
  active,
  sort_order
)
select * from (
  values
  -- Exterior programs
  (
    'exterior_program',
    'Program I: Standard',
    'Программа I: Стандарт',
    'Dvoufázové šetrné ruční mytí, čištění disků, impregnace a oživení pneumatik, detailní čištění mezidveřních prostor, čištění skel, bezdotykové sušení vzduchem a prémiovým ručníkem.',
    'Двухфазная бережная мойка, чистка дисков, консервация и чернение шин, детальная очистка дверных проemov, очистка стекол, бесконтактная сушка.',
    1000::numeric,
    null::numeric,
    'from',
    null,
    true,
    10
  ),
  (
    'exterior_program',
    'Program II: Optimum',
    'Программа II: Оптимум',
    'Zahrnuje služby Programu I + aplikace rychlého křemičitého sealantu (Quick Wax), ochrana a oživení vnějších plastů, odstranění organických nečistot (hmyzu).',
    'Включает Программу I + быстрый кварцевый воск, консервация внешнего пластика, удаление следов насекомых.',
    1600::numeric,
    null::numeric,
    'from',
    null,
    true,
    20
  ),
  (
    'exterior_program',
    'Program III: Detailingový komplet',
    'Программа III: Детейлинг-комплекс',
    'Zahrnuje Program I a II + kompletní chemická dekontaminace laku, leštění chromových prvků, ošetření a impregnace těsnění a gumových částí.',
    'Включает Программы I и II + глубокая деконтаминация кузова, полировка хрома, консервация уплотнителей.',
    2400::numeric,
    null::numeric,
    'from',
    null,
    true,
    30
  ),
  -- Interior programs
  (
    'interior_program',
    'Program I: Udržovací čištění',
    'Программа I: Поддерживающая чистка',
    'Suché čištění interiéru a zavazadlového prostoru, šetrné vysávání koberců, čištění skel z vnitřní strany, čištění a ošetření plastových částí, lehké vlhké čištění povrchů, ozonace a provonění interiéru.',
    'Сухая уборка салона и багажника, бережная чистка ковров, очистка стекол изнутри, уход за пластиком, легкая влажная уборка, ароматизация и озонация.',
    900::numeric,
    1000::numeric,
    'range',
    null,
    true,
    40
  ),
  (
    'interior_program',
    'Program II: Intenziv',
    'Программа II: Интенсив',
    'Zahrnuje služby Programu I + detailní čištění ovládacích prvků a detailů (štětcem), tepování koberečků, tepování sedadel, dezinfekce výdechů ventilace, čištění a kondicionování kožených prvků.',
    'Включает Программу I + детальная чистка кнопок, влажная химчистка ковриков и сидений, дезинфекция воздуховодов, уход за кожей.',
    2500::numeric,
    null::numeric,
    'from',
    null,
    true,
    50
  ),
  (
    'interior_program',
    'Program III: Kompletní detailing interiéru',
    'Программа III: Полный детейлинг салона',
    'Zahrnuje Program I a II + hloubkové tepování podlahy, třífázová péče o kůži, dezinfekce a čištění parou, konzervace plastových prvků s UV ochranou.',
    'Включает Программы I и II + глубокая химчистка пола, трехэтапный уход за кожей, паровая дезинфекция, UV-защита пластика.',
    3000::numeric,
    null::numeric,
    'from',
    null,
    true,
    60
  ),
  -- Combined packages
  (
    'combined_package',
    'Balíček S: Smart',
    'Пакет S: Smart (Program I + Interiér I)',
    'Exteriér: dvoufázové šetrné mytí, ošetření pneu a mezidveřních prostor. Interiér: suché čištění, vysávání, ošetření plastů a provonění. Ideální pro pravidelnou údržbu vozu.',
    'Экстерьер: 2-х фазная мойка, уход за резиной и проемами. Интерьер: сухая чистка, пылесос, уход за пластиком и аромат. Идеально для регулярного ухода.',
    1800::numeric,
    null::numeric,
    'from',
    null,
    true,
    70
  ),
  (
    'combined_package',
    'Balíček M: Medium',
    'Пакет M: Medium (Program II + Interiér II)',
    'Exteriér: Program I + ochrana laku (Quick Wax), oživení vnějších plastů a odstranění hmyzu. Interiér: Program I + hloubkové tepování sedadel a koberečků, čištění detailů štětcem. Ideální pro důkladné sezónní osvěžení vozu.',
    'Экстерьер: Программа I + быстрый воск, пластик и удаление насекомых. Интерьер: Программа I + влажная химчистка сидений и ковриков. Идеально для сезонного обновления.',
    3700::numeric,
    null::numeric,
    'from',
    null,
    true,
    80
  ),
  (
    'combined_package',
    'Balíček L: Exclusive',
    'Пакет L: Exclusive (Program III + Interiér III)',
    'Exteriér: kompletní dekontaminace laku, tekuté stěrače, leštění chromu a impregnace těsnění. Interiér: kompletní hloubková chemická čistka, parní dezinfekce, 3fázová péče o kůži a UV ochrana. Ideální pro maximální péči a dlouhodobou ochranu.',
    'Экстерьер: полная деконтаминация, полировка хрома и уплотнителей. Интерьер: полная химчистка, пар, 3-х фазный уход за кожей и UV защита. Идеально для максимального ухода.',
    4600::numeric,
    null::numeric,
    'from',
    null,
    true,
    90
  ),
  -- Additional exterior
  (
    'exterior_additional',
    'Tekuté stěrače – čelní sklo',
    'Антидождь – лобовое стекло',
    'Tekuté stěrače včetně abrazivní přípravy skla – čelní sklo.',
    'Антидождь с абразивной подготовкой стекла – лобовое стекло.',
    1200::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    100
  ),
  (
    'exterior_additional',
    'Tekuté stěrače – kompletní sada oken',
    'Антидождь – все стекла',
    'Tekuté stěrače včetně abrazivní přípravy skla – kompletní sada oken.',
    'Антидождь с абразивной подготовкой – все стекла (круг).',
    2500::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    110
  ),
  (
    'exterior_additional',
    'Keramická ochrana laku',
    'Керамическое защитное покрытие кузова',
    'Aplikace keramické ochrany laku.',
    'Нанесение керамического защитного покрытия кузова.',
    4000::numeric,
    null::numeric,
    'from',
    null,
    true,
    120
  ),
  (
    'exterior_additional',
    'Strojní leštění laku',
    'Профессиональная полировка кузова',
    'Strojní leštění laku (obnova lesku).',
    'Профессиональная полировка кузова (восстановление блеска).',
    5000::numeric,
    null::numeric,
    'from',
    null,
    true,
    130
  ),
  (
    'exterior_additional',
    'Prémiový tuhý vosk',
    'Премиальный твердый воск',
    'Aplikace prémiového tuhého vosku.',
    'Нанесение премиального твердого воска.',
    2500::numeric,
    null::numeric,
    'from',
    null,
    true,
    140
  ),
  (
    'exterior_additional',
    'Leštění chromových částí',
    'Полировка хромированных элементов',
    'Leštění chromových částí.',
    'Полировка хромированных элементов.',
    1200::numeric,
    null::numeric,
    'from',
    null,
    true,
    150
  ),
  (
    'exterior_additional',
    'Renovace světlometů',
    'Полировка оптики (передние + задние)',
    'Renovace světlometů (přední + zadní).',
    'Полировка оптики (передние фары + задние фонари).',
    2300::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    160
  ),
  (
    'exterior_additional',
    'Leštění předních světlometů',
    'Полировка передних фар',
    'Leštění předních světlometů.',
    'Полировка передних фар.',
    1500::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    170
  ),
  (
    'exterior_additional',
    'Hloubková renovace světel',
    'Глубокое восстановление фар',
    'Hloubková renovace světel (broušení + leštění).',
    'Глубокое восстановление фар (шлифовка + полировка + бронезащита).',
    3000::numeric,
    null::numeric,
    'from',
    'ks',
    true,
    180
  ),
  (
    'exterior_additional',
    'Detailing kol',
    'Детейлинг дисков',
    'Detailing kol (hloubkové čištění disků a pneu).',
    'Глубокая очистка дисков и шин от нагара и металлов.',
    1000::numeric,
    null::numeric,
    'from',
    null,
    true,
    190
  ),
  (
    'exterior_additional',
    'Leštění disků',
    'Полировка колесных дисков',
    'Leštění disků.',
    'Полировка колесных дисков.',
    500::numeric,
    null::numeric,
    'per_item',
    'ks',
    true,
    200
  ),
  (
    'exterior_additional',
    'Oprava laku / retušování oděrek',
    'Локальное удаление сколов',
    'Oprava laku (retušování oděrek) – individuální kalkulace.',
    'Локальное удаление сколов – договорная цена.',
    null::numeric,
    null::numeric,
    'custom',
    null,
    true,
    210
  ),
  -- Additional interior
  (
    'interior_additional',
    'Tepování koberečků',
    'Экстракторная чистка ковриков',
    'Tepování koberečků.',
    'Экстракторная чистка (Tepování) ковриков.',
    250::numeric,
    null::numeric,
    'per_item',
    'ks',
    true,
    220
  ),
  (
    'interior_additional',
    'Tepování zavazadlového prostoru',
    'Экстракторная чистка багажника',
    'Tepování zavazadlového prostoru.',
    'Экстракторная чистка (Tepování) багажника.',
    500::numeric,
    null::numeric,
    'from',
    null,
    true,
    230
  ),
  (
    'interior_additional',
    'Tepování sedaček',
    'Химчистка сидений',
    'Tepování sedaček.',
    'Химчистка сидений (глубокая очистка текстиля/кожи).',
    400::numeric,
    null::numeric,
    'per_item',
    'ks',
    true,
    240
  ),
  (
    'interior_additional',
    'Leštění dekorativních lišt interiéru',
    'Полировка декоративных вставок интерьера',
    'Leštění dekorativních lišt interiéru.',
    'Полировка декоративных вставок интерьера.',
    1500::numeric,
    null::numeric,
    'from',
    null,
    true,
    250
  ),
  (
    'interior_additional',
    'Třífázové čištění kůže',
    'Трехфазная деликатная чистка кожи',
    'Třífázové čištění kůže.',
    'Трехфазная деликатная чистка кожи.',
    1200::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    260
  ),
  (
    'interior_additional',
    'Čištění a impregnace kůže',
    'Глубокая очистка и кондиционирование кожи',
    'Čištění a hloubková impregnace kůže.',
    'Глубокая очистка и кондиционирование (питание) кожи.',
    1500::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    270
  ),
  (
    'interior_additional',
    'Keramická ochrana kožených sedadel',
    'Керамическая защита кожаных сидений',
    'Keramická ochrana kožených sedadel – cena na vyžádání.',
    'Керамическая защита кожаных сидений – цена по запросу.',
    null::numeric,
    null::numeric,
    'on_request',
    null,
    true,
    280
  ),
  (
    'interior_additional',
    'Antibakteriální dezinfekce klimatizace',
    'Антибактериальная дезинфекция кондиционера',
    'Antibakteriální dezinfekce klimatizace.',
    'Антибактериальная дезинфекция кондиционера и воздуховодов.',
    600::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    290
  ),
  (
    'interior_additional',
    'Odstraňování chloupků',
    'Удаление шерсти животных',
    'Odstraňování chloupků.',
    'Удаление шерсти животных.',
    600::numeric,
    null::numeric,
    'from',
    null,
    true,
    300
  ),
  (
    'interior_additional',
    'Ozonace interiéru',
    'Озонация салона',
    'Ozonace interiéru (dezinfekce a odstranění zápachu).',
    'Озонация салона (дезинфекция и удаление запаха).',
    400::numeric,
    null::numeric,
    'fixed',
    null,
    true,
    310
  )
) as seed (
  category,
  name_cs,
  name_ru,
  description_cs,
  description_ru,
  base_price,
  max_price,
  price_type,
  unit,
  active,
  sort_order
)
where not exists (
  select 1
  from public.detailing_services existing
  where existing.category = seed.category
    and existing.name_cs = seed.name_cs
);
