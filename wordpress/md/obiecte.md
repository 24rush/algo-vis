Un obiect in limbajul Javascript nu este altceva decat o colectie de proprietati asociata unei entitati pe care vrem sa o reprezentam in programul nostru. Putem privi aceste obiecte ca obiectele din lumea reala, acestea avand diferite caracteristici / proprietati specifice lor. Sa luam de exemplu caracteristicile unei sticle, cum ar fi: inaltime, volum de lichid pe care il poate stoca, greutate, diametru. Tipurile de date obiect ne ajuta sa stocam in programul nostru asfel de informatii.

<img src="../wp-content/uploads/2023/img/sticla.png" class="img-box">

# Creare obiecte #
Pentru a defini o variabila de tip obiect vom folosi sintaxa normala declararii oricarei variabile (cuvantul cheie <code>let</code>) urmat de numele variabilei insa apoi vom folosi acolade (<code>{ }</code>) pentru a specifica continutul obiectului. Intre aceste acolade vom putea declara si initializa proprietatile obiectului.

<div class="algovis" config-id="obiecte-basics.json" av-selected="0"></div>

In exemplul de mai sus am construit un obiect nou numit <code>sticlaApa</code> ce contine doua proprietati: <code>volum</code> si <code>greutate</code> avand valorile 500, respectiv 700. Pentru a citi sau modifica aceste proprietati putem folosi oricare din urmatoarele constructii:
-  <code>nume_obiect[nume_proprietate]</code>, in cazul nostru <code>sticlaApa['volum']</code>
- <code>nume_obiect.nume_proprietate</code>, in cazul nostru <code>sticlaApa.volum</code>

O alta metoda prin care putem crea un obiect este folosind o <strong>functie constructor</strong>. Aceasta functie va primi ca parametrii valorile proprietatilor obiectului si le va atribui apoi fiecarei proprietati in parte.

<div class="algovis" config-id="obiecte-basics.json" av-selected="1"></div>

Functia <code>SticlaApa</code> este functia constructor ce ne va crea un obiect nou de tip SticlaApa. Acesta functie primeste 2 parametri, <code>v</code> si <code>g</code> aferenti proprietatilor <code>volum</code> si <code>greutate</code>. In interiorul functiei observam cum acesti parametri sunt atribuiti proprietatilor <code>volum</code> si <code>greutate</code> ale obiectului nou creat reprezentat prin variabila <code>this</code>. Variabila <code>this</code> este o variabila speciala a limbajului Javascript care stocheaza obiectul curent in functie de contextul in care o folosim. In cazul nostru, <code>this</code> se va referi la noul obiect pe care il crem in interiorul functiei constructor <code>SticlaApa</code>. 

Avantajul folosirii unei functii constructor este ca putem specifica pe langa valorile proprietatilor si anumite critierii de validare ale acestora (cum ar fi sa nu stocam un volum negativ) sau executa orice alte instructiuni (cum ar fi afisarea unui mesaj). Folosind prima metoda, acest lucru nu este posibil, sintaxa ne permite doar sa atribui valori proprietatilor.

<div class="algovis" config-id="obiecte-basics.json" av-selected="2"></div>

<p class="tip-box">Nu exista restrictii legate de tipurile de date pe care le putem stoca in valorile proprietatilor. Putem crea proprietati care sunt tot de tip obiect avand astfel un obiect imbricat in alt obiect. Exista insa o restrictie ca tipul proprietatii in sine (numele sau) sa fie de tip text.</p>

# Copierea obiectelor #
Operatia de copiere (sau atribuire) a unei variabile altei variabile, se faci folosind operatorul <code>=</code> iar daca in cazul tipurilor primitive stim ca efectul sau este sa copieze valoarea variabilei sursa in cea destinatie, in cazul copierilor intre obiecte situatia este diferita.

Atribuirea unei obiect altui obiect va duce la crearea unei referinte si nu la crearea unei copii noi identica cu obiectul sursa.

<img src="../wp-content/uploads/2023/img/referinte0.png" class="img-box">

<p class="attention-box">O <strong>referinta</strong> poate fi privita ca un alias catre obiectul sursa pe care il refera. Cu alte cuvinte, referinta nu are continut propriu ci il refera pe cel al obiectului sursa de aceea orice modificare adusa referintei va fi vizibila obiectului referit.</p>

<div class="algovis" config-id="obiecte-basics.json" av-selected="5"></div>

In exemplul de mai sus observam cum modificarea proprietatii <code>sticla2.volum</code> va duce la modificarea proprietatii <code>sticla1.volum</code> intrucat <code>sticla2</code> este o referinta a obiectului <code>sticla1</code> si nu o copie a sa.

# Transmiterea obiectelor ca parametri functiilor #
In articolele trecute discutam cum un parametru de tip primitiv (numeric, text) transmis unei functii, chiar daca ar fi modificat in functia in care este transmis, aceasta modificare se va pierde la finalul executiei functiei. Efectiv, modificarile aduse acestor parametri nu sunt vizibile in afara functiei. Aceste mecanism de transmitere a parametrilor in Javascript se numeste <strong>prin valoare</strong> ceea ce face ca parametrii pe care functiile ii primesc sa fie de fapt niste copii ale variabilele efectiv transmise la apelul functiei.

<div class="algovis" config-id="obiecte-basics.json" av-selected="3"></div>

Prin rularea exemplului de mai sus observam exact cum functioneaza acest mecanism intrucat variabila <code>a</code> este doar o copie a variabilei <code>numar</code> transmisa functiei <code>foo</code>.

In cazul obiectelor, lucrurile stau putin diferit. Chiar daca transmiterea unui parametru de tip obiect se face tot prin valoare, aceasta copie este acum o referinta catre obiectul nostru si nu o intreaga copie a sa ca in cazul tipurilor primitive. Acest mecanism difera intre tipurile primite si cele obiect intrucat copierea in intregime a unui obiect este o operatie costisitoare si ar fi dus la scaderea performantei programelor Javascript daca s-ar fi dorit pastrarea identica a mecanismelor de transmitere intre tipurile primitive si cele obiect.

Acest mecanism diferit de transmitere a tipurilor obiect face ca modificarile aduse valorilor proprietatilor sa fie acum vizibile in afara functiei. 

<div class="algovis" config-id="obiecte-basics.json" av-selected="4"></div>

Putem observa cum variabila <code>a</code> nu mai este o copie a variabilei <code>numar</code> ci o copie ce contine o referinta catre variabila <code>numar</code> iar orice modificare adusa proprietatilor sale vor fi acum vizibile in variabila <code>numar</code> pe care o refera.

<p class="attention-box">Chiar daca putem modifica proprietatile unui parametru de tip obiect, nu putem in schimb sa modificam complet obiectul cu unul nou, adica o atribuire <code>a = { }</code> nu va avea niciun efect intrucat modificam o copie a unei referinte care se va pierde la iesirea din functie.</p>