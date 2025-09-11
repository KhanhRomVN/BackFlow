// FILE: template/interfaces/http/handlers/test_handler.go

package handlers

import (
	"encoding/json"
	"net/http"
	"template/infrastructure/logger"
)

// TestHandler handles test endpoint requests
// @struct TestHandler
// @package template/interfaces/http/handlers
// @fields Logger
// @http-handler true
// @endpoint /test
// @ast-trackable true
type TestHandler struct {
	Logger *logger.PrettyLogger
}

// ServeHTTP implements the http.Handler interface for test endpoint
// @method ServeHTTP
// @receiver *TestHandler
// @package template/interfaces/http/handlers
// @params w http.ResponseWriter - HTTP response writer
// @params r *http.Request - HTTP request
// @http-method GET,POST,PUT,DELETE
// @endpoint /test
// @response-type json
// @ast-trackable true
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
