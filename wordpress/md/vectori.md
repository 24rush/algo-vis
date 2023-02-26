Un tip de obiect foarte des utilizat in programele Javascript este **array** (_ro._ vector sau lista) ce poate stoca o colectie ordonata de valori de orice tip. Elementele sale sunt stocate in ordinea introducerii lor in colectie si pot fi accesate folosind pozitia lor din colectie. Acest tip este definit de o lungime si de posibilitatea de a accesa orice element al sau specificand pozitia pe care ne-o dorim folosind parantezele patrate (<code>[ ]</code>) intre care vom specifica pozitia dorita.

<img src="../wp-content/uploads/2023/img/vectori0.png" class="img-box">

<p class="attention-box">Ca in multe alte limbaje de programare, pozitiile intr-un vector incep de la 0 si nu de la 1. Asta inseamna ca primul element se va gasi la pozitia 0 adica <code>v1[0]</code>.</p>

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

# Rezumat #
- Tipul de date vector ne permite sa stocam o colectie de valori
- Accesarea (scrierea sau citirea) elementelor se face folosind pozitia lor in vector
- Pozitiile in vectori incep de la 0
- Un vector este definit de lungimea sa (cate elemente contine)
- Sunt disponibile numeroase functii de prelucrare a vectorilor