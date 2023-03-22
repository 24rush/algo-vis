<div class="know-box">
<strong>Ce vom afla din acest articol:</strong>
- cu ce ne ajută structurile de control
- structura decizionala și operatorul ternar
- ce sunt structurile repetitive
- cuvintele cheie speciale break și continue
- structura switch
</div>

Un program nu vă putea efectua nimic important doar prin declararea de variabile. Vor exista situații în care vom avea nevoie să executam anumite secvențe de cod numai când anumite condiții sunt adevărate (sau false) sau vom dori să executăm o secvență de cod de un anumit număr de ori. Pentru acest gen de situații au fost create structurile de control care nu sunt altceva decât niște cuvinte cheie cu un anumit set de reguli care ne permit să descriem situațiile enunțate mai sus.

# if-else #
Cea mai utilizată structură de control este structura **if** care s-ar traduce prin *dacă [..] atunci [..]*. 
```
if () {
    
}
```

Aceasta structură folosește doi parametri: 
- expresia pe care să o evalueze
- secvența de cod de executat dacă expresia este adevărată. 

O alta variantă a acestei structuri este cea **if-else** în care putem specifica pe lângă secvență de cod ce ar trebui executată în cazul în care expresia este adevărată și o secvență ce ar trebui executată în cazul contrar (când condiția se evaluează la fals). De reținut că mereu într-o structură if-else vom executa o singură ramură: ori cea de pe ramura adevărat ori invers.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="0"></div>

## Operatorul ternar ##
Pentru structura if-else există o alternativă de exprimare a acesteia prin folosirea unui operator special și anume operatorul ternar. După cum îi spune și numele, este un operator ce solicită 3 operanzi, din acest motiv fiind special pentru că este singurul de acest fel.

<img src="../wp-content/uploads/2023/img/ternar.png" class="img-box">

Structura operatorului este următoarea:
- <code>condiție</code>: condiția ce urmează să fie evaluată
- <code>expresie1</code>: expresia ce urmează a fi evaluată și returnată în cazul în care condiția este adevărată
- <code>expresie2</code>: expresia ce urmează a fi evaluată și returnată în cazul în care condiția este falsă

Putem astfel folosi o singură linie de cod pentru a exprima secvență de mai jos:
```
leț rezultat = 0;
if (condiție) {
    rezultat = expresie1;
} else {
    rezultat = expresie2;
}
```

Singura limitare a acestui operator este că expresiile folosite nu pot fi formate decât dintr-o singură instrucțiune;

# for #
Am aflat cum putem executa secvențe de cod în funcție de o anumită condiție iar acum vom vedea cum să executăm aceeași secvență de mai multe ori. Structura care ne vă ajută se cheamă **for** (sau for-loop) care s-ar traduce prin buclă. 

```
for (; ; ) {
    
}
```

Observăm că are nevoie de patru parametri (din care doi sunt opționali): 
- expresie inițială (opțională)
- expresie care să indice cât timp să executăm secvență
- expresie de executat după fiecare iterație (opțională) care să ne indice pasul la care ne aflăm
- setul de instrucțiuni de executat la fiecare iterație (mai poartă numele și de corpul blocului for)

Ordinea în care se execută operațiile unei structuri for este următoarea:
1. ```expresia inițială``` este executată
2. ```condiția de testat``` este evaluată iar dacă este falsă se vă termina în întregime execuția blocului for, altfel vă trece la pasul 3
3. ```instrucțiuni de executat``` se vor executa în întregime
4. ```expresie de actualizare``` se va executa dacă există
5. se va sări înapoi la pasul 2

În exemplul următor se vor afișă toate numerele de la 1 până la 100.

<div class="algovis" config-id="structuri-control-basics.json"  av-selected="1"></div>

<code>let i = 1</code> este expresia inițială care ne declară o variabilă <code>i</code> pe care o și initializam cu 1.
<code>i <= 100</code> este expresia care ne indică cât timp se vă executa bucla, în acest caz vă fi executată cât timp ```i``` este mai mic decât 100
<code>i++</code> este expresia ce se vă executa după fiecare iterație, în cazul nostru vă aduna 1 de fiecare dată la valoarea lui i, făcându-l după fiecare iterație să se apropie de 100 până când vă ajunge la 101 iar condiția <code>i <= 100</code> va deveni falsă și întrerupe bucla.

# while #
O structură repetitiva similară celei anterioare este blocul **while** (trad. cât-timp). Scopul acestei structuri este același că și în cazul buclei for, de a executa o secvență de cod de mai multe ori.
```
while () {
      
}
```

Parametri acestei structuri sunt:
- expresia de testat care atât timp cât se va evalua la adevărat va determina executarea corpului blocului.
- instrucțiunile de executat sau corpul blocului while

În secvență de mai jos, solicităm numere de la utilizator atât timp cât ultimul număr introdus a fost par. Bucla se va termina după introducerea primului numai impar.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="3"></div>

<p class="tip-box">
Structurile <strong>for</strong> și <strong>while</strong> sunt echivalente însă vom folosi cu precădere structura <em>for</em> atunci când știm exact de câte ori urmează să executăm corpul blocului iar pe cea <em>while</em> în caz contrar (numărul de pași ne este necunoscut și va fi determinat doar de câte ori condiția de testat a blocului while se va evalua la adevărat).
</p>

# do-while #
O structură similară celei **while** este **do-while** care funcționează aproape identic, singura diferență este că instrucțiunile din corpul blocului vor fi executate cel puțin o dată deoarece evaluarea expresiei de testat se face după această primă execuție. Dacă expresia se va evalua la fals atunci se va ieși din bloc altfel se va relua executarea corpului blocului.

```
do {
      
} while ();
```

# break #
Un cuvânt cheie des utilizat în contextul structurilor repetitive este **break** (trad. întrerupe). După cum și numele indică, scopul său este de a întrerupe bucla în care este folosit. Este util în cazurile în care în urma evaluării unei condiții în corpul blocului decidem că nu vrem să continuăm repetarea sa ci să părăsim bucla mai devreme.

În exemplu de mai jos, introducem posibilitate de a întrerupe jocul atunci când este introdusă valoarea 0. Executarea instrucțiunii _break_ va duce la întreruperea executării blocului _while_ cu alte cuvinte vom părăsi corpul blocului.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="4"></div>

<p class="tip-box">Cuvânt cheie <code>break</code> va determina ieșirea din blocurile <code>switch, while, for, do-while</code>
</p>

# continue #
Un cuvânt cheie similar lui <em>break</em> este <strong>continue</strong> care însă în loc să întrerupă complet bucla în care este folosit, va întrerupe doar pasul curent și va forța execuția să treacă la următorul pas din iterație. Putem considera acest cuvânt cheie ca un mecanism de a sări (<em>skip</em>) peste un anumit pas dintr-o interatie în funcție de o condiție.

În exemplul de mai jos, vom afișa toate numerele impare de la 1 la 10 sărind la fiecare iterație peste afișarea celor pare.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="5"></div>

# switch #
Ultima structură pe care o vom prezenta nu este una repetitiva ci una decizională similară celei _if-else_. Aceasta se cheamă **switch** și arată astfel:
```
switch (<expresie de evaluat>) {
   case <expresie 1>:
      <set de instructiuni 1>
      break;
   ...
   case <expresie 10>:
      <set de instructiuni 10>
      break;

   default:
       <set de instructiuni implicite>
}
```
Observăm că are o multitudine de parametri:
- <code>expresie de evaluat</code> este expresia pe care o testăm
- <code>expresie N</code> este o valoare de care suntem interesați iar în cazul în care expresia de evaluat este egală cu ea, să rulăm <code>setul de instructuni X</code>
- default este o ramură opțională ce ne permite să specificăm setul de instrucțiuni de rulat în cazul în care nicio ramură de mai sus nu a obținut egalitate

Pașii ce se efectuează în cazul unui block switch sunt următorii:
- se evaluează ```expresia de evaluat```
- rezultatul evaluării va fi testat pentru fiecare ramură în parte ( <code>case</code> ) până când se va obține o egalitate, caz în care <code>setul de instructiuni</code> aferent ramurii va fi executat iar întâlnirea cuvântului cheie  <code>break</code> va duce la părăsirea structurii switch. 
- dacă nu se obține egalitatea pentru nicio ramură, se va executa <code>setul de instructiuni implicite</code> ale ramurii <code>default</code>
Această ramură este de altfel opțională iar lipsa ei va duce pur și simplu la părăsirea blocului în cazul în care pentru nicio altă ramură nu se obține egalitatea.

Structura switch ar fi echivalentă cu un bloc **if-else-if**:
```
if (<expresia de evaluat> == <expresie constanta 1>) {
    <set de instructiuni 1>
} else if (<expresia de evaluat == expresie constanta 2>) {
    <set de instructiuni 10>
} else if (...) {
    ...
} else {
    <set de instructiuni default>
}
```
Chiar dacă cele două structuri obțin același rezultat, structura _switch_ ne ajută să obținem un cod care este mai ușor de înțeles.

Putem afirma atunci că structura _switch_ ne este utilă atunci când există o varietate mare de posibilități ce trebuie interpretate pentru o expresie iar o structură **if-else-if** nu ar arăta așa de ușor de înțeles pentru cineva care ne-ar citi codul ulterior.

În exemplul următor vom afișa ce fructe îi plac persoanei al cărei nume a fost introdus de utilizator și pentru care știm aceasta informație. Observăm ramura _default_ care ne indică setul de instrucțiuni pe care să îl executăm atunci când nu am putut satisface nicio condiție de mai sus (în cazul nostru când a fost introdus un nume de persoană pentru care nu știm ce fructe îi plac). Mai observăm că în cazul lui 'Alex' și 'Victor' cărora le plac ambilor kiwi, am putut să specificăm acest lucru prin alăturarea clauzelor _case_ aferente numelor lor.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="2"></div>

Vom folosi structura **switch** atunci când dorim să testam egalitatea dintre o expresie și un set de valori constante (știute deja în momentul scrierii programului) dar nu și contra altor expresii (ce ar urma să fie determinate în timpul execuției). Dacă avem nevoie să testăm contra unor expresii atunci va trebui să folosim structura **if-else-if**.

<div class="attention-box">
<strong>Rezumat:</strong>
- Structurile decizionale <strong>if-else-if</strong> ne ajută să executăm secvențe de cod doar dacă anumite condiții sunt adevărate sau false
- Structurile repetitive <strong>for, while, do-while</strong> ne permit să executăm secvențe de cod de un număr predefinit de ori sau cât timp o condiție este adevărată sau falsă
- Pentru întreruperea unei bucle putem folosi cuvântul cheie <strong>break</strong> sau cuvântul cheie <strong>continue</strong> pentru a sări peste un pas al buclei
- Structura <strong>switch</strong> este similară celei <em>if-else-if</em> însă ne permite să o descriem într-un format mai ușor de citit dar are dezavantajul că poate fi folosită doar ca să testăm contra unor expresii constante (deja știute în momentul scrierii programului)

</div>
<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<div class="wp-block-button"><a config-id="../wp-content/uploads/2023/quizzes/structuri-control.json" class="wp-block-button__link wp-element-button av-quiz av-btn-sm">Deschide quiz</a></div>
</div>
