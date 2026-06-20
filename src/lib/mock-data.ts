import type {
  FamilyMember,
  CalendarEvent,
  Chore,
  WeatherData,
  SmartDevice,
  AutomationScene,
} from "./types";

export const familyMembers: FamilyMember[] = [
  { id: "1", name: "Mom", avatar: "👩", color: "#8B5CF6" },
  { id: "2", name: "Dad", avatar: "👨", color: "#3B82F6" },
  { id: "3", name: "Emma", avatar: "👧", color: "#EC4899" },
  { id: "4", name: "Jake", avatar: "👦", color: "#10B981" },
];

function todayAt(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNow(days: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export const calendarEvents: CalendarEvent[] = [
  {
    id: "e1",
    title: "Team Standup",
    start: todayAt(9),
    end: todayAt(9, 30),
    memberId: "2",
    category: "work",
  },
  {
    id: "e2",
    title: "Soccer Practice",
    start: todayAt(15, 30),
    end: todayAt(17),
    memberId: "4",
    category: "activity",
    location: "City Park Field 3",
  },
  {
    id: "e3",
    title: "Piano Lesson",
    start: todayAt(16),
    end: todayAt(17),
    memberId: "3",
    category: "activity",
    location: "Mrs. Chen's Studio",
  },
  {
    id: "e4",
    title: "Dentist Appointment",
    start: daysFromNow(1, 10),
    end: daysFromNow(1, 11),
    memberId: "1",
    category: "appointment",
    location: "Bright Smiles Dental",
  },
  {
    id: "e5",
    title: "Science Fair",
    start: daysFromNow(2, 13),
    end: daysFromNow(2, 16),
    memberId: "3",
    category: "school",
    location: "Lincoln Elementary",
  },
  {
    id: "e6",
    title: "Family Game Night",
    start: daysFromNow(2, 19),
    end: daysFromNow(2, 21),
    memberId: "1",
    category: "family",
  },
  {
    id: "e7",
    title: "Grocery Run",
    start: daysFromNow(1, 14),
    end: daysFromNow(1, 15),
    memberId: "2",
    category: "family",
  },
  {
    id: "e8",
    title: "Math Tutoring",
    start: daysFromNow(3, 15),
    end: daysFromNow(3, 16),
    memberId: "4",
    category: "school",
  },
];

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

export const chores: Chore[] = [
  { id: "c1", title: "Take out trash", assigneeId: "4", dueDate: today, completed: false, recurring: "weekly", points: 5 },
  { id: "c2", title: "Load dishwasher", assigneeId: "3", dueDate: today, completed: true, recurring: "daily", points: 3 },
  { id: "c3", title: "Walk the dog", assigneeId: "4", dueDate: today, completed: false, recurring: "daily", points: 5 },
  { id: "c4", title: "Vacuum living room", assigneeId: "3", dueDate: today, completed: false, recurring: "weekly", points: 8 },
  { id: "c5", title: "Clean bathroom", assigneeId: "2", dueDate: tomorrow, completed: false, recurring: "weekly", points: 10 },
  { id: "c6", title: "Water plants", assigneeId: "1", dueDate: today, completed: true, recurring: "weekly", points: 3 },
  { id: "c7", title: "Fold laundry", assigneeId: "1", dueDate: today, completed: false, recurring: "weekly", points: 5 },
  { id: "c8", title: "Make beds", assigneeId: "3", dueDate: today, completed: true, recurring: "daily", points: 2 },
];

const days = ["Sun", "Mon", "Tue", "Wed", "Thu"];
const dayIndex = new Date().getDay();

export const weatherData: WeatherData = {
  location: "San Antonio, TX",
  current: {
    temp: 87,
    feelsLike: 92,
    humidity: 55,
    description: "Partly Cloudy",
    icon: "partly-cloudy",
    windSpeed: 8,
  },
  forecast: [
    { day: days[dayIndex % 7] || "Today", high: 89, low: 72, description: "Partly Cloudy", icon: "partly-cloudy", precipitation: 10 },
    { day: "Tomorrow", high: 91, low: 74, description: "Sunny", icon: "sunny", precipitation: 0 },
    { day: "Wed", high: 85, low: 70, description: "Thunderstorms", icon: "storm", precipitation: 80 },
    { day: "Thu", high: 83, low: 68, description: "Rainy", icon: "rain", precipitation: 60 },
    { day: "Fri", high: 88, low: 71, description: "Sunny", icon: "sunny", precipitation: 5 },
  ],
};

export const smartDevices: SmartDevice[] = [
  { id: "d1", name: "Living Room Lights", type: "light", state: "on", room: "Living Room", attributes: { brightness: 80, color_temp: 3500 } },
  { id: "d2", name: "Kitchen Lights", type: "light", state: "off", room: "Kitchen", attributes: { brightness: 0 } },
  { id: "d3", name: "Thermostat", type: "thermostat", state: "cooling", room: "Hallway", attributes: { current_temp: 74, target_temp: 72, mode: "cool" } },
  { id: "d4", name: "Front Door Lock", type: "lock", state: "locked", room: "Entryway", attributes: { last_changed: "2 hours ago" } },
  { id: "d5", name: "Garage Door", type: "switch", state: "closed", room: "Garage", attributes: {} },
  { id: "d6", name: "Bedroom Lights", type: "light", state: "off", room: "Bedroom", attributes: { brightness: 0 } },
  { id: "d7", name: "Porch Light", type: "light", state: "on", room: "Exterior", attributes: { brightness: 100 } },
  { id: "d8", name: "Motion Sensor", type: "sensor", state: "clear", room: "Backyard", attributes: { last_triggered: "45 min ago" } },
  { id: "d9", name: "Back Door Lock", type: "lock", state: "locked", room: "Kitchen", attributes: { last_changed: "5 hours ago" } },
  { id: "d10", name: "Kids Room Lights", type: "light", state: "on", room: "Kids Room", attributes: { brightness: 60, color_temp: 4000 } },
];

export const automationScenes: AutomationScene[] = [
  { id: "s1", name: "Good Morning", icon: "sunrise", description: "Lights on, thermostat to 72°, unlock doors", deviceIds: ["d1", "d2", "d3", "d4"] },
  { id: "s2", name: "Good Night", icon: "moon", description: "All lights off, lock doors, thermostat to 68°", deviceIds: ["d1", "d2", "d6", "d7", "d10", "d3", "d4", "d9"] },
  { id: "s3", name: "Movie Time", icon: "film", description: "Dim living room, turn off other lights", deviceIds: ["d1", "d2", "d10"] },
  { id: "s4", name: "Away Mode", icon: "shield", description: "Lock all doors, lights off, arm sensors", deviceIds: ["d1", "d2", "d4", "d5", "d6", "d7", "d9", "d10"] },
];
