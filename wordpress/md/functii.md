Pana acum, toate programele prezentate in aceste materiale au fost alcatuite din secvente de instructiuni ce aveau scopul de a rezolva problemele prezentate fie prin procesarea unor date de intrare si obtinerea unora de iesire fie prin simpla executare a unor instructiuni cum ar fi solicitarea unor date de la utilizator.

Pentru a putea refolosi aceste secvente si in alte sectiuni ale programului, fara a copia in totalitate instructiunile ce le formeaza, a fost introdus conceptul de **functie**. Putem privi o functie ca o insiruire de instructiuni pe care o putem folosi de oricate ori vrem fara a copia instructiunile ce o formeaza ci doar prin folosirea numelui ei.

# Definire #
Structura unei functii este urmatoarea:
<p class="code-box">
<strong>function</strong> nume_functie ( lista parametri intrare )
{
&ensp;&ensp;&ensp;&ensp;< instructiuni functie >
}
</p>

Observam urmatoarele elemente:
- cuvantul cheie **function** care indica faptul ca vrem sa definim o functie noua
- numele functiei este identificatorul prin care putem executa instructiunile ce o formeaza
- lista de parametri ne ajuta sa specificam datele de intrare de care are nevoie functia
- corpul functiei este format din setul de instructiuni pe care vrem sa-l contina

Declaratia unei functii poate fi extinsa si pe langa definierea parametrilor de intrare si a instructiunilor de executat, se poate indica si o valoare rezultat a executiei functiei. Spunem in acest caz ca functia 'intoarce' o valoare iar de regula aceasta valoare este obtinuta pe baza parametrilor de intrare. Pentru a indica ce valoare rezultat dorim sa intoarca functia, vom folosi cuvantul rezervat **return** urmat de aceasta valoare.

<p class="code-box">
<strong>function</strong> nume_functie ( lista de parametri )
{
&ensp;&ensp;&ensp;&ensp;< instructiuni functie >
&ensp;&ensp;&ensp;&ensp;<strong>return</strong> valoare rezultat
}
</p>

# Apelul unei functii #
Pentru a executa instructiunile aferente corpului functiei, va trebuie sa apelam functia ce le contine pentru ca doar simpla definire a functiei nu executa instructiunile. Luand exemplul de mai sus, pentru a executa corpul functiei va trebuie sa scriem:

``` nume_functie(parametru1, parametru2, ...); ```

``` parametru1, parametru2 ``` sunt datele de intrare de care functie are nevoie. Pot exista functii insa care nu au nevoie de niciun parametru caz in care nu vom specifica nimic intre paranteze.

# Exemplu practic #
Sa vedem cum ne ajuta o functie. Luam exemplul de mai jos in care vrem sa afisam valoarea a doua numere introduse de utilizator ridicate la puterea a doua. Prima oara vom solicita un numar pozitiv iar ulterior unul negativ.

<div class="algovis" config-id="functii-basics.json" av-selected="2"></div>

Observam cat de multe instructiuni se repeta si cat de similare par instructiunile pentru cele doua cazuri: numar pozitiv si negativ. Sa refacem acum exemplul folosind functii.

<div class="algovis" config-id="functii-basics.json" av-selected="3"></div>

Am refacut astfel programul incat secvente duplicate de instructiuni sunt eliminate, fiind inlocuite cu functiile <em>numar_la_patrat</em> si <em>solicita_numar</em> ce primesc ca parametru tipul de numar pe care il solicitam. In liniile ulterioare observam cum este folosit numele functiei pentru a executa instructiunile aferente ei. Textele din paranteze reprezinta valoarea parametrului <em>tip_numar</em>. La prima apelare a functiei parametrul va avea valoarea 'pozitiv’ iar la cea de-a doua 'negativ’. Acest parametru este transmis mai departe functiei <em>solicita_numar</em> care valideaza ca utilizatorul intr-adevar introduce un numar ce respecta criteriul de pozitiv/negativ. Parametrul <em>tip_numar</em> al functiei <em>solicita_numar</em> devine astfel o variabila in interiorul functiei si este folosit ca atare.

Reusim astfel sa structuram programul nostru in secvente de instructiuni cu un scop precis si reutilizabil. Putem privi aceste functii ca pe niste cutii negre care pe baza unor **parametri de intrare** ne ofera un **rezultat** iar modalitatea prin care aceste functii ajung la rezultat este strict sarcina lor si mai mult, aceasta modalitate putand fi ulterior modificata fara a afecta corectitudinea programul nostru. Atat timp cat functia respecta cerintele initiale pentru care a fost create, mecanismul de implementare al functie poate fi reimplementat ori de cate ori este necesar.

<img src="../wp-content/uploads/2023/img/black_box.png" class="img-box">

In exemplul nostru, mai putem face o modificare si utiliza functia _Math.pow_ in loc sa multiplicam explicit cele doua valori.

```
console.log('Valoarea numarului ' + tip_numar + 'la patrat este ' + Math.pow(numar, 2));
```
Am folosit in acest caz functia _Math.pow_ care nu este definita de noi ci chiar de limbajul Javascript, fiind o functie implicit a acestuia (_built-in_) avand acelasi efect ca si multiplicarea pe care o faceam noi explicit.

Pe langa functiile definite de noi, exista o multitudine de alte functii predefinite ale limbajul Javascript pe care noi le putea utiliza. Acest lucru ne scuteste de efortul de a mai reimplementa cerintele acelor functii de la 0 – putem accesa acele functionalitati doar prin simplul lor apel (ex. _Math.cos(), Math.round(), parseInt(), isNan(), etc._)

<div class="algovis" config-id="functii-basics.json" av-selected="0"></div>

# Parametrii unei functii #
Parametrii functiilor pot fi priviti ca fiind date de intrare ale acestora pe baza carora executa anumite instructiuni si eventual intorc un rezultat. Acesti parametri se transforma de altfel in variabile locale functiei in care sunt declarati, putand fi folositi ca orice alta variabila declarata in corpul functiei. Un aspect foarte important de mentionat este faptul ca orice modificare adusa acestor parametrii nu se va reflecta inapoi dupa terminarea apelului functiei. Cu alte cuvinte, clientii functiei (cei care o apeleaza folosind anumiti parametrii) nu vor vedea nicio modificare adusa parametrilor de intrare daca noi incercam sa le modificam valoarea in corpul functiei.

<div class="algovis" config-id="functii-basics.json" av-selected="1"></div>

Functia <code>dubleaza</code> primeste ca parametru un <code>numar</code> pe care noi incercam sa il modificam in speranta ca dupa apelul acestei functii de dublare, parametrul trimis isi va patra valoarea modificata. Ruland exemplul vedem cum instructiunea <code>numar = numar * 2;</code> are doar efect local, modificand valoarea parametrului doar in scopul functiei insa o data cu parasirea acesteia, variabila <code>x</code> aferenta parametrului <code>numar</code> are aceeasi valoare ca inainte de apelul functiei.

<p class="tip-box">Mecanismul de transmitere a parametrilor se face prin copierea (duplicarea) variabilei specificate in apelul functiei asa ca orice modificare adusa parametrului in interiorul functiei s-ar face efectiv asupra acestei copii si nu asupra variabilei folosite in apel.
</p>