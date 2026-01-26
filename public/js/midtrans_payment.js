(function(){
  var btn = document.getElementById('pay-button');
  if (!btn) return;
  var snapInvoked = false;
  function redirectWithParams(base, params){
    try{
      var u = new URL(base, window.location.origin);
      Object.keys(params).forEach(function(k){ u.searchParams.set(k, params[k]); });
      window.location.href = u.toString();
    }catch(e){
      var qs = Object.keys(params).map(function(k){ return encodeURIComponent(k)+'='+encodeURIComponent(params[k]); }).join('&');
      window.location.href = base + (base.indexOf('?')>-1?'&':'?') + qs;
    }
  }
  btn.addEventListener('click', function(){
    if (snapInvoked) return;
    if (!window.snap || typeof window.snap.pay !== 'function') {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'Gagal',
          text: 'Gagal memuat sistem pembayaran otomatis. Mohon refresh halaman dan coba lagi.',
          icon: 'error',
          confirmButtonColor: '#E02424'
        });
      }
      snapInvoked = false;
      return;
    }
    snapInvoked = true;
    var token = btn.getAttribute('data-snap-token') || '';
    var activityId = btn.getAttribute('data-activity-id') || '';
    var orderIdFallback = btn.getAttribute('data-order-id') || '';
    var finishUrl = btn.getAttribute('data-finish-url') || '';
    var errorUrl = btn.getAttribute('data-error-url') || '';
    var unfinishUrl = btn.getAttribute('data-unfinish-url') || '';
    window.snap.pay(token, {
      onSuccess: function(result){
        redirectWithParams(finishUrl, { order_id: result && result.order_id ? result.order_id : '', activity_id: activityId });
      },
      onPending: function(result){
        redirectWithParams(finishUrl, { order_id: result && result.order_id ? result.order_id : '', activity_id: activityId });
      },
      onError: function(result){
        redirectWithParams(errorUrl, { order_id: result && result.order_id ? result.order_id : '', activity_id: activityId });
      },
      onClose: function(){
        redirectWithParams(unfinishUrl, { order_id: orderIdFallback, activity_id: activityId });
      }
    });
  });
})();
