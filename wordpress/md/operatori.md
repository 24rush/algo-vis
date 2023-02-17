# Operatori #
Pentru a putea efectua sarcini utile cu continutul variabilelor avem nevoie sa putem specifica diferite operatii pe care ni le dorim (pentru a realiza suma a doua numele avem nevoie sa le putem aduna). A fost introdus astfel conceptul de **operator** care exact ca cel din matematica, ne ajuta sa definim operatii simple asupra variabilelor cu care ii folosim. Am folosit in exemplele trecute o multitudine de operatori alaturi de diferite constante (4, 12) sau variabile (x). Acesti parametri ai operatorilor se mai numesc si **operanzi** si reprezinta datele de intrare pentru un operator. 

<img src="../wp-content/uploads/2023/img/operatori1.jpg" class="img-box">

 Se disting multe tipuri de operatori: 
 - **atribuire:** <code>=</code>
 - **matematici:** <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code>, <code>++</code>, <code>--</code>
 - **de comparatie:** <code>&lt;</code>, <code>></code>
 - **logici:** <code>&amp;&amp;</code>, <code>||</code>, <code>!</code>

**Exemplul 1:**
<div class="algovis" config-id="tipuri-date-2.json">
</div>

In exemplul de mai sus putem observa si cum difera comportamentul operatorului <code>+</code> in functie de operanzii carora este aplicat. In liniile <code>3-5</code> este folosit cu operanzi numerici unde va efectua operatia de adunare insa in liniile <code>18-20</code> el este folosit cu operanzi text ceea ce va face ca rezultatul expresiei sa fie concatenarea (alaturarea) celor doi operanzi.

<p class="attention-box">
<strong>Atentie:</strong> Operatorii <code>--</code> si <code>++</code> numiti si operatori incrementare/decrementare au fiecare doua versiuni, prefix si postfix (<code>--u</code> vs <code>u++</code>) si chiar daca efectul lor este acelasi, aduna sau scad 1 variabilei la care sunt aplicati, se comporta diferit atunci cand sunt folositi in expresii (ex. <code>let c = u--</code>). Operatorul prefix va scadea 1 variabilei si va intoarce noua valoare pe cand cel postfix, va scadea 1 variabilei dar va intoarce valoare veche a variabilei nu cea noua.
</p>

# Expresii #
Combinatiile de operatori si operanzi observam ca au mereu un rezultat obtinut in urma aplicarii operatorului asupra operanzilor (de ex. sum = x + 12 are ca rezultat 16, valoare ce va este atribuita apoi variabilei *sum*). Constructiile in care sunt folositi operatori si operanzi pentru a obtine un rezultat poarta numele de **expresii** iar caracteristica lor principala este ca se pot evalua sub forma unui rezultat.

<img src="../wp-content/uploads/2023/img/expresii1.jpg" class="img-box">

**Exemplul 2:**
<div class="algovis" config-id="tipuri-date-3.json">
</div>

## Expresii relationale si logice ##

De foarte multe ori vom vedea expresii care intorc rezultate de tipul <em>adevarat</em> sau <em>fals</em>, numindu-le in acest caz <strong>expresii relationale</strong> (de ex. <code>4 > 12</code> se va evalua la fals pentru ca 4 nu este mai mare ca 12). Combinand apoi mai multe expresii relationale folosind operatori logici (<code>&amp;&amp;, ||, !</code>) vom obtine <strong>expresii logice</strong> care la randul lor intorc tot rezultate boolene (adevarat/fals).

## Operatorul ternar ##
Pentru structura if-else exista o alternativa de exprimare a acesteia prin folosirea unui operator special si anume operatorul ternar. Dupa cum ii spune si numele, este un operator ce solicita 3 operanzi, din acest motiv fiind special pentru ca este singurul de acest fel.

<img src="../wp-content/uploads/2023/img/ternar.png" class="img-box">

Structura operatorului este urmatoarea:
- <code>conditie</code>: conditia ce urmeaza sa fie evaluata
- <code>expresie1</code>: expresia ce urmeaza a fi evaluata si returnata in cazul in care conditia este adevarata
- <code>expresie2</code>: expresia ce urmeaza a fi evaluata si returnata in cazul in care conditia este falsa

Putem astfel folosi o singura linie de cod pentru a exprima secventa de mai jos:
```
let rezultat = 0;
if (conditie) {
    rezultat = expresie1;
} else {
    rezultat = expresie2;
}
```

Singura limitare a acestui operator este ca expresiile folosite nu pot fi formate decat dintr-o singura instructiune;

# Precedenta operatorilor #
Ca si in matematica, atunci cand avem o expresie ce contine mai multi operatori (de ex. <code>+</code> si <code>*</code>), vom efectua mai intai operatia de inmultire si apoi adunarea iar acest mecanism se numeste precedenta. Vom spune in acest caz ca inmultirea/impartirea au un <strong>nivel de precedenta</strong> mai mare decat adunarea/scaderea.

In expresia <code>let r = 1 + 2 \* 3</code> se va efectua mai intai inmultirea dintre 2 si 3 iar apoi adunarea cu 1. Daca dorim sa suprascriem acest mecanism implicit, o putem face prin utilizarea parantezelor. Astfel <code>let r = (1 + 2) \* 3</code> va determina efectuarea adunarii mai intai iar apoi inmultirea acestui rezultat cu 3.

# Asociativitatea operatorilor #
Daca o expresie contine mai multi operatori cu acceeasi precedenta, se va folosi asociativitatea lor pentru a determina ordinea de evaluare. Asociativitatea unui operator ne va indica daca ordinea de evaluare a unei expresii din care face parte operatorul este de la stanga la dreapta sau invers.

In cazul operatorilor aritmetici <code>+, -, /, +</code>, asociativitatea lor este de <strong>stanga</strong>. In expresia <code>let r = 8 / 4 / 2 </code> se va evalua de la stanga la dreapta, adica mai intai 8 / 4 iar apoi rezultatul se va imparti la 2. Operatorul <code>\*\*</code> (exponent) de ridicare la putere are in schimb asocitivitate de <strong>dreapta</strong> ceea ce inseamna ca intr-o expresie <code>let p = 2 ** 3 ** 4</code> se va ridica 3 la puterea a 4-a iar abia apoi 2 la puterea rezultata din prima evaluare.

<p class="tip-box">
<strong>Observatie:</strong> regulile de aplicare a operatorilor in cadrul expresiilor pot fi intortocheate si neintuitive insa putem evita foarte usor acesta capcana prin specificarea explicita a ordinii de evaluare cu ajutorul <strong>parantezelor</strong>.</p>

In loc sa scriem <code>let s = 8 / 2 ** 2</code> unde din cauza ca operatorul exponent are precedenta mai mare decat impartirea, se va efectua mai intai ridicarea la puterea si apoi impartirea, vom elimina orice dubiu prin specificarea ordinii pe care ne-o dorim folosind parantezele astfel:
- <code>let s = (8 / 2) ** 2</code> daca vrem sa efectuam mai intai impartirea
- <code>let s = 8 / (2 ** 2)</code> daca vrem ridicarea la putere sa fie efectuata prima si apoi impartirea.

Citeste in continuare:
[en] https://www.programiz.com/javascript/operators