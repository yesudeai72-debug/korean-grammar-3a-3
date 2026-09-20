(function(){
  'use strict';

  // Six matching groups (question / picture hint / answer / stage-2 sentence).
  // Column display order for stage 1 is intentionally scrambled to mirror the
  // printed worksheet. Picture hints are built from several small icons forming
  // one scene, plus a short NOUN-ONLY label -- never a conjugated sentence --
  // so the target grammar (-느라(고)) never leaks anywhere on stage 1.
  //
  // Every group's picture/reason is a DYNAMIC ACTION the same person performs
  // (게임하다, 공부하다, 샤워하다, 야근하다, 운동하다, 회식하다) because "-느라(고)"
  // requires an action verb with the same subject in both clauses -- a passive
  // cause (like outside noise) would not be grammatical here.
  var groups = {
    g1: { q:'어제 잘 잤어요?',
          pic:{icons:['🎮','🌙','⏰','😵'], label:'밤샘 게임'},
          a:'못 잤어요.',
          base:'게임하다', before:'어제 밤새 ', after:' 잠을 잘 못 잤어요.' },
    g2: { q:'식사하셨어요?',
          pic:{icons:['📖','⏰','✏️','😵'], label:'밤샘 시험공부'},
          a:'못 먹었어요.',
          base:'공부하다', before:'어제 시험 ', after:' 밥을 못 먹었어요.' },
    g3: { q:'어제 왜 전화를 안 받았어요?',
          pic:{icons:['🚿','💦','📴','🧴'], label:'샤워 중'},
          a:'못 받았어요.',
          base:'샤워하다', before:'어제 ', after:' 전화를 못 받았어요.' },
    g4: { q:'요즘 어떻게 지내요?',
          pic:{icons:['💻','🌙','📊','😩'], label:'매일 야근'},
          a:'힘들어요.',
          base:'야근하다', before:'요즘 매일 ', after:' 힘들어요.' },
    g5: { q:'오늘 시간 있어요?',
          pic:{icons:['🏃','🏊','⏱️','📅'], label:'운동 스케줄'},
          a:'바빠요.',
          base:'운동하다', before:'요즘 ', after:' 바빠요.' },
    g6: { q:'어제 생일 파티에 갔어요?',
          pic:{icons:['🍽️','🍻','👔','🕗'], label:'회사 회식'},
          a:'못 갔어요.',
          base:'회식하다', before:'어제 회사 ', after:' 생일 파티에 못 갔어요.' }
  };

  var groupOrder = ['g1','g2','g3','g4','g5','g6']; // stage-2 numbering order

  /* =========================================================
     STAGE NAVIGATION
  ========================================================= */
  var stageOneBtn = document.getElementById('stage-one-btn');
  var stageTwoBtn = document.getElementById('stage-two-btn');
  var stageOneSec = document.getElementById('stage-one');
  var stageTwoSec = document.getElementById('stage-two');
  var stageTitle = document.getElementById('stage-title');
  var stageInstruction = document.getElementById('stage-instruction');

  var STAGE_COPY = {
    one: {
      title: '질문에 어울리는 대답을 찾아보세요',
      instruction: '가운데 그림을 힌트로 삼아 <b>질문 → 그림 → 대답</b> 순서로 하나씩 눌러 선을 연결하세요. 같은 그룹을 모두 고르면 자동으로 이어집니다.'
    },
    two: {
      title: "'-느라(고)' 문장을 완성해 보세요",
      instruction: '그림 속 행동을 <b>기본형 → -느라(고)</b> 형태로 바꿔서 문장 속 빈칸에 써 보세요.'
    }
  };

  function showStage(stage){
    var isOne = stage === 'one';
    stageOneSec.hidden = !isOne;
    stageTwoSec.hidden = isOne;
    if (isOne){ stageOneBtn.setAttribute('aria-current','step'); stageTwoBtn.removeAttribute('aria-current'); }
    else { stageTwoBtn.setAttribute('aria-current','step'); stageOneBtn.removeAttribute('aria-current'); }
    stageTitle.textContent = STAGE_COPY[stage].title;
    stageInstruction.innerHTML = STAGE_COPY[stage].instruction;
    if (!isOne) drawLines(); // no-op safeguard; stage 1 lines just stay as-is underneath
  }

  stageOneBtn.addEventListener('click', function(){ showStage('one'); });
  stageTwoBtn.addEventListener('click', function(){ showStage('two'); });

  /* =========================================================
     STAGE 1 -- matching board
  ========================================================= */
  var leftOrder  = ['g1','g2','g5','g3','g4','g6'];
  var midOrder   = ['g4','g2','g3','g1','g6','g5'];
  var rightOrder = ['g4','g2','g6','g1','g5','g3'];

  var TOTAL = groupOrder.length;
  document.getElementById('scoreTotal').textContent = TOTAL;

  var colQ = document.getElementById('col-q');
  var colPic = document.getElementById('col-pic');
  var colA = document.getElementById('col-a');
  var svg = document.getElementById('lines');
  var board = document.getElementById('board');

  function el(tag, cls){ var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function buildNode(role, groupId){
    var node = el('div', 'node ' + role);
    node.dataset.role = role;
    node.dataset.group = groupId;
    node.id = role + '-' + groupId;
    node.tabIndex = 0;
    node.setAttribute('role', 'button');
    if (role === 'q'){
      node.textContent = groups[groupId].q;
    } else if (role === 'a'){
      node.textContent = groups[groupId].a;
    } else {
      var grid = el('span', 'icon-grid');
      groups[groupId].pic.icons.forEach(function(ic){
        var slot = el('span', 'icon-slot');
        slot.textContent = ic;
        grid.appendChild(slot);
      });
      var cap = el('span', 'cap'); cap.textContent = groups[groupId].pic.label;
      node.appendChild(grid); node.appendChild(cap);
    }
    node.addEventListener('click', function(){ onNodeClick(node); });
    node.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onNodeClick(node); }
    });
    return node;
  }

  leftOrder.forEach(function(gid){ colQ.appendChild(buildNode('q', gid)); });
  midOrder.forEach(function(gid){ colPic.appendChild(buildNode('pic', gid)); });
  rightOrder.forEach(function(gid){ colA.appendChild(buildNode('a', gid)); });

  var pending = { q:null, pic:null, a:null };
  var connections = [];
  var checked = false;

  function nodeEl(role, groupId){ return document.getElementById(role + '-' + groupId); }
  function isConnected(role, groupId){ return connections.some(function(c){ return c[role] === groupId; }); }
  function connectionFor(role, groupId){ return connections.filter(function(c){ return c[role] === groupId; })[0]; }

  function onNodeClick(node){
    if (checked) return;
    var role = node.dataset.role;
    var gid = node.dataset.group;

    if (isConnected(role, gid)){
      var conn = connectionFor(role, gid);
      connections = connections.filter(function(c){ return c !== conn; });
      render();
      return;
    }

    if (pending[role] === gid){ pending[role] = null; }
    else { pending[role] = gid; }

    if (pending.q && pending.pic && pending.a){
      connections.push({ q: pending.q, pic: pending.pic, a: pending.a });
      pending = { q:null, pic:null, a:null };
    }
    render();
  }

  function render(){
    ['q','pic','a'].forEach(function(role){
      var order = role === 'q' ? leftOrder : (role === 'pic' ? midOrder : rightOrder);
      order.forEach(function(gid){
        var node = nodeEl(role, gid);
        node.classList.remove('pending','connected','correct','incorrect');
        var conn = connectionFor(role, gid);
        if (conn){
          node.classList.add('connected');
          if (checked){
            var isRight = conn.q === conn.pic && conn.pic === conn.a;
            node.classList.add(isRight ? 'correct' : 'incorrect');
          }
        } else if (pending[role] === gid){
          node.classList.add('pending');
        }
      });
    });
    drawLines();
  }

  function drawLines(){
    if (stageOneSec.hidden) return;
    if (getComputedStyle(svg).display === 'none') { svg.innerHTML=''; return; }
    var rect = board.getBoundingClientRect();
    svg.setAttribute('width', rect.width);
    svg.setAttribute('height', rect.height);
    svg.setAttribute('viewBox', '0 0 ' + rect.width + ' ' + rect.height);
    svg.innerHTML = '';

    function center(elm){
      var r = elm.getBoundingClientRect();
      return { x: r.left - rect.left + r.width/2, y: r.top - rect.top + r.height/2 };
    }

    connections.forEach(function(c){
      var qEl = nodeEl('q', c.q), picEl = nodeEl('pic', c.pic), aEl = nodeEl('a', c.a);
      var p1 = center(qEl), p2 = center(picEl), p3 = center(aEl);
      var cls = 'line';
      if (checked){ cls += (c.q === c.pic && c.pic === c.a) ? ' correct' : ' incorrect'; }
      [[p1,p2],[p2,p3]].forEach(function(pair){
        var a = pair[0], b = pair[1];
        var midx = (a.x + b.x) / 2;
        var path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d', 'M '+a.x+' '+a.y+' C '+midx+' '+a.y+', '+midx+' '+b.y+', '+b.x+' '+b.y);
        path.setAttribute('class', cls);
        svg.appendChild(path);
      });
    });
  }

  window.addEventListener('resize', drawLines);

  document.getElementById('checkAll').addEventListener('click', function(){
    checked = true;
    var correct = connections.filter(function(c){ return c.q === c.pic && c.pic === c.a; }).length;
    document.getElementById('scoreNum').textContent = correct;
    render();
  });

  document.getElementById('revealAll').addEventListener('click', function(){
    connections = groupOrder.map(function(gid){ return { q:gid, pic:gid, a:gid }; });
    checked = true;
    document.getElementById('scoreNum').textContent = TOTAL;
    render();
  });

  function fullReset(){
    connections = [];
    pending = { q:null, pic:null, a:null };
    checked = false;
    document.getElementById('scoreNum').textContent = '0';
    render();
  }

  document.getElementById('resetAll').addEventListener('click', fullReset);
  document.getElementById('reset').addEventListener('click', function(){
    fullReset();
    resetStage2();
  });

  render();

  /* =========================================================
     STAGE 2 -- "-느라(고)" sentence completion
     Each blank starts as a dashed CHIP showing the dictionary form (기본형).
     Clicking it removes the chip and swaps in an empty text input, so the
     student has to type the whole "stem + 느라(고)" form themselves.
  ========================================================= */
  document.getElementById('scoreTotal2').textContent = groupOrder.length;
  var stage2List = document.getElementById('stage2-list');
  var stage2Checked = false;

  function stemOf(base){ return base.replace(/다$/, ''); } // 게임하다 -> 게임하

  function buildStage2Item(gid, num){
    var g = groups[gid];
    var li = el('li', 'stage2-item');

    var numBadge = el('span', 'item-num'); numBadge.textContent = num;
    li.appendChild(numBadge);

    var hint = el('span', 'item-hint');
    g.pic.icons.forEach(function(ic){
      var s = el('span', 'icon-slot small'); s.textContent = ic; hint.appendChild(s);
    });
    li.appendChild(hint);

    var sentence = el('span', 'item-sentence');
    sentence.appendChild(document.createTextNode(g.before));

    var slot = el('span', 'conj-slot'); slot.id = 'slot-' + gid;
    buildConjChip(gid, slot);
    sentence.appendChild(slot);

    sentence.appendChild(document.createTextNode(g.after));
    li.appendChild(sentence);

    return li;
  }

  function buildConjChip(gid, slot){
    var g = groups[gid];
    var chip = el('span', 'click-blank');
    chip.textContent = g.base;
    chip.dataset.converted = 'false';
    chip.dataset.group = gid;
    chip.tabIndex = 0;
    chip.setAttribute('role','button');
    chip.title = "클릭해서 '-느라(고)' 형태로 써 보세요";

    function convert(){
      if (chip.dataset.converted === 'true') return;
      chip.dataset.converted = 'true';
      var inp = el('input', 'blank-input wide');
      inp.type = 'text';
      inp.id = 'input-' + gid;
      inp.dataset.group = gid;
      inp.autocomplete = 'off';
      inp.setAttribute('aria-label', g.base + ' 을(를) -느라(고) 형태로');
      var tag = el('span', 'base-tag'); tag.textContent = '(' + g.base + ')';
      slot.innerHTML = '';
      slot.appendChild(inp);
      slot.appendChild(tag);
      inp.focus();
    }
    chip.addEventListener('click', convert);
    chip.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); convert(); }
    });
    slot.innerHTML = '';
    slot.appendChild(chip);
  }

  groupOrder.forEach(function(gid, i){ stage2List.appendChild(buildStage2Item(gid, i+1)); });

  function stage2Inputs(){ return Array.from(document.querySelectorAll('.blank-input')); }
  function stage2UnconvertedChips(){ return Array.from(document.querySelectorAll('.click-blank[data-converted="false"]')); }

  function isAnswerRight(gid, value){
    var stem = stemOf(groups[gid].base);
    var val = (value || '').trim();
    return val === stem + '느라고' || val === stem + '느라';
  }

  document.getElementById('checkAll2').addEventListener('click', function(){
    stage2Checked = true;
    var correct = 0;
    stage2Inputs().forEach(function(inp){
      var gid = inp.dataset.group;
      inp.classList.remove('correct','incorrect','revealed');
      if (isAnswerRight(gid, inp.value)){ inp.classList.add('correct'); correct++; }
      else { inp.classList.add('incorrect'); }
    });
    stage2UnconvertedChips().forEach(function(chip){ chip.classList.add('incorrect'); });
    document.getElementById('scoreNum2').textContent = correct;
  });

  document.getElementById('revealAll2').addEventListener('click', function(){
    stage2UnconvertedChips().forEach(function(chip){ chip.click(); });
    setTimeout(function(){
      var correct = 0;
      stage2Inputs().forEach(function(inp){
        var gid = inp.dataset.group;
        inp.value = stemOf(groups[gid].base) + '느라고';
        inp.classList.remove('incorrect');
        inp.classList.add('correct','revealed');
        correct++;
      });
      document.getElementById('scoreNum2').textContent = correct;
      stage2Checked = true;
    }, 0);
  });

  function resetStage2(){
    stage2Checked = false;
    document.getElementById('scoreNum2').textContent = '0';
    groupOrder.forEach(function(gid){
      var slot = document.getElementById('slot-' + gid);
      if (slot) buildConjChip(gid, slot);
    });
  }

  document.getElementById('resetAll2').addEventListener('click', resetStage2);

})();
