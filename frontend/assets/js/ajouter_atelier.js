document.addEventListener("DOMContentLoaded", function () {
  const form = document.querySelector("#ajouterAtelierModal form");

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const formData = {
      nom: document.getElementById("nomAtelier").value.trim(),
      adresse: document.getElementById("adresseAtelier").value.trim(),
      telephone: document.getElementById("telephoneAtelier").value.trim(),
      dateCreation: document.getElementById("dateCreationAtelier").value
        ? new Date(
            document.getElementById("dateCreationAtelier").value
          ).toISOString()
        : null,
    };

    try {
      const response = await fetch("http://localhost:8080/api/ateliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        // Succès avec SweetAlert
        Swal.fire({
          icon: "success",
          title: "Succès!",
          text: "Atelier créé avec succès!",
          confirmButtonColor: "#3085d6",
          confirmButtonText: "OK",
        }).then(() => {
          form.reset();
          $("#ajouterAtelierModal").modal("hide");

          if (typeof loadAteliers === "function") {
            loadAteliers();
          }
        });
      } else {
        // Erreur avec SweetAlert
        Swal.fire({
          icon: "error",
          title: "Erreur!",
          text: result.error || "Erreur lors de la création",
          confirmButtonColor: "#d33",
          confirmButtonText: "OK",
        });
      }
    } catch (error) {
      console.error("Erreur:", error);
      // Erreur réseau avec SweetAlert
      Swal.fire({
        icon: "error",
        title: "Erreur de connexion!",
        text: "Impossible de se connecter au serveur",
        confirmButtonColor: "#d33",
        confirmButtonText: "OK",
      });
    }
  });

  // Fermeture du modal -> reset du formulaire
  $("#ajouterAtelierModal").on("hidden.bs.modal", function () {
    form.reset();
  });
});
