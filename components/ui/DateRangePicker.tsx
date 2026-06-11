import React, { useState } from "react";

type DateRangePickerProps = {
  onDateChange: (start: string, end: string) => void;
};

const DateRangePicker = ({ onDateChange }: DateRangePickerProps) => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value);
    onDateChange(e.target.value, endDate);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value);
    onDateChange(startDate, e.target.value);
  };

  return (
    <div className="flex space-x-4">
      <input
        type="date"
        value={startDate}
        onChange={handleStartDateChange}
        className="border rounded p-2"
      />
      <input
        type="date"
        value={endDate}
        onChange={handleEndDateChange}
        className="border rounded p-2"
      />
    </div>
  );
};

export default DateRangePicker;
