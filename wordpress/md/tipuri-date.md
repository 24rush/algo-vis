<div class="knowledge-box">
<strong>Ce vom afla din acest articol:</strong>
- care sunt tipurile de date predefinite ale limbajului Javascript
- ce este un tip de dată primitiv
- ce sunt obiectele
</div>

Am creat până acum variabile ce puteau stoca numere și texte. Observăm astfel că o variabilă poate conține mai multe feluri de conținut. Aceste varietăți ale conținutului reprezintă tipurile de date iar limbajului Javascript dispune de mai multe astfel de tipuri deja definite:

 **Numerice**: pot stoca valori întregi (6) sau cu zecimale (4.35)
```
let numar_zile_saptamana = 7;
let litri_in_galon = 3.8;
```
**Text**: șiruri de caractere aflate între ghilimele "Primii Pași" sau "Hello world" numite și string-uri (în loc de ghilimele putem folosi și apostrof <code>'</code>)
```
let nume = "Alina";
```
 **Logice (boolean)**: tipul de dată aferent valorilor adevărat sau fals. În Javascript folosim cuvintele cheie _true_ pentru adevărat și _false_ pentru fals.
```
let imiPlaceJS = true;
```
 **Obiect (structură)**: tipuri de date care agregă tipuri simple pentru a forma structuri mai complexe. Pot fi privite drept colecții de proprietăți (chei) și valori asociate lor iar aceste valori pot fi de orice tip (inclusiv obiect). Proprietățile, în schimb, trebuie să fie de tip text.
```
let info_joc = {
         'scor': 12412,
         'jucator': "Ionut",
         'ultim_nivel_jucat': 4
   }
```

Variabila ***info_joc*** este de tip obiect și conține mai multe informații (proprietăți) decât o simpla variabilă. Avem astfel ***info_joc.scor*** ce stochează informații despre un scor și info_joc.jucator, numele jucătorului. Observăm astfel că obiectele sunt un mecanism prin care putem pune la un loc mai multe valori care au sens să fie împreună decât specificate prin variabile individuale.

<div class="info-box">Vom denumi toate tipurile de date care nu sunt de tip obiect ca fiind <strong>tipuri primitive</strong>. Caracteristica unui tip primitiv este că nu dispune de proprietăți (precum obiectele) ci conține doar o valoare.
</div>

Mai există și o categorie de tipuri speciale de date cum ar fi: <code>undefined, null</code> pe care le vom explica ulterior.

Javascript este un limbaj de programare în care tipul unei variabile nu trebuie menționat atunci când declarăm variabila și totodată acest tip îl putem schimba oricând în timpul rulării programului, nu este fixat pentru totodeauna în funcție de valoarea cu care a fost inițializată variabila la declarare. Acest lucru ne-ar permite să stocăm într-o variabilă tipuri diferite de conținut pe parcursul execuției programului însă vom vedea mai tărziu că aceasta nu este o practică recomandată.

<div class="algovis" config-id="tipuri-date-1.json">
</div>

<div class="attention-box"><strong>Rezumat:</strong>
- Variabilele stocheaza date ce pot fi de diferite tipuri in functie de <strong>multimea valorilor</strong> pe care le pot lua (numere, texte, valori logice, etc.)
- Tipurile de date <strong>obiect</strong> agrega mai multe proprietati ce pot fi atribuite unei entitati
- Tipurile de date care nu sunt obiect se vor numi <strong>tipuri primitive</strong>
</div>

<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<a config-id="../wp-content/uploads/2023/quizzes/tipuri-date.json" class="av-quiz av-btn-sm">Deschide quiz</a>

<p>iar apoi folosește ce ai învățat rezolvând următoarele exerciții:</p>
<a class="av-btn-sm" href="/exercitii-tipuri-de-date/" target="_blank" rel="noopener">Deschide exerciții</a>
</div>