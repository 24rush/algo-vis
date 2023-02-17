Un program nu va putea efectua nimic important numai prin declararea de variabile. Vor exista situatii in care vom avea nevoie sa specificam ca vrem sa executam anumite secvente de cod numai cand anumite conditii sunt adevarate (sau false) sau vom dori sa executam o secventa de cod de un anumit numar de ori. Pentru acest gen de situatii au fost create structurile de control care nu sunt altceva decat niste cuvinte cheie cu un anumit set de reguli care ne permit sa descriem situatiile enuntate mai sus.

# if-else #
Cea mai utilizata structura de control este structura **if** care s-ar traduce prin *daca [..] atunci [..]*. 
```
if (<expresie>) {
    <instructiuni de executat>
}
```

Aceasta structura foloseste doi parametri: 
- expresia pe care sa o evalueze
- secventa de cod sa fie executata daca expresia este adevarata. 

O alta varianta a acestei structuri este cea **if-else** in care putem specifica pe langa secventa de cod ce ar trebui executata in cazul in care expresia este adevarata si o secventa ce ar trebui executa in cazul contrar (cand conditia se evalueaza la fals). De retinut ca mereu intr-o structura if-else vom executa o singura ramura ori cea de pe ramura adevarat ori invers.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="0"></div>

# for #
Am aflat cum putem executa secvente de cod in functie de o anumita conditie iar acum vom vedea cum sa executam aceasi secventa de mai multe ori. Structura care ne va ajuta se cheama **for** (sau for-loop) care s-ar traduce prin bucla. 

```
for (<expresie initiala>; <conditie de testat>; <expresie de actualizare>) {
    <instructiuni de executat>
}
```

Observam ca are nevoie de patru parametri (din care doi sunt optionali): 
- expresie initiala (optionala)
- expresie care sa indice cat timp sa executam secventa
- expresie de executat dupa fiecare iteratie (optionala) care sa ne indice pasul la care ne aflam
- setul de instructiuni de executat la fiecare iteratie (mai poarta numele si de corpul blocului for)

Ordinea in care se executa operatiile unei structuri for este urmatoarea:
1. ```expresia initiala``` este executata
2. ```conditia de testat``` este evaluata iar daca este falsa se va termina in intregime executia blocului for, altfel va trece la pasul 3
3. ```instructiuni de executat``` se vor executa in intregime
4. ```expresie de actualizare``` se va executa daca exista
5. se va sari inapoi la pasul 2

In exemplul urmator se vor afisa toate numerele de la 1 pana la 100.

<div class="algovis" config-id="structuri-control-basics.json"  av-selected="1"></div>

<code>let i = 1</code> este expresia initiala care ne declara o variabila <code>i</code> pe care o si initializam cu 1.

<code>i <= 100</code> este expresia care ne indica cat timp se va executa bucla, in acest caz va fi executata cat timp ```i``` este mai mic decat 100

<code>i++</code> este expresia ce se va executa dupa fiecare iteratie, in cazul nostru va aduna 1 de fiecare data la valoarea lui <code>i</code>, facandu-l dupa fiecare iteratie sa se apropie de 100 pana cand va ajunge la 101 iar conditia <code>i <= 100</code> va deveni falsa si intrerupe bucla.

# while #
O structura repetitiva similara celei anterioare este blocul **while** (trad. cat-timp). Scopul acestei structuri este acelasi ca si in cazul buclei for, de a executa o secventa de cod de mai multe ori.
```
while (<expresie de testat>) {
      <instructiuni de executat>
}
```

Parametrii acestei structuri sunt:
- expresia de testat care atat timp se va evalua la adevarat va determina executarea corpului blocului.
- instructiunile de executat sau corpul blocului while

In secventa de mai jos, solicitam numere de la utilizator atat timp cat ultimul numar introdus a fost par. Bucla se va termina dupa introducerea primului numai impar.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="3"></div>

<p class="tip-box">
Structurile <strong>for</strong> si <strong>while</strong> sunt echivalente insa vom folosi cu precadere structura <em>for</em> atunci cand stim exact de cate ori urmeaza sa executam corpul blocului iar pe cea <em>while</em> in caz contrar (numarul de pasi ne este necunoscut si va fi determinat doar de cate ori conditia de testat a blocului while se va evalua la adevarat).
</p>

# break #
Un cuvant cheie des utilizat in contextul structurilor repetitive este **break** (trad. intrerupe). Dupa cum si numele indica, scopul sau este de a intrerupe bucla in care este folosit. Este util in cazurile in care in urma evaluarii unei conditii in corpul blocului decidem ca nu vrem sa continuam repetarea sa ci sa parasim bucla mai devreme.

In exemplu de mai jos, introducem posibilitate de a intrerupe jocul atunci cand este introdusa valoarea 0. Executarea instructiunii _break_ va duce la intreruperea executarii blocului _while_ cu alte cuvinte vom parasi corpul blocului.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="4"></div>

# continue #
Un cuvant cheie similar lui <em>break</em> este <strong>continue</strong> care insa in loc sa intrerupa complet bucla in care este folosit, va intrerupe doar pasul curent si va forta executia sa treaca la urmatorul pas din iteratie. Putem considera acest cuvant cheie ca un mecanism de a sari (<em>skip</em>)peste un anumit pas dintr-o interatie in functie de o conditie.

In exemplul de mai jos, vom afisa toate numerele impare de la 1 la 10 sarind la fiecare iteratie peste afisarea celor pare.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="5"></div>

# switch #
Ultima structura pe care o vom prezenta nu este una repetitiva ci una decizionala similara celei _if-else_. Aceasta se cheama **switch** si arata astfel:
```
switch (<expresie de evaluat>) {
   case <rezultat evaluare 1>:
      <set de instructiuni 1>
      break;
   ...
   case <rezultat evaluare 10>:
      <set de instructiuni 10>
      break;

   default:
       <set de instructiuni implicite>
}
```
Observam ca are o multitudine de parametri:
- expresie de evaluat este expresia pe care o testam
- rezultat evaluare este o valoare de care suntem interesati iar in cazul in care expresia de evaluat este egala cu ea, sa rulam setul de instructuni x
- default este o ramura optionala ce ne permite sa specificam setul de instructiuni de rulat in cazul in care nicio ramura de mai sus nu a obtinut egalitate

Pasii ce se efectueaza in cazul unui block switch sunt urmatorii:
- se evalueaza ```expresia de evaluat```
- rezultatul evaluarii va fi testat pentru fiecare ramura in parte ( <code>case</code> ) pana cand se va obtine o egalitate, caz in care <code>setul de instructiuni</code> aferent ramurii vor fi executate iar intalnirea cuvantului cheie <code>break</code> va duce la parasirea structurii switch. 
- daca nu se obtine egalitatea pentru nicio ramura, se vor executa <code>setul de instructiuni implicite</code> ale ramurii <code>default</code>
Aceasta ramura este de altfel optionala iar lipsa ei va duce pur si simplu la parasirea blocului in cazul ca in care pentru nicio alta ramura nu se obtine egalitatea.

Structura switch ar fi echivalenta cu un bloc **if-else-if**:
```
if (<expresia de evaluat> == <rezultat evaluare 1>) {
    <set de instructiuni 1>
} else if (<expresia de evaluat == rezultat evaluare 2>) {
    <set de instructiuni 10>
} else if (...) {
    ...
} else {
    <set de instructiuni default>
}
```
Chiar daca cele doua structuri obtin acelasi rezultat, structura _switch_ ne ajuta sa obtinem un cod care este mai usor de inteles.

Putem afirma atunci ca structura _switch_ ne este utila atunci cand exista o varietate mare de posibilitati ce trebuie interpretate pentru o expresie iar o structura if-else-if nu ar arata asa de usor de inteles pentru cineva care ne-ar citi codul ulterior.

In exemplul urmator vom afisa ce fructe ii plac persoanei al carei nume a fost introdus de utilizator si pentru care stim aceasta informatie. Observam ramura _default_ care ne indica setul de instructiuni pe care sa il executam atunci cand nu am putut satisface nicio conditie de mai sus (in cazul nostru cand a fost introdus un nume de persoana pentru care nu stim ce fructe ii plac). Mai observam ca in cazul lui 'Alex' si 'Victor' carora le plac ambilor kiwi, am putut sa specificam acest lucru prin alaturarea clauzelor _case_ aferente numelor lor.

<div class="algovis" config-id="structuri-control-basics.json" av-selected="2"></div>