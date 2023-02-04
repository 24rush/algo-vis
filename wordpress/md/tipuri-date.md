
Am creat pana acum variabile ce puteau stoca numere si text. Observam astfel ca <highlight>o variabila poate contine mai multe tipuri de continut</highlight>. Categoriile de tipuri de date ale limbajului Javascript sunt urmatoarele:

 **Numerice**: pot stoca valori intregi (6) sau cu zecimale (4.35)
```
let numar_zile_saptamana = 7;
let litri_in_galon = 3.8;
```

**Text**: siruri de caractere aflate intre ghilimele “Primii Pasi” sau “Hello world”
```
let nume = "Alina";
```
 **Boolean/logici**: tipul de data aferent valorilor adevarat sau fals. In javascript folosim cuvintele cheie true pentru adevarat si false pentru false.
```
let imiPlaceJS = true;
```
 **Obiect**: tipuri de data care agrega tipuri primitive pentru a forma structuri mai complexe
```
let info_joc = {
         scor: 12412,
         jucator: "Ionut",
         ultim_nivel_jucat: 4
   }
```

Variabila ***info_joc*** este de tip obiect si contine mai multe informatii decat o simpla valoare. Avem astfel ***info_joc.scor*** ce stocheaza scorul la care jucatorul a ramas si info_joc.jucator, numele jucatorului. Observam astfel ca obiectele sunt un mecanism prin care putem pune la un loc mai multe variabile care au sens sa fie impreuna decat separat.

- Alte tipuri speciale de date cum ar fi: *undefined, null* pe care le vom explica ulterior

Un tip de data foarte uzual este lista (**array**) mai fiind intalnit si sub numele de **vector**. <highlight>Lista este un tip de data ce poate stoca un sir de valori de orice tip</highlight>. Putem astfel folosi o variabila de tip lista pentru a stoca continutul buzunarelor noastre. De ex.:
```
let continut_buzunar = ['telefon', 'guma', 'chei']
```
Variabila ***continut_buzunar*** poate stoca cele trei texte aferente continutului buzunarelor. Pentru a utiliza o anumita valoare ne vom adresa folosi pozitia la care aceasta valoare se afla in lista. Daca vrem sa afisam de exemplu prima valoare a listei vom folosi ***continut_buzunar[0]*** (de ce 0 si nu 1, pentru ca in general in programare, pozitiile in liste incep de la 0 si nu de la 1). Daca scriem ***continut_buzunar[1]*** vom obtine *guma* (a doua valoare in lista).

<div class="algovis" config-id="tipuri-date-1.json">
</div>

Pentru a putea efectua sarcini utile cu continutul variabilelor, avem nevoie sa putem specifica diferite operatii pe care ni le dorim (pentru a realiza suma a doua numele avem nevoie sa le putem aduna). A fost introdus astfel conceptul de operator, care exact ca cel din matematica, ne ajuta sa definim operatii simple asupra variabilelor in care ii folosim. Se disting asftel mai multe tipuri de operatori: **matematici** (adunare, scadere, impartire, inmultire), **de comparatie** (< sau >), **logici** (&&, ||, !) sau de atribuire a unei noi valori unei variabile (=), etc.

<div class="algovis" config-id="tipuri-date-2.json">
</div>

<p class="attention-box">
<strong>Atentie:</strong> Operatorii <code>--</code> si <code>++</code> numiti si operatori incrementare/decrementare au fiecare doua versiuni, prefix si postfix (<code>--u</code> vs <code>u++</code>) si chiar daca efectul lor este acelasi, aduna sau scad 1 variabilei la care sunt aplicati, se comporta diferit atunci cand sunt folositi in expresii (ex. <code>let c = u--</code>). Operatorul prefix va scadea 1 variabilei si va intoarce noua valoare pe cand cel postfix, va scadea 1 variabilei dar va intoarce valoare veche a variabilei nu cea noua.
</p>
Am folosit in exemplele de mai sus o multitudine de ***operatori*** alaturi de diferite constante (4, 12) sau variabile (x). Acesti parametri ai operatorilor se mai numesc si ***operanzi*** si reprezinta datele de intrare pentru un operator. Combinatiile de operatori si operanzi observam ca au mereu un rezultat obtinut in urma aplicarii operatorului asupra operanzilor (de ex. sum = x + 12 are ca rezultat 16, valoare ce va este atribuita apoi variabilei *sum*). <highlight>Constructiile in care sunt folositi operatori si operanzi pentru a obtine un rezultat poarta numele de expresii</highlight>, iar caracteristica lor principala este ca se pot evalua sub forma unui rezultat. 

De foarte multe ori vom vedea expresii care intorc rezultate de tipul *adevarat* sau *fals*, numindu-le in acest caz **expresii relationale** (de ex. 4 > 12 se va evalua la fals pentru ca 4 nu este mai mare ca 12). Combinand apoi mai multe expresii relationale folosind operatori logici (&&, ||, !) vom obtine expresii logice care la randul lor intorc tot rezultate boolene (adevarat/fals).

<div class="algovis" config-id="tipuri-date-3.json">
</div>

Citeste in continuare:
[en] https://www.programiz.com/javascript/operators
