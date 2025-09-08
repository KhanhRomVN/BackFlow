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

type LogLevel int

const (
	LevelDebug LogLevel = iota
	LevelInfo
	LevelSuccess
	LevelWarning
	LevelError
	LevelCritical
)

type PrettyLogger struct {
	level    LogLevel
	output   io.Writer
	service  string
	colorful bool
	mu       sync.Mutex
}

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

func (l *PrettyLogger) SetLevel(level LogLevel) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.level = level
}

func (l *PrettyLogger) Debug(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelDebug, eventCode, fields, message)
}

func (l *PrettyLogger) Info(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelInfo, eventCode, fields, message)
}

func (l *PrettyLogger) Success(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelSuccess, eventCode, fields, message)
}

func (l *PrettyLogger) Warning(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelWarning, eventCode, fields, message)
}

func (l *PrettyLogger) Error(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelError, eventCode, fields, message)
}

func (l *PrettyLogger) Critical(eventCode string, fields map[string]interface{}, message string) {
	l.log(LevelCritical, eventCode, fields, message)
}

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

func shortenFilePath(path string) string {
	parts := strings.Split(path, "/")
	if len(parts) > 3 {
		return strings.Join(parts[len(parts)-3:], "/")
	}
	return path
}

type levelColors struct {
	Timestamp *color.Color
	Level     *color.Color
	Service   *color.Color
	Caller    *color.Color
	Message   *color.Color
}

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
