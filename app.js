(function(){
  'use strict';

  // Six matching groups (question / picture hint / answer).
  // Column display order intentionally scrambled to mirror the printed worksheet.
  // Picture hints are built from several small icons forming one scene, plus a short
  // NOUN-ONLY label -- never a conjugated sentence -- so the target grammar (-느라(고))
  // never appears anywhere on the board. Students infer the cause from the scene.
  var groups = {
    g1: { q:'어제 잘 잤어요?',
          pic:{icons:['🛏️','🔊','🙉','😖'], label:'옆방 소음'},
          a:'못 잤어요.' },
    g2: { q:'식사하셨어요?',
          pic:{icons:['📖','⏰','✏️','😵'], label:'밤샘 시험공부'},
          a:'못 먹었어요.' },
    g3: { q:'어제 왜 전화를 안 받았어요?',
          pic:{icons:['🚿','💦','📴','🧴'], label:'샤워 중'},
          a:'못 받았어요.' },
    g4: { q:'요즘 어떻게 지내요?',
          pic:{icons:['💻','🌙','📊','😩'], label:'매일 야근'},
          a:'힘들어요.' },
    g5: { q:'오늘 시간 있어요?',
          pic:{icons:['🏃','🏊','⏱️','📅'], label:'운동 스케줄'},
          a:'바빠요.' },
    g6: { q:'어제 생일 파티에 갔어요?',
          pic:{icons:['🍽️','🍻','👔','🕗'], label:'회사 회식'},
          a:'못 갔어요.' }
  };

  var leftOrder  = ['g1','g2','g5','g3','g4','g6'];
  var midOrder   = ['g4','g2','g3','g1','g6','g5'];
  var rightOrder = ['g4','g2','g6','g1','g5','g3'];

  var TOTAL = Object.keys(groups).length;
  document.getElementById('scoreTotal').textContent = TOTAL;

  var colQ = document.getElementById('col-q');
  var colPic = document.getElementById('col-pic');
  var colA = document.getElementById('col-a');
  var svg = document.getElementById('lines');
  var board = document.getElementById('board');

  function el(tag, cls){ var e = document.createElement(tag); if (cls) e.className = cls; return e; }

  function buildNode(role, groupId, index){
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

  /* ---------------- selection / connection logic ---------------- */
  var pending = { q:null, pic:null, a:null };
  var connections = []; // { q, pic, a, groupIds:{q,pic,a} }
  var checked = false;

  function nodeEl(role, groupId){ return document.getElementById(role + '-' + groupId); }

  function isConnected(role, groupId){
    return connections.some(function(c){ return c[role] === groupId; });
  }

  function connectionFor(role, groupId){
    return connections.filter(function(c){ return c[role] === groupId; })[0];
  }

  function onNodeClick(node){
    if (checked) return; // lock after checking; use "다시 하기" to edit again
    var role = node.dataset.role;
    var gid = node.dataset.group;

    // clicking an already-connected node breaks that connection so it can be redone
    if (isConnected(role, gid)){
      var conn = connectionFor(role, gid);
      connections = connections.filter(function(c){ return c !== conn; });
      render();
      return;
    }

    if (pending[role] === gid){
      pending[role] = null; // toggle off
    } else {
      pending[role] = gid;
    }

    if (pending.q && pending.pic && pending.a){
      connections.push({ q: pending.q, pic: pending.pic, a: pending.a });
      pending = { q:null, pic:null, a:null };
    }
    render();
  }

  /* ---------------- rendering ---------------- */
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
    // Skip on layouts where the SVG overlay is hidden (mobile stacked view).
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
      if (checked){
        cls += (c.q === c.pic && c.pic === c.a) ? ' correct' : ' incorrect';
      }
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

  /* ---------------- controls ---------------- */
  document.getElementById('checkAll').addEventListener('click', function(){
    checked = true;
    var correct = connections.filter(function(c){ return c.q === c.pic && c.pic === c.a; }).length;
    document.getElementById('scoreNum').textContent = correct;
    render();
  });

  document.getElementById('revealAll').addEventListener('click', function(){
    connections = Object.keys(groups).map(function(gid){ return { q:gid, pic:gid, a:gid }; });
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
  document.getElementById('reset').addEventListener('click', fullReset);

  render();
})();
