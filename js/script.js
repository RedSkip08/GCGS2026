// script.js
const toggle = document.getElementById('menu-toggle');
const nav = document.getElementById('nav-menu');

toggle.addEventListener('click', () => {
    nav.classList.toggle('show');
});


document.addEventListener("DOMContentLoaded", () => {
    const navLinks = document.querySelectorAll("nav a");
    let path = window.location.pathname;  // e.g., "/" or "/schedule/"

    // Remove trailing slash
    if(path.endsWith('/')) path = path.slice(0, -1);

    // Get last part of path
    let currentPage = path.split("/").pop();

    // If homepage
    if(currentPage === "") currentPage = "index.html";

    navLinks.forEach(link => {
        let href = link.getAttribute("href");  // e.g., "schedule.html"

        // Remove ".html" to compare with pretty URL
        let hrefPage = href.replace(".html", "");

        // Compare last path segment
        if(hrefPage === currentPage || (currentPage === "index.html" && href === "index.html")) {
            link.classList.add("active");
        } else {
            link.classList.remove("active");
        }
    });
});
