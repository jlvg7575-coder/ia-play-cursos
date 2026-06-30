// 1. MENU HAMBÚRGUER (MOBILE)
const menuToggle = document.getElementById('mobile-menu');
const navMenu = document.getElementById('nav-menu');

if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
        // Alterna a classe 'ativo' no botão e no menu
        menuToggle.classList.toggle('ativo');
        navMenu.classList.toggle('ativo');
    });
}