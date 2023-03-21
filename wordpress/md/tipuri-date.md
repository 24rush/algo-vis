<div class="tip-box">
<strong>Ce vom afla din acest articol:</strong>
- care sunt tipurile de date predefinite ale limbajului Javascript
- ce este un tip de data primitiv
- ce sunt obiectele
</div>

Am creat până acum variabile ce puteau stoca numere și texte. Observăm astfel că o variabilă poate conține mai multe feluri de conținut. Aceste varietăți ale conținutului reprezintă tipurile de date iar limbajului Javascript dispune de mai multe astfel de tipuri deja definite:

 **Numerice**: pot stoca valori întregi (6) sau cu zecimale (4.35)
```
let numar_zile_saptamana = 7;
let litri_in_galon = 3.8;
```
**Text**: șiruri de caractere aflate între ghilimele "Primii Pași" sau "Hello world" numite și string-uri (în loc de ghilimele putem folosi și apostrof ``` ' ```)
```
let nume = "Alina";
```
 **Logice (boolean)**: tipul de dată aferent valorilor adevărat sau fals. În Javascript folosim cuvintele cheie _true_ pentru adevărat și _false_ pentru fals.
```
let imiPlaceJS = true;
```
 **Obiect (structură)**: tipuri de date care agregă tipuri simple pentru a forma structuri mai complexe. Pot fi privite drept colecții de proprietăți și valorile asociate lor.
```
let info_joc = {
         scor: 12412,
         jucator: "Ionut",
         ultim_nivel_jucat: 4
   }
```

Variabila ***info_joc*** este de tip obiect și conține mai multe informații (proprietăți) decât o simpla variabilă. Avem astfel ***info_joc.scor*** ce stochează informații despre un scor și info_joc.jucator, numele jucătorului. Observăm astfel că obiectele sunt un mecanism prin care putem pune la un loc mai multe valori care au sens să fie mai bine împreună decât specificate prin variabile individuale.

<p class="tip-box">Vom denumi toate tipurile de date care nu sunt de tip obiect ca fiind <strong>tipuri primitive</strong>. Caracteristica unui tip primitiv este că nu dispune de proprietăți (precum obiectele) ci conține doar o valoare.
</p>

Mai există și o categorie de tipuri speciale de date cum ar fi: *undefined, null* pe care le vom explica ulterior.

Javascript este un limbaj de programare cu tipuri de date dinamice ceea ce înseamnă că tipul unei variabile nu trebuie menționat atunci când declarăm variabila și totodată acest tip îl putem schimba oricând în timpul rulării programului, nu este fixat pentru totodeauna în funcție de valoarea cu care a fost inițializată variabila la declarare. Acest lucru ne permite să stocăm într-o variabilă tipuri diferite de date pe parcursul execuției programului.

<div class="algovis" config-id="tipuri-date-1.json">
</div>

<div class="attention-box"><strong>Rezumat:</strong>
- variabilele stocheaza date ce pot fi de diferite tipuri in functie de <strong>multimea valorilor</strong> pe care le pot lua (numere, texte, valori logice, etc.)
- tipurile de date <strong>obiect</strong> agrega mai multe proprietati ce pot fi atribuite unei entitati
- yipurile de date care nu sunt obiect se vor numi <strong>tipuri primitive</strong>
- un tip important de obiect este tipul  <strong>array</strong> care ne perimite sa stocam intr-o variabila o colectie de valori
</div>