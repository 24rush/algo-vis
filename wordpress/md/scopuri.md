<div class="tip-box">
<strong>Ce vom afla din acest articol:</strong>
 - ce sunt variabilele locale si cele globale
 - ce reprezinta domeniul (scopul) unei variabile
</div>

Am învățat în lecțiile trecute cum să declarăm variabile și funcții noi iar în această lecție vom discuta despre ciclul de viață (engl. _lifetime_) și domeniul unei variabile (engl. _scope_). 

# Domeniul variabilelor #
Domeniul unei variabile se poate defini ca fiind secțiunea din programul nostru în care această variabilă este vizibilă și utilizabilă în instrucțiuni.

Există definite următoarele categorii de domenii pentru variabile:
- global în care o variabilă este vizibilă în toate instrucțiunile programului
- al funcției în care este declarată ceea ce înseamnă că acea variabilă poate fi folosită doar în corpul funcției respective
- bloc adică variabila este declarată în cadrul unei secvențe de instrucțiuni delimitate prin acolade (**{ }**)

<p class="tip-box">
În funcție de aceste domenii, variabilele se pot împărți în două categorii: <strong>variabile locale</strong> (ce au fost declarate în corpul unei funcții sau al unui bloc) și <strong>variabile globale</strong> (declarate în afara oricărei funcții sau bloc).
</p>

## Variabile locale ##
În exemplul de mai jos observăm cum domeniul unei variabile afectează programul nostru. Variabila <code>x</code> declarată în funcția <code>boo</code> este o variabilă locală, făcând parte din domeniul funcției ceea ce înseamnă că orice instrucțiune din afara funcției <code>boo</code> nu va avea acces la această variabilă. Dacă încercăm să rulam acest exemplu, vom obține o eroare (<code>x is not defined</code>) ce ne spune că variabila <code>x</code> nu este definită.

<div class="algovis" config-id="scopuri-basics.json" av-selected="0"></div>

## Variabile globale ##
Dacă modificăm exemplul și definim variabila ```x``` în afara funcției ```boo``` atunci o vom și transforma dintr-o variabilă locală într-una globală iar exemplul nostru va funcționa.

<div class="algovis" config-id="scopuri-basics.json" av-selected="1"></div>

## Domenii suprapuse ##
În exemplul următor observăm comportamentul variabilelor definite în cadrul unui bloc. Orice secvență de instrucțiuni ce începe prin deschidere cu o acolada (**{**}) va crea un bloc nou iar toate variabile definite în cadrul blocului vor fi vizibile doar instrucțiunilor din acel bloc. În exemplu nostru, variabila <code>y</code> din funcția <code>boo</code> este definită în interiorul blocului aferent instrucțiunii <code>if</code> ceea ce o face să fie o **variabila locală** vizibilă doar în blocul **if** iar încercarea de o accesa după terminarea blocului (imediat după acolada (**}**)) va determina eroarea <code>y is not defined</code>. Mai putem observa și că în acest bloc accesăm cu succes variabila <code>x</code> care este locală funcției <code>boo</code>. Acest lucru este posibil întrucât orice domeniu va avea acces la variabilele definite într-un domeniul mai mare ce îl conține și pe el - în cazul nostru domeniul local determinat de <code>if</code> este un domeniu conținut de cel al funcției <code>boo</code> (exterior). În același mod putem accesa variabile globale (definite în afara funcțiilor) întrucât domeniul global conține toate domeniile funcțiilor.

<div class="algovis" config-id="scopuri-basics.json" av-selected="2"></div>

<p class="attention-box">Domeniile variabilelor funcționează pe principiul <strong>mai mic/mai mare</strong> adică un domeniu mai mic (interior) va avea access la toate variabilele definite în domeniile mai mari care îl conțin și pe el pe când un domeniu mai mare va avea acees doar la variabilele din domeniul său nu și la cele din domeniile pe care le conține.
</p>

<img src="../wp-content/uploads/2023/img/scopuri0.png" class="img-box">

<div class="attention-box">
<strong>Rezumat:</strong>
- În funcție de locul în care declarăm o variabilă aceasta poate fi: <strong>globală</strong> sau <strong>locală</strong>
- Variabilele globale sunt declarate în afara oricărei funcții sau bloc și pot fi accesate de oriunde din programul nostru
- Variabilele locale sunt declarate în corpul funcțiilor sau în sub-blocuri din corpul lor și pot fi accesate doar din blocurile în care au fost declarate
- Durata de viață a unei variabile este dată de blocul în care a fost declarată, cele locale vor fi distruse (neutilizabile) după sfârșitul execuției blocului în care erau declarate însă cele globale vor fi distruse abia după terminarea completă a programului
</div>