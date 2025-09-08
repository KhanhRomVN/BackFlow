package middleware

import (
	"domain_centric_microservice/infrastructure/logger"
	"net/http"
	"time"
)

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
