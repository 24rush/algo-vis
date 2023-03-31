<div class="knowledge-box">
<strong>Ce vom afla din acest articol:</strong>
- ce reprezintă tipul vector / array
- la ce ne ajută acest tip de dată
- ce operații sunt disponibile asupra variabilelor de tip array
</div>

Un tip de obiect foarte des utilizat în programele Javascript este **array** (_ro._ vector sau listă) ce poate stoca o colecție ordonată de valori de orice tip. Elementele sale sunt stocate în ordinea introducerii lor în colecție și pot fi accesate folosind poziția lor din colecție. Acest tip este definit de o lungime și de posibilitatea de a accesa orice element al său specificând poziția pe care ne-o dorim folosind parantezele pătrate (```[ ]```) între care vom specifica această poziție.

<img src="../wp-content/uploads/2023/img/vectori0.png" class="img-box">

<div class="info-box">Ca în multe alte limbaje de programare, pozițiile într-un vector încep de la <strong>0</strong> și nu de la <strong>1</strong>. Asta înseamnă că primul element se vă găsi la poziția 0 adică <code>v1[0]</code> și nu <code>v1[1]</code>.</div>

<div class="algovis" config-id="vectori-basics.json" av-selected="0"></div>

De foarte multe ori, un program va avea nevoie să știe câte elemente se află într-o variabilă de tip vector iar pentru asta vom folosi proprietatea <code>length</code>. Cea mai uzuală construcție ce are nevoie să știe lungimea vectorului este cea de parcurgere adică vizitare a fiecărui element.

<div class="algovis" config-id="vectori-basics.json" av-selected="1"></div>

## for-of / for-in ##
O variantă alternativă la structura for clasică în care iterăm folosind un contor este **for-of**. Această construcție ne permite să extragem direct valorile colecției într-o variabilă pe care apoi să o utilizăm în corpul blocului for. 

Exemplul de mai sus rescris folosind for-of:
<div class="algovis" config-id="vectori-basics.json"  av-selected="4"></div>

Varianta **for-in** este similară celei for-of, diferența fiind că aceasta ne va întoarce în variabila indexul elementului și nu valoarea sa.
<div class="algovis" config-id="vectori-basics.json"  av-selected="5"></div>

# Manipulare vectori #
Pe lângă proprietatea <code>length</code>, variabilele de tip vector ne pun la dispoziție o multitudine de funcții (metode) prin care putem să manipulăm mai ușor conținutul lor. Vom evidenția doar câteva din ele mai jos:
- ```push``` - cea mai utilizată metodă a vectorilor prin care putem adăuga un element nou colecției, la sfârșitul acesteia
- ```pop``` - similar funcției push doar că această metodă va elimina ultimul element al colecției
- ```shift``` - similar funcției pop doar că această funcție va elimina primul element al colecției
- ```unshift(element1, element2, ...)``` - similar funcției push doar că această funcție va adăuga elementele primite ca parametrii la începutul colecției
- ```concat``` - ne permite să alăturam două colecții într-una nouă (ce le va conține pe ambele)
- <code>slice(startIndex, endIndex)</code> - ne permite să extragem din vector porțiunea delimitată de pozițiile <code>startIndex</code> și <code>endIndex</code>
- <code>splice(startIndex, numarStergeri)</code> - ne permite să stergem din vector începând cu poziția <code>startIndex</code> un numar de elemente egal cu <code>numarStergeri</code> iar dacă nu menționăm acest parametru va șterge până la sfârșitul vectorului
- ```reverse``` - după cum numele indică, această metodă va ordona elementele dintr-o colecție în ordinea inversă celei curente
- ```indexOf(element)``` - ne ajută să căutam un element într-o colecție întorcând prima poziție la care a fost întâlnit

<div class="algovis" config-id="vectori-basics.json" av-selected="2"></div>

<div class="attention-box">Când utilizăm funcțiile de manipulare a vectorilor trebuie să avem în vedere dacă funcția <strong>modifică</strong> sau nu continutul vectorului pe care este aplicată. Anumite funcții sunt implementate de limbajul Javascript să lase nemodificat vectorul pe care sunt aplicate și în schimb să <strong>întoarcă un alt vector</strong> cu modificările prin valoarea de retur a funcției. De ex., funcția <code>reverse</code> modifică vectorul pe care este aplicată în schimb funcția <code>slice</code> va lăsa vectorul nemodificat dar va întoarce conținutul solicitat prin valoare de retur.
</div>

Pentru a șterge un element dintr-un vector, va trebui să folosim funcțiile <code>indexOf</code> pentru a identifica poziția pe care se află elementul apoi <code>splice</code> pentru a șterge efectiv elementul din vector.

<div class="algovis" config-id="vectori-basics.json" av-selected="3"></div>

<div class="attention-box"><strong>Rezumat:</strong>
- Tipul de date vector ne permite să stocăm o <strong>colecție de valori</strong>
- Accesarea (scrierea sau citirea) elementelor se face folosind poziția lor în vector
- <strong>Pozițiile în vectori încep de la 0</strong>
- Un vector este definit de lungimea sa (câte elemente conține)
- Sunt disponibile numeroase funcții de prelucrare a vectorilor
</div>

<div class="has-text-align-center">
<p>Acum că ai finalizat articolul, verifică-ți cunoștințele cu următorul quiz:</p>
<a config-id="vectori.json" class="av-quiz av-btn-sm">Deschide quiz</a>
<p>iar apoi folosește ce ai învățat rezolvând următoarele exerciții:</p>
<a class="av-btn-sm" href="/exercitii-vectori/" target="_blank" rel="noopener">Deschide exerciții</a>
</div>