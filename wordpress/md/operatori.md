Pentru a putea efectua sarcini utile cu continutul variabilelor avem nevoie sa putem specifica diferite operatii pe care ni le dorim (pentru a realiza suma a doua numele avem nevoie sa le putem aduna). A fost introdus astfel conceptul de **operator** care exact ca cel din matematica, ne ajuta sa definim operatii simple asupra variabilelor cu care ii folosim. Am folosit in exemplele trecute o multitudine de operatori alaturi de diferite constante (4, 12) sau variabile (x). Acesti parametri ai operatorilor se mai numesc si **operanzi** si reprezinta datele de intrare pentru un operator. 

<img src="../wp-content/uploads/2023/img/operatori1.jpg" class="img-box">

 Se disting multe tipuri de operatori: 
 - **atribuire:** <code>=</code>
 - **matematici:** <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>
 - **de comparatie:** <code><</code>, <code>></code>  
 - **logici:** <code>&&</code>, <code>||</code>, <code>!</code>

**Exemplul 1:**
<div class="algovis" config-id="tipuri-date-2.json">
</div>

<p class="attention-box">
<strong>Atentie:</strong> Operatorii <code>--</code> si <code>++</code> numiti si operatori incrementare/decrementare au fiecare doua versiuni, prefix si postfix (<code>--u</code> vs <code>u++</code>) si chiar daca efectul lor este acelasi, aduna sau scad 1 variabilei la care sunt aplicati, se comporta diferit atunci cand sunt folositi in expresii (ex. <code>let c = u--</code>). Operatorul prefix va scadea 1 variabilei si va intoarce noua valoare pe cand cel postfix, va scadea 1 variabilei dar va intoarce valoare veche a variabilei nu cea noua.
</p>

Combinatiile de operatori si operanzi observam ca au mereu un rezultat obtinut in urma aplicarii operatorului asupra operanzilor (de ex. sum = x + 12 are ca rezultat 16, valoare ce va este atribuita apoi variabilei *sum*). Constructiile in care sunt folositi operatori si operanzi pentru a obtine un rezultat poarta numele de **expresii** iar caracteristica lor principala este ca se pot evalua sub forma unui rezultat.

<img src="../wp-content/uploads/2023/img/expresii1.jpg" class="img-box">

**Exemplul 2:**
<div class="algovis" config-id="tipuri-date-3.json">
</div>
<p class="tip-box">
<strong>Observatie:</strong> de foarte multe ori vom vedea expresii care intorc rezultate de tipul <em>adevarat</em> sau <em>fals</em>, numindu-le in acest caz <strong>expresii relationale</strong> (de ex. 4 > 12 se va evalua la fals pentru ca 4 nu este mai mare ca 12). Combinand apoi mai multe expresii relationale folosind operatori logici (&&, ||, !) vom obtine <strong>expresii logice</strong> care la randul lor intorc tot rezultate boolene (adevarat/fals).
</p>

Citeste in continuare:  
[en] https://www.programiz.com/javascript/operators