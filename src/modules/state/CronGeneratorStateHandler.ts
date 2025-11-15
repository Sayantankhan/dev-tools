import { useState, useRef } from "react";
import { ToolHandler } from "@/modules/types/ToolHandler";
import { toast } from "sonner";

export interface CronFields {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export const CronGeneratorStateHandler = (): ToolHandler => {
  const [cronFields, setCronFields] = useState<CronFields>({
    minute: "*",
    hour: "*",
    dayOfMonth: "*",
    month: "*",
    dayOfWeek: "*",
  });
  const [cronExpression, setCronExpression] = useState("* * * * *");
  const [nextRuns, setNextRuns] = useState<string[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const helpers = {
    generateCronExpression: (fields: CronFields): string => {
      return `${fields.minute} ${fields.hour} ${fields.dayOfMonth} ${fields.month} ${fields.dayOfWeek}`;
    },

    explainCron: (expression: string): string => {
      const parts = expression.split(" ");
      if (parts.length !== 5) return "Invalid cron expression";

      const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
      
      let explanation = "Runs ";

      // Minute
      if (minute === "*") explanation += "every minute";
      else if (minute.includes("/")) explanation += `every ${minute.split("/")[1]} minutes`;
      else explanation += `at minute ${minute}`;

      // Hour
      if (hour === "*") explanation += ", every hour";
      else if (hour.includes("/")) explanation += `, every ${hour.split("/")[1]} hours`;
      else explanation += `, at ${hour}:00`;

      // Day of month
      if (dayOfMonth === "*") explanation += ", every day";
      else if (dayOfMonth.includes("/")) explanation += `, every ${dayOfMonth.split("/")[1]} days`;
      else explanation += `, on day ${dayOfMonth}`;

      // Month
      if (month !== "*") {
        const monthNames = ["", "January", "February", "March", "April", "May", "June", 
                          "July", "August", "September", "October", "November", "December"];
        explanation += `, in ${monthNames[parseInt(month)] || month}`;
      }

      // Day of week
      if (dayOfWeek !== "*") {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        explanation += `, on ${dayNames[parseInt(dayOfWeek)] || dayOfWeek}`;
      }

      return explanation;
    },

    calculateNextRuns: (expression: string, count: number = 5): string[] => {
      const parts = expression.trim().split(" ");
      if (parts.length !== 5) return [];

      const [minutePart, hourPart, dayPart, monthPart, weekdayPartRaw] = parts;
      const weekdayPart = weekdayPartRaw.replace(/\b7\b/g, "0");
      const now = new Date();
      const runs: string[] = [];
      let current = new Date(now);

      // In cron, if both day and weekday are specified (not *), it's an OR condition
      const bothDaysSpecified = dayPart !== "*" && weekdayPart !== "*";

      // Dynamically choose a reasonable search horizon based on specificity
      let horizonDays = 2 * count; // default small horizon for frequent schedules
      if (monthPart !== "*") {
        horizonDays = 40 * count; // up to ~5 months
      } else if (dayPart !== "*" || weekdayPart !== "*") {
        horizonDays = 14 * count; // up to ~10 weeks
      }
      const limit = horizonDays * 1440; // minutes

      for (let i = 0; i < limit && runs.length < count; i++) {
        current = new Date(current.getTime() + 60000); // +1 minute

        const minute = current.getMinutes();
        const hour = current.getHours();
        const day = current.getDate();
        const month = current.getMonth() + 1;
        const weekday = current.getDay();

        const minuteMatch = helpers.matchesCronPart(minute, minutePart, 0);
        const hourMatch = helpers.matchesCronPart(hour, hourPart, 0);
        const dayMatch = helpers.matchesCronPart(day, dayPart, 1);
        const monthMatch = helpers.matchesCronPart(month, monthPart, 1);
        const weekdayMatch = helpers.matchesCronPart(weekday, weekdayPart, 0);

        const dayCondition = bothDaysSpecified ? (dayMatch || weekdayMatch) : (dayMatch && weekdayMatch);

        if (minuteMatch && hourMatch && dayCondition && monthMatch) {
          runs.push(current.toLocaleString());
        }
      }

      return runs;
    },

    matchesCronPart: (value: number, part: string, offset: number = 0): boolean => {
      if (part === "*") return true;

      // Step values, e.g., */5 or 1/10
      if (part.includes("/")) {
        const [base, stepStr] = part.split("/");
        const step = parseInt(stepStr, 10);
        const start = base === "*" || base === "" ? offset : parseInt(base, 10);
        if (isNaN(step) || isNaN(start)) return false;
        return value >= start && ((value - start) % step === 0);
      }

      // Lists, e.g., 1,2,5
      if (part.includes(",")) {
        return part.split(",").some((p) => helpers.matchesCronPart(value, p, offset));
      }

      // Ranges, e.g., 1-5
      if (part.includes("-")) {
        const [start, end] = part.split("-").map((n) => parseInt(n, 10));
        return value >= start && value <= end;
      }

      // Exact value
      return parseInt(part, 10) === value;
    },
  };

  const actions = {
    updateField: (field: keyof CronFields, value: string) => {
      const newFields = { ...cronFields, [field]: value };
      setCronFields(newFields);
      const expression = helpers.generateCronExpression(newFields);
      setCronExpression(expression);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setNextRuns(helpers.calculateNextRuns(expression));
      }, 250);
    },

    applyPreset: (preset: string) => {
      let newFields: CronFields;
      
      switch (preset) {
        case "every-minute":
          newFields = { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" };
          break;
        case "every-hour":
          newFields = { minute: "0", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" };
          break;
        case "every-day":
          newFields = { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "*" };
          break;
        case "every-week":
          newFields = { minute: "0", hour: "0", dayOfMonth: "*", month: "*", dayOfWeek: "0" };
          break;
        case "every-month":
          newFields = { minute: "0", hour: "0", dayOfMonth: "1", month: "*", dayOfWeek: "*" };
          break;
        default:
          return;
      }

      setCronFields(newFields);
      const expression = helpers.generateCronExpression(newFields);
      setCronExpression(expression);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setNextRuns(helpers.calculateNextRuns(expression));
      }, 0);
      toast.success("Preset applied!");
    },

    handleCopy: async () => {
      try {
        await navigator.clipboard.writeText(cronExpression);
        toast.success("Cron expression copied!");
      } catch (error) {
        toast.error("Failed to copy");
      }
    },

    handleClear: () => {
      const defaultFields = { minute: "*", hour: "*", dayOfMonth: "*", month: "*", dayOfWeek: "*" };
      setCronFields(defaultFields);
      setCronExpression("* * * * *");
      setNextRuns([]);
      toast.success("Cleared!");
    },
  };

  return {
    state: {
      cronFields,
      cronExpression,
      nextRuns,
    },
    setters: {
      setCronFields,
      setCronExpression,
      setNextRuns,
    },
    helpers,
    actions,
  };
};