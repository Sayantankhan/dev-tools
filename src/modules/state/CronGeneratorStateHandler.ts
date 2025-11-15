import { useState } from "react";
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
      const parts = expression.split(" ");
      if (parts.length !== 5) return [];

      const [minutePart, hourPart, dayPart, monthPart, weekdayPart] = parts;
      const now = new Date();
      const runs: string[] = [];
      let current = new Date(now);

      for (let i = 0; i < count * 100 && runs.length < count; i++) {
        current = new Date(current.getTime() + 60000); // Add 1 minute

        const minute = current.getMinutes();
        const hour = current.getHours();
        const day = current.getDate();
        const month = current.getMonth() + 1;
        const weekday = current.getDay();

        if (
          helpers.matchesCronPart(minute, minutePart) &&
          helpers.matchesCronPart(hour, hourPart) &&
          helpers.matchesCronPart(day, dayPart) &&
          helpers.matchesCronPart(month, monthPart) &&
          helpers.matchesCronPart(weekday, weekdayPart)
        ) {
          runs.push(current.toLocaleString());
        }
      }

      return runs;
    },

    matchesCronPart: (value: number, part: string): boolean => {
      if (part === "*") return true;
      if (part.includes("/")) {
        const [, step] = part.split("/");
        return value % parseInt(step) === 0;
      }
      if (part.includes(",")) {
        return part.split(",").some(p => parseInt(p) === value);
      }
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        return value >= start && value <= end;
      }
      return parseInt(part) === value;
    },
  };

  const actions = {
    updateField: (field: keyof CronFields, value: string) => {
      const newFields = { ...cronFields, [field]: value };
      setCronFields(newFields);
      const expression = helpers.generateCronExpression(newFields);
      setCronExpression(expression);
      setNextRuns(helpers.calculateNextRuns(expression));
      toast.success("Cron expression updated!");
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
      setNextRuns(helpers.calculateNextRuns(expression));
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