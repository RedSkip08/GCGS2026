document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  const errorBox = document.getElementById("errorBox");

  if (!form) return;

  // Hiding error box
  if (errorBox) errorBox.style.display = "none";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorBox) errorBox.style.display = "none";

    // Matching HTML IDs:
    const data = {
      name: document.getElementById("name")?.value?.trim() || "",
      email: document.getElementById("email")?.value?.trim() || "",
      abstract: document.getElementById("abstract")?.value || "",
      affiliation: document.getElementById("affiliation")?.value?.trim() || "",
      message: document.getElementById("message")?.value?.trim() || "",
    };

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = await res.json().catch(() => ({}));

      if (res.ok && payload.success) {
        window.location.assign(payload.redirectTo || "/registrationcomplete");
        return;
      }

      if (errorBox) errorBox.style.display = "block";
    } catch (err) {
      if (errorBox) errorBox.style.display = "block";
    }
  });
});