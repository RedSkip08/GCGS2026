const form = document.getElementById("regForm");
const successBox = document.getElementById("successBox");
const errorBox = document.getElementById("errorBox");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  successBox.style.display = "none";
  errorBox.style.display = "none";

  const data = {
    name: document.getElementById("name").value,
    email: document.getElementById("email").value,
    attend: document.getElementById("attend").value,
    abstract: document.getElementById("abstract").value,
    affliation: document.getElementById("affliation").value,
    message: document.getElementById("message").value
  };

  try {
    // relative URL for compatibility
    const res = await fetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      successBox.style.display = "block";
      form.reset();
    } else {
      errorBox.style.display = "block";
    }
  } catch (err) {
    errorBox.style.display = "block";
  }
});
