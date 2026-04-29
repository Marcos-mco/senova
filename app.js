/* =====================
   SENOVA — app.js
   Formulário de acesso antecipado
   ===================== */

function handleSubmit(event) {
  event.preventDefault();

  const nome     = document.getElementById('nome').value.trim();
  const email    = document.getElementById('email').value.trim();
  const telefone = document.getElementById('telefone').value.trim();
  const btn      = document.getElementById('btn-submit');

  if (!nome || !email) return;

  // Salva localmente (validação MVP)
  const cadastros = JSON.parse(localStorage.getItem('senova_cadastros') || '[]');
  cadastros.push({
    nome,
    email,
    telefone,
    data: new Date().toISOString()
  });
  localStorage.setItem('senova_cadastros', JSON.stringify(cadastros));

  // Feedback visual
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  setTimeout(() => {
    document.getElementById('form-cadastro').style.display = 'none';
    document.getElementById('form-sucesso').style.display  = 'block';
  }, 800);

  // Log no console para debug
  console.log('Novo cadastro Senova:', { nome, email, telefone });
}

// Smooth scroll para âncoras
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
