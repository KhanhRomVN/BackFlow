// FILE: template/interfaces/http/response/response.go

package response

import (
	"encoding/json"
	"net/http"
)

// Response represents a standardized API response structure
// @struct Response
// @package template/interfaces/http/response
// @fields Status,Message,Data,Error
// @json-serializable true
// @api-response true
// @ast-trackable true
type Response struct {
	Status  bool        `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Success sends a successful JSON response
// @function Success
// @package template/interfaces/http/response
// @params w http.ResponseWriter - HTTP response writer
// @params data interface{} - Response data to send
// @http-handler true
// @response-type success
// @ast-trackable true
func Success(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Status:  true,
		Message: "success",
		Data:    data,
	})
}

// Error sends an error JSON response
// @function Error
// @package template/interfaces/http/response
// @params w http.ResponseWriter - HTTP response writer
// @params statusCode int - HTTP status code
// @params errorMsg string - Error message
// @http-handler true
// @response-type error
// @ast-trackable true
func Error(w http.ResponseWriter, statusCode int, errorMsg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(Response{
		Status: false,
		Error:  errorMsg,
	})
}
