package main

import (
	"domain_centric_microservice/infrastructure/logger"
	http_interface "domain_centric_microservice/interfaces/http"
	"fmt"
	"net/http"
)

func main() {
	// Initialize logger
	appLogger := logger.NewPrettyLogger("APP", logger.LevelDebug, true)

	// Create router
	router := http_interface.NewRouter(appLogger)

	// Start server
	appLogger.Info("SERVER_START", map[string]interface{}{
		"port": 8080,
	}, "Starting server")

	fmt.Println("Server starting on :8080")
	if err := http.ListenAndServe(":8080", router); err != nil {
		appLogger.Critical("SERVER_ERROR", map[string]interface{}{
			"error": err,
		}, "Failed to start server")
	}
}
