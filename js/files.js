document.addEventListener("DOMContentLoaded", async () => {
  const tbody = document.querySelector("#files-list"); // matches your HTML

  try {
    const response = await fetch("/api/submissions", { credentials: "same-origin" });
    if (!response.ok) throw new Error("Unauthorized or failed to fetch submissions");

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
