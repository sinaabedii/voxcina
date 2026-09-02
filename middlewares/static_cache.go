package middlewares

import "net/http"

// UploadsCacheControl labels /uploads/ responses by status: a file that
// resolves is immutable, a file that does not must never be stored.
//
// Uploaded filenames embed a nanosecond timestamp, so a URL that resolves
// today can never change content. A miss is the dangerous case: replacing a
// product's images deletes the old files (handlers/products.go), and any CDN
// that stores the resulting 404 keeps serving it long after the new file
// exists — the page recovers only when the entry expires or is purged.
//
// This has to live here because status is the deciding factor. next.config.js
// `headers()` matches on path alone, so its /uploads/ rule was stamping
// "public, max-age=31536000, immutable" onto 404s as well.
func UploadsCacheControl(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&uploadsCacheWriter{ResponseWriter: w}, r)
	})
}

type uploadsCacheWriter struct {
	http.ResponseWriter
	wroteHeader bool
}

func (w *uploadsCacheWriter) WriteHeader(status int) {
	if !w.wroteHeader {
		w.wroteHeader = true
		if status < http.StatusBadRequest {
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		} else {
			w.Header().Set("Cache-Control", "no-store")
		}
	}
	w.ResponseWriter.WriteHeader(status)
}

func (w *uploadsCacheWriter) Write(b []byte) (int, error) {
	if !w.wroteHeader {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}
