document.querySelectorAll(".btn-modifier").forEach((btn) => {
  btn.addEventListener("click", async (e) => {
    const clientId = e.currentTarget.getAttribute("data-id");
    try {
      // const res = await fetch(`http://localhost:8080/api/clients/${clientId}`);
      const token =
        localStorage.getItem("authToken") ||
        sessionStorage.getItem("authToken");

      const res = await fetch(`http://localhost:8081/api/clients/${clientId}`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Erreur HTTP " + res.status);
      const client = await res.json();

      // Infos client
      document.getElementById("editClientId").value = client.id;
      document.getElementById("editPrenom").value = client.prenom || "";
      document.getElementById("editNom").value = client.nom || "";
      document.getElementById("editContact").value = client.contact || "";
      document.getElementById("editAdresse").value = client.adresse || "";

      if (client.mesures && client.mesures.length > 0) {
        const m = client.mesures[0];
        document.getElementById("editMesureId").value = m.id;
        document.getElementById("editTypeVetement").value =
          m.typeVetement || "";
        document.getElementById("editSexe").value = m.sexe || "";
        document.getElementById("editEpaule").value = m.epaule || "";
        document.getElementById("editManche").value = m.manche || "";
        document.getElementById("editPoitrine").value = m.poitrine || "";
        document.getElementById("editTaille").value = m.taille || "";
        document.getElementById("editLongueur").value = m.longueur || "";
        document.getElementById("editFesse").value = m.fesse || "";
        document.getElementById("editTourManche").value = m.tourManche || "";
        document.getElementById("editLongueurPoitrine").value =
          m.longueurPoitrine || "";
        document.getElementById("editLongueurTaille").value =
          m.longueurTaille || "";
        document.getElementById("editLongueurFesse").value =
          m.longueurFesse || "";
        document.getElementById("editLongueurJupe").value =
          m.longueurJupe || "";
        document.getElementById("editCeinture").value = m.ceinture || "";
        document.getElementById("editLongueurPoitrineRobe").value =
          m.longueurPoitrineRobe || "";
        document.getElementById("editLongueurTailleRobe").value =
          m.longueurTailleRobe || "";
        document.getElementById("editLongueurFesseRobe").value =
          m.longueurFesseRobe || "";
        document.getElementById("editLongueurPantalon").value =
          m.longueurPantalon || "";
        document.getElementById("editCuisse").value = m.cuisse || "";
        document.getElementById("editCorps").value = m.corps || "";

        // Photo
        let photoPath = m.photoPath ? m.photoPath.replace(/^\/+/, "") : "";
        if (photoPath.startsWith("model_photo/")) {
          photoPath = photoPath.substring("model_photo/".length);
        }
        document.getElementById("editPhotoPreview").src = photoPath
          ? `http://localhost:8081/model_photo/${photoPath}`
          : "default_femme.png";
      } else {
        document.getElementById("editMesureId").value = "";
      }

      new bootstrap.Modal(document.getElementById("editModal")).show();
    } catch (err) {
      console.error("Erreur récupération client :", err);
    }
  });
});
