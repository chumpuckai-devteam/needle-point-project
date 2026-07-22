import type { StitchingMeetup } from "../types";
import { formatMeetupPlace } from "./meetups";

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function toIcsUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T` +
    `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/** Build a VEVENT calendar file for a stitching meetup. */
export function buildMeetupIcs(meetup: StitchingMeetup, opts?: { pageUrl?: string }): string {
  const start = toIcsUtc(meetup.startsAt);
  const end = meetup.endsAt ? toIcsUtc(meetup.endsAt) : start;
  const stamp = toIcsUtc(new Date().toISOString());
  const uid = `${meetup.id}@needlepoint.local`;
  const location = formatMeetupPlace(meetup);
  const description = [meetup.description, opts?.pageUrl ? `Details: ${opts.pageUrl}` : ""]
    .filter(Boolean)
    .join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Needlepoint//Meetups//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end || start}`,
    `SUMMARY:${icsEscape(meetup.title || "Stitching meetup")}`,
    `LOCATION:${icsEscape(location)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    opts?.pageUrl ? `URL:${opts.pageUrl}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.join("\r\n")}\r\n`;
}

export function downloadMeetupIcs(meetup: StitchingMeetup, opts?: { pageUrl?: string }) {
  const body = buildMeetupIcs(meetup, opts);
  const blob = new Blob([body], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(meetup.title || "meetup").replace(/[^\w-]+/g, "-").slice(0, 40)}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
