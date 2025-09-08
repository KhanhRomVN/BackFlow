package handlers

import (
	"domain_centric_microservice/infrastructure/logger"
	"encoding/json"
	"net/http"
)

type TestHandler struct {
	Logger *logger.PrettyLogger
}

func (h *TestHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	h.Logger.Info("TEST_HANDLER", map[string]interface{}{
		"method": r.Method,
		"path":   r.URL.Path,
	}, "Test handler called")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message": "Hello world!",
	})
}
