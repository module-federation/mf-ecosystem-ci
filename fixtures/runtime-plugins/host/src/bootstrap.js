const out = document.getElementById('out');

import('rp_remote/greeting')
  .then(({ greet }) => {
    out.textContent = greet('rp_host');
    out.dataset.state = 'loaded';
  })
  .catch((error) => {
    out.textContent = String(error && error.stack ? error.stack : error);
    out.dataset.state = 'error';
  });
