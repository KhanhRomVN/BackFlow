// FILE: template/cmd/server/main.go

package main

import (
	"fmt"
	"net/http"
	"template/infrastructure/logger"
	http_interface "template/interfaces/http"
)

// main is the application entry point
// @function main
// @package main
// @entry-point true
// @server-start true
// @port 8080
// @ast-trackable true
func main() {
	appLogger := logger.NewPrettyLogger("APP", logger.LevelDebug, true)

	router := http_interface.NewRouter(appLogger)

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
