package com.atelier.gestionatelier.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MesureSchemaInitializer implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(MesureSchemaInitializer.class);

    private final JdbcTemplate jdbcTemplate;

    public MesureSchemaInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        try {
            jdbcTemplate.execute("ALTER TABLE mesures ALTER COLUMN prix DROP NOT NULL");
            logger.info("Colonne mesures.prix rendue optionnelle");
        } catch (Exception ex) {
            logger.warn("Impossible d'assouplir la colonne mesures.prix : {}", ex.getMessage());
        }
    }
}