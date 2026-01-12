// Footer year
document.getElementById("year").textContent = new Date().getFullYear();

// Mobile hamburger toggle
const hamburger = document.querySelector(".hamburger");
const navLinks = document.querySelector(".nav-links");
hamburger?.addEventListener("click", () => {
  navLinks.classList.toggle("open");
});
