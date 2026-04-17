package com.atelier.gestionatelier.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class MesureDTO {
	private UUID id;
	private LocalDateTime dateMesure;
	private String typeVetement;
	private String modeleNom;
	private UUID modeleReferenceId;
	private Double prix;
	private String description;
	private String sexe;
	private String photoPath;
	private String habitPhotoPath;

	private Double epaule;
	private Double manche;
	private Double poitrine;
	private Double taille;
	private Double longueur;
	private Double fesse;
	private Double tourManche;
	private Double longueurPoitrine;
	private Double longueurTaille;
	private Double longueurFesse;

	private Double longueurJupe;
	private Double ceinture;
	private Double longueurPoitrineRobe;
	private Double longueurTailleRobe;
	private Double longueurFesseRobe;
	private Double longueurPantalon;
	private Double cuisse;
	private Double corps;
}
