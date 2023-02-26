Am creat pana acum variabile ce puteau stoca numere si texte. Observam astfel ca o variabila poate contine mai multe feluri de continut. Aceste varietati ale continutului reprezinta tipurile de date iar limbajului Javascript dispune de mai tipuri predefinite:

 **Numerice**: pot stoca valori intregi (6) sau cu zecimale (4.35)
```
let numar_zile_saptamana = 7;
let litri_in_galon = 3.8;
```
**Text**: siruri de caractere aflate intre ghilimele "Primii Pasi" sau "Hello world" numite si string-uri (in loc de ghilimele putem folosi si apostrof <code>'</code>)
```
let nume = "Alina";
```
 **Logice (boolean)**: tipul de data aferent valorilor adevarat sau fals. In Javascript folosim cuvintele cheie _true_ pentru adevarat si _false_ pentru fals.
```
let imiPlaceJS = true;
```
 **Obiect (structura)**: tipuri de date care agrega tipuri simple pentru a forma structuri mai complexe. Pot fi privite drept colectii de proprietati si valorile asociate lor.
```
let info_joc = {
         scor: 12412,
         jucator: "Ionut",
         ultim_nivel_jucat: 4
   }
```

Variabila ***info_joc*** este de tip obiect si contine mai multe informatii (proprietati) decat o simpla variabila. Avem astfel ***info_joc.scor*** ce stocheaza informatii despre un scor si info_joc.jucator, numele jucatorului. Observam astfel ca obiectele sunt un mecanism prin care putem pune la un loc mai multe valori care au sens sa fie mai bine impreuna decat specificate prin variabile individuale.

<p class="tip-box">Vom denumi astfel toate tipurile de date care nu sunt de tip obiect ca fiind <strong>tipuri primitive</strong>. Caracteristica unui tip primitiv este ca nu dispune de proprietati (precum obiectele) ci contine doar o valoare.
</p>

Mai exista si o categorie de tipuri speciale de date cum ar fi: *undefined, null* pe care le vom explica ulterior.

Javascript este un limbaj de programare cu tipuri de date dinamice ceea ce inseamna ca tipul unei variabile nu trebuie mentionat atunci cand declaram variabila si totodata acest tip il putem schimba oricand in timpul rularii programului, nu este fixat pentru totodeauna in functie de valoarea cu care a fost initializata variabila la declarare. Acest lucru ne permite sa stocam intr-o variabila tipuri diferite de date pe parcursul executie programului.

<div class="algovis" config-id="tipuri-date-1.json">
</div>

# Rezumat #
- Variabilele stocheaza date ce pot fi de diferite tipuri in functie de <strong>multimea valorilor</strong> pe care le pot lua (numere, texte, valori logice, etc.)
- Tipurile de date <strong>obiect</strong> agrega mai multe proprietati ce pot fi atribuite unei entitati
- Tipurile de date care nu sunt obiect se vor numi <strong>tipuri primitive</strong>
- Un tip important de obiect este tipul **array** care ne perimite sa stocam intr-o variabila o colectie de valori