// Contact form confirmation. Previously lived at the bottom of demo-widget.js,
// which was removed along with the homepage chat demo.
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    document.getElementById('contact-confirm').style.display = 'block';
  });
})();
