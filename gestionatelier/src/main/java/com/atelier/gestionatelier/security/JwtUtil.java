package com.atelier.gestionatelier.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Component
public class JwtUtil {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private long jwtExpirationMs;
    
    private final Set<String> blacklistedTokens = new HashSet<>();

    private SecretKey getSigningKey() {
        if (jwtSecret.length() < 32) {
            throw new IllegalArgumentException("La clé JWT doit faire au moins 32 caractères");
        }
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    public String generateToken(Authentication authentication) {
        String username = authentication.getName();
        
        return Jwts.builder()
                .setSubject(username)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // NOUVELLE METHODE pour générer un token avec atelierId (UUID)
    public String generateToken(String username, UUID atelierId) {
        return Jwts.builder()
                .setSubject(username)
                .claim("atelierId", atelierId != null ? atelierId.toString() : null)
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public String extractUsername(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // NOUVELLE METHODE pour extraire l'atelierId (UUID)
    public UUID extractAtelierId(String token) {
        Claims claims = Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        
        String atelierIdStr = claims.get("atelierId", String.class);
        return atelierIdStr != null ? UUID.fromString(atelierIdStr) : null;
    }

    public boolean validateToken(String token) {
        try {
            // Vérifier si le token est blacklisté
            if (blacklistedTokens.contains(token)) {
                return false;
            }
            
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
    
    public void invalidateToken(String token) {
        blacklistedTokens.add(token);
    }
    
    public Date extractExpiration(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody()
                .getExpiration();
    }
}