<div class="tip-box">
<strong>Ce vom afla din acest articol:</strong>
- care sunt elementele unui limbaj de programare
- cuvintele cheie ale limbajului Javascript
- ce sunt variabilele, functiile si literalele
- ce reprezinta comentariile in cod
</div>

Un limbaj de programare este format dintr-un set de <strong>cuvinte</strong> alături de un set de <strong>reguli de folosire</strong> ale acestora. Aceste cuvinte se pot împărți în două categorii: <strong>cuvinte cheie</strong> rezervate limbajului și cuvinte specificate de către utilizator numite și <strong>identificatori</strong>. Construcțiile în care folosim aceste cuvinte cheie alături de identificatori formează comenzi (instrucțiuni) iar o înșiruire de astfel de comenzi formează un program.

<p class="tip-box">Pentru a marca <strong>sfârșitul unei instrucțiuni</strong> vom folosi caracterul <code>;</code> și preferabil putem trece și pe o linie noua însa acest lucru nu este obligatoriu.</p>

# Cuvinte cheie #
Cuvintele cheie rezervate (sau _keywords_) ale unui limbaj de programare sunt similare cuvintelor din limbile vorbite, diferența fiind că dacă într-o limbă de vorbire un cuvânt poate avea mai multe interpretări, într-un limbaj de programare, aceste cuvinte au un singur sens. Cuvintele rezervate sunt probabil singurul lucru pe care va trebui să îl învățăm pe de rost din domeniul programării și ajung să fie undeva la aproximativ 50 de cuvinte. Aceste cuvinte cheie rezervate plus regulile lor de folosire alcătuiesc sintaxa limbajului de programare. Găsim mai jos lista cu toate cuvintele cheie ale limbajului Javascript:

|A|B|C|D|E|F|I|L|N|P|R|S|T|V|W|Y|
|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|
|<span class="pill">await</span>|<span class="pill">break</span>|<span class="pill">case</span><span class="pill">catch</span><span class="pill">class</span><span class="pill">const</span><span class="pill">continue</span>|<span class="pill">debugger</span><span class="pill">default</span><span class="pill">delete</span><span class="pill">do</span>|<span class="pill">else</span><span class="pill">enum</span><span class="pill">export</span><span class="pill">extends</span>|<span class="pill">false</span><span class="pill">finally</span><span class="pill">for</span><span class="pill">function</span>|<span class="pill">if</span><span class="pill">implements</span><span class="pill">import</span><span class="pill">in</span><span class="pill">instanceof</span><span class="pill">interface</span>|<span class="pill">let</span>|<span class="pill">new</span><span class="pill">null</span>|<span class="pill">package</span><span class="pill">private</span><span class="pill">protected</span><span class="pill">public</span><span class="pill">return</span><span class="pill">super</span><span class="pill">switch</span>|<span class="pill">static</span>|<span class="pill">this</span><span class="pill">throw</span><span class="pill">try</span><span class="pill">true</span><span class="pill">typeof</span>|<span class="pill">var</span><span class="pill">void</span>|<span class="pill">while</span><span class="pill">with</span>|<span class="pill">yield</span>

Cuvintele cheie sunt cuvinte speciale cu un înțeles predefinit ce pot fi folosite doar în construcții ce respectă regulile lor de folosire. Vom reveni pe larg asupra acestor reguli în articolele următoare.

<p class="tip-box"><strong>Cuvintele cheie</strong> ale limbajului Javascript folosesc doar litere mici.</p>

# Identificatori #
Pe lângă cuvintele cheie ale limbajului, un program va conține și identificatori. Aceștia sunt cuvinte alese de programator pentru a defini entități din programul său cum ar fi **variabile**, **nume de funcții** sau **literale (constante)** (vom reveni asupra fiecărei categorii în capitolele urmatore). Identificatorii pot fi orice text ales de către noi care nu se suprapune cu un cuvânt cheie rezervat al limbajului Javascript - cum spuneam mai sus, orice cuvânt dintr-un limbaj de programare trebuie să aibă un singur înțeles iar această suprapunere ar duce la invalidarea acestei cerințe.

<p class="attention-box">Atât cuvintele cheie cât și identificatorii sunt <strong>case-sensitive</strong> (capitalizarea literelor contează) în limbajul Javascript adică se face diferența între literele mici și cele mari. De ex, dacă denumim o entitate a programului nostru <strong>scorCurent</strong> aceasta va fi diferită de una denumită <strong>ScorCurent</strong> (a se observa prima literă)
</p>

## Variabile ##
Un prim exemplu de identificator este pentru cele mai comune entități ale oricărui program și anume **variabilele**. Variabilele reprezintă mecanismul prin care putem stoca informații pentru a le accesa și modifica ulterior - sunt elementul de baza al oricărui limbaj de programare. Putem asimila acest concept cu cel al varibilelor din matematică (x, y, etc.) unde prin intermediul unor nume (x) ne putem folosi de valorile pe care le stochează (5). 

Elementele caracteristice ale unei variabile:
- **nume**: numele este un identificator (cuvânt ales exclusiv de către noi) cu care ‘botezam’ valoarea pe care vrem să o stocăm
- **conținut sau valoare**: reprezintă informația utilă ce avem nevoie să o reținem
- **tip de conținut**: această valoare pe care o stocăm poate fi un număr, un text ("Amalia") sau orice altă structură mai complicată. Fiecare limbaj de programare are propriile reguli când vine vorba de tipurile de date, Javascript este un limbaj permisiv care nu ne cere să specificăm exact ce tip de dată urmează să stocăm într-o variabilă și mai mult, putem modifica ulterior tipul de dată al unei variabile (în limbaje precum C++, o variabilă poate conține un singur tip de dată și va trebui să îl specificăm din momentul în care definim această variabilă)

În limbajul Javascript o variabilă se crează utilizând cuvântul cheie ```let```. Regula de folosire a acestui cuvânt cheie este că trebuie urmat de numele pe care vrem să îl dăm variabilei și opțional și de o valoare inițială pe care vrem să o atribuim variabilei (ceea ce se mai numește și **inițializarea** unei variabile). Similar, putem declara o variabilă folosind cuvântul cheie ```const``` însă în acest caz suntem forțați să o inițializăm iar această valoare inițială nu mai poate fi modificată ulterior (efectiv definim o constantă).

<img src="../wp-content/uploads/2023/img/declarare1.png" class="img-box">

<div class="algovis" config-id="limbaj-1.json">
</div>

<p class="attention-box"><strong>Numele unei variabile</strong> trebuie să înceapă cu o literă (<code>a-z</code> sau <code>A-Z</code>) sau underscore(<code>_</code>). Este important de reținut că literele mici sunt trate diferit de cele mari așa că vom putea defini două variabile ```nume``` și ```Nume```, ele find complet separate.
</p>

## Functii ##
Un program este format dintr-o înșiruire de comenzi ce utilizează anumite date prin intermediul unor variabile și are că scop obținerea unui rezultat util pentru utilizator. Ne putem imagina aceste comenzi asemenea pașilor dintr-o rețetă de gătit, variabilele fiind cantitățile fiecărui ingredient iar rezultatul prăjitura ce ne rezultă. Pe parcursul unui program vom avea nevoie să refolosim anumiți pasi în cadrul altor secvențe de comenzi iar pentru a evita să copiem de fiecare dată aceste secvențe, avem nevoie de funcții. 

Funcțiile sunt un mecanism simplu prin care puteam aloca o secvență de comenzi unui nume iar de fiecare dată când avem nevoie de funcționalitatea secvenței, ne vom folosi de numele funcției în loc să copiem comenzile de fiecare dată. Acest mecanism se mai numește și reutilizare având în vedere că reutilizăm aceste secvențe în loc să le duplicăm. Vom reveni asupra funcțiilor într-un capitol special dedicat lor.

<img src="../wp-content/uploads/2023/img/functii.png" class="img-box">

<p class="tip-box"><strong>Funcțiile</strong> ne oferă totodată un mecanism de simplificare a programului nostru prin extragerea secvențelor comune sub acceasi umbrelă (numele funcției). Dacă ne-am dori ulterior să schimbăm comportamenul acestor secvențe, o putem face foarte ușor prin simpla modificare a funcției în loc să căutăm secvențele respective împrăștiate prin tot programul și să le modificăm pe fiecare în parte.
</p>

## Literale ##
Literalele pot fi privite ca opusul variabilelor - sunt valori a căror valoare este **constantă** (nemodificabilă). Ele reprezintă în contexul programului nostru, valori pe care vrem să le folosim fie prin atribuire unor variabile fie direct. 

```
let x = 5;
let nume = "Maria";
let suma = -3.5 + x;
```

În acest exemplu, valorile 5 și "Maria" sunt literale, ele reprezintă valori fixe care fie le atribuim unor variable ```x = 5``` fie le folosim așa cum sunt ```-3.5 + x```. O categorie oarecum specială de literale sunt valorile boolene _true_ și _false_.

# Comentarii #
Comentariile sunt o construcție specială de texte precedate de caracterele **//** sau înconjurate de <strong>/\*</strong> si <strong>*/</strong>. Acestea sunt ignorate într-un limbaj de programare (regulile de sintaxă nu sunt aplicate), scopul lor este de a descrie pentru programator o secțiune de cod. Ele sunt foarte utile mai ales în cazul în care mai mulți programatori lucrează cu secțiunea de cod respectivă iar acel comentariu îi poate ajuta să înțeleagă mai ușor care este intenția autorului.

Exista două posibilități de a adăuga comentarii: pe o singură linie sau pe mai multe linii. Observăm că pentru comentariile pe mai multe linii vom folosi <code>/\*</code> pentru a deschide secțiunea și o vom închide cu <code>*/</code> iar tot ce se află între aceste două marcaje este ignorat de limbajul de programare.

```
// comentariu pe o singura linie

/* Comentariu ce se 
*  intinde pe mai multe
*   linii 
*/
```

<div class="attention-box"><strong>Rezumat:</strong>
- Un limbaj de programare este format din <strong>cuvinte cheie rezervate</strong> și <strong>identificatori</strong> plus <strong>regulile</strong> lor de folosire
- Tot ce ar trebui un programator pe de rost sunt aceste cuvinte cheie plus regulile aferente lor
- <strong>Identificatorii</strong> sunt elementele dintr-un program care sunt specificate exclusiv de programator - ei pot fi nume de variabile sau funcții, texte, etc.
- Comentariile sunt construcții speciale de text care pot ignora regulile de sintaxă ale limbajului atât timp cât sunt specificate între caracterele speciale <code>/\* */</code> sau <code>//</code>. Rolul lor este de a adăuga notițe în cod pentru a ajuta programatorul ulterior să înțeleagă secvența de instrucțiuni
</div>