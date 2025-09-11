// FILE: template/interfaces/http/middleware/logging.go

package middleware

import (
	"net/http"
	"template/infrastructure/logger"
	"time"
)

// LoggingMiddleware creates a middleware for HTTP request logging
// @function LoggingMiddleware
// @package template/interfaces/http/middleware
// @params log *logger.PrettyLogger - Logger instance
// @returns func(http.Handler) http.Handler - Middleware function
// @middleware true
// @http-middleware true
// @ast-trackable true
func LoggingMiddleware(log *logger.PrettyLogger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			duration := time.Since(start)

			log.Info("HTTP_REQUEST", map[string]interface{}{
				"method":   r.Method,
				"path":     r.URL.Path,
				"duration": duration.String(),
			}, "Request processed")
		})
	}
}
