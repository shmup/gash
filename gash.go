package main

import (
	"context"
	"encoding/base64"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type App struct {
	ctx          context.Context
	currentFile  string
	lastContent  string
	lastSaveTime time.Time
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) SaveContent(content string, filePath string) string {
	if filePath == "" {
		homeDir, _ := os.UserHomeDir()
		timestamp := time.Now().Format("2006-01-02-150405")
		filePath = filepath.Join(homeDir, "Documents", "gash"+timestamp+".html")
		os.MkdirAll(filepath.Dir(filePath), 0755)
	}

	err := os.WriteFile(filePath, []byte(content), 0644)
	if err != nil {
		return "Error: " + err.Error()
	}

	a.currentFile = filePath
	a.lastContent = content
	a.lastSaveTime = time.Now()

	return filePath
}

func (a *App) LoadFile(filePath string) map[string]string {
	content, err := os.ReadFile(filePath)
	if err != nil {
		return map[string]string{"error": err.Error()}
	}

	a.currentFile = filePath
	a.lastContent = string(content)

	return map[string]string{
		"content": string(content),
		"path":    filePath,
	}
}

func (a *App) SaveImage(imgData string, fileName string) string {
	if a.currentFile == "" {
		homeDir, _ := os.UserHomeDir()
		timestamp := time.Now().Format("2006-01-02-150405")
		a.currentFile = filepath.Join(homeDir, "Documents", "SimpleEditor-"+timestamp+".html")
		os.MkdirAll(filepath.Dir(a.currentFile), 0755)
	}

	// extract base directory from current file
	dir := filepath.Dir(a.currentFile)
	imagesDir := filepath.Join(dir, "images")
	os.MkdirAll(imagesDir, 0755)

	// remove the data url prefix
	imgData = strings.TrimPrefix(imgData, "data:image/png;base64,")
	imgData = strings.TrimPrefix(imgData, "data:image/jpeg;base64,")

	// decode base64 to bytes
	imgBytes, err := base64.StdEncoding.DecodeString(imgData)
	if err != nil {
		return "Error: " + err.Error()
	}

	// generate file path
	if fileName == "" {
		fileName = "image-" + time.Now().Format("150405") + ".png"
	}
	imgPath := filepath.Join(imagesDir, fileName)

	// save image
	err = os.WriteFile(imgPath, imgBytes, 0644)
	if err != nil {
		return "Error: " + err.Error()
	}

	// return relative path for html
	relPath, _ := filepath.Rel(dir, imgPath)
	return strings.Replace(relPath, "\\", "/", -1)
}
