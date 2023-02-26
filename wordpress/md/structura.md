Un limbaj de programare este format dintr-un set de <strong>cuvinte</strong> alaturi de un set de <strong>reguli de folosire</strong> ale acestora. Aceste cuvinte se pot imparti in doua categorii: <strong>cuvinte cheie</strong> rezervate limbajului si cuvinte specificate de catre utilizator numite si <strong>identificatori</strong>. Constructiile in care folosim aceste cuvinte cheie alaturi de identificatori formeaza comenzi (instructiuni) iar o insiruire de astfel de comenzi formeaza un program.

<p class="tip-box">Pentru a marca <strong>sfarsitul unei instructiuni</strong> vom folosi caracterul <code>;</code> si preferabil putem trece si pe o linie noua insa acest lucru nu este obligatoriu.</p>

# Cuvinte cheie #
Cuvintele cheie rezervate (sau _keywords_) ale unui limbaj de programare sunt similare cuvintelor din limbile vorbite, diferenta fiind ca daca intr-o limba de vorbire un cuvant poate avea mai multe interpretari, intr-un limbaj de programare, aceste cuvinte au un singur sens. Cuvintele rezervate sunt probabil singurul lucru pe care va trebui sa il invatam pe de rost din domeniul programarii si ajung sa fie undeva la aproximativ 50 de cuvinte. Aceste cuvintele cheie rezervate plus regulile lor de folosire alcatuiesc sintaxa limbajului de programare. Gasim mai jos lista cu toate cuvintele cheie ale limbajului Javascript:

|A|B|C|D|E|F|I|L|N|P|R|S|T|V|W|Y|
|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|
|<span class="pill">await</span>|<span class="pill">break</span>|<span class="pill">case</span><span class="pill">catch</span><span class="pill">class</span><span class="pill">const</span><span class="pill">continue</span>|<span class="pill">debugger</span><span class="pill">default</span><span class="pill">delete</span><span class="pill">do</span>|<span class="pill">else</span><span class="pill">enum</span><span class="pill">export</span><span class="pill">extends</span>|<span class="pill">false</span><span class="pill">finally</span><span class="pill">for</span><span class="pill">function</span>|<span class="pill">if</span><span class="pill">implements</span><span class="pill">import</span><span class="pill">in</span><span class="pill">instanceof</span><span class="pill">interface</span>|<span class="pill">let</span>|<span class="pill">new</span><span class="pill">null</span>|<span class="pill">package</span><span class="pill">private</span><span class="pill">protected</span><span class="pill">public</span><span class="pill">return</span><span class="pill">super</span><span class="pill">switch</span>|<span class="pill">static</span>|<span class="pill">this</span><span class="pill">throw</span><span class="pill">try</span><span class="pill">true</span><span class="pill">typeof</span>|<span class="pill">var</span><span class="pill">void</span>|<span class="pill">while</span><span class="pill">with</span>|<span class="pill">yield</span>

Cuvintele cheie sunt cuvinte speciale cu un inteles predefinit ce pot fi folosite doar in constructii ce respecta regulile lor de folosire. Vom reveni pe larg asupra acestor reguli in articolele urmatoare.

<p class="tip-box"><strong>Cuvintele cheie</strong> ale limbajului Javascript folosesc doar litere mici.</p>

# Identificatori #
Pe langa cuvintele cheie ale limbajului, un program va contine si <strong>identificatori</strong>. Acestia sunt cuvinte alese de programator pentru a defini entitati din programul sau cum ar fi **variabile**, **nume de functii** sau **literale (constante)** (vom reveni asupra fiecarei categorii in capitolele urmatore). Identificatorii pot fi orice text ales de catre noi care nu se suprapune cu un cuvant cheie rezervat al limbajului Javascript - cum spuneam mai sus, orice cuvant dintr-un limbaj de programare trebuie sa aiba un singur inteles iar aceasta suprapunere ar duce la invalidarea acestei cerinte.

<p class="attention-box">Atat cuvintele cheie cat si identificatorii sunt <strong>case-sensitive</strong> in limbajul Javascript adica se face diferenta intre literele mici si cele mari. De ex, daca denumim o entitate a programului nostru <strong>scorCurent</strong> aceasta va fi diferita de una denumita <strong>ScorCurent</strong> (a se observa prima litera)</p>

## Variabile ##

Un prim exemplu de identificator este pentru cele mai comune entitati ale oricarui program si anume <strong>variabilele</strong>. Variabilele reprezinta mecanismul prin care putem stoca informatii pentru a le accesa si modifica ulterior - sunt elementul de baza ale oricarui limbaj de programare. Putem asimila acest concept cu cel al varibilelor din matematica (x, y, etc.) unde prin intermediul unor nume (x) ne putem folosi de valorile pe care le stocheaza (5). 

Elementele caracteristice ale unei variabile:
- **nume**: numele este un identificator (cuvant ales exclusiv de catre noi) cu care ‘botezam’ valoarea pe care vrem sa o stocam
- **continut sau valoare**: reprezinta informatia utila ce avem nevoie sa o retinem
- **tip de continut**: aceasta valoare pe care o stocam poate fi un numar, un text ("Amalia") sau orice alta structura mai complicata. Fiecare limbaj de programare are propriile reguli cand vine vorba de tipurile de date, Javascript este un limbaj permisiv care nu ne cere sa specificam exact ce tip de data urmeaza sa stocam intr-o variabila si mai mult, putem modifica ulterior tipul de data al unei variabile (in limbaje precum C++, o variabila poate contine un singur tip de data si va trebui sa il specificam din momentul in care definim aceasta variabila)

In limbajul Javascript o variabila se creaza utilizand cuvantul cheie <code>let</code>. Regula de folosire a acestui cuvant cheie este ca trebuie urmat de numele pe care vrem sa il dam variabile si optional si de o valoare initiala pe care vrem sa o dam variabilei (ceea ce se mai numeste si <strong>initializarea</strong> unei variabile). Similar, putem declara o variabila folosind cuvantul cheie <code>const</code> insa in acest caz sunt fortati sa o initializam iar aceasta valoare initiala nu mai poate fi modificata ulterior (efectiv definim o constanta).

<img src="../wp-content/uploads/2023/img/declarare1.png" class="img-box">

<div class="algovis" config-id="limbaj-1.json">
</div>

<p class="attention-box"><strong>Numele unei variabile</strong> trebuie sa inceapa cu o litera (<code>a-z</code> sau <code>A-Z</code>) sau underscore(<code>_</code>). Este important de retinut ca literele mici sunt trate diferit de cele mari asa ca vom putea defini doua variabile <code>nume</code> si <code>Nume</code>, ele find complet separate.
</p>

## Functii ##
Un program este format dintr-o insiruire de comenzi ce utilizeaza anumite date prin intermediul unor variabile si are ca scop obtinerea un rezultat util pentru utilizator. Ne putem imagina aceste comenzi asemenea pasilor dintr-o reteta de gatit, variabilele fiind cantitatile fiecarui ingredient iar rezultatul ca prajitura ce ne rezulta. Pe parcursul unui program vom avea nevoie sa refolosim anumiti pasi in cadrul altor secvente de comenzi iar pentru a evita sa copiem de fiecare data aceste secvente, avem nevoie de functii. 

Functiile sunt un mecanism simplu prin care puteam aloca o secventa de comenzi unui nume iar de fiecare data cand avem nevoie de rezultatul secventei, ne vom folosi de numele functiei in loc sa copiem comenzile de fiecare data. Acest mecanism se mai numeste si reutilizare avand in vedere ca reutilizam aceste secvente in loc sa le duplicam. Vom reveni asupra functiilor intr-un capitol special dedicat lor.

<img src="../wp-content/uploads/2023/img/functii.png" class="img-box">

<p class="tip-box"><strong>Functiile</strong> ne ofera totodata un mecanism de simplificare a programului nostru prin extragerea secventelor comune sub acceasi umbrela (numele functiei). Daca ne-am dori ulterior sa schimba comportamenul acestor secvente, o putem face foarte usor prin simpla modificare a functiei in loc sa cautam secventele imprastiate prin tot programul si sa le modificam pe fiecare in parte. 
</p>

## Literale ##
Literalele pot fi privite ca opusul variabilelor - sunt valori a caror valoare este <strong>constanta</strong> (nemodificabila). Ele reprezinta in contexul programului nostru, valori pe care vrem sa le folosim fie prin atribuire unor variabile fie direct. 

```
let x = 5;
let nume = "Maria";
let suma = -3.5 + x;
```

In acest exemplu, valorile 5 si "Maria" sunt literale, ele reprezinta valori fixe care fie le atribuim unor variable <code>x = 5</code> fie le folosim asa cum sunt <code>-3.5 + x</code>. O categorie oarecum speciala de literale sunt valorile boolene _true_ si _false_.

# Comentarii #
Comentariile sunt o constructie speciala de texte precedate de caracterele **//** sau inconjurate de <strong>/\*</strong> si <strong>*/</strong>. Acestea sunt ignorate intr-un limbaj de programare (regulile de sintaxa nu sunt aplicate), scopul lor este de a descrie pentru programator o sectiune de cod. Ele sunt foarte utile mai ales in cazul in care mai multi programatori lucreaza cu sectiunea de cod respectiva iar acel comentariu ii poate ajuta sa inteleaga mai usor care este intentia autorului.

Exista doua posibilitati de a adauga comentarii: pe o singura linie sau pe mai multe linii. Observam ca pentru comentariile pe mai multe linii vom folosi <code>/\*</code> pentru a deschide sectiunea si o vom inchide cu <code>*/</code> iar tot ce se afla intre aceste doua marcaje este ignorat de limbajul de programare.

```
// comentariu pe o singura linie

/* Comentariu ce se 
*  intinde pe mai multe
*   linii 
*/
```

# Rezumat #
- Un limbaj de programare este format din <strong>cuvinte cheie rezervate</strong> si <strong>identificatori</strong> plus <strong>regulile</strong> lor de folosire
- Tot ce ar trebui un programator pe de rost sunt aceste cuvinte cheie plus regulile aferente lor
- <strong>Identificatorii</strong> sunt elementele dintr-un program care sunt specificate exclusiv de programator - ei pot fi nume de variabile sau functii, texte, etc.
- Comentariile sunt constructii speciale de text care pot ignora regulile de sintaxa ale limbajului atat timp cat sunt specificate intre caracterele speciale <code>/\* */</code> sau <code>//</code>. Rolul lor este de a adauga notite in cod pentru a ajuta programatorul ulterior sa inteleaga secventa de instructiuni
