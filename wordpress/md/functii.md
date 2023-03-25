<div class="knowledge-box">
<strong>Ce vom afla din acest articol:</strong>
- ce este o funcție
- cum folosirea funcțiilor ne simplifică programele
- cum funcțiile comunică cu exteriorul lor
</div>

Până acum, toate programele prezentate în aceste materiale au fost alcătuite din secvențe de instrucțiuni ce aveau scopul de a rezolva problemele prezentate fie prin procesarea unor date de intrare și obținerea unora de ieșire fie prin simpla executare a unor instrucțiuni cum ar fi solicitarea unor date de la utilizator.

Pentru a putea refolosi aceste secvențe și în alte secțiuni ale programului, fară a copia în totalitate instrucțiunile ce le formează, a fost introdus conceptul de **funcție**. Putem privi o funcție că o înșiruire de instrucțiuni pe care o putem folosi de oricâte ori vrem fără a copia instrucțiunile ce o formează ci doar prin folosirea numelui ei.

# Definire #
Structura unei funcții este formată din antetul funcției și corpul ei. Antetul funcției vă conține numele funcției și eventual o listă de parametri, încadrată de paranteze, prin care funcția comunica cu exteriorul ei. Corpul funcției vă conține între acolade declarațiile de variabile și instrucțiunile ce vor realiza efectiv funcționalitatea sa.

```
function nume_funcție ( lista opțională de parametri )
{
    < declarații + instrucțiuni funcție >
}
```

Că sintaxă observăm următoarele elemente:
- cuvântul cheie <code>function</code> care indică faptul că urmează să definim o funcție nouă
- <code>nume funcție</code> este identificatorul prin care vom putea executa instrucțiunile ce o formează
- <code>lista de parametri</code> ne ajută să specificăm datele de care are nevoie funcția
- corpul funcției este format din <code>declarațiile de variabile</code> și din <code>setul de instrucțiuni</code> pe care vrem să-l conțină

Declarația unei funcții poate fi extinsă și pe lângă definierea parametrilor și a instrucțiunilor de executat, se poate indica și o valoare rezultat a funcției. Spunem în acest caz că funcția 'întoarce' o valoare. Pentru a indica ce rezultat dorim să întoarcă funcția, vom folosi cuvântul rezervat **return** urmat de această valoare.

```
function nume_funcție ( listă opțională de parametri )
{
    < declarații + instrucțiuni funcție >
	
    return < valoare rezultat >
}
```

O funcție poate conține mai multe cuvinte cheie <code>return</code> iar aceste cuvinte pot să apară oriunde în corpul funcției. Ca și în cazul unui singur cuvânt cheie <code>return</code> acesta nu e obligatoriu să apară la sfârșit doar că dacă acesta apare mai devreme trebuie să avem în vedere ce orice instrucțiuni aflate după el nu se vor mai executa - acest cuvânt indică sfârșitul funcției și întoarcerea execuției programului înapoi la locația de la care s-a făcut apelul funcției.

# Apelul unei funcții #
Pentru a executa instrucțiunile aferente corpului funcției, va trebui să apelăm funcția ce le conține pentru că doar simpla definire a funcției nu va executa instrucțiunile. Luând exemplul de mai sus, pentru a executa corpul funcției va trebui să scriem:

``` nume_functie(parametru1, parametru2, ...); ```

``` parametru1, parametru2 ``` sunt datele de intrare de care funcție are nevoie. Pot exista funcții însă care nu au nevoie de niciun parametru caz în care nu vom specifica nimic între paranteze.

<div class="info-box">O funcție extrem de utilă în dezvoltarea programelor Javascript este <code>console.log()</code> care ne ajută să afișăm conținutul variabilelor în <em>Consola de iesire</em> și totodată în consola de depanare a browserului (apasă tasta F12 în browserul Chrome și apoi selectează Console)</div>

# Exemple #
Să vedem cum ne ajută o funcție. Luăm exemplul de mai jos în care vrem să afișăm valoarea a două numere introduse de utilizator ridicate la puterea a doua. Prima oară vom solicita un număr pozitiv iar ulterior unul negativ.

<div class="algovis" config-id="functii-basics.json" av-selected="2"></div>

Observăm cât de multe instrucțiuni se repetă și cât de similare par instrucțiunile pentru cele două cazuri: număr pozitiv și negativ. Să refacem acum exemplul folosind funcții.

<div class="algovis" config-id="functii-basics.json" av-selected="3"></div>

Am refăcut astfel programul încât secvențele duplicate de instrucțiuni sunt eliminate, fiind înlocuite cu funcțiile <code>numar_la_patrat</code> și <code>solicita_numar</code> ce primesc ca parametru tipul de număr pe care îl solicitam. În liniile ulterioare observăm cum este folosit numele funcției pentru a executa instrucțiunile aferente ei. Textele din paranteze reprezintă valoarea parametrului tip_numar. La prima apelare a funcției parametrul va avea valoarea 'pozitiv’ iar la cea de-a doua 'negativ’. Acest parametru este transmis mai departe funcției <code>solicita_numar</code> care validează că utilizatorul într-adevăr introduce un număr ce respectă criteriul de pozitiv/negativ. Parametrul tip_numar al funcției <code>solicita_numar</code> devine astfel o variabilă în interiorul funcției și este folosit ca atare.

Reușim astfel să structurăm programul nostru în secvențe de instrucțiuni cu un scop precis și reutilizabil. Putem privi aceste funcții că pe niște cutii negre care pe baza unor **parametri de intrare** ne oferă un **rezultat** iar modalitatea prin care aceste funcții ajung la rezultat este strict sarcina lor și mai mult, această modalitate putând fi ulterior modificată fără a afecta corectitudinea programul nostru. Atât timp cât funcția respecta cerințele inițiale pentru care a fost creată, mecanismul de implementare al funcției poate fi reimplementat ori de câte ori este necesar.

<img src="../wp-content/uploads/2023/img/black_box.png" class="img-box">

În exemplul nostru mai putem face o modificare și utiliza funcția _Math.pow_ în loc să multiplicam explicit cele două valori.

```
console.log('Valoarea numărului ' + tip_numar + 'la patrat este ' + Math.pow(număr, 2));
```
Am folosit în acest caz funcția _Math.pow_ care nu este definită de noi ci chiar de limbajul Javascript, fiind o funcție implicit a acestuia (_built-in_) având același efect ca și multiplicarea pe care o făceam noi explicit.

Pe lângă funcțiile definite de noi, există o multitudine de alte funcții predefinite ale limbajul Javascript pe care noi le putea utiliza. Acest lucru ne scutește de efortul de a mai reimplementa cerințele acelor funcții de la 0 – putem accesa acele funcționalități doar prin simplul lor apel (ex. _Math.cos(), Math.round(), parseInt(), isNan(), etc._)

# Parametri unei funcții #
Parametri funcțiilor (denumiți și parametri formali) pot fi priviți că fiind datele prin care putem comunica cu funcția și cu ajutorul cărora putem executa anumite instrucțiuni în corpul funcției. Acești parametrii se transformă de altfel în variabile în corpul funcției putând fi folosiți că orice altă variabilă declarată în corpul funcției. Un aspect foarte important de menționat este că orice modificare adusă acestor parametrii nu se vă reflecta după terminarea apelului funcției dacă variabila modificată este de tip primitiv (număr, text). Cu alte cuvinte, clienții funcției (cei care o apelează folosind anumiți parametrii) nu vor vedea nicio modificare adusă parametrilor de intrare dacă noi încercăm să le modificam valoarea în corpul funcției. Acest lucru se întâmplă deoarece acesta listă de parametrii este de fapt o listă de copii a parametrilor folosiți atunci când se efectuează apelul funcției iar orice modificare adusă lor va fi făcută efectiv asupra copilor și nu asupra parametrilor menționați în apelul funcției.

<div class="algovis" config-id="functii-basics.json" av-selected="1"></div>

Funcția <code>dubleaza</code> primește că parametru un <code>numar</code> pe care noi încercăm să îl modificăm în speranța că după apelul acestei funcții de dublare, parametrul trimis își vă păstra valoarea modificată. Rulând exemplul vedem cum instrucțiunea <code>numar = numar * 2;</code> are doar efect local, modificând valoarea parametrului doar în scopul funcției însă o dată cu părăsirea acesteia, variabila <code>x</code> aferentă parametrului <code>numar</code> are aceeași valoare că înainte de apelul funcției.

<div class="attention-box">
<strong>Rezumat:</strong>
- O funcție este formată din antet plus corp adică numele său și lista de parametri urmată de declarații de variabile și instrucțiuni
- Opțional o funcție poate întoarce un rezultat prin folosirea cuvântului cheie <strong>return</strong>
- Beneficiul principal al folosirii funcțiilor este de a reduce duplicarea instrucțiunilor însă vom învăța și de alte avantaje în articolele următoare
- Mecanismul de transmitere a parametrilor de tip primitiv se face prin copierea variabilei specificate la apelul funcției așa că orice modificare adusă parametrului în interiorul funcției se face efectiv asupra acestei copii și <strong>nu asupra variabilei folosite în apel</strong>
</div>

<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<a config-id="../wp-content/uploads/2023/quizzes/functii.json" class="av-quiz av-btn-sm">Deschide quiz</a>
<p>iar apoi folosește ce ai învățat rezolvând următoarele exerciții:</p>
<a class="av-btn-sm" href="/exercitii-functii/" target="_blank" rel="noopener">Deschide exerciții</a>
</div>
