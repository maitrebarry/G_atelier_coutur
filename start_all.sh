#!/bin/bash
# script to start both backend (Spring Boot) and React frontend for G_atelier_coutur

terr=$(pwd)

# backend
(cd "${terr}/gestionatelier" && ./mvnw spring-boot:run) &
backend_pid=$!

echo "Backend démarré (PID $backend_pid)"

# frontend
(cd "${terr}/react-frontend" && npm start) &
frontend_pid=$!

echo "Frontend démarré (PID $frontend_pid)"

# Wait for both processes
wait $backend_pid $frontend_pid
