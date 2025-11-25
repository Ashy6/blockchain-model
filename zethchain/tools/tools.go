//go:build tools
// +build tools

package tools

import (
	// Ensure buf tool is tracked in go.mod/go.sum for ignite's go tool invocations
	_ "github.com/bufbuild/buf/cmd/buf"
)
