//  - Pour les réponses paginées
package com.atelier.gestionatelier.dto;

import lombok.Data;
import java.util.List;

@Data
public class PageResponseDTO<T> {
    private List<T> content;
    private int currentPage;
    private int totalPages;
    private long totalElements;
    private int pageSize;
    private boolean first;
    private boolean last;

    public PageResponseDTO(List<T> content, int currentPage, int totalPages, long totalElements, int pageSize) {
        this.content = content;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
        this.pageSize = pageSize;
        this.first = currentPage == 0;
        this.last = currentPage == totalPages - 1 || totalPages == 0;
    }
}