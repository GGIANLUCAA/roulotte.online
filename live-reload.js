;(function(){
  var path = location.pathname || '/index.html';
  if (path === '/') path = '/index.html';
  var baseline = null;
  var interval = 2000;
  function check(){
    var u = path + '?t=' + Date.now();
    fetch(u, { method: 'HEAD', cache: 'no-store' }).then(function(res){
      var lm = res.headers.get('Last-Modified') || '';
      if (!baseline) { baseline = lm; return; }
      if (lm && baseline && lm !== baseline) { location.reload(); }
    }).catch(function(){});
  }
  try { setInterval(check, interval); } catch {}
})(); 
