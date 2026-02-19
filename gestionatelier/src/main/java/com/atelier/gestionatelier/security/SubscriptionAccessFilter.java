package com.atelier.gestionatelier.security;

import com.atelier.gestionatelier.entities.Utilisateur;
import com.atelier.gestionatelier.services.SubscriptionPaymentService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Component
public class SubscriptionAccessFilter extends OncePerRequestFilter {

    private final SubscriptionPaymentService subscriptionPaymentService;

    @Value("${app.subscription.enforcement-enabled:true}")
    private boolean enforcementEnabled;

    public SubscriptionAccessFilter(SubscriptionPaymentService subscriptionPaymentService) {
        this.subscriptionPaymentService = subscriptionPaymentService;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (uri == null) return true;
        if (!uri.startsWith("/api/")) return true;

        return uri.startsWith("/api/auth/")
                || uri.startsWith("/api/public/")
                || uri.startsWith("/api/uploads/")
                || uri.startsWith("/api/subscription/")
                || uri.startsWith("/api/admin/subscriptions/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if (!enforcementEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            filterChain.doFilter(request, response);
            return;
        }

        Utilisateur user = subscriptionPaymentService.getCurrentUserOrNull(auth.getName());
        if (user == null || user.getAtelier() == null) {
            filterChain.doFilter(request, response);
            return;
        }

        if (subscriptionPaymentService.isSuperAdmin(user)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            var current = subscriptionPaymentService.getCurrentForUser(user);
            boolean blocked = current.get("blocked") instanceof Boolean && (Boolean) current.get("blocked");
            if (blocked) {
                response.setStatus(402);
                response.setContentType("application/json;charset=UTF-8");
                Map<String, Object> body = new HashMap<>();
                body.put("error", "Abonnement expiré");
                body.put("message", "Votre abonnement a expiré. Veuillez renouveler pour continuer.");
                body.put("path", request.getRequestURI());
                new ObjectMapper().writeValue(response.getWriter(), body);
                return;
            }
        } catch (Exception ignored) {
            // Si le module abonnement est indisponible, on garde le comportement legacy.
        }

        filterChain.doFilter(request, response);
    }
}
