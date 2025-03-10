document.addEventListener("DOMContentLoaded", () => {
  const resetModal = () => {
    document.querySelector(".main-menu").style.display = "block";
    document
      .querySelectorAll(".sub-menu")
      .forEach((menu) => (menu.style.display = "none"));
  };

  const roomModal = document.getElementById("roomControlModal");
  roomModal.addEventListener("shown.bs.modal", resetModal);
  roomModal.addEventListener("hidden.bs.modal", resetModal);

  // submenus
  document.querySelectorAll(".modal-menu-button").forEach((button) => {
    button.addEventListener("click", (e) => {
      const target = e.currentTarget.dataset.target;
      document.querySelector(".main-menu").style.display = "none";
      document
        .querySelectorAll(".sub-menu")
        .forEach((menu) => (menu.style.display = "none"));
      document.getElementById(target).style.display = "block";
    });
  });

  //close window
  document.querySelectorAll(".btn-back").forEach((button) => {
    button.addEventListener("click", resetModal);
  });

  // Fall alert Logic
  //TODO: add logic for determing what room made the fall alert (later)
  const fallAlertButton = document.getElementById("fallAlertButton");
  const fallAlertMessage = document.getElementById("fallAlertMessage");

  fallAlertButton.addEventListener("click", () => {
    // Show the alert
    fallAlertMessage.style.display = "block";
    fallAlertMessage.classList.add("show");

    // Auto-dismiss after 1.5 seconds
    setTimeout(() => {
      fallAlertMessage.classList.remove("show");
    }, 5000);
  });

    // IT Alert Logic
const itHelpButton = document.getElementById("itHelpButton");
const itHelpmsg = document.getElementById("itHelpmsg");

itHelpButton.addEventListener("click", () => {
  itHelpmsg.style.display = "block";
  itHelpmsg.classList.add("show");

  
  setTimeout(() => {
    itHelpmsg.classList.remove("show");

    setTimeout(() => {
      itHelpmsg.style.display = "none";//remove the alert

      //reshrink the modal
      //TODO: add this to the fall alert
      const modalBody = itHelpmsg.closest(".modal-body");
      modalBody.style.transition = "height 0.3s ease";
      modalBody.style.height = `${modalBody.scrollHeight}px`; 
      setTimeout(() => {
        modalBody.style.height = "auto"; 
      }, 10); 
    }, 300); 
  }, 5000); //
});



});



// thermometer buttons
document.querySelectorAll(".plus-btn, .minus-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const display = document.querySelector(".temperature-display");
    const mercury = document.querySelector(".tinner");
    let temp = parseInt(display.textContent);

    if (e.target.closest(".plus-btn") && temp < 30) temp++;
    if (e.target.closest(".minus-btn") && temp > 0) temp--;

    display.textContent = `${temp}°C`;
    mercury.style.height = `${(temp / 30) * 100}%`;
  });
});
