package main

import (
	"fmt"
	http_interface "layered_modular_monolith/interfaces/http"
	"log"
	"net/http"
)

func main() {
	router := http_interface.NewRouter()
	fmt.Println("Server running at :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}
