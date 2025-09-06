// delete_client.js
document.addEventListener("DOMContentLoaded", function () {
  // Initialisation des listeners de suppression
  initDeleteButtons();
});

function initDeleteButtons() {
  document.querySelectorAll(".btn-supprimer").forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const clientId = this.getAttribute("data-id");
      confirmAndDelete(clientId);
    });
  });
}

function confirmAndDelete(clientId) {
  Swal.fire({
    title: "Confirmation de suppression",
    text: "Êtes-vous sûr de vouloir supprimer ce client et toutes ses mesures?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#d33",
    cancelButtonColor: "#3085d6",
    confirmButtonText: "Oui, supprimer",
    cancelButtonText: "Annuler",
    backdrop: `
            rgba(0,0,0,0.7)
            url("/images/trash.gif")
            left top
            no-repeat
        `,
  }).then((result) => {
    if (result.isConfirmed) {
      deleteClient(clientId);
    }
  });
}
function deleteClient(clientId) {
  fetch(`http://localhost:8080/api/clients/${clientId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  })
    .then((response) => {
      if (!response.ok) {
        return response.json().then((err) => {
          throw new Error(err.message || "Erreur lors de la suppression");
        });
      }
      return response.json();
    })
    .then((data) => {
      if (data.status === "success") {
        // Afficher notification de succès
        Swal.fire({
          icon: "success",
          title: "Succès",
          text: data.message,
          timer: 2000,
        });
        // Recharger la liste ou supprimer l'élément du DOM
        setTimeout(() => window.location.reload(), 2000);
      }
    })
    .catch((error) => {
      console.error("Erreur:", error);
      Swal.fire({
        icon: "error",
        title: "Erreur",
        text: error.message || "Une erreur est survenue",
      });
    });
}

// Export pour pouvoir l'utiliser ailleurs
window.confirmAndDelete = confirmAndDelete;
