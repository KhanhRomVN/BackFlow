import React, { useState, useRef, useEffect } from "react";
import { Clock, ChevronUp, ChevronDown, X } from "lucide-react";

interface CustomTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  placeholder = "Select time",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempHour, setTempHour] = useState("09");
  const [tempMinute, setTempMinute] = useState("00");
  const [tempPeriod, setTempPeriod] = useState("AM");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Parse the input time value (24-hour format)
  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(":");
      const hourNum = parseInt(hour);
      const is24Hour = hourNum >= 0 && hourNum <= 23;

      if (is24Hour) {
        const hour12 =
          hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
        const period = hourNum >= 12 ? "PM" : "AM";

        setTempHour(hour12.toString().padStart(2, "0"));
        setTempMinute(minute);
        setTempPeriod(period);
      }
    } else {
      // Default values
      setTempHour("09");
      setTempMinute("00");
      setTempPeriod("AM");
    }
  }, [value]);

  // Format display value
  const getDisplayValue = () => {
    if (!value) return "";
    const [hour, minute] = value.split(":");
    const hourNum = parseInt(hour);
    const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
    const period = hourNum >= 12 ? "PM" : "AM";
    return `${hour12.toString().padStart(2, "0")}:${minute} ${period}`;
  };

  // Convert 12-hour to 24-hour format
  const convertTo24Hour = (hour: string, minute: string, period: string) => {
    let hourNum = parseInt(hour);
    if (period === "AM" && hourNum === 12) {
      hourNum = 0;
    } else if (period === "PM" && hourNum !== 12) {
      hourNum += 12;
    }
    return `${hourNum.toString().padStart(2, "0")}:${minute}`;
  };

  const handleApply = () => {
    const time24 = convertTo24Hour(tempHour, tempMinute, tempPeriod);
    onChange(time24);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Reset to current value
    if (value) {
      const [hour, minute] = value.split(":");
      const hourNum = parseInt(hour);
      const hour12 = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum;
      const period = hourNum >= 12 ? "PM" : "AM";

      setTempHour(hour12.toString().padStart(2, "0"));
      setTempMinute(minute);
      setTempPeriod(period);
    }
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const adjustHour = (direction: "up" | "down") => {
    const currentHour = parseInt(tempHour);
    let newHour;

    if (direction === "up") {
      newHour = currentHour === 12 ? 1 : currentHour + 1;
    } else {
      newHour = currentHour === 1 ? 12 : currentHour - 1;
    }

    setTempHour(newHour.toString().padStart(2, "0"));
  };

  const adjustMinute = (direction: "up" | "down") => {
    const currentMinute = parseInt(tempMinute);
    let newMinute;

    if (direction === "up") {
      newMinute = currentMinute === 45 ? 0 : currentMinute + 15;
    } else {
      newMinute = currentMinute === 0 ? 45 : currentMinute - 15;
    }

    setTempMinute(newMinute.toString().padStart(2, "0"));
  };

  const togglePeriod = () => {
    setTempPeriod(tempPeriod === "AM" ? "PM" : "AM");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full h-12 px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl 
                 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors
                 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" />
          <span
            className={
              value
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400"
            }
          >
            {getDisplayValue() || placeholder}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 p-4 min-w-[280px] animate-in fade-in-0 zoom-in-95"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Time
            </h3>
            <button
              onClick={handleCancel}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Time selector */}
          <div className="flex items-center justify-center gap-4 mb-6">
            {/* Hour */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustHour("up")}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-lg font-semibold text-gray-900 dark:text-white">
                {tempHour}
              </div>
              <button
                onClick={() => adjustHour("down")}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              :
            </div>

            {/* Minute */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => adjustMinute("up")}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-lg font-semibold text-gray-900 dark:text-white">
                {tempMinute}
              </div>
              <button
                onClick={() => adjustMinute("down")}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col items-center">
              <div className="h-8"></div>
              <button
                onClick={togglePeriod}
                className="w-12 h-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {tempPeriod}
              </button>
              <div className="h-8"></div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={handleClear}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Clear
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTimePicker;
