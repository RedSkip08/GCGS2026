document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.getElementById("files-list");

  try {
    const res = await fetch("/api/submissions");
    if (!res.ok) throw new Error("Failed to fetch submissions");

    const submissions = await res.json();

    submissions.forEach(sub => {
      const tr = document.createElement("tr");

      // Metadata column
      const metadataTd = document.createElement("td");
      const metadataLink = document.createElement("a");
      metadataLink.href = `/metadata/${sub.metadataFile}`;
      metadataLink.textContent = "Download Metadata";
      metadataLink.target = "_blank";
      metadataTd.appendChild(metadataLink);

      // Uploaded file column
      const fileTd = document.createElement("td");
      const uploadedLink = document.createElement("a");
      uploadedLink.href = `/download/${sub.uploadedFile}`;
      uploadedLink.textContent = "Download File";
      uploadedLink.target = "_blank";
      fileTd.appendChild(uploadedLink);

      tr.appendChild(metadataTd);
      tr.appendChild(fileTd);
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="2">Failed to load submissions</td></tr>`;
  }
});

// ===== Mobile Menu Toggle =====
const menuToggle = document.getElementById('menu-toggle');
const navMenu = document.getElementById('nav-menu');

if (menuToggle && navMenu) {
  menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('show');
    menuToggle.classList.toggle('open'); // optional for hamburger animation
  });
}

