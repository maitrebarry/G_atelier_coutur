// FormulaireAffectationDataDTO.java
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.List;

@Data
public class FormulaireAffectationDataDTO {
    private List<TailleurDTO> tailleurs;
    private List<ClientAvecMesuresValideesDTO> clients;
}