Am invatat in lectiile trecute cum sa declaram variabile si functii noi iar in aceasta lectie vom discuta despre ciclul de viata (engl. _lifetime_) si domeniul unei variabile (engl. _scope_). 

# Domeniul variabilelor #
Domeniul unei variabile se poate defini ca fiind sectiunea din programul nostru in care aceasta variabila este vizibila si utilizabila in instructiuni.

Exista definite urmatoarele categorii de domenii pentru variabile:
- global in care o variabila este vizibila in toate instructiunile programului
- al functiei in care este declarata ceea ce inseamna ca acea variabila poate fi folosita doar in corpul functiei respective
- bloc adica variabila este declarata in cadrul unei secvente de instructiuni delimitate prin acolade (**{ }**)

<p class="tip-box">
In functie de aceste domenii, variabilele se pot imparti in doua categorii: <strong>variabile locale</strong> (ce au fost declarate in corpul unei functii sau al unui bloc) si <strong>variabile globale</strong> (declarate in afara oricarei functii sau bloc).
</p>

## Variabile locale ##
In exemplul de mai jos observam cum domeniul unei variabile afecteaza programul nostru. Variabila <code>x</code> declarata in functia <code>boo</code> este o variabila locala, facand parte din domeniul functiei ceea ce inseamna ca orice instructiune din afara functiei <code>boo</code> nu va avea acces la aceasta variabila. Daca incercam sa rulam acest exemplu, vom obtine o eroare (<code>x is not defined</code>) ce ne spune ca variabila <code>x</code> nu este definita.

<div class="algovis" config-id="scopuri-basics.json" av-selected="0"></div>

## Variabile globale ##
Daca modificam exemplul si definim variabila <code>x</code> in afara functiei <code>boo</code> atunci o vom si transforma dintr-o variabila locala intr-una globala iar exemplul nostru va functiona.

<div class="algovis" config-id="scopuri-basics.json" av-selected="1"></div>

## Domenii suprapuse ##
In exemplu urmator observam comportamentul variabilelor definite in cadrul unui bloc. Orice secventa de instructiuni ce incepe prin deschiderea cu o acolada (**{**}) va crea un bloc nou iar toate variabile definite in cadrul blocului vor fi vizibile doar instructiunilor din acel bloc. In exemplu nostru, variabila <code>y</code> din functia <code>boo</code> este definita in interiorul blocului aferent instructiuni <code>if</code> ceea ce o face sa fie o **variabila locala** vizibila doar in blocul **if** iar incercarea de o accesa dupa terminarea blocului (imediat dupa acolada (**}**)) va determina eroarea <code>y is not defined</code>. Mai putem observa si ca in acest bloc accesam cu succes variabila <code>x</code> care este locala functiei <code>boo</code>. Acest lucru este posibil intrucat orice domeniu va avea acces la variabilele definite intr-un domeniul mai mare ce il contine si pe el - in cazul nostru domeniul local determinat de <code>if</code> este un domeniu continut de cel al functiei <code>boo</code> (exterior). In acelasi mod puteam accesa variabile globale (definite in afara functiilor) intrucat domeniul global contine toate domeniile functiilor.

<div class="algovis" config-id="scopuri-basics.json" av-selected="2"></div>

<p class="attention-box">Domeniile variabilelor functioneaza pe principiul <strong>mai mic/mai mare</strong> adica un domeniu mai mic (interior) va avea access la toate variabilele definite in domeniile mai mari care il contin si pe el pe cand un domeniu mai mare va avea acees doar la variabilele din domeniul sau nu si la cele din domeniile pe care le contine.
</p>

<img src="../wp-content/uploads/2023/img/scopuri0.png" class="img-box">

# Rezumat #
- In functie de locul in care declaram o variabila aceasta poate fi: <strong>globala</strong> sau <strong>locala</strong>
- Variabilele globale sunt declarate in afara oricarei functii sau bloc si pot fi accesate de oriunde din programul nostru
- Variabilele locale sunt declarate in corpul functiilor sau in sub-blocuri din corpul lor si pot fi accesate doar din blocurile in care au fost declarate
- Durata de viata a unei variabile este data de blocul in care a fost declarata, cele locale vor fi distruse (neutilizabile) dupa sfarsitul executiei blocului in care erau declarate insa cele globale vor fi distruse abia dupa terminarea completa a programului