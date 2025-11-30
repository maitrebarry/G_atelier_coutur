package com.atelier.gestionatelier;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GestionatelierApplication {

	public static void main(String[] args) {
		SpringApplication.run(GestionatelierApplication.class, args);
		// System.out.println("Hello World");					
	}
	

}
