
Am creat pana acum variabile ce puteau stoca numere si texte. Observam astfel ca o variabila poate contine mai multe feluri de continut. Tipurile de date primitive ale limbajului Javascript sunt urmatoarele:

 **Numerice**: pot stoca valori intregi (6) sau cu zecimale (4.35)
```
let numar_zile_saptamana = 7;
let litri_in_galon = 3.8;
```

**Text**: siruri de caractere aflate intre ghilimele "Primii Pasi" sau "Hello world" numite si string-uri
```
let nume = "Alina";
```
 **Logice (boolean)**: tipul de data aferent valorilor adevarat sau fals. In Javascript folosim cuvintele cheie _true_ pentru adevarat si _false_ pentru fals.
```
let imiPlaceJS = true;
```
 **Obiect (structura)**: tipuri de date care agrega tipuri primitive pentru a forma structuri mai complexe. Pot fi privite drept colectii de proprietati si valorile asociate lor.
```
let info_joc = {
         scor: 12412,
         jucator: "Ionut",
         ultim_nivel_jucat: 4
   }
```

Variabila ***info_joc*** este de tip obiect si contine mai multe informatii (proprietati) decat o simpla valoare. Avem astfel ***info_joc.scor*** ce stocheaza scorul la care jucatorul a ramas si info_joc.jucator, numele jucatorului. Observam astfel ca obiectele sunt un mecanism prin care putem pune la un loc mai multe variabile care au sens sa fie impreuna decat separat.

<p class="attention-box"><strong>Atentie: </strong>proprietatile unui obiect pot fi doar de tip text pe cand valorile asociate lor pot fi de orice tip (primitiv sau obiect).
</p>

**Tipuri speciale de date** cum ar fi: *undefined, null* pe care le vom explica ulterior.

<p class="tip-box">Trebuie mentionat ca Javascript este un limbaj de programare cu tipuri de date dinamice ceea ce inseamna ca tipul unei variabile nu trebuie mentionat atunci cand declaram variabila si totodata acest tip se poate schimba oricand in timpul rularii programului, nu este fixat pentru totodeauna in functie de valoarea cu care a fost initializata variabila la declarare.
</p>

Un tip de obiect foarte des utilizat este **array (vector sau lista)** ce poate stoca o colectie de valori de orice tip. Acest tip este definit de o lungime si de posibilitatea de a accesa orice element al sau specificand pozitia pe care ne-o dorim intr parantezele patrate. Putem astfel folosi o variabila de tip lista pentru a stoca continutul buzunarelor noastre. De ex.:
```
let continut_buzunar = ['telefon', 'guma', 'chei']
```

Variabila ***continut_buzunar*** poate stoca cele trei texte aferente continutului buzunarelor. Pentru a utiliza o anumita valoare ne vom adresa folosi pozitia la care aceasta valoare se afla in lista. Daca vrem sa afisam de exemplu prima valoare a listei vom folosi ***continut_buzunar[0]*** (de ce 0 si nu 1, pentru ca in general in programare, pozitiile in liste incep de la 0 si nu de la 1). Daca scriem ***continut_buzunar[1]*** vom obtine *guma* (a doua valoare in lista).

<div class="algovis" config-id="tipuri-date-1.json">
</div>
