document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("regForm");
  if (!form) return;

  const errorBox = document.getElementById("errorBox");
  const successBox = document.getElementById("successBox");
  const submissionMessage = document.getElementById("submissionMessage");

  // hidden error
  if (errorBox) errorBox.style.display = "none";
  if (successBox) successBox.style.display = "none";
  if (submissionMessage) submissionMessage.textContent = "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Reset UI
    if (errorBox) errorBox.style.display = "none";
    if (successBox) successBox.style.display = "none";
    if (submissionMessage) submissionMessage.textContent = "";

    // Collect values
    const payload = {
      name: document.getElementById("name")?.value?.trim() || "",
      email: document.getElementById("email")?.value?.trim() || "",
      abstract: document.getElementById("abstract")?.value || "",
      affiliation: document.getElementById("affiliation")?.value?.trim() || "",
      message: document.getElementById("message")?.value?.trim() || "",
    };

    // Optional: basic validation
    if (!payload.name || !payload.email || !payload.abstract || !payload.affiliation) {
      if (errorBox) {
        errorBox.textContent = "Please fill in all required fields.";
        errorBox.style.display = "block";
      }
      return;
    }

    try {
      const res = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Treat any 2xx as success
      if (res.ok) {
        // Redirect to confirmation page
        window.location.assign("/registrationcomplete");
        return;
      }

      // Try to show something helpful if server sends text/json
      let msg = "There was an error, please try again!";
      const ct = res.headers.get("content-type") || "";
      try {
        if (ct.includes("application/json")) {
          const data = await res.json();
          if (data?.error) msg = data.error;
        } else {
          const text = await res.text();
          if (text && text.length < 200) msg = text;
        }
      } catch (_) {}

      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.style.display = "block";
      }
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = "Network error. Please check your connection and try again.";
        errorBox.style.display = "block";
      }
    }
  });
});
