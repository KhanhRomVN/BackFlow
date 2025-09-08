package http_interface

import (
	"domain_centric_microservice/infrastructure/logger"
	"domain_centric_microservice/interfaces/http/handlers"
	"domain_centric_microservice/interfaces/http/middleware"
	"net/http"
)

func NewRouter(log *logger.PrettyLogger) http.Handler {
	testHandler := &handlers.TestHandler{Logger: log}

	mux := http.NewServeMux()
	mux.Handle("/test", testHandler)

	// Apply middleware
	handler := middleware.LoggingMiddleware(log)(mux)

	return handler
}
