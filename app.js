(function(){
  'use strict';
  var UNIDADES = [
    {id:'ml', rot:'ml', dica:'mililitro', fam:'vol', fator:0.001},
    {id:'l',  rot:'L',  dica:'litro',     fam:'vol', fator:1},
    {id:'g',  rot:'g',  dica:'grama',     fam:'peso', fator:0.001},
    {id:'kg', rot:'kg', dica:'quilo',     fam:'peso', fator:1},
    {id:'m',  rot:'m',  dica:'metro',     fam:'comp', fator:1, plural:'metros'},
    {id:'un', rot:'un', dica:'unidade',   fam:'un',  fator:1, plural:'unidades'}
  ];
  var BASE = {vol:'litro', peso:'quilo', comp:'metro', un:'unidade'};
  // Como o preço é mostrado: papel higiênico por metro dá centavos difíceis de ler, então mostramos a cada 10 metros
  var POR = {vol:{m:1, txt:'o litro', cada:'em cada litro'}, peso:{m:1, txt:'o quilo', cada:'em cada quilo'},
             comp:{m:10, txt:'a cada 10 metros', cada:'a cada 10 metros'}, un:{m:1, txt:'cada unidade', cada:'em cada unidade'}};
  var NOMES = ['A','B','C','D'];
  var lista = document.getElementById('lista');
  var resumo = document.getElementById('resumo');
  var addBtn = document.getElementById('adicionar');
  var seq = 0;

  var CHECK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';

  function num(txt){
    var t = String(txt||'').replace(/[^\d,\.]/g,'');
    if(t.indexOf(',')>=0){ t = t.replace(/\./g,'').replace(',', '.'); }
    var n = parseFloat(t);
    return isFinite(n) && n>0 ? n : null;
  }
  function brl(v){
    if(v < 0.005) return 'menos de R$ 0,01';
    return 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
  }
  function pct(v){ return Math.round(v*100) + '%'; }

  function criarCartao(dados){
    seq++;
    var id = 'p'+seq;
    var el = document.createElement('section');
    el.className = 'prod';
    el.setAttribute('data-id', id);
    el.setAttribute('aria-labelledby', id+'-nome');
    el.innerHTML =
      '<div class="prod-top"><h2 class="prod-nome" id="'+id+'-nome"><span class="bolinha" aria-hidden="true"></span><span class="titulo"></span></h2>' +
      '<button type="button" class="remover" hidden>Tirar</button></div>' +
      '<div class="campo"><label class="rot-preco" for="'+id+'-preco">Preço</label>' +
      '<div class="caixa"><span aria-hidden="true">R$</span><input id="'+id+'-preco" class="preco num" data-int="6" data-dec="2" type="text" inputmode="decimal" enterkeyhint="next" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="10" aria-describedby="'+id+'-preco-erro"></div>' +
      '<p class="erro-campo" id="'+id+'-preco-erro" aria-live="polite" hidden></p></div>' +
      '<div class="campo"><label class="rot-qtd" for="'+id+'-qtd">Quanto vem na embalagem?</label>' +
      '<p class="dica-qtd" id="'+id+'-qtd-dica"></p>' +
      '<div class="caixa"><input id="'+id+'-qtd" class="qtd num" data-int="5" data-dec="3" type="text" inputmode="decimal" enterkeyhint="done" autocomplete="off" autocorrect="off" spellcheck="false" maxlength="10" aria-describedby="'+id+'-qtd-dica '+id+'-qtd-erro"><span class="sufixo" aria-hidden="true"></span></div>' +
      '<p class="erro-campo" id="'+id+'-qtd-erro" aria-live="polite" hidden></p>' +
      '<fieldset class="campo-un"><legend class="sr">Unidade da embalagem</legend><div class="unidades"></div></fieldset></div>' +
      '<div class="pacote"><div class="txt" id="'+id+'-pac"><span class="rot-pac"></span><small class="dica-pac"></small></div>' +
      '<div class="passo" role="group" aria-labelledby="'+id+'-pac">' +
      '<button type="button" class="menos" aria-label="Uma embalagem a menos">−</button>' +
      '<output class="emb" aria-live="polite">1</output>' +
      '<button type="button" class="mais1" aria-label="Uma embalagem a mais">+</button></div></div>' +
      '<div class="res"><span class="selo">'+CHECK+'Mais barato</span><div class="valor">—</div><div class="nota">Preencha o preço e quanto vem</div></div>';
    lista.appendChild(el);
    var d = dados || {};
    el.querySelector('.preco').value = d.preco || '';
    el.querySelector('.qtd').value = d.qtd || '';
    el.querySelector('.emb').textContent = d.emb || 1;
    // Segue a unidade do Produto A até a pessoa escolher outra neste cartão
    el.setAttribute('data-auto', d.un ? '0' : '1');
    montarUnidades(el, d.un || unidadeDoA());
    return el;
  }

  function familia(){ return (document.querySelector('input[name=familia]:checked')||{}).value || 'vol'; }
  function daFamilia(f){ return UNIDADES.filter(function(u){ return u.fam === f; }); }
  function unidadeDoA(){
    var a = lista.querySelector('.prod'), f = familia();
    var u = a && (a.querySelector('.unidades input:checked')||{}).value;
    var ok = daFamilia(f).some(function(x){ return x.id === u; });
    return ok ? u : daFamilia(f)[daFamilia(f).length - 1].id;
  }
  function montarUnidades(c, escolhida){
    var id = c.getAttribute('data-id'), us = daFamilia(familia());
    if(!us.some(function(u){ return u.id === escolhida; })) escolhida = us[us.length - 1].id;
    var box = c.querySelector('.unidades');
    box.className = 'unidades' + (us.length === 2 ? ' duas' : '');
    box.innerHTML = us.map(function(u){
      return '<label><input type="radio" name="'+id+'-u" value="'+u.id+'"'+(u.id===escolhida?' checked':'')+'><span>'+u.rot+'<small>'+u.dica+'</small></span></label>';
    }).join('');
    // A pergunta e a dica usam as palavras do dia a dia de cada tipo
    var P = {
      // [pergunta do tamanho, dica, pergunta de quantas vêm juntas, dica, nome no plural]
      vol:  ['Quanto vem em cada embalagem?', 'Está escrito no rótulo, como 350 ml ou 1 L.',
             'Quantas embalagens vêm juntas?', 'Para fardos e pacotes, como 12 latas. Se for uma só, deixe 1.', 'embalagens'],
      peso: ['Quanto pesa cada embalagem?', 'Está escrito no rótulo, como 500 g ou 1 kg.',
             'Quantas embalagens vêm juntas?', 'Para pacotes, como 3 sabonetes. Se for uma só, deixe 1.', 'embalagens'],
      comp: ['Quantos metros tem cada rolo?', 'Está escrito no pacote, como 30 m.',
             'Quantos rolos vêm no pacote?', 'Por exemplo, 4 ou 12 rolos.', 'rolos'],
      un:   ['Quantas unidades vêm no pacote?', 'Por exemplo, 12 ovos ou 40 fraldas.',
             'Quantos pacotes vêm juntos?', 'Só se vierem pacotes grudados, como 3 pacotes de fraldas. Se não, deixe 1.', 'pacotes']
    }[familia()];
    c.querySelector('.rot-qtd').textContent = P[0];
    c.querySelector('.dica-qtd').textContent = P[1];
    c.querySelector('.rot-pac').textContent = P[2];
    c.querySelector('.dica-pac').textContent = P[3];
    c.setAttribute('data-plural', P[4]);
    // Com uma unidade só (metros, unidades), não precisa escolher: vira o nome ao lado do número
    var unica = us.length === 1;
    c.querySelector('.campo-un').hidden = unica;
    c.querySelector('.sufixo').textContent = unica ? us[0].plural : '';
  }

  function cartoes(){ return Array.prototype.slice.call(lista.querySelectorAll('.prod')); }

  function renomear(){
    var cs = cartoes();
    cs.forEach(function(c,i){
      c.querySelector('.bolinha').textContent = NOMES[i];
      c.querySelector('.titulo').textContent = 'Produto ' + NOMES[i];
      c.querySelector('.remover').hidden = cs.length <= 2;
      c.querySelector('.remover').setAttribute('aria-label','Tirar o produto ' + NOMES[i]);
    });
    addBtn.hidden = cs.length >= 4;
  }

  function ler(c, i){
    var uId = (c.querySelector('input[type=radio]:checked')||{}).value;
    var u = UNIDADES.filter(function(x){return x.id===uId;})[0];
    var preco = num(c.querySelector('.preco').value);
    var qtd = num(c.querySelector('.qtd').value);
    var emb = parseInt(c.querySelector('.emb').textContent,10) || 1;
    var ok = preco && qtd && u;
    return { el:c, nome:'Produto ' + NOMES[i], preco:preco, qtd:qtd, emb:emb, u:u, ok:!!ok,
      porBase: ok ? preco / (qtd * u.fator * emb) : null };
  }

  function calcular(){
    var itens = cartoes().map(ler);
    var prontos = itens.filter(function(x){return x.ok;});
    var fams = {}; prontos.forEach(function(x){ fams[x.u.fam] = true; });
    var misturado = Object.keys(fams).length > 1;
    var menor = null;
    if(!misturado && prontos.length >= 2){
      menor = prontos.reduce(function(a,b){ return b.porBase < a.porBase ? b : a; });
      var empate = prontos.filter(function(x){ return Math.abs(x.porBase - menor.porBase) < 0.005; }).length > 1;
      if(empate) menor = 'empate';
    }

    itens.forEach(function(x){
      var v = x.el.querySelector('.valor'), n = x.el.querySelector('.nota');
      var plural = x.el.getAttribute('data-plural') || 'embalagens';
      x.el.querySelector('.rot-preco').textContent = x.emb > 1 ? 'Preço de tudo junto (' + x.emb + ' ' + plural + ')' : 'Preço';
      x.el.classList.toggle('melhor', menor && menor!=='empate' && x===menor);
      if(!x.ok){ v.textContent = '—'; n.textContent = 'Preencha o preço e quanto vem'; return; }
      var po = POR[x.u.fam]; v.textContent = brl(x.porBase * po.m) + ' ' + po.txt;
      n.textContent = x.emb > 1 ? x.emb + ' ' + plural + ' de ' + x.el.querySelector('.qtd').value + ' ' + (x.u.plural || x.u.rot) + ' por ' + brl(x.preco) : 'Comparando pelo mesmo tanto';
    });

    var h;
    resumo.className = 'resumo';
    if(misturado){
      resumo.classList.add('aviso');
      h = '<h2>Confira as unidades</h2><p>Escolha a mesma unidade de medida nos produtos.</p>';
    } else if(prontos.length < 2){
      h = '<h2>Falta preencher</h2><p>Preencha o preço e quanto vem em pelo menos 2 produtos.</p>';
    } else if(menor === 'empate'){
      resumo.classList.add('ok');
      h = '<h2>Os dois saem pelo mesmo preço</h2><p>Pode escolher o que preferir.</p>';
    } else {
      resumo.classList.add('ok');
      var outros = prontos.filter(function(x){return x!==menor;}).sort(function(a,b){return a.porBase-b.porBase;});
      var seg = outros[0], po = POR[menor.u.fam];
      var econ = seg.porBase - menor.porBase;
      h = '<h2>' + menor.nome + ' compensa mais</h2>' +
        '<p>Sai ' + brl(econ * po.m) + ' mais barato ' + po.cada + ' que o ' + seg.nome + '. É ' + pct(econ/seg.porBase) + ' a menos.</p>';
      if(prontos.length > 2){
        h += '<ol>' + prontos.slice().sort(function(a,b){return a.porBase-b.porBase;}).map(function(x){
          return '<li>' + x.nome + ': ' + brl(x.porBase * po.m) + ' ' + po.txt + '</li>'; }).join('') + '</ol>';
      }
    }
    resumo.innerHTML = h;
    var temResultado = resumo.classList.contains('ok');
    if(temResultado) fbContexto = nomeFamilia() + ', ' + prontos.length + ' produtos';
    document.getElementById('feedback').hidden = !(temResultado || fb.votou);
  }

  /* Validação dos números.
     Aceita só algarismos e UM separador decimal (vírgula ou ponto; o ponto vira vírgula).
     Limita casas: preço até 999.999,99; tamanho até 99.999,999. Funciona ao digitar e ao colar,
     e mantém o cursor no lugar. Se algo for recusado, mostra um aviso curto embaixo do campo. */
  function limpar(valor, maxInt, maxDec){
    var s = String(valor).replace(/\./g, ',').replace(/[^0-9,]/g, '');
    var i = s.indexOf(',');
    if(i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/,/g, '');
    var partes = s.split(',');
    var inteira = partes[0].replace(/^0+(?=\d)/, '').slice(0, maxInt);
    if(partes.length > 1){
      if(inteira === '') inteira = '0';
      return inteira + ',' + partes[1].slice(0, maxDec);
    }
    return inteira;
  }
  function mostrarErro(input, msg){
    var p = document.getElementById(input.id + '-erro'); if(!p) return;
    var caixa = input.closest('.caixa');
    clearTimeout(input._t);
    if(!msg){ p.hidden = true; p.textContent = ''; caixa.classList.remove('invalida'); return; }
    p.textContent = msg; p.hidden = false; caixa.classList.add('invalida');
    input._t = setTimeout(function(){ mostrarErro(input, ''); }, 3500);
  }
  function validar(input){
    var maxInt = +input.getAttribute('data-int'), maxDec = +input.getAttribute('data-dec');
    var antes = input.value, pos = input.selectionStart == null ? antes.length : input.selectionStart;
    var limpo = limpar(antes, maxInt, maxDec);
    if(limpo === antes) return;
    var novoPos = limpar(antes.slice(0, pos), maxInt, maxDec).length;
    input.value = limpo;
    try { input.setSelectionRange(novoPos, novoPos); } catch(e){}
    var normal = String(antes).replace(/\./g, ',');
    var msg;
    if(/[^0-9,]/.test(normal)) msg = 'Use só números e vírgula';
    else if(normal.split(',').length > 2) msg = 'Só uma vírgula por número';
    else if(normal.indexOf(',') >= 0 && normal.split(',')[1].length > maxDec) msg = input.classList.contains('preco') ? 'O preço tem só 2 números depois da vírgula' : 'No máximo 3 números depois da vírgula';
    else if(normal.split(',')[0].replace(/^0+(?=\d)/, '').length > maxInt) msg = 'Número grande demais';
    if(msg) mostrarErro(input, msg);
  }
  function conferirZero(input){
    var v = input.value;
    if(v !== '' && !(num(v) > 0)) mostrarErro(input, 'Digite um valor maior que zero');
  }
  lista.addEventListener('input', function(e){
    if(e.target.matches('.num')){ validar(e.target); calcular(); }
  });
  lista.addEventListener('focusout', function(e){
    if(!e.target.matches('.num')) return;
    var v = e.target.value.replace(/,$/, '');
    if(v !== e.target.value){ e.target.value = v; calcular(); }
    conferirZero(e.target);
  });
  // Enter no preço leva ao tamanho; Enter no tamanho fecha o teclado
  lista.addEventListener('keydown', function(e){
    if(e.key !== 'Enter' || !e.target.matches('.num')) return;
    e.preventDefault();
    if(e.target.classList.contains('preco')) e.target.closest('.prod').querySelector('.qtd').focus();
    else e.target.blur();
  });
  lista.addEventListener('change', function(e){
    if(!e.target.matches('input[type=radio]')) return;
    var c = e.target.closest('.prod');
    if(c === lista.querySelector('.prod')){
      cartoes().forEach(function(o){ if(o !== c && o.getAttribute('data-auto') === '1') montarUnidades(o, e.target.value); });
    } else { c.setAttribute('data-auto','0'); }
    calcular();
  });
  document.querySelectorAll('input[name=familia]').forEach(function(r){
    r.addEventListener('change', function(){
      // Tamanhos de outro tipo não valem mais (1 litro não é 1 metro): apaga para a pessoa digitar de novo
      cartoes().forEach(function(c){ c.setAttribute('data-auto','1'); montarUnidades(c, null); c.querySelector('.qtd').value = ''; c.querySelector('.emb').textContent = 1; });
      calcular();
    });
  });
  lista.addEventListener('click', function(e){
    var c = e.target.closest('.prod'); if(!c) return;
    var out = c.querySelector('.emb'), n = parseInt(out.textContent,10) || 1;
    if(e.target.closest('.mais1')){ out.textContent = Math.min(99, n+1); calcular(); }
    else if(e.target.closest('.menos')){ out.textContent = Math.max(1, n-1); calcular(); }
    else if(e.target.closest('.remover')){ c.remove(); renomear(); calcular(); addBtn.focus(); }
  });

  addBtn.addEventListener('click', function(){
    var c = criarCartao(); renomear(); calcular();
    c.querySelector('.preco').focus();
  });

  /* ---------- Feedback: carinha + comentário opcional ----------
     Envia: sim/não, o tipo comparado (ex.: "Líquido, 2 produtos") e o comentário, se houver.
     Não envia preços, tamanhos nem nada que identifique a pessoa. */
  var fb = { votou:false, voto:null, id:null, chave:null };
  var fbContexto = '';
  var NOME_FAM = {vol:'Líquido', peso:'Peso', comp:'Metros', un:'Unidades'};
  function nomeFamilia(){ return NOME_FAM[familia()] || ''; }
  function enviarFeedback(dados){
    if(!/^https?:$/.test(location.protocol) || !window.fetch) return Promise.resolve(null);
    return fetch('/api/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(dados), keepalive:true })
      .then(function(r){ return r.ok ? r.json() : null; })
      .catch(function(){ return null; });
  }
  var fbTexto = document.getElementById('fb-texto'), fbEnviar = document.getElementById('fb-enviar');
  document.querySelectorAll('#feedback .fb').forEach(function(b){
    b.addEventListener('click', function(){
      if(fb.votou) return;
      fb.votou = true; fb.voto = b.getAttribute('data-v') === 'sim' ? 'sim' : 'nao';
      document.getElementById('fb-pergunta').hidden = true;
      document.getElementById('fb-depois').hidden = false;
      document.getElementById('fb-ok').focus();
      enviarFeedback({ voto: fb.voto, ferramenta:'compare', contexto: fbContexto })
        .then(function(r){ if(r && r.id){ fb.id = r.id; fb.chave = r.chave; } });
    });
  });
  fbTexto.addEventListener('input', function(){
    var n = fbTexto.value.length;
    document.getElementById('fb-conta').textContent = n + ' de 500 letras';
    fbEnviar.setAttribute('aria-disabled', fbTexto.value.trim() === '' ? 'true' : 'false');
  });
  fbEnviar.addEventListener('click', function(){
    var txt = fbTexto.value.trim();
    if(!txt) { fbTexto.focus(); return; }
    enviarFeedback({ voto: fb.voto, ferramenta:'compare', id: fb.id, chave: fb.chave, comentario: txt });
    document.getElementById('fb-coment').hidden = true;
    var fin = document.getElementById('fb-final'); fin.hidden = false; fin.focus();
  });
  function zerarFeedback(){
    fb = { votou:false, voto:null, id:null, chave:null };
    document.getElementById('fb-pergunta').hidden = false;
    document.getElementById('fb-depois').hidden = true;
    document.getElementById('fb-coment').hidden = false;
    document.getElementById('fb-final').hidden = true;
    fbTexto.value = ''; document.getElementById('fb-conta').textContent = '0 de 500 letras';
    fbEnviar.setAttribute('aria-disabled','true');
  }

  function zerar(){
    zerarFeedback();
    document.querySelector('input[name=familia][value=vol]').checked = true;
    lista.innerHTML = ''; criarCartao(); criarCartao(); renomear(); calcular();
    lista.querySelector('.preco').focus();
  }
  document.getElementById('limpar').addEventListener('click', zerar);

  // Tamanho da letra: 3 níveis, lembrado neste aparelho quando possível
  var NIVEIS = [1, 1.15, 1.3], nivel = 0;
  try { var salvo = parseInt(localStorage.getItem('qcm-letra'),10); if(salvo>=0 && salvo<3) nivel = salvo; } catch(e){}
  var bMenor = document.getElementById('menor'), bMaior = document.getElementById('maior');
  function aplicarLetra(){
    document.documentElement.style.setProperty('--escala', NIVEIS[nivel]);
    bMenor.setAttribute('aria-disabled', nivel===0);
    bMaior.setAttribute('aria-disabled', nivel===NIVEIS.length-1);
    try { localStorage.setItem('qcm-letra', nivel); } catch(e){}
  }
  bMenor.addEventListener('click', function(){ if(nivel>0){ nivel--; aplicarLetra(); } });
  bMaior.addEventListener('click', function(){ if(nivel<NIVEIS.length-1){ nivel++; aplicarLetra(); } });
  aplicarLetra();

  // Abre sempre vazio, com dois produtos para preencher
  criarCartao();
  criarCartao();
  renomear(); calcular();
})();
