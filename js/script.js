document.addEventListener("DOMContentLoaded", async () => {
  // ===== Mobile Menu Toggle =====
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('show');
      menuToggle.classList.toggle('open'); // optional: for hamburger animation
    });
  }

  // ===== Highlight Active Page in Navigation =====
  const navLinks = document.querySelectorAll("#nav-menu a");
  let path = window.location.pathname;
  if (path.endsWith("/")) path = path.slice(0, -1);
  let currentPage = path.split("/").pop();
  if (currentPage === "") currentPage = "index.html";

  navLinks.forEach(link => {
    let href = link.getAttribute("href");
    let hrefPage = href.replace(".html", "");
    if (
      hrefPage === currentPage.replace(".html", "") ||
      (currentPage === "index.html" && href === "index.html")
    ) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

});

// ==== active link ====
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.replace(/^\/|\/$/g, ""); 
  const links = document.querySelectorAll("#nav-menu a");

  links.forEach(link => {
    const href = link.getAttribute("href").replace(/^\/|\/$/g, "");
    if (currentPath === href || (currentPath === "" && href === "home")) {
      link.classList.add("active");
    }
  });
});






