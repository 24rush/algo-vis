<div class="know-box">
<strong>Ce vom afla din acest articol:</strong>
- care sunt elementele unui limbaj de programare
- cuvintele cheie ale limbajului Javascript
- ce sunt variabilele, funcțiile și literalele
- ce reprezintă comentariile în cod
</div>

Un limbaj de programare este format dintr-un set de <strong>cuvinte</strong> alături de <strong>regulile de folosire</strong> ale acestora. Cuvintele se pot împărți în două categorii: <strong>cuvinte cheie</strong> rezervate limbajului și cuvinte specificate de către utilizator numite și <strong>identificatori</strong>. Construcțiile în care folosim aceste cuvinte cheie alături de identificatori formează <strong>comenzi sau instrucțiuni</strong> iar o înșiruire de astfel de comenzi formează un <strong>program</strong>.

<p class="tip-box">Pentru a marca <strong>sfârșitul unei instrucțiuni</strong> vom folosi caracterul <code>;</code> și preferabil putem trece și pe o linie nouă însă acest lucru nu este obligatoriu.</p>

# Cuvinte cheie #
Cuvintele cheie rezervate (sau _keywords_) ale unui limbaj de programare sunt similare cuvintelor din limbile vorbite, diferența fiind că dacă într-o limbă de vorbire un cuvânt poate avea mai multe interpretări, într-un limbaj de programare, aceste cuvinte au un singur sens. Regulile de folosire ale acestor cuvinte rezervate alcătuiesc <strong>sintaxa</strong> limbajului de programare. 

Găsim mai jos lista cu toate cuvintele rezervate ale limbajului Javascript, teoretic singurul lucru care ar trebui memorat alături de regulile de folosire ale fiecărui cuvânt cheie:

|A|B|C|D|E|F|I|L|N|P|R|S|T|V|W|Y|
|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|
|<span class="pill">await</span>|<span class="pill">break</span>|<span class="pill">case</span><span class="pill">catch</span><span class="pill">class</span><span class="pill">const</span><span class="pill">continue</span>|<span class="pill">debugger</span><span class="pill">default</span><span class="pill">delete</span><span class="pill">do</span>|<span class="pill">else</span><span class="pill">enum</span><span class="pill">export</span><span class="pill">extends</span>|<span class="pill">false</span><span class="pill">finally</span><span class="pill">for</span><span class="pill">function</span>|<span class="pill">if</span><span class="pill">implements</span><span class="pill">import</span><span class="pill">in</span><span class="pill">instanceof</span><span class="pill">interface</span>|<span class="pill">let</span>|<span class="pill">new</span><span class="pill">null</span>|<span class="pill">package</span><span class="pill">private</span><span class="pill">protected</span><span class="pill">public</span><span class="pill">return</span><span class="pill">super</span><span class="pill">switch</span>|<span class="pill">static</span>|<span class="pill">this</span><span class="pill">throw</span><span class="pill">try</span><span class="pill">true</span><span class="pill">typeof</span>|<span class="pill">var</span><span class="pill">void</span>|<span class="pill">while</span><span class="pill">with</span>|<span class="pill">yield</span>

<p class="tip-box">Cuvintele cheie fiind cuvinte speciale cu înțeles predefinit pot fi folosite doar în construcții ce respectă regulile lor de folosire așadar va trebui să învățăm aceste reguli pentru a putea scrie un program. Acest lucru este valabil pentru orice limbaj de programare de altfel.</p>

# Identificatori #
Pe lângă cuvintele cheie ale limbajului, un program va conține și identificatori. Aceștia sunt cuvinte alese de programator pentru a defini entități din programul său cum ar fi: **variabile**, **nume de funcții** sau **literale (constante)**. Identificatorii pot fi orice text ales de către noi care nu se suprapune cu un cuvânt cheie rezervat al limbajului Javascript - cum spuneam mai sus, orice cuvânt dintr-un limbaj de programare trebuie să aibă un singur înțeles iar această suprapunere ar duce la invalidarea acestei cerințe.

<p class="attention-box">Atât cuvintele cheie cât și identificatorii sunt <strong>case-sensitive</strong>, capitalizarea literelor contează în limbajul Javascript adică se face diferența între literele mici și cele mari. De exemplu, dacă denumim o entitate a programului nostru <code>scorCurent</code> aceasta va fi diferită de una denumită <code>ScorCurent</code> (a se observa prima literă)
</p>

## Variabile ##
Un prim exemplu de identificator este pentru cele mai comune entități ale oricărui program și anume **variabilele**. Variabilele reprezintă mecanismul prin care putem stoca informații pentru a le accesa și modifica ulterior - sunt elementul de baza al oricărui limbaj de programare. Putem asimila acest concept cu cel al variabilelor din matematică (x, y, etc.) unde prin intermediul unor nume (x) ne putem folosi de valorile pe care le stochează (5). 

Elementele caracteristice ale unei variabile:
- **nume**: numele este un identificator (cuvânt ales exclusiv de către noi) cu care ‘botezam’ valoarea pe care vrem să o stocăm
- **conținut sau valoare**: reprezintă informația utilă ce avem nevoie să o reținem
- **tip de conținut**: această valoare pe care o stocăm poate fi un număr, un text ("Amalia") sau orice altă structură mai complicată. Fiecare limbaj de programare are propriile reguli când vine vorba de tipurile de date, Javascript este un limbaj permisiv care nu ne cere să specificăm exact ce tip de dată urmează să stocăm într-o variabilă și mai mult, putem modifica ulterior tipul de dată al unei variabile (în limbaje precum C++, o variabilă poate conține un singur tip de dată și va trebui să îl specificăm din momentul în care definim această variabilă)

În limbajul Javascript o variabilă se crează utilizând cuvântul cheie <code>let</code>. Regula de folosire a acestui cuvânt cheie este că trebuie urmat de numele pe care vrem să îl dăm variabilei și opțional și de o valoare inițială pe care vrem să o atribuim variabilei (ceea ce se mai numește și **inițializarea** unei variabile). Similar, putem declara o variabilă folosind cuvântul cheie <code>const</code> însă în acest caz suntem forțați să o inițializăm iar această valoare inițială nu mai poate fi modificată ulterior (efectiv definim o constantă).

<img src="../wp-content/uploads/2023/img/declarare1.png" class="img-box">

<div class="algovis" config-id="limbaj-1.json">
</div>

<p class="attention-box"><strong>Numele unei variabile</strong> trebuie să înceapă cu o literă (<code>a-z</code> sau <code>A-Z</code>) sau underscore(<code>_</code>). Este important de reținut că literele mici sunt trate diferit de cele mari așa că vom putea defini două variabile <code>nume</code> și <code>Nume</code>, ele find complet separate.
</p>

## Funcții ##
Un program este format dintr-o înșiruire de comenzi ce utilizează anumite date prin intermediul unor variabile și are ca scop obținerea unui rezultat util pentru utilizator. Ne putem imagina aceste comenzi asemenea pașilor dintr-o rețetă de gătit, variabilele fiind cantitățile fiecărui ingredient iar rezultatul prăjitura ce ne rezultă. Pe parcursul unui program vom avea nevoie să refolosim anumiți pași în cadrul altor secvențe de comenzi iar pentru a evita să copiem de fiecare dată aceste secvențe, avem nevoie de funcții. 

Funcțiile sunt un mecanism simplu prin care puteam aloca o secvență de comenzi unui nume iar de fiecare dată când avem nevoie de funcționalitatea secvenței, să ne folosim de numele funcției în loc să copiem comenzile de fiecare dată. Acest mecanism se mai numește și reutilizare având în vedere că reutilizăm aceste secvențe în loc să le duplicăm.

<img src="../wp-content/uploads/2023/img/functii.png" class="img-box" style="width: 80%">

<p class="tip-box">Funcțiile ne oferă totodată un mecanism de <strong>simplificare</strong> a programului nostru prin extragerea secvențelor comune sub acceasi umbrelă (numele funcției). Dacă ne-am dori ulterior să schimbăm comportamenul acestor secvențe, o putem face foarte ușor prin simpla modificare a funcției în loc să căutăm secvențele respective împrăștiate prin tot programul și să le modificăm pe fiecare în parte.
</p>

## Literale ##
Literalele pot fi privite ca fiind opusul variabilelor - sunt valori a căror valoare este **constantă** (nemodificabilă). Ele reprezintă în contexul programului nostru, valori pe care vrem să le folosim fie prin atribuire unor variabile fie direct. 

```
let x = 5;
let nume = "Maria";
let suma = -3.5 + x;
```

În acest exemplu, valorile <code>5</code> și <code>"Maria"</code> sunt literale, ele reprezintă valori fixe care fie le atribuim unor variable <code>x = 5</code> fie le folosim așa cum sunt <code>3.5 + x</code> O categorie specială de literale sunt valorile boolene _true_ și _false_.

# Comentarii #
Comentariile sunt o construcție specială de texte precedate de caracterele **//** sau înconjurate de <strong>/\*</strong> si <strong>*/</strong>. Aceste texte sunt ignorate într-un limbaj de programare (regulile de sintaxă nu vor fi aplicate), scopul lor este de a descrie pentru programator o secțiune de cod. Ele sunt foarte utile mai ales în cazul în care mai mulți programatori lucrează pe secțiunea de cod respectivă iar acel comentariu îi poate ajuta să înțeleagă mai ușor care a fost intenția autorului.

Exista două posibilități de a adăuga comentarii: pe o singură linie sau pe mai multe linii. Observăm că pentru comentariile pe mai multe linii vom folosi /\* pentru a deschide secțiunea și o vom închide cu */ iar tot ce se află între aceste două marcaje este ignorat de limbajul de programare.

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
- Comentariile sunt construcții speciale de text care pot ignora regulile de sintaxă ale limbajului atât timp cât sunt specificate între caracterele speciale <strong>/* */</strong> sau <strong>//</strong>. Rolul lor este de a adăuga notițe în cod pentru a ajuta programatorul ulterior să înțeleagă secvența de instrucțiuni
</div>

<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<div class="wp-block-button"><a config-id="../wp-content/uploads/2023/quizzes/structura.json" class="wp-block-button__link wp-element-button av-quiz av-btn-sm">Deschide quiz</a></div>
</div>
