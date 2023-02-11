Pana acum, toate programele prezentate in aceste materiale au fost alcatuite din secvente de instructiuni ce aveau fiecare un scop bine definit, facand fiecare parte dintr-un pas necesar rezolvarii problemelor prezentate. Pentru a putea refolosi aceste secvente si in alti pasi fara a copia in totalitate instructiunile ce le formeaza, a fost introdus conceptul de functie.  Putem privi o functie ca o insiruire de instructiuni pe care o putem folosi de oricate ori vrem fara a copia instructiunile ce o formeaza ci doar prin folosirea numelui ei.

Structura unei functii este dupa cum urmeaza:

**function** <nume_functie> **(** lista de parametri **)**
**{**
&ensp;&ensp;&ensp;&ensp;<corp functie>
**}**


Sa vedem cum ne ajuta o functie. Luam exemplul de mai jos in care vrem sa afisam valoarea a doua numere introdus de utilizator ridicate la puterea a doua. Prima oara vom solicita un numar pozitiv iar ulterior unul negativ.
```
let numar_poz = input(&#039;Numar pozitiv&#039;);
console.log(&#039;Valoarea numarului la patrat este &#039; + numar * numar);

let numar_neg = input(&#039;Numar negativ&#039;);
console.log(&#039;Valoarea numarului la patrat este &#039; + numar * numar);
```
Observam cum cele doua secvente sunt aproape identice. Sa refacem acum exemplul folosind functii.
```
function numar_la_patrat(tip_numar) {
	let numar = input(tip_numar)

	console.log(‘Valoarea numarului la patrat este ‘ + numar * numar);
}

numar_la_patrat(“numar pozitiv”);
numar_la_patrat(“numar negativ”);
```
Am refacut astfel programul incat secvente duplicate de instructiuni sunt eliminate, fiind inlocuite cu functia _numar_la_patrat_ cu un singur parametru numit _tip_numar_ ce ne va indica felul de numar pe care il solicitat utilizatorului. Am definit astfel functia numar_la_patrat ca fiind o functie ce primeste un parametru. In liniile ulterioare observam cum este folosit numele functiei pentru a executa instructiunile aferente ei. Textele din paranteze reprezinta valoarea parametrului tip_numar. La prima apelare a functiei, acest parametru va avea valoare ‘numar pozitiv’ iar la cea de-a doua ‘numar negativ’.

Declaratia unei functii poate fi extinsa si pe langa definierea parametrilor si a instructiunilor de executa, se poate indica si o valoare rezultat a executiei functiei.

**_function_** <nume functie> **(** lista de parametri **)**
**{**
&ensp;&ensp;&ensp;&ensp;<lista instructiuni>

&ensp;&ensp;&ensp;&ensp;**return** <valoare rezultat>
**}**

Putem astfel reface exemplul de mai sus:
```
function patrat(numar) {
    return numar * numar;
}

function numar_la_patrat(tip_numar) {
	let numar = input(tip_numar)

	console.log(‘Valoarea numarului la patrat este ‘ + patrat (numar));
}

numar_la_patrat(“numar pozitiv”);
numar_la_patrat(“numar negativ”);
```
Am inlocuit asfel expresia _numar * numar_ cu apelul functiei patrat care intoarce rezultate ridicarii la putere a numarului primit ca parametru (in cazul nostru valoarea variabilei numar).

Aceasta constructie ne permite sa extindem exemplul nostru prin ridicare la oricare putere a unui numar primit ca parametru.
```
function putere(numar, putere) {
	let rezultat = 1;

	for (let index = 1; index <= putere; index++) {
		rezultat = rezultat * numar;
	}

	return rezultat;
}

function numar_la_patrat(tip_numar) {
	let numar = input(tip_numar)
	console.log(‘Valoarea numarului la patrat este ‘ + putere (numar, 2));
}

numar_la_patrat(“numar pozitiv”);
numar_la_patrat(“numar negativ”);
```

Ulterior, daca dorim sa ridicam la orice putere, putem rescrie:
```
function numar_la_putere(tip_numar, putere) {
	let numar = input(tip_numar)

	console.log(‘Valoarea numarului la puterea ‘ + putere + ‘ este ‘ + putere (numar, putere));
}

let putere = input(‘Putere’)

numar_la_putere(“numar pozitiv”, putere);
numar_la_putere(“numar negativ”, putere);
```
Reusim astfel sa structuram programul nostru in secvente de instructiuni cu un scop precis si reutilizabil. Putem privi aceste functii ca pe niste cutii negre care pe baza unor parametri de intrare ne ofera un rezultat iar modalitatea prin care aceste functii ajung la rezultat este strict sarcina lor si mai mult, aceasta modalitate putand fi ulterior modificata fara a afecta programul nostru. Atat timp cat functia respecta cerintele, mecanismul de implementare al functie poate fi reimplementat ori de cate ori este necesar.

De exemplu, putem rescrie functia putere asftel:
```
function putere(numar, putere) {
	return Math.pow(numar, putere);
}
```
Observam ca in loc sa executam bucla for si sa inmultim numarul cu el insusi, folosim functia _Math.pow_. Aceasta functie nu este definita de noi ci chiar de limbajul Javascript, fiind o functie implicit a acestuia (built-in) avand acelasi efect cu bucla noastra for. Restul programului nostru ramane neschimbat chiar daca implementarea functiei putere a fost schimbata, ea respecta cerintele in continuare (intoare rezultatul ridicarii numarului la putere).

Pe langa functiile definite de noi, exista o multitudine de alte functii prefedinite de catre limbajul Javascript pe care noi le putea accesa. Acest lucru ne scuteste de efortul de a mai reimplementa cerintele acelor functii de la 0 – puteam accesa acele functionalitati doar prin simplul apel al unei functii (ex. _Math.cos(), Math.round()_)