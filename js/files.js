// files.js
document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.getElementById("files-list");

  fetch("/api/submissions")
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized or server error");
      return res.json();
    })
    .then(submissions => {
      if (!submissions.length) {
        tableBody.innerHTML = `<tr><td colspan="2">No submissions yet.</td></tr>`;
        return;
      }

      submissions.forEach(sub => {
        const tr = document.createElement("tr");

        // Metadata column
        const metadataTd = document.createElement("td");
        const metadataLink = document.createElement("a");
        metadataLink.href = `/uploads/${sub.metadataFile}`;
        metadataLink.textContent = "View Metadata";
        metadataLink.target = "_blank";
        metadataTd.appendChild(metadataLink);

        // File column
        const fileTd = document.createElement("td");
        const fileLink = document.createElement("a");
        fileLink.href = `/uploads/${sub.uploadedFile}`;
        fileLink.textContent = sub.originalFile || "Download File";
        fileLink.target = "_blank";
        fileTd.appendChild(fileLink);

        tr.appendChild(metadataTd);
        tr.appendChild(fileTd);
        tableBody.appendChild(tr);
      });
    })
    .catch(err => {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="2">Failed to load submissions.</td></tr>`;
    });
});
