=== Tipuri de date
1. Să se declare variabila <code>numarJucatori</code> ce conține valoarea 0.<av-elem type="ieditor"></av-elem>
2. Să se declare constanta <code>MAX_JUCATORI</code> ce conține valoarea 10.<av-elem type="ieditor"></av-elem>
3. Să se declare variabila obiect cu numele <code>stareJoc</code> ce conține următoarele proprietăți și valori:<av-elem type="ieditor"></av-elem>
    * nivel : 1
    * scor : 163
    * areSuperPower : true
4. În obiectul <code>stareJoc</code> creat, să se schimbe valoarea proprietății <code>areSuperPower</code> în false.<av-elem type="ieditor"></av-elem>
5. Să se declare o variabila booleană <code>X</code> a cărei valoare să fie false iar apoi să se declare una nouă <code>Y</code> care conține valoarea celei inițial create (<code>X</code>).<av-elem type="ieditor"></av-elem>
6. Să se declare o variabilă <code>numeJucator</code> care să conțină numele tău.<av-elem type="ieditor"></av-elem>
7. Să se genereze numărul reprezentat printr-un șir de caractere ce conține doar cifre.<av-elem type="ieditor"></av-elem>
    > Exemplu: textul "1573" este convertit la numărul 1573

=== Vectori
1. Să se declare un vector ce conține toate numerele naturale de la 1 la 5 iar apoi să se afișeze al treilea element.<av-elem type="ieditor"></av-elem>
2. Să se parcurgă vectorul creat mai sus și de fiecare dată când se vizitează un element să se afișeze acest element ridicat la puterea a doua.<av-elem type="ieditor"></av-elem>
3. Să se introducă în vectorul creat valoarea 6.<av-elem type="ieditor"></av-elem>
4. Să se afișeze ultimele 3 elemente ale vectorului creat.<av-elem type="ieditor"></av-elem>
5. Să se șteargă primul element al vectorului folosind două metode diferite de a realiza această operație.<av-elem type="ieditor"></av-elem>
6. Să se creeze un vector nou ce conține elementele primului vector în ordine inversă.<av-elem type="ieditor"></av-elem>
7. Să se afișeze dacă vectorul conține o valoare introdusă de la tastatură iar dacă nu există să se introducă în vector la început.<av-elem type="ieditor"></av-elem>

=== Operatori
1. Să se solicite un număr real <code>x</code> de la utilizator apoi să se calculeze funcția:<av-elem type="ieditor"></av-elem>
    ![](../wp-content/uploads/2023/img/operatori_1.png)
2. Să se citească un număr de la tastatură și să se afișeze dacă este divizibil cu 3 sau 5.<av-elem type="ieditor"></av-elem>
3. Să se citească un text de la utilizator și să se afișeze dacă prima literă este 'A'.<av-elem type="ieditor"></av-elem>
4. Să se citească două numere de la tastatură și să se afișeze dacă ambele sunt pare.<av-elem type="ieditor"></av-elem>
5. O mașină și o motocicleta pleacă una spre cealaltă din două puncte diferite aflate la distanța D și având vitezele v1, respectiv v2. Să se afișeze în cât timp se vor întâlni și ce distanță a parcurs fiecare. Desigur, distanța D dar și vitezele v1 și v2 se vor citi de la tastatură.<av-elem type="ieditor"></av-elem>
    ![](../wp-content/uploads/2023/img/moto-auto.png)
6. Să se citească 3 numere naturale și să se afișeze dacă pot forma laturile unui triunghi iar în caz afirmativ să se afișeze și aria triunghiului.<av-elem type="ieditor"></av-elem>
7. Să se citească 3 litere iar apoi să se afișeze câte litere distincte s-au citit.<av-elem type="ieditor"></av-elem>
	
==== Structuri control
1. Să se declare un vector cu 5 elemente iar apoi să se calculeze media sa aritmetică.<av-elem type="ieditor"></av-elem>
2. Să se citească două numere n și x de la tastatură iar apoi să se calculeze funcția:<av-elem type="ieditor"></av-elem>
    ![](../wp-content/uploads/2023/img/structuri_1.png)
    > Atenție: valori mari pentru variabila _n_ vor duce la blocarea aplicației

3. Să se genereze numerele șirului Fibonacci până la o valoare <code>n</code> naturală citită de la tastatură. <av-elem type="ieditor"></av-elem>
Un șir Fibonacci este definit astfel:
    ![](../wp-content/uploads/2023/img/fibonacci.png)
    > Exemplu pentru n = 6, Fib(6) = 0, 1, 1, 2, 3, 5

4. Să se citească două valori <code>n</code> și <code>p</code> de la tastatură iar apoi <code>n</code> numere. Să se afișeze după citirea celor <code>n</code> numere câte numere divizibile cu <code>n</code> au fost introduse de utilizator.<av-elem type="ieditor"></av-elem>
5. Să se citească 6 numere de la tastatură într-un vector iar apoi prin parcurgerea vectorului să se afișeze câte alternări de la numere pozitive la numere negative și invers am avut în lista de numere.<av-elem type="ieditor"></av-elem>
    > Indiciu: pentru a determina o alternare de semn putem să înmulțim cele două valori adiacente iar dacă rezultatul este negativ atunci clar unul din numere este pozitiv iar celălalt negativ

6. Să se citească un vector cu <code>n</code> elemente unde <code>n</code> este și el citit de la tastatură iar apoi să se afișeze lungimea celui mai mare șir crescător de numere.<av-elem type="ieditor"></av-elem>

7. Să se afișeze caracterele duplicate dintr-un șir de caractere citit de la utilizator.<av-elem type="ieditor"></av-elem>
   > Exemplu: textul "Soarele apune" va afișa 'a', 'e'

8. Să se genereze toate numerele de 3 cifre ce au toate cifrele în ordine crescătoare.<av-elem type="ieditor"></av-elem>
   > Exemplu: 123, 124, 456, 367, etc.

=== Funcții
1. Să se citească trei valori <code>a</code>, <code>b</code> și <code>c</code> de la tastatură iar apoi să se calculeze rezultatul ecuației:<av-elem type="ieditor"></av-elem>
	![](../wp-content/uploads/2023/img/gradul-doi.png)
    > Indiciu: se pot utiliza funcțiile Math.sqrt() și Math.pow()

2. Să se citească de la tastatură lungimea laturii unui triunghi echilateral și să se stocheze în variabila <code>a</code> iar apoi să se afișeze lungimea înălțimii triunghiului precum și aria sa folosind formula:<av-elem type="ieditor"></av-elem>
	![](../wp-content/uploads/2023/img/trg-echilateral.png)

3. Să se scrie o funcție care determină dacă un număr este prim. Să se testeze folosind numere citite de la tastatură.<av-elem type="ieditor"></av-elem>
4. Folosind funcția creată mai sus, să se afișeze toate numerele prime de la <code>1</code> la <code>n</code> unde <code>n</code> este citit de la utilizator.<av-elem type="ieditor"></av-elem>
5. Să se scrie o funcție care primește un număr mare ca parametru de intrare iar apoi pune cifrele sale într-un vector astfel încât prima poziție în vector să conțină prima cifră a numărului, șamd. Să se testeze funcția folosind un număr citit de la tastatură iar apoi să se afișeze rezultatul funcției.<av-elem type="ieditor"></av-elem>
6. Să se genereze toate perechile de numere naturale <code>(a, b)</code> ce satisfac cerința <code>a + b = S</code> iar <code>a</code> și <code>b</code> nu au nicio cifră în comun. <code>S</code> se va citi de la tastatură.<av-elem type="ieditor"></av-elem>
> Indiciu: putem folosi funcția scrisă la exercițiul 5 pentru a crea vectorii ce conțin cifrele numerelor iar apoi vom putea parcuge cei doi vector și determina dacă există elemente comune între ei.
	
=== Domenii

=== Obiecte
1. Să se creeze două obiecte <code>A</code> și <code>B</code> ce conțin proprietățile <code>x</code> și <code>y</code> cu valori la alegere (se pot citi de la tastatură sau crea direct în cod). Considerând că cele două obiecte reprezintă două puncte într-un spațiu cartezian, să se calculeze distanța dintre ele folosind formula:<av-elem type="ieditor"></av-elem>
	![](../wp-content/uploads/2023/img/distance.png)

2.   Să se creeze prin instrucțiuni în cod (folosind literale) un vector cu 5 obiecte ce conțin fiecare două proprietăți: <code>nume</code> și <code>scor</code>. Să se citească apoi un nume de la tastatură și să se afișeze scorul acestui jucător prin căutare în lista de 5 obiecte. Dacă numele nu există în listă, atunci se va afișa un mesaj corespunzător.<av-elem type="ieditor"></av-elem>