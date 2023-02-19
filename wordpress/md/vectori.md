Un tip de date folosit des in programele Javascript si nu numai este tipul <strong>lista</strong> sau <strong>vector</strong> (engl. <em>array</em>) care ne permite sa reprezentam o colectie de valori de orice tip. Elementele sale sunt stocate in ordinea introducerii lor in colectie si pot fi accesate folosind pozitia lor din colectie.

<img src="../wp-content/uploads/2023/img/vectori0.png" class="img-box">

Pentru a accesa un element vom folosi parantezele patrate (<code>[ ]</code>) intre care vom specifica pozitia dorita.

<p class="attention-box"><strong>Atentie: </strong>Ca in multe alte limbaje de programare, pozitiile intr-un vector incep de la zero si nu de la unu. Asta inseamna ca primul element se va gasi la pozitia 0 adica <code>v1[0]</code>.</p>

<div class="algovis" config-id="vectori-basics.json" av-selected="0"></div>

De foarte multe ori, un program va avea nevoie sa stie cate elemente se afla intr-o variabila de tip vector iar pentru asta vom folosi proprietatea <em>length</em>. Cea mai uzuala constructie ce are nevoie sa stie lungimea vectorului este cea de parcurgere adica vizitare a fiecarui element.

<div class="algovis" config-id="vectori-basics.json" av-selected="1"></div>

Pe langa proprietatea <em>length</em>, variabilele de tip vector ne pun la dispozitie o multitudine de functii (metode) prin care putem sa manipulam mai usor continutul lor. Vom evidentia doar cateva din ele mai jos:
- <code>push</code> - cea mai utilizata metoda a vectorilor prin care puteam adauga un element nou colectiei, la sfarsitul acesteia
- <code>pop</code> - similar functiei push doar ca aceasta metoda va elimina ultimul element al colectiei
- <code>shift</code> - similar functiei pop doar ca aceasta functie va elimina primul element al colectiei
- <code>concat</code> - ne permite sa alaturam doua colectii intr-una noua (ce le va contine pe ambele)
- <code>slice(startIndex, endIndex)</code> - ne permite sa extragem portiunea din vector delimitata de pozitiile <code>startIndex</code> si <code>endIndex</code>
- <code>reverse</code> - dupa cum numele indica, aceasta metoda va ordona elementele dintr-o colectie in ordinea inversa celei curente
- <code>indexOf(element)</code> - ne ajuta sa cautam un element intr-o colectie intorcand prima pozitie la care a fost intalnit

<div class="algovis" config-id="vectori-basics.json" av-selected="2"></div>
