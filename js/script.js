// script.js

document.addEventListener("DOMContentLoaded", () => {
  // ===== Mobile Menu Toggle =====
  
  const menuToggle = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if(menuToggle) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('show');
    });
  }

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

document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#files-list");

  try {
    const response = await fetch("/api/submissions", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Failed to fetch submissions");

    const submissions = await response.json();
    tbody.innerHTML = ""; // clear table

    submissions.forEach(sub => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${sub.firstName}</td>
        <td>${sub.middleName}</td>
        <td>${sub.lastName}</td>
        <td>${sub.affiliation}</td>
        <td>${sub.degreeProgram}</td>
        <td>${sub.paperTitle}</td>
        <td>${sub.keyword}</td>
        <td>${sub.email}</td>
        <td>${new Date(sub.timestamp).toLocaleString()}</td>
        <td><a href="/uploads/${sub.fileName}" target="_blank">Download</a></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="10">Failed to load submissions. Are you logged in?</td></tr>`;
  }
});
