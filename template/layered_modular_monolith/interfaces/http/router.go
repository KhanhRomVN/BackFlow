package http_interface

import (
	handlers "layered_modular_monolith/interfaces/http/handlers/test"
	"net/http"
)

func NewRouter() *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("/test", handlers.TestHandler)
	return mux
}
