<div class="tip-box">
<strong>Ce vom afla din acest articol:</strong>
 - ce sunt obiectele
 - ce este o referință
 - cum se comportă obiectele trimise ca parametri funcțiilor
</div>

Un obiect în limbajul Javascript nu este altceva decât o colecție de proprietăți asociate unei entități pe care vrem să o reprezentăm în programul nostru. Putem privi aceste obiecte ca obiectele din lumea reală, acestea având diferite caracteristici / proprietăți specifice lor. Să luăm de exemplu caracteristicile unei sticle, cum ar fi: înălțime, volumul de lichid pe care îl poate stoca, greutate, diametru. Tipurile de date obiect ne ajută să stocăm în programul nostru asfel de informații.

<img src="../wp-content/uploads/2023/img/sticla.png" class="img-box">

# Creare obiecte #
Pentru a defini o variabilă de tip obiect vom folosi sintaxa normală declarării oricărei variabile (cuvântul cheie <code>let</code>) urmat de numele variabilei însă apoi vom folosi acolade (<code>{ }</code>) pentru a specifica conținutul obiectului. Între aceste acolade vom putea declara și inițializa proprietățile obiectului.

<div class="algovis" config-id="obiecte-basics.json" av-selected="0"></div>

În exemplul de mai sus am construit un obiect nou numit <code>sticlaApa</code> ce conține două proprietăți:  <code>volum</code> și <code>greutate</code> având valorile 500, respectiv 700. Pentru a citi sau modifica aceste proprietăți putem folosi oricare din următoarele construcții:
- <code>nume_obiect[nume_proprietate]</code>, în cazul nostru sticlaApa['volum']
- <code>nume_obiect.nume_proprietate</code>, în cazul nostru sticlaApa.volum

O altă metodă prin care putem crea un obiect este folosind o <strong>funcție constructor</strong>. Această funcție va primi ca parametri valorile proprietăților obiectului și le va atribui apoi fiecărei proprietăți în parte.

<div class="algovis" config-id="obiecte-basics.json" av-selected="1"></div>

Funcția <code>SticlaApa</code> este funcția constructor ce ne vă crea un obiect nou de tip SticlaApa. Acesta funcție primește 2 parametri, <code>v</code> și <code>g</code> aferenți proprietăților <code>volum</code> și <code>greutate</code>. În interiorul funcției observăm cum acești parametrii sunt atribuiți proprietăților <code>volum</code> și <code>greutate</code> ale obiectului nou creat reprezentat prin variabila <code>this</code>. Variabila <code>this</code> este o variabila specială a limbajului Javascript care stochează obiectul curent în funcție de contextul în care o folosim. În cazul nostru,  <code>this</code> se vă referi la noul obiect pe care îl creăm în interiorul funcției constructor <code>SticlaApa</code>. 

Avantajul folosirii unei funcții constructor este că putem specifica pe lângă valorile proprietăților și anumite critierii de validare ale acestora (cum ar fi să nu stocăm un volum negativ) sau executa orice alte instrucțiuni (cum ar fi afișarea unui mesaj). Folosind prima metodă, acest lucru nu este posibil, sintaxa ne permite doar să atribuim valori proprietăților.

<div class="algovis" config-id="obiecte-basics.json" av-selected="2"></div>

<p class="tip-box">Nu există restricții legate de tipurile de date pe care le putem stoca în valorile proprietăților. Putem crea proprietăți care sunt tot de tip obiect având astfel un obiect imbricat în alt obiect. Există însă o restricție ca tipul proprietății în sine (numele său) să fie de tip text.</p>

# Copierea obiectelor #
Operația de copiere (sau atribuire) a unei variabile altei variabile, se faci folosind operatorul <code>=</code> iar dacă în cazul tipurilor primitive știm că efectul său este să copieze valoarea variabilei sursă în cea destinație, în cazul copierilor între obiecte situația este diferită.

Atribuirea unei obiect altui obiect va duce la crearea unei referințe și nu la crearea unei copii noi identică cu obiectul sursă.

<img src="../wp-content/uploads/2023/img/referinte0.png" class="img-box">

<p class="attention-box">O <strong>referință</strong> poate fi privită ca un alias către obiectul sursă pe care îl referă. Cu alte cuvinte, referința nu are conținut propriu ci îl referă pe cel al obiectului sursă de aceea orice modificare adusă referinței va fi vizibilă obiectului referit.
</p>

<div class="algovis" config-id="obiecte-basics.json" av-selected="5"></div>

În exemplul de mai sus observăm cum modificarea proprietății <code>sticla2.volum</code> va duce la modificarea proprietății  <code>sticla1.volum</code> întrucât  <code>sticla2</code> este o referință a obiectului sticla1 și nu o copie a sa.

# Transmiterea obiectelor ca parametri funcțiilor #
În articolele trecute discutam cum un parametru de tip primitiv (numeric, text) transmis unei funcții, chiar dacă ar fi modificat în funcția în care este transmis, această modificare se va pierde la finalul execuției funcției. Efectiv, modificările aduse acestor parametrii nu sunt vizibile în afara funcției. Aceste mecanism de transmitere a parametrilor în Javascript se numește <strong>prin valoare</strong> ceea ce face ca parametri pe care funcțiile îi primesc să fie de fapt niște copii ale variabilelor efectiv transmise la apelul funcției.

<div class="algovis" config-id="obiecte-basics.json" av-selected="3"></div>

Prin rularea exemplului de mai sus observăm exact cum funcționează acest mecanism întrucât variabila <code>a</code> este doar o copie a variabilei <code>numar</code> transmisă funcției <code>foo</code>.

În cazul obiectelor, lucrurile stau puțîn diferit. Chiar dacă transmiterea unui parametru de tip obiect se face tot prin valoare, această copie este acum o copie a unei referințe către obiectul nostru și nu un întreg duplicat al său ca în cazul tipurilor primitive. Acest mecanism diferă între tipurile primitive și cele obiect întrucât copierea în întregime a unui obiect este o operație costisitoare și ar fi dus la scăderea performanței programelor Javascript dacă s-ar fi dorit păstrarea identică a mecanismelor de transmitere între tipurile primitive și cele obiect.

Acest mecanism diferit de transmitere a tipurilor obiect face că modificările aduse valorilor proprietăților să fie acum vizibile în afara funcției. 

<div class="algovis" config-id="obiecte-basics.json" av-selected="4"></div>

Putem observa cum variabila <code>a</code> nu mai este o copie a variabilei <code>numar</code> ci o copie ce conține o referință către variabila <code>numar</code> iar orice modificare adusă proprietăților sale vor fi acum vizibile în variabila <code>numar</code> pe care o referă.

Chiar daca putem modifica proprietățile unui parametru de tip obiect, nu putem în schimb să modificăm complet obiectul cu unul nou, adică o atribuire <code>a = { }</code> nu va avea niciun efect întrucât modificăm o copie a unei referințe care se va pierde la ieșirea din funcție.

<div class="attention-box">
<strong>Rezumat:</strong>
- un obiect este o colecție de proprietăți asociată unei entități
- atribuirea unui obiect altui obiect va duce la crearea unei referințe și nu a unei copii
- obiectele transmise ca parametri funcțiilor pot fi modificați în interiorul acestora iar modificările vor fi vizibile după sfârșitul apelului funcției
</div>