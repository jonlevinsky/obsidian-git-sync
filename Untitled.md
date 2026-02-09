# Mikrofony

## 1.1 Definice a základní princip
-   **Mikrofon** je elektromechanický a elektroakustický měnič.
-   **Hlavní úkol:** Přeměnit akustickou energii (kmitání vzduchu) na elektrickou energii (elektrický signál).
-   **Měření vlastností:** Ve volném akustickém poli (prostředí bez odrazů).

## 1.2 Klíčové parametry mikrofonů

### 1.2.1 Citlivost
-   **Definice:** Účinnost mikrofonu, poměr výstupního elektrického napětí k akustickému tlaku.
-   **Měří se při:** 1 kHz a tlaku 1 Pa
-   **Jednotky:**
    -   mV/Pa (milivolt na Pascal)
    -   dBV (decibely vztažené k 1 V)
-   **Referenční hodnota:** Akustický tlak 1 Pa odpovídá 94 dB SPL
-   **Porovnání typů:** Kondenzátorové mikrofony mají obecně vyšší citlivost než dynamické

### 1.2.2 Frekvenční charakteristika
-   **Definice:** Graf závislosti citlivosti mikrofonu na frekvenci.
-   **Ideál:** Rovná čára (stejné snímání všech frekvencí)
-   **Realita:** Reálné mikrofony mají zvlnění
-   **Měření:** V akustické ose

### 1.2.3 Dynamický rozsah
-   **Definice:** Rozdíl mezi maximálním akustickým tlakem (SPL max) a vlastním šumem mikrofonu.
-   **Složky:**
    -   **SPL max:** Maximální akustický tlak, který mikrofon snese bez zkreslení.
    -   **Ekvivalentní šum:** Vlastní šum mikrofonu

### 1.2.4 SNR (Signal-to-Noise Ratio)
-   **Definice:** Odstup signálu od šomu.
-   **Pravidlo:** Čím vyšší číslo, tím méně mikrofon šumí.

### 1.2.5 Impedance
-   **Definice:** Výstupní odpor mikrofonu.
-   **Důležité pravidlo:** Vstupní impedance předzesilovače by měla být alespoň 5–10× vyšší než impedance mikrofonu.

## 1.3 Rozdělení podle principu (Konstrukce)

### 1.3.1 Elektrodynamické (Dynamické) mikrofony
-   **Princip fungování:** Elektromagnetická indukce – vodič se pohybuje v magnetickém poli a indukuje se napětí (U = B·l·v).

#### Cívkové dynamické mikrofony
-   **Konstrukce:** Membrána je spojena s cívkou, která se pohybuje kolem magnetu.
-   **Vlastnosti:**
    -   Odolné
    -   Snesou vysoký akustický tlak
    -   Nepotřebují napájení
    -   Nižší citlivost
    -   Pomalejší reakce na přechodové jevy (těžší membrána)
-   **Použití:**
    -   Zpěv na pódiu (např. Shure SM58)
    -   Bicí
    -   Kytarová komba

#### Páskové (Ribbon) mikrofony
-   **Konstrukce:** Místo membrány a cívky je v magnetickém poli umístěn tenký zvlněný pásek.
-   **Vlastnosti:**
    -   Přirozený zvuk
    -   Osmičková charakteristika
    -   Historicky křehké, dnes odolnější
    -   Často vyžadují kvalitní předzesilovač (nízké výstupní napětí)

### 1.3.2 Kondenzátorové (Elektrostatické) mikrofony
-   **Princip fungování:** Změna kapacity kondenzátoru – kmitání mění vzdálenost mezi membránou (jedna deska) a pevnou elektrodou (druhá deska).
-   **Vlastnosti:**
    -   Vysoká citlivost
    -   Věrný zvuk
    -   Rychlá reakce
    -   Vyžadují napájení (Phantom +48 V)
    -   Náchylnější na vlhkost a zacházení
-   **Použití:**
    -   Studio (zpěv, akustické nástroje)
    -   Film (shotgun mikrofony)

#### Elektretové kondenzátorové mikrofony
-   **Podtyp:** Kondenzátorových mikrofonů.
-   **Charakteristika:** Polarizační napětí je trvale "zamrznuto" v materiálu (*elektretu*).
-   **Napájení:** Potřeba jen pro vestavěný předzesilovač.

## 1.4 Směrové charakteristiky (Polární diagramy)
Udávají citlivost mikrofonu na zvuk přicházející z různých úhlů.

### 1.4.1 Kulová (Všesměrová/Omni)
-   **Citlivost:** Snímá zvuk ze všech stran stejně.
-   **Princip:** Tlakový mikrofon (zvuk dopadá jen na jednu stranu membrány).
-   **Vlastnosti:**
    -   Nemá proximity efekt
    -   Odolný proti větru
-   **Použití:**
    -   Klopové mikrofony
    -   Snímání atmosféry
    -   Konference

### 1.4.2 Osmičková (Bi-directional/Figure 8)
-   **Citlivost:** Snímá zepředu a zezadu, boky (90°) potlačuje.
-   **Princip:** Rychlostní mikrofon (zvuk dopadá na obě strany membrány).
-   **Vlastnosti:** Silný proximity efekt.
-   **Použití:**
    -   Rozhovor dvou lidí naproti sobě
    -   M-S stereo technika

### 1.4.3 Kardioidní (Ledvinová)
-   **Citlivost:** Snímá hlavně zepředu, potlačuje zvuk zezadu (180°).
-   **Princip:** Kombinace tlakového a rychlostního principu.
-   **Použití:** Nejčastější univerzální charakteristika
    -   Zpěv
    -   Ozvučování (omezuje zpětnou vazbu)

### 1.4.4 Hyperkardioidní
-   **Citlivost:** Užší směrovost zepředu než kardioida, ale má malý lalok citlivosti vzadu.
-   **Použití:** Když je potřeba větší izolace zdroje zvuku z boků.

### 1.4.5 Úzce směrová (Obušková/Shotgun)
-   **Citlivost:** Extrémní směrovost dopředu, využívá interferenční trubici k vyrušení zvuků z boků.
-   **Použití:**
    -   Film a TV (na tágu)
    -   Snímání dialogů z dálky

## 1.5 Funkce a jevy

### 1.5.1 Proximity efekt (Efekt blízkosti)
-   **Definice:** Nárůst basových frekvencí, když je zdroj zvuku velmi blízko mikrofonu.
-   **Výskyt:** Pouze u směrových (*rychlostních*) mikrofonů
    -   Kardioida
    -   Osmička
-   **Nevyskytuje se:** U kulových mikrofonů

### 1.5.2 Roll-off (Low Cut / High Pass Filter)
-   **Funkce:** Filtr, který ořízne nízké frekvence.
-   **Použití:**
    -   Potlačení dunění
    -   Potlačení hluku větru
    -   Kompenzace proximity efektu

### 1.5.3 PAD (Přepínač útlumu)
-   **Funkce:** Přepínač útlumu (např. -10 dB, -20 dB).
-   **Použití:** U velmi hlasitých zdrojů, aby nedošlo k přebuzení elektroniky mikrofonu.

### 1.5.4 Phantomové napájení (+48 V)
-   **Funkce:** Napájení kondenzátorových mikrofonů.
-   **Realizace:** Vedeno po stejném kabelu jako audio signál (XLR).

## 1.6 Použití a příslušenství

### 1.6.1 Typy mikrofonů podle použití

#### Klopový mikrofon (Lavalier)
-   **Vlastnosti:**
    -   Malý, nenápadný
    -   Obvykle kulová charakteristika
-   **Umístění:** Na hrudník
-   **Pozor:** Na šustění oblečení

#### Shotgun (Puška)
-   **Vlastnosti:** Úzce směrový mikrofon
-   **Použití:** Na "*tágu*" (*boompole*) pro film
-   **Varování:** V interiéru pozor na odrazy, které mohou zvuk zbarvit

#### Handka (Handheld)
-   **Popis:** Klasický mikrofon do ruky
-   **Použití:**
    -   Reportáže
    -   Zpěv

### 1.6.2 Příslušenství

#### POP filtr
-   **Funkce:** Síťka před mikrofonem
-   **Účel:** Brání nárazům vzduchu při vyslovování explozivních hlásek (P, B)

#### Windshield (Zeppelin, Dead cat)
-   **Funkce:** Ochrana proti větru při natáčení venku.

#### Shockmount (Pavouk)
-   **Funkce:** Odpružený držák
-   **Účel:** Izoluje mikrofon od mechanických vibrací stojanu.

<p style="display:none">
Q:: Co je to mikrofon z hlediska měniče?
A:: Mikrofon je elektromechanický a elektroakustický měnič.

Q:: Jaký je hlavní úkol mikrofonu?
A:: Hlavním úkolem mikrofonu je přeměnit akustickou energii (kmitání vzduchu) na elektrickou energii (elektrický signál).

Q:: V jakém prostředí se měří vlastnosti mikrofonu?
A:: Vlastnosti mikrofonu se měří ve volném akustickém poli, což je prostředí bez odrazů.

Q:: Jak je definována citlivost mikrofonu?
A:: Citlivost mikrofonu je definována jako účinnost mikrofonu, tedy poměr výstupního elektrického napětí k akustickému tlaku.

Q:: Při jakých podmínkách se měří citlivost mikrofonu?
A:: Citlivost mikrofonu se měří při frekvenci 1 kHz a akustickém tlaku 1 Pa.

Q:: Jaké jsou jednotky pro měření citlivosti mikrofonu?
A:: Jednotkami pro měření citlivosti mikrofonu jsou mV/Pa (milivolt na Pascal) a dBV (decibely vztažené k 1 V).

Q:: Jaký je vztah mezi akustickým tlakem 1 Pa a dB SPL?
A:: Akustický tlak 1 Pa odpovídá 94 dB SPL.

Q:: Který typ mikrofonů má obecně vyšší citlivost?
A:: Kondenzátorové mikrofony mají obecně vyšší citlivost než dynamické mikrofony.

Q:: Co je frekvenční charakteristika mikrofonu?
A:: Frekvenční charakteristika je graf závislosti citlivosti mikrofonu na frekvenci.

Q:: Jak by měla vypadat ideální frekvenční charakteristika?
A:: Ideální frekvenční charakteristika by měla být rovná čára, což znamená stejné snímání všech frekvencí.

Q:: Co je dynamický rozsah mikrofonu?
A:: Dynamický rozsah mikrofonu je rozdíl mezi maximálním akustickým tlakem (SPL max), který mikrofon snese bez zkreslení, a vlastním šumem mikrofonu (ekvivalentní šum).

Q:: Co znamená zkratka SNR a co vyjadřuje?
A:: SNR znamená Signal-to-Noise Ratio (Odstup signálu od šumu) a vyjadřuje, čím vyšší je toto číslo, tím méně mikrofon šumí.

Q:: Co je impedance mikrofonu?
A:: Impedance mikrofonu je jeho výstupní odpor.

Q:: Jaké pravidlo platí pro vztah impedance mikrofonu a vstupní impedance předzesilovače?
A:: Vstupní impedance předzesilovače by měla být alespoň 5–10× vyšší než impedance mikrofonu.

Q:: Na jakém principu fungují elektrodynamické mikrofony?
A:: Elektrodynamické mikrofony fungují na principu elektromagnetické indukce, kdy se vodič pohybuje v magnetickém poli a indukuje se v něm napětí.

Q:: Jaká je konstrukce cívkových dynamických mikrofonů?
A:: U cívkových dynamických mikrofonů je membrána spojena s cívkou, která se pohybuje kolem magnetu.

Q:: Jaké jsou hlavní vlastnosti cívkových dynamických mikrofonů?
A:: Cívkové dynamické mikrofony jsou odolné, snesou vysoký akustický tlak, nepotřebují napájení, mají nižší citlivost a pomalejší reakci na přechodové jevy.

Q:: Kde se nejčastěji používají cívkové dynamické mikrofony?
A:: Používají se pro zpěv na pódiu, snímání bicích a kytarových komb.

Q:: Jaká je konstrukce páskových mikrofonů?
A:: U páskových mikrofonů je místo membrány a cívky v magnetickém poli umístěn tenký zvlněný pásek.

Q:: Jaké jsou hlavní vlastnosti páskových mikrofonů?
A:: Páskové mikrofony mají přirozený zvuk, osmičkovou charakteristiku a často vyžadují kvalitní předzesilovač kvůli nízkému výstupnímu napětí.

Q:: Na jakém principu fungují kondenzátorové mikrofony?
A:: Kondenzátorové mikrofony fungují na principu změny kapacity kondenzátoru, kdy kmitání mění vzdálenost mezi membránou a pevnou elektrodou.

Q:: Jaké jsou hlavní vlastnosti kondenzátorových mikrofonů?
A:: Kondenzátorové mikrofony mají vysokou citlivost, věrný zvuk, rychlou reakci, vyžadují napájení (Phantom +48 V) a jsou náchylnější na vlhkost a zacházení.

Q:: Kde se nejčastěji používají kondenzátorové mikrofony?
A:: Používají se ve studiu (zpěv, akustické nástroje) a ve filmu (shotgun mikrofony).

Q:: Co je charakteristické pro elektretové kondenzátorové mikrofony?
A:: U elektretových kondenzátorových mikrofonů je polarizační napětí trvale "zamrznuto" v materiálu (elektretu) a napájení je potřeba jen pro vestavěný předzesilovač.

Q:: Co udávají směrové charakteristiky mikrofonu?
A:: Směrové charakteristiky udávají citlivost mikrofonu na zvuk přicházející z různých úhlů.

Q:: Jak snímá zvuk mikrofon s kulovou (všesměrovou) charakteristikou?
A:: Mikrofon s kulovou charakteristikou snímá zvuk ze všech stran stejně.

Q:: Jaký princip fungování má kulový mikrofon a jaké má vlastnosti?
A:: Kulový mikrofon funguje na tlakovém principu (zvuk dopadá jen na jednu stranu membrány), nemá proximity efekt a je odolný proti větru.

QQ:: Kde se používají kulové mikrofony?
A:: Kulové mikrofony se používají jako klopové mikrofony, pro snímání atmosféry a na konferencích.

Q:: Jak snímá zvuk mikrofon s osmičkovou charakteristikou?
A:: Mikrofon s osmičkovou charakteristikou snímá zepředu a zezadu, zatímco boky (90°) potlačuje.

Q:: Jaký princip fungování má osmičkový mikrofon a jakou má důležitou vlastnost?
A:: Osmičkový mikrofon funguje na rychlostním principu (zvuk dopadá na obě strany membrány) a má silný proximity efekt.

Q:: Kde se používají osmičkové mikrofony?
A:: Osmičkové mikrofony se používají pro rozhovory dvou lidí naproti sobě a v M-S stereo technice.

Q:: Jak snímá zvuk mikrofon s kardioidní charakteristikou?
A:: Mikrofon s kardioidní charakteristikou snímá hlavně zepředu a potlačuje zvuk zezadu (180°).

Q:: Na jakém principu funguje kardioidní mikrofon a kde se nejčastěji používá?
A:: Kardioidní mikrofon je kombinací tlakového a rychlostního principu a je to nejčastější univerzální charakteristika pro zpěv a ozvučování (omezuje zpětnou vazbu).

QQ:: Jak se liší směrovost hyperkardioidního mikrofonu od kardioidního?
A:: Hyperkardioidní mikrofon má užší směrovost zepředu než kardioida, ale má malý lalok citlivosti vzadu.

QQ:: Kdy se používá hyperkardioidní mikrofon?
A:: Hyperkardioidní mikrofon se používá, když je potřeba větší izolace zdroje zvuku z boků.

Q:: Co je charakteristické pro úzce směrový (obuškový/shotgun) mikrofon?
A:: Úzce směrový mikrofon má extrémní směrovost dopředu a využívá interferenční trubici k vyrušení zvuků z bok
</p>