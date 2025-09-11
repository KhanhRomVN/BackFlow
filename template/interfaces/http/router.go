// FILE: template/interfaces/http/router.go

package http_interface

import (
	"net/http"
	"template/infrastructure/logger"
	"template/interfaces/http/handlers"
	"template/interfaces/http/middleware"
)

// NewRouter creates and configures the main HTTP router
// @function NewRouter
// @package template/interfaces/http
// @params log *logger.PrettyLogger - Logger instance
// @returns http.Handler - Configured HTTP handler
// @router-factory true
// @http-router true
// @routes /test
// @ast-trackable true
func NewRouter(log *logger.PrettyLogger) http.Handler {
	testHandler := &handlers.TestHandler{Logger: log}

	mux := http.NewServeMux()
	mux.Handle("/test", testHandler)

	handler := middleware.LoggingMiddleware(log)(mux)

	return handler
}
