// FILE: template/infrastructure/logger/logger.go

package logger

import (
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/fatih/color"
)

// LogLevel represents the severity level of log messages
// @type LogLevel
// @package template/infrastructure/logger
// @primitive int
// @enum true
// @ast-trackable true
type LogLevel int

// Log level constants for different severity levels
// @const LevelDebug
// @const LevelInfo
// @const LevelSuccess
// @const LevelWarning
// @const LevelError
// @const LevelCritical
// @package template/infrastructure/logger
// @type LogLevel
// @enum-values true
// @ast-trackable true
const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelSuccess
	LevelWarning
	LevelError
	LevelCritical
)

// PrettyLogger provides structured, colorful logging functionality
// @struct PrettyLogger
// @package template/infrastructure/logger
// @fields level,output,service,colorful,mu
// @thread-safe true
// @ast-trackable true
type PrettyLogger struct {
	level    LogLevel
	output   io.Writer
	service  string
	colorful bool
	mu       sync.Mutex
}

// NewPrettyLogger creates and initializes a new PrettyLogger instance
// @constructor PrettyLogger
// @package template/infrastructure/logger
// @function NewPrettyLogger
// @params service string - Service name identifier (defaults to "APP" if empty)
// @params level LogLevel - Minimum log level to output
// @params colorful bool - Enable/disable colored output
// @returns *PrettyLogger - Configured logger instance
// @usage appLogger := logger.NewPrettyLogger("APP", logger.LevelDebug, true)
// @ast-trackable true
// @factory-function true
func NewPrettyLogger(service string, level LogLevel, colorful bool) *PrettyLogger {
	if service == "" {
		service = "APP"
	}
	return &PrettyLogger{
		level:    level,
		output:   os.Stdout,
		service:  service,
		colorful: colorful,
	}
}

// SetLevel dynamically changes the minimum log level
// @method SetLevel
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params level LogLevel - New minimum log level
// @thread-safe true
// @ast-trackable true
func (l *PrettyLogger) SetLevel(level LogLevel) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.level = level
}

// Debug logs a debug level message
// @method Debug
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level debug
// @ast-trackable true
func (l *PrettyLogger) Debug(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelDebug, eventCode, fields, message)
}

// Info logs an info level message
// @method Info
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level info
// @ast-trackable true
func (l *PrettyLogger) Info(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelInfo, eventCode, fields, message)
}

// Success logs a success level message
// @method Success
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level success
// @ast-trackable true
func (l *PrettyLogger) Success(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelSuccess, eventCode, fields, message)
}

// Warning logs a warning level message
// @method Warning
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level warning
// @ast-trackable true
func (l *PrettyLogger) Warning(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelWarning, eventCode, fields, message)
}

// Error logs an error level message
// @method Error
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level error
// @ast-trackable true
func (l *PrettyLogger) Error(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelError, eventCode, fields, message)
}

// Critical logs a critical level message
// @method Critical
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @log-level critical
// @ast-trackable true
func (l *PrettyLogger) Critical(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelCritical, eventCode, fields, message)
}

// log is the internal logging method that handles all log levels
// @method log
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params level LogLevel - Log level
// @params eventCode string - Event identifier
// @params fields map[string]interface{} - Additional data fields
// @params message string - Log message
// @private true
// @ast-trackable true
func (l *PrettyLogger) log(level LogLevel, eventCode string, fields map[string]interface{}, message string) {
	if level < l.level {
		return
	}

	timestamp := time.Now().UTC().Format("2006-01-02 15:04:05.000")
	levelStr := strings.ToUpper(levelToString(level))

	_, file, line, _ := runtime.Caller(3)
	caller := fmt.Sprintf("%s:%d", shortenFilePath(file), line)

	l.mu.Lock()
	defer l.mu.Unlock()

	if l.colorful {
		l.printColorful(timestamp, levelStr, eventCode, caller, fields, message)
	} else {
		l.printPlain(timestamp, levelStr, eventCode, caller, fields, message)
	}
}

// printColorful prints colored log output
// @method printColorful
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params timestamp,levelStr,eventCode,caller string
// @params fields map[string]interface{}
// @params message string
// @private true
// @ast-trackable true
func (l *PrettyLogger) printColorful(timestamp, levelStr, eventCode, caller string, fields map[string]interface{}, message string) {
	colors := getLevelColors(levelStr)

	coloredTimestamp := colors.Timestamp.Sprint(timestamp)
	coloredLevel := colors.Level.Sprint(levelStr)
	coloredService := colors.Service.Sprintf("[%s]", l.service)
	coloredCaller := colors.Caller.Sprint(caller)
	coloredMessage := colors.Message.Sprint(message)

	logLine := fmt.Sprintf("%s [%s] %s %s - %s",
		coloredTimestamp,
		coloredLevel,
		coloredService,
		coloredCaller,
		coloredMessage,
	)

	if len(fields) > 0 {
		fieldsStr := ""
		for k, v := range fields {
			fieldsStr += fmt.Sprintf("%s=%v ", k, v)
		}
		logLine += color.New(color.FgHiBlack).Sprintf(" | %s", strings.TrimSpace(fieldsStr))
	}

	if eventCode != "" {
		logLine = color.New(color.FgCyan).Sprintf("[%s] ", eventCode) + logLine
	}

	fmt.Fprintln(l.output, logLine)
}

// printPlain prints plain text log output
// @method printPlain
// @receiver *PrettyLogger
// @package template/infrastructure/logger
// @params timestamp,levelStr,eventCode,caller string
// @params fields map[string]interface{}
// @params message string
// @private true
// @ast-trackable true
func (l *PrettyLogger) printPlain(timestamp, levelStr, eventCode, caller string, fields map[string]interface{}, message string) {
	logLine := fmt.Sprintf("%s [%s] [%s] %s - %s",
		timestamp,
		levelStr,
		l.service,
		caller,
		message,
	)

	if len(fields) > 0 {
		fieldsStr := ""
		for k, v := range fields {
			fieldsStr += fmt.Sprintf("%s=%v ", k, v)
		}
		logLine += fmt.Sprintf(" | %s", strings.TrimSpace(fieldsStr))
	}

	if eventCode != "" {
		logLine = fmt.Sprintf("[%s] %s", eventCode, logLine)
	}

	fmt.Fprintln(l.output, logLine)
}

// levelToString converts LogLevel to string representation
// @function levelToString
// @package template/infrastructure/logger
// @params level LogLevel - Log level to convert
// @returns string - String representation of log level
// @pure true
// @ast-trackable true
func levelToString(level LogLevel) string {
	switch level {
	case LevelDebug:
		return "DEBUG"
	case LevelInfo:
		return "INFO"
	case LevelSuccess:
		return "SUCCESS"
	case LevelWarning:
		return "WARN"
	case LevelError:
		return "ERROR"
	case LevelCritical:
		return "CRITICAL"
	default:
		return "UNKNOWN"
	}
}

// shortenFilePath shortens file path for display
// @function shortenFilePath
// @package template/infrastructure/logger
// @params path string - Full file path
// @returns string - Shortened file path
// @pure true
// @ast-trackable true
func shortenFilePath(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) > 3 {
		return strings.Join(parts[len(parts)-3:], "/")
	}
	return path
}

// levelColors holds color configuration for different log levels
// @struct levelColors
// @package template/infrastructure/logger
// @fields Timestamp,Level,Service,Caller,Message
// @private true
// @ast-trackable true
type levelColors struct {
	Timestamp *color.Color
	Level     *color.Color
	Service   *color.Color
	Caller    *color.Color
	Message   *color.Color
}

// getLevelColors returns color configuration for a log level
// @function getLevelColors
// @package template/infrastructure/logger
// @params levelStr string - Log level string
// @returns *levelColors - Color configuration
// @pure true
// @ast-trackable true
func getLevelColors(levelStr string) *levelColors {
	switch strings.ToLower(levelStr) {
	case "debug":
		return &levelColors{
			Timestamp: color.New(color.FgHiCyan),
			Level:     color.New(color.FgCyan),
			Service:   color.New(color.FgBlue),
			Caller:    color.New(color.FgHiCyan),
			Message:   color.New(color.FgHiWhite),
		}
	case "info":
		return &levelColors{
			Timestamp: color.New(color.FgHiGreen),
			Level:     color.New(color.FgGreen),
			Service:   color.New(color.FgHiMagenta),
			Caller:    color.New(color.FgHiGreen),
			Message:   color.New(color.FgWhite),
		}
	case "success":
		return &levelColors{
			Timestamp: color.New(color.FgHiGreen),
			Level:     color.New(color.FgHiWhite),
			Service:   color.New(color.FgGreen),
			Caller:    color.New(color.FgHiWhite),
			Message:   color.New(color.FgHiGreen),
		}
	case "warn":
		return &levelColors{
			Timestamp: color.New(color.FgHiYellow),
			Level:     color.New(color.FgYellow),
			Service:   color.New(color.FgHiYellow),
			Caller:    color.New(color.FgHiYellow),
			Message:   color.New(color.FgYellow),
		}
	case "error":
		return &levelColors{
			Timestamp: color.New(color.FgHiRed),
			Level:     color.New(color.FgRed),
			Service:   color.New(color.FgHiRed),
			Caller:    color.New(color.FgHiRed),
			Message:   color.New(color.FgRed),
		}
	case "critical":
		return &levelColors{
			Timestamp: color.New(color.BgRed, color.FgHiWhite),
			Level:     color.New(color.BgRed, color.FgHiWhite),
			Service:   color.New(color.BgHiRed, color.FgHiWhite),
			Caller:    color.New(color.BgRed, color.FgHiWhite),
			Message:   color.New(color.BgHiRed, color.FgHiWhite),
		}
	default:
		return &levelColors{
			Timestamp: color.New(color.FgWhite),
			Level:     color.New(color.FgWhite),
			Service:   color.New(color.FgWhite),
			Caller:    color.New(color.FgWhite),
			Message:   color.New(color.FgWhite),
		}
	}
}
