<div class="knowledge-box">
<strong>Ce vom afla din acest articol:</strong>
- ce sunt operatorii
- ce sunt expresiile
- cum se evaluează expresiile
</div>

# Operatori #
Pentru a putea efectua sarcini utile cu conținutul variabilelor avem nevoie să putem specifica diferite operații pe care ni le dorim (pentru a realiza suma a două numele avem nevoie să le putem aduna). A fost introdus astfel conceptul de **operator** care exact ca cel din matematică, ne ajută să definim operații simple asupra variabilelor cu care îi folosim. Am folosit în exemplele trecute o multitudine de operatori alături de diferite constante (4, 12) sau variabile (x). Acești parametrii ai operatorilor se mai numesc și **operanzi** și reprezintă datele de intrare pentru un operator. 

<img src="../wp-content/uploads/2023/img/operatori1.jpg" class="img-box">

 Se disting multe tipuri de operatori: 
<span class="list-arrow"></span>**atribuire:** <code>=</code>
<span class="list-arrow"></span>**aritmetici:** <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code>
<span class="list-arrow"></span>**incrementare/decrementare:** <code>++</code>, <code>--</code>
<span class="list-arrow"></span>**de comparatie:** <code>&lt;</code>, <code>></code>
<span class="list-arrow"></span>**de egalitate:** <code>==</code>, <code>!=</code>
<span class="list-arrow"></span>**logici:** <code>&amp;&amp;</code>, <code>||</code>, <code>!</code>

**Exemplul 1:**
<div class="algovis" config-id="tipuri-date-2.json">
</div>

În exemplul de mai sus putem observa și cum diferă comportamentul operatorului <code>+</code> în funcție de operanzii cărora este aplicat. În liniile 3-5 este folosit cu operanzi numerici unde va efectua operația de adunare însă în liniile 18-20 el este folosit cu operanzi text ceea ce va face ca rezultatul expresiei să fie concatenarea (alăturarea) celor doi operanzi.

<div class="attention-box">
Operatorii <code>--</code> și <code>++</code> numiți și operatori <strong>incrementare/decrementare</strong> au fiecare două versiuni, prefix și postfix (<code>--u</code> vs <code>u++</code>) și chiar dacă efectul lor este același, adună sau scad 1 variabilei la care sunt aplicați, se comportă diferit atunci când sunt folosiți în construcții de genul <code>let c = u--</code>. Operatorul prefix vă scădea 1 variabilei și va întoarce noua valoare pe când cel postfix, va scădea 1 variabilei dar va întoarce valoare veche a variabilei nu cea nouă.
</div>

<div class="info-box">Există câteva utilitare în limbajul Javascript ce ne ușurează mult procesul de dezvoltare a programelor noastre:
 - <code>console.log(continut)</code> ne ajută să afișăm conținutul variabilelor în <em>Consola de ieșire</em> și totodată în consola de depanare a browserului (apasă tasta F12 în browserul Chrome și apoi selectează Console). Această funcție primește ca parametru conținutul pe care vrem să îl afișăm, fie variabile fie texte. 
    Ex. <em>console.log('Acesta este primul meu mesaj')</em> sau <em>console.log(x)</em>, unde <em>x</em> este orice variabilă

- <code>prompt(text)</code> ne permite să solicităm date de la utilizator. Această funcție primește ca parametru textul pe care vrem să îl afișăm utilizatorului și ne va întoarce valoarea introdusă de utilizator.
    Ex.<em>let x = prompt('x=')</em>, va deschide o casetă în care va solicita o valoare iar acea valoare va fi stocată apoi în variabila <em>x</em> pe care o putem folosi în program
</div>

# Expresii #
Combinațiile de operatori și operanzi observăm că au mereu un rezultat obținut în urma aplicării operatorului asupra operanzilor (de ex. <code>sum = x + 12</code> are ca rezultat 16, valoare ce va este atribuită apoi variabilei *sum*). Construcțiile în care sunt folosiți operatori și operanzi pentru a obține un rezultat poartă numele de **expresii** iar caracteristica lor principală este că se pot evalua sub forma unui rezultat.

<img src="../wp-content/uploads/2023/img/expresii1.jpg" class="img-box">

**Exemplul 2:**
<div class="algovis" config-id="tipuri-date-3.json">
</div>

<div class="info-box"><strong>Operatorul %</strong> numit și modulo este folosit pentru a determina restul împărțirii a două numere întregi și este foarte util în a determina dacă un număr este par sau impar având în vedere că restul împărțirii la 2 a unui număr par va fi mereu 0.</div>

## Expresii relationale si logice ##
De foarte multe ori vom vedea expresii care intorc rezultate de tipul <em>adevarat</em> sau <em>fals</em>, numindu-le in acest caz <strong>expresii relationale</strong> (de ex. <code>4 > 12</code> se va evalua la fals pentru ca 4 nu este mai mare ca 12). Combinand apoi mai multe expresii relationale folosind operatori logici (<code>&amp;&amp;, ||, !</code>) vom obtine <strong>expresii logice</strong> care la randul lor intorc tot rezultate boolene (adevarat/fals).

Tabelul de adevar de mai jos ne va ajuta sa intelegem rezultatul expresiilor logice in functie de valorile sub-expresiilor ce le compun.

De foarte multe ori vom vedea expresii care întorc rezultate de tipul _adevărat_ sau _fals_, numindu-le în acest caz <strong>expresii relaționale</strong> (de ex. <code>4 > 12</code> se va evalua la fals pentru că 4 nu este mai mare că 12). Combinând apoi mai multe expresii relaționale folosind operatori logici (<code>&amp;&amp;, ||, !</code>) vom obține <strong>expresii logice</strong> care la rândul lor întorc tot rezultate boolene (adevărat/fals).

Tabelul de adevăr de mai jos ne va ajuta să înțelegem rezultatul expresiilor logice în funcție de valorile sub-expresiilor ce le compun.

<img src="../wp-content/uploads/2023/img/tabellogic.png" class="img-box">

# Evaluarea expresiilor #
A evalua o expresie înseamnă a calcula valoarea aceasteia și se face prin înlocuirea în expresie a fiecărei variabile cu valoarea ei iar apoi efectuarea operațiilor specificate de operatori folosind aceste valori. Cu alte cuvinte, evaluarea unei expresii presupune determinarea valorii fiecărui identificator prezent în componența expresiei. Procesul de evaluare a unei expresii presupune folosirea unor reguli de aplicare specifice fiecărui operator prezent în expresie iar aceste reguli trebuie să aibă în vedere <strong>prioritatea (precedența) și asociativitatea lor</strong>.

# Precedența operatorilor #
Ca și în matematică, atunci când avem o expresie ce conține mai mulți operatori (de ex. <code>+</code> si <code>*</code>) vom efectua mai întăi operația de înmulțire și apoi adunarea iar acest mecanism se numește precedență. Vom spune în acest caz că înmulțirea/împărțirea au un <strong>nivel de precedență</strong> mai mare decât adunarea/scăderea.

În expresia <code>let r = 1 + 2 \* 3</code> se va efectua mai întâi înmulțirea dintre 2 și 3 iar apoi adunarea cu 1. Dacă dorim să suprascriem acest mecanism implicit, o putem face prin utilizarea parantezelor. Astfel <code>let r = (1 + 2) \* 3</code> va determina efectuarea adunării mai întăi iar apoi înmulțirea acestui rezultat cu 3.

# Asociativitatea operatorilor #
Dacă o expresie conține mai mulți operatori cu acceeasi precedență, se va folosi asociativitatea lor pentru a determina ordinea de evaluare. Asociativitatea unui operator ne va indica dacă ordinea de evaluare a unei expresii din care face parte operatorul este de la stânga la dreapta sau invers.

Regulile generale de aplicare a operatorilor în cadrul expresiilor:
1. se vor evalua mai întâi expresiile dintre paranteze începând cu cele mai interioare
2. dacă o expresie nu conține paranteze, se va folosi precedența operatorilor pentru a determina ordinea de evaluare
3. dacă o expresie conține mai mulți operatori cu aceeași precedență, se va tine cont apoi de asociativitatea lor (care în general este de la stânga la dreapta)

În cazul operatorilor aritmetici <code>+, -, /, +</code>, asociativitatea lor este de <strong>stânga</strong>. În expresia <code>let r = 8 / 4 / 2 </code> se va evalua de la stânga la dreapta, adică mai întâi 8 / 4 iar apoi rezultatul se va împărți la 2. Operatorul <code>\*\*</code> (exponent) de ridicare la putere are în schimb asocitivitate de <strong>dreapta</strong> ceea ce înseamnă că într-o expresie <code>let p = 2 \*\* 3 \*\* 4</code> se va ridica 3 la puterea a 4-a iar abia apoi 2 la puterea rezultată din prima evaluare.

<div class="info-box">
<strong>Regulile de aplicare</strong> a operatorilor în cadrul expresiilor pot fi întortocheate și neintuitive însă putem evita foarte ușor acestă capcană prin specificarea explicită a ordinii de evaluare cu ajutorul <strong>parantezelor</strong>.
</div>

În loc să scriem <code>let s = 8 / 2 ** 2</code> unde din cauză că operatorul exponent are precedență mai mare decât împărțirea, se va efectua mai întâi ridicarea la puterea și apoi împărțirea, vom elimina orice dubiu prin specificarea ordinii pe care ne-o dorim folosind parantezele astfel:
- <code>let s = (8 / 2) ** 2</code> dacă vrem să efectuăm mai întâi împărțirea
- <code>let s = 8 / (2 ** 2)</code> dacă vrem ridicarea la putere să fie efectuată prima și apoi împărțirea.

<div class="attention-box">
<strong>Rezumat:</strong>
- Operatorii sunt mijlocul prin care putem efectua operații asupra datelor (numiți și operanzi)
- Expresiile sunt construcții ce conțin operatori și operanzi și pot folosi opțional și paranteze pentru a grupa sub-operațiile 
- Evaluarea unei expresii presupune folosirea unor <strong>reguli de aplicare</strong> a operatorilor asupra operanzilor referitoare la prioritatea lor față de alți operatori (precedență) și legate de ordinea aplicării operatorilor (de la stânga la dreapta sau invers)
- Pentru a evita greșeli legate de ordinea intepretarii operațiilor într-o expresie este recomandată folosirea <strong>parantezelor</strong> pentru a face explicită ordinea pe care o avem în vedere
</div>

<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<a config-id="../wp-content/uploads/2023/quizzes/operatori.json" class="av-quiz av-btn-sm">Deschide quiz</a>
<p>iar apoi folosește ce ai învățat rezolvând următoarele exerciții:</p>
<a class="av-btn-sm" href="/exercitii-operatori/" target="_blank" rel="noopener">Deschide exerciții</a>
</div>