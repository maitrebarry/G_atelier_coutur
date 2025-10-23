package com.atelier.gestionatelier.dto;

import org.springframework.web.multipart.MultipartFile;

import java.io.Serializable;
import java.util.UUID;

public class ClientDTO implements Serializable {

    private static final long serialVersionUID = 1L;

    private String nom;
    private String prenom;
    private String contact;
    private String adresse;
    private String sexe;
    private String genderPreview;
    private String femme_type;

    // Fichier photo
    private MultipartFile photo;
    private String robe_epaule;
    private String robe_manche;
    private String robe_poitrine;
    private String robe_taille;
    private String robe_longueur;
    private String robe_fesse;
    private String robe_tour_manche;
    private String robe_longueur_poitrine;
    private String robe_longueur_taille;
    private String robe_longueur_fesse;

    // Jupe
    private String jupe_epaule;
    private String jupe_manche;
    private String jupe_poitrine;
    private String jupe_taille;
    private String jupe_longueur;
    private String jupe_longueur_jupe;
    private String jupe_ceinture;
    private String jupe_fesse;
    private String jupe_tour_manche;
    private String jupe_longueur_poitrine;
    private String jupe_longueur_taille;
    private String jupe_longueur_fesse;

    // Homme
    private String homme_epaule;
    private String homme_manche;
    private String homme_longueur;
    private String homme_longueur_pantalon;
    private String homme_ceinture;
    private String homme_cuisse;
    private String homme_poitrine;
    private String homme_corps;
    private String homme_tour_manche;

    private UUID atelierId;

    public UUID getAtelierId() {
        return atelierId;
    }

    public void setAtelierId(UUID atelierId) {
        this.atelierId = atelierId;
    }


     public static long getSerialversionuid() {
        return serialVersionUID;
    }
    public String getNom() {
        return nom;
    }
    public void setNom(String nom) {
        this.nom = nom;
    }
    public String getPrenom() {
        return prenom;
    }
    public void setPrenom(String prenom) {
        this.prenom = prenom;
    }
    public String getContact() {
        return contact;
    }
    public void setContact(String contact) {
        this.contact = contact;
    }
    public String getAdresse() {
        return adresse;
    }
    public void setAdresse(String adresse) {
        this.adresse = adresse;
    }
    public String getSexe() {
        return sexe;
    }
    public void setSexe(String sexe) {
        this.sexe = sexe;
    }
    public MultipartFile getPhoto() {
        return photo;
    }
    public void setPhoto(MultipartFile photo) {
        this.photo = photo;
    }
    public String getFemme_type() {
        return femme_type;
    }
    public void setFemme_type(String femme_type) {
        this.femme_type = femme_type;
    }
    public String getGenderPreview() {
        return genderPreview;
    }
    public void setGenderPreview(String genderPreview) {
        this.genderPreview = genderPreview;
    }
    public String getRobe_epaule() {
        return robe_epaule;
    }
    public void setRobe_epaule(String robe_epaule) {
        this.robe_epaule = robe_epaule;
    }
    public String getRobe_manche() {
        return robe_manche;
    }
    public void setRobe_manche(String robe_manche) {
        this.robe_manche = robe_manche;
    }
    public String getRobe_poitrine() {
        return robe_poitrine;
    }
    public void setRobe_poitrine(String robe_poitrine) {
        this.robe_poitrine = robe_poitrine;
    }
    public String getRobe_taille() {
        return robe_taille;
    }
    public void setRobe_taille(String robe_taille) {
        this.robe_taille = robe_taille;
    }
    public String getRobe_longueur() {
        return robe_longueur;
    }
    public void setRobe_longueur(String robe_longueur) {
        this.robe_longueur = robe_longueur;
    }
    public String getRobe_fesse() {
        return robe_fesse;
    }
    public void setRobe_fesse(String robe_fesse) {
        this.robe_fesse = robe_fesse;
    }
    public String getRobe_tour_manche() {
        return robe_tour_manche;
    }
    public void setRobe_tour_manche(String robe_tour_manche) {
        this.robe_tour_manche = robe_tour_manche;
    }
    public String getRobe_longueur_poitrine() {
        return robe_longueur_poitrine;
    }
    public void setRobe_longueur_poitrine(String robe_longueur_poitrine) {
        this.robe_longueur_poitrine = robe_longueur_poitrine;
    }
    public String getRobe_longueur_taille() {
        return robe_longueur_taille;
    }
    public void setRobe_longueur_taille(String robe_longueur_taille) {
        this.robe_longueur_taille = robe_longueur_taille;
    }
    public String getRobe_longueur_fesse() {
        return robe_longueur_fesse;
    }
    public void setRobe_longueur_fesse(String robe_longueur_fesse) {
        this.robe_longueur_fesse = robe_longueur_fesse;
    }
    public String getJupe_epaule() {
        return jupe_epaule;
    }
    public void setJupe_epaule(String jupe_epaule) {
        this.jupe_epaule = jupe_epaule;
    }
    public String getJupe_manche() {
        return jupe_manche;
    }
    public void setJupe_manche(String jupe_manche) {
        this.jupe_manche = jupe_manche;
    }
    public String getJupe_poitrine() {
        return jupe_poitrine;
    }
    public void setJupe_poitrine(String jupe_poitrine) {
        this.jupe_poitrine = jupe_poitrine;
    }
    public String getJupe_taille() {
        return jupe_taille;
    }
    public void setJupe_taille(String jupe_taille) {
        this.jupe_taille = jupe_taille;
    }
    public String getJupe_longueur() {
        return jupe_longueur;
    }
    public void setJupe_longueur(String jupe_longueur) {
        this.jupe_longueur = jupe_longueur;
    }
    public String getJupe_longueur_jupe() {
        return jupe_longueur_jupe;
    }
    public void setJupe_longueur_jupe(String jupe_longueur_jupe) {
        this.jupe_longueur_jupe = jupe_longueur_jupe;
    }
    public String getJupe_ceinture() {
        return jupe_ceinture;
    }
    public void setJupe_ceinture(String jupe_ceinture) {
        this.jupe_ceinture = jupe_ceinture;
    }
    public String getJupe_fesse() {
        return jupe_fesse;
    }
    public void setJupe_fesse(String jupe_fesse) {
        this.jupe_fesse = jupe_fesse;
    }
    public String getJupe_tour_manche() {
        return jupe_tour_manche;
    }
    public void setJupe_tour_manche(String jupe_tour_manche) {
        this.jupe_tour_manche = jupe_tour_manche;
    }
    public String getJupe_longueur_poitrine() {
        return jupe_longueur_poitrine;
    }
    public void setJupe_longueur_poitrine(String jupe_longueur_poitrine) {
        this.jupe_longueur_poitrine = jupe_longueur_poitrine;
    }
    public String getJupe_longueur_taille() {
        return jupe_longueur_taille;
    }
    public void setJupe_longueur_taille(String jupe_longueur_taille) {
        this.jupe_longueur_taille = jupe_longueur_taille;
    }
    public String getJupe_longueur_fesse() {
        return jupe_longueur_fesse;
    }
    public void setJupe_longueur_fesse(String jupe_longueur_fesse) {
        this.jupe_longueur_fesse = jupe_longueur_fesse;
    }
    public String getHomme_epaule() {
        return homme_epaule;
    }
    public void setHomme_epaule(String homme_epaule) {
        this.homme_epaule = homme_epaule;
    }
    public String getHomme_manche() {
        return homme_manche;
    }
    public void setHomme_manche(String homme_manche) {
        this.homme_manche = homme_manche;
    }
    public String getHomme_longueur() {
        return homme_longueur;
    }
    public void setHomme_longueur(String homme_longueur) {
        this.homme_longueur = homme_longueur;
    }
    public String getHomme_longueur_pantalon() {
        return homme_longueur_pantalon;
    }
    public void setHomme_longueur_pantalon(String homme_longueur_pantalon) {
        this.homme_longueur_pantalon = homme_longueur_pantalon;
    }
    public String getHomme_ceinture() {
        return homme_ceinture;
    }
    public void setHomme_ceinture(String homme_ceinture) {
        this.homme_ceinture = homme_ceinture;
    }
    public String getHomme_cuisse() {
        return homme_cuisse;
    }
    public void setHomme_cuisse(String homme_cuisse) {
        this.homme_cuisse = homme_cuisse;
    }
    public String getHomme_poitrine() {
        return homme_poitrine;
    }
    public void setHomme_poitrine(String homme_poitrine) {
        this.homme_poitrine = homme_poitrine;
    }
    public String getHomme_corps() {
        return homme_corps;
    }
    public void setHomme_corps(String homme_corps) {
        this.homme_corps = homme_corps;
    }
    public String getHomme_tour_manche() {
        return homme_tour_manche;
    }
  // Pour la modification (formulaire edit)
    private String femme_type_edit;  // "robe" ou "jupe"
    // Ajoutez les getters et setters correspondants
    public String getFemme_type_edit() {
        return femme_type_edit;
    }

    public void setFemme_type_edit(String femme_type_edit) {
        this.femme_type_edit = femme_type_edit;
    }



    private String existing_photo;  

    // Getter et Setter pour existing_photo
    public String getExisting_photo() {
        return existing_photo;
    }

    public void setExisting_photo(String existing_photo) {
        this.existing_photo = existing_photo;
    }

    // NOUVEAU : Prix du modèle
    private String prix;

    // Getters et setters pour le prix
    public String getPrix() {
        return prix;
    }

    public void setPrix(String prix) {
        this.prix = prix;
    }

    // Méthode utilitaire pour convertir en Double
    public Double getPrixAsDouble() {
        if (prix == null || prix.trim().isEmpty()) {
            return null;
        }
        try {
            return Double.parseDouble(prix.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
}


