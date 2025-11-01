// script.js

document.addEventListener("DOMContentLoaded", () => {
  // ===== Mobile Menu Toggle =====
  
    // Select the menu toggle button and the nav menu
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  // Add click listener
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
  });

  // ===== Highlight Active Page in Navigation =====
  const navLinks = document.querySelectorAll("nav-menu a");
  let path = window.location.pathname;

  // Remove trailing slash
  if (path.endsWith("/")) path = path.slice(0, -1);

  // Get last part of path
  let currentPage = path.split("/").pop();

  // Default homepage
  if (currentPage === "") currentPage = "index.html";

  navLinks.forEach(link => {
    let href = link.getAttribute("href");

    // Remove ".html" to compare
    let hrefPage = href.replace(".html", "");

    // Compare last path segment
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
