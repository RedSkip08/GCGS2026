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

  // ===== Load Submissions =====
  const tbody = document.querySelector("#files-list");
  if (!tbody) return;

  try {
    const response = await fetch("/api/submissions", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Failed to fetch submissions");

    const submissions = await response.json();
    tbody.innerHTML = ""; // clear table

    submissions.forEach(sub => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><a href="/metadata/${sub.metadataFile}" target="_blank">Metadata</a></td>
        <td><a href="/download/${sub.uploadedFile}" target="_blank">File</a></td>
      `;
      tbody.appendChild(row);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2">Failed to load submissions. Are you logged in?</td></tr>`;
  }
});

// ==== active link ====
document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname.replace(/^\/|\/$/g, ""); // remove leading/trailing slashes
  const links = document.querySelectorAll("#nav-menu a");

  links.forEach(link => {
    const href = link.getAttribute("href").replace(/^\/|\/$/g, "");
    if (currentPath === href || (currentPath === "" && href === "home")) {
      link.classList.add("active");
    }
  });
});

// ==== files size error ====
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('upload-form');
  const fileInput = document.getElementById('abstractFile');
  const submissionMessage = document.getElementById('submissionMessage');

  form.addEventListener('submit', (e) => {
    const file = fileInput.files[0];

    if (!file) return; // no file selected

    const maxSize = 1 * 1024 * 1024; // 1MB in bytes
    if (file.size > maxSize) {
      e.preventDefault(); // stop form submission
      submissionMessage.textContent = `Error: File "${file.name}" exceeds 1MB limit!`;
      submissionMessage.style.cssText = 'color: red; font-weight: bold;';
      fileInput.value = ''; // reset file input
    } else {
      submissionMessage.textContent = ''; // clear previous error
    }
  });
});



