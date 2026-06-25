package handlers

import (
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"backEnd/utils"
)

// AvatarInfo describes a single available category avatar.
type AvatarInfo struct {
	Name string `json:"name"`     // base name without color suffix and extension (e.g. "shirt")
	Color string `json:"color"`    // "white" or "blue"
	File  string `json:"file"`     // file name on disk (e.g. "shirt-white.svg")
	Path  string `json:"path"`     // public URL path (e.g. "/uploads/avatars/categories/shirt-white.svg")
	Size  int64  `json:"size"`     // file size in bytes
}

// AvatarDir is the on-disk location of category avatars. It is also served
// as static files by the /uploads/ handler in main.go, so the URLs returned
// from this endpoint can be used directly in <img src="..."> tags.
const AvatarDir = "./uploads/avatars/categories"
const AvatarPublicPrefix = "/uploads/avatars/categories/"

// ListAvatars scans the avatar directory and returns the available icons.
// New files dropped into the directory appear in the response on the next
// request — no code change, no restart needed.
//
//	GET /api/admin/avatars
func ListAvatars(w http.ResponseWriter, r *http.Request) {
	entries, err := os.ReadDir(AvatarDir)
	if err != nil {
		if os.IsNotExist(err) {
			utils.JSONResponse(w, http.StatusOK, []AvatarInfo{})
			return
		}
		utils.ErrorResponse(w, http.StatusInternalServerError,
			"Error reading avatars directory: "+err.Error())
		return
	}

	avatars := make([]AvatarInfo, 0, len(entries))
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		name := e.Name()
		ext := strings.ToLower(filepath.Ext(name))
		if ext != ".svg" && ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
			continue
		}
		base := strings.TrimSuffix(name, ext)
		color := "blue"
		baseName := base
		if strings.HasSuffix(base, "-white") {
			color = "white"
			baseName = strings.TrimSuffix(base, "-white")
		}
		var size int64
		if info, err := e.Info(); err == nil {
			size = info.Size()
		}
		avatars = append(avatars, AvatarInfo{
			Name:  baseName,
			Color: color,
			File:  name,
			Path:  AvatarPublicPrefix + name,
			Size:  size,
		})
	}

	// Stable order: by base name, then white before blue
	sort.SliceStable(avatars, func(i, j int) bool {
		if avatars[i].Name != avatars[j].Name {
			return avatars[i].Name < avatars[j].Name
		}
		return avatars[i].Color == "white" && avatars[j].Color != "white"
	})

	utils.JSONResponse(w, http.StatusOK, avatars)
}

// ValidateAvatarPath returns true if the given path points to an existing
// file inside the avatar directory. Used by the category handlers to make
// sure clients cannot store arbitrary paths in the avatar field.
func ValidateAvatarPath(path string) bool {
	if path == "" {
		return true
	}
	if !strings.HasPrefix(path, AvatarPublicPrefix) {
		return false
	}
	rel := strings.TrimPrefix(path, AvatarPublicPrefix)
	if rel == "" || strings.Contains(rel, "..") || strings.Contains(rel, "/") || strings.Contains(rel, "\\") {
		return false
	}
	full := filepath.Join(AvatarDir, filepath.Base(rel))
	info, err := os.Stat(full)
	return err == nil && !info.IsDir()
}
